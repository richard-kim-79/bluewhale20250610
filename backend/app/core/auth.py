"""
Authentication and authorization utilities for BlueWhale.
"""
import os
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel

from app.db.mongo import mongodb
from app.models.user import UserInDB

# Load environment variables
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "supersecretkey")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 1  # 1 hour
REFRESH_TOKEN_EXPIRE_DAYS = 7  # 7 days

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/token")

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    user_id: str
    username: str
    expires_in: int  # seconds until access token expires

class TokenData(BaseModel):
    username: Optional[str] = None
    user_id: Optional[str] = None
    token_type: Optional[str] = "access"

class RefreshToken(BaseModel):
    id: str
    user_id: str
    token: str
    expires_at: datetime
    created_at: datetime = datetime.utcnow()
    revoked: bool = False
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash a password for storing."""
    return pwd_context.hash(password)

async def get_user(username: str) -> Optional[UserInDB]:
    """Get a user by username from the database."""
    users_collection = mongodb.get_collection("users")
    user_dict = await users_collection.find_one({"username": username})
    if user_dict:
        return UserInDB(**user_dict)
    return None

async def authenticate_user(username: str, password: str) -> Optional[UserInDB]:
    """Authenticate a user by username and password."""
    user = await get_user(username)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def create_refresh_token(user_id: str, username: str, user_agent: Optional[str] = None, ip_address: Optional[str] = None) -> RefreshToken:
    """Create a refresh token and store it in the database."""
    # Generate a secure random token
    import secrets
    token_value = secrets.token_urlsafe(64)
    
    # Create expiration date
    expires_at = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    
    # Create refresh token document
    refresh_token = RefreshToken(
        id=str(uuid.uuid4()),
        user_id=user_id,
        token=token_value,
        expires_at=expires_at,
        user_agent=user_agent,
        ip_address=ip_address
    )
    
    # Store in database
    refresh_tokens_collection = mongodb.get_collection("refresh_tokens")
    await refresh_tokens_collection.insert_one(refresh_token.dict())
    
    return refresh_token

async def get_refresh_token(token: str) -> Optional[RefreshToken]:
    """Get a refresh token from the database."""
    refresh_tokens_collection = mongodb.get_collection("refresh_tokens")
    token_dict = await refresh_tokens_collection.find_one({"token": token, "revoked": False})
    if token_dict:
        return RefreshToken(**token_dict)
    return None

async def revoke_refresh_token(token: str) -> bool:
    """Revoke a refresh token."""
    refresh_tokens_collection = mongodb.get_collection("refresh_tokens")
    result = await refresh_tokens_collection.update_one(
        {"token": token},
        {"$set": {"revoked": True}}
    )
    return result.modified_count > 0

async def revoke_all_user_tokens(user_id: str) -> int:
    """Revoke all refresh tokens for a user."""
    refresh_tokens_collection = mongodb.get_collection("refresh_tokens")
    result = await refresh_tokens_collection.update_many(
        {"user_id": user_id, "revoked": False},
        {"$set": {"revoked": True}}
    )
    return result.modified_count

async def get_current_user(token: str = Depends(oauth2_scheme)) -> UserInDB:
    """Get the current user from a JWT token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        user_id: str = payload.get("user_id")
        token_type: str = payload.get("type", "access")
        
        # Only allow access tokens for authentication
        if token_type != "access":
            raise credentials_exception
            
        if username is None or user_id is None:
            raise credentials_exception
            
        token_data = TokenData(username=username, user_id=user_id, token_type=token_type)
    except JWTError:
        raise credentials_exception
    user = await get_user(username=token_data.username)
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: UserInDB = Depends(get_current_user)) -> UserInDB:
    """Get the current active user."""
    if current_user.disabled:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user
