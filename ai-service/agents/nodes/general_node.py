from typing import Dict, Any
from agents.state import AgentState

def general_node(state: AgentState) -> Dict[str, Any]:
    return {
        "answer": (
            "👋 **Hello! I am your Retail Intelligence AI Platform Assistant.**\n\n"
            "I combine **Enterprise RAG Knowledge**, **Live Database Tools**, and **Multi-Step Agentic Reasoning** to help you run your business.\n\n"
            "**Here are things you can ask me:**\n"
            "• 📖 *Policy & Knowledge*: \"What is our electronics return policy?\" or \"What is the warranty period?\"\n"
            "• 📦 *Live Inventory*: \"What is low in stock?\" or \"What is our total inventory value?\"\n"
            "• 📊 *Sales Analytics*: \"What were our top-selling products?\" or \"Show sales revenue this month.\"\n"
            "• 🔮 *Demand Forecasting*: \"Forecast next week's sales\"\n"
            "• 🤖 *Agentic Decision*: \"Which products should I reorder based on inventory, sales, and our reorder policy?\""
        ),
        "response_type": "text"
    }
