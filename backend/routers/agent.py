from fastapi import APIRouter, HTTPException 
from fastapi import Header, Depends, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Union
import time, difflib
from services.auth_utils import decodificar_token, verificar_identidad, obtener_user_id_de_cookie
from services.gemini import enviar_mensaje, responder_sobre_sitios, extraer_valor_campo, responder_consulta_notion, detectar_idioma
from services.db import obtener_usuario, guardar_historial, obtener_historial, obtener_tareas, guardar_tareas, obtener_archivo_de_tarea, obtener_cache, guardar_cache
from services.db import calcular_nivel_uso, registrar_uso_tokens
from config import settings
from datetime import datetime, timedelta
import httpx, io, base64, uuid, json
import re

# ✅ IMPORTAR _obtener_calendar desde tasks.py
from routers.tasks import _obtener_calendar



router = APIRouter()


# ──────────────────────────────────────────────────────────────────────────────
# 🛡️ DETECCIÓN DE SPAM
# ──────────────────────────────────────────────────────────────────────────────

VENTANA_SPAM_SEGUNDOS = 12
MIN_MENSAJES_PARA_SPAM = 4
SIMILITUD_SPAM = 0.85

def _detectar_spam(user_id: str, mensaje: str) -> bool:
    ahora = time.time()
    reciente = obtener_cache(user_id, "ritmo_mensajes") or []
    reciente = [h for h in reciente if ahora - h["ts"] < VENTANA_SPAM_SEGUNDOS]
    reciente.append({"ts": ahora, "texto": mensaje})
    guardar_cache(user_id, "ritmo_mensajes", reciente, ttl_minutos=1)

    if len(reciente) < MIN_MENSAJES_PARA_SPAM:
        return False
    textos = [h["texto"] for h in reciente]
    similares = sum(
        1 for i in range(1, len(textos))
        if difflib.SequenceMatcher(None, textos[i-1].lower(), textos[i].lower()).ratio() >= SIMILITUD_SPAM
    )
    return similares >= MIN_MENSAJES_PARA_SPAM - 1

# ──────────────────────────────────────────────────────────────────────────────

class MensajeRequest(BaseModel):
    mensaje: str


class MensajeResponse(BaseModel):
    accion: str
    payload: Union[dict, list] = {}
    mensaje: str = ""
    flujo_activo: bool = False
    modo_ui: str = "compacto"


HORARIO_MOCK = [
    {"dia": "LUNES",     "clases": ["Cálculo 07:00", "Física 10:00"]},
    {"dia": "MARTES",    "clases": ["Programación 09:00", "Inglés 12:00"]},
    {"dia": "MIÉRCOLES", "clases": ["SO 08:00", "Cálculo 11:00"]},
    {"dia": "JUEVES",    "clases": ["Física 07:00", "Programación 10:00"]},
    {"dia": "VIERNES",   "clases": ["Inglés 09:00", "SO 13:00"]},
]

CALS_MOCK = [
    {"materia": "Cálculo",      "cal": 8.5},
    {"materia": "Programación", "cal": 9.8},
    {"materia": "Física",       "cal": 7.2},
    {"materia": "Inglés",       "cal": 8.0},
    {"materia": "SO",           "cal": 6.9},
]

# ──────────────────────────────────────────────────────────────────────────────
# 🆕 FLUJO DE CONVERSACIÓN (captura de datos)
# ──────────────────────────────────────────────────────────────────────────────

CANCELACIONES = {"cancela", "cancelar", "olvídalo", "olvidalo", "ya no",
                  "mejor no", "déjalo así", "dejalo asi", "olvida eso", "no importa"}

def es_cancelacion(mensaje: str) -> bool:
    m = mensaje.strip().lower()
    return any(c in m for c in CANCELACIONES)

PREGUNTAS_LISTADO_NOTION = {
    "cuáles", "cuales", "qué páginas", "que paginas", "cuál tengo",
    "cual tengo", "qué tengo", "que tengo", "no sé", "no se",
}

def es_pregunta_listado_notion(mensaje: str) -> bool:
    m = mensaje.strip().lower()
    return any(p in m for p in PREGUNTAS_LISTADO_NOTION)

# Overrides que fuerzan un modo sin importar lo que diga Gemini
OVERRIDES_MODO_UI = {
    "cerrar_vista": "compacto",
    "cerrar_todo": "compacto",
    "solicitar_dato": "compacto",
    "abrir_panel_trabajo": "completo",
    "abrir_docs": "completo",
    "abrir_docs_con_titulo": "completo",
    "abrir_doc_especifico": "completo",
    "ver_gmail": "completo",
    "buscar_correos_tema": "completo",
    "ver_archivos_drive": "completo",
    "ver_calendario": "completo",
}

def calcular_modo_ui(accion: str, resultado: dict) -> str:
    if accion in OVERRIDES_MODO_UI:
        return OVERRIDES_MODO_UI[accion]
    modo = resultado.get("modo_ui") if isinstance(resultado, dict) else None
    return modo if modo in ("compacto", "completo") else "compacto"

CAMPOS_REQUERIDOS = {
    "crear_tarea_real":  ["titulo", "fecha", "prioridad"],
    "crear_evento_real": ["titulo", "fecha", "hora"],
    "agregar_sitio":     ["url", "alias", "frecuencia"],
    "enviar_correo":     ["para", "asunto", "cuerpo"],
    "consultar_notion":  ["pagina", "consulta"],
    "crear_nota_real":   ["contenido"],
    "registrar_examen":  ["materia", "fecha"],
    "nuevo_recordatorio": ["texto", "fecha", "hora"],
}

# 🔄 MAPEO DE ACCIONES EN INGLÉS A ESPAÑOL (para cuando Gemini traduce)
MAPEO_ACCIONES = {
    "send_email": "enviar_correo",
    "create_task": "crear_tarea_real",
    "create_event": "crear_evento_real",
    "add_site": "agregar_sitio",
    "consult_notion": "consultar_notion",
    "create_note": "crear_nota_real",
    "register_exam": "registrar_examen",
    "new_reminder": "nuevo_recordatorio",
}

PREGUNTAS_CAMPO = {
    ("crear_tarea_real", "titulo"): "¿Cuál es el título de la tarea?",
    ("crear_tarea_real", "fecha"): "¿Para qué fecha es?",
    ("crear_tarea_real", "prioridad"): "¿Qué prioridad le pongo? Alta, Media o Baja.",
    ("crear_evento_real", "titulo"): "¿Cuál es el título del evento?",
    ("crear_evento_real", "fecha"): "¿Para qué fecha?",
    ("crear_evento_real", "hora"): "¿A qué hora?",
    ("agregar_sitio", "url"): "¿Cuál es la URL del sitio?",
    ("agregar_sitio", "alias"): "¿Cómo le llamamos a este sitio?",
    ("agregar_sitio", "frecuencia"): "¿Cada cuánto lo reviso? Diaria, semanal o quincenal.",
    ("enviar_correo", "para"): "¿A qué correo se lo envío?",
    ("enviar_correo", "asunto"): "¿Cuál es el asunto?",
    ("enviar_correo", "cuerpo"): "¿Qué le pongo en el cuerpo?",
    ("consultar_notion", "pagina"): "¿De qué página de Notion quieres que busque?",
    ("consultar_notion", "consulta"): "¿Qué quieres que busque o te responda de esa página?",
    ("crear_nota_real", "contenido"): "¿Qué quieres que anote?",
    ("registrar_examen", "materia"): "¿De qué materia es el examen?",
    ("registrar_examen", "fecha"): "¿Qué día es el examen?",
}

def obtener_flujo(user_id: str) -> dict | None:
    return obtener_cache(user_id, "flujo_activo")

def guardar_flujo(user_id: str, flujo: dict):
    guardar_cache(user_id, "flujo_activo", flujo, ttl_minutos=20)

def limpiar_flujo(user_id: str):
    guardar_cache(user_id, "flujo_activo", None, ttl_minutos=1)

# ──────────────────────────────────────────────────────────────────────────────


def construir_contexto(user_id: str) -> str:
    usuario = obtener_usuario(user_id)
    if not usuario:
        return ""
    from services.db import obtener_config
    from services.tiempo import ahora_mx
    config = obtener_config(user_id)

    ahora = ahora_mx().strftime("%A %d de %B, %H:%M")
    nombre = usuario.get("name", "").split()[0] if usuario.get("name") else ""
    nombre_preferido = config.get("nombre_usuario") or nombre
    nombre_agente = config.get("nombre_agente", "Tona")
    tono = config.get("tono", "neutral")

    return f"""CONTEXTO DEL USUARIO:
- Nombre preferido: {nombre_preferido}
- Nombre del agente: {nombre_agente}
- Tono de interacción configurado: {tono}
- Fecha y hora actual: {ahora}
- Tier: {usuario.get('tier', 'estudiante')}"""


