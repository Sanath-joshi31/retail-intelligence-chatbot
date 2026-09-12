from typing import List, Dict, Any, Optional
from rag.retriever import EnterpriseKnowledgeRetriever

class RetrievalEvaluator:
    def __init__(self, retriever: Optional[EnterpriseKnowledgeRetriever] = None):
        self.retriever = retriever or EnterpriseKnowledgeRetriever.get_instance()

    def evaluate_retrieval(
        self,
        test_dataset: List[Dict[str, Any]],
        k: int = 3
    ) -> Dict[str, Any]:
        """
        test_dataset items format:
        {
            "query": str,
            "expected_source": str, # e.g. "return_policy.md"
            "category": Optional[str]
        }
        """
        total_queries = len(test_dataset)
        hits = 0
        latencies = []

        detailed_results = []

        for item in test_dataset:
            query = item["query"]
            expected_src = item["expected_source"]
            
            import time
            t0 = time.time()
            retrieved = self.retriever.retrieve(query=query, k=k, category=item.get("category"))
            latency_ms = (time.time() - t0) * 1000
            latencies.append(latency_ms)

            retrieved_sources = [doc.metadata.get("source") for doc, _ in retrieved]
            is_hit = any(expected_src.lower() in s.lower() for s in retrieved_sources)
            if is_hit:
                hits += 1

            detailed_results.append({
                "query": query,
                "expected": expected_src,
                "retrieved_sources": retrieved_sources,
                "hit": is_hit,
                "latency_ms": round(latency_ms, 2)
            })

        hit_rate = (hits / total_queries) if total_queries > 0 else 0.0
        avg_latency = sum(latencies) / len(latencies) if latencies else 0.0

        return {
            "total_queries": total_queries,
            "hits": hits,
            "hit_rate": round(hit_rate, 4),
            "avg_latency_ms": round(avg_latency, 2),
            "results": detailed_results
        }
