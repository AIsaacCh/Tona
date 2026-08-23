from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
from services.db import (
    obtener_todos_los_usuarios, obtener_tareas, obtener_usuario, obtener_sitios, guardar_sitios,
    supabase, obtener_carpetas_clases, guardar_sugerencia_entrega, obtener_archivo_de_tarea,
)
from datetime import datetime, timezone, timedelta
import hashlib
import httpx
from urllib.parse import urljoin
from bs4 import BeautifulSoup
from routers.tasks import buscar_entrega_en_drive
from services.tiempo import hoy_mx
import json
import re
import asyncio

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
        trigger=CronTrigger(hour=8, minute=0),
        id="revisar_sitios",
        replace_existing=True,
    )
    scheduler.add_job(
        revisar_posibles_entregas,
        trigger=IntervalTrigger(hours=6),
        id="revisar_entregas",
        replace_existing=True,
    )
    scheduler.add_job(
        cerrar_salas_vacias,
        trigger=IntervalTrigger(minutes=15),
        id="cerrar_salas_vacias",
        replace_existing=True,
    )
    scheduler.start()
    print("Scheduler iniciado")


async def cerrar_salas_vacias():
    try:
        limite = (datetime.now(timezone.utc) - timedelta(minutes=30)).isoformat()
        resp = supabase.table("colaboracion_sesiones") \
            .select("codigo") \
            .eq("activa", True) \
            .not_.is_("vacia_desde", "null") \
            .lt("vacia_desde", limite) \
            .execute()

        for fila in (resp.data or []):
            codigo = fila["codigo"]
            supabase.table("colaboracion_sesiones").update({"activa": False}).eq("codigo", codigo).execute()
            supabase.table("colaboracion_mensajes").delete().eq("codigo", codigo).execute()
            print(f"[Tona] Sala {codigo} cerrada por inactividad (vacía +30min)")
    except Exception as e:
        print(f"Error cerrando salas vacías: {e}")


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

async def revisar_posibles_entregas():
    """
    Para tareas de Classroom próximas a vencer (<=2 días) y no completadas,
    busca en la carpeta de Drive de esa clase si ya existe un archivo que
    parezca ser esa entrega, y guarda la sugerencia para mostrarla al usuario.
    """
    from routers.tasks import buscar_entrega_en_drive
    
    try:
        usuarios = obtener_todos_los_usuarios()
        hoy = hoy_mx()
        limite = hoy + timedelta(days=2)

        for usuario in usuarios:
            user_id = usuario["id"]
            carpetas = obtener_carpetas_clases(user_id)
            if not carpetas:
                continue  # no configuró carpetas de clases, nada que buscar

            tareas = obtener_tareas(user_id)
            proximas = [
                t for t in tareas
                if t.get("fuente") == "classroom"
                and not t.get("completada")
                and t.get("fecha_limite")
            ]

            for t in proximas:
                try:
                    fecha_t = datetime.strptime(t["fecha_limite"], "%Y-%m-%d").date()
                except:
                    continue
                if not (hoy <= fecha_t <= limite):
                    continue

                curso_id = t.get("curso_id")
                if not curso_id:
                    continue

                # PRIMERO: Verificar si ya tiene un archivo vinculado en la base de datos
                vinculado = obtener_archivo_de_tarea(user_id, t["id"])
                if vinculado:
                    guardar_sugerencia_entrega(user_id, {
                        "tarea_id": t["id"],
                        "titulo_tarea": t.get("titulo", ""),
                        "curso_id": curso_id,
                        "archivo_id": vinculado["archivo_id"],
                        "archivo_nombre": vinculado["archivo_nombre"],
                        "archivo_link": vinculado["archivo_link"],
                    })
                    print(f"[Tona] Tarea {t.get('titulo')} ya tiene archivo vinculado: {vinculado['archivo_nombre']}")
                    continue

                # SEGUNDO: Buscar en Drive si no tiene archivo vinculado
                resultado = await buscar_entrega_en_drive(curso_id=curso_id, titulo=t.get("titulo", ""), user_id=user_id)
                candidatos = resultado.get("candidatos", [])
                mejor = candidatos[0] if candidatos else None

                if mejor and mejor["score"] >= 0.6:
                    guardar_sugerencia_entrega(user_id, {
                        "tarea_id": t["id"],
                        "titulo_tarea": t.get("titulo", ""),
                        "curso_id": curso_id,
                        "archivo_id": mejor["id"],
                        "archivo_nombre": mejor["nombre"],
                        "archivo_link": mejor["link"],
                    })
                    print(f"[Tona] Posible entrega detectada para {user_id}: '{t.get('titulo')}' ↔ '{mejor['nombre']}'")
                else:
                    # Guardar que no tiene archivo para evitar búsquedas repetidas
                    guardar_sugerencia_entrega(user_id, {
                        "tarea_id": t["id"],
                        "titulo_tarea": t.get("titulo", ""),
                        "curso_id": curso_id,
                        "archivo_id": f"sin_archivo_{t['id']}",
                        "sin_archivo": True,
                    })

    except Exception as e:
        print(f"Error en scheduler entregas: {e}")

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


