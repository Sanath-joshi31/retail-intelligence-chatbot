from typing import List, Dict, Any, Optional, Tuple
from langchain_core.documents import Document
from rag.loaders import DocumentLoader
from rag.chunking import DocumentChunker
from rag.vectorstore import BaseVectorStore, InMemoryVectorStore
from rag.embeddings import get_embeddings_provider

class EnterpriseKnowledgeRetriever:
    _instance: Optional["EnterpriseKnowledgeRetriever"] = None
    
    def __init__(self, vectorstore: Optional[BaseVectorStore] = None):
        self.vectorstore = vectorstore or InMemoryVectorStore(embeddings=get_embeddings_provider())
        self.loader = DocumentLoader()
        self.chunker = DocumentChunker(chunk_size=450, chunk_overlap=50)
        self._is_indexed = False

    @classmethod
    def get_instance(cls) -> "EnterpriseKnowledgeRetriever":
        if cls._instance is None:
            cls._instance = EnterpriseKnowledgeRetriever()
            cls._instance.initialize_knowledge_base()
        return cls._instance

    def initialize_knowledge_base(self, force_reload: bool = False):
        if self._is_indexed and not force_reload:
            return

        raw_docs = self.loader.load_all()
        if raw_docs:
            chunks = self.chunker.chunk_documents(raw_docs)
            self.vectorstore.add_documents(chunks)
            self._is_indexed = True

    def retrieve(
        self,
        query: str,
        k: int = 3,
        category: Optional[str] = None,
        score_threshold: float = 0.0
    ) -> List[Tuple[Document, float]]:
        self.initialize_knowledge_base()
        
        filter_dict = {"category": category} if category else None
        results = self.vectorstore.similarity_search_with_score(
            query=query,
            k=k,
            filter_dict=filter_dict
        )
        
        if score_threshold > 0:
            results = [(doc, score) for doc, score in results if score >= score_threshold]
            
        return results

    def format_context_and_sources(
        self,
        retrieved: List[Tuple[Document, float]]
    ) -> Tuple[str, List[Dict[str, Any]]]:
        if not retrieved:
            return "No relevant enterprise knowledge found.", []

        context_blocks = []
        sources = []
        seen_sources = set()

        for idx, (doc, score) in enumerate(retrieved, start=1):
            src_name = doc.metadata.get("source", "Unknown Document")
            page_num = doc.metadata.get("page", 1)
            cat = doc.metadata.get("category", "General")
            
            context_blocks.append(f"[Document {idx} - Source: {src_name} (Category: {cat}, Page: {page_num})]\n{doc.page_content}")
            
            src_key = f"{src_name}:{page_num}"
            if src_key not in seen_sources:
                sources.append({
                    "source": src_name,
                    "page": page_num,
                    "category": cat,
                    "snippet": doc.page_content[:150] + "..." if len(doc.page_content) > 150 else doc.page_content
                })
                seen_sources.add(src_key)

        formatted_context = "\n\n".join(context_blocks)
        return formatted_context, sources
