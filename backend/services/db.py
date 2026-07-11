from datetime import datetime
from typing import Optional, Dict
from supabase import create_client, Client
from config import settings
from services.encryption import cifrar, descifrar

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
    """Verifica que el state exista y no haya expirado (10 min), regresa el code_verifier, y lo borra (uso único)."""
    resp = supabase.table("oauth_states").select("*").eq("state", state).execute()
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
            supabase.table("oauth_states").delete().eq("state", state).execute()
            return None
    except Exception as e:
        print(f"⚠️ Error verificando expiración de oauth_state: {e}")

    supabase.table("oauth_states").delete().eq("state", state).execute()
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
            "urgencia": t.get("urgencia", "baja"),
            "fuente": t.get("fuente"),
            "completada": t.get("completada", False),
            "curso": t.get("curso"),
            "curso_id": t.get("curso_id"),
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
}


def guardar_config(user_id: str, config: Dict):
    columnas_validas = {
        "nombre_usuario", "nombre_agente", "tono", "idioma",
        "notificaciones", "frecuencia_sitios", "onboarding_paso"
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
    supabase.table("sitios_monitoreados").insert(sitio).execute()
    return sitio


def eliminar_sitio(user_id: str, sitio_id: str):
    supabase.table("sitios_monitoreados").delete().eq("user_id", user_id).eq("id", sitio_id).execute()


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