from datetime import datetime
from typing import Optional, Dict
from supabase import create_client, Client
from config import settings
from services.encryption import cifrar, descifrar
import uuid

supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

_cache_memoria: dict = {}


def init_db():
    pass


def _preparar_usuario_para_guardar(datos: Dict) -> Dict:
    datos = dict(datos)
    if "access_token" in datos:
        datos["access_token"] = cifrar(datos["access_token"]) if datos["access_token"] else None
    if "refresh_token" in datos:
        datos["refresh_token"] = cifrar(datos["refresh_token"]) if datos["refresh_token"] else None
    return datos


def _descifrar_usuario(row: Dict) -> Dict:
    if not row:
        return row
    row = dict(row)
    if row.get("access_token"):
        row["access_token"] = descifrar(row["access_token"])
    if row.get("refresh_token"):
        row["refresh_token"] = descifrar(row["refresh_token"])
    return row


def guardar_usuario(user_id: str, datos: Dict):
    payload = _preparar_usuario_para_guardar(datos)
    payload["id"] = user_id
    payload["updated_at"] = datetime.now().isoformat()

    existente = supabase.table("users").select("id").eq("id", user_id).execute()
    if not existente.data:
        payload["created_at"] = datetime.now().isoformat()
        payload.setdefault("onboarding_completado", False)

    columnas_validas = {
        "id", "email", "name", "picture", "tier", "access_token", "refresh_token",
        "expires_at", "timezone", "onboarding_completado", "nombre_preferido",
        "nombre_agente", "created_at", "updated_at"
    }
    payload = {k: v for k, v in payload.items() if k in columnas_validas}

    supabase.table("users").upsert(payload).execute()


def obtener_usuario(user_id: str) -> Optional[Dict]:
    resp = supabase.table("users").select("*").eq("id", user_id).execute()
    if not resp.data:
        return None
    return _descifrar_usuario(resp.data[0])


def obtener_usuario_por_email(email: str) -> Optional[Dict]:
    resp = supabase.table("users").select("*").eq("email", email).execute()
    if not resp.data:
        return None
    usuario = _descifrar_usuario(resp.data[0])
    usuario["id"] = resp.data[0]["id"]
    return usuario


def obtener_todos_los_usuarios() -> list:
    resp = supabase.table("users").select("*").execute()
    return [_descifrar_usuario(row) for row in (resp.data or [])]


def guardar_historial(user_id: str, historial: list):
    supabase.table("chat_sessions").upsert({
        "user_id": user_id,
        "historial": historial,
        "updated_at": datetime.now().isoformat(),
    }).execute()


def obtener_historial(user_id: str) -> list:
    resp = supabase.table("chat_sessions").select("historial").eq("user_id", user_id).execute()
    if not resp.data:
        return []
    return resp.data[0].get("historial", [])

def guardar_oauth_state(state: str, code_verifier: str):
    supabase.table("oauth_states").insert({
        "state": state,
        "code_verifier": code_verifier,
    }).execute()


def obtener_y_borrar_oauth_state(state: str):
    """
    Borra el state de forma atómica (DELETE...RETURNING) y regresa el code_verifier
    solo si esta llamada fue la que efectivamente encontró y borró la fila (uso único real).
    Si el state ya no existe (ya usado, o nunca existió), regresa None.
    """
    resp = supabase.table("oauth_states").delete().eq("state", state).execute()
    if not resp.data:
        return None

    fila = resp.data[0]
    creado = fila.get("created_at")
    try:
        from datetime import datetime, timedelta
        creado_dt = datetime.fromisoformat(creado.replace("Z", "+00:00"))
        if creado_dt.tzinfo is not None:
            creado_dt = creado_dt.replace(tzinfo=None)
        if datetime.now() - creado_dt > timedelta(minutes=10):
            return None  # ya se borró arriba; solo estaba expirado
    except Exception as e:
        print(f"⚠️ Error verificando expiración de oauth_state: {e}")

    return fila.get("code_verifier")


def guardar_tareas(user_id: str, tareas: list):
    supabase.table("tasks").delete().eq("user_id", user_id).execute()
    if not tareas:
        return
    filas = []
    for t in tareas:
        filas.append({
            "id": t.get("id"),
            "user_id": user_id,
            "titulo": t.get("titulo"),
            "resumen": t.get("resumen"),
            "fecha_limite": t.get("fecha_limite") or None,
            "hora_limite": t.get("hora_limite"),
            "urgencia": t.get("urgencia", "baja"),
            "fuente": t.get("fuente"),
            "completada": t.get("completada", False),
            "curso": t.get("curso"),
            "curso_id": t.get("curso_id"),
            "sin_fecha_limite": t.get("sin_fecha_limite", False),
            "fecha_publicacion": t.get("fecha_publicacion") or None,
        })
    supabase.table("tasks").insert(filas).execute()


