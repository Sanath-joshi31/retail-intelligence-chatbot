import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from rag.pipeline import RAGPipeline

def test_rag_pipeline_electronics_return():
    pipeline = RAGPipeline()
    result = pipeline.run("What is our electronics return policy?")
    
    assert "answer" in result
    assert len(result["answer"]) > 10
    assert len(result["sources"]) >= 1
    assert any("return_policy" in s["source"] for s in result["sources"])
    assert "latency" in result
    assert result["latency"]["total_ms"] > 0

def test_rag_pipeline_reorder_policy():
    pipeline = RAGPipeline()
    result = pipeline.run("What is the company reorder formula and lead time?")
    
    assert "answer" in result
    assert len(result["sources"]) >= 1
    assert any("reorder_policy" in s["source"] for s in result["sources"])

def test_rag_pipeline_unknown_question():
    pipeline = RAGPipeline()
    result = pipeline.run("How many aliens landed on Mars in 1942?")
    
    assert "answer" in result
    # Should produce polite fallback or acknowledge lack of documentation
    assert len(result["answer"]) > 0
