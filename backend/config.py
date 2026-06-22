from pydantic_settings import BaseSettings
from typing import Optional 

class Settings(BaseSettings):

    GEMINI_API_KEY: str

    ELASTIC_URL: str
    ELASTIC_API_KEY: str

    GOOGLE_CLIENT_ID : str
    GOOGLE_CLIENT_SECRET : str
    GOOGLE_REDIRECT_URI : str = "http://localhost:8000/auth/callback"

    SECRET_KEY : str
    FRONTEND_URL : str= "http://localhost:5173"
    ENVIROMENT : str ="development"

    class Config:
        env_file = ".env"

settings = Settings()






