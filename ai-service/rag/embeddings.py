from abc import ABC, abstractmethod
from typing import List
import numpy as np
import os
import hashlib
from config.settings import settings

class BaseEmbeddings(ABC):
    @abstractmethod
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        pass

    @abstractmethod
    def embed_query(self, text: str) -> List[float]:
        pass

class OpenAIEmbeddingsWrapper(BaseEmbeddings):
    def __init__(self, api_key: str = None, model: str = None):
        self.api_key = api_key or settings.OPENAI_API_KEY
        self.model = model or settings.EMBEDDING_MODEL
        self._client = None
        
        if self.api_key and self.api_key != "your-openai-api-key-here":
            from openai import OpenAI
            self._client = OpenAI(api_key=self.api_key)

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        if not self._client:
            return LocalFallbackEmbeddings().embed_documents(texts)
        
        response = self._client.embeddings.create(
            input=texts,
            model=self.model
        )
        return [item.embedding for item in response.data]

    def embed_query(self, text: str) -> List[float]:
        if not self._client:
            return LocalFallbackEmbeddings().embed_query(text)
        
        response = self._client.embeddings.create(
            input=[text],
            model=self.model
        )
        return response.data[0].embedding

class LocalFallbackEmbeddings(BaseEmbeddings):
    """
    Deterministic semantic hash/TF embedding for reliable offline testing
    and fallback when no external API key is configured.
    Generates normalized 256-dimensional semantic projection vectors.
    """
    def __init__(self, dim: int = 256):
        self.dim = dim

    def _embed_single(self, text: str) -> List[float]:
        words = text.lower().replace("\n", " ").split()
        vec = np.zeros(self.dim, dtype=np.float32)
        
        if not words:
            vec[0] = 1.0
            return vec.tolist()

        for word in words:
            # Hash word into bucket
            h = int(hashlib.md5(word.encode("utf-8")).hexdigest(), 16)
            idx = h % self.dim
            weight = 1.0 + (len(word) / 10.0)
            sign = 1.0 if ((h >> 8) & 1) == 0 else -1.0
            vec[idx] += sign * weight

        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        else:
            vec[0] = 1.0

        return vec.tolist()

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return [self._embed_single(t) for t in texts]

    def embed_query(self, text: str) -> List[float]:
        return self._embed_single(text)

def get_embeddings_provider() -> BaseEmbeddings:
    if settings.OPENAI_API_KEY and settings.OPENAI_API_KEY != "your-openai-api-key-here":
        try:
            return OpenAIEmbeddingsWrapper()
        except Exception:
            return LocalFallbackEmbeddings()
    return LocalFallbackEmbeddings()
