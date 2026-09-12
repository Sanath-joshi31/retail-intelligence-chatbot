from typing import List, Dict, Any, Optional
from langchain_core.tools import tool
from tools.db_client import DatabaseClient

@tool
def get_products(category: Optional[str] = None, limit: int = 20) -> List[Dict[str, Any]]:
    """Retrieve catalog products with optional category filtering."""
    db = DatabaseClient.get_instance()
    filter_dict = {}
    if category:
        filter_dict["category"] = category
    products = db.get_products(filter_dict=filter_dict, limit=limit)
    return [
        {
            "id": p.get("_id"),
            "name": p.get("name"),
            "sku": p.get("sku"),
            "category": p.get("category"),
            "price": p.get("price"),
            "cost": p.get("cost"),
            "isActive": p.get("isActive", True)
        }
        for p in products
    ]

@tool
def get_product_details(product_name_or_sku: str) -> Optional[Dict[str, Any]]:
    """Search for a specific product by its name or SKU."""
    db = DatabaseClient.get_instance()
    products = db.get_products(limit=100)
    query = product_name_or_sku.lower().strip()
    
    for p in products:
        if query in p.get("name", "").lower() or query == p.get("sku", "").lower():
            return {
                "id": p.get("_id"),
                "name": p.get("name"),
                "sku": p.get("sku"),
                "category": p.get("category"),
                "price": p.get("price"),
                "cost": p.get("cost"),
                "isActive": p.get("isActive", True)
            }
    return {"message": f"No product found matching '{product_name_or_sku}'"}
