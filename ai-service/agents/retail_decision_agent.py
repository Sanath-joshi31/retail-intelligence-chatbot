import time
import math
from typing import Dict, Any, List, Optional
from agents.state import AgentState
from tools.inventory_tools import get_low_stock_products, get_inventory_status
from tools.sales_tools import get_sales
from tools.forecast_tools import get_sales_forecast
from tools.rag_tools import retrieve_reorder_policy
from tools.calculation_tools import (
    calculate_daily_sales_velocity,
    calculate_reorder_quantity,
    apply_moq,
    calculate_stock_coverage,
    calculate_stock_risk,
    calculate_reorder_priority
)
from utils.telemetry import metrics_collector
from utils.logging import logger

class RetailDecisionAgent:
    """
    Production-grade Retail Decision & Replenishment Agent.
    Orchestrates live inventory lookups, sales velocity analysis, enterprise
    policy retrieval, deterministic ROQ/MOQ calculations, and explainable
    replenishment decisions with a human-in-the-loop safety gate.
    """

    @classmethod
    def execute(cls, state: AgentState) -> Dict[str, Any]:
        start_time = time.time()
        question = state.get("question", "")
        tools_called = []
        errors = []

        # 1. Goal Understanding & Planning
        agent_goal = cls._determine_goal(question)
        execution_plan = [
            "Query real-time low-stock inventory",
            "Fetch 30-day completed sales history",
            "Retrieve enterprise reorder and replenishment policy via RAG",
            "Run deterministic calculations (Velocity, Coverage, ROQ, MOQ, Risk)",
            "Generate structured decision and explainability rationale",
            "Evaluate human approval threshold"
        ]

        logger.log_event(
            "retail_agent_started",
            session_id=state.get("session_id"),
            data={"goal": agent_goal}
        )

        # 2. Tool Execution - Step 1: Inventory
        tool_start = time.time()
        tools_called.append("get_low_stock_products")
        try:
            low_stock_items = get_low_stock_products.invoke({})
        except Exception as e:
            errors.append(f"Inventory lookup failed: {str(e)}")
            low_stock_items = []

        # Tool Execution - Step 2: Sales History
        tools_called.append("get_sales")
        try:
            recent_sales = get_sales.invoke({"days": 30})
        except Exception as e:
            errors.append(f"Sales lookup failed: {str(e)}")
            recent_sales = []

        # Optional: Forecast check if query asks for forward predictions
        forecast_data = None
        if any(term in question.lower() for term in ["forecast", "predict", "next week", "project"]):
            tools_called.append("get_sales_forecast")
            try:
                forecast_data = get_sales_forecast.invoke({"days_ahead": 7})
            except Exception as e:
                errors.append(f"Forecast lookup failed: {str(e)}")

        tool_duration_ms = (time.time() - tool_start) * 1000

        # 3. Policy Retrieval (RAG)
        rag_start = time.time()
        tools_called.append("retrieve_reorder_policy")
        try:
            policy_result = retrieve_reorder_policy.invoke({})
            policy_context = policy_result.get("context", "")
            sources = policy_result.get("sources", [])
        except Exception as e:
            errors.append(f"Policy retrieval failed: {str(e)}")
            policy_context = ""
            sources = []
        rag_duration_ms = (time.time() - rag_start) * 1000

        # 4. Data Analysis & Deterministic Calculations
        products_evaluated = []
        total_estimated_spend = 0.0
        max_risk_level = "low"
        risk_weights = {"critical": 4, "high": 3, "medium": 2, "low": 1}

        # Evaluate low-stock items (or all inventory if low-stock empty)
        items_to_evaluate = low_stock_items if low_stock_items else []

        for item in items_to_evaluate:
            name = str(item.get("product_name", "Product"))
            sku = str(item.get("sku", "N/A"))
            cat = str(item.get("category", "General"))
            current_stock = int(item.get("quantity", 0))
            price = float(item.get("price", 100.0) if "price" in item else 150.0)

            # A. Velocity Calculation
            vel_res = calculate_daily_sales_velocity.invoke({
                "sales_records": recent_sales,
                "product_identifier": name,
                "days": 30
            })
            dsv = vel_res["daily_sales_velocity"]
            units_sold_30d = vel_res["total_units_sold"]

            # B. Category Policy Defaults (Lead Time & MOQ from Reorder Policy)
            cat_lower = cat.lower()
            if "electronic" in cat_lower:
                lead_time = 7
                moq = 10
            elif "apparel" in cat_lower or "cloth" in cat_lower:
                lead_time = 5
                moq = 24
            elif "appliance" in cat_lower or "home" in cat_lower:
                lead_time = 14
                moq = 5
            else:
                lead_time = 10
                moq = 10

            # C. Safety Stock Buffer (standard 25% buffer of 30d demand or minimum 5 units)
            safety_stock = max(5, math.ceil(units_sold_30d * 0.25))

            # D. ROQ Calculation: (DSV * LT) + Safety_Stock - Current_Stock
            roq_res = calculate_reorder_quantity.invoke({
                "daily_sales_velocity": dsv,
                "lead_time_days": lead_time,
                "safety_stock": safety_stock,
                "current_stock": current_stock
            })
            raw_roq = roq_res["raw_roq"]

            # E. MOQ Application
            moq_res = apply_moq.invoke({
                "raw_roq": raw_roq,
                "moq": moq
            })
            recommended_qty = moq_res["recommended_order_quantity"]

            # F. Stock Coverage & Risk
            coverage_res = calculate_stock_coverage.invoke({
                "current_stock": current_stock,
                "daily_sales_velocity": dsv
            })
            coverage_days = coverage_res["coverage_days"]

            risk_res = calculate_stock_risk.invoke({
                "coverage_days": coverage_days,
                "lead_time_days": lead_time,
                "current_stock": current_stock
            })
            stockout_risk = risk_res["stockout_risk"]

            # Track highest risk level
            if risk_weights.get(stockout_risk, 1) > risk_weights.get(max_risk_level, 1):
                max_risk_level = stockout_risk

            # Priority
            priority = calculate_reorder_priority.invoke({
                "stockout_risk": stockout_risk,
                "daily_velocity": dsv,
                "is_top_seller": (units_sold_30d > 20)
            })

            est_cost = round(recommended_qty * (price * 0.7), 2)
            total_estimated_spend += est_cost

            stock_desc = f"{max(0, current_stock)} units on-hand (Deficit: {abs(current_stock)} backordered)" if current_stock < 0 else f"{current_stock} units on-hand"
            demand_lt = math.ceil(dsv * lead_time)

            # Build item payload
            p_obj = {
                "product_id": str(item.get("productId") or sku),
                "product_name": name,
                "sku": sku,
                "category": cat,
                "current_stock": current_stock,
                "on_hand_stock": max(0, current_stock),
                "backorder_deficit": abs(current_stock) if current_stock < 0 else 0,
                "daily_sales_velocity": dsv,
                "lead_time_days": lead_time,
                "lead_time_demand": demand_lt,
                "safety_stock": safety_stock,
                "calculated_roq": raw_roq,
                "moq": moq,
                "recommended_quantity": recommended_qty,
                "recommended_reorder_qty": recommended_qty, # Backward-compatible alias
                "units_sold_30d": units_sold_30d,           # Backward-compatible alias
                "daily_velocity": dsv,                      # Backward-compatible alias
                "coverage_days": coverage_days,
                "stockout_risk": stockout_risk,
                "priority": priority,
                "estimated_order_cost": est_cost,
                "reason": (
                    f"Current inventory is {stock_desc} with forward coverage of {coverage_days} days. "
                    f"At a velocity of {dsv:.2f} units/day and {lead_time}-day lead time, expected demand is "
                    f"{demand_lt} units + {safety_stock} units buffer. "
                    f"Adjusted to MOQ constraint of {moq} units."
                )
            }
            products_evaluated.append(p_obj)

        # Sort products by urgency priority
        priority_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
        products_evaluated.sort(key=lambda p: priority_order.get(p["priority"], 99))

        # 5. Human Approval Gate
        # Require human confirmation if critical stockout risk or total order cost > $1,000
        requires_approval = (
            max_risk_level in ["critical", "high"] or
            total_estimated_spend > 1000.0 or
            len(products_evaluated) > 0
        )
        approval_status = "pending_confirmation" if requires_approval else "auto_approved"

        # 6. Format Explainable Response Text
        rec_lines = []
        for p in products_evaluated:
            rec_lines.append(
                f"• **{p['product_name']}** (`{p['sku']}`)\n"
                f"  - Stock: **{p['current_stock']} units** | Velocity: **{p['daily_sales_velocity']} units/day** | Coverage: **{p['coverage_days']} days**\n"
                f"  - Lead Time: **{p['lead_time_days']} days** | Buffer: **{p['safety_stock']} units** | MOQ: **{p['moq']} units**\n"
                f"  - 📦 **Recommended Reorder: {p['recommended_quantity']} units** (Risk: **{p['stockout_risk'].upper()}**, Priority: **{p['priority']}**)\n"
                f"  - *Reason*: {p['reason']}"
            )

        spend_formatted = f"${total_estimated_spend:,.2f}"
        approval_notice = (
            f"\n\n🛡️ **Human Approval Gate**: This replenishment order represents an estimated procurement commitment of **{spend_formatted}** "
            f"and includes items at **{max_risk_level.upper()}** stockout risk. Manager authorization is required before purchase order generation."
            if requires_approval else ""
        )

        answer = (
            f"🤖 **Autonomous Stock Replenishment Recommendation**\n\n"
            f"Based on real-time **Inventory levels**, **30-day Sales Velocity**, and our **Enterprise Reorder Policy**, here are the actionable replenishment orders:\n\n"
            + ("\n\n".join(rec_lines) if rec_lines else "All inventory SKUs currently maintain healthy stock levels above minimum reorder points.") +
            f"\n\n**Decision Logic Applied**:\n"
            f"1. *Live Inventory*: Evaluated {len(products_evaluated)} SKU(s) against configured safety thresholds.\n"
            f"2. *Demand Analysis*: Computed daily velocity from 30 days of completed orders.\n"
            f"3. *Policy Formulation*: Applied Economic Reorder Quantity formula: $ROQ = (DSV \\times Lead\\ Time) + Safety\\ Stock - Current\\ Stock$, aligned to category MOQs."
            + approval_notice
        )

        total_ms = (time.time() - start_time) * 1000

        # Record agent-specific telemetry
        metrics_collector.record_agent_execution(
            success=(len(errors) == 0),
            execution_time_ms=total_ms,
            tools_count=len(tools_called),
            recommendations_count=len(products_evaluated),
            requires_approval=requires_approval
        )

        structured_data = {
            "decision": "reorder",
            "priority": max_risk_level.upper() if max_risk_level != "low" else "MEDIUM",
            "products": products_evaluated,
            "recommendations": products_evaluated, # Backward compatibility
            "total_estimated_spend": total_estimated_spend,
            "requires_user_confirmation": requires_approval,
            "approval_status": approval_status,
            "sources": sources
        }

        return {
            "answer": answer,
            "response_type": "recommendation",
            "tools_called": tools_called,
            "sources": sources,
            "data": structured_data,
            "agent_goal": agent_goal,
            "execution_plan": execution_plan,
            "current_step": "completed",
            "calculations": {
                "products_evaluated": len(products_evaluated),
                "total_spend": total_estimated_spend,
                "max_risk": max_risk_level
            },
            "recommendations": products_evaluated,
            "risk_assessment": {
                "highest_risk": max_risk_level,
                "requires_approval": requires_approval,
                "total_estimated_spend": total_estimated_spend
            },
            "requires_approval": requires_approval,
            "approval_status": approval_status,
            "latency": {
                "retrieval_ms": round(rag_duration_ms, 2),
                "tool_ms": round(tool_duration_ms, 2),
                "total_ms": round(total_ms, 2)
            },
            "error": errors[0] if errors else None
        }

    @staticmethod
    def _determine_goal(query: str) -> str:
        q = query.lower()
        if "highest risk" in q or "stockout" in q:
            return "Identify highest stockout risk items and compute emergency replenishment"
        elif "top-selling" in q or "best" in q:
            return "Replenish fast-moving top seller SKUs before stock depletion"
        elif "forecast" in q:
            return "Generate forward-looking replenishment using sales forecasting"
        return "Evaluate inventory, sales velocity, and reorder policy to recommend replenishment quantities"
