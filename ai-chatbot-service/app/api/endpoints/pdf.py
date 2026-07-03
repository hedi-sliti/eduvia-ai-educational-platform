from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from fastapi.responses import JSONResponse
from typing import List, Dict, Any, Optional
import os
import json
import re
from pathlib import Path

from app.services.pdf_service import pdf_service
from app.services.enhanced_chat_service import enhanced_chat_service
from app.services.database_service import DatabaseService
from app.services.knowledge_service import delete_document_from_vectorstore
from app.api.dependencies import get_current_user
from app.core.exceptions import VectorStoreException, DatabaseException
from app.core.logging import get_logger
from app.core.llm import get_llm
from app.core.config import settings
from langchain_core.prompts import PromptTemplate
from pydantic import BaseModel, ConfigDict, Field

logger = get_logger()

router = APIRouter(prefix="/pdf", tags=["PDF"])

class ChatRequest(BaseModel):
    message: str
    student_id: Optional[str] = None
    session_id: Optional[str] = None
    use_pdf_only: Optional[bool] = False
    course_id: Optional[str] = None
    course_title: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    sources: List[str]
    pdf_documents_used: int

class GenerateQuizRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    course_id: str = Field(alias="courseId")
    document_id: Optional[str] = Field(default=None, alias="documentId")
    filename: Optional[str] = None
    number_of_questions: int = Field(default=5, alias="numberOfQuestions")

def _extract_json_payload(text: Any) -> Dict[str, Any]:
    raw_text = str(text or "").strip()
    raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text, flags=re.IGNORECASE)
    raw_text = re.sub(r"\s*```$", "", raw_text)

    candidates = [raw_text]
    object_match = re.search(r"\{.*\}", raw_text, flags=re.DOTALL)
    array_match = re.search(r"\[.*\]", raw_text, flags=re.DOTALL)
    if object_match:
        candidates.append(object_match.group(0))
    if array_match:
        candidates.append(array_match.group(0))

    for candidate in candidates:
        try:
            parsed = json.loads(candidate)
            if isinstance(parsed, list):
                return {"questions": parsed}
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            continue

    raise ValueError("AI response was not valid JSON")

def _normalize_generated_questions(payload: Dict[str, Any], number_of_questions: int) -> List[Dict[str, Any]]:
    raw_questions = payload.get("questions", [])
    if not isinstance(raw_questions, list):
        raise ValueError("JSON payload does not contain a questions list")

    questions: List[Dict[str, Any]] = []
    for item in raw_questions:
        if not isinstance(item, dict):
            continue

        prompt = str(item.get("prompt") or item.get("question") or "").strip()
        options = item.get("options") or []
        if not isinstance(options, list):
            continue
        options = [str(option).strip() for option in options if str(option).strip()]

        correct_option = item.get("correctOption", item.get("correct_option", item.get("answerIndex", 0)))
        if isinstance(correct_option, str):
            if correct_option.upper() in ["A", "B", "C", "D"]:
                correct_option = ord(correct_option.upper()) - ord("A")
            else:
                try:
                    correct_option = int(correct_option)
                except ValueError:
                    correct_option = 0

        if prompt and len(options) == 4:
            correct_option = int(correct_option or 0)
            correct_option = max(0, min(correct_option, 3))
            questions.append({
                "prompt": prompt,
                "options": options,
                "correctOption": correct_option,
                "explanation": str(item.get("explanation") or "").strip()
            })

        if len(questions) >= number_of_questions:
            break

    if not questions:
        raise ValueError("No valid quiz questions were generated")

    return questions

def _fallback_questions_from_content(content: str, number_of_questions: int) -> List[Dict[str, Any]]:
    sentences = [
        sentence.strip()
        for sentence in re.split(r"(?<=[.!?])\s+", content)
        if len(sentence.strip()) > 20
    ]
    key_sentences = sentences[:number_of_questions] or [content[:240].strip()]
    if key_sentences:
        while len(key_sentences) < number_of_questions:
            key_sentences.append(key_sentences[len(key_sentences) % len(key_sentences)])
    questions = []

    for index, sentence in enumerate(key_sentences[:number_of_questions], start=1):
        correct = sentence[:180].rstrip(".")
        prompts = [
            f"According to the selected PDF, which statement best matches key idea {index}?",
            f"What does the selected PDF state about item {index}?",
            f"Which answer is supported by the selected PDF for question {index}?",
            f"Based on the selected PDF, what is the correct detail for item {index}?",
            f"Which option accurately reflects the selected PDF for item {index}?",
        ]
        questions.append({
            "prompt": prompts[(index - 1) % len(prompts)],
            "options": [
                correct,
                "This topic is not discussed in the selected PDF",
                "The selected PDF says the opposite of this idea",
                "The selected PDF only covers administrative course details"
            ],
            "correctOption": 0,
            "explanation": correct
        })

    return questions

