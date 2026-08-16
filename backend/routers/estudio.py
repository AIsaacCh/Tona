from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from services.auth_utils import verificar_identidad
from services.deteccion_tema import detectar_tema, info_lab
from services.db import (
    crear_sesion_estudio, obtener_sesion_estudio, listar_sesiones_estudio,
    guardar_mensaje_estudio, obtener_mensajes_estudio, cerrar_sesion_estudio,
)

router = APIRouter()


class CrearSesionRequest(BaseModel):
    materia: str
    titulo: str | None = None


# ✅ CORREGIDO - sin {user_id}
@router.post("/crear")
async def crear_sesion(
    body: CrearSesionRequest,
    user_id: str = Depends(verificar_identidad)
):
    sesion = crear_sesion_estudio(user_id, body.materia, body.titulo)
    return {"creada": True, "sesion": sesion}


# ✅ CORREGIDO - sin {user_id}
@router.get("/")
async def listar_sesiones(user_id: str = Depends(verificar_identidad)):
    return {"sesiones": listar_sesiones_estudio(user_id)}


# ✅ CORREGIDO - sin {user_id}
@router.get("/{sesion_id}")
async def obtener_sesion(
    sesion_id: str,
    user_id: str = Depends(verificar_identidad)
):
    sesion = obtener_sesion_estudio(sesion_id, user_id)
    if not sesion:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    mensajes = obtener_mensajes_estudio(sesion_id, user_id)
    return {"sesion": sesion, "mensajes": mensajes}


class MensajeRequest(BaseModel):
    texto: str


# ✅ CORREGIDO - sin {user_id}
@router.post("/{sesion_id}/mensaje")
async def enviar_mensaje(
    sesion_id: str,
    body: MensajeRequest,
    user_id: str = Depends(verificar_identidad)
):
    sesion = obtener_sesion_estudio(sesion_id, user_id)
    if not sesion:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    guardar_mensaje_estudio(sesion_id, user_id, "usuario", body.texto)

    tema_id = detectar_tema(body.texto)
    laboratorio_sugerido = None
    respuesta_texto = "Voy a revisar tus documentos y te ayudo con eso."

    if tema_id:
        lab = info_lab(tema_id)
        laboratorio_sugerido = tema_id
        respuesta_texto = (
            f"Detecté que esto es sobre {lab['nombre_display']}. "
            f"Puedo abrirte el laboratorio interactivo para que lo veas con parámetros reales, "
            f"¿quieres entrar?"
        )

    fila_respuesta = guardar_mensaje_estudio(
        sesion_id, user_id, "tona", respuesta_texto, laboratorio_sugerido
    )
    return {"respuesta": fila_respuesta}


# ✅ CORREGIDO - sin {user_id}
@router.post("/{sesion_id}/cerrar")
async def cerrar_sesion(
    sesion_id: str,
    user_id: str = Depends(verificar_identidad)
):
    cerrar_sesion_estudio(sesion_id, user_id)
    return {"cerrada": True}