def obtener_tareas(user_id: str) -> list:
    resp = supabase.table("tasks").select("*").eq("user_id", user_id).execute()
    return resp.data or []


CONFIG_DEFAULT = {
    "nombre_usuario":   "",
    "nombre_agente":    "Tona",
    "tono":             "neutral",
    "idioma":           "es",
    "notificaciones":   True,
    "frecuencia_sitios": "semanal",
    "onboarding_paso":  0,
    "ultimo_saludo_fecha": None,
    "ultimo_saludo_ts": None,
    "racha_dias": 0,
    "ultima_actividad_fecha": None,
}


def guardar_config(user_id: str, config: Dict):
    columnas_validas = {
    "nombre_usuario", "nombre_agente", "tono", "idioma",
    "notificaciones", "frecuencia_sitios", "onboarding_paso",
    "drive_root_folder_id", "ultimo_saludo_fecha", "ultimo_saludo_ts",
    "racha_dias", "ultima_actividad_fecha"
}
    payload = {k: v for k, v in config.items() if k in columnas_validas}
    payload["user_id"] = user_id
    payload["updated_at"] = datetime.now().isoformat()
    supabase.table("user_config").upsert(payload).execute()

    if "onboarding_completado" in config:
        usuario_actual = obtener_usuario(user_id) or {}
        guardar_usuario(user_id, {
            **usuario_actual,
            "onboarding_completado": config["onboarding_completado"],
            "nombre_preferido": config.get("nombre_usuario", ""),
            "nombre_agente": config.get("nombre_agente", "Tona"),
        })


def obtener_config(user_id: str) -> Dict:
    resp = supabase.table("user_config").select("*").eq("user_id", user_id).execute()
    config = resp.data[0] if resp.data else {}
    return {**CONFIG_DEFAULT, **config}


def guardar_sitios(user_id: str, sitios: list):
    supabase.table("sitios_monitoreados").delete().eq("user_id", user_id).execute()
    if not sitios:
        return
    filas = [{**s, "user_id": user_id} for s in sitios]
    supabase.table("sitios_monitoreados").insert(filas).execute()


def obtener_sitios(user_id: str) -> list:
    resp = supabase.table("sitios_monitoreados").select("*").eq("user_id", user_id).execute()
    return resp.data or []


def agregar_sitio(user_id: str, sitio: Dict) -> Dict:
    import uuid
    sitio["id"] = sitio.get("id") or uuid.uuid4().hex[:8]
    sitio["user_id"] = user_id
    sitio.setdefault("ultimo_hash", "")
    sitio.setdefault("ultima_revision", None)
    sitio.setdefault("notificado", True)
    supabase.table("sitios_monitoreados").insert(sitio).execute()
    return sitio


def eliminar_sitio(user_id: str, sitio_id: str):
    supabase.table("sitios_monitoreados").delete().eq("user_id", user_id).eq("id", sitio_id).execute()

def guardar_carpeta_clase(user_id: str, curso_id: str, nombre_clase: str, drive_folder_id: str) -> Dict:
    fila = {
        "user_id": user_id,
        "curso_id": curso_id,
        "nombre_clase": nombre_clase,
        "drive_folder_id": drive_folder_id,
    }
    supabase.table("classroom_folders").upsert(fila, on_conflict="user_id,curso_id").execute()
    return fila


def obtener_carpetas_clases(user_id: str) -> list:
    resp = supabase.table("classroom_folders").select("*").eq("user_id", user_id).execute()
    return resp.data or []


def obtener_carpeta_clase(user_id: str, curso_id: str) -> Optional[Dict]:
    resp = supabase.table("classroom_folders").select("*").eq("user_id", user_id).eq("curso_id", curso_id).execute()
    return resp.data[0] if resp.data else None
def guardar_sugerencia_entrega(user_id: str, sugerencia: Dict) -> Dict:
    fila = {
        "user_id": user_id,
        "tarea_id": sugerencia["tarea_id"],
        "titulo_tarea": sugerencia["titulo_tarea"],
        "curso_id": sugerencia["curso_id"],
        "archivo_id": sugerencia.get("archivo_id"),
        "archivo_nombre": sugerencia.get("archivo_nombre"),
        "archivo_link": sugerencia.get("archivo_link"),
        "sin_archivo": sugerencia.get("sin_archivo", False),
        "notificada": False,
    }
    supabase.table("sugerencias_entrega").upsert(fila, on_conflict="user_id,tarea_id,archivo_id").execute()
    return fila

