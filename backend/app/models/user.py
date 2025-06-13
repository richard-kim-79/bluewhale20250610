from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any, Union
from datetime import datetime
import uuid

class UserBase(BaseModel):
    username: str
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    disabled: bool = False
    
class UserCreate(UserBase):
    password: str

class UserInDB(UserBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    hashed_password: str
    role: str = "user"  # user, admin
    preferences: Dict[str, Any] = Field(default_factory=dict)
    last_login: Optional[datetime] = None
    # MFA fields
    mfa_enabled: bool = False
    mfa_secret: Optional[str] = None
    mfa_backup_codes: Optional[List[str]] = None
    mfa_setup_time: Optional[datetime] = None
    
class UserResponse(BaseModel):
    id: str
    username: str
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    disabled: bool = False
    created_at: datetime
    role: str
    last_login: Optional[datetime] = None
    mfa_enabled: bool = False

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None

class UserProfileUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    current_password: Optional[str] = None


class MFAVerifyRequest(BaseModel):
    code: str


class MFASetupResponse(BaseModel):
    secret: str
    qr_code: str  # Base64 encoded QR code image
    uri: str  # OTP Auth URI


class MFABackupCodesResponse(BaseModel):
    backup_codes: List[str]

class UserSimilarity(BaseModel):
    id: str
    username: str
    similarity_score: float
    
class UserRecommendation(BaseModel):
    similar_users: List[UserSimilarity]
