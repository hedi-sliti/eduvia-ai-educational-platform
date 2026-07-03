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

class EnhancedChatService:
    """Enhanced chat service that can access PDF documents from database."""
    
    def __init__(self):
        self.vector_store = get_vector_store()
        self.llm = get_llm()
        self.fallback_model = getattr(settings, "OLLAMA_FALLBACK_MODEL", "llama3:8b")
        self.db_service = DatabaseService()
        self.session_service = SessionService()
    
    def search_pdf_documents(self, query: str, limit: int = 5, course_id: str = None) -> List[Document]:
        """Search for relevant PDF documents based on the query."""
        try:
            logger.info(f"Searching PDF documents for query: {query}")
            search_filter = {"file_type": "pdf"}
            if course_id:
                search_filter = {
                    "$and": [
                        {"course_id": course_id},
                        {"file_type": "pdf"}
                    ]
                }
            
            # First, try vector search on all documents (including PDFs)
            vector_results = self.vector_store.similarity_search(
                query=query,
                k=limit,
                filter=search_filter
            )
            
            logger.info(f"Found {len(vector_results)} PDF documents via vector search")
            
            # If no vector results, try database text search
            if not vector_results and not course_id:
                with self.db_service as db:
                    db_docs = db.search_documents_by_content(query, limit)
                    vector_results = [
                        Document(
                            page_content=doc.content,
                            metadata={
                                "title": doc.title,
                                "source": doc.source,
                                "document_id": doc.document_id,
                                "file_type": "pdf",
                                **(doc.doc_metadata or {})
                            }
                        )
                        for doc in db_docs
                    ]
                    logger.info(f"Found {len(vector_results)} PDF documents via database search")
            
            return vector_results
            
        except Exception as e:
            logger.error(f"Error searching PDF documents: {str(e)}", exc_info=True)
            return []
    
    def generate_enhanced_response(self, query: str, student_id: str = None, session_id: str = None, course_id: str = None, course_title: str = None) -> tuple[str, List[str]]:
        """Generate response using PDF documents and general knowledge."""
        try:
            logger.info(f"Generating enhanced response for student {student_id}, session {session_id}")
            
            # Add user message to session if provided
            if session_id:
                self.session_service.add_message(session_id, "user", query)
            
            # Search for relevant PDF documents
            pdf_docs = self.search_pdf_documents(query, limit=3, course_id=course_id)
            
            # Also search general knowledge base
            general_docs = [] if course_id else self.vector_store.similarity_search(query, k=2)
            
            # Combine all documents
            all_docs = pdf_docs + general_docs
            
            # Prepare context
            context_parts = []
            sources = []
            
            if all_docs:
                for i, doc in enumerate(all_docs, 1):
                    context_parts.append(f"\n--- Document {i} ---")
                    context_parts.append(f"Title: {doc.metadata.get('title', 'Unknown')}")
                    context_parts.append(f"Content: {doc.page_content}")
                    sources.append(doc.metadata.get('title', f'Document {i}'))
            else:
                # No matches in vector store; let the LLM fall back to general knowledge
                if course_id:
                    course_label = course_title or "the selected course"
                    context_parts.append(
                        f"No uploaded PDF documents matched this question for {course_label}. "
                        "Do not use or mention PDF content from other courses."
                    )
                else:
                    context_parts.append(
                        "No Eduvia course documents matched this question. "
                        "Answer the user's question directly using general first-year university knowledge while keeping the answer within Eduvia course scope."
                    )

            context = "\n".join(context_parts)
            
            # Enhanced prompt for PDF-based responses
            enhanced_prompt = PromptTemplate(
                input_variables=["context", "question"],
                template="""You are an intelligent AI tutor for first-year university students at Esprit.
You must only answer questions related to Eduvia courses, levels, or uploaded study materials. If the question is unrelated, say: "I can only help with Eduvia course topics. Please ask a study-related question."
If no course documents are available, still answer the question using general first-year university knowledge aligned with Eduvia courses.
Respond directly to the student's question; do not provide meta-advice about how to ask questions.
Do not restate these instructions; provide only the answer to the student's question.

CONTEXT FROM PDF DOCUMENTS AND KNOWNOWLEDGE BASE:
{context}

QUESTION: {question}

INSTRUCTIONS:
1. Use the provided context from PDF documents to answer the question
2. If the context doesn't contain the answer, use your general knowledge
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
                    logger.warning(f"Primary model failed for enhanced PDF chat ({e}); retrying with fallback '{self.fallback_model}'")
                    fallback_llm = get_llm(model_override=self.fallback_model)
                    chain = enhanced_prompt | fallback_llm
                    response_text = chain.invoke({"context": context, "question": query})
                    self.llm = fallback_llm
                else:
                    raise
            
            # Add assistant message to session if provided
            if session_id:
                self.session_service.add_message(session_id, "assistant", response_text, sources)
            
            logger.info(f"Generated enhanced response for student {student_id}")
            return response_text, sources
            
        except Exception as e:
            logger.error(f"Error generating enhanced response: {str(e)}", exc_info=True)
            raise LLMServiceException(f"Failed to generate enhanced response: {str(e)}", "ENHANCED_RESPONSE_ERROR")
    
    def get_pdf_document_list(self) -> List[Dict[str, Any]]:
        """Get list of all PDF documents in the database."""
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
                        "created_at": doc.created_at.isoformat() if doc.created_at else None
                    }
                    for doc in pdf_docs
                ]
                
        except Exception as e:
            logger.error(f"Error getting PDF document list: {str(e)}", exc_info=True)
            return []

# Global enhanced chat service instance
enhanced_chat_service = EnhancedChatService()
