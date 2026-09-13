# Retail Intelligence Platform — Results & Execution Screenshots

This folder contains verified execution screenshots of the running platform across its key functional areas:

---

### 1. Executive Dashboard Overview
**File:** [`01_dashboard_overview.png`](./01_dashboard_overview.png)
- Displays overall platform KPIs: **Total Revenue ($87,321)**, **Total Orders (28)**, **Average Order Value ($3,119)**, and **Catalog Inventory Items (30)**.
- Interactive 30-day revenue trend line chart and category distribution donut chart.

---

### 2. Live Inventory Management
**File:** [`02_inventory_management.png`](./02_inventory_management.png)
- Live inventory tracker showing **17 low stock items**, category valuations, and warehouse stock levels.

---

### 3. Sales & Revenue Analytics
**File:** [`03_sales_analytics.png`](./03_sales_analytics.png)
- Detailed sales performance page featuring revenue trend lines, date-range controls, category performance bars, and best-selling product rankings.

---

### 4. AI Chatbot Interface (Initial View)
**File:** [`04_chatbot_initial.png`](./04_chatbot_initial.png)
- Clean, dark-mode conversational UI with quick-action prompt chips for RAG policy questions, live stock inquiries, top sellers, replenishment decisions, and 7-day sales forecasting.

---

### 5. AI Autonomous Replenishment Plan — Executive KPIs & Chart
**File:** [`05_ai_replenishment_chart_kpis.png`](./05_ai_replenishment_chart_kpis.png)
- Flagship multi-step reasoning response to: *"Which products should I reorder based on current inventory, the last 30 days of sales, and our reorder policy?"*
- Active tool badges: `get_low_stock_products`, `get_sales`, `retrieve_reorder_policy`.
- Executive summary metrics: **17 SKUs Needing Reorder**, **14 Critical SKUs**, **$67,830 Est. Purchase Investment**.
- Interactive Recharts bar chart comparing **On-Hand Stock** vs. **Lead Time Demand + Buffer** vs. **Recommended Order Quantity (MOQ)**.

---

### 6. AI Replenishment Decision Cards & Mathematical Breakdown
**File:** [`06_ai_replenishment_decision_cards.png`](./06_ai_replenishment_decision_cards.png)
- In-depth product card (e.g. Samsung Galaxy S24 Ultra) displaying:
  - Stock Health Gauge and Risk Badge (CRITICAL).
  - 6 Key Inventory Metrics (Deficit Stock, 30-Day Velocity, Forward Coverage, Supplier Lead Time, Safety Buffer, MOQ).
  - Transparent mathematical breakdown formula:
    $$\text{Target} = (\text{Velocity} \times \text{Lead Time}) + \text{Buffer} + \text{Deficit} \longrightarrow \text{Adjusted to Supplier MOQ}$$
  - Business rationale explanation.
  - Interactive Human-in-the-Loop **`[ Approve Order ]`** and **`[ Reject ]`** buttons.

---

### 7. RAG Policy Query with Grounded Citations
**File:** [`07_rag_policy_grounded_citations.png`](./07_rag_policy_grounded_citations.png)
- Response to customer inquiry: *"What is the return policy for electronics?"*
- Zero-hallucination semantic retrieval with clickable citations:
  - `policies/return_policy.md (p.1)`
  - `business/shipping_and_operations.md (p.1)`
- Real-time execution latency metrics.
