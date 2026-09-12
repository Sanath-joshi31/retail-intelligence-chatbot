import time
from typing import Dict, Any
from agents.state import AgentState
from tools.product_tools import get_products, get_product_details

def product_node(state: AgentState) -> Dict[str, Any]:
    start_time = time.time()
    q = state["question"]
    tools_called = ["get_products"]
    
    products = get_products.invoke({"limit": 10})
    
    if not products:
        answer = "🛍️ No catalog products found."
        resp_type = "text"
        data_payload = None
    else:
        prod_list = "\n".join([
            f"• **{p['name']}** — ${p['price']:,.2f} (Category: {p['category']}, SKU: `{p['sku']}`)"
            for p in products[:5]
        ])
        answer = f"🛍️ **Featured Catalog Products**:\n\n{prod_list}"
        resp_type = "recommendation"
        data_payload = {"products": products[:5]}

    elapsed = (time.time() - start_time) * 1000

    return {
        "answer": answer,
        "tools_called": tools_called,
        "response_type": resp_type,
        "data": data_payload,
        "latency": {"tool_ms": round(elapsed, 2), "total_ms": round(elapsed, 2)}
    }
