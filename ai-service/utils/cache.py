import time
from typing import Dict, Any, Optional

class SimpleCache:
    _instance: Optional["SimpleCache"] = None

    def __init__(self, default_ttl_seconds: int = 120):
        self.default_ttl = default_ttl_seconds
        self._store: Dict[str, Dict[str, Any]] = {}

    @classmethod
    def get_instance(cls) -> "SimpleCache":
        if cls._instance is None:
            cls._instance = SimpleCache()
        return cls._instance

    def get(self, key: str) -> Optional[Any]:
        entry = self._store.get(key.lower().strip())
        if not entry:
            return None
        if time.time() > entry["expires_at"]:
            del self._store[key.lower().strip()]
            return None
        return entry["data"]

    def set(self, key: str, data: Any, ttl: Optional[int] = None):
        duration = ttl if ttl is not None else self.default_ttl
        self._store[key.lower().strip()] = {
            "data": data,
            "expires_at": time.time() + duration
        }

    def clear(self):
        self._store.clear()

response_cache = SimpleCache.get_instance()