def construir_contexto_tareas_eventos(user_id: str) -> str:
    from services.tiempo import hoy_mx
    from services.db import obtener_tareas_vencidas_notificadas, marcar_tarea_vencida_notificada
    tareas = obtener_tareas(user_id)
    if not tareas:
        return "TAREAS Y EVENTOS REGISTRADOS: Ninguno por el momento."

    from services.tiempo import ahora_mx
    hoy = hoy_mx()
    ahora_completo = ahora_mx().replace(tzinfo=None)
    en_una_semana = hoy + timedelta(days=7)
    ya_notificadas = obtener_tareas_vencidas_notificadas(user_id)
    nuevas_notificaciones = []

    lineas = ["TAREAS Y EVENTOS REGISTRADOS (datos reales, úsalos para responder con precisión):"]
    for t in sorted(tareas, key=lambda x: x.get("fecha_limite") or x.get("fecha_publicacion") or "9999"):
        if t.get("completada"):
            continue
        fuente = t.get("fuente", "manual")
        titulo = t.get("titulo", "Sin título")
        urgencia = t.get("urgencia", "baja")
        sin_fecha_limite = t.get("sin_fecha_limite", False)
        fecha_str = t.get("fecha_limite")
        hora_str = t.get("hora_limite")
        tarea_id = t.get("id")

        en_semana = ""
        vencida = ""
        if fecha_str:
            try:
                fecha_t = datetime.strptime(fecha_str, "%Y-%m-%d").date()
                if hoy <= fecha_t <= en_una_semana:
                    en_semana = " [ESTA SEMANA]"
                hora_comparacion = hora_str or "23:59"
                limite_completo = datetime.strptime(f"{fecha_str} {hora_comparacion}", "%Y-%m-%d %H:%M")
                if limite_completo < ahora_completo:
                    if tarea_id in ya_notificadas:
                        vencida = " [venció anteriormente — YA se avisó antes, NO la menciones de nuevo en un resumen general; solo si el usuario pregunta explícitamente por tareas vencidas, de esa materia, o de ese periodo]"
                    else:
                        vencida = " [YA VENCIÓ]"
                        nuevas_notificaciones.append(tarea_id)
            except:
                pass

        if sin_fecha_limite:
            fecha_info = f"sin fecha de entrega, publicada: {t.get('fecha_publicacion', 'desconocida')}"
        else:
            hora_info = f" {hora_str}" if hora_str else ""
            fecha_info = f"fecha: {fecha_str or 'sin fecha'}{hora_info}"

        tiene_archivo = obtener_archivo_de_tarea(user_id, t.get("id")) is not None
        etiqueta_archivo = " [YA TIENE ARCHIVO VINCULADO]" if tiene_archivo else ""

        materia = t.get("curso") or ""
        etiqueta_materia = f" · materia: {materia}" if materia else ""
        lineas.append(f"  - id={tarea_id} \"{titulo}\"{etiqueta_materia} · {fecha_info} · urgencia: {urgencia} · origen: {fuente}{en_semana}{vencida}{etiqueta_archivo}")

    for tid in nuevas_notificaciones:
        marcar_tarea_vencida_notificada(user_id, tid)

    if len(lineas) == 1:
        return "TAREAS Y EVENTOS REGISTRADOS: Ninguno pendiente por el momento."

    return "\n".join(lineas)

def construir_contexto_sitios(user_id: str) -> str:
    from services.db import obtener_sitios
    sitios = obtener_sitios(user_id)
    if not sitios:
        return "SITIOS MONITOREADOS: Ninguno configurado."

    lineas = ["SITIOS MONITOREADOS (información real de páginas que el usuario pidió vigilar. "
              "SOLO menciona uno de estos de forma proactiva si tiene la etiqueta [NOVEDAD SIN MOSTRAR] "
              "Y el tema coincide DIRECTAMENTE con lo que el usuario pregunta en ESTE mensaje puntual "
              "(no por 'intereses generales' ni por temas de conversaciones pasadas). Si ninguno tiene "
              "esa etiqueta, o ninguno coincide directamente con la pregunta actual, IGNORA esta "
              "sección por completo y no la menciones):"]
    for s in sitios:
        resumen = s.get("ultimo_resumen")
        if not resumen:
            continue
        etiqueta = " [NOVEDAD SIN MOSTRAR]" if s.get("notificado") is False else ""
        lineas.append(f"  - \"{s.get('alias')}\": {resumen}{etiqueta}")

    if len(lineas) == 1:
        return "SITIOS MONITOREADOS: Configurados pero sin revisiones aún."

    return "\n".join(lineas)


def construir_contexto_examenes(user_id: str) -> str:
    from services.db import obtener_examenes
    examenes = obtener_examenes(user_id)
    if not examenes:
        return "EXÁMENES REGISTRADOS: Ninguno todavía."
    lineas = ["EXÁMENES REGISTRADOS:"]
    for e in examenes:
        hora_txt = f" {e['hora']}" if e.get("hora") else ""
        lineas.append(f"  - id={e['id']} \"{e['materia']}\": {e['fecha']}{hora_txt}")
    return "\n".join(lineas)

def construir_contexto_sugerencias_entrega(user_id: str) -> str:
    from services.db import obtener_sugerencias_pendientes
    pendientes = obtener_sugerencias_pendientes(user_id)
    if not pendientes:
        return ""
    lineas = ["SUGERENCIAS DE ENTREGA PENDIENTES (tareas por vencer sin archivo confirmado, o con un "
              "archivo candidato ya detectado en Drive. Si la conversación menciona naturalmente alguna "
              "de estas tareas o su materia, ofrece proactivamente resolverlo con la acción 'confirmar' "
              "— no lo fuerces en cada turno, solo cuando encaje con lo que se está hablando, y no repitas "
              "la misma sugerencia si ya la mencionaste en el historial reciente):"]
    for s in pendientes[:5]:
        if s.get("sin_archivo"):
            lineas.append(f"  - \"{s['titulo_tarea']}\": sin archivo detectado · tarea_id={s['tarea_id']} · curso_id={s['curso_id']}")
        else:
            lineas.append(
                f"  - \"{s['titulo_tarea']}\": posible archivo \"{s.get('archivo_nombre')}\" detectado en Drive · "
                f"tarea_id={s['tarea_id']} · curso_id={s['curso_id']} · archivo_id={s.get('archivo_id')} · archivo_link={s.get('archivo_link')}"
            )
    return "\n".join(lineas)

def construir_contexto_notion(user_id: str) -> str:
    from services.db import obtener_paginas_ancladas
    ancladas = obtener_paginas_ancladas(user_id)
    if not ancladas:
        return "PÁGINAS DE NOTION ANCLADAS: Ninguna todavía."
    titulos = [f'  - "{a.get("titulo")}" (tipo: {a.get("tipo", "page")})' for a in ancladas]
    return ("PÁGINAS DE NOTION ANCLADAS (el usuario puede preguntarte por el contenido de "
            "cualquiera de estas usando la acción consultar_notion):\n" + "\n".join(titulos))

async def revisar_sitios_en_vivo(user_id: str) -> list:
    import asyncio
    from services.db import obtener_sitios
    from services.scheduler import _revisar_sitio
    sitios = obtener_sitios(user_id)

    resultados_raw = await asyncio.gather(
        *[_revisar_sitio(user_id, s["id"]) for s in sitios],
        return_exceptions=True,
    )

    sitios_actualizados = obtener_sitios(user_id)
    resultados = []
    for s, r in zip(sitios, resultados_raw):
        if isinstance(r, Exception):
            print(f"❌ Error revisando sitio {s.get('alias')}: {r}")
            r = {"cambio": False, "contenido_completo": ""}
        sitio_actual = next((x for x in sitios_actualizados if x["id"] == s["id"]), s)
        resultados.append({
            "alias": s.get("alias"),
            "cambio": r.get("cambio", False),
            "resumen": sitio_actual.get("ultimo_resumen") or "Aún no se ha generado un resumen para este sitio.",
            "contenido_completo": r.get("contenido_completo", ""),
        })
    return resultados

def extraer_links_de_texto(mensaje: str, alias_sitio: str = "") -> list:
    """Detecta URLs reales dentro del texto que Gemini generó."""
    urls = re.findall(r'https?://[^\s\)\]\,]+', mensaje)
    vistos = set()
    limpio = []
    for u in urls:
        u = u.rstrip('.,;:!?)')
        if u in vistos:
            continue
        vistos.add(u)
        limpio.append(u)

    resultados = []
    for u in limpio:
        partes = u.rstrip('/').split('/')
        ultimo = partes[-1].replace('-', ' ').replace('.html', '').replace('_', ' ').strip()
        etiqueta = ultimo.capitalize() if ultimo else (alias_sitio or "Enlace")
        if alias_sitio and alias_sitio.lower() not in etiqueta.lower():
            etiqueta = f"{etiqueta} · {alias_sitio}"
        resultados.append({"texto": etiqueta, "url": u})
    return resultados


