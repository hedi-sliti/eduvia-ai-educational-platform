# Eduvia - AI Educational Platform

An intelligent educational platform with AI-powered chatbot, RAG system, and role-based access for students, teachers, and administrators.

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

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
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
python run_simple.py
```

#### Step 3: NestJS Backend

```bash
cd eduvia-backend
npm install
npm run seed  # Seed test users
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

## Services & Ports

- **Frontend (Angular)**: http://localhost:4200
- **NestJS Backend**: http://localhost:3001
- **AI Service**: http://localhost:8000
- **MongoDB**: mongodb://127.0.0.1:27017/eduvia
- **Ollama**: http://localhost:11434

## Test Accounts

After seeding the database, you can use these test accounts:

- **Admin**: admin@eduvia.com / Admin123!
- **Teacher**: teacher@eduvia.com / Teacher123!
- **Student**: student@eduvia.com / Student123!

## Features

### Implemented
- AI Chatbot with RAG (Retrieval-Augmented Generation)
- Teacher-only Knowledge Base management (PDF upload/list/delete)
- User authentication with JWT
- Role-based access control (Admin, Teacher, Student)
- Student flow: dashboard, chat, progress, quizzes, recommendations, community, support
- Teacher flow: dashboard, knowledge management, courses CRUD, quizzes, at-risk progress view, reminders/support
- Admin flow: dashboard summary, users CRUD + role updates, analytics (overview/users/learning/engagement)
- Seed script for test users
- MongoDB integration for data storage

### Future Work
- Real-time notifications
- Keycloak integration (for production)
- Advanced community/forum and collaboration features

## Demo Guide

### Prerequisites

- Node.js
- Python
- MongoDB or Docker
- Ollama if you want live AI generation

### Startup Commands

#### AI service

```bash
cd ai-chatbot-service
pip install -r requirements.txt
python run_simple.py
```

#### Backend

```bash
cd eduvia-backend
npm install
npm run seed
npm run start:dev
```

#### Frontend

```bash
cd eduvia-frontend
npm install
npm start
```

#### MongoDB

```bash
docker-compose up -d mongodb
```

If Docker is unavailable, use a local MongoDB instance on `mongodb://127.0.0.1:27017/eduvia`.

#### Docker Compose

```bash
docker-compose up --build
```

### Seed Command

```bash
cd eduvia-backend
npm run seed
```

### Test Accounts

- admin@eduvia.com / Admin123!
- teacher@eduvia.com / Teacher123!
- student@eduvia.com / Student123!

### URLs

- Frontend: http://localhost:4200/
- Backend: http://localhost:3001/
- AI service: http://localhost:8000/
- MongoDB: mongodb://127.0.0.1:27017/eduvia

### Recommended Demo Scenario

1. Login as student and open dashboard.
2. Open chat and ask one question.
3. Confirm no public Knowledge page is available to student.
4. Open progress.
5. Open quizzes.
6. Open recommendations.
7. Open community.
8. Open support, then logout.
9. Login as teacher: dashboard -> knowledge management (upload/list PDFs) -> courses -> quizzes -> progress -> support, then logout.
10. Login as admin: dashboard -> users -> analytics.

### Limitations

- Docker Compose exists, but the full container runtime was not completed in-session because the Ollama image download was long.
- Ollama must be running locally for chatbot generation.
- The FastAPI service falls back to SQLite when the configured MySQL connection is unavailable.
- Some advanced features such as full Socket.io chat/forum and complete Keycloak integration are future work.

### Defense Script

#### Startup order

1. Start MongoDB or Docker.
2. Start Ollama if you want live generation.
3. Start the AI service.
4. Start the NestJS backend.
5. Start the Angular frontend.
6. Run the seed script before logging in.

#### Student demo

1. Open the frontend at http://localhost:4200/.
2. Login as `student@eduvia.com` / `Student123!`.
3. Open the student dashboard.
4. Open chat and ask one question.
5. Confirm chatbot response appears.
6. Confirm no public Knowledge link is visible.
7. Open progress.
8. Open quizzes.
9. Open recommendations.
10. Open community.
11. Open support.
12. Logout.

#### Teacher demo

1. Login as `teacher@eduvia.com` / `Teacher123!`.
2. Open the teacher dashboard.
3. Open teacher knowledge management (`/teacher/knowledge`) and upload/list PDFs.
4. Open courses.
5. Open quizzes.
6. Open progress (at-risk view).
7. Open support.
8. Logout.

#### Admin demo

1. Login as `admin@eduvia.com` / `Admin123!`.
2. Open the admin dashboard.
3. View the users list.
4. Open analytics.
5. Logout.

#### What to say during the defense

- Angular is the frontend.
- NestJS is the backend.
- MongoDB stores users, courses, and assessments.
- FastAPI handles AI and RAG.
- Ollama provides local LLM generation.
- JWT handles authentication.
- Roles protect the Student, Teacher, and Admin pages.
- React was removed because the current specification requires Angular.

## Environment Configuration

Each service has its own `.env.example` file for reference. Copy to `.env` and configure as needed.

### Backend Environment Variables (`.env`)
- `PORT`: Port for NestJS backend (default: 3001)
- `MONGODB_URI`: MongoDB connection string (default: mongodb://localhost:27017/eduvia)
- `PYTHON_AI_URL`: URL for FastAPI AI service (default: http://localhost:8000)
- `JWT_SECRET`: Secret key for signing JWT tokens (default: fallback-secret-key-change-in-production)

## License

MIT
