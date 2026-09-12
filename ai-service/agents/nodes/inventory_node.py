import time
from typing import Dict, Any
from agents.state import AgentState
from tools.inventory_tools import get_low_stock_products, get_inventory_status, get_inventory_value

def inventory_node(state: AgentState) -> Dict[str, Any]:
    start_time = time.time()
    q = state["question"].lower()
    tools_called = []

    if "value" in q or "valuation" in q or "profit" in q or "worth" in q:
        tools_called.append("get_inventory_value")
        val = get_inventory_value.invoke({})
        answer = (
            f"📦 **Inventory Valuation Summary**\n\n"
            f"• Total Retail Value: **${val['total_inventory_value']:,.2f}**\n"
            f"• Wholesale Cost: **${val['total_inventory_cost']:,.2f}**\n"
            f"• Potential Profit: **${val['potential_profit']:,.2f}** ({val['profit_margin_percentage']}% margin)\n"
            f"• Total Units Stocked: **{val['total_units_stocked']}**"
        )
        resp_type = "data"
        data_payload = val
        chart_data = None
        chart_type = None

    elif "status" in q or "overview" in q or "summary" in q:
        tools_called.append("get_inventory_status")
        status = get_inventory_status.invoke({})
        answer = (
            f"📦 **Current Inventory Health Overview**\n\n"
            f"• Total Active SKUs: **{status['total_sku_count']}**\n"
            f"• Total Stocked Units: **{status['total_units_in_stock']}**\n"
            f"• ✅ In-Stock SKUs: **{status['in_stock_skus']}**\n"
            f"• ⚠️ Low-Stock SKUs: **{status['low_stock_skus']}**\n"
            f"• ❌ Out-of-Stock SKUs: **{status['out_of_stock_skus']}**"
        )
        resp_type = "chart"
        chart_type = "bar"
        chart_data = {
            "labels": ["In Stock", "Low Stock", "Out of Stock"],
            "datasets": [{
                "label": "SKU Count",
                "data": [status["in_stock_skus"], status["low_stock_skus"], status["out_of_stock_skus"]],
                "backgroundColor": ["#10b981", "#f59e0b", "#ef4444"]
            }]
        }
        data_payload = status

    else:
        # Default to low stock check
        tools_called.append("get_low_stock_products")
        low_items = get_low_stock_products.invoke({})
        if not low_items:
            answer = "✅ **Inventory Status**: All products are well-stocked above minimum safety thresholds."
            resp_type = "text"
            data_payload = None
            chart_data = None
            chart_type = None
        else:
            items_text = "\n".join([
                f"• **{it['product_name']}** (SKU: `{it['sku']}`)\n  Quantity: **{it['quantity']}** (Min: {it['minStockLevel']}) | Status: *{it['status'].replace('_', ' ').title()}*"
                for it in low_items
            ])
            answer = (
                f"⚠️ **Low Stock & Out-of-Stock Alerts**\n\n"
                f"Found **{len(low_items)}** item(s) requiring attention:\n\n{items_text}\n\n"
                f"💡 *Recommendation: Consider placing replenishment purchase orders soon.*"
            )
            resp_type = "data"
            data_payload = {"items": low_items, "count": len(low_items)}
            chart_data = None
            chart_type = None

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
