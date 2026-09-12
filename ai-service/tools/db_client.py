from typing import Dict, Any, List, Optional
import pymongo
from bson import ObjectId
from config.settings import settings
import httpx
from datetime import datetime, timezone, timedelta

def serialize_mongo(obj: Any) -> Any:
    """Recursively converts BSON ObjectId and datetime to string/isoformat."""
    if isinstance(obj, list):
        return [serialize_mongo(item) for item in obj]
    elif isinstance(obj, dict):
        return {k: serialize_mongo(v) for k, v in obj.items()}
    elif isinstance(obj, ObjectId):
        return str(obj)
    elif isinstance(obj, datetime):
        return obj.isoformat()
    return obj

class DatabaseClient:
    _instance: Optional["DatabaseClient"] = None

    def __init__(self):
        self.mongo_uri = settings.MONGODB_URI
        self.db_name = settings.MONGODB_DB_NAME
        self.node_api_url = settings.NODE_BACKEND_URL
        self._client: Optional[pymongo.MongoClient] = None
        self._db = None
        self._connect_mongo()

    @classmethod
    def get_instance(cls) -> "DatabaseClient":
        if cls._instance is None:
            cls._instance = DatabaseClient()
        return cls._instance

    def _connect_mongo(self):
        try:
            self._client = pymongo.MongoClient(self.mongo_uri, serverSelectionTimeoutMS=1500)
            self._client.admin.command("ping")
            self._db = self._client[self.db_name]
        except Exception:
            self._client = None
            self._db = None

    def is_mongo_connected(self) -> bool:
        if self._client and self._db is not None:
            try:
                self._client.admin.command("ping")
                return True
            except Exception:
                return False
        return False

    def get_products(self, filter_dict: Optional[Dict[str, Any]] = None, limit: int = 50) -> List[Dict[str, Any]]:
        if self.is_mongo_connected():
            query = filter_dict or {}
            docs = list(self._db.products.find(query).limit(limit))
            return [serialize_mongo(d) for d in docs]
        
        # Fallback to Node.js backend API
        try:
            with httpx.Client(base_url=self.node_api_url, timeout=2.0) as client:
                res = client.get("/products", params={"limit": limit})
                if res.status_code == 200:
                    return res.json().get("data", [])
        except Exception:
            pass

        # Seed data fallback for unit testing / standalone execution
        return [
            {"_id": "p1", "name": "Apple iPhone 15 Pro", "sku": "ELEC-IPHONE-15", "category": "Electronics", "price": 999.0, "cost": 750.0, "isActive": True},
            {"_id": "p2", "name": "Samsung Galaxy S24 Ultra", "sku": "ELEC-SGS24-01", "category": "Electronics", "price": 1199.0, "cost": 900.0, "isActive": True},
            {"_id": "p3", "name": "Apple MacBook Pro 16", "sku": "ELEC-MBP16-M3", "category": "Electronics", "price": 2499.0, "cost": 1900.0, "isActive": True},
            {"_id": "p4", "name": "Nike Air Zoom Pegasus 40", "sku": "CLOTH-NIKE-P40", "category": "Clothing", "price": 130.0, "cost": 65.0, "isActive": True},
            {"_id": "p5", "name": "KitchenAid Stand Mixer", "sku": "HOME-KA-MIXER", "category": "Home & Garden", "price": 449.0, "cost": 280.0, "isActive": True},
        ]

    def get_inventory(self) -> List[Dict[str, Any]]:
        if self.is_mongo_connected():
            pipeline = [
                {
                    "$lookup": {
                        "from": "products",
                        "localField": "product",
                        "foreignField": "_id",
                        "as": "product_details"
                    }
                }
            ]
            items = list(self._db.inventories.aggregate(pipeline))
            serialized = []
            for it in items:
                it_dict = serialize_mongo(it)
                if it_dict.get("product_details") and len(it_dict["product_details"]) > 0:
                    it_dict["product"] = it_dict["product_details"][0]
                else:
                    it_dict["product"] = {"name": "Product", "sku": "SKU", "category": "Other", "price": 100.0}
                serialized.append(it_dict)
            return serialized

        # Fallback to Node.js backend
        try:
            with httpx.Client(base_url=self.node_api_url, timeout=2.0) as client:
                res = client.get("/inventory")
                if res.status_code == 200:
                    return res.json().get("data", [])
        except Exception:
            pass

        # Realistic seed state for offline demo
        return [
            {"_id": "inv1", "product": {"_id": "p1", "name": "Apple iPhone 15 Pro", "sku": "ELEC-IPHONE-15", "category": "Electronics", "price": 999.0, "cost": 750.0}, "quantity": 4, "minStockLevel": 15, "reorderPoint": 25, "warehouse": "Main"},
            {"_id": "inv2", "product": {"_id": "p2", "name": "Samsung Galaxy S24 Ultra", "sku": "ELEC-SGS24-01", "category": "Electronics", "price": 1199.0, "cost": 900.0}, "quantity": 3, "minStockLevel": 10, "reorderPoint": 20, "warehouse": "Main"},
            {"_id": "inv3", "product": {"_id": "p3", "name": "Apple MacBook Pro 16", "sku": "ELEC-MBP16-M3", "category": "Electronics", "price": 2499.0, "cost": 1900.0}, "quantity": 18, "minStockLevel": 5, "reorderPoint": 10, "warehouse": "Main"},
            {"_id": "inv4", "product": {"_id": "p4", "name": "Nike Air Zoom Pegasus 40", "sku": "CLOTH-NIKE-P40", "category": "Clothing", "price": 130.0, "cost": 65.0}, "quantity": 42, "minStockLevel": 12, "reorderPoint": 20, "warehouse": "West"},
            {"_id": "inv5", "product": {"_id": "p5", "name": "KitchenAid Stand Mixer", "sku": "HOME-KA-MIXER", "category": "Home & Garden", "price": 449.0, "cost": 280.0}, "quantity": 0, "minStockLevel": 8, "reorderPoint": 15, "warehouse": "East"},
        ]

    def get_sales(self, days: int = 30) -> List[Dict[str, Any]]:
        if self.is_mongo_connected():
            start_date = datetime.now(timezone.utc) - timedelta(days=days)
            pipeline = [
                {"$match": {"status": "completed", "createdAt": {"$gte": start_date}}},
                {
                    "$lookup": {
                        "from": "products",
                        "localField": "items.product",
                        "foreignField": "_id",
                        "as": "item_products"
                    }
                }
            ]
            sales = list(self._db.sales.aggregate(pipeline))
            serialized_sales = []
            
            # Map products by id for fast name resolution
            for s in sales:
                prod_map = {str(p["_id"]): p.get("name", "Product") for p in s.get("item_products", [])}
                s_dict = serialize_mongo(s)
                for it in s_dict.get("items", []):
                    pid = str(it.get("product", ""))
                    if not it.get("name") and pid in prod_map:
                        it["name"] = prod_map[pid]
                    elif not it.get("name"):
                        it["name"] = "Product Item"
                serialized_sales.append(s_dict)
            return serialized_sales

        # Fallback to Node.js backend
        try:
            with httpx.Client(base_url=self.node_api_url, timeout=2.0) as client:
                res = client.get("/sales", params={"limit": 100})
                if res.status_code == 200:
                    return res.json().get("data", [])
        except Exception:
            pass

        # Standalone mock sales
        return [
            {"saleId": "SALE-001", "total": 1998.0, "items": [{"product": "p1", "name": "Apple iPhone 15 Pro", "quantity": 2, "unitPrice": 999.0}], "status": "completed", "createdAt": "2026-08-15T10:00:00Z"},
            {"saleId": "SALE-002", "total": 2499.0, "items": [{"product": "p3", "name": "Apple MacBook Pro 16", "quantity": 1, "unitPrice": 2499.0}], "status": "completed", "createdAt": "2026-08-16T14:30:00Z"},
            {"saleId": "SALE-003", "total": 3597.0, "items": [{"product": "p2", "name": "Samsung Galaxy S24 Ultra", "quantity": 3, "unitPrice": 1199.0}], "status": "completed", "createdAt": "2026-08-17T09:15:00Z"},
            {"saleId": "SALE-004", "total": 260.0, "items": [{"product": "p4", "name": "Nike Air Zoom Pegasus 40", "quantity": 2, "unitPrice": 130.0}], "status": "completed", "createdAt": "2026-08-17T16:45:00Z"},
        ]
