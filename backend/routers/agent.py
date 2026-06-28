from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from services.gemini import enviar_mensaje
from services.db import (
    obtener_usuario, guardar_historial, obtener_historial,
    obtener_tareas
)
from datetime import datetime
from fastapi.responses import StreamingResponse
from config import settings
import httpx
import io
import base64
import logging
import hashlib
from collections import OrderedDict

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# --- Modelos Pydantic ---
class MensajeRequest(BaseModel):
    user_id: str
    mensaje: str

class MensajeResponse(BaseModel):
    respuesta: str
    acciones: List[str] = []

class TextoRequest(BaseModel):
    texto: str
    user_id: Optional[str] = None
    regenerate: Optional[bool] = False

# --- Funciones Auxiliares ---
def detectar_acciones(respuesta: str) -> List[str]:
    """Detecta acciones mencionadas en la respuesta"""
    acciones = []
    keywords = {
        "classroom": ["tarea", "classroom", "entrega", "curso"],
        "calendar": ["calendario", "evento", "agenda", "reunión"],
        "drive": ["archivo", "documento", "drive"],
        "gmail": ["correo", "email", "mensaje"],
    }
    respuesta_lower = respuesta.lower()
    for servicio, palabras in keywords.items():
        if any(p in respuesta_lower for p in palabras):
            acciones.append(servicio)
    return acciones

def construir_contexto(user_id: str) -> str:
    """Construye el contexto del usuario para el chat"""
    usuario = obtener_usuario(user_id)
    tareas = obtener_tareas(user_id)
    if not usuario:
        return ""

    ahora = datetime.now().strftime("%A %d de %B, %H:%M")
    nombre = usuario.get('name', '').split()[0]
    tareas_urgentes = [t for t in tareas if t.get('urgencia') == 'alta']
    tareas_proximas = [t for t in tareas if t.get('urgencia') == 'media']

    contexto = f"""
Contexto actual del usuario:
- Nombre: {nombre}
- Fecha y hora: {ahora}
- Tier: {usuario.get('tier', 'estudiante')}
"""
    if tareas_urgentes:
        contexto += f"\nTareas URGENTES ({len(tareas_urgentes)}):\n"
        for t in tareas_urgentes[:3]:
            contexto += f"  - {t.get('titulo')}: {t.get('resumen')}\n"

    if tareas_proximas:
        contexto += f"\nTareas próximas ({len(tareas_proximas)}):\n"
        for t in tareas_proximas[:3]:
            contexto += f"  - {t.get('titulo')}: {t.get('resumen')}\n"

    return contexto.strip()

# --- Cache de audio en memoria ---
class AudioCache:
    """Cache de audio en memoria con LRU (Least Recently Used)"""
    def __init__(self, max_size: int = 50):
        self.cache = OrderedDict()
        self.max_size = max_size
    
    def get(self, key: str) -> Optional[bytes]:
        """Obtener audio del caché"""
        if key in self.cache:
            self.cache.move_to_end(key)
            return self.cache[key]
        return None
    
    def set(self, key: str, audio_bytes: bytes):
        """Guardar audio en caché"""
        if key in self.cache:
            self.cache.move_to_end(key)
        else:
            if len(self.cache) >= self.max_size:
                self.cache.popitem(last=False)
        self.cache[key] = audio_bytes
    
    def clear(self):
        self.cache.clear()
    
    def size(self) -> int:
        return len(self.cache)
    
    def keys(self) -> List[str]:
        return list(self.cache.keys())

audio_cache = AudioCache(max_size=50)

