from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from services.db import _leer, obtener_tareas, obtener_usuario
from datetime import datetime
import json

scheduler = AsyncIOScheduler()

def iniciar_scheduler():
    scheduler.add_job(
        revisar_tareas_urgentes,
        trigger=IntervalTrigger(minutes=30),
        id="revisar_tareas",
        replace_existing=True,
    )
    scheduler.start()
    print("Scheduler iniciado")

async def revisar_tareas_urgentes():
    try:
        users_data = _leer("data/users.json")
        for user_id, usuario in users_data.items():
            tareas = obtener_tareas(user_id)
            urgentes = [t for t in tareas if t.get('urgencia') == 'alta' and not t.get('completada')]
            if urgentes:
                print(f"[Tona Scheduler] {usuario.get('name')}: {len(urgentes)} tareas urgentes")
    except Exception as e:
        print(f"Error en scheduler: {e}")

def detener_scheduler():
    if scheduler.running:
        scheduler.shutdown()