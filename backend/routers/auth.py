from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse
from google_auth_oauthlib.flow import Flow
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from config import settings
import httpx, os

router = APIRouter()

SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/classroom.courses.readonly",
    "https://www.googleapis.com/auth/classroom.coursework.me",
    "https://www.googleapis.com/auth/gmail.send",
]

flow_store = {}

def create_flow():
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
    flow = create_flow()
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
        raise HTTPException(status_code=400, detail="Estado inválido")

    flow.fetch_token(code=code)
    credentials = flow.credentials

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {credentials.token}"}
        )
    user_info = resp.json()

    del flow_store[state]

    # Por ahora redirigimos al dashboard con info básica
    name = user_info.get("name", "")
    email = user_info.get("email", "")
    
    return RedirectResponse(
        f"{settings.FRONTEND_URL}/dashboard?name={name}&email={email}"
    )

@router.get("/me")
async def get_me():
    return {"message": "endpoint de usuario autenticado — próximo paso"}