import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
import time
from utils.cache import SimpleCache
from fastapi.testclient import TestClient
from app import app

client = TestClient(app)

def test_simple_cache_lifecycle():
    cache = SimpleCache(default_ttl_seconds=2)
    cache.set("test-key", {"foo": "bar"})
    
    assert cache.get("test-key") == {"foo": "bar"}
    assert cache.get("non-existent") is None

    # Test case insensitivity
    assert cache.get("TEST-KEY") == {"foo": "bar"}

def test_api_caching_speedup():
    query_payload = {
        "message": "What is the return policy for electronics?",
        "sessionId": "perf-test"
    }
    
    # First request: un-cached execution
    t0 = time.time()
    res1 = client.post("/ai/chat", json=query_payload)
    t1 = time.time()
    first_latency = (t1 - t0) * 1000
    assert res1.status_code == 200

    # Second request: served instantly from cache
    t2 = time.time()
    res2 = client.post("/ai/chat", json=query_payload)
    t3 = time.time()
    cached_latency = (t3 - t2) * 1000
    assert res2.status_code == 200
    assert res2.json()["metadata"]["source"] == "cached-agent"
    assert cached_latency < 50, f"Cached response should be <50ms, got {cached_latency:.2f}ms"
