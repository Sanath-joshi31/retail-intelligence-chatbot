import time
from typing import Dict, Any
from agents.state import AgentState
from tools.analytics_tools import get_sales_analytics, get_top_selling_products

def sales_node(state: AgentState) -> Dict[str, Any]:
    start_time = time.time()
    q = state["question"].lower()
    tools_called = []

    if "top" in q or "best" in q or "popular" in q or "most sold" in q:
        tools_called.append("get_top_selling_products")
        top_items = get_top_selling_products.invoke({"limit": 5})
        
        list_text = "\n".join([
            f"{i+1}. **{str(item['product_name'])}** — Units Sold: **{item['units_sold']}** | Revenue: **${item['revenue']:,.2f}**"
            for i, item in enumerate(top_items)
        ])
        answer = f"🏆 **Top-Selling Products (Last 30 Days)**\n\n{list_text}"
        resp_type = "chart"
        chart_type = "bar"
        chart_data = {
            "labels": [str(p["product_name"])[:16] for p in top_items],
            "datasets": [{
                "label": "Units Sold",
                "data": [p["units_sold"] for p in top_items],
                "backgroundColor": "#3b82f6"
            }]
        }
        data_payload = {"products": top_items}

    else:
        tools_called.append("get_sales_analytics")
        analytics = get_sales_analytics.invoke({"days": 30})
        answer = (
            f"📊 **Sales Performance (Last 30 Days)**\n\n"
            f"• Total Revenue: **${analytics['total_revenue']:,.2f}**\n"
            f"• Total Completed Orders: **{analytics['total_orders']}**\n"
            f"• Average Order Value (AOV): **${analytics['average_order_value']:,.2f}**"
        )
        resp_type = "data"
        chart_data = None
        chart_type = None
        data_payload = analytics

    elapsed = (time.time() - start_time) * 1000

    return {
        "answer": answer,
        "tools_called": tools_called,
        "response_type": resp_type,
        "chart_data": chart_data,
        "chart_type": chart_type,
        "data": data_payload,
        "latency": {"tool_ms": round(elapsed, 2), "total_ms": round(elapsed, 2)}
    }
