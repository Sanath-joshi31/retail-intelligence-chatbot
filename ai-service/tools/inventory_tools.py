from typing import List, Dict, Any, Optional
from langchain_core.tools import tool
from tools.db_client import DatabaseClient

@tool
def get_low_stock_products(threshold: Optional[int] = None) -> List[Dict[str, Any]]:
    """Retrieve products that are currently below their minimum stock levels or out of stock."""
    db = DatabaseClient.get_instance()
    inventory = db.get_inventory()
    low_stock = []
    
    for item in inventory:
        qty = item.get("quantity", 0)
        min_level = threshold if threshold is not None else item.get("minStockLevel", 10)
        if qty <= min_level:
            prod = item.get("product", {})
            low_stock.append({
                "product_name": prod.get("name", "Unknown"),
                "sku": prod.get("sku", "N/A"),
                "category": prod.get("category", "General"),
                "quantity": qty,
                "minStockLevel": min_level,
                "reorderPoint": item.get("reorderPoint", 20),
                "warehouse": item.get("warehouse", "Main"),
                "status": "out_of_stock" if qty == 0 else "low_stock"
            })
    return low_stock

@tool
def get_inventory_status() -> Dict[str, Any]:
    """Get high-level summary of total inventory counts, in-stock, low-stock, and out-of-stock items."""
    db = DatabaseClient.get_instance()
    inventory = db.get_inventory()
    
    in_stock = 0
    low_stock = 0
    out_of_stock = 0
    total_units = 0

    for item in inventory:
        qty = item.get("quantity", 0)
        min_level = item.get("minStockLevel", 10)
        total_units += qty
        if qty == 0:
            out_of_stock += 1
        elif qty <= min_level:
            low_stock += 1
        else:
            in_stock += 1

    return {
        "total_sku_count": len(inventory),
        "total_units_in_stock": total_units,
        "in_stock_skus": in_stock,
        "low_stock_skus": low_stock,
        "out_of_stock_skus": out_of_stock
    }

@tool
def get_inventory_value() -> Dict[str, Any]:
    """Calculate total retail valuation, wholesale cost, and potential profit margin of inventory."""
    db = DatabaseClient.get_instance()
    inventory = db.get_inventory()
    
    total_val = 0.0
    total_cost = 0.0
    total_items = 0

    for item in inventory:
        qty = max(0, item.get("quantity", 0))
        prod = item.get("product", {})
        price = prod.get("price", 0.0)
        cost = prod.get("cost", price * 0.7)
        
        total_val += (price * qty)
        total_cost += (cost * qty)
        total_items += qty

    profit = total_val - total_cost
    margin_pct = (profit / total_val * 100) if total_val > 0 else 0.0

    return {
        "total_inventory_value": round(total_val, 2),
        "total_inventory_cost": round(total_cost, 2),
        "potential_profit": round(profit, 2),
        "profit_margin_percentage": round(margin_pct, 1),
        "total_units_stocked": total_items
    }
