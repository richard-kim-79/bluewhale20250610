"""
Rate limiting configuration for BlueWhale.
"""
import os
from fastapi import Request, HTTPException, status
from fastapi_limiter import FastAPILimiter
from fastapi_limiter.depends import RateLimiter
import redis.asyncio as redis

# Rate limiting configurations
LOGIN_RATE_LIMIT = "5/minute"  # 5 attempts per minute
REGISTER_RATE_LIMIT = "3/hour"  # 3 attempts per hour
PASSWORD_RESET_RATE_LIMIT = "3/hour"  # 3 attempts per hour
REFRESH_TOKEN_RATE_LIMIT = "10/minute"  # 10 attempts per minute

# Redis configuration
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
REDIS_DB = int(os.getenv("REDIS_DB", "0"))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", None)

async def setup_limiter():
    """Initialize the rate limiter with Redis."""
    try:
        redis_url = f"redis://{REDIS_HOST}:{REDIS_PORT}/{REDIS_DB}"
        if REDIS_PASSWORD:
            redis_url = f"redis://:{REDIS_PASSWORD}@{REDIS_HOST}:{REDIS_PORT}/{REDIS_DB}"
            
        redis_instance = redis.from_url(redis_url)
        await FastAPILimiter.init(redis_instance)
        return True
    except Exception as e:
        print(f"Failed to initialize rate limiter: {e}")
        return False

# Custom rate limiters for different endpoints
login_limiter = RateLimiter(times=5, seconds=60)  # 5 requests per minute
register_limiter = RateLimiter(times=3, seconds=3600)  # 3 requests per hour
password_reset_limiter = RateLimiter(times=3, seconds=3600)  # 3 requests per hour
refresh_token_limiter = RateLimiter(times=10, seconds=60)  # 10 requests per minute

# Helper function to get client IP for rate limiting
def get_client_ip(request: Request) -> str:
    """Get client IP address from request."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"

# Custom rate limiter that uses IP address as key
class IPRateLimiter:
    def __init__(self, times: int, seconds: int):
        self.times = times
        self.seconds = seconds
    
    async def __call__(self, request: Request):
        # Use client IP as key for rate limiting
        key = f"rate-limit:{get_client_ip(request)}"
        
        if not FastAPILimiter.redis:
            return
        
        # Check if rate limit is exceeded
        pipe = FastAPILimiter.redis.pipeline()
        now = await FastAPILimiter.redis.time()
        now = int(now[0])
        
        # Add current timestamp to sorted set
        await pipe.zadd(key, {now: now})
        
        # Remove timestamps outside the window
        await pipe.zremrangebyscore(key, 0, now - self.seconds)
        
        # Count timestamps in the window
        await pipe.zcard(key)
        
        # Set key expiration
        await pipe.expire(key, self.seconds)
        
        # Execute pipeline
        results = await pipe.execute()
        count = results[2]
        
        # If count exceeds limit, raise exception
        if count > self.times:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Try again in {self.seconds} seconds."
            )

# Create IP-based rate limiters
ip_login_limiter = IPRateLimiter(times=5, seconds=60)
ip_register_limiter = IPRateLimiter(times=3, seconds=3600)
ip_password_reset_limiter = IPRateLimiter(times=3, seconds=3600)
ip_refresh_token_limiter = IPRateLimiter(times=10, seconds=60)
