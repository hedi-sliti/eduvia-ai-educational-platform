from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from app.models.schemas import IngestRequest, IngestResponse
from app.services.knowledge_service import ingest_text_to_vectorstore, delete_document_from_vectorstore
from app.services.database_service import DatabaseService
from app.api.dependencies import get_current_user
from app.core.logging import get_logger
from pydantic import BaseModel, Field
import uuid
from typing import Optional, Dict, Any, List
from datetime import datetime
import os
from app.services.pdf_service import pdf_service

router = APIRouter()
logger = get_logger()

class IngestRawRequest(BaseModel):
    """Accepts arbitrary text plus metadata for ingestion (Nest/frontend contract)."""
    text: str = Field(..., min_length=1, description="Full text content to index")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)


class KnowledgeUpdateRequest(BaseModel):
    title: Optional[str] = None
    level: Optional[str] = None
    subjects: Optional[List[str]] = None
    text: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

@router.post("/ingest", response_model=IngestResponse, summary="Ingest Knowledge", description="Add knowledge content to the knowledge base with level and subject information.")
async def ingest_knowledge(request: IngestRequest, current_user: dict = Depends(get_current_user)):
    """
    Ingest knowledge into the knowledge base.
    
    - **title**: Title or name of the knowledge item (required)
    - **level**: Education level (1st year, 2nd year, 3A, 4ERP-BI, 4TWIN, 5ERP-BI, 5TWIN)
    - **subjects**: List of subjects related to this knowledge (required, at least one)
    - **metadata**: Optional additional metadata for the document
    
    Returns confirmation of successful ingestion with document ID.
    """
    try:
        logger.info(f"Knowledge ingestion request from user: {current_user['user_id']} - Title: {request.title}, Level: {request.level}")
        
        # Generate document ID
        doc_id = str(uuid.uuid4())
        
        # Build metadata including level and subjects
        metadata = request.metadata or {}
        metadata["document_id"] = doc_id
        metadata["ingested_by"] = current_user["user_id"]
        metadata["title"] = request.title
        metadata["level"] = request.level
        metadata["subjects"] = request.subjects
        metadata["status"] = "active"
        
        # Generate synthetic content for vector store from title and subjects
        # This allows the chatbot to retriev knowledge items based on level and subjects
        synthetic_content = f"Title: {request.title}\nLevel: {request.level}\nSubjects: {', '.join(request.subjects)}"
        
        returned_doc_id = ingest_text_to_vectorstore(text=synthetic_content, metadata=metadata)

        # Persist metadata/content to relational store for visibility
        try:
            with DatabaseService() as db:
                db.create_knowledge_document(
                    title=request.title,
                    content=synthetic_content,
                    metadata=metadata,
                    document_id=returned_doc_id
                )
        except Exception as db_err:
            logger.warning(f"Knowledge ingested but failed to persist to DB: {db_err}")
        
        logger.info(f"Successfully ingested knowledge document: {returned_doc_id} - Level: {request.level}, Subjects: {request.subjects}")
        
        return IngestResponse(
            message="Knowledge successfully added to the knowledge base.",
            document_id=returned_doc_id
        )
    except Exception as e:
        logger.error(f"Knowledge ingestion failed: {str(e)}")
        raise

@router.post("/ingest/raw", response_model=IngestResponse, summary="Ingest raw text", description="Add arbitrary text plus metadata to the knowledge base.")
async def ingest_raw_knowledge(request: IngestRawRequest, current_user: dict = Depends(get_current_user)):
    """
    Ingest arbitrary text into the knowledge base.

    - **text**: Full text content to index
    - **metadata**: Optional metadata dict (e.g., title, level, subjects)
    """
    try:
        document_id = request.metadata.get("document_id") if request.metadata else None
        if not document_id:
            document_id = str(uuid.uuid4())

        metadata = request.metadata or {}
        metadata["document_id"] = document_id
        metadata["ingested_by"] = current_user.get("user_id", "anonymous")
        metadata.setdefault("status", "active")

        returned_doc_id = ingest_text_to_vectorstore(text=request.text, metadata=metadata)

        # Persist to relational store when title provided in metadata
        try:
            with DatabaseService() as db:
                db.create_knowledge_document(
                    title=metadata.get("title", "Untitled Document"),
                    content=request.text,
                    metadata=metadata,
                    document_id=returned_doc_id
                )
        except Exception as db_err:
            logger.warning(f"Raw knowledge ingested but failed to persist to DB: {db_err}")

        logger.info(f"Raw knowledge ingested: {returned_doc_id}")
        return IngestResponse(
            message="Knowledge successfully added to the knowledge base.",
            document_id=returned_doc_id
        )
    except Exception as e:
        logger.error(f"Raw knowledge ingestion failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to ingest knowledge")


