from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from app.core.logging import get_logger

logger = get_logger()

class EduviaException(Exception):
    """Base exception class for Eduvia application."""
    
    def __init__(self, message: str, error_code: str = None):
        self.message = message
        self.error_code = error_code
        super().__init__(self.message)

class LLMServiceException(EduviaException):
    """Exception raised when LLM service fails."""
    pass

class VectorStoreException(EduviaException):
    """Exception raised when vector store operations fail."""
    pass

class DatabaseException(EduviaException):
    """Exception raised when database operations fail."""
    pass

async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler for FastAPI application."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "message": "An unexpected error occurred. Please try again later.",
            "error_code": "INTERNAL_ERROR"
        }
    )

async def eduvia_exception_handler(request: Request, exc: EduviaException):
    """Handler for custom Eduvia exceptions."""
    logger.warning(f"Eduvia exception: {exc.message}", extra={"error_code": exc.error_code})
    
    return JSONResponse(
        status_code=400,
        content={
            "error": exc.error_code or "BAD_REQUEST",
            "message": exc.message
        }
    )
