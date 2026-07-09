from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.db import (
    obtener_usuario, guardar_tareas, obtener_tareas,
    guardar_cache, obtener_cache,
    obtener_sitios, guardar_sitios, agregar_sitio, eliminar_sitio,
    guardar_usuario,
)
from datetime import datetime, timedelta
from typing import Optional
import httpx
import uuid
import hashlib
from config import settings

router = APIRouter()


# ── Modelos ───────────────────────────────────────────────────────────────────

class TareaManual(BaseModel):
    titulo: str
    fecha_limite: Optional[str] = None
    prioridad: Optional[str] = "media"
    resumen: Optional[str] = ""

class EventoCalendar(BaseModel):
    titulo: str
    fecha: str
    hora: str
    descripcion: Optional[str] = ""
    duracion_min: Optional[int] = 60

class SitioMonitoreo(BaseModel):
    url: str
    alias: str
    frecuencia: Optional[str] = "semanal"


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _refrescar_token(usuario: dict, user_id: str) -> bool:
    """Función auxiliar para refrescar el token."""
    refresh_token = usuario.get("refresh_token")
    if not refresh_token:
        print(f"❌ No hay refresh_token para {user_id}")
        return False
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "refresh_token": refresh_token,
                    "grant_type": "refresh_token",
                }
            )
            if resp.status_code == 200:
                data = resp.json()
                usuario["access_token"] = data["access_token"]
                if "expires_in" in data:
                    usuario["expires_at"] = (datetime.now() + timedelta(seconds=data["expires_in"])).isoformat()
                guardar_usuario(user_id, usuario)
                print(f"✅ Token refrescado para {user_id}")
                return True
            else:
                print(f"❌ Error refrescando token: {resp.status_code} - {resp.text}")
                return False
    except Exception as e:
        print(f"❌ Error al refrescar: {e}")
        return False


async def verificar_y_refrescar_token(user_id: str) -> bool:
    """Verifica si el token es válido, si no, intenta refrescarlo."""
    usuario = obtener_usuario(user_id)
    if not usuario or not usuario.get("access_token"):
        print(f"❌ Usuario {user_id} no tiene token")
        return False
    
    
    expires_at = usuario.get("expires_at")
    if expires_at:
        try:
            exp = datetime.fromisoformat(expires_at)
            if exp.tzinfo is not None:
                exp = exp.replace(tzinfo=None)
            if datetime.now() >= exp:
                print(f"⏰ Token expirado (expires_at: {expires_at}), refrescando...")
                return await _refrescar_token(usuario, user_id)
        except Exception as e:
            print(f"❌ Error parseando expires_at: {e}")
            
    
    # Verificar si el token es válido
    try:
        headers = {"Authorization": f"Bearer {usuario['access_token']}"}
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://www.googleapis.com/oauth2/v1/tokeninfo",
                params={"access_token": usuario["access_token"]}
            )
            if resp.status_code == 200:
                print(f"✅ Token válido para {user_id}")
                # Si no tiene expires_at pero el token es válido, guardar uno
                if not usuario.get("expires_at"):
                    # Estimar expiración (3600 segundos por defecto)
                    usuario["expires_at"] = (datetime.now() + timedelta(seconds=3600)).isoformat()
                    guardar_usuario(user_id, usuario)
                    print(f"📝 expires_at estimado guardado para {user_id}")
                return True
            else:
                print(f"❌ Token inválido: {resp.status_code}, intentando refresh...")
                return await _refrescar_token(usuario, user_id)
    except Exception as e:
        print(f"❌ Error verificando token: {e}")
        return await _refrescar_token(usuario, user_id)


async def get_google_headers(user_id: str) -> dict:
    print(f"🔑 Obteniendo headers para {user_id}")
    
    # Verificar y refrescar token si es necesario
    valido = await verificar_y_refrescar_token(user_id)
    if not valido:
        print(f"❌ Token inválido después de intentar refresh para {user_id}")
        raise HTTPException(
            status_code=401, 
            detail="Token de acceso inválido o expirado. Por favor, inicia sesión de nuevo."
        )
    
    usuario = obtener_usuario(user_id)
    if not usuario or not usuario.get("access_token"):
        raise HTTPException(status_code=401, detail="Token de acceso no disponible")
    
    print(f"✅ Headers obtenidos para {user_id}")
    return {"Authorization": f"Bearer {usuario['access_token']}"}


