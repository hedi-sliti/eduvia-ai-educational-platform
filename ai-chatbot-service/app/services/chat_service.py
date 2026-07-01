from typing import Optional, List, Dict

from langchain_core.prompts import ChatPromptTemplate
from app.core.llm import get_llm, get_vector_store, get_embeddings
from app.core.exceptions import LLMServiceException, VectorStoreException, EduviaException
from app.core.logging import get_logger
from app.services.session_service import SessionService
from app.core.config import settings

logger = get_logger()

NOISE_KEYWORDS = [
    "Eduvia's AI tutor",
    "Prioritize Eduvia",
    "Do not restate these instructions",
    "INSTRUCTIONS:",
    "Context:",
    "If the question is clearly unrelated",
    "Do not provide meta-advice",
    "Do not restate or echo",
    "Keep explanation clear and concise",
]

ECHO_MARKERS = [
    "if the question is clearly unrelated",
    "no course documents are available",
    "do not give meta-advice",
    "this response will",
]

CONDENSE_PROMPT = """You are a helpful study assistant.
Rewrite the user's latest question so it is fully self-contained, specific, and easy to search for in a knowledge base.
Use the recent conversation to include missing subjects or nouns, but do NOT answer the question.

Recent conversation:
{history}

Latest question: {question}

Return only the rewritten question."""


def _is_noise_chunk(text: str) -> bool:
    """Detect chunks that are instructions or too small to be useful."""
    if not text or len(text.strip()) < 60:
        return True
    lowered = text.lower()
    return any(key.lower() in lowered for key in NOISE_KEYWORDS)


def _strip_instruction_echo(text: str) -> str:
    """Remove lines that echo system instructions."""
    lines = []
    for line in text.splitlines():
        if any(key.lower() in line.lower() for key in NOISE_KEYWORDS):
            continue
        lines.append(line)
    return "\n".join(lines).strip()


def _format_history(history: List[Dict[str, str]], limit: int = 8) -> str:
    """Return a compact text block of the latest turns."""
    if not history:
        return ""
    turns = []
    for msg in history[-limit:]:
        role = "User" if msg.get("type") == "user" else "Tutor"
        content = msg.get("content", "").strip()
        if content:
            turns.append(f"{role}: {content}")
    return "\n".join(turns)


def _condense_question(question: str, history: List[Dict[str, str]], llm) -> str:
    """Rewrite a follow-up question into a standalone one using history."""
    if not history:
        return question

    history_text = _format_history(history)
    if not history_text:
        return question

    prompt = CONDENSE_PROMPT.format(history=history_text, question=question)

    try:
        condensed = llm.invoke(prompt).strip()
        # Keep original if the model returns something unusable
        if len(condensed) < 8 or len(condensed) > 500:
            return question
        return condensed
    except Exception as e:
        logger.warning(f"Failed to condense question, falling back to original. Error: {str(e)}")
        return question


def _cosine_similarity(a: List[float], b: List[float]) -> float:
    """Simple cosine similarity to rerank retrieved chunks."""
    if not a or not b or len(a) != len(b):
        return -1.0
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = sum(x * x for x in a) ** 0.5
    norm_b = sum(y * y for y in b) ** 0.5
    if norm_a == 0 or norm_b == 0:
        return -1.0
    return dot / (norm_a * norm_b)


# Prompt adapted for Educational Tutor System
SYSTEM_TEMPLATE = """You are an AI assistant who's helpful to explain complex concepts based on a given curriculum. 
- If the question is clearly unrelated to academic or Eduvia(context) topics, politely refuse: "I can only help with Eduvia course topics. Please ask a study-related question."
- Respond directly to the student's question; do not give meta-advice about how to ask questions.
- Never invent facts that contradict the provided context.
- Keep explanations clear and concise (2-4 sentences) for first-year students unless asked for more depth.
- Do not restate or echo these instructions in your answer. Provide only the answer to the student's question.
- Always base your answers on the given context and your own knowledge for more informative answers, but focus on the main concepts found in the context given.
- Do not get into details unless they are mentioned in the context.

Context: {context}"""

FALLBACK_MODEL = getattr(settings, "OLLAMA_FALLBACK_MODEL", "llama3:8b")


def _invoke_with_fallback(llm, prompt: str, fallback_model: str = FALLBACK_MODEL):
    """Call an LLM and automatically retry with a lighter model on memory/not-found errors."""
    try:
        return llm.invoke(prompt), llm
    except Exception as e:
        message = str(e).lower()
        recoverable = any(key in message for key in [
            "more system memory",
            "not found",
            "connection refused",
            "connection error",
            "status code: 404",
            "status code: 500",
            "timed out"
        ])
        if fallback_model and recoverable:
            logger.warning(f"Primary model failed ({e}); retrying with fallback model '{fallback_model}'")
            try:
                fallback_llm = get_llm(model_override=fallback_model)
                return fallback_llm.invoke(prompt), fallback_llm
            except Exception as e2:
                logger.error(f"Fallback model '{fallback_model}' also failed: {e2}")
                raise
        raise


