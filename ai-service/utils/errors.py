from fastapi import Request, status
from fastapi.responses import JSONResponse
from typing import Optional, Dict, Any

class AIServiceException(Exception):
    def __init__(self, message: str, status_code: int = 500, details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.details = details or {}

class VectorDBUnavailableException(AIServiceException):
    def __init__(self, message: str = "Vector Database service is currently unavailable"):
        super().__init__(message=message, status_code=503)

class DatabaseUnavailableException(AIServiceException):
    def __init__(self, message: str = "Primary database is currently unreachable"):
        super().__init__(message=message, status_code=503)

class LLMUnavailableException(AIServiceException):
    def __init__(self, message: str = "LLM provider is currently unreachable or rate limited"):
        super().__init__(message=message, status_code=502)

class ToolExecutionException(AIServiceException):
    def __init__(self, tool_name: str, reason: str):
        super().__init__(message=f"Error executing tool '{tool_name}': {reason}", status_code=500, details={"tool": tool_name, "reason": reason})

async def ai_service_exception_handler(request: Request, exc: AIServiceException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "message": exc.message,
                "type": exc.__class__.__name__,
                "details": exc.details
            }
        }
    )

async def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "message": "An internal server error occurred in AI service.",
                "type": "InternalServerError"
            }
        }
    )
