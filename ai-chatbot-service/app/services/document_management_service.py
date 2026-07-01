"""
Document management service for proper PDF lifecycle management
"""

from typing import List, Dict, Any, Optional
from app.core.llm import get_vector_store, get_embeddings
from app.core.logging import get_logger
from app.services.database_service import DatabaseService
from app.services.knowledge_service import ingest_text_to_vectorstore
from app.core.exceptions import VectorStoreException, DatabaseException
from langchain_core.documents import Document
import uuid

logger = get_logger()

class DocumentManagementService:
    """Service for managing document lifecycle and ensuring consistency"""
    
    def __init__(self):
        self.vector_store = get_vector_store()
        self.embeddings = get_embeddings()
        self.db_service = DatabaseService()
    
    def add_pdf_document(self, title: str, content: str, file_path: str, metadata: Dict[str, Any] = None) -> str:
        """Add a new PDF document with proper tracking"""
        try:
            logger.info(f"Adding PDF document: {title}")
            
            # Generate unique document ID
            document_id = f"pdf-{uuid.uuid4()}"
            
            # Prepare metadata with proper tracking
            full_metadata = {
                "title": title,
                "source": file_path,
                "document_id": document_id,
                "file_type": "pdf",
                "status": "active",
                "created_at": uuid.uuid4().hex,
                **(metadata or {})
            }
            
            # Ingest to vector store
            vector_doc_id = ingest_text_to_vectorstore(content, full_metadata)
            
            # Save to database
            with self.db_service as db:
                db.create_knowledge_document(
                    title=title,
                    content=content,
                    metadata=full_metadata,
                    document_id=document_id
                )
            
            logger.info(f"Successfully added PDF document {title} with ID {document_id}")
            return document_id
            
        except Exception as e:
            logger.error(f"Error adding PDF document {title}: {str(e)}", exc_info=True)
            raise VectorStoreException(f"Failed to add PDF document: {str(e)}", "ADD_DOCUMENT_ERROR")
    
    def delete_pdf_document(self, document_id: str) -> bool:
        """Completely remove a PDF document from all systems"""
        try:
            logger.info(f"Deleting PDF document: {document_id}")
            
            # Delete from vector store
            collection = self.vector_store._collection
            collection.delete(
                where={
                    "document_id": document_id,
                    "file_type": "pdf"
                }
            )
            logger.info(f"Deleted document {document_id} from vector store")
            
            # Delete from database
            with self.db_service as db:
                success = db.delete_knowledge_document(document_id)
                if success:
                    logger.info(f"Deleted document {document_id} from database")
                else:
                    logger.warning(f"Document {document_id} not found in database")
            
            return True
            
        except Exception as e:
            logger.error(f"Error deleting PDF document {document_id}: {str(e)}", exc_info=True)
            return False
    
    def update_pdf_document(self, document_id: str, title: str = None, content: str = None, metadata: Dict[str, Any] = None) -> bool:
        """Update an existing PDF document"""
        try:
            logger.info(f"Updating PDF document: {document_id}")
            
            # First delete old version
            self.delete_pdf_document(document_id)
            
            # Add new version
            if content:
                self.add_pdf_document(
                    title=title or f"Updated Document {document_id}",
                    content=content,
                    file_path=f"updated-{document_id}",
                    metadata=metadata or {}
                )
            
            return True
            
        except Exception as e:
            logger.error(f"Error updating PDF document {document_id}: {str(e)}", exc_info=True)
            return False
    
    def get_document_manifest(self) -> Dict[str, Any]:
        """Get a manifest of all documents with their status"""
        try:
            # Get vector store documents
            collection = self.vector_store._collection
            vector_docs = collection.get(include=['metadatas'])
            
            # Get database documents
            with self.db_service as db:
                db_docs = db.get_pdf_documents()
            
            # Build manifest
            manifest = {
                "total_vector_documents": len(vector_docs['ids']),
                "total_database_documents": len(db_docs),
                "active_documents": [],
                "orphaned_documents": []
            }
            
            # Active documents (in both vector store and database)
            db_document_ids = {doc.document_id for doc in db_docs}
            
            for metadata in vector_docs['metadatas']:
                if metadata.get('file_type') == 'pdf':
                    doc_info = {
                        "document_id": metadata.get('document_id'),
                        "title": metadata.get('title', 'Unknown'),
                        "source": metadata.get('source', 'Unknown'),
                        "status": "active" if metadata.get('document_id') in db_document_ids else "orphaned"
                    }
                    
                    if doc_info["status"] == "active":
                        manifest["active_documents"].append(doc_info)
                    else:
                        manifest["orphaned_documents"].append(doc_info)
            
            return manifest
            
        except Exception as e:
            logger.error(f"Error generating document manifest: {str(e)}", exc_info=True)
            return {"error": str(e)}
    
    def cleanup_orphaned_documents(self) -> Dict[str, Any]:
        """Remove documents that exist in vector store but not in database"""
        try:
            logger.info("Starting cleanup of orphaned documents")
            
            manifest = self.get_document_manifest()
            
            if "orphaned_documents" not in manifest:
                return {"error": "Failed to get manifest"}
            
            orphaned_count = len(manifest["orphaned_documents"])
            
            if orphaned_count == 0:
                logger.info("No orphaned documents found")
                return {"cleaned": 0, "message": "No orphaned documents found"}
            
            # Delete orphaned documents
            collection = self.vector_store._collection
            orphaned_ids = [
                doc["document_id"] 
                for doc in manifest["orphaned_documents"] 
                if doc.get("document_id")
            ]
            
            collection.delete(
                where={
                    "document_id": {"$in": orphaned_ids},
                    "file_type": "pdf"
                }
            )
            
            logger.info(f"Cleaned up {orphaned_count} orphaned documents")
            
            return {
                "cleaned": orphaned_count,
                "message": f"Successfully cleaned up {orphaned_count} orphaned documents"
            }
            
        except Exception as e:
            logger.error(f"Error during cleanup: {str(e)}", exc_info=True)
            return {"error": str(e)}

# Global document management service instance
document_management_service = DocumentManagementService()
