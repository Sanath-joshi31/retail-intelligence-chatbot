import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { API_URL } from '../services/api';

export default function Dashboard() {
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    revenue: 0,
    orders: 0,
    avgOrder: 0,
  });
  const [inventoryStats, setInventoryStats] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      // Try to fetch from API
      const [salesRes, inventoryRes] = await Promise.all([
        fetch(`${API_URL}/sales/analytics?days=30`),
        fetch(`${API_URL}/inventory/status`),
      ]);

      if (salesRes.ok && inventoryRes.ok) {
        const salesData = await salesRes.json();
        const inventoryData = await inventoryRes.json();

        setStats({
          revenue: salesData.data.summary.totalRevenue,
          orders: salesData.data.summary.totalOrders,
          avgOrder: salesData.data.summary.averageOrderValue,
        });
        setInventoryStats(inventoryData.data);
      } else {
        setMockData();
      }
    } catch (error) {
      console.warn('Unable to reach API, using mock dashboard data:', error);
      setMockData();
    }
  }

  function setMockData() {
    setStats({
      revenue: 45280,
      orders: 342,
      avgOrder: 132.40,
    });
    setInventoryStats({
      total: 30,
      outOfStock: 2,
      lowStock: 5,
      inStock: 23,
    });
  }

  async function onRefresh() {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  }

  const StatCard = ({ title, value, icon, color, subtitle }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statCardHeader}>
        <Text style={styles.statCardTitle}>{title}</Text>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.statCardValue}>
        {typeof value === 'number'
          ? title.includes('Revenue') || title.includes('Value')
            ? `$${value.toLocaleString()}`
            : value.toLocaleString()
          : value}
      </Text>
      {subtitle && <Text style={styles.statCardSubtitle}>{subtitle}</Text>}
    </View>
  );

  const chartData = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [
      {
        data: [12000, 15000, 11000, 18000],
      },
    ],
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <Text style={styles.headerSubtitle}>Welcome to Retail Intelligence</Text>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <StatCard
          title="Total Revenue"
          value={stats.revenue}
          icon="cash-outline"
          color="#10b981"
          subtitle="+12.5% vs last month"
        />
        <StatCard
          title="Total Orders"
          value={stats.orders}
          icon="cart-outline"
          color="#6366f1"
          subtitle="+8.2% vs last month"
        />
        <StatCard
          title="Avg Order"
          value={stats.avgOrder}
          icon="trending-up-outline"
          color="#f59e0b"
          subtitle="+4.3% vs last month"
        />
        <StatCard
          title="Products"
          value={inventoryStats?.total || 0}
          icon="cube-outline"
          color="#3b82f6"
          subtitle={`${inventoryStats?.lowStock || 0} low stock`}
        />
      </View>

      {/* Revenue Chart */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Revenue Overview</Text>
        <LineChart
          data={chartData}
          width={Dimensions.get('window').width - 40}
          height={220}
          chartConfig={{
            backgroundColor: '#1e1e3f',
            backgroundGradientFrom: '#1e1e3f',
            backgroundGradientTo: '#1e1e3f',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(160, 160, 176, ${opacity})`,
            style: {
              borderRadius: 16,
            },
            propsForDots: {
              r: '6',
              strokeWidth: '2',
              stroke: '#6366f1',
            },
          }}
          bezier
          style={{
            marginVertical: 8,
            borderRadius: 16,
          }}
        />
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <Link href="/chatbot" asChild>
            <TouchableOpacity style={styles.actionCard}>
              <View style={[styles.actionIcon, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
                <Ionicons name="chatbubbles-outline" size={28} color="#6366f1" />
              </View>
              <Text style={styles.actionTitle}>AI Chatbot</Text>
              <Text style={styles.actionSubtitle}>Ask anything</Text>
            </TouchableOpacity>
          </Link>

          <Link href="/inventory" asChild>
            <TouchableOpacity style={styles.actionCard}>
              <View style={[styles.actionIcon, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                <Ionicons name="cube-outline" size={28} color="#10b981" />
              </View>
              <Text style={styles.actionTitle}>Inventory</Text>
              <Text style={styles.actionSubtitle}>Manage stock</Text>
            </TouchableOpacity>
          </Link>

          <Link href="/sales" asChild>
            <TouchableOpacity style={styles.actionCard}>
              <View style={[styles.actionIcon, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                <Ionicons name="bar-chart-outline" size={28} color="#f59e0b" />
              </View>
              <Text style={styles.actionTitle}>Sales</Text>
              <Text style={styles.actionSubtitle}>View analytics</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>

      {/* Alerts */}
      {inventoryStats && (inventoryStats.lowStock > 0 || inventoryStats.outOfStock > 0) && (
        <View style={styles.alertsContainer}>
          <Text style={styles.sectionTitle}>Stock Alerts</Text>
          {inventoryStats.outOfStock > 0 && (
            <View style={[styles.alertCard, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
              <Ionicons name="alert-circle-outline" size={20} color="#ef4444" />
              <Text style={[styles.alertText, { color: '#ef4444' }]}>
                {inventoryStats.outOfStock} products out of stock
              </Text>
            </View>
          )}
          {inventoryStats.lowStock > 0 && (
            <View style={[styles.alertCard, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
              <Ionicons name="warning-outline" size={20} color="#f59e0b" />
              <Text style={[styles.alertText, { color: '#f59e0b' }]}>
                {inventoryStats.lowStock} products low on stock
              </Text>
            </View>
          )}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b6b80',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#1e1e3f',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statCardTitle: {
    fontSize: 12,
    color: '#6b6b80',
    fontWeight: '500',
  },
  statCardValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statCardSubtitle: {
    fontSize: 11,
    color: '#10b981',
    marginTop: 4,
  },
  chartContainer: {
    backgroundColor: '#1e1e3f',
    margin: 16,
    marginTop: 0,
    borderRadius: 16,
    padding: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  quickActions: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#1e1e3f',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#6b6b80',
    marginTop: 2,
  },
  alertsContainer: {
    padding: 16,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    gap: 10,
  },
  alertText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
});
