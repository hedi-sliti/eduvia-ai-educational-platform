#!/usr/bin/env python3
"""
Simple script to clean up PI-Rapport documents from ChromaDB
"""

import os
import sys
sys.path.append('.')

from app.core.llm import get_vector_store
from app.core.logging import get_logger

logger = get_logger()

def cleanup_pi_rapport():
    """Remove all PI-Rapport documents from vector store"""
    
    print("🧹 CLEANING UP PI-RAPPORT DOCUMENTS FROM VECTOR STORE")
    print("=" * 50)
    
    try:
        vector_store = get_vector_store()
        collection = vector_store._collection
        
        # Get all documents
        all_docs = collection.get(include=['metadatas', 'documents'])
        
        print(f"📊 Found {len(all_docs['ids'])} documents in vector store")
        
        # Find PI-Rapport documents
        docs_to_delete = []
        for i, metadata in enumerate(all_docs['metadatas']):
            source = metadata.get('source', '')
            if source == 'PI-Rapport':
                docs_to_delete.append(i)
                print(f"🗑️ Marked for deletion: {metadata.get('title', 'Unknown')} (Source: {source})")
        
        # Delete PI-Rapport documents
        if docs_to_delete:
            print(f"\n🗑️ Deleting {len(docs_to_delete)} PI-Rapport documents...")
            # Get the actual IDs to delete
            ids_to_delete = [all_docs['ids'][i] for i in docs_to_delete]
            collection.delete(ids=ids_to_delete)
            print(f"✅ Successfully deleted {len(docs_to_delete)} PI-Rapport documents")
        else:
            print("✅ No PI-Rapport documents found")
        
        # Show remaining documents
        remaining_docs = collection.get(include=['metadatas'])
        print(f"\n📊 Remaining documents: {len(remaining_docs['ids'])}")
        
        sources = {}
        for metadata in remaining_docs['metadatas']:
            source = metadata.get('source', 'unknown')
            sources[source] = sources.get(source, 0) + 1
            
        print(f"   Documents by Source:")
        for source, count in sources.items():
            print(f"     {source}: {count} documents")
        
        print("\n✅ Cleanup completed!")
        
    except Exception as e:
        print(f"❌ Error during cleanup: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    cleanup_pi_rapport()
