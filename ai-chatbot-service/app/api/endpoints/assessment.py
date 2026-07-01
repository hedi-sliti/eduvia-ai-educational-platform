from fastapi import APIRouter, Depends
from app.models.schemas import AssessmentRequest, AssessmentResponse
from app.services.assessment_service import analyze_student_assessment
from app.api.dependencies import get_current_user
from app.core.logging import get_logger

router = APIRouter()
logger = get_logger()

@router.post("/", response_model=AssessmentResponse, summary="Analyze Student Assessment", description="Analyze student assessment answers to determine learning style and competency level.")
async def analyze_assessment(request: AssessmentRequest, current_user: dict = Depends(get_current_user)):
    """
    Analyze student assessment answers.
    
    - **answers**: Dictionary of assessment question answers
    
    Returns learning style analysis with recommendations.
    """
    try:
        logger.info(f"Assessment request from user: {current_user['user_id']}")
        
        # Run structured learning style extraction via LLM
        result = analyze_student_assessment(request.answers)
        
        logger.info(f"Assessment completed: {result.get('learning_style', 'Unknown')}")
        
        return AssessmentResponse(
            learning_style=result.get("learning_style", "Unclassified"),
            competency_level=result.get("competency_level", "Beginner"),
            recommendations=result.get("recommendations", [])
        )
    except Exception as e:
        logger.error(f"Assessment analysis failed: {str(e)}")
        raise
