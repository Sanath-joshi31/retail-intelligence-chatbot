from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
import os

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    PORT: int = 8000
    HOST: str = "0.0.0.0"
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"
    
    API_KEY: str = "retail-intelligence-ai-secret-key"
    CORS_ORIGINS: str = "http://localhost:5000,http://localhost:5173,http://localhost:3000"
    
    OPENAI_API_KEY: str = ""
    LLM_MODEL: str = "gpt-4o-mini"
    LLM_TEMPERATURE: float = 0.2
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    
    MONGODB_URI: str = "mongodb://127.0.0.1:27017/retail-intelligence"
    MONGODB_DB_NAME: str = "retail-intelligence"
    
    NODE_BACKEND_URL: str = "http://localhost:5000/api"

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

settings = Settings()
