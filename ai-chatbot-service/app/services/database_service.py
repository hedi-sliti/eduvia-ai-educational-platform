from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from uuid import uuid4
from typing import List, Optional, Dict, Any
from datetime import datetime

from app.models.database import Student, ChatSession, ChatMessage, Assessment, KnowledgeDocument
from app.core.database import get_db
from app.core.exceptions import DatabaseException
from app.core.logging import get_logger

logger = get_logger()

class DatabaseService:
    """Service layer for database operations."""
    
    def __init__(self):
        self.db = get_db()
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        try:
            self.db.close()
        except:
            pass
    
    # Student operations
    def create_student(self, student_id: str, email: str, name: str) -> Student:
        """Create a new student record."""
        try:
            student = Student(
                id=student_id,
                email=email,
                name=name
            )
            self.db.add(student)
            self.db.commit()
            self.db.refresh(student)
            logger.info(f"Created student: {student_id}")
            return student
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error creating student: {str(e)}")
            raise DatabaseException(f"Failed to create student: {str(e)}", "STUDENT_CREATE_ERROR")
    
    def get_student(self, student_id: str) -> Optional[Student]:
        """Get student by ID."""
        try:
            return self.db.query(Student).filter(Student.id == student_id).first()
        except SQLAlchemyError as e:
            logger.error(f"Error getting student {student_id}: {str(e)}")
            raise DatabaseException(f"Failed to get student: {str(e)}", "STUDENT_GET_ERROR")
    
    def update_student_profile(self, student_id: str, learning_style: str, competency_level: str) -> Student:
        """Update student learning profile."""
        try:
            student = self.get_student(student_id)
            if not student:
                raise DatabaseException(f"Student {student_id} not found", "STUDENT_NOT_FOUND")
            
            student.learning_style = learning_style
            student.competency_level = competency_level
            student.updated_at = datetime.utcnow()
            
            self.db.commit()
            self.db.refresh(student)
            logger.info(f"Updated student profile: {student_id}")
            return student
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error updating student profile: {str(e)}")
            raise DatabaseException(f"Failed to update student profile: {str(e)}", "STUDENT_UPDATE_ERROR")
    
    # Chat session operations
    def create_chat_session(self, student_id: str, title: str = None) -> ChatSession:
        """Create a new chat session."""
        try:
            session = ChatSession(
                id=str(uuid4()),
                student_id=student_id,
                title=title or f"Chat Session {datetime.now().strftime('%Y-%m-%d %H:%M')}"
            )
            self.db.add(session)
            self.db.commit()
            self.db.refresh(session)
            logger.info(f"Created chat session: {session.id}")
            return session
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error creating chat session: {str(e)}")
            raise DatabaseException(f"Failed to create chat session: {str(e)}", "SESSION_CREATE_ERROR")
    
    def add_chat_message(self, session_id: str, message_type: str, content: str, sources: List[str] = None) -> ChatMessage:
        """Add a message to a chat session."""
        try:
            message = ChatMessage(
                id=str(uuid4()),
                session_id=session_id,
                message_type=message_type,
                content=content,
                sources=sources
            )
            self.db.add(message)
            
            # Update session timestamp
            session = self.db.query(ChatSession).filter(ChatSession.id == session_id).first()
            if session:
                session.updated_at = datetime.utcnow()
            
            self.db.commit()
            self.db.refresh(message)
            logger.info(f"Added chat message to session {session_id}")
            return message
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error adding chat message: {str(e)}")
            raise DatabaseException(f"Failed to add chat message: {str(e)}", "MESSAGE_CREATE_ERROR")
    
    def get_chat_history(self, session_id: str, limit: int = 50) -> List[ChatMessage]:
        """Get chat history for a session."""
        try:
            return (self.db.query(ChatMessage)
                   .filter(ChatMessage.session_id == session_id)
                   .order_by(ChatMessage.created_at)
                   .limit(limit)
                   .all())
        except SQLAlchemyError as e:
            logger.error(f"Error getting chat history: {str(e)}")
            raise DatabaseException(f"Failed to get chat history: {str(e)}", "HISTORY_GET_ERROR")
    
    # Assessment operations
    def create_assessment(self, student_id: str, answers: Dict[str, Any], result: Dict[str, Any]) -> Assessment:
        """Create a new assessment record."""
        try:
            assessment = Assessment(
                id=str(uuid4()),
                student_id=student_id,
                answers=answers,
                learning_style=result.get("learning_style"),
                competency_level=result.get("competency_level"),
                recommendations=result.get("recommendations", [])
            )
            self.db.add(assessment)
            self.db.commit()
            self.db.refresh(assessment)
            logger.info(f"Created assessment for student: {student_id}")
            return assessment
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error creating assessment: {str(e)}")
            raise DatabaseException(f"Failed to create assessment: {str(e)}", "ASSESSMENT_CREATE_ERROR")
    
    # Knowledge document operations
    def create_knowledge_document(self, title: str, content: str, metadata: Dict[str, Any], document_id: str) -> KnowledgeDocument:
        """Create a knowledge document record."""
        try:
            doc = KnowledgeDocument(
                id=str(uuid4()),
                title=title,
                content=content,
                doc_metadata=metadata,  # Updated field name
                source=metadata.get("source", "unknown"),
                document_id=document_id
            )
            self.db.add(doc)
            self.db.commit()
            self.db.refresh(doc)
            logger.info(f"Created knowledge document: {title}")
            return doc
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error creating knowledge document: {str(e)}")
            raise DatabaseException(f"Failed to create knowledge document: {str(e)}", "DOC_CREATE_ERROR")
    
    def get_all_knowledge_documents(self) -> List[KnowledgeDocument]:
        """Get all knowledge documents."""
        try:
            documents = self.db.query(KnowledgeDocument).all()
            logger.info(f"Retrieved {len(documents)} knowledge documents")
            return documents
        except SQLAlchemyError as e:
            logger.error(f"Error retrieving knowledge documents: {str(e)}")
            raise DatabaseException(f"Failed to retrieve documents: {str(e)}", "DOC_RETRIEVE_ERROR")
    
    def get_pdf_documents(self) -> List[KnowledgeDocument]:
        """Get all PDF documents."""
        try:
            documents = self.db.query(KnowledgeDocument).all()
            pdf_docs = [
                doc for doc in documents
                if isinstance(doc.doc_metadata, dict) and doc.doc_metadata.get("file_type") == "pdf"
            ]
            logger.info(f"Retrieved {len(pdf_docs)} PDF documents")
            return pdf_docs
        except SQLAlchemyError as e:
            logger.error(f"Error retrieving PDF documents: {str(e)}")
            raise DatabaseException(f"Failed to retrieve PDF documents: {str(e)}", "PDF_RETRIEVE_ERROR")

    # Knowledge document lifecycle helpers
    def get_knowledge_document(self, document_id: str) -> Optional[KnowledgeDocument]:
        """Get a knowledge document by document_id."""
        try:
            return self.db.query(KnowledgeDocument).filter(KnowledgeDocument.document_id == document_id).first()
        except SQLAlchemyError as e:
            logger.error(f"Error fetching knowledge document {document_id}: {str(e)}")
            raise DatabaseException(f"Failed to fetch document: {str(e)}", "DOC_GET_ERROR")

    def delete_knowledge_document(self, document_id: str) -> bool:
        """Delete a knowledge document by document_id."""
        try:
            doc = self.get_knowledge_document(document_id)
            if not doc:
                return False
            self.db.delete(doc)
            self.db.commit()
            return True
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error deleting knowledge document {document_id}: {str(e)}")
            raise DatabaseException(f"Failed to delete document: {str(e)}", "DOC_DELETE_ERROR")

    def update_knowledge_document(self, document_id: str, title: Optional[str], content: Optional[str], metadata: Dict[str, Any]) -> Optional[KnowledgeDocument]:
        """Update a knowledge document in place."""
        try:
            doc = self.get_knowledge_document(document_id)
            if not doc:
                return None

            if title:
                doc.title = title
            if content is not None:
                doc.content = content
            if metadata is not None:
                doc.doc_metadata = metadata
            doc.updated_at = datetime.utcnow()

            self.db.commit()
            self.db.refresh(doc)
            return doc
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error updating knowledge document {document_id}: {str(e)}")
            raise DatabaseException(f"Failed to update document: {str(e)}", "DOC_UPDATE_ERROR")
    
    def search_documents_by_content(self, query: str, limit: int = 5) -> List[KnowledgeDocument]:
        """Search documents by content (simple text search)."""
        try:
            documents = self.db.query(KnowledgeDocument).filter(
                KnowledgeDocument.content.contains(query)
            ).limit(limit).all()
            logger.info(f"Found {len(documents)} documents matching query: {query}")
            return documents
        except SQLAlchemyError as e:
            logger.error(f"Error searching documents: {str(e)}")
            raise DatabaseException(f"Failed to search documents: {str(e)}", "DOC_SEARCH_ERROR")
