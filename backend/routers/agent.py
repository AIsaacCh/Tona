from fastapi import APIRouter, HTTPException 
from fastapi import Header, Depends, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Union
from services.auth_utils import decodificar_token, verificar_identidad, obtener_user_id_de_cookie, verificar_identidad
from services.gemini import enviar_mensaje, responder_sobre_sitios, extraer_valor_campo
from services.db import obtener_usuario, guardar_historial, obtener_historial, obtener_tareas, guardar_tareas, obtener_archivo_de_tarea, obtener_cache, guardar_cache
from config import settings
from datetime import datetime, timedelta
import httpx, io, base64, uuid, json
import re

router = APIRouter()


class MensajeRequest(BaseModel):
    user_id: str
    mensaje: str


class MensajeResponse(BaseModel):
    accion: str
    payload: Union[dict, list] = {}
    mensaje: str = ""
    flujo_activo: bool = False


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

CAMPOS_REQUERIDOS = {
    "crear_tarea_real":  ["titulo", "fecha", "prioridad"],
    "crear_evento_real": ["titulo", "fecha", "hora"],
    "agregar_sitio":     ["url", "alias", "frecuencia"],
    "enviar_correo":     ["para", "asunto", "cuerpo"],
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
    tareas = obtener_tareas(user_id)
    if not tareas:
        return "TAREAS Y EVENTOS REGISTRADOS: Ninguno por el momento."

    from services.tiempo import ahora_mx
    hoy = hoy_mx()
    ahora_completo = ahora_mx().replace(tzinfo=None)
    en_una_semana = hoy + timedelta(days=7)

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
                    vencida = " [YA VENCIÓ]"
            except:
                pass

        if sin_fecha_limite:
            fecha_info = f"sin fecha de entrega, publicada: {t.get('fecha_publicacion', 'desconocida')}"
        else:
            hora_info = f" {hora_str}" if hora_str else ""
            fecha_info = f"fecha: {fecha_str or 'sin fecha'}{hora_info}"

        # Verificar si la tarea tiene archivo vinculado
        tiene_archivo = obtener_archivo_de_tarea(user_id, t.get("id")) is not None
        etiqueta_archivo = " [YA TIENE ARCHIVO VINCULADO]" if tiene_archivo else ""

        lineas.append(f"  - \"{titulo}\" · {fecha_info} · urgencia: {urgencia} · origen: {fuente}{en_semana}{vencida}{etiqueta_archivo}")

    if len(lineas) == 1:
        return "TAREAS Y EVENTOS REGISTRADOS: Ninguno pendiente por el momento."

    return "\n".join(lineas)

def construir_contexto_sitios(user_id: str) -> str:
    from services.db import obtener_sitios
    from services.tiempo import ahora_mx
    sitios = obtener_sitios(user_id)
    if not sitios:
        return "SITIOS MONITOREADOS: Ninguno configurado."

    hoy = ahora_mx().replace(tzinfo=None)
    limite = hoy - timedelta(days=3)


    lineas = ["SITIOS MONITOREADOS (información real extraída de páginas que el usuario pidió vigilar. "
              "Menciónala de forma proactiva y natural SOLO si es relevante para lo que el usuario pregunta "
              "o para sus intereses conocidos por la conversación, y solo si no la mencionaste ya antes en el historial reciente):"]
    for s in sitios:
        resumen = s.get("ultimo_resumen")
        ultima_revision = s.get("ultima_revision")
        if not resumen:
            continue
        reciente = False
        if ultima_revision:
            try:
                fecha_rev = datetime.fromisoformat(ultima_revision.replace("Z", "+00:00")).replace(tzinfo=None)
                reciente = fecha_rev >= limite
            except:
                pass
        etiqueta = " [ACTUALIZADO RECIENTEMENTE]" if reciente else ""
        lineas.append(f"  - \"{s.get('alias')}\": {resumen}{etiqueta}")

    if len(lineas) == 1:
        return "SITIOS MONITOREADOS: Configurados pero sin revisiones aún."

    return "\n".join(lineas)

async def revisar_sitios_en_vivo(user_id: str) -> list:
    from services.db import obtener_sitios
    from services.scheduler import _revisar_sitio
    sitios = obtener_sitios(user_id)
    resultados = []
    for s in sitios:
        r = await _revisar_sitio(user_id, s["id"])
        sitios_actualizados = obtener_sitios(user_id)
        sitio_actual = next((x for x in sitios_actualizados if x["id"] == s["id"]), s)
        resultados.append({
            "alias": s.get("alias"),
            "cambio": r.get("cambio", False),
            "resumen": sitio_actual.get("ultimo_resumen") or "Aún no se ha generado un resumen para este sitio.",
            "contenido_completo": r.get("contenido_completo", ""),
        })
    return resultados

def extraer_links_de_texto(mensaje: str, alias_sitio: str = "") -> list:
    """Detecta URLs reales dentro del texto que Gemini generó, y arma
    etiquetas legibles para mostrarlas como tarjetas de enlaces."""
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


def enriquecer_payload(accion: str, payload, user_id: str):
    tareas = obtener_tareas(user_id)

    if accion == "ver_tareas":
        fuente_filtro = payload.get("fuente") if isinstance(payload, dict) else None
        tareas_filtradas = (
            [t for t in tareas if t.get("fuente", "manual") == fuente_filtro]
            if fuente_filtro else tareas
        )
        if tareas_filtradas:
            return [
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
        return []

    if accion == "ver_horario":
        from services.db import obtener_horario
        clases = obtener_horario(user_id)
        if not clases:
            return []
        dias_orden = {"lunes": 0, "martes": 1, "miercoles": 2, "jueves": 3, "viernes": 4, "sabado": 5}
        agrupado = {}
        for c in clases:
            dia = c.get("dia", "").lower()
            if dia not in agrupado:
                agrupado[dia] = []
            agrupado[dia].append(f"{c.get('materia')} {c.get('hora_inicio')}")
        return [
            {"dia": dia.upper(), "clases": agrupado[dia]}
            for dia in sorted(agrupado.keys(), key=lambda d: dias_orden.get(d, 99))
        ]

    if accion == "ver_calificaciones":
        return CALS_MOCK

    if accion == "ver_calendario":
        from services.tiempo import hoy_mx
        hoy = hoy_mx()
        en_dos_semanas = hoy + timedelta(days=14)
        eventos = []
        for t in tareas:
            fl = t.get("fecha_limite")
            if not fl:
                continue
            try:
                fecha_t = datetime.strptime(fl, "%Y-%m-%d").date()
                if hoy <= fecha_t <= en_dos_semanas:
                    eventos.append({
                        "dia": fecha_t.day,
                        "mes": fecha_t.month - 1,
                        "año": fecha_t.year,
                        "titulo": t.get("titulo", ""),
                        "urgencia": t.get("urgencia", "baja"),
                    })
            except:
                pass
        mes_actual = hoy.month - 1
        año_actual = hoy.year
        return {
            "mes": payload.get("mes", mes_actual) if isinstance(payload, dict) else mes_actual,
            "año": payload.get("año", año_actual) if isinstance(payload, dict) else año_actual,
            "eventos": eventos,
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

    if accion == "crear_archivo_para_tarea":
        try:
            tareas = obtener_tareas(user_id)
            titulo_buscado = payload.get("titulo_tarea", "").strip().lower()
            candidatas = [t for t in tareas if t.get("titulo", "").strip().lower() == titulo_buscado and t.get("fuente") == "classroom"]
            if not candidatas:
                candidatas = [t for t in tareas if titulo_buscado in t.get("titulo", "").strip().lower() and t.get("fuente") == "classroom"]
            if not candidatas:
                return None
            tarea = candidatas[0]

            import httpx as _httpx
            from routers.docs import crear_doc_para_tarea, CrearArchivoTareaRequest
            body = CrearArchivoTareaRequest(tarea_id=tarea["id"], titulo_tarea=tarea["titulo"], curso_id=tarea["curso_id"])
            resultado = await crear_doc_para_tarea(user_id, body, _=user_id)
            return resultado
        except Exception as e:
            print(f"❌ Error en crear_archivo_para_tarea: {e}")
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


@router.post("/chat", response_model=MensajeResponse)
async def chat(request_http: Request, request: MensajeRequest):
    token_user_id = obtener_user_id_de_cookie(request_http)
    if token_user_id != request.user_id:
        raise HTTPException(status_code=403, detail="No autorizado")

    usuario = obtener_usuario(request.user_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # ──────────────────────────────────────────────────────────────────────────
    # 🔄 FLUJO DE CONVERSACIÓN ACTIVO (captura de datos)
    # ──────────────────────────────────────────────────────────────────────────
    flujo = obtener_flujo(request.user_id)

    if flujo and flujo.get("activo"):
        # Verificar cancelación primero
        if es_cancelacion(request.mensaje):
            limpiar_flujo(request.user_id)
            accion, payload, mensaje, flujo_activo = "flash", {"mensaje": "Cancelado.", "tipo": "info"}, "Listo, cancelé eso.", False
        else:
            campo = flujo["campo_pendiente"]
            extraccion = await extraer_valor_campo(campo, request.mensaje, flujo["campos"], flujo["accion_objetivo"])

            if extraccion.get("cancelar"):
                limpiar_flujo(request.user_id)
                accion, payload, mensaje, flujo_activo = "flash", {"mensaje": "Cancelado.", "tipo": "info"}, "Listo, cancelé eso.", False
            else:
                flujo["campos"][campo] = extraccion.get("valor", request.mensaje)
                faltantes = [c for c in CAMPOS_REQUERIDOS[flujo["accion_objetivo"]] if not flujo["campos"].get(c)]

                if faltantes:
                    siguiente = faltantes[0]
                    flujo["campo_pendiente"] = siguiente
                    guardar_flujo(request.user_id, flujo)
                    accion = "solicitar_dato"
                    payload = {"campo": siguiente, "accion_objetivo": flujo["accion_objetivo"], "contexto": flujo["campos"]}
                    mensaje = PREGUNTAS_CAMPO.get((flujo["accion_objetivo"], siguiente), f"¿Cuál es el {siguiente}?")
                    flujo_activo = True
                else:
                    limpiar_flujo(request.user_id)
                    dato_creado = await ejecutar_accion_backend(flujo["accion_objetivo"], flujo["campos"], request.user_id)
                    if dato_creado:
                        accion, payload, mensaje = "flash", {"mensaje": "Listo, guardado.", "tipo": "exito"}, "Listo, guardado."
                    else:
                        accion, payload, mensaje = "flash", {"mensaje": "No se pudo guardar.", "tipo": "error"}, "No se pudo guardar."
                    flujo_activo = False

        historial_actualizado = obtener_historial(request.user_id) + [
            {"role": "user",  "content": request.mensaje},
            {"role": "model", "content": mensaje},
        ]
        guardar_historial(request.user_id, historial_actualizado[-40:])
        return MensajeResponse(accion=accion, payload=payload, mensaje=mensaje, flujo_activo=flujo_activo)

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
                resultado_novedades = obtener_novedades_sitios(request.user_id)
                accion_directa  = resultado_novedades["accion"]
                payload_directo = resultado_novedades["payload"]
                mensaje_resp    = resultado_novedades["mensaje"]

            elif accion_directa == "revisar_sugerencias_entrega":
                resultado_sugerencia = obtener_sugerencia_entrega_para_mostrar(request.user_id)
                accion_directa  = resultado_sugerencia["accion"]
                payload_directo = resultado_sugerencia["payload"]
                mensaje_resp    = resultado_sugerencia["mensaje"]

            elif accion_directa == "entregar_tarea_real":
                from routers.tasks import entregar_tarea_real, EntregarTareaRequest
                try:
                    body_entrega = EntregarTareaRequest(**payload_directo)
                    resultado_entrega = await entregar_tarea_real(request.user_id, body_entrega, _=request.user_id)
                    accion_directa  = "flash"
                    payload_directo = {"mensaje": "Tarea entregada en Classroom.", "tipo": "exito"}
                    mensaje_resp    = "Listo, entregué la tarea en Classroom."
                except Exception as e:
                    print(f"❌ Error entregando tarea real: {e}")
                    accion_directa  = "flash"
                    payload_directo = {"mensaje": "No se pudo entregar la tarea.", "tipo": "error"}
                    mensaje_resp    = "No pude entregar la tarea, intenta de nuevo."

            elif accion_directa == "crear_archivo_para_tarea":
                dato = await ejecutar_accion_backend(accion_directa, payload_directo, request.user_id)
                if dato and dato.get("doc_id"):
                    accion_directa  = "abrir_doc_especifico"
                    payload_directo = {"doc_id": dato["doc_id"], "titulo": dato.get("titulo", "Documento")}
                    mensaje_resp    = "Listo, creé el archivo. Abriéndolo..."
                else:
                    accion_directa  = "flash"
                    payload_directo = {"mensaje": "No se pudo crear el archivo.", "tipo": "error"}
                    mensaje_resp    = "No se pudo crear el archivo."

            elif accion_directa in ("crear_tarea_real", "crear_evento_real", "guardar_config_onboarding", "enviar_correo", "agregar_sitio"):
                dato = await ejecutar_accion_backend(accion_directa, payload_directo, request.user_id)
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

            historial_actualizado = obtener_historial(request.user_id) + [
                {"role": "user",  "content": request.mensaje},
                {"role": "model", "content": mensaje_resp},
            ]
            guardar_historial(request.user_id, historial_actualizado[-40:])

            return MensajeResponse(
                accion=accion_directa,
                payload=payload_directo,
                mensaje=mensaje_resp,
                flujo_activo=False,
            )
        except json.JSONDecodeError as e:
            print(f"❌ Error parseando JSON en acción directa: {e}")
            return MensajeResponse(
                accion="flash",
                payload={"mensaje": "Error procesando la acción", "tipo": "error"},
                mensaje="Formato de acción inválido",
                flujo_activo=False,
            )
        except Exception as e:
            print(f"❌ Error en acción directa: {e}")
            return MensajeResponse(
                accion="flash",
                payload={"mensaje": "Error procesando la acción", "tipo": "error"},
                mensaje="Ocurrió un error inesperado",
                flujo_activo=False,
            )

    # ──────────────────────────────────────────────────────────────────────────
    # 📚 CHAT NORMAL
    # ──────────────────────────────────────────────────────────────────────────
    historial_raw = obtener_historial(request.user_id)

    contexto_base    = construir_contexto(request.user_id)
    contexto_tareas  = construir_contexto_tareas_eventos(request.user_id)
    contexto_sitios  = construir_contexto_sitios(request.user_id)
    contexto_resultado = construir_contexto_ultimo_resultado(request.user_id)

    mensaje_con_contexto = (
        f"{contexto_base}\n\n{contexto_tareas}\n\n{contexto_sitios}\n\n{contexto_resultado}\n\nMensaje del usuario: {request.mensaje}"
    )

    resultado = await enviar_mensaje(historial_raw, mensaje_con_contexto)
    print(f"🎯 Gemini respondió: {resultado}")

    accion  = resultado.get("accion", "flash")
    payload = resultado.get("payload", {})
    mensaje = resultado.get("mensaje", "")

    flujo_activo = False
    if accion in ("solicitar_dato", "confirmar_creacion") and isinstance(payload, dict):
        flujo_activo = payload.get("flujo_activo", False)
        
        # 🆕 Guardar flujo activo si es solicitar_dato
        if accion == "solicitar_dato" and isinstance(payload, dict):
            guardar_flujo(request.user_id, {
                "activo": True,
                "accion_objetivo": payload.get("accion_objetivo"),
                "campos": payload.get("contexto", {}),
                "campo_pendiente": payload.get("campo"),
            })

    # ──────────────────────────────────────────────────────────────────────────
    # ⚙️ EJECUTAR ACCIONES DEL BACKEND
    # ──────────────────────────────────────────────────────────────────────────
    if accion == "crear_archivo_para_tarea":
        dato_creado = await ejecutar_accion_backend(accion, payload, request.user_id)
        if dato_creado and dato_creado.get("doc_id"):
            accion  = "abrir_doc_especifico"
            payload = {"doc_id": dato_creado["doc_id"], "titulo": dato_creado.get("titulo", "Documento")}
            mensaje = mensaje or "Listo, creé el archivo. Abriéndolo..."
        else:
            accion  = "flash"
            payload = {"mensaje": "No se pudo crear el archivo. Intenta de nuevo.", "tipo": "error"}
        flujo_activo = False

    elif accion in ("crear_tarea_real", "crear_evento_real", "enviar_correo", "agregar_sitio"):
        dato_creado = await ejecutar_accion_backend(accion, payload, request.user_id)
        if dato_creado:
            accion  = "flash"
            payload = {"mensaje": mensaje or "Listo, guardado.", "tipo": "exito"}
        else:
            accion  = "flash"
            payload = {"mensaje": "No se pudo guardar. Intenta de nuevo.", "tipo": "error"}
        flujo_activo = False

    # ✅ NUEVA ACCIÓN: Abrir archivo de tarea
    elif accion == "abrir_archivo_tarea":
        from services.db import obtener_archivo_de_tarea
        titulo_buscado = payload.get("titulo_tarea", "").strip().lower() if isinstance(payload, dict) else ""
        tareas = obtener_tareas(request.user_id)

        candidatas = [t for t in tareas if t.get("titulo", "").strip().lower() == titulo_buscado]
        if not candidatas:
            candidatas = [t for t in tareas if titulo_buscado in t.get("titulo", "").strip().lower()]

        archivo = None
        if candidatas:
            archivo = obtener_archivo_de_tarea(request.user_id, candidatas[0]["id"])

        if archivo:
            accion = "abrir_doc_especifico"
            payload = {"doc_id": archivo["archivo_id"], "titulo": archivo.get("archivo_nombre") or "Documento"}
            mensaje = f"Abriendo el archivo de \"{candidatas[0]['titulo']}\"..."
        else:
            accion = "flash"
            payload = {"mensaje": "No encontré un archivo vinculado a esa tarea.", "tipo": "error"}
            mensaje = "No encontré un archivo vinculado a esa tarea."
        flujo_activo = False

    # ✅ PROCESAR ACCIONES DE DOCUMENTOS
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
                data = await buscar_doc_por_nombre(request.user_id, nombre)
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
                data = await buscar_doc_por_nombre(request.user_id, nombre)
                docs = data.get("docs", [])
                if docs:
                    doc = docs[0]
                    try:
                        await eliminar_doc_fn(request.user_id, doc["id"])
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
                await eliminar_doc_fn(request.user_id, doc_id)
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
                data = await buscar_gmail_por_tema(request.user_id, tema, dias)
                correos = data.get("correos", [])
                payload = correos
                guardar_cache(request.user_id, "ultimo_resultado", {"tipo": "correos", "items": correos}, ttl_minutos=10)
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
            data = await obtener_gmail(request.user_id)
            correos = data.get("correos", [])
            payload = correos
            guardar_cache(request.user_id, "ultimo_resultado", {"tipo": "correos", "items": correos}, ttl_minutos=10)
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

    elif accion == "ver_archivos_drive":
        query = payload.get("query", "") if isinstance(payload, dict) else ""
        archivos = await obtener_archivos_drive_real(request.user_id, query)
        payload = archivos
        guardar_cache(request.user_id, "ultimo_resultado", {"tipo": "archivos_drive", "items": archivos}, ttl_minutos=10)
        if not mensaje:
            if archivos:
                mensaje = f"Encontré {len(archivos)} archivo(s) en tu Drive."
            else:
                mensaje = "No encontré archivos en tu Drive con esos criterios."

    elif accion == "ver_sitios":
        resultados = await revisar_sitios_en_vivo(request.user_id)
        payload = resultados

        if not resultados:
            mensaje = "No tienes sitios monitoreados todavía. Dime la URL y con gusto lo agrego."
        else:
            contexto_conversacion = "\n".join(
                f"{m['role']}: {m['content']}" for m in historial_raw[-6:]
            )
            ultimo_tema = obtener_cache(request.user_id, "ultimo_tema_sitios") or ""

            mensaje = await responder_sobre_sitios(
                request.mensaje, resultados,
                contexto_conversacion=contexto_conversacion,
                ultimo_tema=ultimo_tema,
            )
            guardar_cache(request.user_id, "ultimo_tema_sitios", mensaje, ttl_minutos=30)
        flujo_activo = False
        
    else:
        payload = enriquecer_payload(accion, payload, request.user_id)

    # ──────────────────────────────────────────────────────────────────────────
    # 🔗 DETECCIÓN UNIVERSAL DE LINKS
    # ──────────────────────────────────────────────────────────────────────────
    links_encontrados = []          # ← se agrega esta línea
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
    guardar_historial(request.user_id, historial_actualizado[-40:])

    return MensajeResponse(
        accion=accion,
        payload=payload,
        mensaje=mensaje,
        flujo_activo=flujo_activo,
    )


@router.get("/contexto/{user_id}")
async def obtener_contexto(user_id: str, _: str = Depends(verificar_identidad)):

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


@router.get("/config/{user_id}")
async def obtener_configuracion(user_id: str, _: str = Depends(verificar_identidad)):
    from services.db import obtener_config
    config = obtener_config(user_id)
    return config


@router.post("/config/{user_id}")
async def guardar_configuracion(user_id: str, body: dict, _: str = Depends(verificar_identidad)):
    from services.db import guardar_config
    guardar_config(user_id, body)
    return {"guardado": True, "config": body}


class PasoOnboardingRequest(BaseModel):
    paso: int


@router.post("/config/{user_id}/paso")
async def actualizar_paso_onboarding(user_id: str, body: PasoOnboardingRequest, _: str = Depends(verificar_identidad)):
    from services.db import guardar_config
    guardar_config(user_id, {"onboarding_paso": body.paso})
    return {"actualizado": True, "onboarding_paso": body.paso}


@router.delete("/historial/{user_id}")
async def limpiar_historial(user_id: str, _: str = Depends(verificar_identidad)):
    guardar_historial(user_id, [])
    return {"mensaje": "Historial limpiado"}


@router.post("/hablar")
async def texto_a_voz(request: dict, http_request: Request):
    user_id = obtener_user_id_de_cookie(http_request)  # 401 si no hay sesión
    texto = request.get("texto", "")
    if not texto:
        raise HTTPException(status_code=400, detail="Texto vacío")
    
    url = f"https://texttospeech.googleapis.com/v1/text:synthesize?key={settings.GOOGLE_TTS_KEY}"
    payload = {
        "input": {"text": texto},
        "voice": {"languageCode": "es-US", "name": "es-US-Neural2-C", "ssmlGender": "MALE"},
        "audioConfig": {"audioEncoding": "MP3", "speakingRate": 0.92, "pitch": -1.5},
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, json=payload)
    if resp.status_code != 200:
        raise HTTPException(status_code=500, detail=f"Error TTS: {resp.text}")
    audio_bytes = base64.b64decode(resp.json().get("audioContent", ""))
    return StreamingResponse(
        io.BytesIO(audio_bytes),
        media_type="audio/mpeg",
        headers={"Content-Disposition": "inline"},
    )