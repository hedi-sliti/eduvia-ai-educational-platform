#!/usr/bin/env python3
"""
Simple smoke test for the chat endpoint.
- Sends a sample academic query.
- Fails if the response is empty or echoes internal instructions.
"""

import sys
import requests

CHAT_URL = "http://localhost:8000/api/chat/"
TEST_PAYLOAD = {"message": "explain machine learning", "student_id": "smoke-tester"}
FORBIDDEN_PHRASES = [
    "Eduvia's AI tutor",
    "Do not restate these instructions",
    "Prioritize Eduvia",
]


def main() -> int:
    resp = requests.post(CHAT_URL, json=TEST_PAYLOAD, timeout=45)
    if resp.status_code != 200:
        print(f"FAIL: HTTP {resp.status_code} -> {resp.text}")
        return 1

    try:
        data = resp.json()
    except Exception:
        print(f"FAIL: Non-JSON response: {resp.text}")
        return 1

    answer = data.get("response", "") or ""
    if len(answer.strip()) < 10:
        print("FAIL: Empty/too-short response")
        return 1

    for phrase in FORBIDDEN_PHRASES:
        if phrase.lower() in answer.lower():
            print(f"FAIL: Response echoed instructions ({phrase})")
            return 1

    print("PASS: Chat response looks good")
    return 0


if __name__ == "__main__":
    sys.exit(main())
