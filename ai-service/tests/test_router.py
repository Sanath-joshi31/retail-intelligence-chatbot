import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from agents.router import route_query_node, classify_intent_heuristics

def test_intent_routing_benchmarks():
    test_cases = [
        ("What is our electronics return policy?", "RAG"),
        ("What is the warranty period for computers?", "RAG"),
        ("Which products are currently low in stock?", "INVENTORY"),
        ("What is our current inventory value?", "INVENTORY"),
        ("What was our revenue last month?", "SALES"),
        ("Top selling items in the store", "SALES"),
        ("Forecast next week's sales", "FORECAST"),
        ("Recommend products", "PRODUCTS"),
        ("Hello! How can you help me?", "GENERAL"),
        ("Which products should I reorder based on current inventory, last 30 days of sales, and our company reorder policy?", "COMPLEX_AGENT"),
        ("Evaluate stock replenishment considering lead time and sales velocity", "COMPLEX_AGENT")
    ]

    for query, expected_intent in test_cases:
        state = {
            "question": query,
            "session_id": "test",
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
        res = route_query_node(state)
        assert res["intent"] == expected_intent, f"Query '{query}' was routed to '{res['intent']}', expected '{expected_intent}'"
        assert res["confidence"] >= 0.8
