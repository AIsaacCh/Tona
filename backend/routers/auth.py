from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse, JSONResponse
from google_auth_oauthlib.flow import Flow
import httpx
import os
import secrets
from services.db import guardar_usuario, obtener_usuario_por_email, obtener_usuario
from config import settings

router = APIRouter()

# Permitir HTTP en desarrollo
os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/classroom.courses.readonly",
    "https://www.googleapis.com/auth/classroom.coursework.me",
    "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/gmail.send",
]

flow_store: dict = {}

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
    flow_store[state] = flow
    return RedirectResponse(auth_url)

@router.get("/callback")
async def google_callback(code: str, state: str):
    flow = flow_store.get(state)
    if not flow:
        raise HTTPException(status_code=400, detail="Estado inválido o expirado")

    try:
        flow.fetch_token(code=code)
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
    del flow_store[state]

    email = user_info.get("email")
    user_existente = obtener_usuario_por_email(email)

    if user_existente:
        user_id = user_existente['id']
        guardar_usuario(user_id, {
            **user_existente,
            'access_token': credentials.token,
            'refresh_token': credentials.refresh_token or user_existente.get('refresh_token'),
        })
    else:
        user_id = secrets.token_urlsafe(16)
        guardar_usuario(user_id, {
            'email': email,
            'name': user_info.get("name", ""),
            'picture': user_info.get("picture", ""),
            'access_token': credentials.token,
            'refresh_token': credentials.refresh_token,
            'tier': 'estudiante',
        })

    return RedirectResponse(
        f"{settings.FRONTEND_URL}/dashboard?user_id={user_id}&name={user_info.get('name', '')}"
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

@router.get("/logout")
async def logout(user_id: str):
    usuario = obtener_usuario(user_id)
    if usuario:
        guardar_usuario(user_id, {**usuario, 'access_token': None})
    return RedirectResponse(f"{settings.FRONTEND_URL}/login")