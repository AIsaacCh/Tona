import json
import os
from datetime import datetime
from typing import Optional, Dict

DB_PATH = "data"
USERS_FILE = f"{DB_PATH}/users.json"
SESSIONS_FILE = f"{DB_PATH}/sessions.json"
TASKS_FILE = f"{DB_PATH}/tasks.json"

def init_db():
    os.makedirs(DB_PATH, exist_ok=True)
    for f in [USERS_FILE, SESSIONS_FILE, TASKS_FILE]:
        if not os.path.exists(f):
            with open(f, 'w') as file:
                json.dump({}, file)

def _leer(archivo: str) -> Dict:
    try:
        with open(archivo, 'r') as f:
            return json.load(f)
    except:
        return {}

def _escribir(archivo: str, data: Dict):
    with open(archivo, 'w') as f:
        json.dump(data, f, indent=2, default=str)

# ── Usuarios ────────────────────────────────────────────
def guardar_usuario(user_id: str, datos: Dict):
    users = _leer(USERS_FILE)
    datos['updated_at'] = datetime.now().isoformat()
    if user_id not in users:
        datos['created_at'] = datetime.now().isoformat()
    users[user_id] = datos
    _escribir(USERS_FILE, users)

def obtener_usuario(user_id: str) -> Optional[Dict]:
    users = _leer(USERS_FILE)
    return users.get(user_id)

def obtener_usuario_por_email(email: str) -> Optional[Dict]:
    users = _leer(USERS_FILE)
    for uid, u in users.items():
        if u.get('email') == email:
            return {**u, 'id': uid}
    return None

# ── Sesiones de chat ─────────────────────────────────────
def guardar_historial(user_id: str, historial: list):
    sessions = _leer(SESSIONS_FILE)
    sessions[user_id] = {
        'historial': historial,
        'updated_at': datetime.now().isoformat()
    }
    _escribir(SESSIONS_FILE, sessions)

def obtener_historial(user_id: str) -> list:
    sessions = _leer(SESSIONS_FILE)
    return sessions.get(user_id, {}).get('historial', [])

# ── Tareas ───────────────────────────────────────────────
def guardar_tareas(user_id: str, tareas: list):
    tasks = _leer(TASKS_FILE)
    tasks[user_id] = {
        'tareas': tareas,
        'updated_at': datetime.now().isoformat()
    }
    _escribir(TASKS_FILE, tasks)

def obtener_tareas(user_id: str) -> list:
    tasks = _leer(TASKS_FILE)
    return tasks.get(user_id, {}).get('tareas', [])