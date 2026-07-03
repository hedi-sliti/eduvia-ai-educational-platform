from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum

class EducationLevel(str, Enum):
    """Educational levels supported by the knowledge base."""
    FIRST_YEAR = "1st year"
    SECOND_YEAR = "2nd year"
    THIRD_A = "3A"
    FOURTH_ERP_BI = "4ERP-BI"
    FOURTH_TWIN = "4TWIN"
    FIFTH_ERP_BI = "5ERP-BI"
    FIFTH_TWIN = "5TWIN"

class ChatRequest(BaseModel):
    message: str
    student_id: Optional[str] = None
    session_id: Optional[str] = None
    level: Optional[str] = Field(None, description="Education level filter (e.g., '4TWIN')")
    subjects: Optional[List[str]] = Field(None, description="Subject filters to narrow retrieval")
    course_id: Optional[str] = Field(None, description="Course ID filter for uploaded PDF retrieval")
    course_title: Optional[str] = Field(None, description="Course title for display/context")

class ChatResponse(BaseModel):
    response: str
    sources: Optional[List[str]] = None
    session_id: Optional[str] = Field(None, description="Chat session id to keep conversation context")

class IngestRequest(BaseModel):
    title: str = Field(..., min_length=1, description="Title or name of the knowledge item")
    level: EducationLevel = Field(..., description="Education level this knowledge applies to")
    subjects: List[str] = Field(..., min_items=1, description="List of subjects related to this knowledge")
    metadata: Optional[dict] = Field(None, description="Additional metadata to store with the document")

class IngestResponse(BaseModel):
    message: str
    document_id: str

class AssessmentRequest(BaseModel):
    answers: dict

class AssessmentResponse(BaseModel):
    learning_style: str
    competency_level: str
    recommendations: List[str]