def vincular_archivo_tarea(user_id: str, tarea_id: str, archivo_id: str, archivo_nombre: str, archivo_link: str, curso_id: str = None) -> Dict:
    fila = {
        "user_id": user_id,
        "tarea_id": tarea_id,
        "archivo_id": archivo_id,
        "archivo_nombre": archivo_nombre,
        "archivo_link": archivo_link,
        "curso_id": curso_id,
    }
    supabase.table("tarea_archivos").upsert(fila, on_conflict="user_id,tarea_id").execute()
    return fila


def obtener_archivo_de_tarea(user_id: str, tarea_id: str) -> Optional[Dict]:
    resp = supabase.table("tarea_archivos").select("*").eq("user_id", user_id).eq("tarea_id", tarea_id).execute()
    return resp.data[0] if resp.data else None


def obtener_sugerencias_pendientes(user_id: str) -> list:
    resp = supabase.table("sugerencias_entrega").select("*").eq("user_id", user_id).eq("notificada", False).execute()
    return resp.data or []


def marcar_sugerencia_notificada(user_id: str, sugerencia_id: str):
    supabase.table("sugerencias_entrega").update({"notificada": True}).eq("user_id", user_id).eq("id", sugerencia_id).execute()


def eliminar_sugerencias_de_tarea(user_id: str, tarea_id: str):
    supabase.table("sugerencias_entrega").delete().eq("user_id", user_id).eq("tarea_id", tarea_id).execute()

def eliminar_carpeta_clase(user_id: str, curso_id: str):
    supabase.table("classroom_folders").delete().eq("user_id", user_id).eq("curso_id", curso_id).execute()

def obtener_horario (user_id: str) -> list:
    resp= supabase.table("horario").select("*").eq("user_id", user_id).order("dia").execute()
    return resp.data or []

def guardar_horario_completo(user_id:str, clases:list):
    """Remplazar TODO el horario existente por uno nuevo."""
    supabase.table("horario").delete().eq("user_id", user_id).execute()
    if not clases:
        return
    filas=[]
    for c in clases:
        filas.append({
            "id": uuid.uuid4().hex[:12],
            "user_id": user_id,
            "materia": c.get("materia"),
            "dia": c.get("dia"),
            "hora_inicio": c.get("hora_inicio"),
            "hora_fin": c.get("hora_fin"),
            "aula": c.get("aula"),
            "profesor": c.get("profesor"),
        })

        supabase.table("horario").upsert(filas).execute()

def agregar_clase_horario(user_id: str, clase: dict) -> dict:
    """Agrega UNA clase sin tocar el resto del horario."""
    import uuid
    fila = {
        "id": uuid.uuid4().hex[:12],
        "user_id": user_id,
        "materia": clase.get("materia"),
        "dia": clase.get("dia"),
        "hora_inicio": clase.get("hora_inicio"),
        "hora_fin": clase.get("hora_fin"),
        "aula": clase.get("aula"),
        "profesor": clase.get("profesor"),
    }
    supabase.table("horario").upsert(fila).execute()
    return fila


def eliminar_clase_horario(user_id: str, clase_id: str):
    supabase.table("horario").delete().eq("user_id", user_id).eq("id", clase_id).execute()
    
    

def guardar_cache(user_id: str, clave: str, data, ttl_minutos: int = 15):
    _cache_memoria.setdefault(user_id, {})[clave] = {
        "data": data,
        "expira": datetime.now().timestamp() + ttl_minutos * 60,
    }


def obtener_cache(user_id: str, clave: str):
    entrada = _cache_memoria.get(user_id, {}).get(clave)
    if not entrada:
        return None
    if datetime.now().timestamp() > entrada["expira"]:
        return None
    return entrada["data"]


def limpiar_cache(user_id: str, clave: str = None):
    if user_id in _cache_memoria:
        if clave:
            _cache_memoria[user_id].pop(clave, None)
        else:
            _cache_memoria[user_id] = {}

#-------Colaboracion-----
def crear_sesion_colaborativa(codigo:str, creado_por:str):
    supabase.table("colaboracion_sesiones").insert({
        "codigo": codigo,
        "creado_por": creado_por,

    }).execute()

def obtener_sesion(codigo: str):
    resp = supabase.table("colaboracion_sesiones").select("*").eq("codigo", codigo).eq("activa", True).execute()
    return resp.data[0] if resp.data else None

