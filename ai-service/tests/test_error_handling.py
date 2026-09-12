import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from fastapi.testclient import TestClient
from app import app
from rag.pipeline import RAGPipeline
from rag.retriever import EnterpriseKnowledgeRetriever
from rag.vectorstore import InMemoryVectorStore
from tools.db_client import DatabaseClient
from agents.graph import agent_graph

client = TestClient(app)

def test_empty_retriever_controlled_fallback():
    # Test RAG pipeline when vectorstore is empty
    empty_store = InMemoryVectorStore()
    empty_retriever = EnterpriseKnowledgeRetriever(vectorstore=empty_store)
    # Don't initialize documents
    empty_retriever._is_indexed = True

    pipeline = RAGPipeline(retriever=empty_retriever)
    result = pipeline.run("What is our electronics return policy?")
    assert "answer" in result
    assert len(result["sources"]) == 0
    # Should say could not find specific information without throwing exception
    assert "could not find" in result["answer"].lower() or "policies" in result["answer"].lower()

def test_database_offline_safe_handling():
    # Test that DB client handles disconnected mongo gracefully
    db = DatabaseClient.get_instance()
    # Query should return valid list even if mongodb is unreachable (via mock/seed fallback)
    products = db.get_products()
    assert isinstance(products, list)
    assert len(products) > 0

def test_agent_graph_malformed_input_resilience():
    # Pass unusual empty string
    state = {
        "question": "",
        "session_id": "err-session",
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
    result = agent_graph.invoke(state)
    assert "answer" in result
    assert len(result["answer"]) > 0
    assert not result["answer"].startswith("Traceback")

def test_api_400_on_empty_message():
    response = client.post("/ai/chat", json={"message": "", "sessionId": "test"})
    assert response.status_code == 400
    assert "cannot be empty" in response.json()["detail"]
