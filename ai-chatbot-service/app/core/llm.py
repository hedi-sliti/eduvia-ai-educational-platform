import os
from langchain_ollama import OllamaLLM, OllamaEmbeddings
from langchain_chroma import Chroma
from app.core.config import settings

def get_llm(model_override: str = None):
    """Initializes and returns the Ollama LLM instance."""
    model_name = model_override or settings.OLLAMA_MODEL
    return OllamaLLM(
        base_url=settings.OLLAMA_BASE_URL,
        model=model_name
    )

def get_embeddings():
    """Returns the Ollama embeddings model used for Vector Search."""
    embed_model = getattr(settings, "OLLAMA_EMBED_MODEL", None) or settings.OLLAMA_MODEL
    return OllamaEmbeddings(
        base_url=settings.OLLAMA_BASE_URL,
        model=embed_model
    )

def get_vector_store():
    """Initializes ChromaDB vector store and connects it to embeddings."""
    os.makedirs(settings.CHROMA_PERSIST_DIRECTORY, exist_ok=True)
    return Chroma(
        embedding_function=get_embeddings(),
        persist_directory=settings.CHROMA_PERSIST_DIRECTORY,
        collection_name="eduvia_knowledge"
    )
