import time
from typing import Dict, Any, List, Optional
from langchain_core.messages import SystemMessage, HumanMessage
from rag.retriever import EnterpriseKnowledgeRetriever
from llm.model import get_llm
from llm.prompts import RAG_SYSTEM_PROMPT, RAG_USER_PROMPT_TEMPLATE

class RAGPipeline:
    def __init__(
        self,
        retriever: Optional[EnterpriseKnowledgeRetriever] = None,
        llm=None
    ):
        self.retriever = retriever or EnterpriseKnowledgeRetriever.get_instance()
        self.llm = llm or get_llm()

    def run(
        self,
        question: str,
        k: int = 3,
        category: Optional[str] = None
    ) -> Dict[str, Any]:
        total_start = time.time()
        
        # 1. Retrieval step
        retrieval_start = time.time()
        retrieved_docs = self.retriever.retrieve(
            query=question,
            k=k,
            category=category
        )
        retrieval_ms = (time.time() - retrieval_start) * 1000

        # 2. Context formatting
        context_str, sources = self.retriever.format_context_and_sources(retrieved_docs)

        # 3. Prompt construction
        prompt_content = RAG_USER_PROMPT_TEMPLATE.format(
            context=context_str,
            question=question
        )
        messages = [
            SystemMessage(content=RAG_SYSTEM_PROMPT),
            HumanMessage(content=prompt_content)
        ]

        # 4. LLM Generation step
        llm_start = time.time()
        ai_message = self.llm.invoke(messages)
        llm_ms = (time.time() - llm_start) * 1000

        total_ms = (time.time() - total_start) * 1000

        return {
            "answer": ai_message.content,
            "sources": sources,
            "retrieved_count": len(retrieved_docs),
            "latency": {
                "retrieval_ms": round(retrieval_ms, 2),
                "llm_ms": round(llm_ms, 2),
                "total_ms": round(total_ms, 2)
            }
        }
