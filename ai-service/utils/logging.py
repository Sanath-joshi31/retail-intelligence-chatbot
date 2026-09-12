import logging
import sys
import json
import time
from typing import Optional, Dict, Any

class StructuredLogger:
    def __init__(self, name: str = "retail-ai-service"):
        self.logger = logging.getLogger(name)
        self.logger.setLevel(logging.INFO)
        
        if not self.logger.handlers:
            handler = logging.StreamHandler(sys.stdout)
            formatter = logging.Formatter(
                fmt="[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s",
                datefmt="%Y-%m-%d %H:%M:%S"
            )
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)

    def log_event(
        self,
        event_name: str,
        level: str = "info",
        request_id: Optional[str] = None,
        session_id: Optional[str] = None,
        user_id: Optional[str] = None,
        data: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None
    ):
        payload = {
            "event": event_name,
            "timestamp": time.time(),
            "request_id": request_id,
            "session_id": session_id,
            "user_id": user_id,
            "error": error,
            **(data or {})
        }
        
        # Sanitize sensitive fields
        sanitized = self._sanitize(payload)
        msg = json.dumps(sanitized, default=str)
        
        if level.lower() == "error":
            self.logger.error(msg)
        elif level.lower() == "warning":
            self.logger.warning(msg)
        elif level.lower() == "debug":
            self.logger.debug(msg)
        else:
            self.logger.info(msg)

    def _sanitize(self, data: Any) -> Any:
        if isinstance(data, dict):
            clean = {}
            for k, v in data.items():
                if any(secret_key in k.lower() for secret_key in ["key", "token", "secret", "password", "auth"]):
                    clean[k] = "***REDACTED***"
                else:
                    clean[k] = self._sanitize(v)
            return clean
        elif isinstance(data, list):
            return [self._sanitize(i) for i in data]
        return data

logger = StructuredLogger()
