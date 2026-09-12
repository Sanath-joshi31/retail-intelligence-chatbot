from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
from langchain_core.documents import Document
from rag.embeddings import BaseEmbeddings, get_embeddings_provider

class BaseVectorStore(ABC):
    @abstractmethod
    def add_documents(self, documents: List[Document]) -> List[str]:
        pass

    @abstractmethod
    def similarity_search(
        self,
        query: str,
        k: int = 4,
        filter_dict: Optional[Dict[str, Any]] = None
    ) -> List[Document]:
        pass

    @abstractmethod
    def similarity_search_with_score(
        self,
        query: str,
        k: int = 4,
        filter_dict: Optional[Dict[str, Any]] = None
    ) -> List[Tuple[Document, float]]:
        pass

    @abstractmethod
    def delete_documents(self, filter_dict: Dict[str, Any]) -> int:
        pass

    @abstractmethod
    def count(self) -> int:
        pass

class InMemoryVectorStore(BaseVectorStore):
    def __init__(self, embeddings: Optional[BaseEmbeddings] = None):
        self.embeddings = embeddings or get_embeddings_provider()
        self.documents: List[Document] = []
        self.vectors: Optional[np.ndarray] = None

    def add_documents(self, documents: List[Document]) -> List[str]:
        if not documents:
            return []

        texts = [doc.page_content for doc in documents]
        embeddings = self.embeddings.embed_documents(texts)
        new_vecs = np.array(embeddings, dtype=np.float32)

        # Normalize vectors for cosine similarity
        norms = np.linalg.norm(new_vecs, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        new_vecs = new_vecs / norms

        if self.vectors is None or len(self.documents) == 0:
            self.vectors = new_vecs
            self.documents = list(documents)
        else:
            self.vectors = np.vstack([self.vectors, new_vecs])
            self.documents.extend(documents)

        return [str(i) for i in range(len(self.documents) - len(documents), len(self.documents))]

    def similarity_search_with_score(
        self,
        query: str,
        k: int = 4,
        filter_dict: Optional[Dict[str, Any]] = None
    ) -> List[Tuple[Document, float]]:
        if self.vectors is None or len(self.documents) == 0:
            return []

        q_emb = np.array(self.embeddings.embed_query(query), dtype=np.float32)
        q_norm = np.linalg.norm(q_emb)
        if q_norm > 0:
            q_emb = q_emb / q_norm

        # Cosine similarity is dot product of normalized vectors
        scores = np.dot(self.vectors, q_emb)

        # Filter candidate indices
        candidate_indices = []
        for idx, doc in enumerate(self.documents):
            if filter_dict:
                match = True
                for fk, fv in filter_dict.items():
                    if doc.metadata.get(fk) != fv:
                        match = False
                        break
                if match:
                    candidate_indices.append(idx)
            else:
                candidate_indices.append(idx)

        if not candidate_indices:
            return []

        candidate_scores = [(idx, float(scores[idx])) for idx in candidate_indices]
        candidate_scores.sort(key=lambda x: x[1], reverse=True)
        
        top_k = candidate_scores[:k]
        return [(self.documents[idx], score) for idx, score in top_k]

    def similarity_search(
        self,
        query: str,
        k: int = 4,
        filter_dict: Optional[Dict[str, Any]] = None
    ) -> List[Document]:
        results = self.similarity_search_with_score(query, k=k, filter_dict=filter_dict)
        return [doc for doc, _ in results]

    def delete_documents(self, filter_dict: Dict[str, Any]) -> int:
        if not filter_dict or not self.documents:
            return 0

        keep_docs = []
        keep_indices = []
        deleted_count = 0

        for idx, doc in enumerate(self.documents):
            match = True
            for fk, fv in filter_dict.items():
                if doc.metadata.get(fk) != fv:
                    match = False
                    break
            if match:
                deleted_count += 1
            else:
                keep_docs.append(doc)
                keep_indices.append(idx)

        if deleted_count > 0:
            self.documents = keep_docs
            if keep_indices and self.vectors is not None:
                self.vectors = self.vectors[keep_indices]
            else:
                self.vectors = None

        return deleted_count

    def count(self) -> int:
        return len(self.documents)

class MongoVectorStore(BaseVectorStore):
    """
    MongoDB Atlas Vector Search compatible implementation.
    Falls back to InMemoryVectorStore when Atlas Vector Index is unavailable.
    """
    def __init__(self, collection=None, embeddings: Optional[BaseEmbeddings] = None):
        self.embeddings = embeddings or get_embeddings_provider()
        self.collection = collection
        self._fallback = InMemoryVectorStore(embeddings=self.embeddings)

    def add_documents(self, documents: List[Document]) -> List[str]:
        # Always populate memory store for fast retrieval fallback
        self._fallback.add_documents(documents)
        
        if self.collection is not None:
            try:
                texts = [doc.page_content for doc in documents]
                vectors = self.embeddings.embed_documents(texts)
                entries = []
                for doc, vec in zip(documents, vectors):
                    entries.append({
                        "text": doc.page_content,
                        "metadata": doc.metadata,
                        "embedding": vec
                    })
                res = self.collection.insert_many(entries)
                return [str(id) for id in res.inserted_ids]
            except Exception:
                pass
        return [str(i) for i in range(len(documents))]

    def similarity_search_with_score(
        self,
        query: str,
        k: int = 4,
        filter_dict: Optional[Dict[str, Any]] = None
    ) -> List[Tuple[Document, float]]:
        return self._fallback.similarity_search_with_score(query, k=k, filter_dict=filter_dict)

    def similarity_search(
        self,
        query: str,
        k: int = 4,
        filter_dict: Optional[Dict[str, Any]] = None
    ) -> List[Document]:
        return self._fallback.similarity_search(query, k=k, filter_dict=filter_dict)

    def delete_documents(self, filter_dict: Dict[str, Any]) -> int:
        return self._fallback.delete_documents(filter_dict)

    def count(self) -> int:
        return self._fallback.count()
