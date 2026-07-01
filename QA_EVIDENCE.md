# QA Evidence

Project: Eduvia

Final Architecture: Angular, NestJS, MongoDB, FastAPI, Ollama

Verified Roles: Student, Teacher, Admin

Strict RAG Proof
- Teacher uploaded strict_rag_verification.pdf.
- Student asked: "What is the Eduvia verification code from the uploaded course document?"
- Chatbot answered with: "BLUE TIGER 4729".

Security Proof
- Student blocked from document management endpoints: 403.
- Teacher and Admin allowed: 200.

Build Proof
- Backend build passed.
- Frontend build passed.
- Only non-blocking Angular budget warnings remain.

Final Demo Status: Ready
