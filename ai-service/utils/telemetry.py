import time
from typing import Dict, Any, List, Optional
from collections import defaultdict

class MetricsCollector:
    _instance: Optional["MetricsCollector"] = None

    def __init__(self):
        self.total_requests = 0
        self.successful_requests = 0
        self.failed_requests = 0
        self.intents_count: Dict[str, int] = defaultdict(int)
        self.tools_called_count: Dict[str, int] = defaultdict(int)
        self.latencies: List[float] = []
        self.recent_logs: List[Dict[str, Any]] = []

        # Agent-specific metrics
        self.agent_requests = 0
        self.agent_successes = 0
        self.agent_failures = 0
        self.agent_execution_times: List[float] = []
        self.agent_tool_calls_count = 0
        self.agent_recommendations_count = 0
        self.agent_approval_requests = 0
        self.agent_approved_count = 0
        self.agent_rejected_count = 0
        self.agent_validation_failures = 0

    @classmethod
    def get_instance(cls) -> "MetricsCollector":
        if cls._instance is None:
            cls._instance = MetricsCollector()
        return cls._instance

    def record_agent_execution(
        self,
        success: bool = True,
        execution_time_ms: float = 0.0,
        tools_count: int = 0,
        recommendations_count: int = 0,
        requires_approval: bool = False
    ):
        self.agent_requests += 1
        if success:
            self.agent_successes += 1
        else:
            self.agent_failures += 1

        self.agent_execution_times.append(execution_time_ms)
        if len(self.agent_execution_times) > 500:
            self.agent_execution_times.pop(0)

        self.agent_tool_calls_count += tools_count
        self.agent_recommendations_count += recommendations_count
        if requires_approval:
            self.agent_approval_requests += 1

    def record_approval_decision(self, approved: bool):
        if approved:
            self.agent_approved_count += 1
        else:
            self.agent_rejected_count += 1

    def record_validation_failure(self):
        self.agent_validation_failures += 1

    def record_request(
        self,
        request_id: str,
        session_id: str,
        intent: str,
        tools_called: List[str],
        documents_count: int,
        latency_breakdown: Dict[str, float],
        success: bool = True,
        error: Optional[str] = None
    ):
        self.total_requests += 1
        if success:
            self.successful_requests += 1
        else:
            self.failed_requests += 1

        self.intents_count[intent] += 1
        for tool in tools_called:
            self.tools_called_count[tool] += 1

        total_ms = latency_breakdown.get("total_ms", 0.0)
        self.latencies.append(total_ms)
        if len(self.latencies) > 1000:
            self.latencies.pop(0)

        log_entry = {
            "request_id": request_id,
            "session_id": session_id,
            "timestamp": time.time(),
            "intent": intent,
            "tools_called": tools_called,
            "documents_retrieved": documents_count,
            "latency": latency_breakdown,
            "success": success,
            "error": error
        }
        self.recent_logs.append(log_entry)
        if len(self.recent_logs) > 100:
            self.recent_logs.pop(0)

    def get_summary(self) -> Dict[str, Any]:
        sorted_latencies = sorted(self.latencies) if self.latencies else [0.0]
        count = len(sorted_latencies)
        
        p50 = sorted_latencies[int(count * 0.50)] if count > 0 else 0.0
        p95 = sorted_latencies[int(count * 0.95)] if count > 0 else 0.0
        p99 = sorted_latencies[int(count * 0.99)] if count > 0 else 0.0
        avg = sum(sorted_latencies) / count if count > 0 else 0.0

        avg_agent_time = (
            sum(self.agent_execution_times) / len(self.agent_execution_times)
            if self.agent_execution_times else 0.0
        )

        return {
            "total_requests": self.total_requests,
            "successful_requests": self.successful_requests,
            "failed_requests": self.failed_requests,
            "error_rate_percentage": round((self.failed_requests / self.total_requests * 100), 2) if self.total_requests > 0 else 0.0,
            "latency_ms": {
                "avg": round(avg, 2),
                "p50": round(p50, 2),
                "p95": round(p95, 2),
                "p99": round(p99, 2)
            },
            "intents_distribution": dict(self.intents_count),
            "tools_called_distribution": dict(self.tools_called_count),
            "recent_events_count": len(self.recent_logs),
            "agent_metrics": {
                "agent_requests": self.agent_requests,
                "agent_successes": self.agent_successes,
                "agent_failures": self.agent_failures,
                "agent_avg_execution_ms": round(avg_agent_time, 2),
                "agent_tool_calls": self.agent_tool_calls_count,
                "agent_recommendations": self.agent_recommendations_count,
                "agent_approval_requests": self.agent_approval_requests,
                "agent_approved": self.agent_approved_count,
                "agent_rejected": self.agent_rejected_count,
                "agent_validation_failures": self.agent_validation_failures
            }
        }

metrics_collector = MetricsCollector.get_instance()
