# agente.py — completo

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Union
from services.gemini import enviar_mensaje
from services.db import obtener_usuario, guardar_historial, obtener_historial, obtener_tareas
from config import settings
from datetime import datetime
import httpx, io, base64

router = APIRouter()

class MensajeRequest(BaseModel):
    user_id: str
    mensaje: str

class MensajeResponse(BaseModel):
    accion: str
    payload: Union[dict, list] = {}
    mensaje: str = ""

HORARIO_MOCK = [
    { "dia": "LUNES",     "clases": ["Cálculo 07:00", "Física 10:00"] },
    { "dia": "MARTES",    "clases": ["Programación 09:00", "Inglés 12:00"] },
    { "dia": "MIÉRCOLES", "clases": ["SO 08:00", "Cálculo 11:00"] },
    { "dia": "JUEVES",    "clases": ["Física 07:00", "Programación 10:00"] },
    { "dia": "VIERNES",   "clases": ["Inglés 09:00", "SO 13:00"] },
]

CALS_MOCK = [
    { "materia": "Cálculo",      "cal": 8.5 },
    { "materia": "Programación", "cal": 9.8 },
    { "materia": "Física",       "cal": 7.2 },
    { "materia": "Inglés",       "cal": 8.0 },
    { "materia": "SO",           "cal": 6.9 },
]

def construir_contexto(user_id: str) -> str:
    usuario = obtener_usuario(user_id)
    tareas = obtener_tareas(user_id)
    if not usuario:
        return ""
    ahora = datetime.now().strftime("%A %d de %B, %H:%M")
    nombre = usuario.get('name', '').split()[0]
    tareas_urgentes = [t for t in tareas if t.get('urgencia') == 'alta']
    tareas_proximas = [t for t in tareas if t.get('urgencia') == 'media']
    contexto = f"""
CONTEXTO DEL USUARIO:
- Nombre: {nombre}
- Fecha y hora actual: {ahora}
- Tier: {usuario.get('tier', 'estudiante')}
"""
    if tareas_urgentes:
        contexto += f"\nTAREAS URGENTES ({len(tareas_urgentes)}):\n"
        for t in tareas_urgentes[:5]:
            contexto += f"  - {t.get('titulo')}: {t.get('resumen')} [vence: {t.get('fecha_limite', 'sin fecha')}]\n"
    if tareas_proximas:
        contexto += f"\nTAREAS PRÓXIMAS ({len(tareas_proximas)}):\n"
        for t in tareas_proximas[:5]:
            contexto += f"  - {t.get('titulo')}: {t.get('resumen')} [vence: {t.get('fecha_limite', 'sin fecha')}]\n"
    if not tareas_urgentes and not tareas_proximas:
        contexto += "\nNo hay tareas pendientes registradas."
    return contexto.strip()

def enriquecer_payload(accion: str, payload, user_id: str):
    tareas = obtener_tareas(user_id)

    if accion == "ver_tareas":
        if tareas:
            return [
                {
                    "id": t.get("id"),
                    "texto": t.get("titulo"),
                    "prioridad": "Alta" if t.get("urgencia") == "alta"
                                 else "Media" if t.get("urgencia") == "media"
                                 else "Baja",
                    "done": t.get("completada", False)
                }
                for t in tareas[:10]
            ]
        return []

    if accion == "ver_horario":
        return HORARIO_MOCK

    if accion == "ver_calificaciones":
        return CALS_MOCK

    return payload

@router.post("/chat", response_model=MensajeResponse)
async def chat(request: MensajeRequest):
    usuario = obtener_usuario(request.user_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    historial_raw = obtener_historial(request.user_id)
    contexto = construir_contexto(request.user_id)
    mensaje_con_contexto = (
        f"{contexto}\n\nMensaje del usuario: {request.mensaje}"
        if contexto and not historial_raw
        else request.mensaje
    )

    resultado = await enviar_mensaje(historial_raw, mensaje_con_contexto)

    print(f"🎯 Gemini respondió: {resultado}")

    accion  = resultado.get("accion", "flash")
    payload = resultado.get("payload", {})
    mensaje = resultado.get("mensaje", "")

    payload = enriquecer_payload(accion, payload, request.user_id)

    print(f"📦 Payload final: {payload}")
    print(f"✅ Enviando: accion={accion}, mensaje={mensaje}")

    historial_actualizado = historial_raw + [
        {"role": "user",  "content": request.mensaje},
        {"role": "model", "content": mensaje or str(resultado)},
    ]
    guardar_historial(request.user_id, historial_actualizado[-40:])

    return MensajeResponse(accion=accion, payload=payload, mensaje=mensaje)

@router.get("/contexto/{user_id}")
async def obtener_contexto(user_id: str):
    usuario = obtener_usuario(user_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    tareas = obtener_tareas(user_id)
    historial = obtener_historial(user_id)
    return {
        "usuario": { "nombre": usuario.get('name', '').split()[0], "tier": usuario.get('tier', 'estudiante') },
        "tareas_total": len(tareas),
        "tareas_urgentes": len([t for t in tareas if t.get('urgencia') == 'alta']),
        "mensajes_historial": len(historial),
    }

@router.delete("/historial/{user_id}")
async def limpiar_historial(user_id: str):
    guardar_historial(user_id, [])
    return {"mensaje": "Historial limpiado"}

@router.post("/hablar")
async def texto_a_voz(request: dict):
    texto = request.get("texto", "")
    if not texto:
        raise HTTPException(status_code=400, detail="Texto vacío")
    url = f"https://texttospeech.googleapis.com/v1/text:synthesize?key={settings.GOOGLE_TTS_KEY}"
    payload = {
        "input": {"text": texto},
        "voice": { "languageCode": "es-US", "name": "es-US-Neural2-C", "ssmlGender": "MALE" },
        "audioConfig": { "audioEncoding": "MP3", "speakingRate": 0.92, "pitch": -1.5 }
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, json=payload)
    if resp.status_code != 200:
        print(f"TTS Error {resp.status_code}: {resp.text}")
        raise HTTPException(status_code=500, detail=f"Error TTS: {resp.text}")
    audio_bytes = base64.b64decode(resp.json().get("audioContent", ""))
    return StreamingResponse(
        io.BytesIO(audio_bytes),
        media_type="audio/mpeg",
        headers={"Content-Disposition": "inline"}
    )