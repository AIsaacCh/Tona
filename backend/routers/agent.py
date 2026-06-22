from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def agent_root():
    return {"message": "Tona escucha"}