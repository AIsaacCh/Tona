from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Union
from services.gemini import enviar_mensaje
from services.db import obtener_usuario, guardar_historial, obtener_historial, obtener_tareas, guardar_tareas
from config import settings
from datetime import datetime, timedelta
import httpx, io, base64, uuid, json

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


def construir_contexto(user_id: str) -> str:
    usuario = obtener_usuario(user_id)
    if not usuario:
        return ""
    ahora = datetime.now().strftime("%A %d de %B, %H:%M")
    nombre = usuario.get("name", "").split()[0]
    return f"""CONTEXTO DEL USUARIO:
- Nombre: {nombre}
- Fecha y hora actual: {ahora}
- Tier: {usuario.get('tier', 'estudiante')}"""


def construir_contexto_tareas_eventos(user_id: str) -> str:
    tareas = obtener_tareas(user_id)
    if not tareas:
        return "TAREAS Y EVENTOS REGISTRADOS: Ninguno por el momento."

    hoy = datetime.now().date()
    en_una_semana = hoy + timedelta(days=7)

    lineas = ["TAREAS Y EVENTOS REGISTRADOS (datos reales, úsalos para responder con precisión):"]
    for t in sorted(tareas, key=lambda x: x.get("fecha_limite") or "9999"):
        if t.get("completada"):
            continue
        fecha_str = t.get("fecha_limite", "sin fecha")
        fuente = t.get("fuente", "manual")
        titulo = t.get("titulo", "Sin título")
        urgencia = t.get("urgencia", "baja")

        en_semana = ""
        try:
            fecha_t = datetime.strptime(fecha_str, "%Y-%m-%d").date()
            if hoy <= fecha_t <= en_una_semana:
                en_semana = " [ESTA SEMANA]"
        except:
            pass

        lineas.append(f"  - \"{titulo}\" · fecha: {fecha_str} · urgencia: {urgencia} · origen: {fuente}{en_semana}")

    if len(lineas) == 1:
        return "TAREAS Y EVENTOS REGISTRADOS: Ninguno pendiente por el momento."

    return "\n".join(lineas)


def enriquecer_payload(accion: str, payload, user_id: str):
    tareas = obtener_tareas(user_id)

    if accion == "ver_tareas":
        if tareas:
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
                for t in tareas[:15]
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
        hoy = datetime.now().date()
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
        mes_actual = datetime.now().month - 1
        año_actual = datetime.now().year
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
            body =EnviarCorreoRequest(
                para=payload.get("para", ""),
                asunto=payload.get("asunto", "Sin asunto"),
                cuerpo=payload.get("cuerpo", ""),

            )
            resultado =await enviar_correo(user_id, body)
            return resultado 
        except Exception as e:
            print(f"❌ Error en enviar_correo: {e}")
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
async def chat(request: MensajeRequest):
    usuario = obtener_usuario(request.user_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # ──────────────────────────────────────────────────────────────────────────
    # 🚀 ACCIONES DIRECTAS (Onboarding, etc.)
    # ──────────────────────────────────────────────────────────────────────────
    if request.mensaje.startswith("__ACCION_DIRECTA__:"):
        try:
            direct = json.loads(request.mensaje.replace("__ACCION_DIRECTA__:", "", 1))
            accion_directa = direct.get("accion")
            payload_directo = direct.get("payload", {})
            mensaje_resp = ""

            if accion_directa in ("crear_tarea_real", "crear_evento_real", "guardar_config_onboarding"):
                dato = await ejecutar_accion_backend(accion_directa, payload_directo, request.user_id)
                if dato:
                    accion_directa = "flash"
                    payload_directo = {"mensaje": "Guardado correctamente.", "tipo": "exito"}
                    mensaje_resp = "Listo, guardado."
                else:
                    accion_directa = "flash"
                    payload_directo = {"mensaje": "No se pudo guardar.", "tipo": "error"}
                    mensaje_resp = "No se pudo guardar."

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

    mensaje_con_contexto = (
        f"{contexto_base}\n\n{contexto_tareas}\n\nMensaje del usuario: {request.mensaje}"
    )

    resultado = await enviar_mensaje(historial_raw, mensaje_con_contexto)
    print(f"🎯 Gemini respondió: {resultado}")

    accion  = resultado.get("accion", "flash")
    payload = resultado.get("payload", {})
    mensaje = resultado.get("mensaje", "")

    flujo_activo = False
    if accion in ("solicitar_dato", "confirmar_creacion") and isinstance(payload, dict):
        flujo_activo = payload.get("flujo_activo", False)

    # ──────────────────────────────────────────────────────────────────────────
    # ⚙️ EJECUTAR ACCIONES DEL BACKEND
    # ──────────────────────────────────────────────────────────────────────────
    if accion in ("crear_tarea_real", "crear_evento_real", "enviar_correo"):
        dato_creado = await ejecutar_accion_backend(accion, payload, request.user_id)
        if dato_creado:
            accion  = "flash"
            payload = {"mensaje": mensaje or "Listo, guardado.", "tipo": "exito"}
        else:
            accion  = "flash"
            payload = {"mensaje": "No se pudo guardar. Intenta de nuevo.", "tipo": "error"}
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
                data= await buscar_gmail_por_tema(request.user_id, tema, dias)
                correos =data.get("correos", [])
                payload=correos
                if not mensaje:
                    if correos:
                         mensaje=f"Encontré {len(correos)} correo(s) sobre '{tema}' en los ultimos {dias} días."
                    else:
                        mensaje=f"No encontré correos recientes sobre '{tema}."

                flujo_activo=False
            except Exception as e:
                print(f"Error buscando correos por tema: {e}")
                accion="flash"
                payload={"mensaje":"Error buscando correos.", "tipo":"error"}
                mensaje="Error buscando correos."
                flujo_activo=False
                
    elif accion == "ver_gmail":
        try:
            from routers.tasks import obtener_gmail
            data = await obtener_gmail(request.user_id)
            correos = data.get("correos", [])
            payload = correos
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
        if not mensaje:
            if archivos:
                mensaje = f"Encontré {len(archivos)} archivo(s) en tu Drive."
            else:
                mensaje = "No encontré archivos en tu Drive con esos criterios."
    else:
        payload = enriquecer_payload(accion, payload, request.user_id)

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
async def obtener_contexto(user_id: str):
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
async def obtener_configuracion(user_id: str):
    from services.db import obtener_config
    config = obtener_config(user_id)
    return config


@router.post("/config/{user_id}")
async def guardar_configuracion(user_id: str, body: dict):
    from services.db import guardar_config
    guardar_config(user_id, body)
    return {"guardado": True, "config": body}


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