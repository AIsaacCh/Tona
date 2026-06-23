from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from services.gemini import crear_sesion, enviar_mensaje,generar_respuesta_rapida
from services.db import(
    obtener_usuario,guardar_historial,obtener_historial,obtener_tareas
)
from datetime import datetime

router=APIRouter
class MensajeRequest(BaseModel):
    user_id:str
    mensaje:str


class MensajeRespose(BaseModel):
    respuesta:str
    acciones: List[str]=[]


def construir_contexto(user_id: str) -> str:
    usuario=obtener_usuario(user_id)
    tareas=obtener_tareas(user_id)

    if not usuario:
        return""
    
    ahora=datetime.now().strftime("%A %d de %B, %H:%M")
    nombre=usuario.get('name', '').split()[0]

    tareas_urgentes=[t for t in tareas if t.get('urgencia')=='alta']
    tareas_proximas=[t for t in tareas if t.get('urgencia')=='media']

    contexto = f"""
Contexto actual del usuario:
- Nombre: {nombre}
- Fecha y hora: {ahora}
- Tier: {usuario.get('tier', 'estudiante')}
"""
    
    if tareas_urgentes:
        contexto += f"\nTareas URGENTES ({len (tareas_urgentes)}):\n"
        for t in tareas_urgentes[:3]:
            contexto += f"  -{t.get('titulo')}: {t.get('resumen')}\n"

    
    if tareas_proximas:
        contexto += f"\n Tareas proximas({len(tareas_proximas)}:\n)"
        for t in tareas_proximas[:3]:
            contexto+= f". -{t.get('titulo')}: {t.get('resumen')}\n"

    return contexto.strip()


@router.post("/chat", response_model=MensajeRespose)
async def chat (request:MensajeRequest):
    usuario=obtener_usuario(request.user_id)

    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no wncontrado")
    
    historial_raw=obtener_historial(request.user_id)
    historial_gemini=[]

    for msg in historial_raw[-20:]:
        historial_gemini.append({
            "role": msg["role"],
            "parts": [{"text": msg["content"]}]
        })

    sesion=crear_sesion(historial_gemini if historial_gemini else None)

    contexto=construir_contexto(request.user_id)
    mensaje_con_contexto= f"{contexto}\n\n{request.mensaje}" if contexto and not historial_raw else request.mensaje

    respuesta=await enviar_mensaje(sesion, mensaje_con_contexto)

    historial_actualizado=historial_raw + [
        {"role": "user", "content":request.mensaje},
        {"role": "model", "content":respuesta},

    ]

    guardar_historial(request.user_id, historial_actualizado[-40:])

    acciones=detectar_acciones(respuesta)

    return MensajeRespose(respuesta=respuesta, acciones=acciones)

def detectar_acciones(respuesta:str) -> List[str]:
    acciones=[]
    keywords={
        "classroom":["tarea", "classroom", "entrega", "curso"],
        "calendar": ["calendario", "evento", "agenda", "reunión"],
        "drive": ["archivo", "documento", "drive"],
        "gmail": ["correo", "email", "mensaje"],
    }
    respuesta_lower=respuesta.lower()
    for servicio , palabras in keywords.items():
        if any (p in respuesta_lower for p in palabras):
            acciones.append(servicio)

    return acciones

@router.get("/contexto/{user_id}")
async def obtener_contexto(user_id: str):
    usuario=obtener_usuario(user_id)
    if not usuario :
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    tareas = obtener_tareas(user_id)
    historial=obtener_historial(user_id)
    return{
           "usuario": {
            "nombre": usuario.get('name', '').split()[0],
            "tier": usuario.get('tier', 'estudiante'),
        },
        "tareas_total": len(tareas),
        "tareas_urgentes": len([t for t in tareas if t.get('urgencia') == 'alta']),
        "mensajes_historial": len(historial),
    }

@router.delete("/historial/{user_id}")
async def limpiar_historial(user_id:str):
    guardar_historial(user_id,[])
    return{"mensage": "Historial limpiado"}