def marcar_sesion_inactiva(codigo: str):
    supabase.table("colaboracion_sesiones").update({"activa": False}).eq("codigo", codigo ).execute()


def agregar_participante(codigo: str, user_id: str, nombre:str, email:str):
    fila={
        "id": uuid.uuid4().hex,
        "codigo": codigo,
        "user_id": user_id,
        "nombre": nombre,
        "email": email,

    }

    supabase.table("colaboracion_participantes").insert(fila).execute()
    return fila

def quitar_participante(codigo: str, user_id: str):
    supabase.table("colaboracion_participantes").delete().eq("codigo", codigo).eq("user_id", user_id).execute()

def obtener_participantes(codigo:str)->list:
    resp=supabase.table("colaboracion_participantes").select("*").eq("codigo", codigo).execute()
    return resp.data or []


def agregar_archivo_compartido(codigo: str, user_id: str, doc_id: str, titulo: str, link: str):
    import uuid
    fila = {
        "id": uuid.uuid4().hex,
        "codigo": codigo,
        "user_id": user_id,
        "doc_id": doc_id,
        "titulo": titulo,
        "link": link,
    }
    supabase.table("colaboracion_archivos").insert(fila).execute()
    return fila

def obtener_archivos_compartidos(codigo: str) -> list:
    resp = supabase.table("colaboracion_archivos").select("*").eq("codigo", codigo).execute()
    return resp.data or []

def guardar_mensaje_colaborativo(codigo: str, user_id: str, nombre: str, texto: str, tipo: str = "chat", pregunta: str = None):
    import uuid
    supabase.table("colaboracion_mensajes").insert({
        "id": uuid.uuid4().hex,
        "codigo": codigo,
        "user_id": user_id,
        "nombre": nombre,
        "tipo": tipo,
        "texto": texto,
        "pregunta": pregunta,
    }).execute()


def obtener_mensajes_colaborativos(codigo: str) -> list:
    resp = supabase.table("colaboracion_mensajes").select("*").eq("codigo", codigo).order("created_at").execute()
    return resp.data or []

def obtener_suscripcion(user_id: str) -> Optional[Dict]:
    resp = supabase.table("subscriptions").select("*").eq("user_id", user_id).execute()
    return resp.data[0] if resp.data else None


def guardar_suscripcion(user_id: str, datos: Dict):
    payload = dict(datos)
    payload["user_id"] = user_id
    payload["updated_at"] = datetime.now().isoformat()
    supabase.table("subscriptions").upsert(payload, on_conflict="user_id").execute()


def reservar_evento(stripe_event_id: str, tipo: str) -> bool:
    """
    Intenta reservar el event_id de forma atómica (aprovecha el unique constraint).
    Regresa True si es la primera vez que se ve (debe procesarse).
    Regresa False si ya existía (evento duplicado, ignorar sin error).
    """
    try:
        supabase.table("payment_events").insert({
            "stripe_event_id": stripe_event_id,
            "type": tipo,
        }).execute()
        return True
    except Exception:
        return False


def liberar_evento(stripe_event_id: str):
    """Si el procesamiento falló después de reservar, borra la reserva para que Stripe pueda reintentar limpio."""
    supabase.table("payment_events").delete().eq("stripe_event_id", stripe_event_id).execute()

def validar_token_promo(token: str) -> Optional[Dict]:
    """Regresa la invitación si es válida (existe, no usada, no expirada)."""
    resp = supabase.table("promo_invitaciones").select("*").eq("token", token).execute()
    if not resp.data:
        return None
    inv = resp.data[0]
    if inv.get("usado"):
        return None
    if inv.get("expira_at"):
        try:
            exp = datetime.fromisoformat(inv["expira_at"].replace("Z", "+00:00")).replace(tzinfo=None)
            if datetime.now() > exp:
                return None
        except Exception:
            pass
    return inv


def reservar_token_promo(token: str, user_id: str) -> bool:
    """
    Marca el token como usado de forma atómica (solo si sigue en usado=false).
    Regresa True si esta petición ganó la reserva, False si alguien más ya lo usó.
    """
    resp = (
        supabase.table("promo_invitaciones")
        .update({"usado": True, "usado_por": user_id, "usado_at": datetime.now().isoformat()})
        .eq("token", token)
        .eq("usado", False)
        .execute()
    )
    return bool(resp.data)

def obtener_suscripcion_pendiente_por_token(claim_token: str) -> Optional[Dict]:
    resp = supabase.table("pending_subscriptions").select("*").eq("claim_token", claim_token).execute()
    return resp.data[0] if resp.data else None


