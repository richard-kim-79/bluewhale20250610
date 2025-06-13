"""
Authentication routes for BlueWhale.
"""
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.security import OAuth2PasswordRequestForm
from fastapi_csrf_protect import CsrfProtect
from typing import Any, List, Dict, Optional
import uuid
from datetime import datetime

from app.core.csrf import validate_csrf_token
from app.core.mfa import is_mfa_enabled, verify_totp, verify_backup_code

from app.core.limiter import ip_login_limiter, ip_register_limiter, ip_refresh_token_limiter

from app.core.auth import (
    authenticate_user, create_access_token, get_password_hash, verify_password,
    ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_DAYS, Token, get_current_active_user,
    create_refresh_token, get_refresh_token, revoke_refresh_token, revoke_all_user_tokens, RefreshToken
)
from app.db.mongo import mongodb
from app.models.user import UserCreate, UserInDB, UserResponse, UserProfileUpdate

router = APIRouter()

@router.post("/auth/register", response_model=UserResponse, dependencies=[Depends(validate_csrf_token)])
async def register_user(user_data: UserCreate, request: Request) -> Any:
    # Apply rate limiting
    await ip_register_limiter(request)
    """
    Register a new user.
    """
    users_collection = mongodb.get_collection("users")
    
    # Check if username already exists
    existing_user = await users_collection.find_one({"username": user_data.username})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Check if email already exists
    if user_data.email:
        existing_email = await users_collection.find_one({"email": user_data.email})
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    user_in_db = UserInDB(
        **user_data.dict(exclude={"password"}),
        hashed_password=hashed_password
    )
    
    # Save user to database
    await users_collection.insert_one(user_in_db.dict())
    
    # Return user data without password
    return UserResponse(**user_in_db.dict())

@router.post("/auth/token")
async def login_for_access_token(
    response: Response, 
    request: Request, 
    form_data: OAuth2PasswordRequestForm = Depends(),
    mfa_code: Optional[str] = None
) -> Any:
    # Apply rate limiting
    await ip_login_limiter(request)
    """
    OAuth2 compatible token login, get an access token for future requests.
    Sets HttpOnly cookies for both access and refresh tokens.
    """
    user = await authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if MFA is enabled for this user
    mfa_enabled = await is_mfa_enabled(user.id)
    
    # If MFA is enabled, verify the code
    if mfa_enabled:
        # If no MFA code provided, return a special response indicating MFA is required
        if not mfa_code:
            return {
                "detail": "MFA verification required",
                "mfa_required": True,
                "username": user.username
            }
        
        # Verify the MFA code
        if not await verify_totp(user.mfa_secret, mfa_code) and not await verify_backup_code(user.id, mfa_code):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid MFA code",
                headers={"WWW-Authenticate": "Bearer"},
            )
    
    # Update last login time
    users_collection = mongodb.get_collection("users")
    await users_collection.update_one(
        {"username": user.username},
        {"$set": {"last_login": user.dict()["created_at"]}}
    )
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "user_id": user.id},
        expires_delta=access_token_expires
    )
    
    # Get client info for the refresh token
    user_agent = request.headers.get("user-agent", "")
    client_host = request.client.host if request.client else ""
    
    # Create refresh token
    refresh_token_obj = await create_refresh_token(
        user_id=user.id,
        username=user.username,
        user_agent=user_agent,
        ip_address=client_host
    )
    
    # Set cookies
    response.set_cookie(
        key="access_token",
        value=f"Bearer {access_token}",
        httponly=True,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        expires=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
        secure=True,  # Set to False in development if not using HTTPS
        path="/"
    )
    
    response.set_cookie(
        key="refresh_token",
        value=refresh_token_obj.token,
        httponly=True,
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        expires=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        samesite="lax",
        secure=True,  # Set to False in development if not using HTTPS
        path="/"
    )
    
    # Return the tokens in the response body as well for API clients
    return {
        "access_token": access_token,
        "refresh_token": refresh_token_obj.token,
        "token_type": "bearer",
        "user_id": user.id,
        "username": user.username,
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60  # seconds
    }

@router.get("/auth/me", response_model=UserResponse)
async def read_users_me(current_user: UserInDB = Depends(get_current_active_user)) -> Any:
    """
    Get current user.
    """
    return UserResponse(**current_user.dict())

