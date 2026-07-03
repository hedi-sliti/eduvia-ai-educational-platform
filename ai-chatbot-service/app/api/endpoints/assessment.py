import json
import re
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field
from langchain_core.prompts import PromptTemplate
from app.models.schemas import AssessmentRequest, AssessmentResponse
from app.services.assessment_service import analyze_student_assessment
from app.services.database_service import DatabaseService
from app.api.dependencies import get_current_user
from app.core.logging import get_logger
from app.core.llm import get_llm
from app.core.config import settings

router = APIRouter()
logger = get_logger()

class WrongAnswerItem(BaseModel):
    question: str
    explanation: Optional[str] = None
    selectedAnswer: Optional[str] = None
    correctAnswer: Optional[str] = None

class RevisionPlanRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    course_id: Optional[str] = Field(default=None, alias="courseId")
    course_title: Optional[str] = Field(default=None, alias="courseTitle")
    quiz_title: Optional[str] = Field(default=None, alias="quizTitle")
    wrong_answers: List[WrongAnswerItem] = Field(default_factory=list, alias="wrongAnswers")

def _extract_json_payload(text: Any) -> Dict[str, Any]:
    raw_text = str(text or "").strip()
    raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text, flags=re.IGNORECASE)
    raw_text = re.sub(r"\s*```$", "", raw_text)
    object_match = re.search(r"\{.*\}", raw_text, flags=re.DOTALL)
    candidates = [raw_text, object_match.group(0) if object_match else ""]

    for candidate in candidates:
        if not candidate:
            continue
        try:
            parsed = json.loads(candidate)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            continue

    raise ValueError("AI response was not valid JSON")

def _normalize_revision_plan(payload: Dict[str, Any], request: RevisionPlanRequest, related_pdf: Optional[str]) -> List[Dict[str, Any]]:
    raw_items = payload.get("revisionPlan") or payload.get("revision_plan") or payload.get("weakTopics") or []
    if not isinstance(raw_items, list):
        raise ValueError("JSON payload does not contain a revision plan list")

    plan: List[Dict[str, Any]] = []
    for item in raw_items:
        if not isinstance(item, dict):
            continue
        topic = str(item.get("weakConcept") or item.get("weak_concept") or item.get("topic") or "").strip()
        if not topic:
            continue
        suggested_question = str(
            item.get("suggestedChatbotQuestion") or
            item.get("suggested_chatbot_question") or
            f"Can you explain {topic} for {request.course_title or 'this course'} using the course PDF?"
        ).strip()
        priority_text = str(item.get("priority") or "MEDIUM").upper()
        if priority_text not in ["LOW", "MEDIUM", "HIGH"]:
            priority_text = "MEDIUM"
        plan.append({
            "weakConcept": topic,
            "reason": str(item.get("reason") or "This concept was linked to an incorrect quiz answer.").strip(),
            "recommendedAction": str(item.get("recommendedAction") or item.get("recommended_action") or "Review the related PDF section and ask the chatbot for a worked explanation.").strip(),
            "relatedCourse": str(item.get("relatedCourse") or request.course_title or "Selected course").strip(),
            "relatedPdf": str(item.get("relatedPdf") or related_pdf or "").strip(),
            "suggestedChatbotQuestion": suggested_question,
            "priority": priority_text,
        })

    if not plan:
        raise ValueError("No valid revision items were generated")
    return plan

def _fallback_revision_plan(request: RevisionPlanRequest, related_pdf: Optional[str]) -> List[Dict[str, Any]]:
    plan: List[Dict[str, Any]] = []
    for index, wrong in enumerate(request.wrong_answers[:5], start=1):
        words = re.findall(r"[A-Za-z][A-Za-z0-9-]{3,}", wrong.question)
        topic = " ".join(words[:4]) or f"Quiz concept {index}"
        reason = wrong.explanation or f"You selected {wrong.selectedAnswer or 'an incorrect answer'} instead of {wrong.correctAnswer or 'the correct answer'}."
        plan.append({
            "weakConcept": topic,
            "reason": reason,
            "recommendedAction": "Review the related course PDF, then ask the chatbot for a simple explanation and one practice question.",
            "relatedCourse": request.course_title or "Selected course",
            "relatedPdf": related_pdf or "",
            "suggestedChatbotQuestion": f"Can you explain {topic} using the {request.course_title or 'selected course'} PDF and give me one practice question?",
            "priority": "HIGH" if index <= 2 else "MEDIUM",
        })
    return plan

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