def _extraer_contenido_estructurado(html: str) -> str:
    """
    Extrae contenido priorizado de una página HTML usando BeautifulSoup,
    en vez de aplanar todo a texto plano. Devuelve secciones etiquetadas
    para que Gemini sepa dónde está la información de mayor valor.
    """
    soup = BeautifulSoup(html, "html.parser")

    titulo_pagina = soup.title.get_text(strip=True) if soup.title else ""

    # Quitar elementos que casi nunca aportan información de vigilancia
    for tag in soup(["script", "style", "nav", "header", "footer", "svg", "noscript"]):
        tag.decompose()

    # Los modales de Bootstrap (class contiene "modal") suelen ser texto
    # institucional fijo (misión/visión), no avisos — los quitamos
    for tag in soup.find_all(class_=lambda c: c and "modal" in c):
        tag.decompose()

    # 1) Encabezados — casi siempre son los títulos de avisos/convocatorias
    encabezados = []
    for h in soup.find_all(["h1", "h2", "h3", "h4", "h5"]):
        texto_h = h.get_text(strip=True)
        if texto_h and len(texto_h) > 2:
            encabezados.append(texto_h)
    encabezados_unicos = list(dict.fromkeys(encabezados))[:40]

    # 2) alt/title de imágenes — para saber qué banners/íconos hay
    atributos = []
    for tag in soup.find_all(["img", "a"]):
        for attr in ("alt", "title"):
            val = tag.get(attr)
            if val and len(val.strip()) > 3:
                atributos.append(val.strip())
    atributos_unicos = list(dict.fromkeys(atributos))[:60]

    # 2b) Enlaces con su URL real — para poder dar el link cuando lo pidan
    enlaces = []
    base_url = ""
    match_base = re.search(r'<base\s+href="([^"]+)"', html, flags=re.IGNORECASE)
    if match_base:
        base_url = match_base.group(1)

    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        if not href or href.startswith("#") or href.startswith("javascript:"):
            continue
        texto_enlace = a.get_text(strip=True) or a.get("title", "") or a.get("alt", "")
        if not texto_enlace or len(texto_enlace) < 3:
            continue
        url_completa = urljoin(base_url or "https://", href) if base_url else href
        enlaces.append(f"{texto_enlace} -> {url_completa}")
    enlaces_unicos = list(dict.fromkeys(enlaces))[:50]

    # 3) Texto visible general, como respaldo
    texto_general = soup.get_text(separator=" ", strip=True)
    texto_general = " ".join(texto_general.split())

    # Presupuesto de caracteres POR SECCIÓN, para que ninguna
    # sección larga (ej. texto general) desplace a las demás
    secciones = []
    if titulo_pagina:
        secciones.append(f"TÍTULO DE LA PÁGINA: {titulo_pagina}")
    if encabezados_unicos:
        secciones.append("ENCABEZADOS Y TÍTULOS DE SECCIONES:\n- " + "\n- ".join(encabezados_unicos)[:3000])
    if atributos_unicos:
        secciones.append("TEXTO DE IMÁGENES (banners, íconos):\n- " + "\n- ".join(atributos_unicos)[:3000])
    if enlaces_unicos:
        secciones.append("ENLACES CON SU URL REAL (usa esto si el usuario pide un link):\n- " + "\n- ".join(enlaces_unicos)[:5000])
    secciones.append("TEXTO GENERAL DE LA PÁGINA (respaldo, puede tener ruido):\n" + texto_general[:6000])

    return "\n\n".join(secciones)


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

        # Extraer contenido estructurado
        texto = _extraer_contenido_estructurado(resp.text)
        
        nuevo_hash = hashlib.md5(texto.encode()).hexdigest()
        hash_anterior = sitio.get("ultimo_hash", "")

        ahora = datetime.now().isoformat()

        if nuevo_hash == hash_anterior:
            # Sin cambios — actualizar fecha de revisión
            for s in sitios:
                if s["id"] == sitio_id:
                    s["ultima_revision"] = ahora
            guardar_sitios(user_id, sitios)
            return {
                "cambio": False,
                "resumen": sitio.get("ultimo_resumen") or "Sin cambios desde la última revisión",
                "sitio": sitio,
                "contenido_completo": texto,
            }

        # Hay cambio — pedir resumen a Gemini
        resumen = await _resumir_cambio(sitio["alias"], texto, sitio.get("ultimo_resumen", ""))

        es_actualizacion_real = bool(hash_anterior)  # False si es la primera revisión (solo baseline)

        for s in sitios:
            if s["id"] == sitio_id:
                s["ultimo_hash"]     = nuevo_hash
                s["ultimo_resumen"]  = resumen
                s["ultima_revision"] = ahora
                s["notificado"]      = not es_actualizacion_real
        guardar_sitios(user_id, sitios)

        print(f"[Tona] Cambio detectado en {sitio['alias']}: {resumen[:80]}")
        return {"cambio": True, "resumen": resumen, "sitio": sitio, "contenido_completo": texto}

    except Exception as e:
        print(f"Error revisando sitio {sitio.get('url')}: {e}")
        return {"cambio": False, "resumen": f"Error: {str(e)}", "sitio": sitio}


