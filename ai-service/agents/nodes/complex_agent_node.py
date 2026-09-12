from typing import Dict, Any
from agents.state import AgentState
from agents.retail_decision_agent import RetailDecisionAgent

def complex_agent_node(state: AgentState) -> Dict[str, Any]:
    """
    LangGraph execution node for the Retail Decision & Replenishment Agent.
    Evolved from the previous monolithic replenishment node into an autonomous,
    stateful, explainable business decision engine.
    """
    return RetailDecisionAgent.execute(state)
