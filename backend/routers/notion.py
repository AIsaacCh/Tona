from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import RedirectResponse
from services.auth_utils import verificar_identidad
from services.db import (
    guardar_conexion_notion, obtener_conexion_notion, eliminar_conexion_notion,
    guardar_arbol_notion, obtener_arbol_notion, guardar_oauth_state, obtener_y_borrar_oauth_state,
    obtener_pagina_de_arbol, obtener_hijos_de_pagina, anclar_pagina_notion,
    desanclar_pagina_notion, obtener_paginas_ancladas,
)
from pydantic import BaseModel
from services.notion_service import (
    construir_url_autorizacion, intercambiar_codigo_por_token, sincronizar_workspace, NotionError,
)
from config import settings
import secrets

router = APIRouter()


# ✅ ELIMINADO: user_id de la URL
@router.get("/conectar")
async def conectar_notion(user_id: str = Depends(verificar_identidad)):
    """
    Regresa la URL de autorización de Notion.
    """
    try:
        state = f"{user_id}:{secrets.token_urlsafe(24)}"
        guardar_oauth_state(state, user_id)
        url = construir_url_autorizacion(state)
        return {"url": url}
    except NotionError as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.get("/callback")
async def notion_callback(code: str, state: str):
    user_id_guardado = obtener_y_borrar_oauth_state(state)
    if not user_id_guardado:
        raise HTTPException(status_code=400, detail="Estado inválido o expirado")

    user_id = user_id_guardado

    try:
        data = await intercambiar_codigo_por_token(code)
    except NotionError as e:
        return RedirectResponse(f"{settings.FRONTEND_URL}/dashboard?notion_error=1")

    guardar_conexion_notion(user_id, {
        "access_token": data.get("access_token"),
        "workspace_id": data.get("workspace_id"),
        "workspace_name": data.get("workspace_name"),
        "bot_id": data.get("bot_id"),
    })

    return RedirectResponse(f"{settings.FRONTEND_URL}/dashboard?notion_conectado=1")


# ✅ ELIMINADO: user_id de la URL
@router.get("/estado")
async def estado_notion(user_id: str = Depends(verificar_identidad)):
    conexion = obtener_conexion_notion(user_id)
    if not conexion:
        return {"conectado": False}
    return {
        "conectado": True,
        "workspace_name": conexion.get("workspace_name"),
        "ultima_sincronizacion": conexion.get("ultima_sincronizacion"),
    }


# ✅ ELIMINADO: user_id de la URL
@router.post("/sincronizar")
async def sincronizar_notion(user_id: str = Depends(verificar_identidad)):
    conexion = obtener_conexion_notion(user_id)
    if not conexion:
        raise HTTPException(status_code=404, detail="Notion no está conectado para este usuario")

    try:
        paginas = await sincronizar_workspace(conexion["access_token"])
    except NotionError as e:
        raise HTTPException(status_code=502, detail=str(e))

    guardar_arbol_notion(user_id, paginas)
    return {"sincronizado": True, "total_paginas": len(paginas)}


# ✅ ELIMINADO: user_id de la URL
@router.get("/arbol")
async def obtener_arbol(user_id: str = Depends(verificar_identidad)):
    return {"paginas": obtener_arbol_notion(user_id)}


# ✅ ELIMINADO: user_id de la URL
@router.delete("/desconectar")
async def desconectar_notion(user_id: str = Depends(verificar_identidad)):
    eliminar_conexion_notion(user_id)
    return {"desconectado": True}


class AnclarPaginaRequest(BaseModel):
    page_id: str


# ✅ ELIMINADO: user_id de la URL
@router.post("/anclar")
async def anclar_pagina(
    body: AnclarPaginaRequest,
    user_id: str = Depends(verificar_identidad)
):
    pagina = obtener_pagina_de_arbol(user_id, body.page_id)
    if not pagina:
        raise HTTPException(status_code=404, detail="Esa página no está en tu workspace sincronizado")

    ancladas = [anclar_pagina_notion(
        user_id, pagina["page_id"], pagina.get("titulo", "Sin título"),
        tipo=pagina.get("tipo", "page"), parent_id=pagina.get("parent_id"), es_auto=False,
    )]

    hijos = obtener_hijos_de_pagina(user_id, body.page_id)
    for h in hijos:
        if h.get("tipo") == "database":
            ancladas.append(anclar_pagina_notion(
                user_id, h["page_id"], h.get("titulo", "Sin título"),
                tipo="database", parent_id=body.page_id, es_auto=True,
            ))

    return {"anclado": True, "items": ancladas}


# ✅ ELIMINADO: user_id de la URL
@router.delete("/anclar/{page_id}")
async def desanclar_pagina(
    page_id: str,
    user_id: str = Depends(verificar_identidad)
):
    desanclar_pagina_notion(user_id, page_id)
    return {"desanclado": True}


# ✅ ELIMINADO: user_id de la URL
@router.get("/ancladas")
async def listar_ancladas(user_id: str = Depends(verificar_identidad)):
    ancladas = obtener_paginas_ancladas(user_id)
    enriquecidas = []
    for a in ancladas:
        pagina = obtener_pagina_de_arbol(user_id, a["page_id"])
        enriquecidas.append({
            **a,
            "contenido_resumen": pagina.get("contenido_resumen", "") if pagina else "",
        })
    return {"paginas": enriquecidas}