async def _resumir_cambio(alias: str, texto_nuevo: str, resumen_anterior: str) -> str:
    try:
        from google import genai
        from google.genai import types
        from config import settings

        cliente = genai.Client(
            vertexai=True,
            project=settings.GOOGLE_CLOUD_PROJECT,
            location=settings.GOOGLE_CLOUD_LOCATION,
        )

        prompt = f"""Eres un asistente que monitorea páginas web para un estudiante.

Página: {alias}
Resumen anterior (puede estar vacío si es la primera vez): {resumen_anterior or 'Primera revisión'}

Contenido actual de la página, ya organizado por secciones (revisa TODAS las secciones, especialmente
"ENCABEZADOS" y "TEXTO DE IMÁGENES Y ENLACES", ahí suelen estar los avisos y convocatorias reales):
{texto_nuevo[:12000]}

Tu tarea: identifica TODOS los avisos, convocatorias, becas, fechas límite o eventos DISTINTOS que encuentres
en el texto. NO te detengas en el primero que encuentres — revisa el texto completo de principio a fin y
lista cada tema diferente que aparezca, aunque parezcan muchos. Es normal y esperado que una página
institucional tenga 4, 5 o más avisos distintos al mismo tiempo (becas, ETS, convocatorias, trámites,
titulación, etc.) — repórtalos todos, no solo uno.

Responde en formato de lista, un aviso concreto por línea, hasta 8 líneas si hay ese contenido disponible,
cada línea con el dato más específico posible (nombre + fecha si la hay). Ejemplo de formato:
- Convocatoria de becas Benito Juárez, carga de matrícula 1 de febrero
- Solicitud de revisión de ETS Extraordinario (básicas, tecnológicas, humanísticas)
- Expo Profesiográfica 2025, nivel medio superior
- Convocatoria REAC 2026/2
- Convocatoria de Titulación 2026 (2025/2)

Si tras revisar el texto genuinamente NO hay contenido informativo claro (solo menús, enlaces genéricos o
texto repetido de navegación), responde EXACTAMENTE: "SIN_CONTENIDO_CLARO"
No inventes información que no esté literalmente en el texto. No agregues explicaciones, solo la lista."""

        # ✅ FIX: Ejecutar llamada síncrona en hilo separado para no bloquear el event loop
        respuesta = await asyncio.to_thread(
            cliente.models.generate_content,
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                max_output_tokens=1500,
                temperature=0.2,
                thinking_config=types.ThinkingConfig(thinking_budget=0),
            ),
        )
        texto_resumen = respuesta.text.strip() if respuesta.text else ""

        if texto_resumen == "SIN_CONTENIDO_CLARO" or len(texto_resumen) < 25:
            print(f"⚠️ Sin contenido claro para {alias}: '{texto_resumen}'")
            return "No encontré contenido informativo claro en esta revisión (puede que la página cargue su contenido con JavaScript). Te recomiendo revisarla directamente."
        return texto_resumen
    
    except Exception as e:
        print(f"Error resumiendo con Gemini: {e}")
        return "Cambio detectado en la página."


def detener_scheduler():
    if scheduler.running:
        scheduler.shutdown()