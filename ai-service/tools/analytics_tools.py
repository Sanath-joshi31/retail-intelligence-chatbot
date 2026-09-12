from typing import List, Dict, Any, Optional
from langchain_core.tools import tool
from tools.db_client import DatabaseClient

@tool
def get_sales_analytics(days: int = 30) -> Dict[str, Any]:
    """Calculate overall sales revenue, order counts, and average order value for a period."""
    db = DatabaseClient.get_instance()
    sales = db.get_sales(days=days)
    
    total_rev = sum(float(s.get("total", 0.0)) for s in sales)
    order_count = len(sales)
    aov = (total_rev / order_count) if order_count > 0 else 0.0

    return {
        "period_days": days,
        "total_revenue": round(total_rev, 2),
        "total_orders": order_count,
        "average_order_value": round(aov, 2)
    }

@tool
def get_top_selling_products(limit: int = 5, days: int = 30) -> List[Dict[str, Any]]:
    """Identify top-performing products by units sold and generated revenue."""
    db = DatabaseClient.get_instance()
    sales = db.get_sales(days=days)
    
    product_stats = {}
    for s in sales:
        for it in s.get("items", []):
            p_name = str(it.get("name") or it.get("product") or "Item")
            qty = int(it.get("quantity", 1))
            price = float(it.get("unitPrice", 0.0))
            
            if p_name not in product_stats:
                product_stats[p_name] = {"units_sold": 0, "revenue": 0.0}
            product_stats[p_name]["units_sold"] += qty
            product_stats[p_name]["revenue"] += (qty * price)

    ranked = [
        {
            "product_name": str(name),
            "units_sold": data["units_sold"],
            "revenue": round(data["revenue"], 2)
        }
        for name, data in product_stats.items()
    ]
    ranked.sort(key=lambda x: x["units_sold"], reverse=True)
    return ranked[:limit]
