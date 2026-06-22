from pydantic import BaseModel, EmailStr
from typing import Optional, List
from enum import Enum
from datetime import datetime

class SubscriptionTier (str, Enum):
    estudiante ="estudiante"
    freelancer="freelancer"
    grupo="grupo"

class User(BaseModel):
    id:str
    email:str
    name:str
    picture: Optional[str]=None
    tier : SubscriptionTier= SubscriptionTier.estudiante
    google_access_token: Optional[str]=None
    google_refresh_token: Optional[str]=None
    created_at: datetime = datetime.now()


class Task(BaseModel):
    id:str
    user_id:str
    title:str
    course: Optional[str]=None
    due_date : Optional[datetime]=None
    completed: bool = False
    submitted: bool = False
    source: str="manual"


class AgentMessage(BaseModel):
    role:str
    content:str
    timestamp: datetime = datetime.now()

class ChatRequest(BaseModel):
    message:str
    ser_id:str

class ChatResponse(BaseModel):
    response:str
    actions_taken: List[str] = []