def obtener_novedades_sitios(user_id: str) -> dict:
    from services.db import obtener_sitios, guardar_sitios
    sitios = obtener_sitios(user_id)
    pendientes = [s for s in sitios if s.get("ultimo_resumen") and not s.get("notificado", True)]

    if not pendientes:
        return {"accion": "sin_novedades", "payload": {}, "mensaje": ""}

    if len(pendientes) <= 2:
        partes = [f"{s['alias']}: {s['ultimo_resumen']}" for s in pendientes]
        mensaje = "Encontré novedades en tus sitios monitoreados. " + " Además, ".join(partes)
    else:
        alias_lista = ", ".join(s["alias"] for s in pendientes)
        mensaje = (
            f"Tengo novedades en {len(pendientes)} sitios que monitoreas: {alias_lista}. "
            f"¿De cuál quieres que te cuente primero?"
        )

    ids_pendientes = {p["id"] for p in pendientes}
    for s in sitios:
        if s.get("id") in ids_pendientes:
            s["notificado"] = True
    guardar_sitios(user_id, sitios)

    return {"accion": "flash", "payload": {"mensaje": mensaje, "tipo": "info"}, "mensaje": mensaje}

def obtener_sugerencia_entrega_para_mostrar(user_id: str) -> dict:
    from services.db import obtener_sugerencias_pendientes, marcar_sugerencia_notificada

    pendientes = obtener_sugerencias_pendientes(user_id)
    if not pendientes:
        return {"accion": "sin_sugerencia", "payload": {}, "mensaje": ""}

    s = pendientes[0]
    marcar_sugerencia_notificada(user_id, s["id"])

    if s.get("sin_archivo"):
        pregunta = (
            f"Tu tarea \"{s['titulo_tarea']}\" está por vencer y no encontré ningún archivo relacionado "
            f"en su carpeta de Drive. ¿Quieres que te prepare uno?"
        )
        payload = {
            "pregunta": pregunta,
            "onSi": "crear_archivo_para_tarea",
            "onNo": None,
            "labelSi": "Sí, créalo",
            "labelNo": "Aún no",
            "contexto": {"titulo_tarea": s["titulo_tarea"], "tarea_id": s["tarea_id"], "curso_id": s["curso_id"]},
        }
    else:
        pregunta = (
            f"Encontré un archivo en tu Drive que parece ser tu entrega de \"{s['titulo_tarea']}\": "
            f"\"{s['archivo_nombre']}\". ¿Quieres que la entregue en Classroom, o sigues trabajando en ella?"
        )
        payload = {
            "pregunta": pregunta,
            "onSi": "confirmar_entrega_real",
            "onNo": "abrir_archivo_entrega",
            "labelSi": "Sí, entregar",
            "labelNo": "Aún no, quiero editarla",
            "contexto": {
                "curso_id": s["curso_id"], "tarea_id": s["tarea_id"],
                "archivo_id": s["archivo_id"], "archivo_link": s.get("archivo_link"),
            },
        }
    return {"accion": "confirmar", "payload": payload, "mensaje": pregunta}

def construir_contexto_ultimo_resultado(user_id: str) -> str:
    r = obtener_cache(user_id, "ultimo_resultado")
    if not r or not r.get("items"):
        return ""
    tipo, items = r.get("tipo"), r["items"][:10]
    lineas = [f'ÚLTIMO RESULTADO MOSTRADO AL USUARIO (tipo: {tipo}, de la búsqueda más reciente — '
              f'si el usuario pide abrir/entregar/eliminar algo de aquí, USA ESTOS DATOS, no busques de nuevo):']
    for it in items:
        if tipo == "archivos_drive":
            lineas.append(f"  - id={it.get('id')} nombre=\"{it.get('nombre')}\"")
        else:
            lineas.append(f"  - id={it.get('id')} asunto=\"{it.get('asunto')}\" de={it.get('de','')}")
    return "\n".join(lineas)


async def enriquecer_payload(accion: str, payload, user_id: str):
    tareas = obtener_tareas(user_id)

    if accion == "ver_tareas":
        from services.db import obtener_examenes
        fuente_filtro = payload.get("fuente") if isinstance(payload, dict) else None
        tareas_filtradas = (
            [t for t in tareas if t.get("fuente", "manual") == fuente_filtro]
            if fuente_filtro else tareas
        )
        items = [
            {
                "id": t.get("id"),
                "texto": t.get("titulo"),
                "prioridad": (
                    "Alta" if t.get("urgencia") == "alta"
                    else "Media" if t.get("urgencia") == "media"
                    else "Baja"
                ),
                "done": t.get("completada", False),
                "fuente": t.get("fuente", "manual"),
                "fecha": t.get("fecha_limite"),
            }
            for t in tareas_filtradas[:15]
        ]

        incluir_examenes = payload.get("incluir_examenes", False) if isinstance(payload, dict) else False
        if incluir_examenes and not fuente_filtro:
            from services.tiempo import hoy_mx
            hoy = hoy_mx()
            for ex in obtener_examenes(user_id)[:5]:
                try:
                    dias_restantes = (datetime.strptime(ex["fecha"], "%Y-%m-%d").date() - hoy).days
                except Exception:
                    dias_restantes = 99
                prioridad = "Alta" if dias_restantes <= 3 else "Media" if dias_restantes <= 7 else "Baja"
                items.append({
                    "id": ex.get("id"),
                    "texto": f"Examen de {ex['materia']}",
                    "prioridad": prioridad,
                    "done": False,
                    "fuente": "examen",
                    "fecha": ex.get("fecha"),
                })
            items.sort(key=lambda x: (x.get("fecha") or "9999"))

        return items

    if accion == "ver_horario":
        from services.db import obtener_horario
        clases = obtener_horario(user_id)
        if not clases:
            return []
        dias_orden = {"lunes": 0, "martes": 1, "miercoles": 2, "jueves": 3, "viernes": 4, "sabado": 5}
        agrupado = {}
        for c in clases:
            dia = c.get("dia", "").lower()
            agrupado.setdefault(dia, []).append({
                "materia": c.get("materia"),
                "hora_inicio": c.get("hora_inicio"),
                "hora_fin": c.get("hora_fin"),
                "aula": c.get("aula"),
            })
        for dia in agrupado:
            agrupado[dia].sort(key=lambda x: x.get("hora_inicio") or "")
        return [
            {"dia": dia.upper(), "clases": agrupado[dia]}
            for dia in sorted(agrupado.keys(), key=lambda d: dias_orden.get(d, 99))
        ]

    if accion == "ver_calificaciones":
        return CALS_MOCK

    # ✅ CORREGIDO: ver_calendario ahora obtiene eventos reales
    if accion == "ver_calendario":
        try:
            from services.tiempo import hoy_mx
            hoy = hoy_mx()
            mes_actual = hoy.month
            año_actual = hoy.year
            
            # Obtener eventos reales del calendario
            eventos = await _obtener_calendar(user_id)
            
            if not eventos:
                return {
                    "mes": payload.get("mes", mes_actual) if isinstance(payload, dict) else mes_actual,
                    "año": payload.get("año", año_actual) if isinstance(payload, dict) else año_actual,
                    "eventos": [],
                    "mensaje": "No tienes eventos en tu calendario para los próximos días."
                }
            
            return {
                "mes": payload.get("mes", mes_actual) if isinstance(payload, dict) else mes_actual,
                "año": payload.get("año", año_actual) if isinstance(payload, dict) else año_actual,
                "eventos": eventos,
                "mensaje": f"Tienes {len(eventos)} eventos en tu calendario."
            }
        except Exception as e:
            print(f"❌ Error en ver_calendario: {e}")
            import traceback
            traceback.print_exc()
            return {
                "mes": datetime.now().month,
                "año": datetime.now().year,
                "eventos": [],
                "mensaje": "No pude obtener tu calendario. ¿Has autorizado el acceso a Google Calendar?"
            }

    if accion == "crear_doc_con_titulo":
        return payload

    if accion == "abrir_doc_existente":
        return payload
    
    if accion == "eliminar_doc":
        return payload

    return payload  


