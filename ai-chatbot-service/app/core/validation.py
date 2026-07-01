import os
import re
from urllib.parse import urlparse
from typing import Optional
from app.core.config import settings
from app.core.logging import get_logger
from app.core.exceptions import EduviaException

logger = get_logger()

class ConfigValidator:
    """Validates application configuration on startup."""
    
    @staticmethod
    def validate_all():
        """Validate all critical configuration settings."""
        logger.info("Validating application configuration...")
        
        ConfigValidator.validate_database_url()
        ConfigValidator.validate_ollama_config()
        ConfigValidator.validate_chroma_config()
        ConfigValidator.validate_log_paths()
        
        logger.info("Configuration validation completed successfully")
    
    @staticmethod
    def validate_database_url():
        """Validate MySQL database URL."""
        try:
            db_url = settings.MYSQL_URL
            
            if not db_url:
                raise EduviaException("Database URL is not configured", "DB_URL_MISSING")
            
            # Parse database URL
            parsed = urlparse(db_url)
            
            if parsed.scheme not in ['mysql', 'mysql+pymysql']:
                raise EduviaException(f"Invalid database scheme: {parsed.scheme}", "DB_URL_INVALID_SCHEME")
            
            if not parsed.hostname:
                raise EduviaException("Database hostname is missing", "DB_URL_NO_HOST")
            
            if not parsed.username:
                raise EduviaException("Database username is missing", "DB_URL_NO_USER")
            
            # Test database connection (optional - can be slow)
            logger.info(f"Database URL validation passed: {parsed.hostname}:{parsed.port or 3306}")
            
        except Exception as e:
            if isinstance(e, EduviaException):
                raise
            logger.error(f"Database URL validation failed: {str(e)}")
            raise EduviaException(f"Database configuration invalid: {str(e)}", "DB_CONFIG_ERROR")
    
    @staticmethod
    def validate_ollama_config():
        """Validate Ollama LLM configuration."""
        try:
            base_url = settings.OLLAMA_BASE_URL
            model = settings.OLLAMA_MODEL
            embed_model = getattr(settings, "OLLAMA_EMBED_MODEL", None) or model
            
            if not base_url:
                raise EduviaException("Ollama base URL is not configured", "OLLAMA_URL_MISSING")
            
            if not model:
                raise EduviaException("Ollama model is not configured", "OLLAMA_MODEL_MISSING")
            
            if not embed_model:
                raise EduviaException("Ollama embedding model is not configured", "OLLAMA_EMBED_MODEL_MISSING")
            
            # Validate URL format
            parsed = urlparse(base_url)
            if parsed.scheme not in ['http', 'https']:
                raise EduviaException(f"Invalid Ollama URL scheme: {parsed.scheme}", "OLLAMA_URL_INVALID")
            
            if not parsed.hostname:
                raise EduviaException("Ollama hostname is missing", "OLLAMA_NO_HOST")
            
            if not parsed.port:
                raise EduviaException("Ollama port is missing", "OLLAMA_NO_PORT")
            
            logger.info(f"Ollama configuration validated: {base_url}, chat model: {model}, embed model: {embed_model}")
            
        except Exception as e:
            if isinstance(e, EduviaException):
                raise
            logger.error(f"Ollama configuration validation failed: {str(e)}")
            raise EduviaException(f"Ollama configuration invalid: {str(e)}", "OLLAMA_CONFIG_ERROR")
    
    @staticmethod
    def validate_chroma_config():
        """Validate ChromaDB configuration."""
        try:
            chroma_dir = settings.CHROMA_PERSIST_DIRECTORY
            
            if not chroma_dir:
                raise EduviaException("ChromaDB persist directory is not configured", "CHROMA_DIR_MISSING")
            
            # Check if directory exists or can be created
            if not os.path.exists(chroma_dir):
                try:
                    os.makedirs(chroma_dir, exist_ok=True)
                    logger.info(f"Created ChromaDB directory: {chroma_dir}")
                except Exception as e:
                    raise EduviaException(f"Cannot create ChromaDB directory: {str(e)}", "CHROMA_DIR_CREATE_ERROR")
            
            # Check write permissions
            if not os.access(chroma_dir, os.W_OK):
                raise EduviaException(f"No write permission for ChromaDB directory: {chroma_dir}", "CHROMA_DIR_PERMISSION_ERROR")
            
            logger.info(f"ChromaDB configuration validated: {chroma_dir}")
            
        except Exception as e:
            if isinstance(e, EduviaException):
                raise
            logger.error(f"ChromaDB configuration validation failed: {str(e)}")
            raise EduviaException(f"ChromaDB configuration invalid: {str(e)}", "CHROMA_CONFIG_ERROR")
    
    @staticmethod
    def validate_log_paths():
        """Validate log file paths and directories."""
        try:
            log_dir = "./logs"
            
            # Create logs directory if it doesn't exist
            if not os.path.exists(log_dir):
                try:
                    os.makedirs(log_dir, exist_ok=True)
                    logger.info(f"Created logs directory: {log_dir}")
                except Exception as e:
                    raise EduviaException(f"Cannot create logs directory: {str(e)}", "LOG_DIR_CREATE_ERROR")
            
            # Check write permissions
            if not os.access(log_dir, os.W_OK):
                raise EduviaException(f"No write permission for logs directory: {log_dir}", "LOG_DIR_PERMISSION_ERROR")
            
            logger.info("Log paths validation completed")
            
        except Exception as e:
            if isinstance(e, EduviaException):
                raise
            logger.error(f"Log paths validation failed: {str(e)}")
            raise EduviaException(f"Log configuration invalid: {str(e)}", "LOG_CONFIG_ERROR")
    
    @staticmethod
    def validate_model_availability():
        """Optional: Check if Ollama model is available (requires network call)."""
        try:
            import requests
            
            base_url = settings.OLLAMA_BASE_URL
            model = settings.OLLAMA_MODEL
            
            # This is optional and can be skipped to avoid startup delays
            logger.info("Skipping model availability check to avoid startup delay")
            
            # Uncomment below to enable model checking:
            # response = requests.get(f"{base_url}/api/tags", timeout=5)
            # if response.status_code == 200:
            #     models = response.json().get("models", [])
            #     model_names = [m["name"] for m in models]
            #     if model not in model_names:
            #         logger.warning(f"Model {model} not found in Ollama. Available models: {model_names}")
            #     else:
            #         logger.info(f"Model {model} is available in Ollama")
            
        except Exception as e:
            logger.warning(f"Model availability check failed (non-critical): {str(e)}")

def validate_environment():
    """Main function to validate all environment settings."""
    try:
        ConfigValidator.validate_all()
        return True
    except EduviaException as e:
        logger.error(f"Configuration validation failed: {e.message}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error during configuration validation: {str(e)}")
        return False
