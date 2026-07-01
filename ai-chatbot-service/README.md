# Eduvia AI Chatbot Service

A FastAPI-based AI chatbot service for the Eduvia educational platform, providing intelligent tutoring capabilities using LangChain and Ollama.

## Features

- 🤖 **AI Chat**: Context-aware conversations with educational content
- 📚 **Knowledge Base**: Ingest and retrieve educational materials
- 🎯 **Student Assessment**: Analyze learning styles and competency levels
- 💬 **Session Management**: Persistent conversation history
- 🔍 **Vector Search**: ChromaDB-powered semantic search
- 📊 **Logging & Monitoring**: Comprehensive error handling and logging

## Architecture

```
ai-chatbot-service/
├── app/
│   ├── api/endpoints/     # API route handlers
│   ├── core/              # Core configuration and utilities
│   ├── models/            # Database models and schemas
│   └── services/          # Business logic services
├── tests/                 # Unit tests
├── chroma_db/            # Vector database storage
├── logs/                 # Application logs
└── requirements.txt      # Python dependencies
```

## Quick Start

### Prerequisites

1. **Python 3.8+**
2. **MySQL Database**
3. **Ollama** (chat model: `llama3:70b`, embeddings model: `nomic-embed-text`)
4. **Git**

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd ai-chatbot-service
```

2. **Create virtual environment**
```bash
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Setup environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

5. **Setup Ollama**
```bash
# Install Ollama (https://ollama.ai/)
# Pull the chat and embedding models
ollama pull llama3:70b
ollama pull nomic-embed-text
```

6. **Setup MySQL Database**
```sql
CREATE DATABASE eduvia_chatbot;
-- Update .env with your database credentials
```

### Running the Application

#### Method 1: Using the startup script (Recommended)
```bash
python start.py
```

#### Method 2: Using uvicorn directly
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

## API Documentation

Once running, visit:
- **Swagger UI**: `http://localhost:8000/api/docs`
- **ReDoc**: `http://localhost:8000/api/redoc`

## API Endpoints

### Chat
- `POST /api/chat/` - Send a message to the AI tutor
- `GET /api/sessions/` - Get user chat sessions
- `POST /api/sessions/` - Create new chat session
- `GET /api/sessions/{id}/history` - Get conversation history

### Knowledge Base
- `POST /api/knowledge/ingest` - Add content to knowledge base

### Assessment
- `POST /api/assessment/` - Analyze student assessment

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OLLAMA_BASE_URL` | Ollama server URL | `http://localhost:11434` |
| `OLLAMA_MODEL` | LLM chat model name | `llama3:70b` |
| `OLLAMA_EMBED_MODEL` | Embedding model for vector search | `nomic-embed-text` |
| `MYSQL_URL` | MySQL connection string | - |
| `CHROMA_PERSIST_DIRECTORY` | Vector DB storage path | `./chroma_db` |
| `LOG_LEVEL` | Logging level | `INFO` |

### Database Setup

The application uses MySQL for persistent storage. Tables are created automatically on startup:

- `students` - Student profiles and learning styles
- `chat_sessions` - Conversation sessions
- `chat_messages` - Individual messages
- `assessments` - Student assessment results
- `knowledge_documents` - Ingested documents metadata

## Development

### Running Tests
```bash
pytest tests/
```

### Code Style
```bash
# Install development dependencies
pip install black flake8

# Format code
black app/

# Lint code
flake8 app/
```

### Adding New Features

1. Create service in `app/services/`
2. Add API endpoint in `app/api/endpoints/`
3. Add models in `app/models/`
4. Write tests in `tests/`

## Deployment

### Docker Deployment
```dockerfile
# Build image
docker build -t eduvia-chatbot .

# Run container
docker run -p 8000:8000 --env-file .env eduvia-chatbot
```

### Production Considerations

1. **Security**: Replace placeholder secrets
2. **Database**: Use production MySQL instance
3. **CORS**: Configure allowed origins
4. **Logging**: Set up log rotation
5. **Monitoring**: Add health checks

## Health Check and Ready Verification

- Python health endpoint: `GET /api/health`
  - `status: ok` or `fail`, with database diagnostics
- NestJS health endpoint: `GET /chatbot/health`
  - proxies Python health response for frontend monitoring
- Frontend checks on mount are in `eduvia-frontend/src/pages/ChatPage.tsx`
  - `chatApi.healthCheck()` sets UI badge
  - send button disables when status is `fail`

## Troubleshooting

### Common Issues

1. **Ollama Connection Failed**
   - Ensure Ollama is running: `ollama serve`
   - Check model availability: `ollama list`

2. **Database Connection Error**
   - Verify MySQL is running
   - Check connection string in .env
   - Ensure database exists

3. **Vector Store Issues**
   - Check ChromaDB directory permissions
   - Ensure sufficient disk space

### Logs

Application logs are stored in `logs/`:
- `app.log` - General application logs
- `errors.log` - Error logs only

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request

## License

This project is part of the Eduvia educational platform.

## Support

For issues and questions:
- Create an issue in the repository
- Check the logs for error details
- Review API documentation
