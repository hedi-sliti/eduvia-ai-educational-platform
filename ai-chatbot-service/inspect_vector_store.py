#!/usr/bin/env python3
"""
Diagnostic script to inspect ChromaDB vector store contents
"""

import os
import sys
sys.path.append('.')

from app.core.llm import get_vector_store
from app.core.logging import get_logger

logger = get_logger()

def inspect_vector_store():
    """Inspect what's currently stored in ChromaDB"""
    
    print("🔍 INSPECTING VECTOR STORE CONTENTS")
    print("=" * 50)
    
    try:
        vector_store = get_vector_store()
        
        # Get collection info
        collection = vector_store._collection
        print(f"📚 Collection: {collection.name}")
        print(f"📊 Document Count: {collection.count()}")
        print(f"📁 Persistence Directory: {vector_store._persist_directory}")
        print()
        
        # Get all documents
        all_docs = collection.get(include=['metadatas', 'documents', 'embeddings'])
        
        print("📋 ALL DOCUMENTS IN VECTOR STORE:")
        print("-" * 50)
        
        for i, (doc_id, metadata, content) in enumerate(zip(
            all_docs['ids'], 
            all_docs['metadatas'], 
            all_docs['documents']
        )):
            print(f"\n📄 Document {i+1}:")
            print(f"   ID: {doc_id}")
            print(f"   Title: {metadata.get('title', 'No title')}")
            print(f"   Source: {metadata.get('source', 'No source')}")
            print(f"   File Type: {metadata.get('file_type', 'No file type')}")
            print(f"   Document ID: {metadata.get('document_id', 'No document_id')}")
            print(f"   Content Preview: {content[:100]}...")
            
        print(f"\n📊 SUMMARY:")
        print(f"   Total Documents: {len(all_docs['ids'])}")
        
        # Group by source
        sources = {}
        for metadata in all_docs['metadatas']:
            source = metadata.get('source', 'unknown')
            sources[source] = sources.get(source, 0) + 1
            
        print(f"   Documents by Source:")
        for source, count in sources.items():
            print(f"     {source}: {count} documents")
            
    except Exception as e:
        print(f"❌ Error inspecting vector store: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    inspect_vector_store()
