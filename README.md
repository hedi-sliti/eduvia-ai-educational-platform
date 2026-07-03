# Eduvia - AI Educational Platform

Eduvia is a role-based educational platform that combines a modern Angular frontend, a NestJS application backend, and a FastAPI AI service for retrieval-augmented chat and document-based learning workflows.

It is structured as a multi-service project for local development and portfolio presentation, with dedicated experiences for students, teachers, and administrators.

## Overview

Eduvia focuses on three connected product areas:

- guided student learning through dashboards, quizzes, recommendations, and chat
- teacher workflows for course support and Knowledge Base management
- administrative visibility into users, activity, and platform analytics

The AI service uses local Ollama models and ChromaDB-backed retrieval to support chatbot and document workflows without changing the core application architecture.

## Architecture

Eduvia is organized into three application layers plus shared local infrastructure:

- Angular frontend for the user interface and role-based navigation
- NestJS backend for authentication, business APIs, and platform data access
- FastAPI AI service for RAG, PDF ingestion, and chatbot logic
- MongoDB for backend application data
- Ollama for local chat and embedding models

## Project Structure

```
chatbot_pi/
├── ai-chatbot-service/     # FastAPI backend with RAG and AI capabilities
├── eduvia-backend/         # NestJS backend API
├── eduvia-frontend/        # Angular frontend
├── docker-compose.yml      # Docker configuration
└── README.md               # This file
```

## Tech Stack

- **Frontend**: Angular 18
- **Backend**: NestJS 11, TypeScript
- **AI Service**: FastAPI, LangChain, ChromaDB, Ollama
- **Database**: MongoDB
- **Deployment**: Docker & Docker Compose

## Model Configuration

- **Chat model**: `gemma3:4b`
- **Embedding model**: `nomic-embed-text`

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- MongoDB
- Docker & Docker Compose (optional)
- Ollama (for local AI model)

### Option 1: Running Locally

#### Step 1: Ollama

```bash
ollama serve
```

#### Step 2: AI Chatbot Service

```bash
cd ai-chatbot-service
cp .env.example .env  # Update .env as needed
pip install -r requirements.txt
python start.py
```

#### Step 3: NestJS Backend

```bash
cd eduvia-backend
npm install
npm run seed:demo
npm run start:dev
```

#### Step 4: Angular Frontend

```bash
cd eduvia-frontend
npm install
npm start
```

### Option 2: Docker Compose

```bash
docker-compose up -d
```

## Features By Role

### Student

- JWT-based login and protected student routes
- Dashboard with learning overview
- Chat experience backed by the AI service
- Progress tracking
- Quiz discovery and attempts
- Recommendations view
- Community and support pages

### Teacher

- JWT-based login and protected teacher routes
- Teacher dashboard
- Knowledge Base management for PDF upload, listing, and deletion
- Course management
- Quiz management and attempt review
- At-risk student progress view
- Reminder and support workflows

### Admin

- JWT-based login and protected admin routes
- Admin dashboard
- User management
- Analytics overview, users, learning, and engagement endpoints

## Services & Ports

- **Frontend (Angular)**: http://localhost:4200
- **NestJS Backend**: http://localhost:3001
- **AI Service**: http://localhost:8000
- **MongoDB**: mongodb://127.0.0.1:27017/eduvia
- **Ollama**: http://localhost:11434

## Test Accounts

After seeding the database, you can use these development accounts:

- **Admin**: admin@eduvia.com / Admin123!
- **Teacher**: teacher@eduvia.com / Teacher123!
- **Student**: student@eduvia.com / Student123!

## Seed Commands

Use the backend seed modes depending on the local state you want:

```bash
cd eduvia-backend
npm run seed:demo
```

Seeds the full local demo dataset for all platform areas.

```bash
cd eduvia-backend
npm run seed:clean
```

Resets development collections and recreates only the essential student, teacher, and admin accounts.

## Local Data Reset

The AI service includes a local cleanup utility for upload, Chroma, and local document metadata reset:

```bash
cd ai-chatbot-service
python scripts/reset_local_dev_data.py
python scripts/reset_local_dev_data.py --apply
```

This script is intended for local development cleanup and preserves the required folders after reset.

## Local Limitations

- Ollama must be running locally for AI chat and PDF ingestion workflows.
- MongoDB must be available locally or through Docker for the NestJS backend.
- The FastAPI service may fall back to local SQLite when its configured MySQL connection is unavailable.
- Angular build budget warnings are non-blocking as long as the frontend build completes successfully.

## Environment Configuration

Each service has its own `.env.example` file for reference. Copy to `.env` and configure as needed.

### Backend Environment Variables (`.env`)
- `PORT`: Port for NestJS backend (default: 3001)
- `MONGODB_URI`: MongoDB connection string (default: mongodb://localhost:27017/eduvia)
- `PYTHON_AI_URL`: URL for FastAPI AI service (default: http://localhost:8000)
- `JWT_SECRET`: Secret key for signing JWT tokens (default: fallback-secret-key-change-in-production)

### AI Service Environment Variables (`ai-chatbot-service/.env`)
- `OLLAMA_BASE_URL`: Local Ollama endpoint
- `OLLAMA_MODEL`: Chat model name, set to `gemma3:4b`
- `OLLAMA_FALLBACK_MODEL`: Fallback chat model, aligned to `gemma3:4b`
- `OLLAMA_EMBED_MODEL`: Embedding model name, set to `nomic-embed-text`
- `CHROMA_PERSIST_DIRECTORY`: Local Chroma persistence path
- `MYSQL_URL`: SQLAlchemy connection used by the AI service

## License

MIT
