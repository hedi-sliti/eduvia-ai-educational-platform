#!/usr/bin/env python3
"""
Script to clean up deleted files from ChromaDB vector store
"""

import os
import sys
sys.path.append('.')

from app.core.llm import get_vector_store
from app.core.logging import get_logger
from app.services.database_service import DatabaseService

logger = get_logger()

def cleanup_deleted_files():
    """Remove embeddings for deleted files from vector store"""
    
    print("🧹 CLEANING UP DELETED FILES FROM VECTOR STORE")
    print("=" * 50)
    
    try:
        vector_store = get_vector_store()
        collection = vector_store._collection
        
        # Get all documents
        all_docs = collection.get(include=['metadatas', 'documents'])
        
        print(f"📊 Found {len(all_docs['ids'])} documents in vector store")
        
        # Get current PDF documents from database
        with DatabaseService() as db:
            current_pdfs = db.get_pdf_documents()
            valid_document_ids = {doc.document_id for doc in current_pdfs}
            
        print(f"📚 Found {len(valid_document_ids)} valid PDF documents in database")
        
        # Documents to delete (not in current database)
        docs_to_delete = []
        for i, metadata in enumerate(all_docs['metadatas']):
            doc_document_id = metadata.get('document_id')
            doc_file_type = metadata.get('file_type')
            
            # Delete if:
            # 1. It's a PDF but not in current database
            # 2. Document ID is missing
            # 3. It's from PI-Rapport (old deleted file)
            if (doc_file_type == 'pdf' and doc_document_id not in valid_document_ids) or \
               doc_document_id is None or \
               metadata.get('source') == 'PI-Rapport':
                docs_to_delete.append(i)
                print(f"🗑️ Marked for deletion: {metadata.get('title', 'Unknown')} (Source: {metadata.get('source', 'Unknown')})")
        
        # Delete documents
        if docs_to_delete:
            print(f"\n🗑️ Deleting {len(docs_to_delete)} orphaned documents...")
            # Get the actual IDs to delete
            ids_to_delete = [all_docs['ids'][i] for i in docs_to_delete]
            collection.delete(ids=ids_to_delete)
            print(f"✅ Successfully deleted {len(docs_to_delete)} documents")
        else:
            print("✅ No orphaned documents found")
        
        # Show remaining documents
        remaining_docs = collection.get(include=['metadatas'])
        print(f"\n📊 Remaining documents: {len(remaining_docs['ids'])}")
        
        for metadata in remaining_docs['metadatas']:
            if metadata.get('file_type') == 'pdf':
                print(f"   📄 {metadata.get('title', 'Unknown')} (ID: {metadata.get('document_id')})")
        
        print("\n✅ Cleanup completed!")
        
    except Exception as e:
        print(f"❌ Error during cleanup: {e}")
        import traceback
        traceback.print_exc()

def reset_vector_store():
    """Completely reset vector store (use with caution!)"""
    
    print("⚠️  RESETTING VECTOR STORE - THIS WILL DELETE ALL DATA")
    response = input("Are you sure you want to continue? (yes/no): ")
    
    if response.lower() != 'yes':
        print("❌ Cancelled")
        return
    
    try:
        vector_store = get_vector_store()
        collection = vector_store._collection
        
        # Delete all documents
        collection.delete(where={})
        print("✅ All documents deleted from vector store")
        
        # Optionally delete the persistence directory
        persist_dir = vector_store._persist_directory
        if os.path.exists(persist_dir):
            import shutil
            shutil.rmtree(persist_dir)
            print(f"✅ Deleted persistence directory: {persist_dir}")
        
        print("✅ Vector store completely reset")
        
    except Exception as e:
        print(f"❌ Error resetting vector store: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == '--reset':
        reset_vector_store()
    else:
        cleanup_deleted_files()
