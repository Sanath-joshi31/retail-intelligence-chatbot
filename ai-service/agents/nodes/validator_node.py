import re
from typing import Dict, Any
from agents.state import AgentState

def validate_response_node(state: AgentState) -> Dict[str, Any]:
    """
    Validates and cleanses the final agent response before delivery.
    Ensures:
    1. No internal chain-of-thought or prompt leakage.
    2. Graceful tool error handling.
    3. Proper schema formatting.
    4. Anti-hallucination guarantees on empty RAG contexts.
    """
    raw_answer = state.get("answer") or ""
    intent = state.get("intent", "GENERAL")
    error = state.get("error")
    sources = state.get("sources", [])
    resp_type = state.get("response_type", "text")

    # 1. Handle tool / database errors gracefully
    if error:
        clean_answer = f"⚠️ I encountered a temporary issue while fetching live business data: {error}. Please try again shortly."
        return {
            "answer": clean_answer,
            "response_type": "text",
            "error": None
        }

    if not raw_answer.strip():
        clean_answer = "I'm sorry, I was unable to generate an answer for that request. Please rephrase or ask another question."
        return {"answer": clean_answer, "response_type": "text"}

    # 2. Strip any inadvertent internal prompt markers or chain-of-thought tags
    cleaned = raw_answer
    cleaned = re.sub(r"<think>.*?</think>", "", cleaned, flags=re.DOTALL)
    cleaned = re.sub(r"SYSTEM PROMPT:.*?\n", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"Retrieved Context:.*?\n", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"User Question:.*?\n", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"Answer:\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = cleaned.strip()

    # 3. Check for RAG grounding fallback
    if intent == "RAG" and not sources and "could not find" not in cleaned.lower():
        cleaned += "\n\n*(Note: No matching enterprise policy document was retrieved for this specific query.)*"

    # 4. Validate Retail Decision Agent Replenishment Recommendations
    data = state.get("data")
    if resp_type == "recommendation" and data and isinstance(data, dict):
        recs = data.get("products") or data.get("recommendations") or []
        for r in recs:
            rec_qty = r.get("recommended_quantity") or r.get("recommended_reorder_qty", 0)
            moq = r.get("moq", 1)
            raw_roq = r.get("calculated_roq", 0)

            # Repair/Recalculate if recommended qty is below MOQ
            if rec_qty < moq:
                r["recommended_quantity"] = moq
                r["recommended_reorder_qty"] = moq

            # Validate non-negative
            if rec_qty < 0:
                r["recommended_quantity"] = moq
                r["recommended_reorder_qty"] = moq

        # Ensure confirmation flag exists
        if "requires_user_confirmation" not in data:
            data["requires_user_confirmation"] = True

    return {
        "answer": cleaned,
        "response_type": resp_type,
        "data": data
    }
