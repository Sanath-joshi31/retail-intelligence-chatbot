import React, { useState, useEffect } from 'react';
import { Package, AlertTriangle, TrendingUp, Search, Filter } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { inventoryAPI, productsAPI } from '../services/api';

export default function Inventory() {
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState([]);
  const [status, setStatus] = useState(null);
  const [value, setValue] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchInventory();
  }, []);

  async function fetchInventory() {
    try {
      setLoading(true);
      const [inventoryRes, statusRes, valueRes] = await Promise.all([
        inventoryAPI.getAll(),
        inventoryAPI.getStatus(),
        inventoryAPI.getValue(),
      ]);

      setInventory(inventoryRes.data.data || []);
      setStatus(statusRes.data.data);
      setValue(valueRes.data.data);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      setMockData();
    } finally {
      setLoading(false);
    }
  }

  function setMockData() {
    // Mock data for demo
    setInventory([
      { _id: '1', quantity: 5, minStockLevel: 15, product: { name: 'iPhone 15 Pro', sku: 'ELEC-001', category: 'Electronics', price: 999.99 } },
      { _id: '2', quantity: 45, minStockLevel: 20, product: { name: 'Samsung Galaxy S24', sku: 'ELEC-002', category: 'Electronics', price: 1199.99 } },
      { _id: '3', quantity: 3, minStockLevel: 10, product: { name: "Levi's 501 Jeans", sku: 'CLTH-003', category: 'Clothing', price: 79.99 } },
      { _id: '4', quantity: 0, minStockLevel: 5, product: { name: 'Peloton Bike+', sku: 'SPORTS-001', category: 'Sports', price: 2495.00 } },
      { _id: '5', quantity: 120, minStockLevel: 30, product: { name: 'AirPods Pro 2', sku: 'ELEC-009', category: 'Electronics', price: 249.99 } },
      { _id: '6', quantity: 8, minStockLevel: 15, product: { name: 'Nike Air Max 270', sku: 'CLTH-001', category: 'Clothing', price: 149.99 } },
      { _id: '7', quantity: 85, minStockLevel: 25, product: { name: 'KitchenAid Mixer', sku: 'HOME-001', category: 'Home & Garden', price: 379.99 } },
      { _id: '8', quantity: 200, minStockLevel: 50, product: { name: 'Atomic Habits Book', sku: 'BOOK-001', category: 'Books', price: 16.99 } },
    ]);

    setStatus({
      total: 30,
      outOfStock: 2,
      lowStock: 5,
      reorderSoon: 8,
      inStock: 15,
      items: {
        outOfStock: [{ product: { name: 'Peloton Bike+' }, quantity: 0 }],
        lowStock: [{ product: { name: 'iPhone 15 Pro' }, quantity: 5 }],
      },
    });

    setValue({
      totalValue: 125000,
      totalCost: 85000,
      potentialProfit: 40000,
      itemCount: 450,
    });
  }

  function getStockStatus(item) {
    if (item.quantity === 0) return { label: 'Out of Stock', class: 'badge-danger' };
    if (item.quantity <= item.minStockLevel) return { label: 'Low Stock', class: 'badge-warning' };
    if (item.quantity <= item.reorderPoint) return { label: 'Reorder Soon', class: 'badge-info' };
    return { label: 'In Stock', class: 'badge-success' };
  }

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.product?.sku?.toLowerCase().includes(searchTerm.toLowerCase());

    const statusInfo = getStockStatus(item);
    const matchesFilter = filterStatus === 'all' ||
      (filterStatus === 'low' && statusInfo.class === 'badge-warning') ||
      (filterStatus === 'out' && statusInfo.class === 'badge-danger') ||
      (filterStatus === 'in' && statusInfo.class === 'badge-success');

    return matchesSearch && matchesFilter;
  });

  const categoryData = (() => {
    const categories = {};
    inventory.forEach(item => {
      const cat = item.product?.category || 'Other';
      if (!categories[cat]) categories[cat] = 0;
      categories[cat] += item.quantity * (item.product?.price || 0);
    });
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  })();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>Inventory Management</h1>
        <p style={{ color: 'var(--text-muted)' }}>Track stock levels and manage your products</p>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px',
        marginBottom: '24px',
      }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '10px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: 'var(--radius-md)' }}>
              <Package size={24} color="var(--primary)" />
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Products</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{status?.total || 0}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '10px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: 'var(--radius-md)' }}>
              <TrendingUp size={24} color="var(--secondary)" />
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Inventory Value</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                ${value?.totalValue?.toLocaleString() || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '10px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: 'var(--radius-md)' }}>
              <AlertTriangle size={24} color="var(--warning)" />
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Low Stock</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--warning)' }}>
                {status?.lowStock || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-md)' }}>
              <AlertTriangle size={24} color="var(--danger)" />
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Out of Stock</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--danger)' }}>
                {status?.outOfStock || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <h3 className="card-title">Inventory Value by Category</h3>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={categoryData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
            <YAxis stroke="var(--text-muted)" fontSize={12} tickFormatter={(v) => `$${v/1000}k`} />
            <Tooltip
              contentStyle={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
              }}
              formatter={(value) => [`$${value.toLocaleString()}`, 'Value']}
            />
            <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]}>
              {categoryData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'][index % 5]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '16px',
        flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }} />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input"
              style={{ paddingLeft: '40px' }}
            />
          </div>
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="input"
          style={{ width: 'auto', minWidth: '150px' }}
        >
          <option value="all">All Status</option>
          <option value="in">In Stock</option>
          <option value="low">Low Stock</option>
          <option value="out">Out of Stock</option>
        </select>
      </div>

      {/* Inventory Table */}
      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.875rem',
          }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-muted)' }}>Product</th>
                <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-muted)' }}>SKU</th>
                <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-muted)' }}>Category</th>
                <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-muted)' }}>Price</th>
                <th style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)' }}>Quantity</th>
                <th style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)' }}>Min Level</th>
                <th style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventory.map((item) => {
                const statusInfo = getStockStatus(item);
                return (
                  <tr key={item._id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px', fontWeight: 500 }}>{item.product?.name || 'Unknown'}</td>
                    <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{item.product?.sku || 'N/A'}</td>
                    <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{item.product?.category || 'N/A'}</td>
                    <td style={{ padding: '12px' }}>${item.product?.price?.toFixed(2) || '0.00'}</td>
                    <td style={{ padding: '12px', textAlign: 'center', fontWeight: item.quantity <= item.minStockLevel ? 600 : 400 }}>
                      {item.quantity}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)' }}>{item.minStockLevel}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span className={`badge ${statusInfo.class}`}>{statusInfo.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredInventory.length === 0 && (
          <p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            No products found
          </p>
        )}
      </div>
    </div>
  );
}
