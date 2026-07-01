"""
Improved RAG service with proper document management
"""

from typing import List, Dict, Any, Optional
from app.core.llm import get_vector_store, get_llm
from app.core.logging import get_logger
from app.services.database_service import DatabaseService
from app.services.session_service import SessionService
from app.core.exceptions import VectorStoreException, LLMServiceException
from app.core.config import settings
from langchain_core.documents import Document
from langchain_core.prompts import PromptTemplate

logger = get_logger()

class ImprovedChatService:
    """Improved chat service with proper document filtering and management."""
    
    def __init__(self):
        self.vector_store = get_vector_store()
        self.llm = get_llm()
        self.fallback_model = getattr(settings, "OLLAMA_FALLBACK_MODEL", "llama3:8b")
        self.db_service = DatabaseService()
        self.session_service = SessionService()
    
    def get_active_document_sources(self) -> List[str]:
        """Get list of active document sources from database"""
        try:
            with self.db_service as db:
                pdf_docs = db.get_pdf_documents()
                # Return unique document IDs for filtering
                active_ids = {doc.document_id for doc in pdf_docs}
                logger.info(f"Found {len(active_ids)} active document IDs: {list(active_ids)}")
                return list(active_ids)
        except Exception as e:
            logger.error(f"Error getting active document sources: {e}")
            return []
    
    def search_active_documents(self, query: str, limit: int = 5) -> List[Document]:
        """Search only active PDF documents with proper filtering"""
        try:
            logger.info(f"Searching active PDF documents for query: {query}")
            
            # Get active document IDs
            active_document_ids = self.get_active_document_sources()
            
            if not active_document_ids:
                logger.info("No active PDF documents found")
                return []
            
            # Search with proper filtering
            vector_results = self.vector_store.similarity_search(
                query=query,
                k=limit,
                filter={
                    "file_type": "pdf",
                    "document_id": {"$in": active_document_ids}
                }
            )
            
            logger.info(f"Found {len(vector_results)} active PDF documents via vector search")
            return vector_results
            
        except Exception as e:
            logger.error(f"Error searching active PDF documents: {str(e)}", exc_info=True)
            return []
    
    def generate_response(self, query: str, student_id: str = None, session_id: str = None) -> tuple[str, List[str]]:
        """Generate response using only active PDF documents"""
        try:
            logger.info(f"Generating response for student {student_id}, session {session_id}")
            
            # Add user message to session if provided
            if session_id:
                self.session_service.add_message(session_id, "user", query)
            
            # Search only active PDF documents
            pdf_docs = self.search_active_documents(query, limit=3)
            
            # Prepare context
            context = ""
            sources = []
            
            if pdf_docs:
                for i, doc in enumerate(pdf_docs, 1):
                    context += f"\n--- Document {i} ---\n"
                    context += f"Title: {doc.metadata.get('title', 'Unknown')}\n"
                    context += f"Content: {doc.page_content}\n"
                    sources.append(doc.metadata.get('title', f'Document {i}'))
                
                logger.info(f"Using {len(pdf_docs)} active PDF documents for context")
            else:
                context = "No relevant study materials found. Please provide a general response based on your knowledge."
                logger.info("No active PDF documents found for query")
            
            # Enhanced prompt for educational responses
            enhanced_prompt = PromptTemplate(
                input_variables=["context", "question"],
                template="""You are an intelligent AI tutor for first-year university students at Esprit.

CONTEXT FROM ACTIVE STUDY MATERIALS:
{context}

QUESTION: {question}

INSTRUCTIONS:
1. Use ONLY the provided context from active study materials to answer the question
2. If context doesn't contain the answer, use your general knowledge but clearly state it
3. Always cite which documents you used (by title)
4. Provide clear, educational explanations suitable for first-year students
5. Include examples when helpful
6. If you're unsure, say so and suggest where the student might find more information

RESPONSE:"""
            )
            
            # Generate response
            chain = enhanced_prompt | self.llm
            try:
                response_text = chain.invoke({"context": context, "question": query})
            except Exception as e:
                if self.fallback_model:
                    logger.warning(f"Primary model failed for PDF chat ({e}); retrying with fallback '{self.fallback_model}'")
                    fallback_llm = get_llm(model_override=self.fallback_model)
                    chain = enhanced_prompt | fallback_llm
                    response_text = chain.invoke({"context": context, "question": query})
                    # Update instance to use fallback for subsequent calls
                    self.llm = fallback_llm
                else:
                    raise
            
            # Add assistant message to session if provided
            if session_id:
                self.session_service.add_message(session_id, "assistant", response_text, sources)
            
            logger.info(f"Generated response for student {student_id} using {len(pdf_docs)} documents")
            return response_text, sources
            
        except Exception as e:
            logger.error(f"Error generating response: {str(e)}", exc_info=True)
            raise LLMServiceException(f"Failed to generate response: {str(e)}", "RESPONSE_ERROR")
    
    def get_active_document_list(self) -> List[Dict[str, Any]]:
        """Get list of only active PDF documents"""
        try:
            with self.db_service as db:
                pdf_docs = db.get_pdf_documents()
                
                return [
                    {
                        "id": doc.id,
                        "title": doc.title,
                        "source": doc.source,
                        "document_id": doc.document_id,
                        "metadata": doc.doc_metadata or {},
                        "created_at": doc.created_at.isoformat() if doc.created_at else None,
                        "status": "active"
                    }
                    for doc in pdf_docs
                ]
                
        except Exception as e:
            logger.error(f"Error getting active document list: {str(e)}", exc_info=True)
            return []

# Global improved chat service instance
improved_chat_service = ImprovedChatService()
