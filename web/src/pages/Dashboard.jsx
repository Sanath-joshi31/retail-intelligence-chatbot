import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Package,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  MessageSquare,
  BarChart3,
  CheckCircle2,
  Bell,
  X,
} from 'lucide-react';
import { io } from 'socket.io-client';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { salesAPI, inventoryAPI } from '../services/api';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [realtimeAlerts, setRealtimeAlerts] = useState([]);
  const [stats, setStats] = useState({
    revenue: 0,
    orders: 0,
    avgOrder: 0,
    growth: 0,
  });
  const [inventoryStats, setInventoryStats] = useState(null);
  const [salesData, setSalesData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);

  useEffect(() => {
    fetchDashboardData();

    // Socket.IO real-time listener for AI Replenishment Alerts
    let socket;
    try {
      const socketUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
      socket = io(socketUrl, { transports: ['websocket', 'polling'] });
      socket.on('inventory:alert', (alertData) => {
        setRealtimeAlerts(prev => [alertData, ...prev.slice(0, 4)]);
      });
    } catch (e) {
      console.warn('Socket connection error:', e);
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  async function fetchDashboardData() {
    try {
      setLoading(true);

      // Fetch sales analytics
      const [salesRes, inventoryRes] = await Promise.all([
        salesAPI.getAnalytics({ days: 30 }),
        inventoryAPI.getStatus(),
      ]);

      const salesData = salesRes.data.data;
      setStats({
        revenue: salesData.summary.totalRevenue,
        orders: salesData.summary.totalOrders,
        avgOrder: salesData.summary.averageOrderValue,
        growth: calculateGrowth(salesData.dailySales),
      });
      setSalesData(salesData.dailySales);

      // Transform category data for pie chart
      const categoryEntries = Object.entries(salesData.categoryBreakdown || {});
      setCategoryData(
        categoryEntries.map(([name, data]) => ({
          name,
          value: data.revenue,
        }))
      );

      setInventoryStats(inventoryRes.data.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Use mock data if API fails
      setMockData();
    } finally {
      setLoading(false);
    }
  }

  function calculateGrowth(dailySales) {
    if (!dailySales || dailySales.length < 2) return 0;
    const mid = Math.floor(dailySales.length / 2);
    const firstHalfSum = dailySales.slice(0, mid).reduce((s, d) => s + (d.revenue || 0), 0);
    const secondHalfSum = dailySales.slice(mid).reduce((s, d) => s + (d.revenue || 0), 0);
    const firstHalf = firstHalfSum / (mid || 1);
    const secondHalf = secondHalfSum / ((dailySales.length - mid) || 1);
    if (!firstHalf || isNaN(firstHalf)) return 0;
    const growth = ((secondHalf - firstHalf) / firstHalf) * 100;
    return isNaN(growth) || !isFinite(growth) ? 0 : growth;
  }

  function setMockData() {
    // Mock data for demo when API is unavailable
    setStats({
      revenue: 45280.50,
      orders: 342,
      avgOrder: 132.40,
      growth: 12.5,
    });

    const mockDaily = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      mockDaily.push({
        date: date.toISOString().split('T')[0].slice(5),
        revenue: Math.round(1000 + Math.random() * 2000),
        orders: Math.floor(5 + Math.random() * 15),
      });
    }
    setSalesData(mockDaily);

    setInventoryStats({
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

    setCategoryData([
      { name: 'Electronics', value: 25000 },
      { name: 'Clothing', value: 8000 },
      { name: 'Home', value: 6000 },
      { name: 'Sports', value: 4000 },
      { name: 'Books', value: 1000 },
    ]);
  }

  const StatCard = ({ title, value, icon: Icon, trend, trendValue, color }) => (
    <div className="card" style={{
      background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(99, 102, 241, 0.05) 100%)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '4px' }}>{title}</p>
          <h3 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {typeof value === 'number' ? value.toLocaleString('en-US', {
              style: title.includes('Revenue') || title.includes('Value') ? 'currency' : undefined,
              currency: 'USD',
              maximumFractionDigits: 0,
            }) : value}
          </h3>
          {trend && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              marginTop: '8px',
              color: trend === 'up' ? 'var(--secondary)' : 'var(--danger)',
              fontSize: '0.875rem',
            }}>
              {trend === 'up' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
              <span>{Math.abs(trendValue).toFixed(1)}% vs last period</span>
            </div>
          )}
        </div>
        <div style={{
          padding: '12px',
          borderRadius: 'var(--radius-md)',
          background: `rgba(${color}, 0.1)`,
        }}>
          <Icon size={24} color={`rgb(${color})`} />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
      }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '4px' }}>Dashboard</h1>
          <p style={{ color: 'var(--text-muted)' }}>Welcome to your Retail Intelligence Hub</p>
        </div>
        <button onClick={fetchDashboardData} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          🔄 Refresh Data
        </button>
      </div>

      {/* Real-Time AI Agent Replenishment Alerts Banner */}
      {realtimeAlerts.length > 0 && (
        <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {realtimeAlerts.map((alt, idx) => (
            <div key={idx} style={{
              background: alt.severity === 'critical' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
              border: `1px solid ${alt.severity === 'critical' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              animation: 'slideIn 0.3s ease'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: alt.severity === 'critical' ? '#ef4444' : '#f59e0b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Bell size={18} color="white" />
                </div>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {alt.title}
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {alt.recommendation ? (
                      <>
                        Suggested Reorder: <strong>{alt.recommendation.suggestedReorderQuantity} units</strong> |
                        Lead Time: {alt.recommendation.estimatedLeadTimeDays}d |
                        Daily Velocity: {alt.recommendation.dailyVelocity}/day
                      </>
                    ) : alt.message}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {alt.recommendation && (
                  <button
                    onClick={() => alert(`Replenishment Purchase Order draft created for ${alt.recommendation.suggestedReorderQuantity} units of ${alt.recommendation.productName}!`)}
                    style={{
                      padding: '6px 12px',
                      background: 'var(--primary)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <CheckCircle2 size={14} /> Approve Restock
                  </button>
                )}
                <button
                  onClick={() => setRealtimeAlerts(prev => prev.filter((_, i) => i !== idx))}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                  title="Dismiss alert"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '20px',
        marginBottom: '24px',
      }}>
        <StatCard
          title="Total Revenue"
          value={stats.revenue}
          icon={DollarSign}
          trend={stats.growth >= 0 ? 'up' : 'down'}
          trendValue={stats.growth}
          color="16, 185, 129"
        />
        <StatCard
          title="Total Orders"
          value={stats.orders}
          icon={ShoppingCart}
          trend="up"
          trendValue={8.2}
          color="99, 102, 241"
        />
        <StatCard
          title="Avg Order Value"
          value={stats.avgOrder}
          icon={TrendingUp}
          trend="up"
          trendValue={4.3}
          color="245, 158, 11"
        />
        <StatCard
          title="Inventory Items"
          value={inventoryStats?.total || 0}
          icon={Package}
          trend={inventoryStats?.lowStock > 3 ? 'down' : 'up'}
          trendValue={inventoryStats?.lowStock || 0}
          color="59, 130, 246"
        />
      </div>

      {/* Charts Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '20px',
        marginBottom: '24px',
      }}>
        {/* Revenue Chart */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Revenue Trend (30 Days)</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} />
              <YAxis stroke="var(--text-muted)" fontSize={12} tickFormatter={(v) => `$${v/1000}k`} />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="var(--primary)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Category Breakdown */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Sales by Category</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Alerts Section */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px',
      }}>
        {/* Low Stock Alerts */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={18} color="var(--warning)" />
              Low Stock Alerts
            </h3>
            <Link to="/inventory" style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '0.875rem' }}>
              View All →
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {inventoryStats?.items?.outOfStock?.slice(0, 3).map((item, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                background: 'rgba(239, 68, 68, 0.1)',
                borderRadius: 'var(--radius-md)',
              }}>
                <span style={{ fontWeight: 500 }}>{item.product?.name || 'Unknown Product'}</span>
                <span className="badge badge-danger">Out of Stock</span>
              </div>
            ))}
            {inventoryStats?.items?.lowStock?.slice(0, 3).map((item, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                background: 'rgba(245, 158, 11, 0.1)',
                borderRadius: 'var(--radius-md)',
              }}>
                <span style={{ fontWeight: 500 }}>{item.product?.name || 'Unknown Product'}</span>
                <span className="badge badge-warning">{item.quantity} left</span>
              </div>
            ))}
            {(!inventoryStats?.items?.outOfStock?.length && !inventoryStats?.items?.lowStock?.length) && (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
                ✅ All products are well stocked!
              </p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Quick Actions</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Link to="/chatbot" className="btn btn-primary" style={{ textDecoration: 'none' }}>
              <MessageSquare size={18} />
              Ask AI Assistant
            </Link>
            <Link to="/inventory" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
              <Package size={18} />
              Manage Inventory
            </Link>
            <Link to="/sales" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
              <BarChart3 size={18} />
              View Sales Report
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
