from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def tasks_root():
    return {"message": "tasks ok"}