async def ejecutar_accion_backend(accion: str, payload: dict, user_id: str):
    from routers.tasks import crear_tarea_manual, crear_evento_calendar, TareaManual, EventoCalendar, enviar_correo, EnviarCorreoRequest

    if accion == "crear_tarea_real":
        try:
            body = TareaManual(
                titulo=payload.get("titulo", "Nueva tarea"),
                fecha_limite=payload.get("fecha"),
                prioridad=payload.get("prioridad", "media").lower(),
                resumen=payload.get("resumen", payload.get("titulo", "")),
            )
            resultado = await crear_tarea_manual(user_id, body)
            return resultado.get("tarea", {})
        except Exception as e:
            print(f"❌ Error en crear_tarea_real: {e}")
        return None

    if accion == "registrar_examen":
        try:
            from services.db import guardar_examen
            return guardar_examen(
                user_id,
                payload.get("materia", ""),
                payload.get("fecha"),
                payload.get("hora"),
            )
        except ValueError as e:
            print(f"⚠️ Fecha inválida en registrar_examen: {e}")
            return None
        except Exception as e:
            print(f"❌ Error en registrar_examen: {e}")
        return None

    if accion == "crear_archivo_para_tarea":
        try:
            tareas = obtener_tareas(user_id)
            titulo_buscado = payload.get("titulo_tarea", "").strip().lower()
            candidatas = [t for t in tareas if t.get("titulo", "").strip().lower() == titulo_buscado and t.get("fuente") == "classroom"]
            if not candidatas:
                candidatas = [t for t in tareas if titulo_buscado in t.get("titulo", "").strip().lower() and t.get("fuente") == "classroom"]
            if not candidatas:
                # Respaldo: si lo que mandó Gemini coincide con la MATERIA
                candidatas = [
                    t for t in tareas
                    if t.get("fuente") == "classroom"
                    and not t.get("completada")
                    and (t.get("curso") or "").strip().lower() == titulo_buscado
                    and not obtener_archivo_de_tarea(user_id, t.get("id"))
                ]
            if not candidatas:
                return None
            tarea = candidatas[-1] if len(candidatas) > 1 else candidatas[0]
            if len(candidatas) > 1:
                candidatas.sort(key=lambda t: t.get("fecha_limite") or "9999")
                tarea = candidatas[0]

            import httpx as _httpx
            from routers.docs import crear_doc_para_tarea, CrearArchivoTareaRequest
            body = CrearArchivoTareaRequest(tarea_id=tarea["id"], titulo_tarea=tarea["titulo"], curso_id=tarea["curso_id"])
            resultado = await crear_doc_para_tarea(user_id, body, _=user_id)
            return resultado
        except Exception as e:
            print(f"❌ Error en crear_archivo_para_tarea: {e}")
        return None

    if accion == "crear_nota_real":
        try:
            from services.db import crear_nota
            contenido = (payload.get("contenido") or "").strip()
            titulo = (payload.get("titulo") or "").strip()
            if not titulo:
                titulo = contenido[:40] + ("..." if len(contenido) > 40 else "")
            return crear_nota(user_id, titulo, contenido)
        except Exception as e:
            print(f"❌ Error en crear_nota_real: {e}")
        return None

    if accion == "crear_evento_real":
        try:
            body = EventoCalendar(
                titulo=payload.get("titulo", "Nuevo evento"),
                fecha=payload.get("fecha"),
                hora=payload.get("hora", "09:00"),
                descripcion=payload.get("descripcion", payload.get("titulo", "")),
                duracion_min=payload.get("duracion_min", 60),
            )
            resultado = await crear_evento_calendar(user_id, body)
            return resultado.get("evento", {})
        except Exception as e:
            print(f"❌ Error en crear_evento_real: {e}")
        return None
    
    if accion == "enviar_correo":
        try:
            body = EnviarCorreoRequest(
                para=payload.get("para", ""),
                asunto=payload.get("asunto", "Sin asunto"),
                cuerpo=payload.get("cuerpo", ""),
            )
            resultado = await enviar_correo(user_id, body)
            return resultado 
        except Exception as e:
            print(f"❌ Error en enviar_correo: {e}")
        return None

    if accion == "agregar_sitio":
        try:
            from services.db import agregar_sitio
            sitio = agregar_sitio(user_id, {
                "url": payload.get("url", ""),
                "alias": payload.get("alias", "Sitio sin nombre"),
                "frecuencia": payload.get("frecuencia", "semanal"),
            })
            return sitio
        except Exception as e:
            print(f"❌ Error en agregar_sitio: {e}")
        return None

    if accion == "completar_tarea_real":
        try:
            from services.db import obtener_tareas, guardar_tareas
            tareas = obtener_tareas(user_id)
            tarea_id = payload.get("tarea_id")
            encontrada = False
            for t in tareas:
                if t.get("id") == tarea_id:
                    t["completada"] = True
                    encontrada = True
            if encontrada:
                guardar_tareas(user_id, tareas)
                return {"completada": True}
            return None
        except Exception as e:
            print(f"❌ Error en completar_tarea_real: {e}")
        return None
    
    if accion == "completar_examen_real":
        try:
            from services.db import completar_examen
            ok = completar_examen(user_id, payload.get("examen_id"))
            return {"completado": True} if ok else None
        except Exception as e:
            print(f"❌ Error en completar_examen_real: {e}")
        return None

    if accion == "eliminar_tarea_real":
        try:
            from services.db import obtener_tareas, guardar_tareas
            tareas = obtener_tareas(user_id)
            tarea_id = payload.get("tarea_id")
            tarea = next((t for t in tareas if t.get("id") == tarea_id), None)
            if not tarea or tarea.get("fuente") != "manual":
                return None  # solo tareas manuales se pueden borrar de verdad
            guardar_tareas(user_id, [t for t in tareas if t.get("id") != tarea_id])
            return {"eliminada": True}
        except Exception as e:
            print(f"❌ Error en eliminar_tarea_real: {e}")
        return None

    if accion == "guardar_config_onboarding":
        try:
            from services.db import guardar_config
            config = payload.get("config", {})
            guardar_config(user_id, config)
            return {"guardado": True}
        except Exception as e:
            print(f"❌ Error en guardar_config_onboarding: {e}")
            return None

    return None


async def obtener_archivos_drive_real(user_id: str, query: str = ""):
    from routers.tasks import obtener_drive
    try:
        resultado = await obtener_drive(user_id)
        archivos = resultado.get("archivos", [])
        if query:
            archivos = [a for a in archivos if query.lower() in a.get("nombre", "").lower()]
        return archivos
    except Exception as e:
        print(f"❌ Error obteniendo archivos Drive: {e}")
    return []


