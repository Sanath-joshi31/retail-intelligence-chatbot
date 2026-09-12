import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from utils.logging import logger
from utils.telemetry import metrics_collector
from fastapi.testclient import TestClient
from app import app

client = TestClient(app)

def test_logger_sanitizes_credentials():
    dirty_data = {
        "user_id": "u1",
        "api_key": "sk-secret-12345",
        "nested": {
            "password": "super-password",
            "auth_token": "token-xyz",
            "safe_field": "visible_value"
        }
    }
    sanitized = logger._sanitize(dirty_data)
    assert sanitized["api_key"] == "***REDACTED***"
    assert sanitized["nested"]["password"] == "***REDACTED***"
    assert sanitized["nested"]["auth_token"] == "***REDACTED***"
    assert sanitized["nested"]["safe_field"] == "visible_value"

def test_telemetry_metrics_collector():
    metrics_collector.record_request(
        request_id="req-1",
        session_id="s1",
        intent="RAG",
        tools_called=[],
        documents_count=2,
        latency_breakdown={"retrieval_ms": 10.0, "total_ms": 50.0},
        success=True
    )
    
    summary = metrics_collector.get_summary()
    assert summary["total_requests"] >= 1
    assert "latency_ms" in summary
    assert "p50" in summary["latency_ms"]
    assert "p95" in summary["latency_ms"]

def test_metrics_api_endpoint():
    response = client.get("/ai/metrics")
    assert response.status_code == 200
    data = response.json()
    assert "total_requests" in data
    assert "intents_distribution" in data
    assert "latency_ms" in data
