import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from agents.graph import agent_graph

def run_agent(question: str):
    initial_state = {
        "question": question,
        "session_id": "test-session",
        "user_id": None,
        "platform": "web",
        "intent": "",
        "confidence": 0.0,
        "documents": [],
        "sources": [],
        "tool_results": [],
        "tools_called": [],
        "messages": [],
        "answer": "",
        "response_type": "text",
        "chart_data": None,
        "chart_type": None,
        "data": None,
        "latency": {},
        "error": None
    }
    return agent_graph.invoke(initial_state)

def test_agentic_workflow_rag_route():
    result = run_agent("What is the return policy for electronics?")
    assert result["intent"] == "RAG"
    assert len(result["answer"]) > 10
    assert len(result["sources"]) >= 1
    assert any("return_policy" in s["source"] for s in result["sources"])

def test_agentic_workflow_inventory_route():
    result = run_agent("Which products are currently low in stock?")
    assert result["intent"] == "INVENTORY"
    assert "get_low_stock_products" in result["tools_called"]
    assert "Low Stock" in result["answer"] or "All products" in result["answer"]

def test_agentic_workflow_sales_top_selling_route():
    result = run_agent("What were our top-selling products in the last 30 days?")
    assert result["intent"] == "SALES"
    assert "get_top_selling_products" in result["tools_called"]
    assert result["response_type"] == "chart"
    assert result["chart_data"] is not None

def test_agentic_workflow_forecast_route():
    result = run_agent("Forecast next week's sales")
    assert result["intent"] == "FORECAST"
    assert "get_sales_forecast" in result["tools_called"]
    assert result["response_type"] == "chart"

def test_agentic_workflow_hybrid_complex_agent():
    result = run_agent(
        "Which products should I reorder based on current inventory, the last 30 days of sales, and our reorder policy?"
    )
    assert result["intent"] == "COMPLEX_AGENT"
    assert "get_low_stock_products" in result["tools_called"]
    assert "get_sales" in result["tools_called"]
    assert len(result["sources"]) >= 1
    assert any("reorder_policy" in s["source"] for s in result["sources"])
    assert "Autonomous Stock Replenishment Recommendation" in result["answer"]
    assert "ROQ" in result["answer"] or "Velocity" in result["answer"]
    assert result["response_type"] == "recommendation"
    assert result["data"] is not None
    assert "recommendations" in result["data"]
