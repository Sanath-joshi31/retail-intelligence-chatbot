import math
from typing import List, Dict, Any, Optional
from langchain_core.tools import tool

@tool
def calculate_daily_sales_velocity(
    sales_records: List[Dict[str, Any]],
    product_identifier: str,
    days: int = 30
) -> Dict[str, Any]:
    """
    Deterministically computes rolling average daily sales velocity (DSV) for a given product
    over a specified sales window (default 30 days).
    """
    total_units_sold = 0
    p_id_clean = product_identifier.strip().lower()

    for sale in sales_records:
        for item in sale.get("items", []):
            item_name = str(item.get("name") or item.get("product_name") or "").lower()
            item_pid = str(item.get("product") or item.get("productId") or "").lower()
            
            if p_id_clean in item_name or item_name in p_id_clean or (item_pid and p_id_clean == item_pid):
                qty = int(item.get("quantity", 1))
                total_units_sold += qty

    # Baseline demand assumption if zero completed sales in window
    effective_units = total_units_sold if total_units_sold > 0 else 12
    daily_velocity = round(effective_units / max(1, days), 2)

    return {
        "product": product_identifier,
        "days_analyzed": days,
        "total_units_sold": total_units_sold,
        "is_baseline_estimated": (total_units_sold == 0),
        "daily_sales_velocity": daily_velocity
    }

@tool
def calculate_reorder_quantity(
    daily_sales_velocity: float,
    lead_time_days: int,
    safety_stock: int,
    current_stock: int
) -> Dict[str, Any]:
    """
    Calculates Recommended Reorder Quantity (ROQ) using the enterprise Economic Order formula:
    ROQ = (Daily Sales Velocity * Supplier Lead Time) + Safety Stock - Current Inventory.
    """
    lead_time_demand = math.ceil(daily_sales_velocity * lead_time_days)
    raw_roq = lead_time_demand + safety_stock - current_stock
    needed_roq = max(0, raw_roq)

    return {
        "daily_sales_velocity": round(daily_sales_velocity, 2),
        "lead_time_days": lead_time_days,
        "lead_time_demand": lead_time_demand,
        "safety_stock": safety_stock,
        "current_stock": current_stock,
        "raw_roq": raw_roq,
        "net_needed_quantity": needed_roq
    }

@tool
def apply_moq(raw_roq: int, moq: int) -> Dict[str, Any]:
    """
    Applies supplier Minimum Order Quantity (MOQ) and batch case-pack packaging constraints.
    Rounds up to MOQ or nearest MOQ multiple.
    """
    if raw_roq <= 0:
        recommended = moq
        batches = 1
    elif raw_roq <= moq:
        recommended = moq
        batches = 1
    else:
        batches = math.ceil(raw_roq / moq)
        recommended = batches * moq

    return {
        "raw_roq": raw_roq,
        "moq": moq,
        "batches": batches,
        "recommended_order_quantity": recommended,
        "moq_adjustment_added": max(0, recommended - raw_roq)
    }

@tool
def calculate_stock_coverage(current_stock: int, daily_sales_velocity: float) -> Dict[str, Any]:
    """
    Calculates forward days of stock coverage based on current on-hand units and velocity.
    """
    if daily_sales_velocity <= 0:
        days_coverage = 999.0
    else:
        effective_stock = max(0, current_stock)
        days_coverage = round(effective_stock / daily_sales_velocity, 1)

    return {
        "current_stock": current_stock,
        "daily_sales_velocity": daily_sales_velocity,
        "coverage_days": days_coverage
    }

@tool
def calculate_stock_risk(coverage_days: float, lead_time_days: int, current_stock: int) -> Dict[str, Any]:
    """
    Evaluates stockout risk level and flags urgency.
    """
    if current_stock <= 0:
        risk_level = "critical"
        urgency = "immediate"
        rationale = "Product is completely out of stock with customer stockouts occurring."
    elif coverage_days < 2.0:
        risk_level = "critical"
        urgency = "immediate"
        rationale = f"Stock cover ({coverage_days} days) is less than 48 hours."
    elif coverage_days <= lead_time_days:
        risk_level = "high"
        urgency = "high"
        rationale = f"Stock cover ({coverage_days} days) is shorter than supplier lead time ({lead_time_days} days). Stockout imminent before delivery."
    elif coverage_days <= (lead_time_days * 1.5):
        risk_level = "medium"
        urgency = "routine"
        rationale = f"Stock cover ({coverage_days} days) approaching reorder cycle threshold."
    else:
        risk_level = "low"
        urgency = "low"
        rationale = f"Healthy forward coverage of {coverage_days} days."

    return {
        "stockout_risk": risk_level,
        "urgency": urgency,
        "rationale": rationale,
        "coverage_days": coverage_days,
        "lead_time_days": lead_time_days
    }

@tool
def calculate_reorder_priority(
    stockout_risk: str,
    daily_velocity: float,
    is_top_seller: bool = False
) -> str:
    """
    Determines ranking priority for procurement queue: CRITICAL, HIGH, MEDIUM, LOW.
    """
    if stockout_risk == "critical":
        return "CRITICAL"
    elif stockout_risk == "high" or (is_top_seller and stockout_risk in ["medium", "high"]):
        return "HIGH"
    elif stockout_risk == "medium":
        return "MEDIUM"
    return "LOW"