@router.post("/revision-plan", summary="Generate quiz revision plan")
async def generate_revision_plan(request: RevisionPlanRequest, current_user: dict = Depends(get_current_user)):
    """Generate a structured personalized revision plan from quiz wrong answers."""
    try:
        if not request.wrong_answers:
            return {"revisionPlan": [], "weakTopics": []}

        related_pdf = None
        pdf_context = ""
        if request.course_id:
            with DatabaseService() as db:
                pdf_docs = db.get_pdf_documents()
                for doc in pdf_docs:
                    metadata = doc.doc_metadata or {}
                    if metadata.get("course_id") == request.course_id:
                        related_pdf = doc.title
                        pdf_context = (doc.content or "")[:5000]
                        break

        wrong_answer_text = "\n".join(
            [
                f"- Question: {item.question}\n  Selected: {item.selectedAnswer or 'N/A'}\n  Correct: {item.correctAnswer or 'N/A'}\n  Explanation: {item.explanation or 'N/A'}"
                for item in request.wrong_answers
            ]
        )

        prompt = PromptTemplate(
            input_variables=["course_title", "quiz_title", "wrong_answers", "pdf_context"],
            template="""You create personalized revision plans for Eduvia quiz attempts.
Use the wrong answers and the related course PDF context only.
Return STRICT JSON only. Do not include markdown or extra text.

JSON shape:
{{
  "revisionPlan": [
    {{
      "weakConcept": "short topic name",
      "reason": "why this looks weak",
      "recommendedAction": "specific next study action",
      "relatedCourse": "course name",
      "relatedPdf": "PDF title if known",
      "suggestedChatbotQuestion": "question the student can ask the chatbot",
      "priority": "HIGH"
    }}
  ]
}}

COURSE: {course_title}
QUIZ: {quiz_title}
WRONG ANSWERS:
{wrong_answers}

RELATED PDF CONTEXT:
{pdf_context}
"""
        )

        chain = prompt | get_llm()
        try:
            ai_response = chain.invoke({
                "course_title": request.course_title or "Selected course",
                "quiz_title": request.quiz_title or "Quiz",
                "wrong_answers": wrong_answer_text,
                "pdf_context": pdf_context or "No related PDF text was found.",
            })
        except Exception as e:
            fallback_model = getattr(settings, "OLLAMA_FALLBACK_MODEL", None)
            if not fallback_model:
                raise
            logger.warning(f"Primary revision model failed ({e}); retrying with fallback '{fallback_model}'")
            chain = prompt | get_llm(model_override=fallback_model)
            ai_response = chain.invoke({
                "course_title": request.course_title or "Selected course",
                "quiz_title": request.quiz_title or "Quiz",
                "wrong_answers": wrong_answer_text,
                "pdf_context": pdf_context or "No related PDF text was found.",
            })

        try:
            parsed = _extract_json_payload(ai_response)
            revision_plan = _normalize_revision_plan(parsed, request, related_pdf)
        except Exception as parse_error:
            logger.warning(f"Invalid AI revision JSON; using fallback: {parse_error}")
            revision_plan = _fallback_revision_plan(request, related_pdf)

        return {
            "revisionPlan": revision_plan,
            "weakTopics": [item["weakConcept"] for item in revision_plan],
        }
    except Exception as e:
        logger.error(f"Revision plan generation failed: {str(e)}", exc_info=True)
        revision_plan = _fallback_revision_plan(request, None)
        return {
            "revisionPlan": revision_plan,
            "weakTopics": [item["weakConcept"] for item in revision_plan],
        }
