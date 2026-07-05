import json
import os
from datetime import datetime
from typing import Optional, Dict

DB_PATH       = "data"
USERS_FILE    = f"{DB_PATH}/users.json"
SESSIONS_FILE = f"{DB_PATH}/sessions.json"
TASKS_FILE    = f"{DB_PATH}/tasks.json"
CONFIG_FILE   = f"{DB_PATH}/config.json"
SITIOS_FILE   = f"{DB_PATH}/sitios.json"
CACHE_FILE    = f"{DB_PATH}/cache.json"


def init_db():
    os.makedirs(DB_PATH, exist_ok=True)
    for f in [USERS_FILE, SESSIONS_FILE, TASKS_FILE, CONFIG_FILE, SITIOS_FILE, CACHE_FILE]:
        if not os.path.exists(f):
            with open(f, "w") as file:
                json.dump({}, file)


def _leer(archivo: str) -> Dict:
    try:
        with open(archivo, "r") as f:
            return json.load(f)
    except:
        return {}


def _escribir(archivo: str, data: Dict):
    with open(archivo, "w") as f:
        json.dump(data, f, indent=2, default=str)


# ── Usuarios ──────────────────────────────────────────────────────────────────

def guardar_usuario(user_id: str, datos: Dict):
    users = _leer(USERS_FILE)
    datos["updated_at"] = datetime.now().isoformat()
    if user_id not in users:
        datos["created_at"]          = datetime.now().isoformat()
        datos["onboarding_completado"] = False
    users[user_id] = datos
    _escribir(USERS_FILE, users)


def obtener_usuario(user_id: str) -> Optional[Dict]:
    users = _leer(USERS_FILE)
    return users.get(user_id)


def obtener_usuario_por_email(email: str) -> Optional[Dict]:
    users = _leer(USERS_FILE)
    for uid, u in users.items():
        if u.get("email") == email:
            return {**u, "id": uid}
    return None


# ── Sesiones de chat ──────────────────────────────────────────────────────────

def guardar_historial(user_id: str, historial: list):
    sessions = _leer(SESSIONS_FILE)
    sessions[user_id] = {
        "historial":   historial,
        "updated_at":  datetime.now().isoformat(),
    }
    _escribir(SESSIONS_FILE, sessions)


def obtener_historial(user_id: str) -> list:
    sessions = _leer(SESSIONS_FILE)
    return sessions.get(user_id, {}).get("historial", [])


# ── Tareas ────────────────────────────────────────────────────────────────────

def guardar_tareas(user_id: str, tareas: list):
    tasks = _leer(TASKS_FILE)
    tasks[user_id] = {
        "tareas":     tareas,
        "updated_at": datetime.now().isoformat(),
    }
    _escribir(TASKS_FILE, tasks)


def obtener_tareas(user_id: str) -> list:
    tasks = _leer(TASKS_FILE)
    return tasks.get(user_id, {}).get("tareas", [])


# ── Configuración de usuario (onboarding + preferencias) ─────────────────────

CONFIG_DEFAULT = {
    "nombre_usuario":   "",
    "nombre_agente":    "Tona",
    "tono":             "neutral",       # neutral | amigable | formal
    "idioma":           "es",
    "notificaciones":   True,
    "frecuencia_sitios": "semanal",      # diaria | semanal | quincenal
    "onboarding_paso":  0,               # paso actual del onboarding
}


def guardar_config(user_id: str, config: Dict):
    configs = _leer(CONFIG_FILE)
    existing = configs.get(user_id, {})
    existing.update(config)
    existing["updated_at"] = datetime.now().isoformat()
    configs[user_id] = existing
    _escribir(CONFIG_FILE, configs)

    # Sincronizar onboarding_completado al usuario también
    if "onboarding_completado" in config:
        users = _leer(USERS_FILE)
        if user_id in users:
            users[user_id]["onboarding_completado"] = config["onboarding_completado"]
            users[user_id]["nombre_preferido"]       = config.get("nombre_usuario", "")
            users[user_id]["nombre_agente"]          = config.get("nombre_agente", "Tona")
            _escribir(USERS_FILE, users)


def obtener_config(user_id: str) -> Dict:
    configs = _leer(CONFIG_FILE)
    config  = configs.get(user_id, {})
    return {**CONFIG_DEFAULT, **config}


# ── Sitios monitoreados ───────────────────────────────────────────────────────

def guardar_sitios(user_id: str, sitios: list):
    data = _leer(SITIOS_FILE)
    data[user_id] = {
        "sitios":     sitios,
        "updated_at": datetime.now().isoformat(),
    }
    _escribir(SITIOS_FILE, data)


def obtener_sitios(user_id: str) -> list:
    data = _leer(SITIOS_FILE)
    return data.get(user_id, {}).get("sitios", [])


def agregar_sitio(user_id: str, sitio: Dict) -> Dict:
    """
    sitio = {
        "id":         "uuid",
        "url":        "https://...",
        "alias":      "ESCOM noticias",
        "frecuencia": "semanal",
        "ultimo_hash": "",
        "ultimo_resumen": "",
        "ultima_revision": None,
    }
    """
    import uuid
    sitios = obtener_sitios(user_id)
    sitio["id"]          = sitio.get("id") or uuid.uuid4().hex[:8]
    sitio["ultimo_hash"]  = sitio.get("ultimo_hash", "")
    sitio["ultima_revision"] = sitio.get("ultima_revision")
    sitios.append(sitio)
    guardar_sitios(user_id, sitios)
    return sitio


def eliminar_sitio(user_id: str, sitio_id: str):
    sitios = [s for s in obtener_sitios(user_id) if s.get("id") != sitio_id]
    guardar_sitios(user_id, sitios)


# ── Caché de APIs externas (Gmail, Drive) ─────────────────────────────────────

def guardar_cache(user_id: str, clave: str, data: any, ttl_minutos: int = 15):
    cache = _leer(CACHE_FILE)
    if user_id not in cache:
        cache[user_id] = {}
    cache[user_id][clave] = {
        "data":    data,
        "expira":  (datetime.now().timestamp() + ttl_minutos * 60),
    }
    _escribir(CACHE_FILE, cache)


def obtener_cache(user_id: str, clave: str) -> Optional[any]:
    cache = _leer(CACHE_FILE)
    entrada = cache.get(user_id, {}).get(clave)
    if not entrada:
        return None
    if datetime.now().timestamp() > entrada["expira"]:
        return None
    return entrada["data"]


def limpiar_cache(user_id: str, clave: str = None):
    cache = _leer(CACHE_FILE)
    if user_id in cache:
        if clave:
            cache[user_id].pop(clave, None)
        else:
            cache[user_id] = {}
    _escribir(CACHE_FILE, cache)