import time
from typing import List, Dict, Any, Optional
from collections import defaultdict

class ConversationMessage:
    def __init__(
        self,
        role: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None,
        timestamp: Optional[float] = None
    ):
        self.role = role # "user" or "assistant"
        self.content = content
        self.metadata = metadata or {}
        self.timestamp = timestamp or time.time()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "role": self.role,
            "content": self.content,
            "metadata": self.metadata,
            "timestamp": self.timestamp
        }

class ConversationMemoryManager:
    _instance: Optional["ConversationMemoryManager"] = None

    def __init__(self, max_history_per_session: int = 20):
        self.max_history = max_history_per_session
        self._sessions: Dict[str, List[ConversationMessage]] = defaultdict(list)
        self._session_entities: Dict[str, Dict[str, Any]] = defaultdict(dict)

    @classmethod
    def get_instance(cls) -> "ConversationMemoryManager":
        if cls._instance is None:
            cls._instance = ConversationMemoryManager()
        return cls._instance

    def add_user_message(
        self,
        session_id: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> ConversationMessage:
        msg = ConversationMessage(role="user", content=content, metadata=metadata)
        self._sessions[session_id].append(msg)
        self._prune(session_id)
        return msg

    def add_assistant_message(
        self,
        session_id: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> ConversationMessage:
        msg = ConversationMessage(role="assistant", content=content, metadata=metadata)
        self._sessions[session_id].append(msg)
        self._prune(session_id)
        
        # Track referenced products or focus entities for follow-up turns
        if metadata and metadata.get("referenced_products"):
            self._session_entities[session_id]["last_products"] = metadata["referenced_products"]
            
        return msg

    def get_history(self, session_id: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        history = self._sessions.get(session_id, [])
        if limit:
            history = history[-limit:]
        return [msg.to_dict() for msg in history]

    def get_last_entities(self, session_id: str) -> Dict[str, Any]:
        return self._session_entities.get(session_id, {})

    def resolve_follow_up_query(self, session_id: str, query: str) -> str:
        """
        Resolves ambiguous conversational references like 'which one', 'it', 'them',
        or ordinal references like 'first one', 'second one' using recent context.
        """
        q_lower = query.lower()
        entities = self.get_last_entities(session_id)
        last_products = entities.get("last_products", [])

        # Handle ordinal references
        if last_products:
            ordinals = [
                ("first", 0), ("1st", 0),
                ("second", 1), ("2nd", 1),
                ("third", 2), ("3rd", 2),
                ("fourth", 3), ("4th", 3),
                ("fifth", 4), ("5th", 4)
            ]
            for ord_word, idx in ordinals:
                pattern = f"{ord_word} one"
                if pattern in q_lower or f"the {ord_word}" in q_lower or f"{ord_word} item" in q_lower or f"{ord_word} product" in q_lower:
                    if idx < len(last_products):
                        target_product = last_products[idx]
                        return f"{query} (Context: specifically referring to '{target_product}')"

        if any(ref in q_lower for ref in ["which one", "which item", "how many should we reorder", "tell me more about it"]):
            if last_products:
                prod_names = ", ".join(last_products)
                return f"{query} (Context: regarding previously discussed items: {prod_names})"
        return query

    def clear_session(self, session_id: str) -> bool:
        if session_id in self._sessions:
            del self._sessions[session_id]
        if session_id in self._session_entities:
            del self._session_entities[session_id]
        return True

    def _prune(self, session_id: str):
        if len(self._sessions[session_id]) > self.max_history:
            self._sessions[session_id] = self._sessions[session_id][-self.max_history:]
