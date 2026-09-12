import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from evaluation.retrieval import RetrievalEvaluator
from evaluation.generation import GenerationEvaluator

def test_retrieval_benchmark():
    evaluator = RetrievalEvaluator()
    benchmark_queries = [
        {
            "query": "What is the electronics return policy and restocking fee?",
            "expected_source": "return_policy.md",
            "category": "policies"
        },
        {
            "query": "How is the company reorder point and safety stock calculated?",
            "expected_source": "reorder_policy.md",
            "category": "inventory"
        },
        {
            "query": "What are the standard warranty coverage terms for computers and appliances?",
            "expected_source": "warranty_policy.md",
            "category": "policies"
        },
        {
            "query": "What is your price matching policy against competitors?",
            "expected_source": "customer_faq.md",
            "category": "faq"
        },
        {
            "query": "What are the expedited 2-day air shipping cutoff times?",
            "expected_source": "shipping_and_operations.md",
            "category": "business"
        }
    ]

    metrics = evaluator.evaluate_retrieval(benchmark_queries, k=3)
    assert metrics["hit_rate"] >= 0.8, f"Expected hit rate >= 0.8, got {metrics['hit_rate']}"
    assert metrics["avg_latency_ms"] < 500, "Retrieval latency should be fast (<500ms)"

def test_generation_grounding_and_hallucination():
    evaluator = GenerationEvaluator()
    benchmark_dataset = [
        {
            "query": "What is the return period for electronics and restocking fee?",
            "must_contain_keywords": ["14", "restocking", "electronics"],
            "expected_source": "return_policy.md",
            "is_out_of_domain": False
        },
        {
            "query": "How are customer loyalty reward points earned and converted?",
            "must_contain_keywords": ["point", "reward", "$5", "100"],
            "expected_source": "customer_faq.md",
            "is_out_of_domain": False
        },
        {
            "query": "Can I fly an orbital spaceship to the Jupiter moon Europa?",
            "expected_source": "",
            "is_out_of_domain": True
        }
    ]

    metrics = evaluator.evaluate_grounding_and_citations(benchmark_dataset)
    assert metrics["grounding_score"] >= 0.9, f"Expected grounding score >= 0.9, got {metrics['grounding_score']}"
    assert metrics["citation_score"] >= 0.9, f"Expected citation score >= 0.9, got {metrics['citation_score']}"
    assert metrics["out_of_domain_handling_score"] >= 0.9, f"Expected out of domain score >= 0.9, got {metrics['out_of_domain_handling_score']}"
