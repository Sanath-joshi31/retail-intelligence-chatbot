from typing import List, Dict, Any, Optional
from langchain_core.tools import tool
from tools.db_client import DatabaseClient

@tool
def get_sales(limit: int = 50, days: int = 30) -> List[Dict[str, Any]]:
    """Retrieve recent sales orders and transactions."""
    db = DatabaseClient.get_instance()
    sales = db.get_sales(days=days)
    return sales[:limit]

@tool
def get_sale_by_id(sale_id: str) -> Dict[str, Any]:
    """Retrieve details of a single sales transaction by its saleId."""
    db = DatabaseClient.get_instance()
    sales = db.get_sales(days=365)
    for s in sales:
        if s.get("saleId", "").lower() == sale_id.lower():
            return s
    return {"message": f"Sale with ID '{sale_id}' not found."}
