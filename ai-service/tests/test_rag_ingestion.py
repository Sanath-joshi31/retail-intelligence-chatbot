import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from rag.loaders import DocumentLoader
from rag.chunking import DocumentChunker

def test_document_loader_loads_all():
    loader = DocumentLoader()
    documents = loader.load_all()
    
    assert len(documents) >= 5, f"Expected at least 5 documents, got {len(documents)}"
    
    sources = [doc.metadata.get("source") for doc in documents]
    assert "return_policy.md" in sources
    assert "reorder_policy.md" in sources
    assert "warranty_policy.md" in sources
    assert "customer_faq.md" in sources
    assert "shipping_and_operations.md" in sources

    # Verify metadata fields
    for doc in documents:
        assert "source" in doc.metadata
        assert "category" in doc.metadata
        assert "document_type" in doc.metadata
        assert len(doc.page_content) > 20

def test_document_chunker():
    loader = DocumentLoader()
    documents = loader.load_all()
    
    chunker = DocumentChunker(chunk_size=400, chunk_overlap=40)
    chunks = chunker.chunk_documents(documents)
    
    assert len(chunks) > len(documents), "Chunks count should exceed document count"
    
    for chunk in chunks:
        assert "source" in chunk.metadata
        assert "chunk_index" in chunk.metadata
        assert "total_chunks" in chunk.metadata
        assert "category" in chunk.metadata
        assert len(chunk.page_content) > 0
        assert len(chunk.page_content) <= 500