def guardar_suscripcion_pendiente(claim_token: str, datos: Dict):
    payload = dict(datos)
    payload["claim_token"] = claim_token
    supabase.table("pending_subscriptions").upsert(payload, on_conflict="claim_token").execute()


def eliminar_suscripcion_pendiente_por_token(claim_token: str):
    supabase.table("pending_subscriptions").delete().eq("claim_token", claim_token).execute()

def reservar_claim_token(claim_token: str) -> bool:
    """
    Inserta el claim_token como 'reservado' de forma atómica.
    Regresa True si es la primera vez que se ve (puede proceder a crear el checkout).
    Regresa False si ya existe (evita crear una segunda sesión de Stripe).
    """
    try:
        supabase.table("pending_subscriptions").insert({
            "claim_token": claim_token,
            "status": "reservando",
        }).execute()
        return True
    except Exception:
        return False

def guardar_experimento_lab(user_id: str, datos: Dict) -> Dict:
    import uuid
    fila = dict(datos)
    fila["id"] = uuid.uuid4().hex[:12]
    fila["user_id"] = user_id
    fila["creado_en"] = datetime.now().isoformat()
    supabase.table("laboratorio_experimentos").insert(fila).execute()
    return fila


def obtener_experimentos_lab(user_id: str, tema: str = None) -> list:
    q = supabase.table("laboratorio_experimentos").select("*").eq("user_id", user_id)
    if tema:
        q = q.eq("tema", tema)
    resp = q.order("creado_en", desc=True).limit(20).execute()
    return resp.data or []

def crear_sesion_estudio(user_id: str, materia: str, titulo: str = None) -> Dict:
    import uuid
    fila = {
        "id": uuid.uuid4().hex[:12],
        "user_id": user_id,
        "materia": materia,
        "titulo": titulo or materia,
        "archivos_ids": [],
        "activa": True,
    }
    supabase.table("estudio_sesiones").insert(fila).execute()
    return fila


def obtener_sesion_estudio(sesion_id: str, user_id: str) -> Optional[Dict]:
    # Siempre filtra por user_id también — nunca solo por sesion_id,
    # para que un usuario no pueda leer la sesión de otro adivinando el id.
    resp = (
        supabase.table("estudio_sesiones")
        .select("*")
        .eq("id", sesion_id)
        .eq("user_id", user_id)
        .execute()
    )
    return resp.data[0] if resp.data else None


def listar_sesiones_estudio(user_id: str) -> list:
    resp = (
        supabase.table("estudio_sesiones")
        .select("*")
        .eq("user_id", user_id)
        .eq("activa", True)
        .order("actualizado_en", desc=True)
        .execute()
    )
    return resp.data or []


def guardar_mensaje_estudio(sesion_id: str, user_id: str, rol: str, texto: str, laboratorio_sugerido: str = None) -> Dict:
    import uuid
    fila = {
        "id": uuid.uuid4().hex[:12],
        "sesion_id": sesion_id,
        "user_id": user_id,
        "rol": rol,
        "texto": texto,
        "laboratorio_sugerido": laboratorio_sugerido,
    }
    supabase.table("estudio_mensajes").insert(fila).execute()
    supabase.table("estudio_sesiones").update({"actualizado_en": datetime.now().isoformat()}).eq("id", sesion_id).execute()
    return fila


def obtener_mensajes_estudio(sesion_id: str, user_id: str) -> list:
    # Doble filtro otra vez: primero confirma que la sesión es del usuario
    sesion = obtener_sesion_estudio(sesion_id, user_id)
    if not sesion:
        return []
    resp = (
        supabase.table("estudio_mensajes")
        .select("*")
        .eq("sesion_id", sesion_id)
        .order("creado_en")
        .execute()
    )
    return resp.data or []


def cerrar_sesion_estudio(sesion_id: str, user_id: str):
    supabase.table("estudio_sesiones").update({"activa": False}).eq("id", sesion_id).eq("user_id", user_id).execute()

def guardar_experimento_real(user_id: str, datos: Dict) -> Dict:
    import uuid
    fila = dict(datos)
    fila["id"] = uuid.uuid4().hex[:12]
    fila["user_id"] = user_id
    fila["fuente"] = "real"
    fila["creado_en"] = datetime.now().isoformat()
    supabase.table("laboratorio_experimentos").insert(fila).execute()
    return fila


def obtener_experimentos_por_fuente(user_id: str, tema: str, fuente: str) -> list:
    resp = (
        supabase.table("laboratorio_experimentos")
        .select("*")
        .eq("user_id", user_id)
        .eq("tema", tema)
        .eq("fuente", fuente)
        .order("creado_en", desc=True)
        .limit(30)
        .execute()
    )
    return resp.data or []

