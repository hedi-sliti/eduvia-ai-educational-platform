import pytest
from unittest.mock import Mock, patch
from fastapi.testclient import TestClient
from app.main import app
from app.services.chat_service import generate_chat_response
from app.core.exceptions import LLMServiceException, VectorStoreException

class TestChatService:
    
    @patch('app.services.chat_service.SessionService')
    @patch('app.services.chat_service.get_llm')
    @patch('app.services.chat_service.get_vector_store')
    def test_generate_chat_response_success(self, mock_vector_store, mock_llm, mock_session_service):
        """Test successful chat response generation."""
        mock_session = Mock()
        mock_session.get_or_create_session.return_value = "session-1"
        mock_session.get_conversation_history.return_value = []
        mock_session.add_message.return_value = True
        mock_session.get_session_context.return_value = ""
        mock_session_service.return_value = mock_session

        # Mock vector store and retriever
        mock_doc = Mock()
        mock_doc.page_content = "Test content about Python programming"
        mock_doc.metadata = {"source": "test_document.pdf"}
        
        mock_retriever = Mock()
        mock_retriever.invoke.return_value = [mock_doc]
        
        mock_vector_store.return_value.as_retriever.return_value = mock_retriever
        
        # Mock LLM
        mock_llm.return_value.invoke.return_value = "Python is a programming language..."
        
        # Test the function
        response, sources, session_id = generate_chat_response("What is Python?", "test_student")
        
        # Assertions
        assert response == "Python is a programming language..."
        assert len(sources) == 1
        assert "test_document.pdf" in sources[0]
        assert session_id == "session-1"
        mock_retriever.invoke.assert_called_once_with("What is Python?")
        mock_llm.return_value.invoke.assert_called_once()

    @patch('app.services.chat_service.SessionService')
    @patch('app.services.chat_service.get_llm')
    @patch('app.services.chat_service.get_vector_store')
    def test_generate_chat_response_with_session_context(self, mock_vector_store, mock_llm, mock_session_service):
        """Test chat response generation includes session ID context and stores messages."""
        mock_doc = Mock()
        mock_doc.page_content = "Turtle information"
        mock_doc.metadata = {"source": "turtle.pdf"}

        mock_retriever = Mock()
        mock_retriever.invoke.return_value = [mock_doc]

        mock_vector_store.return_value.as_retriever.return_value = mock_retriever
        mock_llm.return_value.invoke.return_value = "Turtles are reptiles..."

        mock_session_instance = Mock()
        mock_session_instance.get_or_create_session.return_value = "session-123"
        mock_session_instance.add_message.return_value = True
        mock_session_instance.get_session_context.return_value = "User: What is a turtle?\nAssistant: ..."
        mock_session_instance.get_conversation_history.return_value = []
        mock_session_service.return_value = mock_session_instance

        response, sources, session_id = generate_chat_response(
            "Tell me about turtles", "student-1", session_id="session-123"
        )

        assert response.startswith("Turtles are reptiles")
        assert sources[0].startswith("Document Chunk")
        assert session_id == "session-123"
        mock_session_instance.add_message.assert_called()

    def test_health_endpoint(self):
        client = TestClient(app)
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json().get("status") in ["ok", "fail"]

    
    @patch('app.services.chat_service.SessionService')
    @patch('app.services.chat_service.get_llm')
    @patch('app.services.chat_service.get_vector_store')
    def test_generate_chat_response_llm_error(self, mock_vector_store, mock_llm, mock_session_service):
        """Test LLM service error handling."""
        mock_session = Mock()
        mock_session.get_or_create_session.return_value = "session-err"
        mock_session.get_conversation_history.return_value = []
        mock_session.add_message.return_value = True
        mock_session_service.return_value = mock_session

        # Mock vector store
        mock_retriever = Mock()
        mock_retriever.invoke.return_value = []
        mock_vector_store.return_value.as_retriever.return_value = mock_retriever
        
        # Mock LLM to raise an error
        mock_llm.return_value.invoke.side_effect = Exception("Ollama connection failed")
        
        # Test should raise LLMServiceException
        with pytest.raises(LLMServiceException):
            generate_chat_response("Test question", "test_student")
    
    @patch('app.services.chat_service.SessionService')
    @patch('app.services.chat_service.get_llm')
    @patch('app.services.chat_service.get_vector_store')
    def test_generate_chat_response_vector_error(self, mock_vector_store, mock_llm, mock_session_service):
        """Test vector store error handling."""
        mock_session = Mock()
        mock_session.get_or_create_session.return_value = "session-vec"
        mock_session.get_conversation_history.return_value = []
        mock_session.add_message.return_value = True
        mock_session_service.return_value = mock_session

        # Mock vector store to raise an error
        mock_vector_store.return_value.as_retriever.side_effect = Exception("ChromaDB connection failed")
        
        # Test should raise VectorStoreException
        with pytest.raises(VectorStoreException):
            generate_chat_response("Test question", "test_student")