# --- Endpoints Principales ---
@router.post("/chat", response_model=MensajeResponse)
async def chat(request: MensajeRequest):
    logger.info(f"Chat request from user: {request.user_id}")
    
    usuario = obtener_usuario(request.user_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    historial_raw = obtener_historial(request.user_id)
    contexto = construir_contexto(request.user_id)
    
    mensaje_con_contexto = f"{contexto}\n\n{request.mensaje}" if contexto else request.mensaje

    respuesta = await enviar_mensaje(historial_raw, mensaje_con_contexto)

    historial_actualizado = historial_raw + [
        {"role": "user", "content": request.mensaje},
        {"role": "model", "content": respuesta},
    ]
    guardar_historial(request.user_id, historial_actualizado[-40:])

    acciones = detectar_acciones(respuesta)
    
    return MensajeResponse(respuesta=respuesta, acciones=acciones)

@router.get("/contexto/{user_id}")
async def obtener_contexto(user_id: str):
    usuario = obtener_usuario(user_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    tareas = obtener_tareas(user_id)
    historial = obtener_historial(user_id)
    
    return {
        "usuario": {
            "nombre": usuario.get('name', '').split()[0],
            "tier": usuario.get('tier', 'estudiante'),
        },
        "tareas_total": len(tareas),
        "tareas_urgentes": len([t for t in tareas if t.get('urgencia') == 'alta']),
        "mensajes_historial": len(historial),
    }

@router.delete("/historial/{user_id}")
async def limpiar_historial(user_id: str):
    guardar_historial(user_id, [])
    return {"mensaje": "Historial limpiado correctamente"}

# --- Endpoints de Caché ---
@router.delete("/cache/audio")
async def limpiar_cache_audio():
    audio_cache.clear()
    logger.info("Cache de audio limpiado")
    return {"mensaje": "Cache limpiado correctamente", "size": 0}

@router.get("/cache/audio/stats")
async def stats_cache_audio():
    return {
        "size": audio_cache.size(),
        "max_size": audio_cache.max_size,
        "keys": audio_cache.keys()[:10]
    }

@router.post("/hablar")
async def texto_a_voz(request: TextoRequest):
    """
    Convierte texto a voz usando Google TTS API
    Voz: es-US-Wavenet-C (fluida, menos expresiva que Neural2)
    """
    if not request.texto:
        raise HTTPException(status_code=400, detail="El texto no puede estar vacío")

    texto_hash = hashlib.md5(request.texto.encode('utf-8')).hexdigest()
    
    if not request.regenerate:
        cached_audio = audio_cache.get(texto_hash)
        if cached_audio:
            logger.info(f"✅ Audio en caché para: {request.texto[:50]}...")
            return StreamingResponse(
                io.BytesIO(cached_audio),
                media_type="audio/mpeg",
                headers={
                    "Content-Disposition": "inline",
                    "Content-Length": str(len(cached_audio)),
                    "X-Cache": "HIT"
                }
            )

    try:
        logger.info(f"🎵 Generando nuevo audio: {request.texto[:50]}...")
        
        api_key = settings.GOOGLE_TTS_KEY
        if not api_key:
            logger.error("GOOGLE_TTS_KEY no configurada")
            raise HTTPException(status_code=500, detail="Configuración de TTS incompleta")

        url = f"https://texttospeech.googleapis.com/v1/text:synthesize?key={api_key}"
        
        payload = {
            "input": {"text": request.texto},
            "voice": {
                "languageCode": "es-US",
                "name": "es-US-Wavenet-C",  # ✅ WaveNet (menos expresiva)
                "ssmlGender": "MALE"
            },
            "audioConfig": {
                "audioEncoding": "MP3",
                "speakingRate": 0.92,
                "pitch": -0.5,  # Tono más natural, menos grave
            }
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload)

        if response.status_code != 200:
            logger.error(f"Google TTS Error: {response.text}")
            raise HTTPException(
                status_code=500, 
                detail=f"Error del servicio de voz: {response.text}"
            )

        data = response.json()
        audio_content = data.get("audioContent")
        
        if not audio_content:
            logger.error("No se recibió contenido de audio de Google")
            raise HTTPException(status_code=500, detail="No se pudo generar el audio")

        audio_bytes = base64.b64decode(audio_content)
        audio_cache.set(texto_hash, audio_bytes)
        
        logger.info(f"✅ Audio generado: {len(audio_bytes)} bytes - Guardado en caché (total: {audio_cache.size()})")

        return StreamingResponse(
            io.BytesIO(audio_bytes),
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": "inline",
                "Content-Length": str(len(audio_bytes)),
                "Cache-Control": "no-cache",
                "X-Cache": "MISS"
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error inesperado en TTS: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")