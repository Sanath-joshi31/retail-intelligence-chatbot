import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from langchain_core.documents import Document
from rag.embeddings import LocalFallbackEmbeddings
from rag.vectorstore import InMemoryVectorStore
from rag.retriever import EnterpriseKnowledgeRetriever

def test_in_memory_vector_store():
    embeddings = LocalFallbackEmbeddings(dim=128)
    store = InMemoryVectorStore(embeddings=embeddings)
    
    docs = [
        Document(page_content="Electronics have a 14 day return window with 15% restocking fee.", metadata={"category": "policies", "source": "return.md"}),
        Document(page_content="Apparel and footwear can be returned within 45 days of delivery.", metadata={"category": "policies", "source": "return.md"}),
        Document(page_content="Reorder calculation uses daily sales velocity multiplied by lead time.", metadata={"category": "inventory", "source": "reorder.md"}),
        Document(page_content="MacBook Pro features Apple Silicon M3 processor and Thunderbolt ports.", metadata={"category": "product_docs", "source": "laptops.md"})
    ]
    
    store.add_documents(docs)
    assert store.count() == 4
    
    # Query for return policy
    results = store.similarity_search_with_score("electronics return policy 14 days", k=2)
    assert len(results) == 2
    top_doc, top_score = results[0]
    assert "Electronics" in top_doc.page_content
    
    # Query with category filter
    inv_results = store.similarity_search("reorder inventory", k=2, filter_dict={"category": "inventory"})
    assert len(inv_results) == 1
    assert "Reorder calculation" in inv_results[0].page_content

    # Test deletion
    deleted = store.delete_documents({"category": "product_docs"})
    assert deleted == 1
    assert store.count() == 3

def test_enterprise_knowledge_retriever():
    retriever = EnterpriseKnowledgeRetriever.get_instance()
    
    # Test electronics return policy retrieval
    results = retriever.retrieve("What is the return policy for electronics?", k=2)
    assert len(results) >= 1
    
    context, sources = retriever.format_context_and_sources(results)
    assert len(context) > 0
    assert len(sources) >= 1
    assert any("return_policy" in s["source"] for s in sources)

    # Test reorder policy retrieval
    reorder_res = retriever.retrieve("company inventory reorder policy and lead time", k=2)
    assert len(reorder_res) >= 1
    _, reorder_sources = retriever.format_context_and_sources(reorder_res)
    assert any("reorder_policy" in s["source"] for s in reorder_sources)
