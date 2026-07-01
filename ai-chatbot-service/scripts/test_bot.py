import requests
import time
import os

BASE_URL = "http://localhost:8000/api"
FILE_PATH = r"C:\Users\moham\Desktop\chatbot_pi\PI-Rapport (1).pdf.txt"

def run_tests():
    print("🚀 Starting AI Chatbot Verification Tests...")
    
    # Check if Server is running
    try:
        requests.get("http://localhost:8000/")
        print("✅ FastAPI Server is running.")
    except Exception:
        print("❌ FastAPI Server is NOT running. Please run 'uvicorn app.main:app' first.")
        return
    
    # 1. Test Ingestion
    print("\n📚 Testing Document Ingestion...")
    if not os.path.exists(FILE_PATH):
        print(f"❌ File not found at {FILE_PATH}.")
        return
        
    with open(FILE_PATH, "r", encoding="utf-8") as f:
        file_text = f.read()
    
    ingest_payload = {
        "text": file_text,
        "metadata": {"source": "PI-Rapport", "document_id": "doc-001"}
    }
    
    try:
        response = requests.post(f"{BASE_URL}/knowledge/ingest", json=ingest_payload)
        response.raise_for_status()
        print("✅ Document successfully ingested into ChromaDB!")
        print(response.json())
        
        # Adding a small delay to allow ChromaDB persistence
        time.sleep(2)
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Document ingestion failed! Error: {e}")
        print("Hint: Is Ollama running locally? The Vector store needs Ollama to generate embeddings.")
        return

    # 2. Test RAG Chat
    print("\n💬 Testing RAG Chatbot Endpoint...")
    chat_payload = {
        "message": "What is the main objective of the Eduvia project?",
        "student_id": "test_student_123"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/chat/", json=chat_payload)
        response.raise_for_status()
        print("\n✅ AI Chatbot Response:")
        print(response.json()["response"])
        print("\n📎 Sources Referenced:")
        for source in response.json()["sources"]:
            print(f"- {source}")
    except requests.exceptions.RequestException as e:
        print(f"❌ Chat request failed! Error: {e}")

if __name__ == "__main__":
    run_tests()