def guardar_experimento_generico(user_id: str, tema: str, datos: Dict) -> Dict:
    import uuid
    fila = {
        "id": uuid.uuid4().hex[:12],
        "user_id": user_id,
        "tema": tema,
        "fuente": "simulacion",
        "datos": datos,
    }
    supabase.table("laboratorio_experimentos").insert(fila).execute()
    return fila


# ── Notion ────────────────────────────────────────────────────────────────────

def _preparar_notion_para_guardar(datos: Dict) -> Dict:
    datos = dict(datos)
    if "access_token" in datos:
        datos["access_token"] = cifrar(datos["access_token"]) if datos["access_token"] else None
    return datos


def _descifrar_notion(row: Dict) -> Dict:
    if not row:
        return row
    row = dict(row)
    if row.get("access_token"):
        row["access_token"] = descifrar(row["access_token"])
    return row


def guardar_conexion_notion(user_id: str, datos: Dict):
    payload = _preparar_notion_para_guardar(datos)
    payload["user_id"] = user_id
    supabase.table("notion_conexiones").upsert(payload, on_conflict="user_id").execute()


def obtener_conexion_notion(user_id: str) -> Optional[Dict]:
    resp = supabase.table("notion_conexiones").select("*").eq("user_id", user_id).execute()
    if not resp.data:
        return None
    return _descifrar_notion(resp.data[0])


def eliminar_conexion_notion(user_id: str):
    supabase.table("notion_conexiones").delete().eq("user_id", user_id).execute()
    supabase.table("notion_arbol_cache").delete().eq("user_id", user_id).execute()


def guardar_arbol_notion(user_id: str, paginas: list):
    """Reemplaza TODO el árbol cacheado del usuario por el nuevo — sincronización completa."""
    supabase.table("notion_arbol_cache").delete().eq("user_id", user_id).execute()
    if not paginas:
        return
    filas = []
    for p in paginas:
        filas.append({
            "user_id": user_id,
            "page_id": p["page_id"],
            "titulo": p.get("titulo", "Sin título"),
            "tipo": p.get("tipo", "page"),
            "parent_id": p.get("parent_id"),
            "contenido_resumen": p.get("contenido_resumen", ""),
        })
    supabase.table("notion_arbol_cache").insert(filas).execute()
    supabase.table("notion_conexiones").update(
        {"ultima_sincronizacion": datetime.now().isoformat()}
    ).eq("user_id", user_id).execute()


def obtener_arbol_notion(user_id: str) -> list:
    resp = supabase.table("notion_arbol_cache").select("*").eq("user_id", user_id).order("titulo").execute()
    return resp.data or []


def buscar_en_arbol_notion(user_id: str, query: str) -> list:
    """Búsqueda simple por título — usada por el agente cuando el usuario pregunta por un tema."""
    resp = (
        supabase.table("notion_arbol_cache")
        .select("*")
        .eq("user_id", user_id)
        .ilike("titulo", f"%{query}%")
        .limit(10)
        .execute()
    )
    return resp.data or []

def obtener_pagina_de_arbol(user_id: str, page_id: str) -> Optional[Dict]:
    resp = (
        supabase.table("notion_arbol_cache")
        .select("*")
        .eq("user_id", user_id)
        .eq("page_id", page_id)
        .execute()
    )
    return resp.data[0] if resp.data else None


def obtener_hijos_de_pagina(user_id: str, page_id: str) -> list:
    """Hijos directos de una página en el árbol cacheado — se usa para
    detectar bases de datos que viven dentro de una página que el usuario ancló."""
    resp = (
        supabase.table("notion_arbol_cache")
        .select("*")
        .eq("user_id", user_id)
        .eq("parent_id", page_id)
        .execute()
    )
    return resp.data or []


def anclar_pagina_notion(user_id: str, page_id: str, titulo: str, tipo: str = "page",
                          parent_id: str = None, es_auto: bool = False,
                          imagen_referencia: str = None) -> Dict:
    fila = {
        "user_id": user_id,
        "page_id": page_id,
        "titulo": titulo,
        "tipo": tipo,
        "parent_id": parent_id,
        "es_auto": es_auto,
        "imagen_referencia": imagen_referencia,
    }
    supabase.table("notion_paginas_ancladas").upsert(fila, on_conflict="user_id,page_id").execute()
    return fila


