from typing import List, Optional, Dict, Any
from uuid import uuid4
from datetime import datetime, timedelta

from app.services.database_service import DatabaseService
from app.models.database import ChatSession, ChatMessage
from app.core.exceptions import DatabaseException
from app.core.logging import get_logger

logger = get_logger()

class SessionService:
    """Service for managing chat sessions and conversation history."""
    
    def __init__(self):
        self.db_service = DatabaseService()
    
    def create_session(self, student_id: str, title: str = None) -> str:
        """Create a new chat session."""
        try:
            # Ensure we never insert null student ids (breaks SQLite)
            student_id = student_id or "anonymous"
            with self.db_service:
                session = self.db_service.create_chat_session(student_id, title)
                logger.info(f"Created new chat session {session.id} for student {student_id}")
                return session.id
        except DatabaseException:
            raise
        except Exception as e:
            logger.error(f"Error creating session: {str(e)}")
            raise DatabaseException(f"Failed to create session: {str(e)}", "SESSION_CREATE_ERROR")
    
    def get_or_create_session(self, student_id: str, session_id: str = None) -> str:
        """
        Get an existing session by its id, or create a new one.
        Session lookup is only keyed by `session_id` to allow truly per-chat histories,
        while still attaching the session to the owning student for bookkeeping.
        """
        if session_id:
            try:
                with self.db_service:
                    session = (self.db_service.db.query(ChatSession)
                               .filter(ChatSession.id == session_id)
                               .first())
                    if session:
                        return session_id
                    else:
                        logger.warning(f"Session {session_id} not found; creating a new one.")
            except Exception as e:
                logger.error(f"Error verifying session: {str(e)}")
        
        # Create new session (one unique history per chat)
        return self.create_session(student_id)
    
    def add_message(self, session_id: str, message_type: str, content: str, sources: List[str] = None) -> bool:
        """Add a message to a chat session."""
        try:
            with self.db_service:
                self.db_service.add_chat_message(session_id, message_type, content, sources)
                logger.info(f"Added {message_type} message to session {session_id}")
                return True
        except DatabaseException:
            raise
        except Exception as e:
            logger.error(f"Error adding message: {str(e)}")
            raise DatabaseException(f"Failed to add message: {str(e)}", "MESSAGE_ADD_ERROR")
    
    def get_conversation_history(self, session_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get conversation history for a session."""
        try:
            with self.db_service:
                messages = self.db_service.get_chat_history(session_id, limit)
                
                history = []
                for msg in messages:
                    history.append({
                        "type": msg.message_type,
                        "content": msg.content,
                        "sources": msg.sources or [],
                        "timestamp": msg.created_at.isoformat()
                    })
                
                logger.info(f"Retrieved {len(history)} messages for session {session_id}")
                return history
                
        except DatabaseException:
            raise
        except Exception as e:
            logger.error(f"Error getting conversation history: {str(e)}")
            raise DatabaseException(f"Failed to get conversation history: {str(e)}", "HISTORY_ERROR")
    
    def get_session_context(self, session_id: str, max_context_length: int = 2000) -> str:
        """Get formatted context from recent conversation history."""
        try:
            history = self.get_conversation_history(session_id, limit=10)
            
            context_parts = []
            current_length = 0
            
            for msg in reversed(history[-10:]):  # Get last 10 messages
                msg_text = f"{msg['type'].title()}: {msg['content']}\n"
                
                if current_length + len(msg_text) <= max_context_length:
                    context_parts.insert(0, msg_text)
                    current_length += len(msg_text)
                else:
                    break
            
            context = "".join(context_parts)
            logger.info(f"Generated context of {len(context)} characters for session {session_id}")
            return context
            
        except Exception as e:
            logger.error(f"Error generating session context: {str(e)}")
            return ""
    
    def get_student_sessions(self, student_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Get all sessions for a student."""
        try:
            with self.db_service:
                sessions = (self.db_service.db.query(ChatSession)
                           .filter(ChatSession.student_id == student_id)
                           .order_by(ChatSession.updated_at.desc())
                           .limit(limit)
                           .all())
                
                session_list = []
                for session in sessions:
                    # Get message count
                    message_count = (self.db_service.db.query(ChatMessage)
                                   .filter(ChatMessage.session_id == session.id)
                                   .count())
                    
                    session_list.append({
                        "id": session.id,
                        "title": session.title,
                        "created_at": session.created_at.isoformat(),
                        "updated_at": session.updated_at.isoformat(),
                        "message_count": message_count
                    })
                
                logger.info(f"Retrieved {len(session_list)} sessions for student {student_id}")
                return session_list
                
        except Exception as e:
            logger.error(f"Error getting student sessions: {str(e)}")
            raise DatabaseException(f"Failed to get student sessions: {str(e)}", "STUDENT_SESSIONS_ERROR")
    
    def update_session_title(self, session_id: str, title: str) -> bool:
        """Update session title."""
        try:
            with self.db_service:
                session = self.db_service.db.query(ChatSession).filter(
                    ChatSession.id == session_id
                ).first()
                
                if session:
                    session.title = title
                    session.updated_at = datetime.utcnow()
                    self.db_service.db.commit()
                    logger.info(f"Updated title for session {session_id}")
                    return True
                else:
                    logger.warning(f"Session {session_id} not found")
                    return False
                    
        except Exception as e:
            logger.error(f"Error updating session title: {str(e)}")
            raise DatabaseException(f"Failed to update session title: {str(e)}", "SESSION_UPDATE_ERROR")
    
    def delete_session(self, session_id: str) -> bool:
        """Delete a chat session and all its messages."""
        try:
            with self.db_service:
                # Delete messages first (foreign key constraint)
                deleted_messages = (self.db_service.db.query(ChatMessage)
                                  .filter(ChatMessage.session_id == session_id)
                                  .delete())
                
                # Delete session
                deleted_session = (self.db_service.db.query(ChatSession)
                                 .filter(ChatSession.id == session_id)
                                 .delete())
                
                self.db_service.db.commit()
                
                if deleted_session > 0:
                    logger.info(f"Deleted session {session_id} and {deleted_messages} messages")
                    return True
                else:
                    logger.warning(f"Session {session_id} not found for deletion")
                    return False
                    
        except Exception as e:
            self.db_service.db.rollback()
            logger.error(f"Error deleting session: {str(e)}")
            raise DatabaseException(f"Failed to delete session: {str(e)}", "SESSION_DELETE_ERROR")
