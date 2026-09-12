from typing import TypedDict, List, Dict, Any, Optional
from typing_extensions import Annotated
import operator

class AgentState(TypedDict):
    question: str
    session_id: str
    user_id: Optional[str]
    platform: str
    intent: str
    confidence: float
    documents: List[Dict[str, Any]]
    sources: List[Dict[str, Any]]
    tool_results: List[Dict[str, Any]]
    tools_called: List[str]
    messages: Annotated[List[Any], operator.add]
    answer: str
    response_type: str # text, chart, data, recommendation
    chart_data: Optional[Dict[str, Any]]
    chart_type: Optional[str]
    data: Optional[Dict[str, Any]]
    latency: Dict[str, float]
    error: Optional[str]
    # Retail Decision & Replenishment Agent extensions
    agent_goal: Optional[str]
    execution_plan: Optional[List[str]]
    current_step: Optional[str]
    inventory_data: Optional[Dict[str, Any]]
    sales_data: Optional[Dict[str, Any]]
    forecast_data: Optional[Dict[str, Any]]
    policy_context: Optional[List[Dict[str, Any]]]
    calculations: Optional[Dict[str, Any]]
    recommendations: Optional[List[Dict[str, Any]]]
    risk_assessment: Optional[Dict[str, Any]]
    requires_approval: Optional[bool]
    approval_status: Optional[str]
