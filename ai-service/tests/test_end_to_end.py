import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from fastapi.testclient import TestClient
from app import app
from memory.conversation import ConversationMemoryManager

client = TestClient(app)

def test_full_acceptance_scenario_1_rag():
    """Scenario 1: Knowledge-based RAG query with source citations."""
    res = client.post("/ai/chat", json={
        "message": "What is the return policy for electronics?",
        "sessionId": "e2e-rag-1"
    })
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["intent"] == "RAG"
    assert len(data["sources"]) >= 1
    assert any("return_policy" in s["source"] for s in data["sources"])
    assert len(data["text"]) > 20

def test_full_acceptance_scenario_2_realtime_database():
    """Scenario 2: Real-time low-stock database query."""
    res = client.post("/ai/chat", json={
        "message": "Which products are currently low in stock?",
        "sessionId": "e2e-db-2"
    })
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["intent"] == "INVENTORY"
    assert "get_low_stock_products" in data["tools_called"]
    # Real-time queries should not trigger RAG sources unnecessarily
    assert len(data["sources"]) == 0

def test_full_acceptance_scenario_3_analytics():
    """Scenario 3: 30-day top-selling product sales analytics."""
    res = client.post("/ai/chat", json={
        "message": "What were our top-selling products in the last 30 days?",
        "sessionId": "e2e-analytics-3"
    })
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["intent"] == "SALES"
    assert "get_top_selling_products" in data["tools_called"]
    assert data["type"] == "chart"
    assert data["chartData"] is not None

def test_full_acceptance_scenario_4_hybrid_agent():
    """Scenario 4: Multi-step agent combining Live Inventory + Sales Velocity + RAG Reorder Policy."""
    res = client.post("/ai/chat", json={
        "message": "Which products should I reorder based on current inventory, the last 30 days of sales, and our reorder policy?",
        "sessionId": "e2e-hybrid-4"
    })
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["intent"] == "COMPLEX_AGENT"
    assert "get_low_stock_products" in data["tools_called"]
    assert "get_sales" in data["tools_called"]
    assert len(data["sources"]) >= 1
    assert any("reorder_policy" in s["source"] for s in data["sources"])
    assert data["type"] == "recommendation"
    assert "recommendations" in data["data"]
    assert len(data["data"]["recommendations"]) >= 1
