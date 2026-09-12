import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from agents.nodes.validator_node import validate_response_node
from agents.graph import agent_graph

def test_validate_response_cleans_prompt_leaks():
    state = {
        "question": "Test",
        "session_id": "s1",
        "user_id": None,
        "platform": "web",
        "intent": "GENERAL",
        "confidence": 1.0,
        "documents": [],
        "sources": [],
        "tool_results": [],
        "tools_called": [],
        "messages": [],
        "answer": "SYSTEM PROMPT: You are assistant\n<think>Thinking...</think>\nHello! Welcome to Retail AI.",
        "response_type": "text",
        "chart_data": None,
        "chart_type": None,
        "data": None,
        "latency": {},
        "error": None
    }
    cleaned = validate_response_node(state)
    assert "<think>" not in cleaned["answer"]
    assert "SYSTEM PROMPT" not in cleaned["answer"]
    assert "Hello! Welcome to Retail AI." in cleaned["answer"]

def test_validate_response_handles_errors():
    state = {
        "question": "Test",
        "session_id": "s1",
        "user_id": None,
        "platform": "web",
        "intent": "INVENTORY",
        "confidence": 1.0,
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
        "error": "MongoDB connection timed out"
    }
    result = validate_response_node(state)
    assert "temporary issue" in result["answer"]
    assert "MongoDB connection timed out" in result["answer"]

def test_graph_with_validator_end_to_end():
    initial_state = {
        "question": "What is our electronics return policy?",
        "session_id": "test-val-graph",
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
    res = agent_graph.invoke(initial_state)
    assert len(res["answer"]) > 10
    assert "<think>" not in res["answer"]
    assert "return_policy" in res["sources"][0]["source"]
