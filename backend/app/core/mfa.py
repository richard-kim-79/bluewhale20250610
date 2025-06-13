"""
Multi-factor authentication module for BlueWhale.
"""
import pyotp
import qrcode
import base64
import io
from typing import Tuple, Dict, Any, Optional
from datetime import datetime, timedelta
from fastapi import HTTPException, status, Request, Depends
from pydantic import BaseModel

from app.db.mongo import mongodb
from app.models.user import UserInDB
from app.core.auth import get_current_user


class MFASetupResponse(BaseModel):
    """Response model for MFA setup"""
    secret: str
    qr_code: str  # Base64 encoded QR code image
    uri: str  # OTP Auth URI


class MFAVerifyRequest(BaseModel):
    """Request model for MFA verification"""
    code: str


class MFABackupCodesResponse(BaseModel):
    """Response model for MFA backup codes"""
    backup_codes: list[str]


async def generate_totp_secret() -> str:
    """Generate a new TOTP secret"""
    return pyotp.random_base32()


async def generate_totp_uri(secret: str, username: str, issuer: str = "BlueWhale") -> str:
    """Generate a TOTP URI for QR code generation"""
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(name=username, issuer_name=issuer)


async def generate_qr_code(uri: str) -> str:
    """Generate a QR code image from a URI and return as base64"""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(uri)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert PIL image to base64 string
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    return base64.b64encode(buffered.getvalue()).decode()


async def verify_totp(secret: str, code: str) -> bool:
    """Verify a TOTP code against a secret"""
    totp = pyotp.TOTP(secret)
    return totp.verify(code)


async def generate_backup_codes() -> list[str]:
    """Generate a set of backup codes for MFA recovery"""
    # Generate 10 random backup codes
    codes = []
    for _ in range(10):
        # Generate an 8-character alphanumeric code
        code = pyotp.random_base32(8)
        # Format as XXXX-XXXX for readability
        formatted_code = f"{code[:4]}-{code[4:8]}"
        codes.append(formatted_code)
    
    return codes


async def hash_backup_codes(codes: list[str]) -> list[str]:
    """Hash backup codes for secure storage"""
    from app.core.auth import get_password_hash
    
    # Hash each code
    return [get_password_hash(code) for code in codes]


async def verify_backup_code(user_id: str, code: str) -> bool:
    """Verify a backup code for a user"""
    from app.core.auth import verify_password
    
    users_collection = mongodb.get_collection("users")
    user = await users_collection.find_one({"_id": user_id})
    
    if not user or not user.get("mfa_backup_codes"):
        return False
    
    # Check if the code matches any of the hashed backup codes
    for hashed_code in user["mfa_backup_codes"]:
        if verify_password(code, hashed_code):
            # Remove the used backup code
            await users_collection.update_one(
                {"_id": user_id},
                {"$pull": {"mfa_backup_codes": hashed_code}}
            )
            return True
    
    return False


async def is_mfa_enabled(user_id: str) -> bool:
    """Check if MFA is enabled for a user"""
    users_collection = mongodb.get_collection("users")
    user = await users_collection.find_one({"_id": user_id})
    
    return user is not None and user.get("mfa_enabled", False)


async def get_mfa_secret(user_id: str) -> Optional[str]:
    """Get the MFA secret for a user"""
    users_collection = mongodb.get_collection("users")
    user = await users_collection.find_one({"_id": user_id})
    
    return user.get("mfa_secret") if user else None


async def setup_mfa(user: UserInDB) -> MFASetupResponse:
    """Set up MFA for a user"""
    # Generate a new TOTP secret
    secret = await generate_totp_secret()
    
    # Generate the TOTP URI
    uri = await generate_totp_uri(secret, user.username)
    
    # Generate QR code
    qr_code = await generate_qr_code(uri)
    
    # Generate backup codes
    backup_codes = await generate_backup_codes()
    hashed_backup_codes = await hash_backup_codes(backup_codes)
    
    # Store the secret and backup codes in the database
    users_collection = mongodb.get_collection("users")
    await users_collection.update_one(
        {"_id": user.id},
        {
            "$set": {
                "mfa_secret": secret,
                "mfa_backup_codes": hashed_backup_codes,
                "mfa_setup_time": datetime.utcnow(),
                # MFA is not enabled until verified
                "mfa_enabled": False
            }
        }
    )
    
    return MFASetupResponse(
        secret=secret,
        qr_code=qr_code,
        uri=uri
    )


async def enable_mfa(user_id: str, code: str) -> bool:
    """Enable MFA for a user after verifying the code"""
    users_collection = mongodb.get_collection("users")
    user = await users_collection.find_one({"_id": user_id})
    
    if not user or not user.get("mfa_secret"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA setup not initiated"
        )
    
    # Verify the code
    if not await verify_totp(user["mfa_secret"], code):
        return False
    
    # Enable MFA
    await users_collection.update_one(
        {"_id": user_id},
        {"$set": {"mfa_enabled": True}}
    )
    
    return True


async def disable_mfa(user_id: str) -> bool:
    """Disable MFA for a user"""
    users_collection = mongodb.get_collection("users")
    
    # Remove MFA data
    result = await users_collection.update_one(
        {"_id": user_id},
        {
            "$set": {"mfa_enabled": False},
            "$unset": {
                "mfa_secret": "",
                "mfa_backup_codes": "",
                "mfa_setup_time": ""
            }
        }
    )
    
    return result.modified_count > 0


async def get_backup_codes(user_id: str) -> list[str]:
    """Generate new backup codes for a user"""
    users_collection = mongodb.get_collection("users")
    
    # Generate new backup codes
    backup_codes = await generate_backup_codes()
    hashed_backup_codes = await hash_backup_codes(backup_codes)
    
    # Update backup codes in the database
    await users_collection.update_one(
        {"_id": user_id},
        {"$set": {"mfa_backup_codes": hashed_backup_codes}}
    )
    
    return backup_codes


async def require_mfa(request: Request, user: UserInDB = Depends(get_current_user)) -> UserInDB:
    """Middleware to require MFA verification for protected routes"""
    # Check if MFA is enabled for the user
    if not await is_mfa_enabled(user.id):
        return user
    
    # Check if the user has completed MFA verification for this session
    mfa_verified = request.session.get(f"mfa_verified_{user.id}", False)
    if mfa_verified:
        return user
    
    # If MFA is enabled but not verified for this session, raise an exception
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="MFA verification required",
        headers={"X-MFA-Required": "true"}
    )
