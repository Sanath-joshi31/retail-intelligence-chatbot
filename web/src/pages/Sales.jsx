import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, ShoppingCart, Calendar } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { salesAPI } from '../services/api';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function Sales() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [trends, setTrends] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [timeRange, setTimeRange] = useState(30);

  useEffect(() => {
    fetchSalesData();
  }, [timeRange]);

  async function fetchSalesData() {
    try {
      setLoading(true);
      const [analyticsRes, trendsRes, forecastRes] = await Promise.all([
        salesAPI.getAnalytics({ days: timeRange }),
        salesAPI.getTrends({ period: 'daily' }),
        salesAPI.getForecast({ days: 7 }),
      ]);

      setAnalytics(analyticsRes.data.data);
      setTrends(trendsRes.data.data);
      setForecast(forecastRes.data.data);
    } catch (error) {
      console.error('Error fetching sales data:', error);
      setMockData();
    } finally {
      setLoading(false);
    }
  }

  function setMockData() {
    // Mock data for demo
    const dailySales = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dailySales.push({
        date: date.toISOString().split('T')[0],
        revenue: Math.round(800 + Math.random() * 1200),
        orders: Math.floor(5 + Math.random() * 15),
      });
    }

    setAnalytics({
      summary: {
        totalRevenue: dailySales.reduce((s, d) => s + d.revenue, 0),
        totalOrders: dailySales.reduce((s, d) => s + d.orders, 0),
        averageOrderValue: 125.50,
      },
      dailySales,
      topProducts: [
        { productId: '1', name: 'iPhone 15 Pro', quantity: 45, revenue: 44999 },
        { productId: '2', name: 'AirPods Pro 2', quantity: 38, revenue: 9499 },
        { productId: '3', name: 'Nike Air Max', quantity: 32, revenue: 4799 },
        { productId: '4', name: 'MacBook Air M3', quantity: 12, revenue: 15599 },
        { productId: '5', name: 'Samsung S24 Ultra', quantity: 18, revenue: 21599 },
      ],
      categoryBreakdown: {
        'Electronics': { quantity: 150, revenue: 85000 },
        'Clothing': { quantity: 80, revenue: 12000 },
        'Home & Garden': { quantity: 45, revenue: 18000 },
        'Sports': { quantity: 30, revenue: 8000 },
      },
    });

    setTrends({
      trends: dailySales.map(d => ({ ...d, period: d.date })),
      trendDirection: 'up',
    });

    setForecast({
      forecast: [
        { date: '2024-01-15', predictedRevenue: 1200, confidence: 0.85 },
        { date: '2024-01-16', predictedRevenue: 1350, confidence: 0.82 },
        { date: '2024-01-17', predictedRevenue: 1100, confidence: 0.78 },
        { date: '2024-01-18', predictedRevenue: 1450, confidence: 0.75 },
        { date: '2024-01-19', predictedRevenue: 1600, confidence: 0.72 },
        { date: '2024-01-20', predictedRevenue: 1800, confidence: 0.70 },
        { date: '2024-01-21', predictedRevenue: 1550, confidence: 0.68 },
      ],
      baseline: { averageDailyRevenue: 1350 },
    });
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <div className="spinner" />
      </div>
    );
  }

  const summary = analytics?.summary || {};
  const topProducts = analytics?.topProducts || [];
  const categoryData = Object.entries(analytics?.categoryBreakdown || {}).map(([name, data]) => ({
    name,
    value: data.revenue,
  }));

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>Sales Analytics</h1>
            <p style={{ color: 'var(--text-muted)' }}>Comprehensive sales insights and forecasting</p>
          </div>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value))}
            className="input"
            style={{ width: 'auto' }}
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px',
      }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: 'var(--radius-md)' }}>
              <DollarSign size={24} color="var(--secondary)" />
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Revenue</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                ${summary.totalRevenue?.toLocaleString('en-US', { maximumFractionDigits: 0 }) || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: 'var(--radius-md)' }}>
              <ShoppingCart size={24} color="var(--primary)" />
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Orders</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{summary.totalOrders || 0}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: 'var(--radius-md)' }}>
              <TrendingUp size={24} color="var(--warning)" />
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Avg Order Value</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                ${summary.averageOrderValue?.toFixed(2) || '0.00'}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: 'var(--radius-md)' }}>
              <Calendar size={24} color="var(--info)" />
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Period</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{timeRange} days</p>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Trend Chart */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <h3 className="card-title">Revenue Trend</h3>
          {trends?.trendDirection && (
            <span className={`badge ${trends.trendDirection === 'up' ? 'badge-success' : 'badge-danger'}`}>
              {trends.trendDirection === 'up' ? '📈' : '📉'} Trending {trends.trendDirection}
            </span>
          )}
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={analytics?.dailySales || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="date"
              stroke="var(--text-muted)"
              fontSize={12}
              tickFormatter={(v) => v.slice(5)}
            />
            <YAxis stroke="var(--text-muted)" fontSize={12} tickFormatter={(v) => `$${v/1000}k`} />
            <Tooltip
              contentStyle={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
              }}
              formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="var(--primary)"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Charts Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        gap: '20px',
        marginBottom: '24px',
      }}>
        {/* Top Products */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Top Selling Products</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topProducts.slice(0, 5)}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} angle={-45} textAnchor="end" height={60} />
              <YAxis stroke="var(--text-muted)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                }}
              />
              <Bar dataKey="quantity" fill="var(--primary)" radius={[4, 4, 0, 0]}>
                {topProducts.slice(0, 5).map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Category Breakdown */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Sales by Category</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                label={(entry) => entry.name}
                labelLine={false}
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
                formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Forecast */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">7-Day Sales Forecast</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px', marginBottom: '16px' }}>
          {forecast?.forecast?.map((day, i) => (
            <div key={i} style={{
              padding: '12px',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center',
            }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
              </p>
              <p style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                ${day.predictedRevenue?.toLocaleString() || 0}
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {(day.confidence * 100).toFixed(0)}% confidence
              </p>
            </div>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={forecast?.forecast || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="date"
              stroke="var(--text-muted)"
              fontSize={12}
              tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { weekday: 'short' })}
            />
            <YAxis stroke="var(--text-muted)" fontSize={12} />
            <Tooltip
              contentStyle={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
              }}
            />
            <Line
              type="monotone"
              dataKey="predictedRevenue"
              stroke="var(--info)"
              strokeWidth={2}
              dot={{ fill: 'var(--info)', r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
