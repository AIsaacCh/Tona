from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from typing import Optional
import random
import string
import httpx
from services.db import supabase
from config import settings
from services.db import (
    obtener_usuario,
    crear_sesion_colaborativa,
    obtener_sesion,
    marcar_sesion_inactiva,
    agregar_participante,
    quitar_participante,
    obtener_participantes,
    agregar_archivo_compartido,
    obtener_archivos_compartidos,
    guardar_mensaje_colaborativo,
    obtener_mensajes_colaborativos,
)

router = APIRouter()


def generar_codigo() -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=6))


class CrearSesionRequest(BaseModel):
    user_id: str


class UnirseSesionRequest(BaseModel):
    user_id: str
    codigo: str


class CompartirArchivoRequest(BaseModel):
    user_id: str
    doc_id: str
    titulo: str


class PreguntarTonaRequest(BaseModel):
    user_id: str
    pregunta: str


# ── WebSocket manager ─────────────────────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        self.conexiones: dict = {}  # codigo -> {user_id: websocket}

    async def conectar(self, codigo: str, user_id: str, ws: WebSocket):
        await ws.accept()
        self.conexiones.setdefault(codigo, {})[user_id] = ws

    def desconectar(self, codigo: str, user_id: str):
        if codigo in self.conexiones:
            self.conexiones[codigo].pop(user_id, None)
            if not self.conexiones[codigo]:
                del self.conexiones[codigo]

    async def broadcast(self, codigo: str, mensaje: dict):
        for ws in list(self.conexiones.get(codigo, {}).values()):
            try:
                await ws.send_json(mensaje)
            except Exception:
                pass


manager = ConnectionManager()


# ── Endpoints REST ────────────────────────────────────────────────────────────

