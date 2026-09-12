from .product_tools import get_products, get_product_details
from .inventory_tools import get_low_stock_products, get_inventory_status, get_inventory_value
from .sales_tools import get_sales, get_sale_by_id
from .analytics_tools import get_sales_analytics, get_top_selling_products
from .forecast_tools import get_sales_forecast
from .calculation_tools import (
    calculate_daily_sales_velocity,
    calculate_reorder_quantity,
    apply_moq,
    calculate_stock_coverage,
    calculate_stock_risk,
    calculate_reorder_priority
)
from .rag_tools import (
    retrieve_reorder_policy,
    retrieve_business_policy,
    search_knowledge_base
)

ALL_TOOLS = [
    get_products,
    get_product_details,
    get_low_stock_products,
    get_inventory_status,
    get_inventory_value,
    get_sales,
    get_sale_by_id,
    get_sales_analytics,
    get_top_selling_products,
    get_sales_forecast,
    calculate_daily_sales_velocity,
    calculate_reorder_quantity,
    apply_moq,
    calculate_stock_coverage,
    calculate_stock_risk,
    calculate_reorder_priority,
    retrieve_reorder_policy,
    retrieve_business_policy,
    search_knowledge_base
]

__all__ = [
    "get_products",
    "get_product_details",
    "get_low_stock_products",
    "get_inventory_status",
    "get_inventory_value",
    "get_sales",
    "get_sale_by_id",
    "get_sales_analytics",
    "get_top_selling_products",
    "get_sales_forecast",
    "calculate_daily_sales_velocity",
    "calculate_reorder_quantity",
    "apply_moq",
    "calculate_stock_coverage",
    "calculate_stock_risk",
    "calculate_reorder_priority",
    "retrieve_reorder_policy",
    "retrieve_business_policy",
    "search_knowledge_base",
    "ALL_TOOLS"
]
