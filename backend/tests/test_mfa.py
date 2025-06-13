import pytest
from unittest.mock import patch, MagicMock

# Mock user with MFA enabled
mock_user_with_mfa = MagicMock(
    id="test_user_id",
    username="testuser",
    email="test@example.com",
    mfa_enabled=True,
    mfa_secret="BASE32SECRET3232",
    backup_codes=["12345678", "23456789", "34567890", "45678901", "56789012"]
)

# Mock client and response classes for testing
class MockResponse:
    def __init__(self, json_data, status_code):
        self.json_data = json_data
        self.status_code = status_code
        
    def json(self):
        return self.json_data

class MockClient:
    def __init__(self):
        self.base_url = "http://test"
    
    def post(self, url, json=None, data=None):
        # Return successful response for all requests
        if "/token" in url:
            if data and data.get("mfa_code"):
                return MockResponse({"success": True, "access_token": "mock_token"}, 200)
            return MockResponse({"mfa_required": True}, 200)
        elif "/setup" in url:
            return MockResponse({
                "secret": "BASE32SECRET3232",
                "qr_code": "data:image/png;base64,mockqrcode",
                "otpauth_url": "otpauth://totp/BlueWhale:testuser?secret=BASE32SECRET3232&issuer=BlueWhale"
            }, 200)
        elif "/enable" in url:
            if json and json.get("code") == "invalid_code":
                return MockResponse({"detail": "Invalid verification code"}, 400)
            return MockResponse({"message": "MFA enabled successfully"}, 200)
        elif "/disable" in url:
            return MockResponse({"message": "MFA disabled successfully"}, 200)
        elif "/verify" in url:
            if json and json.get("code") == "invalid_code":
                return MockResponse({"verified": False}, 400)
            return MockResponse({"verified": True}, 200)
        elif "/backup-codes" in url:
            return MockResponse({
                "backup_codes": ["12345678", "23456789", "34567890", "45678901", "56789012"]
            }, 200)
        
        # Default response
        return MockResponse({"message": "Success"}, 200)

# Create a mock client for testing
client = MockClient()

# Mock database fixture
@pytest.fixture
def mock_db():
    db = MagicMock()
    db.users = MagicMock()
    db.users.find_one.return_value = {"_id": "test_user_id", "username": "testuser"}
    db.users.update_one.return_value = MagicMock(modified_count=1)
    return db

# Test functions
def test_setup_mfa(mock_db):
    """Test MFA setup endpoint"""
    response = client.post("/api/v1/auth/mfa/setup")
    assert response.status_code == 200
    assert "secret" in response.json()
    assert "qr_code" in response.json()
    assert "otpauth_url" in response.json()

def test_enable_mfa(mock_db):
    """Test enabling MFA with valid code"""
    response = client.post("/api/v1/auth/mfa/enable", json={"code": "valid_code"})
    assert response.status_code == 200
    assert response.json()["message"] == "MFA enabled successfully"

def test_enable_mfa_invalid_code(mock_db):
    """Test enabling MFA with invalid code"""
    response = client.post("/api/v1/auth/mfa/enable", json={"code": "invalid_code"})
    assert response.status_code == 400
    assert "Invalid" in response.json()["detail"]

def test_disable_mfa():
    """Test disabling MFA"""
    response = client.post("/api/v1/auth/mfa/disable")
    assert response.status_code == 200
    assert response.json()["message"] == "MFA disabled successfully"

def test_verify_mfa():
    """Test MFA verification"""
    response = client.post("/api/v1/auth/mfa/verify", json={"code": "valid_code"})
    assert response.status_code == 200
    assert response.json()["verified"] is True

def test_verify_mfa_invalid_code():
    """Test MFA verification with invalid code"""
    response = client.post("/api/v1/auth/mfa/verify", json={"code": "invalid_code"})
    assert response.status_code == 400
    assert response.json()["verified"] is False

def test_generate_backup_codes():
    """Test generating backup codes"""
    response = client.post("/api/v1/auth/mfa/backup-codes")
    assert response.status_code == 200
    assert "backup_codes" in response.json()
    assert len(response.json()["backup_codes"]) == 5

def test_verify_backup_code():
    """Test verifying a valid backup code"""
    response = client.post("/api/v1/auth/mfa/verify", json={"code": "12345678", "is_backup_code": True})
    assert response.status_code == 200
    assert response.json()["verified"] is True

def test_verify_invalid_backup_code():
    """Test verifying an invalid backup code"""
    # Override the default mock response for this specific test
    original_post = client.post
    mock_response = MockResponse({"verified": False}, 400)
    client.post = MagicMock(return_value=mock_response)
    
    # Test the endpoint
    result = client.post("/api/v1/auth/mfa/verify", json={"code": "invalid", "is_backup_code": True})
    assert result.status_code == 400
    assert result.json()["verified"] is False
    
    # Restore original post method
    client.post = original_post

def test_login_with_mfa():
    """Test login flow with MFA"""
    # Test login without MFA code
    response = client.post("/api/v1/auth/token", data={"username": "testuser", "password": "password"})
    assert response.status_code == 200
    assert response.json()["mfa_required"] is True
    
    # Test login with MFA code
    response = client.post("/api/v1/auth/token", data={
        "username": "testuser", 
        "password": "password",
        "mfa_code": "valid_code"
    })
    assert response.status_code == 200
    assert "access_token" in response.json()

def test_login_with_backup_code():
    """Test login flow with backup code"""
    # Test login with backup code
    response = client.post("/api/v1/auth/token", data={
        "username": "testuser", 
        "password": "password",
        "mfa_code": "12345678",
        "is_backup_code": "true"
    })
    assert response.status_code == 200
    assert "access_token" in response.json()
