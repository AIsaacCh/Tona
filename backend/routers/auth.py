from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import RedirectResponse, JSONResponse
from google_auth_oauthlib.flow import Flow
import httpx
from services.auth_utils import crear_token, establecer_cookie_sesion, verificar_identidad, obtener_user_id_de_cookie
from services.stripe_service import reclamar_suscripcion_pendiente, obtener_suscripcion
import os
import secrets
from datetime import datetime, timedelta
from services.db import guardar_usuario, obtener_usuario_por_email, obtener_usuario, guardar_oauth_state, obtener_y_borrar_oauth_state
from config import settings
from pydantic import BaseModel

router = APIRouter()

os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'
os.environ['OAUTHLIB_RELAX_TOKEN_SCOPE'] = '1'

SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/classroom.courses.readonly",
    "https://www.googleapis.com/auth/classroom.coursework.me",
    "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
    "https://www.googleapis.com/auth/classroom.student-submissions.me.readonly",
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/documents",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.readonly",
]

TERMINOS_VERSION_ACTUAL = "1.3"

def crear_flow():
    return Flow.from_client_config(
        {
            "web": {
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [settings.GOOGLE_REDIRECT_URI],
            }
        },
        scopes=SCOPES,
        redirect_uri=settings.GOOGLE_REDIRECT_URI,
    )


@router.get("/google")
async def google_login():
    flow = crear_flow()
    auth_url, state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
    )
    guardar_oauth_state(state, flow.code_verifier)
    response = RedirectResponse(auth_url)
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    return response


@router.get("/callback")
async def google_callback(code: str, state: str):
    code_verifier = obtener_y_borrar_oauth_state(state)
    if not code_verifier:
        raise HTTPException(status_code=400, detail="Estado inválido o expirado")

    flow = crear_flow()
    flow.code_verifier = code_verifier

    try:
        flow.fetch_token(code=code, check=False)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al obtener token: {str(e)}")

    credentials = flow.credentials

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {credentials.token}"}
        )

    if resp.status_code != 200:
        raise HTTPException(status_code=400, detail="Error al obtener perfil de Google")

    user_info = resp.json()

    expires_at = (datetime.now() + timedelta(seconds=credentials.expiry.timestamp() - datetime.now().timestamp())).isoformat()

    email = user_info.get("email")
    user_existente = obtener_usuario_por_email(email)

    if user_existente:
        user_id = user_existente['id']
        guardar_usuario(user_id, {
            **user_existente,
            'access_token': credentials.token,
            'refresh_token': credentials.refresh_token or user_existente.get('refresh_token'),
            'expires_at': expires_at,
        })
    else:
        user_id = secrets.token_urlsafe(16)
        guardar_usuario(user_id, {
            'email': email,
            'name': user_info.get("name", ""),
            'picture': user_info.get("picture", ""),
            'access_token': credentials.token,
            'refresh_token': credentials.refresh_token,
            'expires_at': expires_at,
            'tier': 'estudiante',
            # ✅ REGISTRO DE ACEPTACIÓN DE TÉRMINOS
            'terminos_aceptados': None,  # Se llena cuando el usuario acepta
        })

    suscripcion = obtener_suscripcion(user_id)
    tiene_acceso = suscripcion and suscripcion.get("status") in ("active", "trialing")

    establecer_cookie_sesion_response = RedirectResponse(
        f"{settings.FRONTEND_URL}/dashboard?user_id={user_id}&name={user_info.get('name', '')}"
        if tiene_acceso else
        f"{settings.FRONTEND_URL}/login?necesita_suscripcion=1"
    )
    establecer_cookie_sesion(establecer_cookie_sesion_response, user_id)
    return establecer_cookie_sesion_response



class AceptarTerminosRequest(BaseModel):
    version: str
    fecha: str