def calcular_urgencia(fecha_limite: str) -> str:
    if not fecha_limite:
        return "baja"
    try:
        fecha = datetime.strptime(fecha_limite, "%Y-%m-%d")
        dias  = (fecha - datetime.now()).days
        if dias <= 1:  return "alta"
        if dias <= 4:  return "media"
        return "baja"
    except:
        return "baja"


# ── Sync Google (Classroom + Calendar) ───────────────────────────────────────

@router.get("/sync/{user_id}")
async def sincronizar_todo(user_id: str):
    tareas_classroom = await _obtener_classroom(user_id)
    eventos_calendar = await _obtener_calendar(user_id)

    existentes = obtener_tareas(user_id)
    manuales   = [t for t in existentes if t.get("fuente") == "manual"]

    todas = tareas_classroom + eventos_calendar + manuales
    todas.sort(key=lambda x: (x.get("fecha_limite") is None, x.get("fecha_limite") or "9999"))
    guardar_tareas(user_id, todas)

    return {
        "sincronizado":       True,
        "tareas_classroom":   len(tareas_classroom),
        "eventos_calendar":   len(eventos_calendar),
        "tareas_manuales":    len(manuales),
        "total":              len(todas),
    }


async def _obtener_classroom(user_id: str) -> list:
    try:
        headers = await get_google_headers(user_id)
        tareas = []
        hoy = datetime.now().date()
        limite_pasado = hoy - timedelta(days=30)  # ignorar tareas vencidas hace más de 30 días

        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://classroom.googleapis.com/v1/courses",
                headers=headers,
                params={"courseStates": "ACTIVE"},
            )
            if resp.status_code != 200:
                return []

            cursos = resp.json().get("courses", [])

            for curso in cursos[:5]:
                curso_id = curso["id"]
                nombre_curso = curso.get("name", "Curso")

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

                    # ✅ Filtrar tareas vencidas hace más de 30 días para no ensuciar el contexto
                    if fecha_limite:
                        try:
                            fecha_t = datetime.strptime(fecha_limite, "%Y-%m-%d").date()
                            if fecha_t < limite_pasado:
                                continue  # muy vieja, ignorar
                        except:
                            pass

                    tareas.append({
                        "id": tarea["id"],
                        "titulo": tarea.get("title", "Sin título"),
                        "resumen": f"{nombre_curso} · {fecha_limite or 'Sin fecha'}",
                        "curso": nombre_curso,
                        "curso_id": curso_id,
                        "fecha_limite": fecha_limite,
                        "urgencia": calcular_urgencia(fecha_limite),
                        "fuente": "classroom",
                        "completada": False,
                    })

        return tareas
    except Exception as e:
        print(f"Error Classroom: {e}")
        return []


async def _obtener_calendar(user_id: str) -> list:
    try:
        headers        = await get_google_headers(user_id)
        ahora          = datetime.utcnow().isoformat() + "Z"
        en_una_semana  = (datetime.utcnow() + timedelta(days=7)).isoformat() + "Z"

        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://www.googleapis.com/calendar/v3/calendars/primary/events",
                headers=headers,
                params={
                    "timeMin":      ahora,
                    "timeMax":      en_una_semana,
                    "singleEvents": True,
                    "orderBy":      "startTime",
                    "maxResults":   20,
                },
            )
            if resp.status_code != 200:
                return []

            eventos = []
            for e in resp.json().get("items", []):
                inicio = e.get("start", {})
                fecha  = inicio.get("dateTime", inicio.get("date", ""))[:10]
                eventos.append({
                    "id":          e["id"],
                    "titulo":      e.get("summary", "Evento sin título"),
                    "resumen":     f"Calendar · {fecha}",
                    "fecha_limite": fecha,
                    "urgencia":    calcular_urgencia(fecha),
                    "fuente":      "calendar",
                    "completada":  False,
                })
            return eventos
    except Exception as e:
        print(f"Error Calendar: {e}")
        return []


# ── Gmail ─────────────────────────────────────────────────────────────────────

