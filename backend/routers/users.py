from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def users_root():
    return {"message": "users ok"}