@router.post("/crear")
async def crear_sesion(body: CrearSesionRequest):
    print(f"🔍 /crear llamado con user_id={body.user_id}")
    usuario = obtener_usuario(body.user_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    codigo = generar_codigo()
    while obtener_sesion(codigo):
        codigo = generar_codigo()

    crear_sesion_colaborativa(codigo, body.user_id)
    agregar_participante(codigo, body.user_id, usuario.get("name", ""), usuario.get("email", ""))

    return {"codigo": codigo}


@router.post("/unirse")
async def unirse_sesion(body: UnirseSesionRequest):
    print(f"🔍 /unirse llamado con user_id={body.user_id}, codigo={body.codigo}")
    sesion = obtener_sesion(body.codigo)
    if not sesion:
        raise HTTPException(status_code=404, detail="Código inválido o sesión finalizada")

    participantes = obtener_participantes(body.codigo)
    if len(participantes) >= 3 and not any(p["user_id"] == body.user_id for p in participantes):
        raise HTTPException(status_code=403, detail="La sesión ya tiene el máximo de 3 participantes")

    usuario = obtener_usuario(body.user_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    ya_esta = any(p["user_id"] == body.user_id for p in participantes)
    if not ya_esta:
        agregar_participante(body.codigo, body.user_id, usuario.get("name", ""), usuario.get("email", ""))

    return {
        "codigo": body.codigo,
        "participantes": obtener_participantes(body.codigo),
        "archivos": obtener_archivos_compartidos(body.codigo),
        "es_creador": sesion.get("creado_por") == body.user_id,
        "mensajes": obtener_mensajes_colaborativos(body.codigo),
    }

@router.get("/mi-sesion/{user_id}")
async def obtener_mi_sesion_activa(user_id: str):
    """
    Busca si el usuario tiene una sesión activa, ya sea como participante actual
    o como creador de una sesión que sigue activa (aunque haya salido).
    """
    resp = supabase.table("colaboracion_participantes").select("codigo").eq("user_id", user_id).execute()
    for fila in (resp.data or []):
        sesion = obtener_sesion(fila["codigo"])
        if sesion:
            return {"codigo": fila["codigo"]}

    resp_creador = supabase.table("colaboracion_sesiones").select("codigo").eq("creado_por", user_id).eq("activa", True).execute()
    if resp_creador.data:
        return {"codigo": resp_creador.data[0]["codigo"]}

    return {"codigo": None}

@router.get("/{codigo}/estado")
async def estado_sesion(codigo: str):
    sesion = obtener_sesion(codigo)
    if not sesion:
        raise HTTPException(status_code=404, detail="Sesión no encontrada o finalizada")
    return {
        "participantes": obtener_participantes(codigo),
        "archivos": obtener_archivos_compartidos(codigo),
    }


@router.post("/{codigo}/compartir")
async def compartir_archivo(codigo: str, body: CompartirArchivoRequest):
    from routers.tasks import get_google_headers

    sesion = obtener_sesion(codigo)
    if not sesion:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    participantes = obtener_participantes(codigo)
    otros_emails = [p["email"] for p in participantes if p["user_id"] != body.user_id and p.get("email")]

    headers = await get_google_headers(body.user_id)

    async with httpx.AsyncClient() as client:
        for email in otros_emails:
            try:
                await client.post(
                    f"https://www.googleapis.com/drive/v3/files/{body.doc_id}/permissions",
                    headers={**headers, "Content-Type": "application/json"},
                    params={"sendNotificationEmail": "false"},
                    json={"role": "writer", "type": "user", "emailAddress": email},
                )
            except Exception as e:
                print(f"⚠️ Error compartiendo con {email}: {e}")

    link = f"https://docs.google.com/document/d/{body.doc_id}/edit"
    archivo = agregar_archivo_compartido(codigo, body.user_id, body.doc_id, body.titulo, link)

    await manager.broadcast(codigo, {"tipo": "archivo_compartido", "archivo": archivo})

    return {"compartido": True, "archivo": archivo}

class CerrarSesionRequest(BaseModel):
    user_id: str


@router.post("/{codigo}/cerrar")
async def cerrar_sesion(codigo: str, body: CerrarSesionRequest):
    sesion = obtener_sesion(codigo)
    if not sesion:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    if sesion.get("creado_por") != body.user_id:
        raise HTTPException(status_code=403, detail="Solo quien creó la sesión puede cerrarla para todos")

    marcar_sesion_inactiva(codigo)
    supabase.table("colaboracion_mensajes").delete().eq("codigo", codigo).execute()
    await manager.broadcast(codigo, {"tipo": "sesion_finalizada"})

    return {"cerrada": True}

class AbandonarRequest(BaseModel):
    user_id: str


@router.post("/{codigo}/abandonar")
async def abandonar_sesion(codigo: str, body: AbandonarRequest):
    quitar_participante(codigo, body.user_id)
    manager.desconectar(codigo, body.user_id)
    restantes = obtener_participantes(codigo)

    if len(restantes) == 0:
        marcar_sesion_inactiva(codigo)
    else:
        await manager.broadcast(codigo, {
            "tipo": "participante_salio",
            "user_id": body.user_id,
            "participantes": restantes,
        })

    return {"abandonado": True}


@router.post("/{codigo}/preguntar")
async def preguntar_tona(codigo: str, body: PreguntarTonaRequest):
    from routers.docs import leer_doc
    from google import genai
    from google.genai import types

    archivos = obtener_archivos_compartidos(codigo)
    contexto_docs = ""
    for a in archivos[:3]:
        try:
            data = await leer_doc(body.user_id, a["doc_id"])
            contexto_docs += f"\n\n--- Documento: {a['titulo']} ---\n{data.get('contenido', '')[:2000]}"
        except Exception as e:
            print(f"⚠️ No se pudo leer {a['titulo']} para {body.user_id}: {e}")

    prompt = f"""Eres Tona, asistente académico, ayudando a un grupo de estudiantes que trabajan juntos en documentos compartidos.

Documentos compartidos en esta sesión:{contexto_docs or ' (ninguno compartido aún)'}

Pregunta del usuario: {body.pregunta}

Responde de forma breve y útil, en español, enfocándote en ayudar con la estructura, contenido o dudas sobre los documentos."""

    cliente = genai.Client(
        vertexai=True,
        project=settings.GOOGLE_CLOUD_PROJECT,
        location=settings.GOOGLE_CLOUD_LOCATION,
    )

    respuesta = cliente.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(max_output_tokens=1024, temperature=0.4),
    )

    texto_respuesta = respuesta.text.strip()

    guardar_mensaje_colaborativo(codigo, body.user_id, "Tona", texto_respuesta, tipo="tona", pregunta=body.pregunta)

    await manager.broadcast(codigo, {
        "tipo": "tona_respuesta",
        "pregunta": body.pregunta,
        "respuesta": texto_respuesta,
    })

    return {"respuesta": texto_respuesta}


# ── WebSocket ─────────────────────────────────────────────────────────────────

@router.websocket("/ws/{codigo}/{user_id}")
async def websocket_sala(ws: WebSocket, codigo: str, user_id: str):
    sesion = obtener_sesion(codigo)
    if not sesion:
        await ws.close(code=4004)
        return

    usuario = obtener_usuario(user_id)
    nombre = usuario.get("name", "Alguien").split()[0] if usuario else "Alguien"

    await manager.conectar(codigo, user_id, ws)
    await manager.broadcast(codigo, {
        "tipo": "participante_unido",
        "user_id": user_id,
        "nombre": nombre,
        "participantes": obtener_participantes(codigo),
    })

    try:
        while True:
            data = await ws.receive_json()
            if data.get("tipo") == "chat":
                texto = data.get("texto", "")
                guardar_mensaje_colaborativo(codigo, user_id, nombre, texto, tipo="chat")
                await manager.broadcast(codigo, {
                    "tipo": "chat",
                    "user_id": user_id,
                    "nombre": nombre,
                    "texto": texto,
                })
    except WebSocketDisconnect:
        manager.desconectar(codigo, user_id)
        quitar_participante(codigo, user_id)
        restantes = obtener_participantes(codigo)

        if len(restantes) == 0:
            marcar_sesion_inactiva(codigo)
            supabase.table("colaboracion_mensajes").delete().eq("codigo", codigo).execute()
        else:
            await manager.broadcast(codigo, {
                "tipo": "participante_salio",
                "user_id": user_id,
                "nombre": nombre,
                "participantes": restantes,
            })

