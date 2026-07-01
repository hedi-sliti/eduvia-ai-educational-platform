from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from app.services.session_service import SessionService
from app.api.dependencies import get_current_user
from app.core.logging import get_logger
from app.core.exceptions import DatabaseException

router = APIRouter()
logger = get_logger()

class SessionCreateRequest(BaseModel):
    title: Optional[str] = None
    student_id: Optional[str] = None

class SessionTitleUpdate(BaseModel):
    title: str

class SessionResponse(BaseModel):
    id: str
    title: str
    created_at: str
    updated_at: str
    message_count: int

class ConversationHistoryResponse(BaseModel):
    messages: List[dict]
    session_id: str

@router.post("/", response_model=dict, summary="Create Chat Session", description="Create a new chat session for the current user.")
async def create_session(request: SessionCreateRequest, current_user: dict = Depends(get_current_user)):
    """
    Create a new chat session.
    
    - **title**: Optional title for the session
    """
    try:
        session_service = SessionService()
        student_id = request.student_id or current_user["user_id"]
        session_id = session_service.create_session(student_id, request.title)

        logger.info(f"Created session {session_id} for user {current_user['user_id']}")
        return {
            "session_id": session_id,
            "message": "Chat session created successfully"
        }
    except Exception as e:
        logger.error(f"Failed to create session: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create session")

@router.get("/", response_model=List[SessionResponse], summary="Get User Sessions", description="Get all chat sessions for the current user.")
async def get_user_sessions(current_user: dict = Depends(get_current_user)):
    """
    Get all chat sessions for the current user.
    """
    try:
        session_service = SessionService()
        sessions_list = session_service.get_student_sessions(current_user["user_id"])

        logger.info(f"Retrieved {len(sessions_list)} sessions for user {current_user['user_id']}")
        return sessions_list
    except Exception as e:
        logger.error(f"Failed to get sessions: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve sessions")

@router.get("/{session_id}/history", response_model=ConversationHistoryResponse, summary="Get Conversation History", description="Get the conversation history for a specific session.")
async def get_conversation_history(session_id: str, current_user: dict = Depends(get_current_user)):
    """
    Get the conversation history for a specific session.
    
    - **session_id**: The ID of the chat session
    """
    try:
        session_service = SessionService()
        messages = session_service.get_conversation_history(session_id)

        logger.info(f"Retrieved {len(messages)} messages for session {session_id}")
        return ConversationHistoryResponse(
            messages=messages,
            session_id=session_id
        )
    except Exception as e:
        logger.error(f"Failed to get conversation history: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve conversation history")

@router.put("/{session_id}/title", response_model=dict, summary="Update Session Title", description="Update the title of a chat session.")
async def update_session_title(session_id: str, request: SessionTitleUpdate, current_user: dict = Depends(get_current_user)):
    """
    Update session title.
    
    - **session_id**: The ID of the chat session
    - **title**: The new title for the session
    """
    try:
        session_service = SessionService()
        updated = session_service.update_session_title(session_id, request.title)
        if not updated:
            raise HTTPException(status_code=404, detail="Session not found")

        return {"message": "Session title updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update session title: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update session title")

@router.delete("/{session_id}", response_model=dict, summary="Delete Chat Session", description="Delete a chat session and all its messages.")
async def delete_session(session_id: str, current_user: dict = Depends(get_current_user)):
    """
    Delete a chat session and all its messages.
    
    - **session_id**: The ID of the chat session to delete
    """
    try:
        session_service = SessionService()
        deleted = session_service.delete_session(session_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Session not found")

        logger.info(f"Deleted session {session_id}")
        return {"message": "Session deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete session: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete session")