@router.get("/documents")
async def list_knowledge_documents(current_user: dict = Depends(get_current_user)):
    """List all knowledge documents (manual and PDF)."""
    try:
        with DatabaseService() as db:
            documents = db.get_all_knowledge_documents()

        documents = sorted(documents, key=lambda d: d.created_at or datetime.min, reverse=True)

        result = []
        for doc in documents:
            meta = doc.doc_metadata or {}
            result.append({
                "id": doc.id,
                "document_id": doc.document_id,
                "title": doc.title,
                "level": meta.get("level"),
                "subjects": meta.get("subjects", []),
                "file_type": meta.get("file_type", "text"),
                "source": meta.get("source", doc.source),
                "status": meta.get("status", "active"),
                "metadata": meta,
                "created_at": doc.created_at.isoformat() if doc.created_at else None,
                "updated_at": doc.updated_at.isoformat() if doc.updated_at else None,
            })

        return {"documents": result, "count": len(result)}
    except Exception as e:
        logger.error(f"Error listing knowledge documents: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to list documents")


@router.get("/documents/{document_id}")
async def get_knowledge_document(document_id: str, current_user: dict = Depends(get_current_user)):
    try:
        with DatabaseService() as db:
            doc = db.get_knowledge_document(document_id)
            if not doc:
                raise HTTPException(status_code=404, detail="Document not found")

            meta = doc.doc_metadata or {}
            return {
                "id": doc.id,
                "document_id": doc.document_id,
                "title": doc.title,
                "content": doc.content,
                "metadata": meta,
                "status": meta.get("status", "active"),
                "created_at": doc.created_at.isoformat() if doc.created_at else None,
                "updated_at": doc.updated_at.isoformat() if doc.updated_at else None,
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving document {document_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve document")


@router.delete("/documents/{document_id}")
async def delete_knowledge_document(document_id: str, current_user: dict = Depends(get_current_user)):
    """Delete from DB, filesystem (if any), and vector store."""
    try:
        with DatabaseService() as db:
            doc = db.get_knowledge_document(document_id)
            if not doc:
                raise HTTPException(status_code=404, detail="Document not found")

            meta = doc.doc_metadata or {}
            file_path = meta.get("file_path")

            # Delete vector store chunks
            chunks_removed = delete_document_from_vectorstore(document_id)

            # Delete file if exists
            if file_path and os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except Exception as fs_err:
                    logger.warning(f"Failed to remove file {file_path}: {fs_err}")

            # Delete DB record
            db.delete_knowledge_document(document_id)

        return {
            "message": "Document deleted successfully",
            "chunks_removed": chunks_removed
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting document {document_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to delete document")


@router.put("/documents/{document_id}")
async def update_knowledge_document(
    document_id: str,
    title: Optional[str] = Form(None),
    level: Optional[str] = Form(None),
    subjects: Optional[List[str]] = Form(None),
    text: Optional[str] = Form(None),
    file: UploadFile = File(None),
    current_user: dict = Depends(get_current_user)
):
    """Replace content/metadata in place, reusing the same document_id."""
    try:
        with DatabaseService() as db:
            existing = db.get_knowledge_document(document_id)
            if not existing:
                raise HTTPException(status_code=404, detail="Document not found")

            meta = existing.doc_metadata or {}

            # Merge metadata updates
            if level:
                meta["level"] = level
            if subjects is not None:
                # Handle single string case or list
                if isinstance(subjects, str):
                    subjects = [subjects]
                meta["subjects"] = subjects
            if title:
                meta["title"] = title
            meta.setdefault("source", meta.get("source", "knowledge_update"))

            new_content = existing.content

            # If PDF file supplied, replace content and metadata using pdf_service
            if file:
                if not file.filename.lower().endswith('.pdf'):
                    raise HTTPException(status_code=400, detail="Only PDF files are allowed")

                pdf_bytes = await file.read()

                # Remove old file from disk if present
                old_path = meta.get("file_path")
                if old_path and os.path.exists(old_path):
                    try:
                        os.remove(old_path)
                    except Exception as fs_err:
                        logger.warning(f"Failed to remove old file {old_path}: {fs_err}")

                saved_path = pdf_service.save_uploaded_pdf(pdf_bytes, file.filename)

                meta["file_type"] = "pdf"
                meta["file_path"] = saved_path
                meta["original_filename"] = file.filename
                meta["uploaded_by"] = current_user.get("user_id", "anonymous")

                # Extract text and re-ingest using existing document_id
                extracted_text = pdf_service.extract_text_from_pdf(saved_path)
                if not extracted_text.strip():
                    raise HTTPException(status_code=400, detail="PDF appears to be empty")

                delete_document_from_vectorstore(document_id)
                ingest_text_to_vectorstore(extracted_text, {**meta, "document_id": document_id})
                new_content = extracted_text

            else:
                # Handle text or metadata-only update
                if text is not None:
                    new_content = text
                # Avoid empty ingestion (Chroma requires non-empty embeddings)
                if not (new_content or "").strip():
                    new_content = f"Document {title or existing.title or document_id} (metadata update)"

                delete_document_from_vectorstore(document_id)
                ingest_text_to_vectorstore(new_content, {**meta, "document_id": document_id})

            updated = db.update_knowledge_document(
                document_id=document_id,
                title=title or existing.title,
                content=new_content,
                metadata=meta
            )

        return {
            "message": "Document updated successfully",
            "document_id": document_id,
            "updated_at": updated.updated_at.isoformat() if updated else None
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating document {document_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to update document: {str(e)}")