@router.get("/gmail/{user_id}")
async def obtener_gmail(user_id: str, max_resultados: int = 10):
    cached = obtener_cache(user_id, "gmail")
    if cached:
        return cached

    try:
        headers = await get_google_headers(user_id)

        async with httpx.AsyncClient() as client:
            # Solo no leídos
            resp = await client.get(
                "https://gmail.googleapis.com/gmail/v1/users/me/messages",
                headers=headers,
                params={
                    "q":          "is:unread",
                    "maxResults": max_resultados,
                },
            )
            if resp.status_code != 200:
                return {"correos": [], "total_no_leidos": 0}

            mensajes_ids = resp.json().get("messages", [])
            correos      = []

            for m in mensajes_ids[:8]:
                resp_m = await client.get(
                    f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{m['id']}",
                    headers=headers,
                    params={"format": "metadata", "metadataHeaders": ["Subject", "From", "Date"]},
                )
                if resp_m.status_code != 200:
                    continue

                data    = resp_m.json()
                headers_msg = {h["name"]: h["value"] for h in data.get("payload", {}).get("headers", [])}

                correos.append({
                    "id":      m["id"],
                    "asunto":  headers_msg.get("Subject", "Sin asunto"),
                    "de":      headers_msg.get("From", ""),
                    "fecha":   headers_msg.get("Date", "")[:16],
                    "snippet": data.get("snippet", "")[:120],
                    "leido":   False,
                })

        resultado = {
            "correos":          correos,
            "total_no_leidos":  len(mensajes_ids),
        }
        guardar_cache(user_id, "gmail", resultado, ttl_minutos=15)
        return resultado

    except Exception as e:
        print(f"Error Gmail: {e}")
        return {"correos": [], "total_no_leidos": 0}


# ── Google Drive ──────────────────────────────────────────────────────────────

@router.get("/drive/{user_id}")
async def obtener_drive(user_id: str):
    cached = obtener_cache(user_id, "drive")
    if cached:
        return cached

    try:
        headers = await get_google_headers(user_id)

        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://www.googleapis.com/drive/v3/files",
                headers=headers,
                params={
                    "pageSize":  15,
                    "orderBy":   "modifiedTime desc",
                    "fields":    "files(id,name,mimeType,modifiedTime,size,webViewLink)",
                    "q":         "trashed=false",
                },
            )
            if resp.status_code != 200:
                return {"archivos": []}

            TIPO_MAP = {
                "application/vnd.google-apps.document":     "doc",
                "application/vnd.google-apps.spreadsheet":  "sheet",
                "application/vnd.google-apps.presentation": "slides",
                "application/pdf":                          "pdf",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
            }

            archivos = []
            for f in resp.json().get("files", []):
                tipo = TIPO_MAP.get(f.get("mimeType", ""), "archivo")
                archivos.append({
                    "id":           f["id"],
                    "nombre":       f.get("name", "Sin nombre"),
                    "tipo":         tipo,
                    "modificado":   f.get("modifiedTime", "")[:10],
                    "tamaño":       f.get("size", ""),
                    "url":          f.get("webViewLink", ""),
                })

        resultado = {"archivos": archivos}
        guardar_cache(user_id, "drive", resultado, ttl_minutos=15)
        return resultado

    except Exception as e:
        print(f"Error Drive: {e}")
        return {"archivos": []}


# ── Sitios monitoreados ───────────────────────────────────────────────────────

@router.get("/sitios/{user_id}")
async def listar_sitios(user_id: str):
    return {"sitios": obtener_sitios(user_id)}


