from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from routers import auth, agent, tasks, users,docs
from services.db import init_db
from services.scheduler import iniciar_scheduler, detener_scheduler
import contextlib



@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    iniciar_scheduler()
    yield
    detener_scheduler()

app = FastAPI(
    title="Tona API",
    description="Tu nagual digital — Backend",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(agent.router, prefix="/agent", tags=["agent"])
app.include_router(tasks.router, prefix="/tasks", tags=["tasks"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(docs.router, prefix="/docs", tags=["docs"])

@app.get("/")
async def root():
    return {"message": "Tona despierta", "status": "ok"}

@app.get("/health")
async def health():
    return {"status": "healthy", "environment": settings.ENVIRONMENT}