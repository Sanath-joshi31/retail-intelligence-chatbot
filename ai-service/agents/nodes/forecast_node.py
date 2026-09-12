import time
from typing import Dict, Any
from agents.state import AgentState
from tools.forecast_tools import get_sales_forecast

def forecast_node(state: AgentState) -> Dict[str, Any]:
    start_time = time.time()
    tools_called = ["get_sales_forecast"]
    
    forecast_res = get_sales_forecast.invoke({"days": 7})
    forecast_days = forecast_res["forecast"]
    baseline = forecast_res["baseline_daily_average"]
    
    lines = [
        f"• **{f['day']} ({f['date'][-5:]})**: ~${f['predicted_revenue']:,.2f}"
        for f in forecast_days
    ]
    answer = (
        f"🔮 **7-Day Predictive Sales Forecast**\n\n"
        f"Based on your 30-day baseline daily average of **${baseline:,.2f}** and weekday demand patterns:\n\n"
        + "\n".join(lines) +
        f"\n\n💡 *Projected 7-Day Total Revenue: ~${sum(f['predicted_revenue'] for f in forecast_days):,.2f}*"
    )
    
    resp_type = "chart"
    chart_type = "line"
    chart_data = {
        "labels": [f["day"] for f in forecast_days],
        "datasets": [{
            "label": "Predicted Revenue ($)",
            "data": [f["predicted_revenue"] for f in forecast_days],
            "borderColor": "#8b5cf6",
            "backgroundColor": "rgba(139, 92, 246, 0.2)"
        }]
    }

    elapsed = (time.time() - start_time) * 1000

    return {
        "answer": answer,
        "tools_called": tools_called,
        "response_type": resp_type,
        "chart_data": chart_data,
        "chart_type": chart_type,
        "data": forecast_res,
        "latency": {"tool_ms": round(elapsed, 2), "total_ms": round(elapsed, 2)}
    }
