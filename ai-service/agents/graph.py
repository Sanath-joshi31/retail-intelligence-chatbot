from langgraph.graph import StateGraph, START, END
from agents.state import AgentState
from agents.router import route_query_node
from agents.nodes import (
    rag_node,
    inventory_node,
    product_node,
    sales_node,
    forecast_node,
    complex_agent_node,
    general_node,
    validate_response_node
)

def route_decision(state: AgentState) -> str:
    """Evaluates the routed intent and chooses the next branch."""
    intent = state.get("intent", "GENERAL").upper()
    if intent == "COMPLEX_AGENT":
        return "complex_agent"
    elif intent == "RAG":
        return "rag"
    elif intent == "INVENTORY":
        return "inventory"
    elif intent == "PRODUCTS":
        return "products"
    elif intent == "SALES" or intent == "ANALYTICS":
        return "sales"
    elif intent == "FORECAST":
        return "forecast"
    else:
        return "general"

def create_agentic_workflow():
    workflow = StateGraph(AgentState)

    # Register Nodes
    workflow.add_node("router", route_query_node)
    workflow.add_node("rag", rag_node)
    workflow.add_node("inventory", inventory_node)
    workflow.add_node("products", product_node)
    workflow.add_node("sales", sales_node)
    workflow.add_node("forecast", forecast_node)
    workflow.add_node("complex_agent", complex_agent_node)
    workflow.add_node("general", general_node)
    workflow.add_node("validator", validate_response_node)

    # Edge from START to router
    workflow.add_edge(START, "router")

    # Conditional branching from router
    workflow.add_conditional_edges(
        "router",
        route_decision,
        {
            "complex_agent": "complex_agent",
            "rag": "rag",
            "inventory": "inventory",
            "products": "products",
            "sales": "sales",
            "forecast": "forecast",
            "general": "general"
        }
    )

    # Connect all execution nodes to validator
    workflow.add_edge("complex_agent", "validator")
    workflow.add_edge("rag", "validator")
    workflow.add_edge("inventory", "validator")
    workflow.add_edge("products", "validator")
    workflow.add_edge("sales", "validator")
    workflow.add_edge("forecast", "validator")
    workflow.add_edge("general", "validator")

    # Connect validator to END
    workflow.add_edge("validator", END)

    return workflow.compile()

# Global compiled agent graph instance
agent_graph = create_agentic_workflow()