@router.post("/auth/refresh")
async def refresh_access_token(response: Response, request: Request) -> Any:
    # Apply rate limiting
    await ip_refresh_token_limiter(request)
    """
    Get a new access token using a refresh token.
    """
    # Get refresh token from cookie
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Validate refresh token
    token_obj = await get_refresh_token(refresh_token)
    if not token_obj or token_obj.revoked:
        # Clear invalid cookies
        response.delete_cookie(key="access_token", path="/")
        response.delete_cookie(key="refresh_token", path="/")
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if token is expired
    if token_obj.expires_at < datetime.utcnow():
        # Revoke expired token
        await revoke_refresh_token(refresh_token)
        
        # Clear expired cookies
        response.delete_cookie(key="access_token", path="/")
        response.delete_cookie(key="refresh_token", path="/")
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get user
    users_collection = mongodb.get_collection("users")
    user_dict = await users_collection.find_one({"_id": token_obj.user_id})
    if not user_dict:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = UserInDB(**user_dict)
    
    # Create new access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "user_id": user.id},
        expires_delta=access_token_expires
    )
    
    # Set new access token cookie
    response.set_cookie(
        key="access_token",
        value=f"Bearer {access_token}",
        httponly=True,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        expires=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
        secure=True,  # Set to False in development if not using HTTPS
        path="/"
    )
    
    # Return the new access token
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user.id,
        "username": user.username,
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60  # seconds
    }

@router.post("/auth/logout", dependencies=[Depends(validate_csrf_token)])
async def logout(response: Response, request: Request) -> Any:
    """
    Logout user by revoking refresh token and clearing cookies.
    """
    # Get refresh token from cookie
    refresh_token = request.cookies.get("refresh_token")
    
    # Revoke refresh token if it exists
    if refresh_token:
        await revoke_refresh_token(refresh_token)
    
    # Clear cookies
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/")
    
    return {"detail": "Successfully logged out"}

@router.post("/auth/logout/all", dependencies=[Depends(validate_csrf_token)])
async def logout_all_devices(response: Response, current_user: UserInDB = Depends(get_current_active_user)) -> Any:
    """
    Logout from all devices by revoking all refresh tokens for the user.
    """
    # Revoke all refresh tokens for the user
    revoked_count = await revoke_all_user_tokens(current_user.id)
    
    # Clear cookies for current device
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/")
    
    return {"detail": f"Successfully logged out from all devices. Revoked {revoked_count} sessions."}

@router.get("/auth/sessions", response_model=List[dict])
async def get_active_sessions(current_user: UserInDB = Depends(get_current_active_user)) -> Any:
    """
    Get all active sessions for the current user.
    """
    refresh_tokens_collection = mongodb.get_collection("refresh_tokens")
    cursor = refresh_tokens_collection.find(
        {"user_id": current_user.id, "revoked": False},
        {"_id": 0, "token": 0}  # Exclude sensitive fields
    )
    
    sessions = await cursor.to_list(length=100)
    return sessions

@router.put("/auth/me", response_model=UserResponse, dependencies=[Depends(validate_csrf_token)])
async def update_user_profile(profile_data: UserProfileUpdate, current_user: UserInDB = Depends(get_current_active_user)) -> Any:
    """
    Update current user profile.
    """
    users_collection = mongodb.get_collection("users")
    update_data = {}
    
    # Handle email update
    if profile_data.email and profile_data.email != current_user.email:
        # Check if email is already used by another user
        existing_email = await users_collection.find_one({"email": profile_data.email, "_id": {"$ne": current_user.id}})
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        update_data["email"] = profile_data.email
    
    # Handle full name update
    if profile_data.full_name is not None:
        update_data["full_name"] = profile_data.full_name
    
    # Handle password update
    if profile_data.password:
        # Verify current password before allowing password change
        if not profile_data.current_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is required to change password"
            )
            
        if not verify_password(profile_data.current_password, current_user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Incorrect current password"
            )
            
        update_data["hashed_password"] = get_password_hash(profile_data.password)
    
    # Update user in database if there are changes
    if update_data:
        await users_collection.update_one(
            {"_id": current_user.id},
            {"$set": update_data}
        )
        
        # Get updated user data
        updated_user = await users_collection.find_one({"_id": current_user.id})
        if not updated_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
            
        return UserResponse(**UserInDB(**updated_user).dict())
    
    # If no changes, return current user
    return UserResponse(**current_user.dict())
