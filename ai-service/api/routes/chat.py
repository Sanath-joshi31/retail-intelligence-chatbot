from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import time
import uuid
from agents.graph import agent_graph
from memory.conversation import ConversationMemoryManager
from utils.logging import logger
from utils.telemetry import metrics_collector
from utils.security import SecurityGuard
from utils.cache import response_cache

router = APIRouter(prefix="/ai", tags=["AI Chatbot"])

class ChatRequest(BaseModel):
    message: str = Field(..., description="User question or prompt")
    sessionId: str = Field(default="default-session", description="Session identifier for memory")
    userId: Optional[str] = Field(default=None, description="Optional user identifier")
    platform: Optional[str] = Field(default="web", description="Client platform: web, mobile, api")
    conversationHistory: Optional[List[Dict[str, Any]]] = Field(default=[], description="Recent messages context")

class Citation(BaseModel):
    source: str
    page: Optional[int] = None
    category: Optional[str] = None
    snippet: Optional[str] = None

class LatencyMetrics(BaseModel):
    retrieval_ms: float = 0.0
    tool_ms: float = 0.0
    llm_ms: float = 0.0
    total_ms: float = 0.0

class ChatResponseData(BaseModel):
    text: str
    type: str = "text" # text, chart, data, recommendation
    intent: Optional[str] = None
    sources: Optional[List[Citation]] = []
    tools_called: Optional[List[str]] = []
    chartType: Optional[str] = None
    chartData: Optional[Dict[str, Any]] = None
    data: Optional[Dict[str, Any]] = None
    requires_user_confirmation: Optional[bool] = False
    latency: LatencyMetrics = Field(default_factory=LatencyMetrics)

class ChatResponse(BaseModel):
    success: bool = True
    data: ChatResponseData
    metadata: Dict[str, Any] = Field(default_factory=dict)

@router.get("/health")
async def ai_health():
    return {
        "status": "healthy",
        "service": "Retail Intelligence AI Service",
        "timestamp": time.time(),
        "components": {
            "rag": "ready",
            "langgraph": "ready",
            "tools": "ready",
            "memory": "ready",
            "cache": "ready",
            "security": "ready",
            "telemetry": "ready",
            "database": "ready"
        }
    }

@router.get("/metrics")
async def get_ai_metrics():
    """Observability endpoint providing aggregate request counters, latency percentiles, and tool usage."""
    return metrics_collector.get_summary()

