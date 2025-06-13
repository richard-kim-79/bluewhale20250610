import os
from pydantic_settings import BaseSettings
from typing import Optional, Dict, Any, List

class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "BlueWhale"
    
    # MongoDB settings
    MONGODB_URL: str = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    MONGODB_DB_NAME: str = os.getenv("MONGODB_DB_NAME", "bluewhale")
    
    # Qdrant settings
    QDRANT_URL: str = os.getenv("QDRANT_URL", "http://localhost:6333")
    QDRANT_API_KEY: Optional[str] = os.getenv("QDRANT_API_KEY")
    QDRANT_COLLECTION_NAME: str = os.getenv("QDRANT_COLLECTION_NAME", "documents")
    VECTOR_SIZE: int = 768  # Default for many embedding models
    
    # Qdrant connection mode (cloud, local, or memory)
    QDRANT_MODE: str = os.getenv("QDRANT_MODE", "memory")  # Options: "cloud", "local", or "memory"
    
    # S3 or Cloudinary settings
    S3_BUCKET_NAME: str = os.getenv("S3_BUCKET_NAME", "bluewhale-documents")
    AWS_ACCESS_KEY_ID: Optional[str] = os.getenv("AWS_ACCESS_KEY_ID")
    AWS_SECRET_ACCESS_KEY: Optional[str] = os.getenv("AWS_SECRET_ACCESS_KEY")
    AWS_REGION: str = os.getenv("AWS_REGION", "us-east-1")
    
    # Redis settings for Celery
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # AI Model settings
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY")
    HUGGINGFACE_API_KEY: Optional[str] = os.getenv("HUGGINGFACE_API_KEY")
    DEEPSEEK_API_KEY: Optional[str] = os.getenv("DEEPSEEK_API_KEY")
    DEFAULT_EMBEDDING_MODEL: str = os.getenv("DEFAULT_EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
    
    # CORS settings
    BACKEND_CORS_ORIGINS: List[str] = ["*"]  # In production, replace with specific origins
    
    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
