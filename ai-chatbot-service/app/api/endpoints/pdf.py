from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from fastapi.responses import JSONResponse
from typing import List, Dict, Any, Optional
import os
from pathlib import Path

from app.services.pdf_service import pdf_service
from app.services.enhanced_chat_service import enhanced_chat_service
from app.services.database_service import DatabaseService
from app.services.knowledge_service import delete_document_from_vectorstore
from app.api.dependencies import get_current_user
from app.core.exceptions import VectorStoreException, DatabaseException
from app.core.logging import get_logger
from pydantic import BaseModel

logger = get_logger()

router = APIRouter(prefix="/pdf", tags=["PDF"])

class ChatRequest(BaseModel):
    message: str
    student_id: Optional[str] = None
    session_id: Optional[str] = None
    use_pdf_only: Optional[bool] = False

class ChatResponse(BaseModel):
    response: str
    sources: List[str]
    pdf_documents_used: int

@router.post("/upload")
async def upload_pdf(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    source: Optional[str] = Form(None),
    level: Optional[str] = Form(None),
    subjects: Optional[List[str]] = Form(None),
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
                    "subjects": subjects or []
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
            session_id=request.session_id
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
