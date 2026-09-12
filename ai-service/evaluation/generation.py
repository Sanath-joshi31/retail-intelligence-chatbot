from typing import List, Dict, Any, Optional
from rag.pipeline import RAGPipeline

class GenerationEvaluator:
    def __init__(self, pipeline: Optional[RAGPipeline] = None):
        self.pipeline = pipeline or RAGPipeline()

    def evaluate_grounding_and_citations(
        self,
        test_dataset: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        test_dataset items format:
        {
            "query": str,
            "must_contain_keywords": List[str],
            "expected_source": str,
            "is_out_of_domain": bool
        }
        """
        total = len(test_dataset)
        keyword_matches = 0
        citation_matches = 0
        out_of_domain_success = 0
        out_of_domain_total = 0
        latencies = []
        detailed_evaluations = []

        for item in test_dataset:
            query = item["query"]
            must_contain = item.get("must_contain_keywords", [])
            expected_src = item.get("expected_source", "")
            is_ood = item.get("is_out_of_domain", False)

            res = self.pipeline.run(query)
            answer = res["answer"]
            sources = [s["source"] for s in res.get("sources", [])]
            latencies.append(res["latency"]["total_ms"])

            if is_ood:
                out_of_domain_total += 1
                # Check that model politely admits no policy information found instead of hallucinating
                ood_pass = any(phrase in answer.lower() for phrase in [
                    "could not find", "not find specific information", "check with store", "not available"
                ])
                if ood_pass:
                    out_of_domain_success += 1
                
                detailed_evaluations.append({
                    "query": query,
                    "type": "out_of_domain",
                    "passed": ood_pass,
                    "answer_snippet": answer[:120]
                })
            else:
                # Check required keywords
                kw_pass = any(kw.lower() in answer.lower() for kw in must_contain) if must_contain else True
                if kw_pass:
                    keyword_matches += 1

                # Check citation
                cite_pass = any(expected_src.lower() in s.lower() for s in sources) if expected_src else True
                if cite_pass:
                    citation_matches += 1

                detailed_evaluations.append({
                    "query": query,
                    "type": "grounded_in_domain",
                    "keyword_pass": kw_pass,
                    "citation_pass": cite_pass,
                    "sources": sources,
                    "answer_snippet": answer[:120]
                })

        in_domain_total = total - out_of_domain_total
        grounding_score = (keyword_matches / in_domain_total) if in_domain_total > 0 else 1.0
        citation_score = (citation_matches / in_domain_total) if in_domain_total > 0 else 1.0
        ood_handling_score = (out_of_domain_success / out_of_domain_total) if out_of_domain_total > 0 else 1.0
        avg_latency = sum(latencies) / len(latencies) if latencies else 0.0

        return {
            "total_tested": total,
            "grounding_score": round(grounding_score, 4),
            "citation_score": round(citation_score, 4),
            "out_of_domain_handling_score": round(ood_handling_score, 4),
            "avg_latency_ms": round(avg_latency, 2),
            "details": detailed_evaluations
        }
