from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import model_validator
import logging

logger = logging.getLogger(__name__)

class Settings(BaseSettings):
    APP_ENV: str = "development"
    BACKEND_HOST: str = "127.0.0.1"
    BACKEND_PORT: int = 8000
    FRONTEND_PORT: int = 5173
    
    DATABASE_URL: str = "sqlite:///./voiceguard.db"
    REDIS_URL: str = "redis://localhost:6379"

    SECRET_KEY: str = "super_secret_key_change_in_production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    @model_validator(mode="after")
    def validate_production_secrets(self) -> 'Settings':
        if self.APP_ENV == "production":
            if self.SECRET_KEY == "super_secret_key_change_in_production" or len(self.SECRET_KEY) < 32:
                raise ValueError(
                    "CRITICAL SECURITY VIOLATION: In production mode, SECRET_KEY must be a cryptographically strong, non-default string of at least 32 characters."
                )
        return self

    model_config = SettingsConfigDict(env_file="../.env", env_file_encoding='utf-8', extra='ignore')

settings = Settings()
