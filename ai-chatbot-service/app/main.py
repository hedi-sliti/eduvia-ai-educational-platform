from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.logging import get_logger
from app.core.exceptions import EduviaException, global_exception_handler, eduvia_exception_handler
from app.core.database import init_database
from app.core.validation import validate_environment
from app.api.endpoints import chat, knowledge, assessment, sessions, pdf

logger = get_logger()

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    description="AI Chatbot service for Eduvia educational platform"
)

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    logger.info("Starting Eduvia AI Chatbot Service...")
    
    # Validate configuration
    if not validate_environment():
        logger.error("Configuration validation failed. Some features may not work correctly.")
    
    try:
        init_database()
        logger.info("Services initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {str(e)}")
        logger.warning("Application will continue but database features may not work")

# Set all CORS enabled origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins, modify for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add exception handlers
app.add_exception_handler(EduviaException, eduvia_exception_handler)
app.add_exception_handler(Exception, global_exception_handler)

# Include Routers
app.include_router(chat.router, prefix=f"{settings.API_V1_STR}/chat", tags=["Chat"])
app.include_router(knowledge.router, prefix=f"{settings.API_V1_STR}/knowledge", tags=["Knowledge Base"])
app.include_router(assessment.router, prefix=f"{settings.API_V1_STR}/assessment", tags=["Assessment"])
app.include_router(sessions.router, prefix=f"{settings.API_V1_STR}/sessions", tags=["Sessions"])
app.include_router(pdf.router, prefix=f"{settings.API_V1_STR}", tags=["PDF"])


@app.get("/")
def read_root():
    logger.info("Root endpoint accessed")
    return {"message": "Welcome to the Eduvia AI Chatbot API"}

def _get_health_status():
    logger.info("Health check endpoint accessed")
    # Verify DB and service availability via simple checks
    try:
        # will initiate DB connection if not ready
        from app.core.database import get_db
        db = get_db()
        db.close()
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {"status": "fail", "database": "unavailable", "error": str(e)}

@app.get("/health")
def health_check():
    return _get_health_status()

@app.get("/api/health")
def health_check_api():
    return _get_health_status()
