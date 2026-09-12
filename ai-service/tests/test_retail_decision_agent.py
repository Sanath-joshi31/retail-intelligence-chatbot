import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from fastapi.testclient import TestClient
from app import app
from agents.retail_decision_agent import RetailDecisionAgent
from agents.router import route_query_node
from agents.nodes.validator_node import validate_response_node
from memory.conversation import ConversationMemoryManager
from tools.calculation_tools import (
    calculate_daily_sales_velocity,
    calculate_reorder_quantity,
    apply_moq,
    calculate_stock_coverage,
    calculate_stock_risk,
    calculate_reorder_priority
)
from tools.rag_tools import retrieve_reorder_policy

client = TestClient(app)

def test_deterministic_roq_calculation():
    """
    Test ROQ formula: (Daily Sales Velocity * Lead Time) + Safety Stock - Current Stock
    Given: DSV=4, Lead Time=5, Safety Stock=10, Current Stock=8
    Expected: (4 * 5) + 10 - 8 = 22
    """
    res = calculate_reorder_quantity.invoke({
        "daily_sales_velocity": 4.0,
        "lead_time_days": 5,
        "safety_stock": 10,
        "current_stock": 8
    })
    assert res["raw_roq"] == 22
    assert res["lead_time_demand"] == 20
    assert res["net_needed_quantity"] == 22

def test_moq_constraint_application():
    """
    Test MOQ constraint:
    Given: raw_roq=22, MOQ=25
    Expected: rounds up to MOQ 25
    Given: raw_roq=27, MOQ=25
    Expected: rounds up to next batch (50)
    """
    res1 = apply_moq.invoke({"raw_roq": 22, "moq": 25})
    assert res1["recommended_order_quantity"] == 25
    assert res1["batches"] == 1

    res2 = apply_moq.invoke({"raw_roq": 27, "moq": 25})
    assert res2["recommended_order_quantity"] == 50
    assert res2["batches"] == 2

def test_daily_sales_velocity_calculation():
    """
    Test rolling sales velocity computation over 30 days.
    """
    mock_sales = [
        {"items": [{"name": "Samsung 55 Inch TV", "quantity": 10}]},
        {"items": [{"name": "Samsung 55 Inch TV", "quantity": 20}]},
        {"items": [{"name": "Other Item", "quantity": 5}]}
    ]
    res = calculate_daily_sales_velocity.invoke({
        "sales_records": mock_sales,
        "product_identifier": "Samsung 55 Inch TV",
        "days": 30
    })
    assert res["total_units_sold"] == 30
    assert res["daily_sales_velocity"] == 1.0

def test_stockout_risk_assessment():
    """
    Test forward coverage days and stockout risk levels.
    """
    cov = calculate_stock_coverage.invoke({"current_stock": 8, "daily_sales_velocity": 4.0})
    assert cov["coverage_days"] == 2.0

    risk = calculate_stock_risk.invoke({"coverage_days": 2.0, "lead_time_days": 5, "current_stock": 8})
    assert risk["stockout_risk"] in ["high", "critical"]

    zero_stock_risk = calculate_stock_risk.invoke({"coverage_days": 0.0, "lead_time_days": 5, "current_stock": 0})
    assert zero_stock_risk["stockout_risk"] == "critical"

def test_reorder_policy_rag_retrieval():
    """
    Ensure policy-dependent decisions retrieve grounding documents from RAG.
    """
    policy = retrieve_reorder_policy.invoke({})
    assert "ROQ" in policy["context"] or "Lead Time" in policy["context"]
    assert len(policy["sources"]) >= 1
    assert any("reorder_policy" in s["source"] for s in policy["sources"])

def test_agent_multi_step_replenishment_execution():
    """
    Test full multi-step RetailDecisionAgent execution:
    Inventory -> Sales -> RAG -> Calculations -> Decision
    """
    mock_state = {
        "question": "Which products should I reorder this week?",
        "session_id": "test-agent-session",
        "user_id": None,
        "platform": "web",
        "intent": "COMPLEX_AGENT",
        "confidence": 0.98,
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

    result = RetailDecisionAgent.execute(mock_state)
    assert result["response_type"] == "recommendation"
    assert "get_low_stock_products" in result["tools_called"]
    assert "get_sales" in result["tools_called"]
    assert "retrieve_reorder_policy" in result["tools_called"]
    assert len(result["sources"]) >= 1
    assert result["data"] is not None
    assert "products" in result["data"]
    assert "recommendations" in result["data"]
    assert result["requires_approval"] is True

def test_tool_avoidance_on_simple_query():
    """
    Ensure simple queries like 'Which products are low in stock?' route directly
    to INVENTORY rather than invoking the multi-step complex agent.
    """
    state_simple = {
        "question": "Which products are currently low in stock?",
        "session_id": "test-simple",
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
    routed = route_query_node(state_simple)
    assert routed["intent"] == "INVENTORY"

def test_complex_query_activates_agent():
    """
    Ensure analytical decision query activates COMPLEX_AGENT.
    """
    state_complex = {
        "question": "Which products are at the highest risk of stockout and how much should we order?",
        "session_id": "test-complex",
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
    routed = route_query_node(state_complex)
    assert routed["intent"] == "COMPLEX_AGENT"

def test_memory_ordinal_resolution():
    """
    Ensure conversation memory resolves ordinal follow-up references ('first one').
    """
    mem = ConversationMemoryManager(max_history_per_session=5)
    sid = "ordinal-session-1"

    mem.add_assistant_message(
        session_id=sid,
        content="We recommend reordering Apple iPhone 15 Pro and Samsung Galaxy S24 Ultra.",
        metadata={"referenced_products": ["Apple iPhone 15 Pro", "Samsung Galaxy S24 Ultra"]}
    )

    resolved = mem.resolve_follow_up_query(sid, "How many should I order for the first one?")
    assert "Apple iPhone 15 Pro" in resolved

def test_response_validation_repair():
    """
    Test validator repairs recommendations that violate MOQ constraints.
    """
    invalid_state = {
        "answer": "Recommendation: Order 3 units.",
        "intent": "COMPLEX_AGENT",
        "response_type": "recommendation",
        "sources": [{"source": "reorder_policy.md"}],
        "data": {
            "products": [
                {
                    "product_name": "Apple iPhone 15 Pro",
                    "calculated_roq": 3,
                    "recommended_quantity": 3, # Below MOQ 10
                    "moq": 10
                }
            ]
        }
    }

    validated = validate_response_node(invalid_state)
    repaired_prod = validated["data"]["products"][0]
    assert repaired_prod["recommended_quantity"] >= 10
    assert validated["data"]["requires_user_confirmation"] is True

def test_human_approval_api_endpoint():
    """
    Test recommendation confirmation endpoint (Approve & Reject).
    """
    # 1. Approve
    r_approve = client.post("/ai/events/recommendations/confirm", json={
        "productName": "Apple iPhone 15 Pro",
        "quantity": 25,
        "decision": "approved",
        "notes": "Weekly procurement approval",
        "userId": "procurement-manager"
    })
    assert r_approve.status_code == 200
    res_data = r_approve.json()
    assert res_data["success"] is True
    assert "po_draft_created" in res_data["auditLog"]["status"]

    # 2. Reject
    r_reject = client.post("/ai/events/recommendations/confirm", json={
        "productName": "Old SKU",
        "quantity": 50,
        "decision": "rejected",
        "notes": "Discontinued item",
        "userId": "procurement-manager"
    })
    assert r_reject.status_code == 200
    assert "order_cancelled" in r_reject.json()["auditLog"]["status"]
