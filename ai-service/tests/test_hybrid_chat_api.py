import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from fastapi.testclient import TestClient
from app import app

client = TestClient(app)

def test_api_chat_rag_scenario():
    payload = {
        "message": "What is the return policy for electronics?",
        "sessionId": "test-hybrid-1",
        "platform": "web"
    }
    response = client.post("/ai/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["intent"] == "RAG"
    assert len(data["data"]["sources"]) >= 1
    assert any("return_policy" in s["source"] for s in data["data"]["sources"])
    assert data["data"]["latency"]["total_ms"] > 0

def test_api_chat_inventory_scenario():
    payload = {
        "message": "Which products are currently low in stock?",
        "sessionId": "test-hybrid-2",
        "platform": "web"
    }
    response = client.post("/ai/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["intent"] == "INVENTORY"
    assert "get_low_stock_products" in data["data"]["tools_called"]

def test_api_chat_analytics_scenario():
    payload = {
        "message": "What were our top-selling products in the last 30 days?",
        "sessionId": "test-hybrid-3",
        "platform": "web"
    }
    response = client.post("/ai/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["intent"] == "SALES"
    assert data["data"]["type"] == "chart"
    assert data["data"]["chartData"] is not None

def test_api_chat_complex_agent_scenario():
    payload = {
        "message": "Which products should I reorder based on current inventory, the last 30 days of sales, and our reorder policy?",
        "sessionId": "test-hybrid-4",
        "platform": "web"
    }
    response = client.post("/ai/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["intent"] == "COMPLEX_AGENT"
    assert "get_low_stock_products" in data["data"]["tools_called"]
    assert "get_sales" in data["data"]["tools_called"]
    assert len(data["data"]["sources"]) >= 1
    assert data["data"]["type"] == "recommendation"
    assert data["data"]["data"]["recommendations"] is not None
