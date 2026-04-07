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
} from 'lucide-react';
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
    if (dailySales.length < 2) return 0;
    const mid = Math.floor(dailySales.length / 2);
    const firstHalf = dailySales.slice(0, mid).reduce((s, d) => s + d.revenue, 0) / mid;
    const secondHalf = dailySales.slice(mid).reduce((s, d) => s + d.revenue, 0) / (dailySales.length - mid);
    return ((secondHalf - firstHalf) / firstHalf) * 100;
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
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '4px' }}>Dashboard</h1>
        <p style={{ color: 'var(--text-muted)' }}>Welcome to your Retail Intelligence Hub</p>
      </div>

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
