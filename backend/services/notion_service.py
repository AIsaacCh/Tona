import httpx
import json
from config import settings

NOTION_VERSION = "2022-06-28"
NOTION_API = "https://api.notion.com/v1"

MAX_PROFUNDIDAD = 6   # evita recursión infinita en estructuras raras
MAX_PAGINAS = 300      # tope duro de páginas por sincronización


class NotionError(Exception):
    pass


def construir_url_autorizacion(state: str) -> str:
    if not settings.NOTION_CLIENT_ID or not settings.NOTION_REDIRECT_URI:
        raise NotionError("Notion no está configurado en este entorno")
    return (
        "https://api.notion.com/v1/oauth/authorize"
        f"?client_id={settings.NOTION_CLIENT_ID}"
        f"&redirect_uri={settings.NOTION_REDIRECT_URI}"
        "&response_type=code"
        "&owner=user"
        f"&state={state}"
    )


async def intercambiar_codigo_por_token(code: str) -> dict:
    if not settings.NOTION_CLIENT_ID or not settings.NOTION_CLIENT_SECRET:
        raise NotionError("Notion no está configurado en este entorno")

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api.notion.com/v1/oauth/token",
            auth=(settings.NOTION_CLIENT_ID, settings.NOTION_CLIENT_SECRET),
            headers={"Content-Type": "application/json"},
            json={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": settings.NOTION_REDIRECT_URI,
            },
        )
    if resp.status_code != 200:
        raise NotionError(f"Error intercambiando código: {resp.text}")
    return resp.json()


def _headers(access_token: str) -> dict:
    return {
        "Authorization": f"Bearer {access_token}",
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
    }


async def _buscar_raices_compartidas(client: httpx.AsyncClient, access_token: str) -> list:
    """Trae todo lo que el usuario compartió explícitamente con la integración."""
    resultados = []
    cursor = None
    while True:
        payload = {"page_size": 100}
        if cursor:
            payload["start_cursor"] = cursor
        resp = await client.post(f"{NOTION_API}/search", headers=_headers(access_token), json=payload)
        if resp.status_code != 200:
            raise NotionError(f"Error buscando páginas compartidas: {resp.text}")
        data = resp.json()
        resultados.extend(data.get("results", []))
        if not data.get("has_more"):
            break
        cursor = data.get("next_cursor")
    return resultados


def _extraer_titulo(objeto: dict) -> str:
    props = objeto.get("properties", {})
    for prop in props.values():
        if prop.get("type") == "title":
            titulo_arr = prop.get("title", [])
            if titulo_arr:
                return "".join(t.get("plain_text", "") for t in titulo_arr)
    # Fallback para páginas simples sin properties de base de datos
    titulo_directo = objeto.get("title")
    if isinstance(titulo_directo, list) and titulo_directo:
        return "".join(t.get("plain_text", "") for t in titulo_directo)
    return "Sin título"


def _extraer_bloque_estructurado(bloque: dict) -> dict | None:
    tipo = bloque.get("type")
    contenido = bloque.get(tipo, {})
    rich_text = contenido.get("rich_text", [])
    texto = "".join(t.get("plain_text", "") for t in rich_text)

    if not texto and tipo != "divider":
        return None  # bloque vacío o de un tipo que no manejamos (imagen, embed, etc.)

    item = {"tipo": tipo, "texto": texto}
    if tipo == "to_do":
        item["marcado"] = contenido.get("checked", False)
    return item


MAX_BLOQUES = 300  # tope de bloques por página, para no inflar el cache

async def _recorrer_bloques(client: httpx.AsyncClient, access_token: str, block_id: str, profundidad: int = 0, nivel: int = 0) -> list:
    """Recorre recursivamente los children de un bloque y regresa una lista de
    bloques estructurados {tipo, texto, nivel}, conservando el formato original."""
    if profundidad > MAX_PROFUNDIDAD:
        return []

    bloques_out = []
    cursor = None
    while True:
        params = {"page_size": 100}
        if cursor:
            params["start_cursor"] = cursor
        resp = await client.get(
            f"{NOTION_API}/blocks/{block_id}/children",
            headers=_headers(access_token),
            params=params,
        )
        if resp.status_code != 200:
            break  # si un bloque falla (permisos, tipo raro), no tumbamos toda la sincronización
        data = resp.json()

        for bloque in data.get("results", []):
            if len(bloques_out) >= MAX_BLOQUES:
                break

            item = _extraer_bloque_estructurado(bloque)
            if item:
                item["nivel"] = nivel
                bloques_out.append(item)

            if bloque.get("has_children"):
                # Las listas anidan visualmente; el resto de bloques con hijos
                # (toggles, etc.) no suman sangría extra.
                sub_nivel = nivel + 1 if bloque.get("type") in ("bulleted_list_item", "numbered_list_item", "to_do") else nivel
                hijos = await _recorrer_bloques(client, access_token, bloque["id"], profundidad + 1, sub_nivel)
                bloques_out.extend(hijos)

            if len(bloques_out) >= MAX_BLOQUES:
                break

        if not data.get("has_more") or len(bloques_out) >= MAX_BLOQUES:
            break
        cursor = data.get("next_cursor")

    return bloques_out


async def sincronizar_workspace(access_token: str) -> list:
    """
    Punto de entrada principal: busca todo lo compartido con la integración,
    y para cada página/base de datos raíz, recorre su contenido para armar
    un resumen. Esto se llama SOLO al conectar o cuando el usuario pide
    refrescar — nunca en cada carga de la pestaña de estudio.
    """
    paginas = []
    async with httpx.AsyncClient(timeout=30) as client:
        raices = await _buscar_raices_compartidas(client, access_token)

        for obj in raices[:MAX_PAGINAS]:
            object_type = obj.get("object")  # "page" | "database"
            page_id = obj.get("id")
            titulo = _extraer_titulo(obj)
            parent = obj.get("parent", {})
            parent_id = parent.get("page_id") or parent.get("database_id")

            resumen = ""
            if object_type == "page":
                bloques = await _recorrer_bloques(client, access_token, page_id)
                resumen = json.dumps(bloques, ensure_ascii=False)

            paginas.append({
                "page_id": page_id,
                "titulo": titulo,
                "tipo": object_type,
                "parent_id": parent_id,
                "contenido_resumen": resumen,
            })

    return paginas