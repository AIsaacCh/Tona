from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse, JSONResponse
from google_auth_oauthlib.flow import Flow
import httpx
from services.auth_utils import crear_token
import os
import secrets
from datetime import datetime, timedelta
from services.db import guardar_usuario, obtener_usuario_por_email, obtener_usuario, guardar_oauth_state, obtener_y_borrar_oauth_state
from config import settings

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
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/documents",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.readonly",
    
]



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
    return RedirectResponse(auth_url)

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
    # ... el resto de la función sigue exactamente igual que antes
    

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
        })

    token = crear_token(user_id)


    return RedirectResponse(
        f"{settings.FRONTEND_URL}/dashboard?user_id={user_id}&name={user_info.get('name', '')}&token={token}"

    )

@router.get("/me")
async def get_me(user_id: str):
    usuario = obtener_usuario(user_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {
        "id": user_id,
        "email": usuario.get("email"),
        "name": usuario.get("name"),
        "picture": usuario.get("picture"),
        "tier": usuario.get("tier", "estudiante"),
    }

@router.get("/check_scopes/{user_id}")
async def check_scopes(user_id: str):
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
                    "https://www.googleapis.com/auth/drive",
                    "https://www.googleapis.com/auth/drive.file",
                    "https://www.googleapis.com/auth/drive.readonly"
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
async def logout(user_id: str):
    usuario = obtener_usuario(user_id)
    if usuario:
        guardar_usuario(user_id, {**usuario, 'access_token': None})
    return RedirectResponse(f"{settings.FRONTEND_URL}/login")