@router.post("/sitios/{user_id}")
async def crear_sitio(user_id: str, body: SitioMonitoreo):
    usuario = obtener_usuario(user_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    sitio = agregar_sitio(user_id, {
        "url":               body.url,
        "alias":             body.alias,
        "frecuencia":        body.frecuencia,
        "ultimo_hash":       "",
        "ultimo_resumen":    "",
        "ultima_revision":   None,
    })
    return {"creado": True, "sitio": sitio}


@router.delete("/sitios/{user_id}/{sitio_id}")
async def borrar_sitio(user_id: str, sitio_id: str):
    eliminar_sitio(user_id, sitio_id)
    return {"eliminado": True}


@router.post("/sitios/{user_id}/{sitio_id}/revisar")
async def revisar_sitio_ahora(user_id: str, sitio_id: str):
    """Fuerza revisión inmediata de un sitio."""
    from services.scheduler import _revisar_sitio
    resultado = await _revisar_sitio(user_id, sitio_id)
    return resultado


# ── Tareas manuales ───────────────────────────────────────────────────────────

@router.post("/manual/{user_id}")
async def crear_tarea_manual(user_id: str, body: TareaManual):
    usuario = obtener_usuario(user_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    nueva = {
        "id":          f"manual_{uuid.uuid4().hex[:8]}",
        "titulo":      body.titulo,
        "resumen":     body.resumen or body.titulo,
        "fecha_limite": body.fecha_limite,
        "urgencia":    body.prioridad.lower() if body.prioridad else calcular_urgencia(body.fecha_limite),
        "fuente":      "manual",
        "completada":  False,
        "created_at":  datetime.now().isoformat(),
    }
    tareas = obtener_tareas(user_id)
    tareas.append(nueva)
    tareas.sort(key=lambda x: x.get("fecha_limite", "9999"))
    guardar_tareas(user_id, tareas)
    return {"creada": True, "tarea": nueva}


@router.delete("/manual/{user_id}/{tarea_id}")
async def eliminar_tarea_manual(user_id: str, tarea_id: str):
    tareas = obtener_tareas(user_id)
    tarea  = next((t for t in tareas if t.get("id") == tarea_id), None)
    if not tarea:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    if tarea.get("fuente") != "manual":
        raise HTTPException(status_code=403, detail="Solo se pueden eliminar tareas manuales")
    guardar_tareas(user_id, [t for t in tareas if t.get("id") != tarea_id])
    return {"eliminada": True}


@router.post("/completar/{user_id}/{tarea_id}")
async def completar_tarea(user_id: str, tarea_id: str):
    tareas = obtener_tareas(user_id)
    for t in tareas:
        if t.get("id") == tarea_id:
            t["completada"] = True
    guardar_tareas(user_id, tareas)
    return {"completada": True}


# ── Crear evento en Google Calendar ──────────────────────────────────────────

@router.post("/evento/{user_id}")
async def crear_evento_calendar(user_id: str, body: EventoCalendar):
    try:
        headers = await get_google_headers(user_id)

        inicio_str = f"{body.fecha}T{body.hora}:00"
        inicio_dt  = datetime.strptime(inicio_str, "%Y-%m-%dT%H:%M:%S")
        fin_dt     = inicio_dt + timedelta(minutes=int(body.duracion_min))

        usuario  = obtener_usuario(user_id)
        timezone = usuario.get("timezone", "America/Mexico_City")

        payload_gc = {
            "summary":     body.titulo,
            "description": body.descripcion or "",
            "start": {"dateTime": inicio_dt.strftime("%Y-%m-%dT%H:%M:%S"), "timeZone": timezone},
            "end":   {"dateTime": fin_dt.strftime("%Y-%m-%dT%H:%M:%S"),   "timeZone": timezone},
        }

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://www.googleapis.com/calendar/v3/calendars/primary/events",
                headers={**headers, "Content-Type": "application/json"},
                json=payload_gc,
            )

        if resp.status_code not in (200, 201):
            print(f"Error Calendar API: {resp.status_code} — {resp.text}")
            raise HTTPException(status_code=500, detail=f"Error Calendar API: {resp.text}")

        evento_creado = resp.json()
        nueva_entrada = {
            "id":          evento_creado.get("id"),
            "titulo":      body.titulo,
            "resumen":     f"Calendar · {body.fecha} {body.hora}",
            "fecha_limite": body.fecha,
            "urgencia":    calcular_urgencia(body.fecha),
            "fuente":      "calendar",
            "completada":  False,
        }
        tareas = obtener_tareas(user_id)
        tareas.append(nueva_entrada)
        tareas.sort(key=lambda x: x.get("fecha_limite", "9999"))
        guardar_tareas(user_id, tareas)

        return {"creado": True, "evento": nueva_entrada}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creando evento: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Detalle de materia (Classroom) ────────────────────────────────────────────

@router.get("/materia/{user_id}/{curso_id}")
async def obtener_detalle_materia(user_id: str, curso_id: str):
    try:
        headers = await get_google_headers(user_id)

        async with httpx.AsyncClient() as client:
            rc = await client.get(
                f"https://classroom.googleapis.com/v1/courses/{curso_id}",
                headers=headers,
            )
            rw = await client.get(
                f"https://classroom.googleapis.com/v1/courses/{curso_id}/courseWork",
                headers=headers,
            )
            ra = await client.get(
                f"https://classroom.googleapis.com/v1/courses/{curso_id}/announcements",
                headers=headers,
                params={"announcementStates": "PUBLISHED"},
            )

        nombre = rc.json().get("name", "Materia") if rc.status_code == 200 else "Materia"

        tareas = []
        if rw.status_code == 200:
            for t in rw.json().get("courseWork", []):
                due   = t.get("dueDate")
                fecha = f"{due['year']}-{due['month']:02d}-{due['day']:02d}" if due else None
                tareas.append({
                    "id":        t["id"],
                    "titulo":    t.get("title", "Sin título"),
                    "fecha":     fecha,
                    "tipo":      t.get("workType", "ASSIGNMENT"),
                    "completada": False,
                })

        anuncios = []
        if ra.status_code == 200:
            for a in ra.json().get("announcements", [])[:5]:
                texto = a.get("text", "")
                anuncios.append({
                    "id":    a["id"],
                    "texto": texto[:200] + ("..." if len(texto) > 200 else ""),
                    "fecha": a.get("creationTime", "")[:10],
                })

        return {
            "curso_id":   curso_id,
            "nombre":     nombre,
            "tareas":     tareas,
            "pendientes": len([t for t in tareas if not t["completada"]]),
            "anuncios":   anuncios,
        }
    except Exception as e:
        print(f"Error detalle materia: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cursos/{user_id}")
async def obtener_cursos(user_id: str):
    try:
        headers = await get_google_headers(user_id)
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://classroom.googleapis.com/v1/courses",
                headers=headers,
                params={"courseStates": "ACTIVE"},
            )
        if resp.status_code != 200:
            return {"cursos": []}
        return {"cursos": [
            {"id": c["id"], "nombre": c.get("name", "Curso")}
            for c in resp.json().get("courses", [])[:8]
        ]}
    except Exception as e:
        print(f"Error cursos: {e}")
        return {"cursos": []}


