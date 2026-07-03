from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Eduvia AI Chatbot Service"
    API_V1_STR: str = "/api"
    
    # Ollama settings
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    # Default chat model for the local defense flow
    OLLAMA_MODEL: str = "gemma3:4b"
    # Fallback matches the local demo model
    OLLAMA_FALLBACK_MODEL: str = "gemma3:4b"
    # Lightweight embedding model keeps retrieval fast and compatible even when the chat model is large.
    OLLAMA_EMBED_MODEL: str = "nomic-embed-text"
    
    # Database settings
    MYSQL_URL: str = "mysql+pymysql://root:password@localhost/eduvia_chatbot"
    
    # Vector DB settings
    CHROMA_PERSIST_DIRECTORY: str = "./chroma_db"

settings = Settings()
