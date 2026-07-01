import uuid
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from app.core.llm import get_vector_store
from app.core.exceptions import VectorStoreException
from app.core.logging import get_logger

logger = get_logger()

def ingest_text_to_vectorstore(text: str, metadata: dict = None) -> str:
    """Takes generic text, splits it into chunks and stores it inside ChromaDB."""
    
    try:
        logger.info(f"Starting text ingestion for document {metadata.get('document_id', 'unknown')}")
        
        # 1. Initialize text splitter
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len
        )
        
        # 2. Split Document into individual chunks
        chunks = text_splitter.split_text(text)
        logger.info(f"Split text into {len(chunks)} chunks")
        
        if metadata is None:
            metadata = {}

        # Drop empty list metadata values that Chroma rejects
        cleaned_metadata = {}
        for k, v in metadata.items():
            if isinstance(v, list) and len(v) == 0:
                continue
            cleaned_metadata[k] = v
        
        # Optional document id linking
        doc_group_id = cleaned_metadata.get("document_id", str(uuid.uuid4()))
        cleaned_metadata["source"] = cleaned_metadata.get("source", "knowledge_ingestion_api")
        
        documents = [
            Document(page_content=chunk, metadata=cleaned_metadata)
            for chunk in chunks
        ]
        
        # 3. Add to ChromaDB vector store
        vector_store = get_vector_store()
        vector_store.add_documents(documents)
        
        logger.info(f"Successfully ingested {len(documents)} document chunks")
        return doc_group_id
        
    except Exception as e:
        logger.error(f"Error ingesting text to vector store: {str(e)}", exc_info=True)
        raise VectorStoreException(f"Knowledge ingestion failed: {str(e)}", "INGESTION_ERROR")

def delete_document_from_vectorstore(document_id: str) -> int:
    """
    Permanently removes all ChromaDB embeddings tied to a given document_id.
    This must be called whenever a document is deleted from the database so that
    the retriever can no longer surface chunks from that file.
    Returns the number of chunks deleted.
    """
    try:
        vector_store = get_vector_store()
        collection = vector_store._collection

        # Find all chunks belonging to this document_id
        results = collection.get(
            where={"document_id": {"$eq": document_id}},
            include=["metadatas"]
        )
        ids_to_delete = results["ids"]

        if ids_to_delete:
            collection.delete(ids=ids_to_delete)
            logger.info(f"Deleted {len(ids_to_delete)} vector chunks for document_id={document_id}")
        else:
            logger.warning(f"No chunks found in ChromaDB for document_id={document_id} - already clean or metadata missing")

        return len(ids_to_delete)

    except Exception as e:
        logger.error(f"Error deleting from vector store: {str(e)}", exc_info=True)
        raise VectorStoreException(f"Vector store deletion failed: {str(e)}", "DELETION_ERROR")
