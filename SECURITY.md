# BlueWhale Security Enhancements

This document outlines the security enhancements implemented in the BlueWhale application, focusing on multi-factor authentication (MFA), refresh token rotation, and rate limiting.

## Authentication Security Features

### Multi-Factor Authentication (MFA)

BlueWhale implements a robust Time-based One-Time Password (TOTP) multi-factor authentication system:

#### Implementation Details

- **TOTP Standard**: Implements RFC 6238 (TOTP) with SHA-256 hashing algorithm
- **QR Code Generation**: Secure QR code generation for easy setup with authenticator apps
- **Backup Codes**: 10 one-time use backup codes generated for account recovery
- **Progressive Enhancement**: MFA is optional but strongly encouraged for all users
- **Secure Storage**: MFA secrets are encrypted at rest in the database
- **Rate Limiting**: MFA verification attempts are rate-limited to prevent brute force attacks

#### User Experience

- **Streamlined Setup**: Simple step-by-step MFA activation process
- **Clear Instructions**: Detailed guidance for using authenticator apps
- **Recovery Options**: Backup codes provided during setup with option to regenerate
- **Session Persistence**: Option to trust devices for 30 days (configurable)

#### Testing Approach

- **Automated Testing**: Comprehensive test suite covering all MFA flows
- **Mock Implementations**: Tests use mock clients to avoid dependencies on real TOTP generation
- **Edge Cases**: Tests cover backup code usage, invalid codes, and rate limiting
- **CI/CD Integration**: MFA tests run automatically in the CI/CD pipeline
- **Security Auditing**: Regular security reviews of MFA implementation

### Refresh Token Rotation

We've implemented a secure refresh token rotation system with the following features:

- **HttpOnly Cookies**: Both access and refresh tokens are stored in HttpOnly cookies to prevent XSS attacks
- **Token Rotation**: Refresh tokens are rotated on each use, invalidating previous tokens
- **Metadata Tracking**: Each refresh token stores metadata (user agent, IP address) for session management
- **Revocation**: Tokens can be revoked individually or globally for a user
- **Session Management**: Users can view and manage their active sessions

### Rate Limiting

Rate limiting has been implemented on sensitive authentication endpoints:

- `/auth/register`: Limited to 5 requests per hour per IP address
- `/auth/token` (login): Limited to 10 requests per minute per IP address
- `/auth/refresh`: Limited to 30 requests per minute per IP address

Rate limiting is implemented using `fastapi-limiter` with Redis as the backend.

## Backend Implementation Details

### Core Authentication Module

The core authentication module (`app/core/auth.py`) has been extended with:

- Functions to create, validate, and revoke refresh tokens
- Token type validation to distinguish between access and refresh tokens
- Metadata storage for refresh tokens

### MongoDB Integration

- TTL index for automatic cleanup of expired refresh tokens
- Unique indexes for user identification
- Refresh token collection with revocation status

### API Routes

New authentication endpoints:

- `/auth/token`: Issues access and refresh tokens as HttpOnly cookies
- `/auth/refresh`: Refreshes access token using refresh token from cookies
- `/auth/logout`: Revokes current refresh token and clears cookies
- `/auth/logout/all`: Revokes all refresh tokens for the current user
- `/auth/sessions`: Lists active sessions for the current user

## Frontend Implementation Details

### API Client

The API client (`frontend/lib/api.ts`) has been updated to:

- Use Axios with `withCredentials: true` to support HttpOnly cookies
- Implement automatic token refresh logic on 401 responses
- Queue requests during token refresh to avoid multiple refresh calls
- Handle logout by calling backend endpoints to revoke tokens

### User Interface

- Added session management UI to view and manage active sessions
- Implemented account security page for password changes and session management
- Added global logout functionality

## Security Best Practices

- Access tokens are short-lived (1 hour)
- Refresh tokens have a longer but limited lifetime (7 days)
- Passwords are validated with minimum length requirements
- Current password verification required for sensitive operations
- Rate limiting protects against brute force attacks

## CSRF Protection

Cross-Site Request Forgery (CSRF) protection has been implemented with the following features:

- CSRF tokens are generated server-side and sent to the client
- Tokens are stored in cookies with appropriate security settings (HttpOnly, SameSite)
- All sensitive operations (register, logout, profile updates) require a valid CSRF token
- The frontend automatically fetches and includes CSRF tokens in all non-GET requests
- Dedicated endpoint `/api/v1/csrf-token` for refreshing CSRF tokens

## Multi-Factor Authentication (MFA)

BlueWhale now supports Multi-Factor Authentication (MFA) to provide an additional layer of security:

### MFA Features

- **Time-based One-Time Password (TOTP)**: Compatible with standard authenticator apps like Google Authenticator, Authy, and Microsoft Authenticator
- **QR Code Setup**: Easy setup via QR code scanning
- **Backup Codes**: Generation of one-time use backup codes for account recovery
- **Optional Enrollment**: Users can enable or disable MFA from their profile settings
- **Secure Storage**: MFA secrets are stored securely using encryption

### MFA API Endpoints

- `/api/v1/auth/mfa/setup`: Generates MFA secret and QR code for setup
- `/api/v1/auth/mfa/enable`: Activates MFA after verification
- `/api/v1/auth/mfa/disable`: Deactivates MFA after verification
- `/api/v1/auth/mfa/verify`: Verifies MFA code during login
- `/api/v1/auth/mfa/backup-codes`: Generates or retrieves backup codes

### MFA Login Flow

1. User enters username and password
2. If MFA is enabled, the system returns a special response indicating MFA is required
3. User enters TOTP code from authenticator app or uses a backup code
4. Upon successful verification, the user is granted access

### MFA User Interface

- **MFA Setup**: Guided setup process with QR code display and verification
- **MFA Verification**: During login when MFA is required
- **MFA Settings**: Management interface in user profile for enabling/disabling MFA and generating backup codes

## Future Security Enhancements

Planned security improvements:

- Audit logging for authentication events
- IP-based anomaly detection
- Account lockout after failed attempts

## Configuration

The security features require the following environment variables:

```
# JWT Configuration
JWT_SECRET_KEY=your_jwt_secret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7

# Redis Configuration (for rate limiting)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=optional_password

# MongoDB Configuration
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB_NAME=bluewhale
```

## Testing

To test the security features:

1. Login to obtain HttpOnly cookies
2. Verify token refresh works automatically
3. Test session management by logging in from different browsers
4. Verify rate limiting by making rapid requests to protected endpoints
5. Test global logout functionality