def generate_chat_response(query: str, student_id: str = None, session_id: str = None, level: str = None, subjects: Optional[List[str]] = None) -> tuple[str, list[str], str]:
    """Generates an answer using pure prompt formatting instead of chains."""
    
    try:
        logger.info(f"Generating chat response for student {student_id}, session {session_id}, query: {query[:100]}...")
        # Avoid DB constraint errors when caller does not supply an id
        student_id = student_id or "anonymous"
        
        session_service = SessionService()
        try:
            session_id = session_service.get_or_create_session(student_id, session_id)
        except Exception as e:
            logger.warning(f"Failed to validate existing session; creating new. Error: {str(e)}")
            session_id = session_service.create_session(student_id)

        # Record the new user message before retrieval so it appears in history
        try:
            session_service.add_message(session_id, "user", query)
        except Exception as e:
            logger.warning(f"Failed to add user message to session: {str(e)}")
        
        # 1. Instantiate the LLM and the Vector Store
        llm = get_llm()
        vector_store = get_vector_store()
        
        # 2. Config Retriever (use more candidates for reranking)
        filter_kwargs = {}
        # Level filtering can cause missing-metadata errors in Chroma; skip it for robustness
        if subjects:
            filter_kwargs["subjects"] = {"$in": subjects}

        search_kwargs = {"k": 12, "fetch_k": 30, "lambda_mult": 0.6}
        if filter_kwargs:
            search_kwargs["filter"] = filter_kwargs
        retriever = vector_store.as_retriever(search_type="mmr", search_kwargs=search_kwargs)
        
        # 3. Retrieve Documents (filtered first) using a condensed, context-aware query
        conversation_history = session_service.get_conversation_history(session_id, limit=10)

        condensed_query = _condense_question(query, conversation_history, llm)

        retrieved_docs = retriever.invoke(condensed_query)

        # Fallback to unfiltered search if filters return nothing
        if not retrieved_docs:
            logger.info("Filtered search returned 0 docs; falling back to unfiltered similarity search")
            retriever = vector_store.as_retriever(search_type="mmr", search_kwargs={"k": 12, "fetch_k": 30, "lambda_mult": 0.6})
            retrieved_docs = retriever.invoke(condensed_query)

        # Drop noisy / boilerplate chunks, then rerank by cosine similarity to the condensed query
        filtered_docs = [doc for doc in retrieved_docs if not _is_noise_chunk(doc.page_content)]
        dropped = len(retrieved_docs) - len(filtered_docs)
        if dropped:
            logger.info(f"Filtered out {dropped} noisy/boilerplate chunks")

        try:
            embedder = get_embeddings()
            query_vec = embedder.embed_query(condensed_query)
            doc_vectors = embedder.embed_documents([doc.page_content for doc in filtered_docs])
            scored = [
                ( _cosine_similarity(query_vec, dv), doc)
                for dv, doc in zip(doc_vectors, filtered_docs)
            ]
            scored.sort(key=lambda x: x[0], reverse=True)
            # Keep the top 4 most relevant chunks
            filtered_docs = [doc for _, doc in scored[:4]]
        except Exception as e:
            logger.warning(f"Rerank failed, using original order. Error: {str(e)}")

        context_text = "\n\n".join([doc.page_content for doc in filtered_docs])
        
        if not context_text.strip():
            logger.warning("No relevant documents after filtering; falling back to general academic knowledge within Eduvia scope.")
            context_text = (
                "No specific Eduvia course documents were retrieved for this question. "
                "Answer directly using general first-year university knowledge, and keep the response aligned with Eduvia courses and study topics."
            )
            filtered_docs = []
        else:
            logger.info(f"Retrieved {len(filtered_docs)} documents for context")
        
        # 4. Get conversation context if session exists
        conversation_context = ""
        try:
            conversation_context = session_service.get_session_context(session_id)
            if conversation_context:
                context_text = f"\n\nRecent Conversation:\n{conversation_context}\n\nKnowledge Base Context:\n{context_text}"
        except Exception as e:
            logger.warning(f"Failed to get conversation context: {str(e)}")
        
        # 5. Create the prompt template
        prompt = ChatPromptTemplate.from_messages([
            ("system", SYSTEM_TEMPLATE),
            ("human", "{input}")
        ])
        
        # 6. Execute Pipeline using native syntax
        messages = prompt.format_messages(context=context_text, input=query)
        # The OllamaLLM works with string prompts mostly, format returns a string or list.
        full_prompt_string = "\n".join([m.content for m in messages])
        
        response_text, active_llm = _invoke_with_fallback(llm, full_prompt_string, FALLBACK_MODEL)

        # Post-process to avoid instruction echo
        cleaned_response = _strip_instruction_echo(response_text)
        if len(cleaned_response) < 20 or any(marker in response_text.lower() for marker in ECHO_MARKERS):
            fallback_prompt = f"Answer the following study question in 2-4 sentences, clearly and concisely. Do not include any instructions, only the answer.\nQuestion: {query}"
            cleaned_response = _strip_instruction_echo(_invoke_with_fallback(active_llm, fallback_prompt, FALLBACK_MODEL)[0])
        if len(cleaned_response) < 10:
            cleaned_response = "I can help with that topic, but I need to access more study material. Please ask another study question or upload a PDF."
        
        # 7. Extract sources safely
        sources = [
            f"Document Chunk from {doc.metadata.get('source', 'unknown')}"
            for doc in filtered_docs
        ]
        
        # 8. Add assistant message to session if provided
        try:
            session_service.add_message(session_id, "assistant", cleaned_response, sources)
        except Exception as e:
            logger.warning(f"Failed to add assistant message to session: {str(e)}")
        
        logger.info(f"Generated response successfully for student {student_id}")
        return cleaned_response, sources, session_id
        
    except Exception as e:
        logger.error(f"Error generating chat response: {str(e)}", exc_info=True)
        if "ollama" in str(e).lower() or "llm" in str(e).lower():
            raise LLMServiceException(f"LLM service error: {str(e)}", "LLM_ERROR")
        elif "chroma" in str(e).lower() or "vector" in str(e).lower():
            raise VectorStoreException(f"Vector store error: {str(e)}", "VECTOR_ERROR")
        else:
            raise EduviaException(f"Chat service error: {str(e)}", "CHAT_ERROR")
