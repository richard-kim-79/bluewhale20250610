"""
Multi-factor authentication routes for BlueWhale.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from typing import Any

from app.core.auth import get_current_active_user
from app.core.csrf import validate_csrf_token
from app.core.mfa import (
    setup_mfa, enable_mfa, disable_mfa, verify_totp, get_backup_codes,
    is_mfa_enabled, verify_backup_code, MFASetupResponse, MFABackupCodesResponse
)
from app.models.user import UserInDB, MFAVerifyRequest, UserResponse
from app.db.mongo import mongodb

router = APIRouter()


@router.post("/auth/mfa/setup", response_model=MFASetupResponse, dependencies=[Depends(validate_csrf_token)])
async def setup_mfa_route(current_user: UserInDB = Depends(get_current_active_user)) -> Any:
    """
    Set up MFA for the current user.
    """
    # Check if MFA is already enabled
    if await is_mfa_enabled(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA is already enabled"
        )
    
    # Set up MFA
    return await setup_mfa(current_user)


@router.post("/auth/mfa/enable", response_model=UserResponse, dependencies=[Depends(validate_csrf_token)])
async def enable_mfa_route(
    verify_data: MFAVerifyRequest,
    current_user: UserInDB = Depends(get_current_active_user)
) -> Any:
    """
    Enable MFA for the current user after verifying the code.
    """
    # Enable MFA
    if not await enable_mfa(current_user.id, verify_data.code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code"
        )
    
    # Get updated user
    users_collection = mongodb.get_collection("users")
    user_data = await users_collection.find_one({"_id": current_user.id})
    
    return UserResponse(**UserInDB(**user_data).dict())


@router.post("/auth/mfa/disable", response_model=UserResponse, dependencies=[Depends(validate_csrf_token)])
async def disable_mfa_route(
    verify_data: MFAVerifyRequest,
    current_user: UserInDB = Depends(get_current_active_user)
) -> Any:
    """
    Disable MFA for the current user after verifying the code.
    """
    # Verify the code first
    if not await verify_totp(current_user.mfa_secret, verify_data.code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code"
        )
    
    # Disable MFA
    if not await disable_mfa(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to disable MFA"
        )
    
    # Get updated user
    users_collection = mongodb.get_collection("users")
    user_data = await users_collection.find_one({"_id": current_user.id})
    
    return UserResponse(**UserInDB(**user_data).dict())


@router.post("/auth/mfa/verify", dependencies=[Depends(validate_csrf_token)])
async def verify_mfa_route(
    request: Request,
    response: Response,
    verify_data: MFAVerifyRequest,
    current_user: UserInDB = Depends(get_current_active_user)
) -> Any:
    """
    Verify MFA code for the current user.
    """
    # Check if MFA is enabled
    if not current_user.mfa_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA is not enabled"
        )
    
    # Try to verify with TOTP
    if await verify_totp(current_user.mfa_secret, verify_data.code):
        # Set session flag for MFA verification
        request.session[f"mfa_verified_{current_user.id}"] = True
        return {"detail": "MFA verification successful"}
    
    # Try to verify with backup code
    if await verify_backup_code(current_user.id, verify_data.code):
        # Set session flag for MFA verification
        request.session[f"mfa_verified_{current_user.id}"] = True
        return {"detail": "MFA verification successful using backup code"}
    
    # If we get here, verification failed
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Invalid verification code"
    )


@router.post("/auth/mfa/backup-codes", response_model=MFABackupCodesResponse, dependencies=[Depends(validate_csrf_token)])
async def get_backup_codes_route(
    verify_data: MFAVerifyRequest,
    current_user: UserInDB = Depends(get_current_active_user)
) -> Any:
    """
    Generate new backup codes for the current user.
    """
    # Check if MFA is enabled
    if not current_user.mfa_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA is not enabled"
        )
    
    # Verify the code first
    if not await verify_totp(current_user.mfa_secret, verify_data.code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code"
        )
    
    # Generate new backup codes
    backup_codes = await get_backup_codes(current_user.id)
    
    return MFABackupCodesResponse(backup_codes=backup_codes)
