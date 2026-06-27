from fastapi import APIRouter, HTTPException
from services.db import obtener_usuario, guardar_tareas, obtener_tareas
from datetime import datetime, timedelta
import httpx

router = APIRouter()

async def get_google_headers(user_id: str) -> dict:
    usuario = obtener_usuario(user_id)
    if not usuario or not usuario.get('access_token'):
        raise HTTPException(status_code=401, detail="Token de acceso no disponible")
    return {"Authorization": f"Bearer {usuario['access_token']}"}

@router.get("/sync/{user_id}")
async def sincronizar_todo(user_id: str):
    tareas_classroom = await _obtener_classroom(user_id)
    eventos_calendar = await _obtener_calendar(user_id)

    todas = tareas_classroom + eventos_calendar
    todas.sort(key=lambda x: x.get('fecha_limite', '9999'))

    guardar_tareas(user_id, todas)

    return {
        "sincronizado": True,
        "tareas": len(tareas_classroom),
        "eventos": len(eventos_calendar),
        "total": len(todas),
    }

async def _obtener_classroom(user_id: str) -> list:
    try:
        headers = await get_google_headers(user_id)
        tareas = []

        async with httpx.AsyncClient() as client:
            # obtemer cursos
            resp = await client.get(
                "https://classroom.googleapis.com/v1/courses",
                headers=headers,
                params={"courseStates": "ACTIVE"}
            )
            if resp.status_code != 200:
                return []

            cursos = resp.json().get("courses", [])

            for curso in cursos[:5]:
                curso_id = curso["id"]
                nombre_curso = curso.get("name", "Curso")

                # tareas
                resp_tareas = await client.get(
                    f"https://classroom.googleapis.com/v1/courses/{curso_id}/courseWork",
                    headers=headers,
                )
                if resp_tareas.status_code != 200:
                    continue

                for tarea in resp_tareas.json().get("courseWork", []):
                    due = tarea.get("dueDate")
                    fecha_limite = None
                    if due:
                        fecha_limite = f"{due.get('year')}-{due.get('month'):02d}-{due.get('day'):02d}"

                    urgencia = calcular_urgencia(fecha_limite)

                    tareas.append({
                        "id": tarea["id"],
                        "titulo": tarea.get("title", "Sin título"),
                        "resumen": f"{nombre_curso} · {fecha_limite or 'Sin fecha'}",
                        "curso": nombre_curso,
                        "fecha_limite": fecha_limite,
                        "urgencia": urgencia,
                        "fuente": "classroom",
                        "completada": False,
                    })

        return tareas
    except Exception as e:
        print(f"Error Classroom: {e}")
        return []

async def _obtener_calendar(user_id: str) -> list:
    try:
        headers = await get_google_headers(user_id)
        ahora = datetime.utcnow().isoformat() + "Z"
        en_una_semana = (datetime.utcnow() + timedelta(days=7)).isoformat() + "Z"

        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://www.googleapis.com/calendar/v3/calendars/primary/events",
                headers=headers,
                params={
                    "timeMin": ahora,
                    "timeMax": en_una_semana,
                    "singleEvents": True,
                    "orderBy": "startTime",
                    "maxResults": 10,
                }
            )
            if resp.status_code != 200:
                return []

            eventos = []
            for evento in resp.json().get("items", []):
                inicio = evento.get("start", {})
                fecha = inicio.get("dateTime", inicio.get("date", ""))[:10]
                urgencia = calcular_urgencia(fecha)

                eventos.append({
                    "id": evento["id"],
                    "titulo": evento.get("summary", "Evento sin título"),
                    "resumen": f"Calendar · {fecha}",
                    "fecha_limite": fecha,
                    "urgencia": urgencia,
                    "fuente": "calendar",
                    "completada": False,
                })

            return eventos
    except Exception as e:
        print(f"Error Calendar: {e}")
        return []

def calcular_urgencia(fecha_limite: str) -> str:
    if not fecha_limite:
        return "baja"
    try:
        fecha = datetime.strptime(fecha_limite, "%Y-%m-%d")
        dias = (fecha - datetime.now()).days
        if dias <= 1:
            return "alta"
        elif dias <= 4:
            return "media"
        return "baja"
    except:
        return "baja"

@router.get("/{user_id}")
async def obtener_tareas_usuario(user_id: str):
    tareas = obtener_tareas(user_id)
    return {
        "tareas": tareas,
        "total": len(tareas),
        "urgentes": len([t for t in tareas if t.get('urgencia') == 'alta']),
    }

@router.post("/completar/{user_id}/{tarea_id}")
async def completar_tarea(user_id: str, tarea_id: str):
    tareas = obtener_tareas(user_id)
    for t in tareas:
        if t.get('id') == tarea_id:
            t['completada'] = True
    guardar_tareas(user_id, tareas)
    return {"completada": True}