def desanclar_pagina_notion(user_id: str, page_id: str):
    # Al desanclar una página, también se sueltan las bases de datos que se
    # habían agregado solas por ser hijas de ella (es_auto=True, mismo parent_id)
    supabase.table("notion_paginas_ancladas").delete().eq("user_id", user_id).eq("page_id", page_id).execute()
    supabase.table("notion_paginas_ancladas").delete().eq("user_id", user_id).eq("parent_id", page_id).eq("es_auto", True).execute()


def obtener_paginas_ancladas(user_id: str) -> list:
    resp = (
        supabase.table("notion_paginas_ancladas")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at")
        .execute()
    )
    return resp.data or []

# ── Notas ─────────────────────────────────────────────────────────────────

def crear_nota(user_id: str, titulo: str, contenido: str) -> Dict:
    import uuid
    fila = {
        "id": uuid.uuid4().hex[:12],
        "user_id": user_id,
        "titulo": titulo,
        "contenido": contenido,
        "creado_en": datetime.now().isoformat(),
    }
    supabase.table("notas").insert(fila).execute()
    return fila


def obtener_notas(user_id: str, limite: int = 20) -> list:
    resp = (
        supabase.table("notas")
        .select("*")
        .eq("user_id", user_id)
        .order("creado_en", desc=True)
        .limit(limite)
        .execute()
    )
    return resp.data or []


def eliminar_nota(user_id: str, nota_id: str):
    supabase.table("notas").delete().eq("user_id", user_id).eq("id", nota_id).execute()


# ── Racha de estudio y enfoque diario ───────────────────────────────────────

def actualizar_racha_estudio(user_id: str) -> int:
    """Se llama en cada mensaje de chat. Si es el primer mensaje del día,
    incrementa la racha (o la reinicia si se saltó un día). Regresa la racha actual."""
    from services.tiempo import hoy_mx
    config = obtener_config(user_id)
    hoy_str = hoy_mx().isoformat()
    ultima = config.get("ultima_actividad_fecha")

    if ultima == hoy_str:
        return config.get("racha_dias", 0) or 0

    es_consecutivo = False
    if ultima:
        try:
            fecha_anterior = datetime.strptime(ultima, "%Y-%m-%d").date()
            es_consecutivo = (hoy_mx() - fecha_anterior).days == 1
        except Exception:
            pass

    nueva_racha = (config.get("racha_dias", 0) or 0) + 1 if es_consecutivo else 1
    guardar_config(user_id, {"racha_dias": nueva_racha, "ultima_actividad_fecha": hoy_str})
    return nueva_racha


def registrar_minutos_enfoque(user_id: str, minutos: int):
    from services.tiempo import hoy_mx
    hoy_str = hoy_mx().isoformat()
    existente = (
        supabase.table("enfoque_diario")
        .select("*")
        .eq("user_id", user_id)
        .eq("fecha", hoy_str)
        .execute()
    )
    if existente.data:
        acumulado = existente.data[0].get("minutos_acumulados", 0) + minutos
        supabase.table("enfoque_diario").update({"minutos_acumulados": acumulado}) \
            .eq("user_id", user_id).eq("fecha", hoy_str).execute()
    else:
        supabase.table("enfoque_diario").insert({
            "user_id": user_id, "fecha": hoy_str, "minutos_acumulados": minutos,
        }).execute()


def obtener_minutos_enfoque_hoy(user_id: str) -> int:
    from services.tiempo import hoy_mx
    resp = (
        supabase.table("enfoque_diario")
        .select("minutos_acumulados")
        .eq("user_id", user_id)
        .eq("fecha", hoy_mx().isoformat())
        .execute()
    )
    return resp.data[0]["minutos_acumulados"] if resp.data else 0

def registrar_uso_tokens(user_id: str, tokens_entrada: int, tokens_salida: int):
    from services.tiempo import hoy_mx
    mes_str = hoy_mx().strftime("%Y-%m")
    existente = (
        supabase.table("uso_mensual").select("*")
        .eq("user_id", user_id).eq("mes", mes_str).execute()
    )
    if existente.data:
        fila = existente.data[0]
        supabase.table("uso_mensual").update({
            "llamadas": fila["llamadas"] + 1,
            "tokens_entrada": fila["tokens_entrada"] + tokens_entrada,
            "tokens_salida": fila["tokens_salida"] + tokens_salida,
        }).eq("user_id", user_id).eq("mes", mes_str).execute()
    else:
        supabase.table("uso_mensual").insert({
            "user_id": user_id, "mes": mes_str, "llamadas": 1,
            "tokens_entrada": tokens_entrada, "tokens_salida": tokens_salida,
        }).execute()


