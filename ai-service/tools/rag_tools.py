from typing import Dict, Any, List, Optional
from langchain_core.tools import tool
from rag.retriever import EnterpriseKnowledgeRetriever

@tool
def retrieve_reorder_policy(query: str = "reorder formula lead time safety stock MOQ") -> Dict[str, Any]:
    """
    Retrieves the enterprise inventory reorder and replenishment policy, containing
    lead times by category, safety stock requirements, and Minimum Order Quantities (MOQs).
    """
    retriever = EnterpriseKnowledgeRetriever.get_instance()
    results = retriever.retrieve(query, k=2, category="inventory")
    context, sources = retriever.format_context_and_sources(results)
    return {
        "policy_type": "reorder_policy",
        "context": context,
        "sources": sources
    }

@tool
def retrieve_business_policy(policy_name_or_query: str) -> Dict[str, Any]:
    """
    Retrieves company business policies (e.g. return policy, warranty, shipping, restocking fees).
    """
    retriever = EnterpriseKnowledgeRetriever.get_instance()
    results = retriever.retrieve(policy_name_or_query, k=3, category="policies")
    context, sources = retriever.format_context_and_sources(results)
    return {
        "query": policy_name_or_query,
        "context": context,
        "sources": sources
    }

@tool
def search_knowledge_base(query: str, category: Optional[str] = None) -> Dict[str, Any]:
    """
    Performs semantic vector search across all enterprise knowledge documents and FAQs.
    """
    retriever = EnterpriseKnowledgeRetriever.get_instance()
    results = retriever.retrieve(query, k=3, category=category)
    context, sources = retriever.format_context_and_sources(results)
    return {
        "query": query,
        "category": category or "all",
        "context": context,
        "sources": sources
    }
