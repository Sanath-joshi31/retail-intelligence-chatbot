# Enterprise Inventory Reorder and Stock Replenishment Policy

## 1. Objective and Scope
This policy governs inventory thresholds, automated reorder triggers, purchase order quantities, and safety stock calculations across all retail store branches and central distribution warehouses.

## 2. Reorder Calculation Formula
The recommended reorder quantity ($ROQ$) is calculated using the standard Economic Order & Demand Velocity model:
$$ROQ = (Daily\ Sales\ Velocity \times Supplier\ Lead\ Time) + Safety\ Stock - Current\ Inventory$$

Where:
* **Daily Sales Velocity ($DSV$)**: Average daily units sold over the rolling last 30 days.
* **Supplier Lead Time ($LT$)**: Standard lead time in days (Default: 7 days for domestic electronics, 14 days for imported appliances, 5 days for apparel).
* **Safety Stock ($SS$)**: Calculated as $Safety\ Stock = 1.5 \times (Max\ Daily\ Sales \times Max\ Lead\ Time - DSV \times LT)$ or minimum 20% of monthly average sales volume.

## 3. Stock Level Thresholds
* **Out of Stock (Quantity = 0)**: Immediate high-priority restock escalation. Notify store manager and procurement director.
* **Low Stock Trigger (Quantity $\le$ Min Stock Level)**: Automated purchase order draft generation. Minimum stock level is configured per SKU (typically 10 to 25 units).
* **Reorder Point (Quantity $\le$ Reorder Point)**: Routine replenishment order placed during the weekly procurement cycle. Default reorder point is 20 units or 14 days of forward cover.
* **Overstock Warning (Quantity > Max Stock Level)**: Halt replenishment; initiate promotional discount or cross-store inventory rebalancing.

## 4. Minimum Order Quantities (MOQ) and Batching
* **Electronics & High-Value Devices**: Minimum batch size is 10 units. Orders must be approved by the Department Category Manager.
* **Apparel & General Merchandise**: Standard case pack size is 24 units.
* **Express Reorder**: For fast-moving SKUs whose stock cover falls below 3 days of sales, expedited 48-hour air freight shipping is authorized.

## 5. Seasonal & Promotional Adjustments
* Increase reorder targets by **35%** during Q4 holiday shopping (November 15 – January 10).
* Increase reorder targets by **20%** 3 weeks prior to announced promotional campaigns.

