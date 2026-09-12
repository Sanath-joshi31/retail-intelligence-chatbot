import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from memory.conversation import ConversationMemoryManager
from fastapi.testclient import TestClient
from app import app

client = TestClient(app)

def test_conversation_memory_manager():
    memory = ConversationMemoryManager(max_history_per_session=5)
    sid = "test-mem-session"

    memory.add_user_message(sid, "Show low stock products")
    memory.add_assistant_message(sid, "Apple iPhone 15 Pro is low in stock.", metadata={"referenced_products": ["Apple iPhone 15 Pro"]})

    history = memory.get_history(sid)
    assert len(history) == 2
    assert history[0]["role"] == "user"
    assert history[1]["role"] == "assistant"

    # Test entity context resolution
    resolved = memory.resolve_follow_up_query(sid, "How many should we reorder?")
    assert "Apple iPhone 15 Pro" in resolved

    # Test clear
    memory.clear_session(sid)
    assert len(memory.get_history(sid)) == 0

def test_multi_turn_chat_api():
    sid = "multi-turn-test-123"

    # Turn 1: Low stock
    r1 = client.post("/ai/chat", json={"message": "Show low stock products", "sessionId": sid})
    assert r1.status_code == 200
    assert r1.json()["success"] is True

    # Turn 2: Follow up question referencing previous turn
    r2 = client.post("/ai/chat", json={"message": "How many should we reorder?", "sessionId": sid})
    assert r2.status_code == 200
    assert r2.json()["success"] is True

    # Turn 3: Clear session memory
    r3 = client.delete(f"/ai/memory/{sid}")
    assert r3.status_code == 200
    assert r3.json()["success"] is True
