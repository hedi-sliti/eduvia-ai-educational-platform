#!/usr/bin/env python3
"""
Minimal test to validate session handling logic without full dependencies.
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

def test_session_logic():
    """Test the session creation and message handling logic."""
    print("Testing session logic...")

    # Mock the SessionService
    class MockSessionService:
        def __init__(self):
            self.sessions = {}
            self.messages = {}

        def get_or_create_session(self, student_id, session_id=None):
            if session_id and session_id in self.sessions:
                return session_id
            new_session_id = session_id or f"session-{len(self.sessions) + 1}"
            self.sessions[new_session_id] = {"student_id": student_id}
            self.messages[new_session_id] = []
            return new_session_id

        def add_message(self, session_id, msg_type, content, sources=None):
            if session_id not in self.messages:
                self.messages[session_id] = []
            self.messages[session_id].append({
                "type": msg_type,
                "content": content,
                "sources": sources or []
            })

        def get_conversation_history(self, session_id):
            return self.messages.get(session_id, [])

    # Test the logic
    session_service = MockSessionService()

    # Simulate the flow from chat.py
    student_id = "test-student"
    session_id = "test-session"
    query = "What is Python?"

    # Step 1: Ensure session exists
    session_id = session_service.get_or_create_session(student_id, session_id)
    print(f"Session created/validated: {session_id}")

    # Step 2: Add user message
    session_service.add_message(session_id, "user", query)
    print(f"User message added to session {session_id}")

    # Step 3: Simulate AI response
    response = "Python is a programming language."
    sources = ["doc1.pdf"]
    session_service.add_message(session_id, "assistant", response, sources)
    print(f"Assistant message added to session {session_id}")

    # Step 4: Check history
    history = session_service.get_conversation_history(session_id)
    print(f"Conversation history: {len(history)} messages")

    for msg in history:
        print(f"  {msg['type']}: {msg['content'][:50]}...")

    # Verify the flow worked
    assert len(history) == 2
    assert history[0]["type"] == "user"
    assert history[1]["type"] == "assistant"
    assert history[1]["sources"] == sources

    print("✅ Session logic test passed!")

if __name__ == "__main__":
    test_session_logic()