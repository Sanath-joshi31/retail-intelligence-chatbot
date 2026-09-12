import re
import json
from typing import Dict, Any
from agents.state import AgentState
from llm.model import get_llm
from llm.prompts import ROUTER_SYSTEM_PROMPT
from langchain_core.messages import SystemMessage, HumanMessage

def classify_intent_heuristics(query: str) -> Dict[str, Any]:
    """Fast-path deterministic regex classifier for clear-cut retail questions."""
    q = query.lower().strip()
    
    # 1. Complex multi-step reasoning / Retail Decision Agent
    if (
        ("reorder" in q and any(w in q for w in ["policy", "sales", "lead time", "inventory", "should", "week", "first", "which", "how much"])) or
        ("replenish" in q) or
        ("should i order" in q or "what should i reorder" in q or "what should we reorder" in q or "which products should i reorder" in q or "which should i reorder" in q) or
        ("highest risk" in q or "stockout risk" in q or "risk of stockout" in q) or
        ("running low" in q and ("reorder" in q or "first" in q or "order" in q)) or
        ("inventory" in q and "sales" in q and ("policy" in q or "recommend" in q or "forecast" in q or "reorder" in q))
    ):
        return {"intent": "COMPLEX_AGENT", "confidence": 0.98, "explanation": "Requires multi-step tool and RAG orchestration"}

    # 2. Knowledge-based / Policy / Manuals / FAQs (RAG)
    if any(kw in q for kw in [
        "return policy", "warranty", "refund", "restocking fee", "reorder policy",
        "shipping policy", "bopis", "loyalty point", "price match", "faq", "magsafe", "manual"
    ]) or ("policy" in q) or ("warranty" in q):
        return {"intent": "RAG", "confidence": 0.95, "explanation": "Matches enterprise policy or document knowledge base"}

    # 3. Forecast
    if any(kw in q for kw in ["forecast", "predict", "projection", "next week sales", "future sales", "next week's sales"]):
        return {"intent": "FORECAST", "confidence": 0.95, "explanation": "Predictive sales forecasting query"}

    # 4. Inventory
    if (
        re.search(r"low.*stock|out.*of.*stock|stock.*level|inventory.*status|inventory.*value|units.*in.*stock", q) or
        ("inventory" in q) or
        ("stock" in q and not "reorder" in q) or
        ("how many" in q and "left" in q)
    ):
        return {"intent": "INVENTORY", "confidence": 0.95, "explanation": "Real-time inventory database query"}

    # 5. Sales & Revenue
    if (
        re.search(r"top.*sell|best.*sell|most.*sold|sales.*trend|sales.*performance", q) or
        any(kw in q for kw in ["revenue", "total sales", "how much did we make", "earnings", "orders yesterday", "sales this month"])
    ):
        return {"intent": "SALES", "confidence": 0.95, "explanation": "Sales analytics and transactions query"}

    # 6. Products Catalog & Recommendation
    if any(kw in q for kw in ["find product", "search product", "product price", "show products", "electronics category", "recommend product", "recommend"]):
        return {"intent": "PRODUCTS", "confidence": 0.92, "explanation": "Product catalog lookup"}

    # 7. Greetings & Help
    if any(kw in q for kw in ["hello", "hi", "hey", "help", "what can you do", "commands"]):
        return {"intent": "GENERAL", "confidence": 0.98, "explanation": "General greeting or help query"}

    return {"intent": "UNKNOWN", "confidence": 0.5, "explanation": "Requires fallback / LLM routing"}

def route_query_node(state: AgentState) -> Dict[str, Any]:
    """LangGraph node that classifies intent and updates state."""
    question = state["question"]
    
    # 1. Check fast heuristics
    heuristic = classify_intent_heuristics(question)
    if heuristic["intent"] != "UNKNOWN":
        return {
            "intent": heuristic["intent"],
            "confidence": heuristic["confidence"]
        }

    # 2. LLM classification for ambiguous natural language
    try:
        llm = get_llm(temperature=0.0)
        messages = [
            SystemMessage(content=ROUTER_SYSTEM_PROMPT),
            HumanMessage(content=f"User Query: {question}")
        ]
        res = llm.invoke(messages)
        content = res.content.strip()
        
        # Parse JSON
        parsed = json.loads(content)
        intent = parsed.get("intent", "GENERAL").upper()
        confidence = float(parsed.get("confidence", 0.8))
        return {
            "intent": intent,
            "confidence": confidence
        }
    except Exception:
        # Graceful fallback to RAG if policies mentioned, else GENERAL
        return {
            "intent": "RAG" if "policy" in question.lower() else "GENERAL",
            "confidence": 0.7
        }
