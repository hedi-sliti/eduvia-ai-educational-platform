from fastapi import APIRouter, Depends
from app.models.schemas import ChatRequest, ChatResponse
from app.services.chat_service import generate_chat_response
from app.api.dependencies import get_current_user
from app.core.logging import get_logger
from datetime import datetime
import httpx

router = APIRouter()
logger = get_logger()

@router.post("/", response_model=ChatResponse, summary="Chat with AI Tutor", description="Send a message to the AI tutor and get a response with context from the knowledge base.")
async def chat_interaction(request: ChatRequest, current_user: dict = Depends(get_current_user)):
    """
    Chat with the AI tutor.
    
    - **message**: The question or message from the student
    - **student_id**: Optional student ID for personalization
    - **session_id**: Optional session ID for conversation context
    
    Returns a response with AI answer, relevant sources, and the `session_id`
    so the client can continue the conversation with full context.
    """
    try:
        logger.info(f"Chat request from user: {current_user['user_id']}")
        
        # Execute actual LangChain generation
        answer_text, answer_sources, session_id = generate_chat_response(
            query=request.message,
            student_id=request.student_id or current_user["user_id"],
            session_id=request.session_id,
            level=request.level,
            subjects=request.subjects,
            course_id=request.course_id,
            course_title=request.course_title
        )
        

        
        return ChatResponse(
            response=answer_text,
            sources=answer_sources,
            session_id=session_id
        )
    except Exception as e:
        logger.error(f"Chat interaction failed: {str(e)}")
        raise
