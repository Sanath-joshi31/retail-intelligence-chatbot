from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config.settings import settings
from api.routes import chat_router, events_router
from utils.errors import (
    AIServiceException,
    ai_service_exception_handler,
    generic_exception_handler
)
from utils.logging import logger
import uvicorn

app = FastAPI(
    title="Retail Intelligence AI Service",
    description="Agentic AI Platform with RAG, LangGraph orchestration, and real-time MongoDB tools",
    version="2.0.0"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception Handlers
app.add_exception_handler(AIServiceException, ai_service_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# Include API routes
app.include_router(chat_router)
app.include_router(events_router)

@app.get("/")
async def root():
    return {
        "service": "Retail Intelligence AI Service",
        "version": "2.0.0",
        "status": "online",
        "endpoints": {
            "chat": "/ai/chat",
            "events": "/ai/events/inventory-update",
            "health": "/ai/health",
            "docs": "/docs"
        }
    }

if __name__ == "__main__":
    logger.log_event(
        "service_startup",
        data={"host": settings.HOST, "port": settings.PORT, "env": settings.ENVIRONMENT}
    )
    uvicorn.run(
        "app:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True
    )
