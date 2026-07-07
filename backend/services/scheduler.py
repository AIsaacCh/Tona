from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
from services.db import obtener_todos_los_usuarios, obtener_tareas, obtener_usuario, obtener_sitios, guardar_sitios
from datetime import datetime
import hashlib
import httpx
import json

scheduler = AsyncIOScheduler()


def iniciar_scheduler():
    scheduler.add_job(
        revisar_tareas_urgentes,
        trigger=IntervalTrigger(minutes=30),
        id="revisar_tareas",
        replace_existing=True,
    )
    scheduler.add_job(
        revisar_todos_los_sitios,
        trigger=CronTrigger(hour=8, minute=0),   # cada día a las 8am
        id="revisar_sitios",
        replace_existing=True,
    )
    scheduler.start()
    print("Scheduler iniciado")


async def revisar_tareas_urgentes():
    try:
        usuarios = obtener_todos_los_usuarios()
        for usuario in usuarios:
            user_id = usuario["id"]
            tareas    = obtener_tareas(user_id)
            urgentes  = [t for t in tareas if t.get("urgencia") == "alta" and not t.get("completada")]
            if urgentes:
                print(f"[Tona] {usuario.get('name')}: {len(urgentes)} tareas urgentes")
    except Exception as e:
        print(f"Error en scheduler tareas: {e}")


async def revisar_todos_los_sitios():
    try:
        usuarios = obtener_todos_los_usuarios()
        for usuario in usuarios:
            user_id = usuario["id"]
            sitios = obtener_sitios(user_id)
            for sitio in sitios:
                await _revisar_sitio(user_id, sitio["id"])
    except Exception as e:
        print(f"Error en scheduler sitios: {e}")


async def _revisar_sitio(user_id: str, sitio_id: str) -> dict:
    """
    Revisa un sitio, compara hash, si cambió pide resumen a Gemini.
    Devuelve {"cambio": bool, "resumen": str, "sitio": dict}
    """
    sitios = obtener_sitios(user_id)
    sitio  = next((s for s in sitios if s.get("id") == sitio_id), None)
    if not sitio:
        return {"cambio": False, "resumen": "", "sitio": None}

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(sitio["url"], follow_redirects=True)

        if resp.status_code != 200:
            return {"cambio": False, "resumen": "No se pudo acceder al sitio", "sitio": sitio}

        # Texto limpio — quitar tags HTML básicos
        import re
        texto = resp.text
        texto = re.sub(r"<script[^>]*>.*?</script>", " ", texto, flags=re.DOTALL)
        texto = re.sub(r"<style[^>]*>.*?</style>",  " ", texto, flags=re.DOTALL)
        texto = re.sub(r"<[^>]+>", " ", texto)
        texto = re.sub(r"\s+", " ", texto).strip()
        texto = texto[:6000]   # máximo 6k chars para el hash y el resumen

        nuevo_hash = hashlib.md5(texto.encode()).hexdigest()
        hash_anterior = sitio.get("ultimo_hash", "")

        ahora = datetime.now().isoformat()

        if nuevo_hash == hash_anterior:
            # Sin cambios — actualizar fecha de revisión
            for s in sitios:
                if s["id"] == sitio_id:
                    s["ultima_revision"] = ahora
            guardar_sitios(user_id, sitios)
            return {"cambio": False, "resumen": "Sin cambios desde la última revisión", "sitio": sitio}

        # Hay cambio — pedir resumen a Gemini
        resumen = await _resumir_cambio(sitio["alias"], texto, sitio.get("ultimo_resumen", ""))

        for s in sitios:
            if s["id"] == sitio_id:
                s["ultimo_hash"]     = nuevo_hash
                s["ultimo_resumen"]  = resumen
                s["ultima_revision"] = ahora
        guardar_sitios(user_id, sitios)

        print(f"[Tona] Cambio detectado en {sitio['alias']}: {resumen[:80]}")
        return {"cambio": True, "resumen": resumen, "sitio": sitio}

    except Exception as e:
        print(f"Error revisando sitio {sitio.get('url')}: {e}")
        return {"cambio": False, "resumen": f"Error: {str(e)}", "sitio": sitio}


async def _resumir_cambio(alias: str, texto_nuevo: str, resumen_anterior: str) -> str:
    try:
        from google import genai
        from google.genai import types
        from config import settings

        cliente = genai.Client(api_key=settings.GEMINI_API_KEY)

        prompt = f"""Eres un asistente que monitorea páginas web para un estudiante.

Página: {alias}
Resumen anterior (puede estar vacío si es la primera vez): {resumen_anterior or 'Primera revisión'}

Contenido actual de la página (texto extraído):
{texto_nuevo[:3000]}

Tu tarea: En máximo 3 oraciones, describe qué información relevante hay o qué cambió respecto al resumen anterior. 
Sé concreto. Si es la primera revisión, resume el contenido más relevante.
Responde solo el resumen, sin explicaciones adicionales."""

        respuesta = cliente.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                max_output_tokens=200,
                temperature=0.2,
            ),
        )
        return respuesta.text.strip()
    except Exception as e:
        print(f"Error resumiendo con Gemini: {e}")
        return "Cambio detectado en la página."


def detener_scheduler():
    if scheduler.running:
        scheduler.shutdown()