LIMITE_LLAMADAS_MES = 900  # ajusta según margen real una vez que tengas datos

def calcular_nivel_uso(user_id: str) -> int:
    """0 = normal, 1 = elevado (recorta proactividad/historial), 2 = alto (modelos auxiliares más baratos)."""
    from services.tiempo import hoy_mx
    mes_str = hoy_mx().strftime("%Y-%m")
    resp = (
        supabase.table("uso_mensual").select("llamadas")
        .eq("user_id", user_id).eq("mes", mes_str).execute()
    )
    llamadas = resp.data[0]["llamadas"] if resp.data else 0
    ratio = llamadas / LIMITE_LLAMADAS_MES
    if ratio > 2.0:
        print(f"⚠️ Revisar uso de {user_id}: {llamadas} llamadas este mes ({ratio:.1f}x el límite normal)")
    if ratio < 0.7:
        return 0
    if ratio < 1.0:
        return 1
    return 2

# ── Actividad diaria (para el widget de estadísticas) ───────────────────────

def registrar_interaccion_diaria(user_id: str):
    from services.tiempo import hoy_mx
    hoy_str = hoy_mx().isoformat()
    existente = (
        supabase.table("actividad_diaria").select("mensajes")
        .eq("user_id", user_id).eq("fecha", hoy_str).execute()
    )
    if existente.data:
        supabase.table("actividad_diaria").update(
            {"mensajes": existente.data[0]["mensajes"] + 1}
        ).eq("user_id", user_id).eq("fecha", hoy_str).execute()
    else:
        supabase.table("actividad_diaria").insert(
            {"user_id": user_id, "fecha": hoy_str, "mensajes": 1}
        ).execute()


def obtener_actividad_semana(user_id: str) -> list:
    from services.tiempo import hoy_mx
    from datetime import timedelta
    hoy = hoy_mx()
    hace_6_dias = hoy - timedelta(days=6)
    resp = (
        supabase.table("actividad_diaria").select("*")
        .eq("user_id", user_id)
        .gte("fecha", hace_6_dias.isoformat())
        .order("fecha")
        .execute()
    )
    por_fecha = {r["fecha"]: r["mensajes"] for r in (resp.data or [])}
    dias = []
    for i in range(7):
        f = hace_6_dias + timedelta(days=i)
        dias.append({"fecha": f.isoformat(), "mensajes": por_fecha.get(f.isoformat(), 0)})
    return dias


# ── Exámenes programados ─────────────────────────────────────────────────────

def guardar_examen(user_id: str, materia: str, fecha: str, hora: str = None) -> dict:
    from datetime import datetime as _dt
    try:
        _dt.strptime(fecha, "%Y-%m-%d")
    except (ValueError, TypeError):
        raise ValueError(f"Fecha inválida para el examen: '{fecha}'")
    fila = {
        "id": uuid.uuid4().hex[:12],
        "user_id": user_id, "materia": materia, "fecha": fecha, "hora": hora,
    }
    supabase.table("examenes_programados").upsert(fila, on_conflict="user_id,materia,fecha").execute()
    return fila


def obtener_examenes(user_id: str, incluir_completados: bool = False) -> list:
    from services.tiempo import hoy_mx
    q = supabase.table("examenes_programados").select("*").eq("user_id", user_id).gte("fecha", hoy_mx().isoformat())
    if not incluir_completados:
        q = q.eq("completado", False)
    resp = q.order("fecha").execute()
    return resp.data or []


def obtener_examen_por_materia(user_id: str, materia: str) -> dict | None:
    examenes = obtener_examenes(user_id)
    materia_norm = materia.strip().lower()
    coincidencias = [e for e in examenes if materia_norm in e["materia"].lower()]
    return coincidencias[0] if coincidencias else None

def completar_examen(user_id: str, examen_id: str) -> bool:
    resp = (
        supabase.table("examenes_programados")
        .update({"completado": True})
        .eq("user_id", user_id).eq("id", examen_id)
        .execute()
    )
    return bool(resp.data)

def marcar_tarea_vencida_notificada(user_id: str, tarea_id: str):
    try:
        supabase.table("tareas_notificadas_vencidas").upsert(
            {"user_id": user_id, "tarea_id": tarea_id}
        ).execute()
    except Exception as e:
        print(f"⚠️ Error marcando tarea vencida notificada: {e}")


def obtener_tareas_vencidas_notificadas(user_id: str) -> set:
    resp = (
        supabase.table("tareas_notificadas_vencidas")
        .select("tarea_id").eq("user_id", user_id).execute()
    )
    return {r["tarea_id"] for r in (resp.data or [])}