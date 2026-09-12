import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from fastapi.testclient import TestClient
from app import app

client = TestClient(app)

def test_inventory_event_normal_stock():
    payload = {
        "productId": "p1",
        "productName": "Apple iPhone 15 Pro",
        "sku": "ELEC-IPHONE-15",
        "category": "Electronics",
        "newQuantity": 35,
        "minStockLevel": 15,
        "reorderPoint": 25,
        "warehouse": "Main"
    }
    response = client.post("/ai/events/inventory-update", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["alertRequired"] is False
    assert data["severity"] == "info"

def test_inventory_event_low_stock_trigger():
    payload = {
        "productId": "p1",
        "productName": "Apple iPhone 15 Pro",
        "sku": "ELEC-IPHONE-15",
        "category": "Electronics",
        "newQuantity": 4, # Below minStockLevel 15
        "minStockLevel": 15,
        "reorderPoint": 25,
        "warehouse": "Main"
    }
    response = client.post("/ai/events/inventory-update", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["alertRequired"] is True
    assert data["severity"] == "warning"
    assert "🚨 AI Alert" in data["title"]
    assert data["requiresUserConfirmation"] is True
    assert data["recommendation"] is not None
    assert data["recommendation"]["suggestedReorderQuantity"] >= 10
    assert len(data["sources"]) >= 1

def test_inventory_event_out_of_stock_critical():
    payload = {
        "productId": "p5",
        "productName": "KitchenAid Stand Mixer",
        "sku": "HOME-KA-MIXER",
        "category": "Home & Garden",
        "newQuantity": 0,
        "minStockLevel": 8,
        "reorderPoint": 15,
        "warehouse": "East"
    }
    response = client.post("/ai/events/inventory-update", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["alertRequired"] is True
    assert data["severity"] == "critical"
    assert data["recommendation"]["suggestedReorderQuantity"] > 0
