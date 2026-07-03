#!/usr/bin/env python3
"""
Rebuild the Chroma vector store from the database knowledge documents.
- Wipes the persisted Chroma directory.
- Re-ingests all KnowledgeDocument rows using the current configured Ollama models.
- Skips empty/very short documents and obvious instruction/meta blobs.
"""

import shutil
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.core.config import settings
from app.core.llm import get_vector_store
from app.core.logging import get_logger
from app.services.database_service import DatabaseService
from app.services.knowledge_service import ingest_text_to_vectorstore
from app.services.pdf_service import pdf_service

logger = get_logger()

NOISE_KEYWORDS = [
    "Eduvia's AI tutor",
    "Do not restate these instructions",
    "Prioritize Eduvia",
    "INSTRUCTIONS:",
]


def _is_noise(text: str) -> bool:
    if not text or len(text.strip()) < 60:
        return True
    lower = text.lower()
    return any(k.lower() in lower for k in NOISE_KEYWORDS)


def wipe_chroma(persist_dir: Path) -> None:
    if not persist_dir.exists():
        return
    try:
        shutil.rmtree(persist_dir)
        logger.info(f"Wiped Chroma directory: {persist_dir}")
    except PermissionError as exc:
        logger.warning(f"Could not remove {persist_dir} due to lock ({exc}); falling back to clearing collection")
        try:
            vs = get_vector_store()
            ids = vs._collection.get()["ids"]
            if ids:
                vs._collection.delete(ids=ids)
                logger.info(f"Cleared {len(ids)} vector entries in-place")
        except Exception as inner_exc:  # noqa: BLE001
            logger.error(f"Failed to clear Chroma collection: {inner_exc}")
            raise


def rebuild():
    project_root = Path(__file__).resolve().parents[1]
    persist_dir = (project_root / settings.CHROMA_PERSIST_DIRECTORY).resolve() if not Path(settings.CHROMA_PERSIST_DIRECTORY).is_absolute() else Path(settings.CHROMA_PERSIST_DIRECTORY)

    wipe_chroma(persist_dir)

    vector_store = get_vector_store()  # recreates directory
    ingested = 0
    skipped = 0

    with DatabaseService() as db:
        documents = db.get_all_knowledge_documents()
        logger.info(f"Found {len(documents)} knowledge documents to ingest")

        for doc in documents:
            content = doc.content or ""
            metadata = dict(doc.doc_metadata or {})
            metadata.setdefault("source", doc.source or "knowledge_db")
            metadata["document_id"] = doc.document_id

            # If DB content is empty but a PDF path exists, re-extract text
            file_path = metadata.get("file_path")
            if (not content.strip()) and file_path and Path(file_path).exists():
                try:
                    content = pdf_service.extract_text_from_pdf(file_path)
                    if not content.strip():
                        content = f"{doc.title or Path(file_path).stem}\nNo extractable text found; likely an image-only PDF."
                except Exception as exc:  # noqa: BLE001
                    logger.error(f"Failed to extract text from {file_path}: {exc}")
                    skipped += 1
                    continue

            if _is_noise(content):
                skipped += 1
                continue

            try:
                ingest_text_to_vectorstore(content, metadata)
                ingested += 1
            except Exception as exc:  # noqa: BLE001
                skipped += 1
                logger.error(f"Failed to ingest {doc.title}: {exc}")

    logger.info(f"Rebuild completed. Ingested={ingested}, skipped={skipped}")


if __name__ == "__main__":
    rebuild()
