import os
import uuid
from typing import List, Dict, Any, Optional
from pathlib import Path
from PyPDF2 import PdfReader
from app.core.logging import get_logger
from app.core.exceptions import VectorStoreException
from app.services.knowledge_service import ingest_text_to_vectorstore

logger = get_logger()

class PDFService:
    """Service for processing PDF files and extracting text content."""
    
    def __init__(self, upload_dir: str = "./uploads"):
        self.upload_dir = Path(upload_dir)
        self.upload_dir.mkdir(exist_ok=True)
    
    def extract_text_from_pdf(self, pdf_path: str) -> str:
        """Extract text content from a PDF file."""
        try:
            logger.info(f"Extracting text from PDF: {pdf_path}")
            
            # Open PDF file
            with open(pdf_path, 'rb') as file:
                reader = PdfReader(file)
                text_content = ""
                
                # Extract text from each page
                for page in reader.pages:
                    page_text = page.extract_text() or ""
                    text_content += page_text
            
            logger.info(f"Extracted {len(text_content)} characters from PDF")
            return text_content
            
        except Exception as e:
            logger.error(f"Error extracting text from PDF {pdf_path}: {str(e)}", exc_info=True)
            raise VectorStoreException(f"Failed to extract text from PDF: {str(e)}", "PDF_EXTRACTION_ERROR")
    
    def process_pdf_file(self, pdf_path: str, title: str = None, source: str = None, metadata: Dict[str, Any] = None) -> str:
        """Process a PDF file and add its content to the vector store."""
        try:
            # Extract text from PDF
            text_content = self.extract_text_from_pdf(pdf_path)

            # Gracefully handle image-only / empty PDFs by ingesting a placeholder
            if not text_content.strip():
                text_content = (title or Path(pdf_path).stem or "Untitled PDF") + "\n"
                text_content += "No extractable text found; likely an image-only PDF."
                if metadata is None:
                    metadata = {}
                metadata["extraction_warning"] = "no_text_found"
            
            # Prepare metadata
            if metadata is None:
                metadata = {}
            
            if title:
                metadata["title"] = title
            else:
                metadata["title"] = Path(pdf_path).stem
            
            if source:
                metadata["source"] = source
            else:
                metadata["source"] = f"pdf_file:{Path(pdf_path).name}"
            
            metadata["file_type"] = "pdf"
            metadata["file_path"] = pdf_path
            metadata.setdefault("status", "active")
            
            # Generate document ID
            document_id = str(uuid.uuid4())
            metadata["document_id"] = document_id
            
            # Ingest to vector store
            doc_group_id = ingest_text_to_vectorstore(text_content, metadata)
            
            logger.info(f"Successfully processed PDF: {title or Path(pdf_path).name}")
            return document_id

        except Exception as e:
            logger.error(f"Error processing PDF file {pdf_path}: {str(e)}", exc_info=True)
            raise VectorStoreException(f"Failed to process PDF: {str(e)}", "PDF_PROCESSING_ERROR")
    
    def save_uploaded_pdf(self, pdf_content: bytes, filename: str) -> str:
        """Save uploaded PDF content to file system."""
        try:
            # Generate unique filename
            file_id = str(uuid.uuid4())
            file_extension = Path(filename).suffix.lower()
            if file_extension != '.pdf':
                raise VectorStoreException("Only PDF files are allowed", "INVALID_FILE_TYPE")
            
            saved_filename = f"{file_id}{file_extension}"
            file_path = self.upload_dir / saved_filename
            
            # Save file
            with open(file_path, 'wb') as f:
                f.write(pdf_content)
            
            logger.info(f"Saved PDF file: {saved_filename}")
            return str(file_path)
            
        except Exception as e:
            logger.error(f"Error saving uploaded PDF: {str(e)}", exc_info=True)
            raise VectorStoreException(f"Failed to save PDF: {str(e)}", "PDF_SAVE_ERROR")
    
    def get_pdf_info(self, pdf_path: str) -> Dict[str, Any]:
        """Get information about a PDF file."""
        try:
            with open(pdf_path, 'rb') as file:
                reader = PdfReader(file)
                
                info = {
                    "page_count": len(reader.pages),
                    "title": reader.metadata.get('/Title', Path(pdf_path).stem) if reader.metadata else Path(pdf_path).stem,
                    "author": reader.metadata.get('/Author', 'Unknown') if reader.metadata else 'Unknown',
                    "subject": reader.metadata.get('/Subject', '') if reader.metadata else '',
                    "creator": reader.metadata.get('/Creator', '') if reader.metadata else '',
                    "producer": reader.metadata.get('/Producer', '') if reader.metadata else '',
                    "file_size": os.path.getsize(pdf_path)
                }
                
                return info
                
        except Exception as e:
            logger.error(f"Error getting PDF info for {pdf_path}: {str(e)}", exc_info=True)
            return {"error": str(e)}

# Global PDF service instance
pdf_service = PDFService()