# ──────────────────────────────────────────────────────────────────────────────
# 🚀 ENDPOINT PRINCIPAL /chat
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/chat", response_model=MensajeResponse)
async def chat(
    request_http: Request,
    request: MensajeRequest,
    user_id: str = Depends(verificar_identidad)
):
    """Endpoint principal de chat. El user_id se obtiene de la cookie."""
    
    usuario = obtener_usuario(user_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # ──────────────────────────────────────────────────────────────────────────
    # 🛡️ DETECCIÓN DE SPAM
    # ──────────────────────────────────────────────────────────────────────────
    if _detectar_spam(user_id, request.mensaje):
        return MensajeResponse(
            accion="flash",
            payload={"mensaje": "Parece que el mensaje se repitió — ¿me confirmas qué necesitas?", "tipo": "info"},
            mensaje="Parece que el mensaje se repitió — ¿me confirmas qué necesitas?",
            flujo_activo=False,
            modo_ui="compacto",
        )

    from services.db import actualizar_racha_estudio, registrar_interaccion_diaria
    actualizar_racha_estudio(user_id)
    registrar_interaccion_diaria(user_id)

    # ──────────────────────────────────────────────────────────────────────────
    # 🔄 FLUJO DE CONVERSACIÓN ACTIVO (captura de datos)
    # ──────────────────────────────────────────────────────────────────────────
    flujo = obtener_flujo(user_id)

    if flujo and flujo.get("activo"):
        # Verificar cancelación primero
        if es_cancelacion(request.mensaje):
            limpiar_flujo(user_id)
            accion, payload, mensaje, flujo_activo = "flash", {"mensaje": "Cancelado.", "tipo": "info"}, "Listo, cancelé eso.", False

        elif (flujo["accion_objetivo"] == "consultar_notion"
              and flujo["campo_pendiente"] == "pagina"
              and es_pregunta_listado_notion(request.mensaje)):
            from services.db import obtener_paginas_ancladas
            ancladas = obtener_paginas_ancladas(user_id)
            if ancladas:
                titulos = ", ".join(f'"{a["titulo"]}"' for a in ancladas)
                mensaje = f"Tienes ancladas: {titulos}. ¿De cuál quieres que busque?"
            else:
                mensaje = "No tienes ninguna página anclada todavía. Ve a la sección de Notion para enlazar alguna."
            accion = "solicitar_dato"
            payload = {"campo": "pagina", "accion_objetivo": "consultar_notion", "contexto": flujo["campos"]}
            flujo_activo = True

        else:
            campo = flujo["campo_pendiente"]
            extraccion = await extraer_valor_campo(campo, request.mensaje, flujo["campos"], flujo["accion_objetivo"])

            if extraccion.get("cancelar"):
                limpiar_flujo(user_id)
                accion, payload, mensaje, flujo_activo = "flash", {"mensaje": "Cancelado.", "tipo": "info"}, "Listo, cancelé eso.", False
            else:
                flujo["campos"][campo] = extraccion.get("valor", request.mensaje)
                
                # ✅ FIX: Mapear acción en inglés a español si es necesario
                accion_original = flujo["accion_objetivo"]
                accion_espanol = MAPEO_ACCIONES.get(accion_original, accion_original)
                
                faltantes = [c for c in CAMPOS_REQUERIDOS[accion_espanol] if not flujo["campos"].get(c)]

                if faltantes:
                    siguiente = faltantes[0]
                    flujo["campo_pendiente"] = siguiente
                    guardar_flujo(user_id, flujo)
                    accion = "solicitar_dato"
                    payload = {"campo": siguiente, "accion_objetivo": accion_espanol, "contexto": flujo["campos"]}
                    mensaje = PREGUNTAS_CAMPO.get((accion_espanol, siguiente), f"¿Cuál es el {siguiente}?")
                    flujo_activo = True
                else:
                    limpiar_flujo(user_id)
                    if accion_espanol == "consultar_notion":
                        respuesta = await responder_consulta_notion(
                            user_id,
                            flujo["campos"].get("pagina", ""),
                            flujo["campos"].get("consulta", ""),
                        )
                        accion, payload, mensaje = "flash", {"mensaje": respuesta, "tipo": "info"}, respuesta
                    else:
                        dato_creado = await ejecutar_accion_backend(accion_espanol, flujo["campos"], user_id)
                        if dato_creado:
                            accion, payload, mensaje = "flash", {"mensaje": "Listo, guardado.", "tipo": "exito"}, "Listo, guardado."
                        else:
                            accion, payload, mensaje = "flash", {"mensaje": "No se pudo guardar.", "tipo": "error"}, "No se pudo guardar."
                    flujo_activo = False

        historial_actualizado = obtener_historial(user_id) + [
            {"role": "user",  "content": request.mensaje},
            {"role": "model", "content": mensaje},
        ]
        guardar_historial(user_id, historial_actualizado[-40:])
        return MensajeResponse(accion=accion, payload=payload, mensaje=mensaje, flujo_activo=flujo_activo,
                        modo_ui=calcular_modo_ui(accion, {}))

    # ──────────────────────────────────────────────────────────────────────────
    # 🚀 ACCIONES DIRECTAS (Onboarding, etc.)
    # ──────────────────────────────────────────────────────────────────────────
    if request.mensaje.startswith("__ACCION_DIRECTA__:"):
        try:
            direct = json.loads(request.mensaje.replace("__ACCION_DIRECTA__:", "", 1))
            accion_directa = direct.get("accion")
            payload_directo = direct.get("payload", {})
            mensaje_resp = ""

            if accion_directa == "revisar_novedades_sitios":
                resultado_novedades = obtener_novedades_sitios(user_id)
                accion_directa = resultado_novedades["accion"]
                payload_directo = resultado_novedades["payload"]
                mensaje_resp = resultado_novedades["mensaje"]

            elif accion_directa == "revisar_sugerencias_entrega":
                resultado_sugerencia = obtener_sugerencia_entrega_para_mostrar(user_id)
                accion_directa = resultado_sugerencia["accion"]
                payload_directo = resultado_sugerencia["payload"]
                mensaje_resp = resultado_sugerencia["mensaje"]

            elif accion_directa == "entregar_tarea_real":   
                from routers.tasks import entregar_tarea_real, EntregarTareaRequest
                try:
                    body_entrega = EntregarTareaRequest(**payload_directo)
                    resultado_entrega = await entregar_tarea_real(user_id, body_entrega, _=user_id)
                    accion_directa = "flash"
                    payload_directo = {"mensaje": "Tarea entregada en Classroom.", "tipo": "exito"}
                    mensaje_resp = "Listo, entregué la tarea en Classroom."
                except Exception as e:
                    print(f"❌ Error entregando tarea real: {e}")
                    accion_directa = "flash"
                    payload_directo = {"mensaje": "No se pudo entregar la tarea.", "tipo": "error"}
                    mensaje_resp = "No pude entregar la tarea, intenta de nuevo."

            elif accion_directa == "crear_archivo_para_tarea":
                dato = await ejecutar_accion_backend(accion_directa, payload_directo, user_id)
                if dato and dato.get("doc_id"):
                    accion_directa = "abrir_doc_especifico"
                    payload_directo = {"doc_id": dato["doc_id"], "titulo": dato.get("titulo", "Documento")}
                    mensaje_resp = "Listo, creé el archivo. Abriéndolo..."
                else:
                    accion_directa = "flash"
                    payload_directo = {"mensaje": "No se pudo crear el archivo.", "tipo": "error"}
                    mensaje_resp = "No se pudo crear el archivo."

            elif accion_directa in ("crear_tarea_real", "crear_evento_real", "guardar_config_onboarding", "enviar_correo", "agregar_sitio", "completar_tarea_real", "eliminar_tarea_real", "completar_examen_real"):
                dato = await ejecutar_accion_backend(accion_directa, payload_directo, user_id)
                if dato:
                    accion_directa = "flash"
                    payload_directo = {"mensaje": "Guardado correctamente.", "tipo": "exito"}
                    mensaje_resp = "Listo, guardado."
                else:
                    accion_directa = "flash"
                    payload_directo = {"mensaje": "No se pudo guardar.", "tipo": "error"}
                    mensaje_resp = "No se pudo guardar."

            else:
                accion_directa = "flash"
                payload_directo = {"mensaje": "Acción no reconocida.", "tipo": "error"}
                mensaje_resp = "Acción no reconocida."

            historial_actualizado = obtener_historial(user_id) + [
                {"role": "user",  "content": request.mensaje},
                {"role": "model", "content": mensaje_resp},
            ]
            guardar_historial(user_id, historial_actualizado[-40:])

            return MensajeResponse(
                accion=accion_directa,
                payload=payload_directo,
                mensaje=mensaje_resp,
                flujo_activo=False,
                modo_ui=calcular_modo_ui(accion_directa, {}),
            )
        except json.JSONDecodeError as e:
            print(f"❌ Error parseando JSON en acción directa: {e}")
            return MensajeResponse(
                accion="flash",
                payload={"mensaje": "Error procesando la acción", "tipo": "error"},
                mensaje="Formato de acción inválido",
                flujo_activo=False,
                modo_ui=calcular_modo_ui("flash", {}),
            )
        except Exception as e:
            print(f"❌ Error en acción directa: {e}")
            return MensajeResponse(
                accion="flash",
                payload={"mensaje": "Error procesando la acción", "tipo": "error"},
                mensaje="Ocurrió un error inesperado",
                flujo_activo=False,
                modo_ui=calcular_modo_ui("flash", {}),
            )

    # ──────────────────────────────────────────────────────────────────────────
    # 📚 CHAT NORMAL
    # ──────────────────────────────────────────────────────────────────────────
    nivel = calcular_nivel_uso(user_id)

    historial_raw_completo = obtener_historial(user_id)
    historial_raw = historial_raw_completo[-20:] if nivel < 1 else historial_raw_completo[-8:]

    # ──────────────────────────────────────────────────────────────────────────
    # 🌐 DETECTAR IDIOMA DEL MENSAJE DEL USUARIO (SOLO el mensaje, no el contexto)
    # ──────────────────────────────────────────────────────────────────────────
    idioma_usuario = detectar_idioma(request.mensaje)
    print(f"🌐 Idioma detectado del usuario: {idioma_usuario}")

    contexto_base = construir_contexto(user_id)
    contexto_tareas = construir_contexto_tareas_eventos(user_id)
    contexto_sitios = construir_contexto_sitios(user_id) if nivel == 0 else "SITIOS MONITOREADOS: (omitido temporalmente por uso alto este mes)"
    contexto_notion = construir_contexto_notion(user_id)
    contexto_entregas = construir_contexto_sugerencias_entrega(user_id) if nivel == 0 else ""
    contexto_resultado = construir_contexto_ultimo_resultado(user_id)
    contexto_examenes = construir_contexto_examenes(user_id)

    mensaje_con_contexto = (
        f"{contexto_base}\n\n{contexto_tareas}\n\n{contexto_sitios}\n\n{contexto_notion}\n\n"
        f"{contexto_entregas}\n\n{contexto_examenes}\n\n{contexto_resultado}\n\nMensaje del usuario: {request.mensaje}"
    )

    # ──────────────────────────────────────────────────────────────────────────
    # 🌐 FORZAR IDIOMA EN EL PROMPT
    # ──────────────────────────────────────────────────────────────────────────
    if idioma_usuario == "en":
        mensaje_con_contexto = f"""
[LANGUAGE INSTRUCTION - CRITICAL]
The user wrote in ENGLISH. You MUST respond in ENGLISH. Do NOT respond in Spanish.
Your entire response including JSON keys, values, and the "mensaje" field must be in English.
Do not switch to Spanish at any point in the response.

{mensaje_con_contexto}
"""
    else:
        mensaje_con_contexto = f"""
[INSTRUCCIÓN DE IDIOMA - CRÍTICA]
El usuario escribió en ESPAÑOL. Debes responder en ESPAÑOL.

{mensaje_con_contexto}
"""

    resultado = await enviar_mensaje(historial_raw, mensaje_con_contexto, nivel=nivel)
    print(f"🎯 Gemini respondió: {resultado}")

    uso = resultado.pop("_uso", None)
    if uso:
        registrar_uso_tokens(user_id, uso["entrada"], uso["salida"])

    accion = resultado.get("accion", "flash")
    payload = resultado.get("payload", {})
    mensaje = resultado.get("mensaje", "")
    if not mensaje and accion == "flash" and isinstance(payload, dict):
        mensaje = payload.get("mensaje", "")

    flujo_activo = (accion == "solicitar_dato")
    if accion == "solicitar_dato" and isinstance(payload, dict):
        guardar_flujo(user_id, {
            "activo": True,
            "accion_objetivo": payload.get("accion_objetivo"),
            "campos": payload.get("contexto", {}),
            "campo_pendiente": payload.get("campo"),
        })

    # ──────────────────────────────────────────────────────────────────────────
    # ⚙️ EJECUTAR ACCIONES DEL BACKEND
    # ──────────────────────────────────────────────────────────────────────────
    if accion == "crear_archivo_para_tarea":
        dato_creado = await ejecutar_accion_backend(accion, payload, user_id)
        if dato_creado and dato_creado.get("doc_id"):
            from services.db import eliminar_sugerencias_de_tarea
            titulo_tarea_creada = payload.get("titulo_tarea", "") if isinstance(payload, dict) else ""
            tareas_usuario = obtener_tareas(user_id)
            tarea_match = next((t for t in tareas_usuario if t.get("titulo", "").strip().lower() == titulo_tarea_creada.strip().lower()), None)
            if tarea_match:
                eliminar_sugerencias_de_tarea(user_id, tarea_match["id"])
            accion = "abrir_doc_especifico"
            payload = {"doc_id": dato_creado["doc_id"], "titulo": dato_creado.get("titulo", "Documento")}
            mensaje = mensaje or "Listo, creé el archivo. Abriéndolo..."
        else:
            accion = "flash"
            payload = {"mensaje": "No se pudo crear el archivo. Intenta de nuevo.", "tipo": "error"}
        flujo_activo = False

    elif accion in ("crear_tarea_real", "crear_evento_real", "enviar_correo", "agregar_sitio", "registrar_examen"):
        dato_creado = await ejecutar_accion_backend(accion, payload, user_id)
        if dato_creado:
            accion = "flash"
            payload = {"mensaje": mensaje or "Listo, guardado.", "tipo": "exito"}
        else:
            accion = "flash"
            payload = {"mensaje": "No se pudo guardar. Intenta de nuevo.", "tipo": "error"}
        flujo_activo = False

    elif accion == "abrir_archivo_tarea":
        from services.db import obtener_archivo_de_tarea
        titulo_buscado = payload.get("titulo_tarea", "").strip().lower() if isinstance(payload, dict) else ""
        tareas = obtener_tareas(user_id)

        candidatas = [t for t in tareas if t.get("titulo", "").strip().lower() == titulo_buscado]
        if not candidatas:
            candidatas = [t for t in tareas if titulo_buscado in t.get("titulo", "").strip().lower()]

        archivo = None
        if candidatas:
            archivo = obtener_archivo_de_tarea(user_id, candidatas[0]["id"])

        if archivo:
            accion = "abrir_doc_especifico"
            payload = {"doc_id": archivo["archivo_id"], "titulo": archivo.get("archivo_nombre") or "Documento"}
            mensaje = f"Abriendo el archivo de \"{candidatas[0]['titulo']}\"..."
        else:
            accion = "flash"
            payload = {"mensaje": "No encontré un archivo vinculado a esa tarea.", "tipo": "error"}
            mensaje = "No encontré un archivo vinculado a esa tarea."
        flujo_activo = False

    elif accion == "crear_doc_con_titulo":
        titulo = payload.get("titulo", "Nuevo documento")
        accion = "abrir_docs_con_titulo"
        payload = {"titulo": titulo}
        mensaje = f"Abriendo editor para '{titulo}'..."
        flujo_activo = False

    elif accion == "abrir_doc_existente":
        doc_id = payload.get("doc_id")
        titulo = payload.get("titulo", "Documento")
        if doc_id:
            accion = "abrir_doc_especifico"
            payload = {"doc_id": doc_id, "titulo": titulo}
            mensaje = f"Abriendo el documento '{titulo}'..."
            flujo_activo = False
        else:
            accion = "flash"
            payload = {"mensaje": "No se pudo abrir el documento.", "tipo": "error"}
            mensaje = "No se pudo abrir el documento."
            flujo_activo = False

    elif accion == "buscar_doc":
        nombre = payload.get("nombre", "")
        if nombre:
            try:
                from routers.docs import buscar_doc_por_nombre
                data = await buscar_doc_por_nombre(user_id, nombre)
                docs = data.get("docs", [])
                if docs:
                    doc = docs[0]
                    accion = "abrir_doc_especifico"
                    payload = {"doc_id": doc["id"], "titulo": doc["titulo"]}
                    mensaje = f"Encontré el documento '{doc['titulo']}', abriéndolo."
                else:
                    accion = "flash"
                    payload = {"mensaje": f"No encontré un documento con '{nombre}'", "tipo": "error"}
                    mensaje = f"No encontré ningún documento con ese nombre."
                flujo_activo = False
            except Exception as e:
                print(f"Error buscando doc: {e}")
                accion = "flash"
                payload = {"mensaje": "Error de conexión.", "tipo": "error"}
                mensaje = "Error de conexión."
                flujo_activo = False

    elif accion == "buscar_y_eliminar":
        nombre = payload.get("nombre", "")
        if nombre:
            try:
                from routers.docs import buscar_doc_por_nombre, eliminar_doc as eliminar_doc_fn
                data = await buscar_doc_por_nombre(user_id, nombre)
                docs = data.get("docs", [])
                if docs:
                    doc = docs[0]
                    try:
                        await eliminar_doc_fn(user_id, doc["id"])
                        accion = "flash"
                        payload = {"mensaje": f"Documento '{doc['titulo']}' eliminado.", "tipo": "exito"}
                        mensaje = f"He eliminado el documento '{doc['titulo']}'."
                    except HTTPException:
                        accion = "flash"
                        payload = {"mensaje": "Error al eliminar el documento.", "tipo": "error"}
                        mensaje = "No se pudo eliminar el documento."
                else:
                    accion = "flash"
                    payload = {"mensaje": f"No encontré un documento con '{nombre}'", "tipo": "error"}
                    mensaje = f"No encontré ningún documento con ese nombre."
                flujo_activo = False
            except Exception as e:
                print(f"Error en buscar_y_eliminar: {e}")
                accion = "flash"
                payload = {"mensaje": "Error de conexión.", "tipo": "error"}
                mensaje = "Error de conexión."
                flujo_activo = False

    elif accion == "eliminar_doc":
        doc_id = payload.get("doc_id")
        titulo = payload.get("titulo", "Documento")
        if doc_id:
            try:
                from routers.docs import eliminar_doc as eliminar_doc_fn
                await eliminar_doc_fn(user_id, doc_id)
                accion = "flash"
                payload = {"mensaje": f"Documento '{titulo}' eliminado.", "tipo": "exito"}
                mensaje = f"He eliminado el documento '{titulo}'."
            except HTTPException:
                accion = "flash"
                payload = {"mensaje": f"No se pudo eliminar el documento.", "tipo": "error"}
                mensaje = "No se pudo eliminar el documento."
            except Exception as e:
                print(f"Error eliminando doc: {e}")
                accion = "flash"
                payload = {"mensaje": "Error al eliminar.", "tipo": "error"}
                mensaje = "Error al eliminar el documento."
        else:
            accion = "flash"
            payload = {"mensaje": "No se encontró el documento.", "tipo": "error"}
            mensaje = "No se encontró el documento a eliminar."
        flujo_activo = False

    elif accion == "buscar_correos_tema":
        tema = payload.get("tema", "")
        dias = payload.get("dias", 14)
        if tema:
            try:
                from routers.tasks import buscar_gmail_por_tema
                data = await buscar_gmail_por_tema(user_id, tema, dias)
                correos = data.get("correos", [])
                payload = correos
                guardar_cache(user_id, "ultimo_resultado", {"tipo": "correos", "items": correos}, ttl_minutos=10)
                if not mensaje:
                    if correos:
                        mensaje = f"Encontré {len(correos)} correo(s) sobre '{tema}' en los últimos {dias} días."
                    else:
                        mensaje = f"No encontré correos recientes sobre '{tema}'."
                flujo_activo = False
            except Exception as e:
                print(f"Error buscando correos por tema: {e}")
                accion = "flash"
                payload = {"mensaje": "Error buscando correos.", "tipo": "error"}
                mensaje = "Error buscando correos."
                flujo_activo = False

    elif accion == "ver_gmail":
        try:
            from routers.tasks import obtener_gmail
            data = await obtener_gmail(user_id)
            correos = data.get("correos", [])
            payload = correos
            guardar_cache(user_id, "ultimo_resultado", {"tipo": "correos", "items": correos}, ttl_minutos=10)
            if not mensaje:
                if correos:
                    mensaje = f"Tienes {len(correos)} correo(s) sin leer."
                else:
                    mensaje = "No tienes correos nuevos sin leer."
            flujo_activo = False
        except Exception as e:
            print(f"Error obteniendo Gmail: {e}")
            accion = "flash"
            payload = {"mensaje": "Error obteniendo correos.", "tipo": "error"}
            mensaje = "Error obteniendo correos."
            flujo_activo = False

    elif accion == "consultar_notion":
        pagina = payload.get("pagina", "") if isinstance(payload, dict) else ""
        consulta = payload.get("consulta", "") if isinstance(payload, dict) else request.mensaje
        respuesta = await responder_consulta_notion(user_id, pagina, consulta)
        accion = "flash"
        payload = {"mensaje": respuesta, "tipo": "info"}
        mensaje = respuesta
        flujo_activo = False

    elif accion == "ver_archivos_drive":
        query = payload.get("query", "") if isinstance(payload, dict) else ""
        archivos = await obtener_archivos_drive_real(user_id, query)
        payload = archivos
        guardar_cache(user_id, "ultimo_resultado", {"tipo": "archivos_drive", "items": archivos}, ttl_minutos=10)
        if not mensaje:
            if archivos:
                mensaje = f"Encontré {len(archivos)} archivo(s) en tu Drive."
            else:
                mensaje = "No encontré archivos en tu Drive con esos criterios."

    elif accion == "ver_sitios":
        resultados = await revisar_sitios_en_vivo(user_id)
        payload = resultados

        if not resultados:
            mensaje = "No tienes sitios monitoreados todavía. Dime la URL y con gusto lo agrego."
        else:
            contexto_conversacion = "\n".join(
                f"{m['role']}: {m['content']}" for m in historial_raw[-6:]
            )
            ultimo_tema = obtener_cache(user_id, "ultimo_tema_sitios") or ""

            mensaje = await responder_sobre_sitios(
                request.mensaje, resultados,
                contexto_conversacion=contexto_conversacion,
                ultimo_tema=ultimo_tema,
            )
            guardar_cache(user_id, "ultimo_tema_sitios", mensaje, ttl_minutos=30)
        flujo_activo = False

    elif accion == "ver_tareas":
        from services.tiempo import hoy_mx
        fuente_filtro = payload.get("fuente") if isinstance(payload, dict) else None
        contiene_palabra_tarea = "tarea" in request.mensaje.lower()

        incluir_examenes = (not contiene_palabra_tarea) and not fuente_filtro

        tareas_todas = obtener_tareas(user_id)
        tareas_filtradas = (
            [t for t in tareas_todas if t.get("fuente", "manual") == fuente_filtro]
            if fuente_filtro else tareas_todas
        )
        pendientes = [t for t in tareas_filtradas if not t.get("completada")]

        items = [
            {
                "id": t.get("id"), "texto": t.get("titulo"),
                "prioridad": ("Alta" if t.get("urgencia") == "alta" else "Media" if t.get("urgencia") == "media" else "Baja"),
                "done": False, "fuente": t.get("fuente", "manual"), "fecha": t.get("fecha_limite"),
            }
            for t in pendientes[:15]
        ]

        examenes_incluidos = []
        if incluir_examenes:
            from services.db import obtener_examenes
            hoy = hoy_mx()
            for ex in obtener_examenes(user_id)[:5]:
                try:
                    dias_restantes = (datetime.strptime(ex["fecha"], "%Y-%m-%d").date() - hoy).days
                except Exception:
                    dias_restantes = 99
                prioridad = "Alta" if dias_restantes <= 3 else "Media" if dias_restantes <= 7 else "Baja"
                items.append({
                    "id": ex.get("id"), "texto": f"Examen de {ex['materia']}",
                    "prioridad": prioridad, "done": False, "fuente": "examen", "fecha": ex.get("fecha"),
                })
                examenes_incluidos.append(ex)
            items.sort(key=lambda x: (x.get("fecha") or "9999"))

        payload = items

        # ✅ USAR EL MENSAJE DE GEMINI SI EL USUARIO HABLA INGLÉS
        # Si el usuario habla inglés, mantener el mensaje que Gemini generó
        if idioma_usuario != "en":
            # Solo sobrescribir si está en español
            if not pendientes and not examenes_incluidos:
                if fuente_filtro:
                    mensaje = f"No tienes tareas pendientes de {fuente_filtro} en este momento."
                else:
                    mensaje = "No tienes tareas pendientes en este momento." if not incluir_examenes else "No tienes pendientes por ahora."
            else:
                partes = [t.get("titulo") for t in pendientes[:3]]
                if incluir_examenes and examenes_incluidos:
                    partes += [f"tu examen de {e['materia']}" for e in examenes_incluidos[:2]]
                    total = len(pendientes) + len(examenes_incluidos)
                    mensaje = f"Tienes {total} pendiente(s): " + ", ".join(partes) + "."
                else:
                    mensaje = f"Tienes {len(pendientes)} tarea(s) pendiente(s): " + ", ".join(partes) + "."
        # Si es inglés, mantener el mensaje de Gemini (no hacer nada)

        flujo_activo = False

    # ✅ Manejar ver_calendario correctamente
    elif accion == "ver_calendario":
        try:
            # Enriquecer payload con eventos reales
            payload = await enriquecer_payload(accion, payload, user_id)
            if isinstance(payload, dict) and payload.get("eventos") is not None:
                eventos = payload.get("eventos", [])
                if not mensaje:
                    if eventos:
                        mensaje = f"Tienes {len(eventos)} eventos en tu calendario."
                    else:
                        mensaje = "No tienes eventos en tu calendario para los próximos días."
                flujo_activo = False
            else:
                # Si falló, mostrar mensaje de error
                accion = "flash"
                mensaje_error = payload.get("mensaje", "No pude obtener tu calendario")
                payload = {"mensaje": mensaje_error, "tipo": "error"}
                mensaje = mensaje_error
        except Exception as e:
            print(f"❌ Error en ver_calendario: {e}")
            import traceback
            traceback.print_exc()
            accion = "flash"
            payload = {"mensaje": "Error al obtener el calendario. ¿Has autorizado el acceso a Google Calendar?", "tipo": "error"}
            mensaje = "Error al obtener el calendario."
            flujo_activo = False

    else:
        payload = await enriquecer_payload(accion, payload, user_id)
        if accion == "ver_calificaciones":
            mensaje = "Aquí tienes un ejemplo de cómo se verán tus calificaciones — por ahora es una vista de muestra, la integración real llega pronto."

    # ──────────────────────────────────────────────────────────────────────────
    # 🔗 DETECCIÓN UNIVERSAL DE LINKS
    # ──────────────────────────────────────────────────────────────────────────
    links_encontrados = []
    if accion in ("flash", "ver_sitios") and mensaje:
        links_encontrados = extraer_links_de_texto(mensaje)
    if links_encontrados:
        accion = "mostrar_links"
        payload = {"links": links_encontrados}
        if len(links_encontrados) == 1:
            mensaje = f"Aquí está el link de {links_encontrados[0]['texto']}."
        else:
            mensaje = f"Aquí tienes {len(links_encontrados)} enlaces."

    print(f"📦 Payload final: {payload}")
    print(f"✅ Enviando: accion={accion}, mensaje={mensaje}, flujo_activo={flujo_activo}")

    historial_actualizado = historial_raw + [
        {"role": "user",  "content": request.mensaje},
        {"role": "model", "content": mensaje or str(resultado)},
    ]
    guardar_historial(user_id, historial_actualizado[-40:])

    return MensajeResponse(
        accion=accion,
        payload=payload,
        mensaje=mensaje,
        flujo_activo=flujo_activo,
        modo_ui=calcular_modo_ui(accion, resultado),
    )


# ──────────────────────────────────────────────────────────────────────────────
# 📊 ENDPOINTS ADICIONALES
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/contexto")
async def obtener_contexto(
    user_id: str = Depends(verificar_identidad)
):
    usuario = obtener_usuario(user_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    tareas = obtener_tareas(user_id)
    historial = obtener_historial(user_id)
    return {
        "usuario": {"nombre": usuario.get("name", "").split()[0], "tier": usuario.get("tier", "estudiante")},
        "tareas_total": len(tareas),
        "tareas_urgentes": len([t for t in tareas if t.get("urgencia") == "alta"]),
        "mensajes_historial": len(historial),
    }


@router.get("/resumen")
async def obtener_resumen_dashboard(
    user_id: str = Depends(verificar_identidad)
):
    from services.db import obtener_horario, obtener_notas, obtener_config, obtener_minutos_enfoque_hoy
    from services.tiempo import hoy_mx

    tareas = obtener_tareas(user_id)
    pendientes = [t for t in tareas if not t.get("completada")]
    hoy_str = hoy_mx().isoformat()
    completadas_hoy = [t for t in tareas if t.get("completada") and t.get("fecha_limite") == hoy_str]

    KEYWORDS_EXAMEN = ["examen", "parcial", "final", "quiz"]
    examenes = [t for t in pendientes if any(k in t.get("titulo", "").lower() for k in KEYWORDS_EXAMEN)]
    examenes.sort(key=lambda t: t.get("fecha_limite") or "9999")

    clases = obtener_horario(user_id)
    materias_activas = len({c.get("materia") for c in clases if c.get("materia")})

    dias_orden = {"lunes": 0, "martes": 1, "miercoles": 2, "jueves": 3, "viernes": 4, "sabado": 5, "domingo": 6}
    hoy_idx = hoy_mx().weekday()
    nombre_dia_hoy = list(dias_orden.keys())[hoy_idx] if hoy_idx < 7 else ""
    clases_ordenadas = sorted(
        clases,
        key=lambda c: ((dias_orden.get(c.get("dia", "").lower(), 99) - hoy_idx) % 7, c.get("hora_inicio", "")),
    )
    clases_hoy = [c for c in clases if c.get("dia", "").lower() == nombre_dia_hoy]
    tareas_hoy = [t for t in pendientes if t.get("fecha_limite") == hoy_str]

    try:
        archivos = await obtener_archivos_drive_real(user_id)
    except Exception:
        archivos = []

    config = obtener_config(user_id)

    return {
        "tareas_pendientes_total": len(pendientes),
        "tareas_pendientes": pendientes[:6],
        "materias_activas": materias_activas,
        "clases_proximas": clases_ordenadas[:6],
        "examenes_proximos": examenes[:5],
        "notas_recientes": obtener_notas(user_id, limite=5),
        "archivos_recientes": archivos[:5],
        "agenda_hoy": {"clases": clases_hoy, "tareas": tareas_hoy},
        "racha_dias": config.get("racha_dias", 0) or 0,
        "enfoque_hoy_minutos": obtener_minutos_enfoque_hoy(user_id),
        "objetivo_diario": len(tareas_hoy),
        "completadas_hoy": len(completadas_hoy),
    }


class RegistrarEnfoqueRequest(BaseModel):
    minutos: int


@router.post("/enfoque")
async def registrar_enfoque(
    body: RegistrarEnfoqueRequest,
    user_id: str = Depends(verificar_identidad)
):
    from services.db import registrar_minutos_enfoque
    if body.minutos > 0:
        registrar_minutos_enfoque(user_id, body.minutos)
    return {"registrado": True}


@router.get("/config")
async def obtener_configuracion(
    user_id: str = Depends(verificar_identidad)
):
    from services.db import obtener_config
    config = obtener_config(user_id)
    return config


@router.post("/config")
async def guardar_configuracion(
    body: dict,
    user_id: str = Depends(verificar_identidad)
):
    from services.db import guardar_config
    guardar_config(user_id, body)
    return {"guardado": True, "config": body}


class PasoOnboardingRequest(BaseModel):
    paso: int


@router.post("/config/paso")
async def actualizar_paso_onboarding(
    body: PasoOnboardingRequest,
    user_id: str = Depends(verificar_identidad)
):
    from services.db import guardar_config
    guardar_config(user_id, {"onboarding_paso": body.paso})
    return {"actualizado": True, "onboarding_paso": body.paso}


@router.delete("/historial")
async def limpiar_historial(
    user_id: str = Depends(verificar_identidad)
):
    guardar_historial(user_id, [])
    return {"mensaje": "Historial limpiado"}


@router.post("/hablar")
async def texto_a_voz(
    request: dict,
    http_request: Request,
    user_id: str = Depends(verificar_identidad)
):
    texto = request.get("texto", "")
    if not texto:
        raise HTTPException(status_code=400, detail="Texto vacío")
    
    # 🔍 DETECTAR IDIOMA DEL TEXTO
    from services.gemini import detectar_idioma
    idioma = detectar_idioma(texto)
    print(f"🔊 TTS - Idioma detectado: {idioma} para texto: '{texto[:50]}...'")
    
    # Configurar voz según el idioma
    if idioma == "en":
        voice_config = {
            "languageCode": "en-US",
            "name": "en-US-Neural2-J",
            "ssmlGender": "MALE"
        }
        speaking_rate = 0.95
        pitch = 0.0
    else:
        voice_config = {
            "languageCode": "es-US",
            "name": "es-US-Neural2-C",
            "ssmlGender": "MALE"
        }
        speaking_rate = 0.92
        pitch = -1.5
    
    url = f"https://texttospeech.googleapis.com/v1/text:synthesize?key={settings.GOOGLE_TTS_KEY}"
    payload = {
        "input": {"text": texto},
        "voice": voice_config,
        "audioConfig": {
            "audioEncoding": "MP3",
            "speakingRate": speaking_rate,
            "pitch": pitch
        },
    }
    
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, json=payload)
    
    if resp.status_code != 200:
        print(f"❌ Error TTS: {resp.status_code} - {resp.text}")
        raise HTTPException(status_code=500, detail=f"Error TTS: {resp.text}")
    
    audio_bytes = base64.b64decode(resp.json().get("audioContent", ""))
    return StreamingResponse(
        io.BytesIO(audio_bytes),
        media_type="audio/mpeg",
        headers={"Content-Disposition": "inline"},
    )


@router.get("/saludo")
async def obtener_saludo(
    user_id: str = Depends(verificar_identidad)
):
    from services.db import obtener_config, guardar_config
    from services.tiempo import ahora_mx
    from datetime import timedelta

    UMBRAL_BIENVENIDA_VUELTA = timedelta(hours=1)

    config = obtener_config(user_id)
    ahora = ahora_mx().replace(tzinfo=None)

    ultimo_ts_str = config.get("ultimo_saludo_ts")
    tipo_saludo = None

    if not ultimo_ts_str:
        tipo_saludo = "dia"
    else:
        try:
            ultimo_ts = datetime.fromisoformat(ultimo_ts_str.replace("Z", "+00:00")).replace(tzinfo=None)
            if ultimo_ts.date() != ahora.date():
                tipo_saludo = "dia"
            elif (ahora - ultimo_ts) >= UMBRAL_BIENVENIDA_VUELTA:
                tipo_saludo = "vuelta"
            else:
                tipo_saludo = None
        except Exception as e:
            print(f"⚠️ Error parseando ultimo_saludo_ts: {e}")
            tipo_saludo = "dia"

    if tipo_saludo is None:
        return {"saludo": None, "es_nuevo": False}

    contexto_base = construir_contexto(user_id)
    contexto_tareas = construir_contexto_tareas_eventos(user_id)

    if tipo_saludo == "dia":
        instruccion = (
            "Genera un saludo breve de mayordomo para el INICIO del día — usa 'Buenos días',"
            "'Buenas tardes' o 'Buenas noches' según la hora del contexto, cálido pero no efusivo,"
            "una sola frase, como quien ya conoce a la persona. Si hay una tarea urgente o un examen"
            "próximo en el contexto, puedes mencionarlo de forma casual."
        )
    else:
        instruccion = (
            "El usuario ya había hablado contigo hoy y ahora regresa después de un rato. Genera un"
            "saludo breve tipo 'bienvenido de vuelta' — NO uses 'buenos días/tardes/noches' porque"
            "ya lo saludaste antes hoy. Una sola frase, cálido pero no efusivo, como un mayordomo que"
            "nota que la persona volvió. Si hay algo urgente nuevo en el contexto, puedes mencionarlo."
        )

    prompt_saludo = f"{contexto_base}\n\n{contexto_tareas}\n\n{instruccion}"
    resultado = await enviar_mensaje([], prompt_saludo)
    saludo = resultado.get("mensaje", "").strip() or "Bienvenido de vuelta."

    guardar_config(user_id, {"ultimo_saludo_ts": ahora.isoformat()})
    return {"saludo": saludo, "es_nuevo": True, "tipo": tipo_saludo}


@router.delete("/account")
async def eliminar_cuenta(user_id: str = Depends(verificar_identidad)):
    """
    Elimina la cuenta del usuario y todos sus datos asociados.
    Esta acción es irreversible.
    """
    from services.db import eliminar_todos_los_datos_usuario
    from fastapi.responses import JSONResponse
    
    resultado = eliminar_todos_los_datos_usuario(user_id)

    response = JSONResponse(content=resultado)
    # ✅ Usa el mismo nombre que en logout
    response.delete_cookie("tona_session", path="/")
    return response


@router.get("/actividad-semana")
async def obtener_actividad_semana_endpoint(user_id: str = Depends(verificar_identidad)):
    from services.db import obtener_actividad_semana
    return {"dias": obtener_actividad_semana(user_id)}


@router.get("/notas")
async def obtener_notas_endpoint(user_id: str = Depends(verificar_identidad)):
    from services.db import obtener_notas
    return {"notas": obtener_notas(user_id, limite=5)}


@router.get("/examenes")
async def obtener_examenes_endpoint(user_id: str = Depends(verificar_identidad)):
    from services.db import obtener_examenes
    return {"examenes": obtener_examenes(user_id)}