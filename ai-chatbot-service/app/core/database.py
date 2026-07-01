from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from app.core.config import settings
from app.models.database import Base
from app.core.logging import get_logger
from app.core.exceptions import DatabaseException

logger = get_logger()

# Global database engine and session
engine = None
SessionLocal = None

def init_database():
    """Initialize database connection and create tables."""
    global engine, SessionLocal
    
    try:
        logger.info("Initializing database connection...")
        
        # Try MySQL first, fallback to SQLite for development
        try:
            # Create engine with MySQL connection
            engine = create_engine(
                settings.MYSQL_URL,
                pool_pre_ping=True,
                echo=False  # Set to True for SQL debugging
            )
            # Test connection
            with engine.connect() as conn:
                conn.execute("SELECT 1")
            logger.info("MySQL database connected successfully")
        except Exception as mysql_error:
            logger.warning(f"MySQL connection failed: {mysql_error}")
            logger.info("Falling back to SQLite for development...")
            
            # Fallback to SQLite
            engine = create_engine(
                "sqlite:///./eduvia_chatbot.db",
                poolclass=StaticPool,
                connect_args={"check_same_thread": False},
                echo=False
            )
            logger.info("SQLite database initialized for development")
        
        # Create session factory
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        
        # Create tables
        Base.metadata.create_all(bind=engine)
        
        logger.info("Database initialized successfully")
        
    except Exception as e:
        logger.error(f"Failed to initialize database: {str(e)}", exc_info=True)
        raise DatabaseException(f"Database initialization failed: {str(e)}", "DB_INIT_ERROR")

def get_db() -> Session:
    """Get database session."""
    if SessionLocal is None:
        init_database()
    
    db = SessionLocal()
    try:
        return db
    except Exception as e:
        db.close()
        logger.error(f"Error creating database session: {str(e)}")
        raise DatabaseException(f"Database session creation failed: {str(e)}", "DB_SESSION_ERROR")

def close_db():
    """Close database connection."""
    global engine
    if engine:
        engine.dispose()
        logger.info("Database connection closed")
