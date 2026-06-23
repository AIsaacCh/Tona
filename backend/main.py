from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings 
from routers import auth, agent, tasks, users
from services.db import init_db


app= FastAPI(
    title="Tona API",
    description="backend de asistente M",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(agent.router, prefix="/agent", tags=["agent"])
app.include_router(tasks.router, prefix="/tasks", tags=["tasks"])
app.include_router(users.router, prefix="/users", tags=["users"])


@app.get("/")
async def root():
    return {"message": "despierto", "status": "Ok"}

@app.get("/health")
async def health():
    return {"message": "Healthy", "environment": settings.ENVIRONMENT}

