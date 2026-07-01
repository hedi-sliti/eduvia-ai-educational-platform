"""
Updated PDF endpoints with proper document management
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
from app.services.document_management_service import document_management_service
from app.services.improved_chat_service import improved_chat_service
from app.core.auth import get_current_user
from app.core.logging import get_logger
from typing import Dict, Any, List
import tempfile
import os
from PyPDF2 import PdfReader

logger = get_logger()
router = APIRouter(prefix="/pdf", tags=["pdf"])

@router.post("/upload")
async def upload_pdf_improved(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload PDF with proper document management"""
    try:
        if not file.filename.endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")
        
        # Read PDF content
        contents = await file.read()
        
        # Extract text from PDF
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
            temp_file.write(contents)
            temp_file.flush()
            
            with open(temp_file.name, 'rb') as pdf_file:
                pdf_reader = PdfReader(pdf_file)
                text_content = ""
                for page in pdf_reader.pages:
                    text_content += page.extract_text()
        
        # Clean up temp file
        os.unlink(temp_file.name)
        
        if not text_content.strip():
            raise HTTPException(status_code=400, detail="PDF appears to be empty or unreadable")
        
        # Add document with proper management
        document_id = document_management_service.add_pdf_document(
            title=file.filename.replace('.pdf', ''),
            content=text_content,
            file_path=file.filename,
            metadata={
                "uploaded_by": current_user.get("user_id", "unknown"),
                "file_size": len(contents),
                "original_filename": file.filename
            }
        )
        
        return {
            "message": "PDF uploaded successfully",
            "document_id": document_id,
            "filename": file.filename,
            "content_length": len(text_content)
        }
        
    except Exception as e:
        logger.error(f"Error uploading PDF: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to upload PDF: {str(e)}")

@router.post("/chat")
async def chat_with_pdfs_improved(
    request: dict,
    current_user: dict = Depends(get_current_user)
):
    """Chat using only active PDF documents"""
    try:
        query = request.get("message", "")
        student_id = request.get("student_id", current_user.get("user_id"))
        session_id = request.get("session_id")
        
        if not query:
            raise HTTPException(status_code=400, detail="Message is required")
        
        # Generate response using improved service
        response_text, sources = improved_chat_service.generate_response(
            query=query,
            student_id=student_id,
            session_id=session_id
        )
        
        return {
            "response": response_text,
            "sources": sources,
            "document_count": len(sources)
        }
        
    except Exception as e:
        logger.error(f"Error in PDF chat: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate response: {str(e)}")

@router.get("/documents")
async def get_pdf_documents_improved(
    current_user: dict = Depends(get_current_user)
):
    """Get list of active PDF documents"""
    try:
        documents = improved_chat_service.get_active_document_list()
        return {
            "documents": documents,
            "count": len(documents)
        }
        
    except Exception as e:
        logger.error(f"Error getting PDF documents: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get documents: {str(e)}")

@router.get("/documents/{document_id}")
async def get_pdf_document_details_improved(
    document_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get details of a specific PDF document"""
    try:
        documents = improved_chat_service.get_active_document_list()
        
        for doc in documents:
            if doc["document_id"] == document_id:
                return doc
        
        raise HTTPException(status_code=404, detail="Document not found")
        
    except Exception as e:
        logger.error(f"Error getting document details: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get document details: {str(e)}")

@router.delete("/documents/{document_id}")
async def delete_pdf_document_improved(
    document_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a PDF document completely"""
    try:
        success = document_management_service.delete_pdf_document(document_id)
        
        if success:
            return {"message": f"Document {document_id} deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="Document not found")
        
    except Exception as e:
        logger.error(f"Error deleting document: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to delete document: {str(e)}")

@router.get("/manifest")
async def get_document_manifest(
    current_user: dict = Depends(get_current_user)
):
    """Get document manifest showing system status"""
    try:
        manifest = document_management_service.get_document_manifest()
        return manifest
        
    except Exception as e:
        logger.error(f"Error getting manifest: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get manifest: {str(e)}")

@router.post("/cleanup")
async def cleanup_orphaned_documents(
    current_user: dict = Depends(get_current_user)
):
    """Clean up orphaned documents from vector store"""
    try:
        result = document_management_service.cleanup_orphaned_documents()
        return result
        
    except Exception as e:
        logger.error(f"Error during cleanup: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to cleanup: {str(e)}")

@router.post("/reset")
async def reset_vector_store(
    current_user: dict = Depends(get_current_user)
):
    """Completely reset vector store (DANGEROUS - use with caution)"""
    try:
        from app.services.document_management_service import document_management_service
        
        # Get confirmation
        collection = document_management_service.vector_store._collection
        collection.delete(where={})
        
        return {
            "message": "Vector store completely reset",
            "warning": "All documents have been removed from the vector store"
        }
        
    except Exception as e:
        logger.error(f"Error resetting vector store: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to reset vector store: {str(e)}")
