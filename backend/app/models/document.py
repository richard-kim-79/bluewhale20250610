from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime
import uuid

class DocumentBase(BaseModel):
    title: str
    summary: Optional[str] = None
    tags: Optional[List[str]] = []
    original_text: Optional[str] = None
    file_type: Optional[str] = None
    
class DocumentCreate(DocumentBase):
    user_id: Optional[str] = None
    s3_url: Optional[str] = None
    qdrant_id: Optional[str] = None

class DocumentInDB(DocumentBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None
    s3_url: Optional[str] = None
    qdrant_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    ai_citation_count: int = 0
    trust_score: float = 0.0
    processing_status: Literal["pending", "processing", "completed", "failed"] = "pending"
    processing_error: Optional[str] = None
    last_processed: Optional[datetime] = None
    
class DocumentResponse(DocumentInDB):
    pass

class DocumentSearchResult(BaseModel):
    id: str
    title: str
    summary: str
    url: Optional[str] = None
    embedding_similarity: float
    tags: List[str] = []
    ai_citation_count: int = 0
    trust_score: float = 0.0

class DocumentSearchResponse(BaseModel):
    results: List[DocumentSearchResult]
    
class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    tags: Optional[List[str]] = None
    ai_citation_count: Optional[int] = None
    trust_score: Optional[float] = None
    processing_status: Optional[Literal["pending", "processing", "completed", "failed"]] = None
    processing_error: Optional[str] = None
