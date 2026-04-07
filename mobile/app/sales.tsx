import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { API_URL } from '../services/api';
const screenWidth = Dimensions.get('window').width;

export default function SalesScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [timeRange, setTimeRange] = useState(30);
  const chartColors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'];

  useEffect(() => {
    fetchSalesData();
  }, [timeRange]);

  async function fetchSalesData() {
    try {
      const response = await fetch(`${API_URL}/sales/analytics?days=${timeRange}`);
      if (response.ok) {
        const payload = await response.json();
        if (payload?.success && payload?.data && typeof payload.data === 'object') {
          setAnalytics(payload.data);
        } else {
          setMockData();
        }
      } else {
        setMockData();
      }
    } catch (error) {
      console.warn('Unable to reach API, using mock sales data:', error);
      setMockData();
    } finally {
      setLoading(false);
    }
  }

  function setMockData() {
    const dailySales = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dailySales.push({
        date: date.toISOString().split('T')[0].slice(5),
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
        { name: 'iPhone 15 Pro', quantity: 45, revenue: 44999 },
        { name: 'AirPods Pro 2', quantity: 38, revenue: 9499 },
        { name: 'Nike Air Max', quantity: 32, revenue: 4799 },
        { name: 'MacBook Air M3', quantity: 12, revenue: 15599 },
        { name: 'Samsung S24', quantity: 18, revenue: 21599 },
      ],
      categoryBreakdown: {
        Electronics: { revenue: 85000 },
        Clothing: { revenue: 12000 },
        Home: { revenue: 18000 },
        Sports: { revenue: 8000 },
      },
    });
  }

  async function onRefresh() {
    setRefreshing(true);
    await fetchSalesData();
    setRefreshing(false);
  }

  const safeAnalytics = analytics && typeof analytics === 'object' ? analytics : {};
  const summary = safeAnalytics?.summary && typeof safeAnalytics.summary === 'object'
    ? safeAnalytics.summary
    : {};
  const dailySalesData = Array.isArray(safeAnalytics?.dailySales)
    ? safeAnalytics.dailySales
    : [];
  const dailySales = dailySalesData.slice(-7);
  const topProductsData = Array.isArray(safeAnalytics?.topProducts)
    ? safeAnalytics.topProducts
    : [];
  const topProducts = topProductsData.slice(0, 5).map((product, index) => {
    const labelSource =
      (typeof product?.name === 'string' && product.name.trim()) ||
      (typeof product?.productName === 'string' && product.productName.trim()) ||
      (typeof product?.product?.name === 'string' && product.product.name.trim()) ||
      (typeof product?.productId === 'string' && `Product ${product.productId.slice(-4)}`) ||
      `Product ${index + 1}`;

    return {
      label: labelSource.length > 12 ? `${labelSource.slice(0, 12)}...` : labelSource,
      quantity: Number(product?.quantity) || 0,
    };
  });
  const topProductLabels = topProducts.length > 0
    ? topProducts.map((product) => product.label)
    : ['Product 1', 'Product 2', 'Product 3'];
  const topProductValues = topProducts.length > 0
    ? topProducts.map((product) => product.quantity)
    : [45, 38, 32];

  const categoryBreakdown =
    safeAnalytics?.categoryBreakdown && typeof safeAnalytics.categoryBreakdown === 'object'
      ? safeAnalytics.categoryBreakdown
      : {};
  const chartData = {
    labels:
      dailySales.length > 0
        ? dailySales.map((item) => {
            const rawDate = typeof item?.date === 'string' ? item.date : '';
            return rawDate ? rawDate.slice(0, 5) : 'N/A';
          })
        : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        data:
          dailySales.length > 0
            ? dailySales.map((item) => Number(item?.revenue) || 0)
            : [1200, 1500, 800, 1600, 1100, 1400, 1800],
      },
    ],
  };

  const categoryData = Object.entries(categoryBreakdown)
    .map(([name, data]: [string, any], index) => ({
      name,
      value: Number(data?.revenue ?? data?.value ?? 0),
      color: chartColors[index % chartColors.length],
      legendFontColor: '#a0a0b0',
      legendFontSize: 12,
    }))
    .filter((item) => item.value > 0);

  const StatCard = ({ title, value, icon, color, subtitle }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statCardHeader}>
        <Text style={styles.statCardTitle}>{title}</Text>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.statCardValue}>
        {typeof value === 'number'
          ? title.includes('Revenue') || title.includes('Value')
            ? `$${value.toLocaleString()}`
            : value.toLocaleString()
          : value}
      </Text>
      {subtitle && <Text style={[styles.statCardSubtitle, { color }]}>{subtitle}</Text>}
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sales Analytics</Text>
        <View style={styles.timeRangeSelector}>
          {[7, 30, 90].map((days) => (
            <TouchableOpacity
              key={days}
              onPress={() => setTimeRange(days)}
              style={[styles.timeRangeChip, timeRange === days && styles.timeRangeChipActive]}
            >
              <Text
                style={[styles.timeRangeChipText, timeRange === days && styles.timeRangeChipTextActive]}
              >
                {days}d
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsGrid}>
        <StatCard
          title="Revenue"
          value={Number(summary.totalRevenue) || 0}
          icon="cash-outline"
          color="#10b981"
          subtitle="+12.5%"
        />
        <StatCard
          title="Orders"
          value={Number(summary.totalOrders) || 0}
          icon="cart-outline"
          color="#6366f1"
          subtitle="+8.2%"
        />
        <StatCard
          title="Avg Order"
          value={Number(summary.averageOrderValue) || 0}
          icon="trending-up-outline"
          color="#f59e0b"
          subtitle="+4.3%"
        />
      </View>

      {/* Revenue Chart */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Revenue Trend</Text>
        <LineChart
          data={chartData}
          width={screenWidth - 40}
          height={220}
          chartConfig={{
            backgroundColor: '#1e1e3f',
            backgroundGradientFrom: '#1e1e3f',
            backgroundGradientTo: '#1e1e3f',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(160, 160, 176, ${opacity})`,
            style: { borderRadius: 16 },
            propsForDots: { r: '6', strokeWidth: '2', stroke: '#6366f1' },
          }}
          bezier
          style={{ borderRadius: 16 }}
        />
      </View>

      {/* Top Products */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Top Products</Text>
        <BarChart
          data={{
            labels: topProductLabels,
            datasets: [
              {
                data: topProductValues,
              },
            ],
          }}
          width={screenWidth - 40}
          height={220}
          chartConfig={{
            backgroundColor: '#1e1e3f',
            backgroundGradientFrom: '#1e1e3f',
            backgroundGradientTo: '#1e1e3f',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(160, 160, 176, ${opacity})`,
            style: { borderRadius: 16 },
            barPercentage: 0.7,
          }}
          style={{ borderRadius: 16 }}
        />
      </View>

      {/* Category Breakdown */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Sales by Category</Text>
        {categoryData.length > 0 ? (
          <PieChart
            data={categoryData}
            width={screenWidth - 40}
            height={220}
            chartConfig={{
              backgroundColor: '#1e1e3f',
              backgroundGradientFrom: '#1e1e3f',
              backgroundGradientTo: '#1e1e3f',
              color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            }}
            accessor="value"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
        ) : (
          <Text style={styles.emptyText}>No category data available</Text>
        )}
      </View>

      {/* Forecast */}
      <View style={styles.forecastContainer}>
        <Text style={styles.forecastTitle}>7-Day Forecast</Text>
        <View style={styles.forecastGrid}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
            <View key={i} style={styles.forecastCard}>
              <Text style={styles.forecastDay}>{day}</Text>
              <Text style={styles.forecastValue}>
                ${Math.round(1000 + Math.random() * 800)}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  header: {
    padding: 20,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  timeRangeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  timeRangeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#1e1e3f',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2d2d4a',
  },
  timeRangeChipActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  timeRangeChipText: {
    fontSize: 13,
    color: '#6b6b80',
  },
  timeRangeChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 12,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#1e1e3f',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statCardTitle: {
    fontSize: 11,
    color: '#6b6b80',
  },
  statCardValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  statCardSubtitle: {
    fontSize: 11,
    marginTop: 4,
  },
  chartContainer: {
    backgroundColor: '#1e1e3f',
    margin: 12,
    marginTop: 0,
    borderRadius: 16,
    padding: 16,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  emptyText: {
    textAlign: 'center',
    color: '#6b6b80',
    paddingVertical: 20,
  },
  forecastContainer: {
    padding: 12,
  },
  forecastTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  forecastGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  forecastCard: {
    width: '13%',
    backgroundColor: '#1e1e3f',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  forecastDay: {
    fontSize: 11,
    color: '#6b6b80',
    marginBottom: 4,
  },
  forecastValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
});