@router.post("/aceptar-terminos")
async def aceptar_terminos(
    body: AceptarTerminosRequest,
    request: Request,
    user_id: str = Depends(verificar_identidad)
):
    """Registra la aceptación de términos y condiciones por parte del usuario."""
    from services.db import guardar_usuario, obtener_usuario

    usuario = obtener_usuario(user_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    historial = usuario.get("terminos_historial") or []
    if usuario.get("terminos_aceptados"):
        historial.append(usuario["terminos_aceptados"])

    usuario["terminos_aceptados"] = {
        "version": TERMINOS_VERSION_ACTUAL,
        "fecha": body.fecha,
        "ip": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent", ""),
    }
    usuario["terminos_historial"] = historial[-10:]  # conserva un historial acotado

    guardar_usuario(user_id, usuario)

    return {
        "aceptado": True,
        "version": TERMINOS_VERSION_ACTUAL,
        "fecha": body.fecha,
    }


@router.get("/me")
async def get_me(user_id: str = Depends(verificar_identidad)):
    """Obtiene información del usuario autenticado."""
    usuario = obtener_usuario(user_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    terminos = usuario.get("terminos_aceptados")
    terminos_ok = bool(terminos) and terminos.get("version") == TERMINOS_VERSION_ACTUAL
    return {
        "id": user_id,
        "email": usuario.get("email"),
        "name": usuario.get("name"),
        "picture": usuario.get("picture"),
        "tier": usuario.get("tier", "estudiante"),
        "terminos_aceptados": usuario.get("terminos_aceptados"),
        "terminos_ok": terminos_ok,
        "terminos_version_actual": TERMINOS_VERSION_ACTUAL,
    }

@router.get("/terminos-version")
async def terminos_version():
    return {"version": TERMINOS_VERSION_ACTUAL}


@router.get("/check_scopes")
async def check_scopes(user_id: str = Depends(verificar_identidad)):
    """Verifica qué scopes tiene el token del usuario."""
    usuario = obtener_usuario(user_id)
    if not usuario or not usuario.get("access_token"):
        return {
            "authenticated": False,
            "message": "Usuario no encontrado o sin token"
        }

    try:
        headers = {"Authorization": f"Bearer {usuario['access_token']}"}
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://www.googleapis.com/oauth2/v1/tokeninfo",
                params={"access_token": usuario["access_token"]}
            )

            if resp.status_code == 200:
                data = resp.json()
                scopes = data.get("scope", "").split(" ")

                has_drive = any(s in scopes for s in [
                  "https://www.googleapis.com/auth/drive.file",
                ])

                has_docs = any(s in scopes for s in [
                    "https://www.googleapis.com/auth/documents",
                    "https://www.googleapis.com/auth/documents.readonly"
                ])

                has_calendar = any(s in scopes for s in [
                    "https://www.googleapis.com/auth/calendar",
                    "https://www.googleapis.com/auth/calendar.events"
                ])

                has_classroom = any(s in scopes for s in [
                    "https://www.googleapis.com/auth/classroom.courses.readonly",
                    "https://www.googleapis.com/auth/classroom.coursework.me"
                ])

                return {
                    "authenticated": True,
                    "email": data.get("email"),
                    "scopes_count": len(scopes),
                    "has_drive": has_drive,
                    "has_docs": has_docs,
                    "has_calendar": has_calendar,
                    "has_classroom": has_classroom,
                    "needs_reauth": not (has_drive and has_docs),
                    "scopes_preview": scopes[:5]
                }
            else:
                return {
                    "authenticated": False,
                    "status": resp.status_code,
                    "message": "Token inválido o expirado"
                }
    except Exception as e:
        return {
            "authenticated": False,
            "error": str(e)
        }


@router.get("/logout")
async def logout(user_id: str = Depends(verificar_identidad)):
    usuario = obtener_usuario(user_id)
    if usuario:
        guardar_usuario(user_id, {**usuario, 'access_token': None})
    response = RedirectResponse(f"{settings.FRONTEND_URL}/")
    response.delete_cookie("tona_session", path="/")
    return response


@router.get("/whoami")
async def whoami(request: Request):
    """Permite al frontend saber si ya existe una sesión válida."""
    try:
        user_id = obtener_user_id_de_cookie(request)
    except HTTPException:
        return {"autenticado": False}

    usuario = obtener_usuario(user_id)
    if not usuario:
        return {"autenticado": False}

    return {
        "autenticado": True,
        "user_id": user_id,
        "name": usuario.get("name", ""),
    }


@router.post("/revocar")
async def revocar_acceso(user_id: str = Depends(verificar_identidad)):
    """Revoca el acceso de Tona a la cuenta de Google del usuario."""
    usuario = obtener_usuario(user_id)
    if usuario and usuario.get("access_token"):
        try:
            async with httpx.AsyncClient() as client:
                await client.post(
                    "https://oauth2.googleapis.com/revoke",
                    params={"token": usuario["access_token"]},
                )
        except Exception as e:
            print(f"⚠️ Error revocando token de Google: {e}")

    if usuario:
        guardar_usuario(user_id, {**usuario, "access_token": None, "refresh_token": None})

    return {"revocado": True}


@router.get("/verificar-cuenta")
async def verificar_cuenta(email: str):
    """
    Evalúa P (cuenta existe) y Q (suscripción activa) para un email,
    SIN crear sesión ni tocar Google. Público a propósito.
    """
    usuario = obtener_usuario_por_email(email)
    if not usuario:
        return {"existe": False, "tiene_suscripcion": False}

    suscripcion = obtener_suscripcion(usuario["id"])
    activa = bool(suscripcion) and suscripcion.get("status") in ("active", "trialing")

    return {"existe": True, "tiene_suscripcion": activa}