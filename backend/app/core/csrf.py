from fastapi import Request, Depends
from fastapi_csrf_protect import CsrfProtect
from fastapi_csrf_protect.exceptions import CsrfProtectError
from pydantic import BaseModel
from typing import Optional
import os


class CsrfSettings(BaseModel):
    """CSRF protection settings"""
    secret_key: str = os.environ.get("CSRF_SECRET_KEY", "CSRF_SECRET_KEY_CHANGE_ME_IN_PRODUCTION")
    cookie_samesite: str = "lax"
    cookie_secure: bool = os.environ.get("ENVIRONMENT", "development") == "production"
    cookie_key: str = "csrf_token"  # Changed from cookie_name to cookie_key
    header_name: str = "X-CSRF-Token"
    httponly: bool = True  # Changed from cookie_httponly to httponly
    cookie_domain: Optional[str] = None
    cookie_path: str = "/"
    max_age: int = 3600  # Changed from cookie_max_age to max_age


@CsrfProtect.load_config
def get_csrf_config():
    """Load CSRF configuration"""
    return CsrfSettings()


async def validate_csrf_token(request: Request, csrf_protect: CsrfProtect = Depends()):
    """Validate CSRF token for protected routes"""
    try:
        await csrf_protect.validate_csrf(request)
    except CsrfProtectError as e:
        # Log the CSRF validation error
        print(f"CSRF validation error: {str(e)}")
        raise