# ── Diagnóstico y renovación manual de token ────────────────────────────────

@router.get("/token_status/{user_id}")
async def token_status(user_id: str):
    """Diagnóstico del estado del token de acceso."""
    usuario = obtener_usuario(user_id)
    if not usuario:
        return {"status": "no_user", "message": "Usuario no encontrado"}
    
    has_token = bool(usuario.get("access_token"))
    has_refresh = bool(usuario.get("refresh_token"))
    expires_at = usuario.get("expires_at")
    
    if expires_at:
        try:
            exp = datetime.fromisoformat(expires_at)
            expired = datetime.now() >= exp
        except:
            expired = True
    else:
        expired = None
    
    # Verificar si el token actual es válido
    if has_token:
        try:
            headers = {"Authorization": f"Bearer {usuario['access_token']}"}
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    "https://www.googleapis.com/oauth2/v1/tokeninfo",
                    params={"access_token": usuario["access_token"]}
                )
            token_valid = resp.status_code == 200
        except:
            token_valid = False
    else:
        token_valid = False
    
    return {
        "user_id": user_id,
        "has_token": has_token,
        "has_refresh_token": has_refresh,
        "expires_at": expires_at,
        "expired": expired,
        "token_valid": token_valid,
        "needs_renew": expired or not token_valid
    }


@router.post("/refresh_token/{user_id}")
async def refresh_token_manual(user_id: str):
    """Renueva manualmente el token de acceso."""
    print(f"🔄 Refresh manual solicitado para {user_id}")
    usuario = obtener_usuario(user_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    if not usuario.get("refresh_token"):
        raise HTTPException(status_code=400, detail="No hay refresh_token disponible. Re-autentica al usuario.")
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "refresh_token": usuario["refresh_token"],
                    "grant_type": "refresh_token",
                }
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=400, detail=f"Error renovando: {resp.text}")
            
            data = resp.json()
            usuario["access_token"] = data["access_token"]
            if "expires_in" in data:
                usuario["expires_at"] = (datetime.now() + timedelta(seconds=data["expires_in"])).isoformat()
            
            guardar_usuario(user_id, usuario)
            
            return {
                "success": True,
                "message": "Token renovado correctamente",
                "access_token": data["access_token"][:20] + "...",
                "expires_in": data.get("expires_in"),
                "expires_at": usuario["expires_at"]
            }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error refrescando: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{user_id}")
async def obtener_tareas_usuario(user_id: str):
    tareas = obtener_tareas(user_id)
    return {
        "tareas":   tareas,
        "total":    len(tareas),
        "urgentes": len([t for t in tareas if t.get("urgencia") == "alta"]),
    }