@router.post("/upload")
async def upload_pdf(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    source: Optional[str] = Form(None),
    level: Optional[str] = Form(None),
    subjects: Optional[List[str]] = Form(None),
    course_id: Optional[str] = Form(None, alias="courseId"),
    course_title: Optional[str] = Form(None, alias="courseTitle"),
    current_user: Dict = Depends(get_current_user)
):
    """Upload a PDF file and add it to the knowledge base."""
    try:
        logger.info(f"Uploading PDF file: {file.filename}, level: {level}, subjects: {subjects}")
        
        # Validate file type
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")
        
        # Read file content
        pdf_content = await file.read()
        
        # Save uploaded file
        file_path = pdf_service.save_uploaded_pdf(pdf_content, file.filename)
        
        # Process PDF and add to vector store
        processed_metadata = {
            "uploaded_by": current_user.get("user_id", "anonymous")
        }
        if level:
            processed_metadata["level"] = level
        if subjects:
            processed_metadata["subjects"] = subjects
        if course_id:
            processed_metadata["course_id"] = course_id
        if course_title:
            processed_metadata["course_title"] = course_title
        processed_metadata["status"] = "active"

        document_id = pdf_service.process_pdf_file(
            pdf_path=file_path,
            title=title or file.filename,
            source=source or f"upload:{file.filename}",
            metadata=processed_metadata
        )
        
        # Save to database
        with DatabaseService() as db:
            # Extract text content for database storage
            text_content = pdf_service.extract_text_from_pdf(file_path)
            
            db.create_knowledge_document(
                title=title or file.filename,
                content=text_content,
                metadata={
                    "file_type": "pdf",
                    "file_path": file_path,
                    "uploaded_by": current_user.get("user_id", "anonymous"),
                    "original_filename": file.filename,
                    "level": level,
                    "subjects": subjects or [],
                    "course_id": course_id,
                    "course_title": course_title
                },
                document_id=document_id
            )
        
        logger.info(f"Successfully uploaded and processed PDF: {file.filename}")
        
        return JSONResponse(
            status_code=200,
            content={
                "message": "PDF uploaded and processed successfully",
                "document_id": document_id,
                "filename": file.filename,
                "title": title or file.filename
            }
        )
        
    except VectorStoreException as e:
        logger.error(f"PDF processing error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"PDF processing failed: {str(e)}")
    except DatabaseException as e:
        logger.error(f"Database error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database operation failed: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error uploading PDF: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/generate-quiz")
async def generate_quiz_from_pdf(
    request: GenerateQuizRequest,
    current_user: Dict = Depends(get_current_user)
):
    """Generate MCQ quiz questions from one selected course PDF."""
    try:
        number_of_questions = max(1, min(request.number_of_questions or 5, 10))

        with DatabaseService() as db:
            pdf_docs = db.get_pdf_documents()
            selected_doc = None
            for doc in pdf_docs:
                metadata = doc.doc_metadata or {}
                matches_document = request.document_id and doc.document_id == request.document_id
                matches_filename = request.filename and metadata.get("original_filename") == request.filename
                if matches_document or matches_filename:
                    selected_doc = doc
                    break

            if not selected_doc:
                raise HTTPException(status_code=404, detail="Selected PDF document was not found")

            metadata = selected_doc.doc_metadata or {}
            if metadata.get("course_id") != request.course_id:
                raise HTTPException(status_code=400, detail="Selected PDF does not belong to the selected course")

            content = (selected_doc.content or "").strip()
            if not content:
                raise HTTPException(status_code=400, detail="Selected PDF has no extractable text")

            course_title = metadata.get("course_title") or "the selected course"
            context = content[:10000]

        prompt = PromptTemplate(
            input_variables=["course_title", "document_title", "number_of_questions", "context"],
            template="""You generate teacher-reviewable multiple choice quiz drafts from one uploaded course PDF.
Use ONLY the PDF context below for course "{course_title}".
Return STRICT JSON only. Do not include markdown, comments, or extra text.

Required JSON shape:
{{
  "questions": [
    {{
      "prompt": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctOption": 0,
      "explanation": "Short explanation from the PDF"
    }}
  ]
}}

Rules:
- Generate exactly {number_of_questions} questions.
- Every question must have exactly 4 options.
- correctOption must be the zero-based index of the right option.
- Keep questions factual and answerable from this PDF only.

PDF TITLE: {document_title}
PDF CONTEXT:
{context}
"""
        )

        chain = prompt | get_llm()
        try:
            ai_response = chain.invoke({
                "course_title": course_title,
                "document_title": selected_doc.title,
                "number_of_questions": number_of_questions,
                "context": context
            })
        except Exception as e:
            fallback_model = getattr(settings, "OLLAMA_FALLBACK_MODEL", None)
            if not fallback_model:
                raise
            logger.warning(f"Primary quiz generation model failed ({e}); retrying with fallback '{fallback_model}'")
            chain = prompt | get_llm(model_override=fallback_model)
            ai_response = chain.invoke({
                "course_title": course_title,
                "document_title": selected_doc.title,
                "number_of_questions": number_of_questions,
                "context": context
            })

        try:
            parsed = _extract_json_payload(ai_response)
            questions = _normalize_generated_questions(parsed, number_of_questions)
            if len(questions) < number_of_questions:
                questions.extend(
                    _fallback_questions_from_content(context, number_of_questions - len(questions))
                )
        except Exception as parse_error:
            logger.warning(f"Invalid AI quiz JSON; using deterministic fallback: {parse_error}")
            questions = _fallback_questions_from_content(context, number_of_questions)

        return JSONResponse(
            status_code=200,
            content={
                "courseId": request.course_id,
                "courseTitle": course_title,
                "documentId": selected_doc.document_id,
                "documentTitle": selected_doc.title,
                "questions": questions[:number_of_questions]
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating quiz from PDF: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate quiz questions")

@router.post("/chat", response_model=ChatResponse)
async def chat_with_pdfs(
    request: ChatRequest,
    current_user: Dict = Depends(get_current_user)
):
    """Chat with AI using PDF documents from the database."""
    try:
        logger.info(f"PDF chat request from user: {current_user.get('student_id', 'anonymous')}")
        
        # Generate enhanced response
        response_text, sources = enhanced_chat_service.generate_enhanced_response(
            query=request.message,
            student_id=request.student_id or current_user.get("student_id", "anonymous"),
            session_id=request.session_id,
            course_id=request.course_id,
            course_title=request.course_title
        )
        
        # Count PDF documents used
        pdf_count = len([source for source in sources if "pdf" in str(source).lower()])
        
        logger.info(f"Generated PDF-enhanced response for user: {current_user.get('student_id', 'anonymous')}")
        
        return ChatResponse(
            response=response_text,
            sources=sources,
            pdf_documents_used=pdf_count
        )
        
    except Exception as e:
        logger.error(f"Error in PDF chat: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate response")

@router.get("/documents")
async def list_pdf_documents(
    current_user: Dict = Depends(get_current_user)
):
    """List all PDF documents in the database."""
    try:
        documents = enhanced_chat_service.get_pdf_document_list()
        
        return JSONResponse(
            status_code=200,
            content={
                "documents": documents,
                "count": len(documents)
            }
        )
        
    except Exception as e:
        logger.error(f"Error listing PDF documents: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve documents")

@router.get("/documents/{document_id}")
async def get_pdf_document(
    document_id: str,
    current_user: Dict = Depends(get_current_user)
):
    """Get details of a specific PDF document."""
    try:
        with DatabaseService() as db:
            documents = db.get_all_knowledge_documents()
            
            for doc in documents:
                if doc.document_id == document_id and doc.doc_metadata and doc.doc_metadata.get('file_type') == 'pdf':
                    return JSONResponse(
                        status_code=200,
                        content={
                            "id": doc.id,
                            "title": doc.title,
                            "source": doc.source,
                            "document_id": doc.document_id,
                            "metadata": doc.doc_metadata,
                            "content_preview": doc.content[:500] + "..." if len(doc.content) > 500 else doc.content,
                            "created_at": doc.created_at.isoformat() if doc.created_at else None
                        }
                    )
        
        raise HTTPException(status_code=404, detail="PDF document not found")
        
    except Exception as e:
        logger.error(f"Error retrieving PDF document: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve document")

@router.delete("/documents/{document_id}")
async def delete_pdf_document(
    document_id: str,
    current_user: Dict = Depends(get_current_user)
):
    """Delete a PDF document from the database, filesystem, and vector store."""
    try:
        with DatabaseService() as db:
            documents = db.get_all_knowledge_documents()

            for doc in documents:
                if doc.document_id == document_id and doc.doc_metadata and doc.doc_metadata.get('file_type') == 'pdf':

                    # 1. Delete physical file from disk
                    file_path = doc.doc_metadata.get('file_path')
                    if file_path and os.path.exists(file_path):
                        os.remove(file_path)
                        logger.info(f"Deleted file from disk: {file_path}")

                    # 2. Delete all embeddings from ChromaDB (fixes the ghost-answer bug)
                    deleted_chunks = delete_document_from_vectorstore(document_id)
                    logger.info(f"Removed {deleted_chunks} vector chunks for document {document_id}")

                    # 3. Delete record from MySQL
                    db.db.delete(doc)
                    db.db.commit()

                    logger.info(f"Deleted PDF document: {document_id}")

                    return JSONResponse(
                        status_code=200,
                        content={
                            "message": "PDF document deleted successfully",
                            "chunks_removed_from_vector_store": deleted_chunks
                        }
                    )

        raise HTTPException(status_code=404, detail="PDF document not found")

    except VectorStoreException as e:
        logger.error(f"Vector store deletion error: {str(e)}")
        try:
            if 'db' in locals():
                db.db.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"Vector store cleanup failed: {str(e)}")
    except Exception as e:
        logger.error(f"Error deleting PDF document: {str(e)}", exc_info=True)
        try:
            if 'db' in locals():
                db.db.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=500, detail="Failed to delete document")
