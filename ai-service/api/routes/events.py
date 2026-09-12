from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
import time
import math
from rag.retriever import EnterpriseKnowledgeRetriever
from tools.sales_tools import get_sales

router = APIRouter(prefix="/ai/events", tags=["Real-Time AI Events"])

class InventoryUpdateEvent(BaseModel):
    productId: str
    productName: str
    sku: Optional[str] = "N/A"
    category: Optional[str] = "General"
    newQuantity: int
    minStockLevel: int = 10
    reorderPoint: int = 20
    warehouse: Optional[str] = "Main"

class AIEventResponse(BaseModel):
    alertRequired: bool
    severity: str # info, warning, critical
    title: str
    message: str
    recommendation: Optional[Dict[str, Any]] = None
    sources: List[Dict[str, Any]] = []
    requiresUserConfirmation: bool = True

@router.post("/inventory-update", response_model=AIEventResponse)
async def process_inventory_update_event(event: InventoryUpdateEvent):
    # If stock is above min stock level and reorder point, no emergency alert needed
    if event.newQuantity > event.minStockLevel:
        return AIEventResponse(
            alertRequired=False,
            severity="info",
            title="Stock Normal",
            message=f"Stock for {event.productName} is at {event.newQuantity} units (healthy).",
            requiresUserConfirmation=False
        )

    # Stock is low or out of stock! Run multi-step agent reasoning
    severity = "critical" if event.newQuantity == 0 else "warning"
    
    # 1. Fetch sales velocity for this item using deterministic calculation tools
    recent_sales = get_sales.invoke({"days": 30})
    from tools.calculation_tools import (
        calculate_daily_sales_velocity,
        calculate_reorder_quantity,
        apply_moq,
        calculate_stock_coverage,
        calculate_stock_risk
    )
    
    vel_res = calculate_daily_sales_velocity.invoke({
        "sales_records": recent_sales,
        "product_identifier": event.productName,
        "days": 30
    })
    daily_velocity = vel_res["daily_sales_velocity"]
    units_sold_30d = vel_res["total_units_sold"]

    # 2. Retrieve Reorder Policy from RAG
    retriever = EnterpriseKnowledgeRetriever.get_instance()
    rag_res = retriever.retrieve("inventory reorder policy lead time MOQ", k=1, category="inventory")
    _, sources = retriever.format_context_and_sources(rag_res)

    # 3. Calculate recommended replenishment deterministically
    lead_time = 7 if "electronic" in event.category.lower() else (5 if "cloth" in event.category.lower() or "apparel" in event.category.lower() else 14)
    moq = 10 if "electronic" in event.category.lower() else (24 if "cloth" in event.category.lower() or "apparel" in event.category.lower() else 5)
    safety_stock = max(5, math.ceil(units_sold_30d * 0.25))
    
    roq_res = calculate_reorder_quantity.invoke({
        "daily_sales_velocity": daily_velocity,
        "lead_time_days": lead_time,
        "safety_stock": safety_stock,
        "current_stock": event.newQuantity
    })
    raw_roq = roq_res["raw_roq"]

    moq_res = apply_moq.invoke({
        "raw_roq": raw_roq,
        "moq": moq
    })
    recommended_qty = moq_res["recommended_order_quantity"]

    coverage_res = calculate_stock_coverage.invoke({
        "current_stock": event.newQuantity,
        "daily_sales_velocity": daily_velocity
    })
    coverage_days = coverage_res["coverage_days"]

    action_text = "Out of Stock" if event.newQuantity == 0 else f"Low Stock ({event.newQuantity} units left)"

    return AIEventResponse(
        alertRequired=True,
        severity=severity,
        title=f"🚨 AI Alert: {event.productName} {action_text}",
        message=(
            f"Stock level for **{event.productName}** has fallen to **{event.newQuantity} units** (Min Threshold: {event.minStockLevel}).\n"
            f"At current 30-day velocity (**{daily_velocity:.1f} units/day**), stock cover is **{math.floor(coverage_days)} days**.\n"
            f"Recommended Action: Prepare Purchase Order for **{recommended_qty} units** (MOQ applied: {moq})."
        ),
        recommendation={
            "productId": event.productId,
            "productName": event.productName,
            "currentStock": event.newQuantity,
            "suggestedReorderQuantity": recommended_qty,
            "estimatedLeadTimeDays": lead_time,
            "dailyVelocity": round(daily_velocity, 2),
            "coverageDays": coverage_days,
            "moq": moq
        },
        sources=sources,
        requiresUserConfirmation=True
    )

class ApprovalRequest(BaseModel):
    productName: str
    quantity: int
    decision: str = Field(..., description="'approved' or 'rejected'")
    notes: Optional[str] = None
    userId: Optional[str] = "manager-1"

class ApprovalResponse(BaseModel):
    success: bool
    message: str
    auditLog: Dict[str, Any]

@router.post("/recommendations/confirm", response_model=ApprovalResponse)
async def confirm_recommendation(approval: ApprovalRequest):
    """
    Human-in-the-loop approval endpoint for high-impact replenishment orders.
    Records decisions into metrics and logs audit trail.
    """
    from utils.telemetry import metrics_collector
    from utils.logging import logger

    is_approved = (approval.decision.lower() == "approved")
    metrics_collector.record_approval_decision(is_approved)

    audit_entry = {
        "product": approval.productName,
        "quantity": approval.quantity,
        "decision": approval.decision,
        "reviewed_by": approval.userId,
        "notes": approval.notes,
        "timestamp": time.time(),
        "status": "po_draft_created" if is_approved else "order_cancelled"
    }

    logger.log_event(
        "human_approval_decision_recorded",
        data=audit_entry
    )

    action_msg = (
        f"Purchase order draft created for {approval.quantity} units of {approval.productName}."
        if is_approved else
        f"Replenishment recommendation for {approval.productName} was rejected."
    )

    return ApprovalResponse(
        success=True,
        message=action_msg,
        auditLog=audit_entry
    )