@router.post("/chat", response_model=ChatResponse)
async def process_chat(req: ChatRequest):
    start_time = time.time()
    req_id = f"req-{uuid.uuid4().hex[:8]}"
    
    # 1. Security input validation
    is_safe, sanitized_msg, sec_warning = SecurityGuard.sanitize_input(req.message)
    if not is_safe:
        raise HTTPException(status_code=400, detail=sec_warning or "Invalid request input.")

    # 2. Check response cache for identical queries
    cache_key = f"{sanitized_msg}"
    cached_payload = response_cache.get(cache_key)
    if cached_payload:
        cached_total_ms = (time.time() - start_time) * 1000
        cached_res_data = ChatResponseData(**cached_payload)
        cached_res_data.latency.total_ms = round(cached_total_ms, 2)
        
        return ChatResponse(
            success=True,
            data=cached_res_data,
            metadata={
                "requestId": req_id,
                "sessionId": req.sessionId,
                "platform": req.platform,
                "intent": cached_res_data.intent,
                "confidence": 1.0,
                "responseTime": round(cached_total_ms, 2),
                "source": "cached-agent"
            }
        )

    memory = ConversationMemoryManager.get_instance()
    
    # 3. Resolve conversational pronouns / follow-ups
    resolved_query = memory.resolve_follow_up_query(req.sessionId, sanitized_msg)
    memory.add_user_message(req.sessionId, req.message)

    logger.log_event(
        "incoming_chat_request",
        request_id=req_id,
        session_id=req.sessionId,
        user_id=req.userId,
        data={"message": sanitized_msg, "resolved": resolved_query, "platform": req.platform}
    )

    # 4. Build initial agent state with session history
    session_history = memory.get_history(req.sessionId, limit=10)
    initial_state = {
        "question": resolved_query,
        "session_id": req.sessionId,
        "user_id": req.userId,
        "platform": req.platform or "web",
        "intent": "",
        "confidence": 0.0,
        "documents": [],
        "sources": [],
        "tool_results": [],
        "tools_called": [],
        "messages": session_history,
        "answer": "",
        "response_type": "text",
        "chart_data": None,
        "chart_type": None,
        "data": None,
        "latency": {},
        "error": None
    }

    try:
        agent_result = agent_graph.invoke(initial_state)
        total_time = (time.time() - start_time) * 1000

        # Build citations
        raw_sources = agent_result.get("sources", [])
        citations = [
            Citation(
                source=s.get("source", "Unknown"),
                page=s.get("page", 1),
                category=s.get("category", "General"),
                snippet=s.get("snippet", "")
            )
            for s in raw_sources
        ]

        latencies = agent_result.get("latency", {})
        latency_obj = LatencyMetrics(
            retrieval_ms=latencies.get("retrieval_ms", 0.0),
            tool_ms=latencies.get("tool_ms", 0.0),
            llm_ms=latencies.get("llm_ms", 0.0),
            total_ms=round(total_time, 2)
        )

        req_confirm = bool(
            agent_result.get("requires_approval") or
            (agent_result.get("data") and isinstance(agent_result["data"], dict) and agent_result["data"].get("requires_user_confirmation"))
        )

        response_data = ChatResponseData(
            text=agent_result.get("answer", "Unable to generate response."),
            type=agent_result.get("response_type", "text"),
            intent=agent_result.get("intent", "GENERAL"),
            sources=citations,
            tools_called=agent_result.get("tools_called", []),
            chartType=agent_result.get("chart_type"),
            chartData=agent_result.get("chart_data"),
            data=agent_result.get("data"),
            requires_user_confirmation=req_confirm,
            latency=latency_obj
        )

        # Cache response for 120s
        response_cache.set(cache_key, response_data.model_dump())

        # Track referenced products for multi-turn follow-up
        referenced_prods = []
        if agent_result.get("data") and isinstance(agent_result["data"], dict):
            if "items" in agent_result["data"]:
                referenced_prods = [it.get("product_name") for it in agent_result["data"]["items"] if it.get("product_name")]
            elif "products" in agent_result["data"]:
                referenced_prods = [p.get("name") or p.get("product_name") for p in agent_result["data"]["products"] if p.get("name") or p.get("product_name")]

        memory.add_assistant_message(
            session_id=req.sessionId,
            content=response_data.text,
            metadata={"intent": response_data.intent, "referenced_products": referenced_prods}
        )

        # Record metrics telemetry
        metrics_collector.record_request(
            request_id=req_id,
            session_id=req.sessionId,
            intent=agent_result.get("intent", "GENERAL"),
            tools_called=agent_result.get("tools_called", []),
            documents_count=len(citations),
            latency_breakdown={
                "retrieval_ms": latency_obj.retrieval_ms,
                "tool_ms": latency_obj.tool_ms,
                "llm_ms": latency_obj.llm_ms,
                "total_ms": latency_obj.total_ms
            },
            success=True
        )

        logger.log_event(
            "chat_response_completed",
            request_id=req_id,
            session_id=req.sessionId,
            data={
                "intent": agent_result.get("intent"),
                "tools_called": agent_result.get("tools_called"),
                "sources_count": len(citations),
                "total_ms": round(total_time, 2)
            }
        )

        return ChatResponse(
            success=True,
            data=response_data,
            metadata={
                "requestId": req_id,
                "sessionId": req.sessionId,
                "platform": req.platform,
                "intent": agent_result.get("intent"),
                "confidence": agent_result.get("confidence", 1.0),
                "responseTime": round(total_time, 2),
                "source": "langgraph-agent"
            }
        )

    except Exception as e:
        metrics_collector.record_request(
            request_id=req_id,
            session_id=req.sessionId,
            intent="ERROR",
            tools_called=[],
            documents_count=0,
            latency_breakdown={"total_ms": (time.time() - start_time) * 1000},
            success=False,
            error=str(e)
        )
        logger.log_event(
            "chat_processing_error",
            level="error",
            request_id=req_id,
            session_id=req.sessionId,
            error=str(e)
        )
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")

@router.delete("/memory/{session_id}")
async def clear_session_memory(session_id: str):
    memory = ConversationMemoryManager.get_instance()
    memory.clear_session(session_id)
    return {"success": True, "message": f"Memory cleared for session '{session_id}'"}
