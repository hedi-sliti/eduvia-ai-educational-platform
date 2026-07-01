# FINAL DEMO CHECKLIST

## Required Services

- MongoDB
- Ollama with `tinyllama`
- FastAPI AI service
- NestJS backend
- Angular frontend

## Startup Order

1. Start Ollama:
   ```bash
   ollama serve
   ```
2. Start the AI service:
   ```bash
   cd ai-chatbot-service
   python run_simple.py
   ```
3. Start the backend:
   ```bash
   cd eduvia-backend
   npm run start:dev
   ```
4. Start the frontend:
   ```bash
   cd eduvia-frontend
   npm start
   ```
5. Make sure MongoDB is running locally at `mongodb://127.0.0.1:27017/eduvia`.
6. Seed the demo users if needed:
   ```bash
   cd eduvia-backend
   npm run seed
   ```

## URLs

- Angular: http://localhost:4200/
- NestJS: http://localhost:3001/
- FastAPI health: http://localhost:8000/api/health
- MongoDB: mongodb://127.0.0.1:27017/eduvia

## Test Accounts

- student@eduvia.com / Student123!
- teacher@eduvia.com / Teacher123!
- admin@eduvia.com / Admin123!

## Demo Order

1. Start all services.
2. Seed users.
3. Login as student.
4. Show student dashboard.
5. Open chat and ask one question (confirm answer appears).
6. Confirm no public Knowledge link/page is visible for student.
7. Open progress.
8. Open quizzes.
9. Open recommendations.
10. Open community.
11. Open support.
12. Login as teacher.
13. Show teacher dashboard.
14. Show teacher knowledge management (`/teacher/knowledge`) with PDF upload/list.
15. Show teacher courses.
16. Show teacher quizzes.
17. Show teacher progress.
18. Show teacher support.
19. Login as admin.
20. Show admin dashboard.
21. Show admin users.
22. Show admin analytics.

## Safe Chatbot Question

```text
Explain artificial intelligence in simple terms for a first-year student.
```

## Backup Plan

If Ollama is slow, say the model is running locally and may take a few seconds. Do not refresh the page immediately.
