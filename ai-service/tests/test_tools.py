import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from tools.product_tools import get_products, get_product_details
from tools.inventory_tools import get_low_stock_products, get_inventory_status, get_inventory_value
from tools.sales_tools import get_sales, get_sale_by_id
from tools.analytics_tools import get_sales_analytics, get_top_selling_products
from tools.forecast_tools import get_sales_forecast

def test_product_tools():
    products = get_products.invoke({})
    assert len(products) >= 1
    assert "name" in products[0]
    assert "price" in products[0]

    detail = get_product_details.invoke({"product_name_or_sku": "iPhone"})
    assert "iPhone" in detail.get("name", "")

def test_inventory_tools():
    status = get_inventory_status.invoke({})
    assert "total_sku_count" in status
    assert status["total_sku_count"] > 0
    assert "low_stock_skus" in status

    low_stock = get_low_stock_products.invoke({})
    assert isinstance(low_stock, list)
    assert len(low_stock) >= 1

    inv_value = get_inventory_value.invoke({})
    assert inv_value["total_inventory_value"] > 0
    assert "profit_margin_percentage" in inv_value

def test_sales_and_analytics_tools():
    sales = get_sales.invoke({"limit": 10})
    assert len(sales) >= 1

    analytics = get_sales_analytics.invoke({"days": 30})
    assert analytics["total_revenue"] > 0
    assert analytics["total_orders"] > 0

    top_sellers = get_top_selling_products.invoke({"limit": 3})
    assert len(top_sellers) >= 1
    assert "units_sold" in top_sellers[0]

def test_forecast_tool():
    forecast = get_sales_forecast.invoke({"days": 7})
    assert forecast["forecast_period_days"] == 7
    assert len(forecast["forecast"]) == 7
    assert forecast["forecast"][0]["predicted_revenue"] > 0
