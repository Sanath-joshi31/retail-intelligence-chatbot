import re
from typing import Tuple, Optional

# Known prompt injection & jailbreak patterns
INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|prior|above)\s+instructions",
    r"disregard\s+(all\s+)?(previous|prior|above)",
    r"reveal\s+(your\s+)?(system\s+prompt|instructions)",
    r"show\s+me\s+(your\s+)?(system\s+prompt|developer\s+mode)",
    r"you\s+are\s+now\s+in\s+DAN\s+mode",
    r"jailbreak",
    r"drop\s+table",
    r"delete\s+from",
    r"system\s+override",
    r"<script>|javascript:",
]

MAX_MESSAGE_LENGTH = 2000

class SecurityGuard:
    @staticmethod
    def sanitize_input(user_input: str) -> Tuple[bool, str, Optional[str]]:
        """
        Validates and sanitizes user input before processing.
        Returns: (is_safe, sanitized_text, optional_reason)
        """
        if not user_input or not user_input.strip():
            return False, "", "Message cannot be empty."

        if len(user_input) > MAX_MESSAGE_LENGTH:
            return False, user_input[:MAX_MESSAGE_LENGTH], f"Message exceeds maximum allowed length of {MAX_MESSAGE_LENGTH} characters."

        # Check for prompt injection attempts
        for pattern in INJECTION_PATTERNS:
            if re.search(pattern, user_input, re.IGNORECASE):
                # Neutralize injection by treating as benign search or blocking
                return True, user_input, "Warning: Potential instruction override detected; treating input strictly as static search query."

        # Strip null bytes and control chars
        sanitized = "".join(ch for ch in user_input if ch.isprintable() or ch in ["\n", "\r", "\t"])

        return True, sanitized, None

    @staticmethod
    def wrap_untrusted_context(context_text: str) -> str:
        """
        Wraps retrieved knowledge base documents in explicit boundary delimiters
        instructing LLM not to execute any embedded instructions.
        """
        return (
            "--- BEGIN UNTRUSTED ENTERPRISE REFERENCE CONTEXT ---\n"
            f"{context_text}\n"
            "--- END UNTRUSTED ENTERPRISE REFERENCE CONTEXT ---"
        )
