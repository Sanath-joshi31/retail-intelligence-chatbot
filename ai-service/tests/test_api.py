import sys
import os

# Add service root directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from fastapi.testclient import TestClient
from app import app

client = TestClient(app)

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "endpoints" in data

def test_ai_health_endpoint():
    response = client.get("/ai/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "components" in data

def test_ai_chat_endpoint():
    payload = {
        "message": "What is our return policy?",
        "sessionId": "test-session-123",
        "platform": "web"
    }
    response = client.post("/ai/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "data" in data
    assert "text" in data["data"]
    assert data["metadata"]["sessionId"] == "test-session-123"
