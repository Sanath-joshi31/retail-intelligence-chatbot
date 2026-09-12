import time
from typing import Dict, Any
from agents.state import AgentState
from rag.pipeline import RAGPipeline

def rag_node(state: AgentState) -> Dict[str, Any]:
    question = state["question"]
    pipeline = RAGPipeline()
    res = pipeline.run(question)
    
    return {
        "answer": res["answer"],
        "sources": res.get("sources", []),
        "response_type": "text",
        "latency": {
            "retrieval_ms": res["latency"]["retrieval_ms"],
            "llm_ms": res["latency"]["llm_ms"],
            "total_ms": res["latency"]["total_ms"]
        }
    }
