from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi_csrf_protect import CsrfProtect
import logging
import time
import os

app = FastAPI(
    title="BlueWhale API",
    description="Knowledge management system with vector search capabilities",
    version="1.0.0"
)

# Configure CORS
frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url],  # Only allow the frontend origin
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-CSRF-Token"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("bluewhale")

# Add middleware for request logging and timing
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    # Get client IP
    forwarded = request.headers.get("X-Forwarded-For")
    client_ip = forwarded.split(",")[0].strip() if forwarded else request.client.host
    
    # Log request
    logger.info(f"Request: {request.method} {request.url.path} from {client_ip}")
    
    try:
        response = await call_next(request)
        process_time = time.time() - start_time
        
        # Log response time
        logger.info(f"Response: {request.method} {request.url.path} - Status: {response.status_code} - Time: {process_time:.3f}s")
        
        # Add custom header with processing time
        response.headers["X-Process-Time"] = str(process_time)
        return response
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"}
        )

# Import and include routers
from app.api.routes import upload, search, document, user, auth, mfa
from app.core.limiter import setup_limiter
from app.db.mongo import connect_to_mongo, close_mongo_connection, create_indexes
from app.core.csrf import get_csrf_config  # Import CSRF config

app.include_router(auth.router, prefix="/api/v1", tags=["auth"])
app.include_router(mfa.router, prefix="/api/v1", tags=["mfa"])
app.include_router(upload.router, prefix="/api/v1", tags=["upload"])
app.include_router(search.router, prefix="/api/v1", tags=["search"])
app.include_router(document.router, prefix="/api/v1", tags=["document"])
app.include_router(user.router, prefix="/api/v1", tags=["user"])

# Startup and shutdown events
@app.on_event("startup")
async def startup_event():
    logger.info("Starting BlueWhale API...")
    
    # Connect to MongoDB
    await connect_to_mongo()
    logger.info("Connected to MongoDB")
    
    # Create indexes
    try:
        await create_indexes()
        logger.info("MongoDB indexes created")
    except Exception as e:
        logger.error(f"Failed to create MongoDB indexes: {e}")
    
    # Initialize rate limiter
    limiter_initialized = await setup_limiter()
    if limiter_initialized:
        logger.info("Rate limiter initialized")
    else:
        logger.warning("Failed to initialize rate limiter. Rate limiting will be disabled.")
        
    # Initialize CSRF protection
    try:
        # This will load the CSRF configuration
        get_csrf_config()
        logger.info("CSRF protection initialized")
    except Exception as e:
        logger.error(f"Failed to initialize CSRF protection: {e}")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down BlueWhale API...")
    
    # Close MongoDB connection
    await close_mongo_connection()
    logger.info("MongoDB connection closed")

@app.get("/")
async def root():
    return {"message": "Welcome to BlueWhale API"}


@app.get("/api/v1/csrf-token")
async def get_csrf_token(request: Request, csrf_protect: CsrfProtect = CsrfProtect()):
    """Generate a new CSRF token for the client"""
    csrf_token = csrf_protect.generate_csrf(request)
    return {"csrf_token": csrf_token}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
