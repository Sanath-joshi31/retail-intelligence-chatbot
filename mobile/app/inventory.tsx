import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../services/api';

export default function InventoryScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [inventory, setInventory] = useState([]);
  const [stats, setStats] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchInventory();
  }, []);

  async function fetchInventory() {
    try {
      const [invRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/inventory`),
        fetch(`${API_URL}/inventory/status`),
      ]);

      if (invRes.ok && statsRes.ok) {
        const invData = await invRes.json();
        const statsData = await statsRes.json();
        setInventory(invData.data || []);
        setStats(statsData.data);
      } else {
        setMockData();
      }
    } catch (error) {
      console.warn('Unable to reach API, using mock inventory data:', error);
      setMockData();
    } finally {
      setLoading(false);
    }
  }

  function setMockData() {
    setInventory([
      { _id: '1', quantity: 5, minStockLevel: 15, product: { name: 'iPhone 15 Pro', sku: 'ELEC-001', category: 'Electronics', price: 999.99 } },
      { _id: '2', quantity: 45, minStockLevel: 20, product: { name: 'Samsung Galaxy S24', sku: 'ELEC-002', category: 'Electronics', price: 1199.99 } },
      { _id: '3', quantity: 3, minStockLevel: 10, product: { name: "Levi's 501 Jeans", sku: 'CLTH-003', category: 'Clothing', price: 79.99 } },
      { _id: '4', quantity: 0, minStockLevel: 5, product: { name: 'Peloton Bike+', sku: 'SPORTS-001', category: 'Sports', price: 2495.00 } },
      { _id: '5', quantity: 120, minStockLevel: 30, product: { name: 'AirPods Pro 2', sku: 'ELEC-009', category: 'Electronics', price: 249.99 } },
      { _id: '6', quantity: 85, minStockLevel: 25, product: { name: 'KitchenAid Mixer', sku: 'HOME-001', category: 'Home & Garden', price: 379.99 } },
    ]);
    setStats({
      total: 30,
      outOfStock: 2,
      lowStock: 5,
      inStock: 23,
    });
  }

  async function onRefresh() {
    setRefreshing(true);
    await fetchInventory();
    setRefreshing(false);
  }

  function getStockStatus(item) {
    if (item.quantity === 0) return { label: 'Out of Stock', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' };
    if (item.quantity <= item.minStockLevel) return { label: 'Low Stock', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' };
    return { label: 'In Stock', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' };
  }

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.product?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const status = getStockStatus(item);
    const matchesFilter =
      filterStatus === 'all' ||
      (filterStatus === 'low' && status.color === '#f59e0b') ||
      (filterStatus === 'out' && status.color === '#ef4444') ||
      (filterStatus === 'in' && status.color === '#10b981');
    return matchesSearch && matchesFilter;
  });

  const StatCard = ({ title, value, icon, color }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Ionicons name={icon} size={24} color={color} style={styles.statIcon} />
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );

  const InventoryItem = ({ item }) => {
    const status = getStockStatus(item);
    return (
      <View style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <View>
            <Text style={styles.itemName}>{item.product?.name || 'Unknown'}</Text>
            <Text style={styles.itemSku}>SKU: {item.product?.sku || 'N/A'}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
        <View style={styles.itemDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Category</Text>
            <Text style={styles.detailValue}>{item.product?.category || 'N/A'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Price</Text>
            <Text style={styles.detailValue}>${item.product?.price?.toFixed(2) || '0.00'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Stock</Text>
            <Text style={[styles.detailValue, { color: status.color, fontWeight: '600' }]}>
              {item.quantity} / {item.minStockLevel}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Stats */}
      <View style={styles.statsContainer}>
        <StatCard title="Total" value={stats?.total || 0} icon="cube-outline" color="#6366f1" />
        <StatCard title="In Stock" value={stats?.inStock || 0} icon="checkmark-circle-outline" color="#10b981" />
        <StatCard title="Low Stock" value={stats?.lowStock || 0} icon="warning-outline" color="#f59e0b" />
        <StatCard title="Out of Stock" value={stats?.outOfStock || 0} icon="close-circle-outline" color="#ef4444" />
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#6b6b80" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            placeholderTextColor="#6b6b80"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>
        <View style={styles.filterChips}>
          {['all', 'in', 'low', 'out'].map((filter) => (
            <TouchableOpacity
              key={filter}
              onPress={() => setFilterStatus(filter)}
              style={[styles.filterChip, filterStatus === filter && styles.filterChipActive]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filterStatus === filter && styles.filterChipTextActive,
                ]}
              >
                {filter === 'all' ? 'All' : filter === 'in' ? 'In Stock' : filter === 'low' ? 'Low' : 'Out'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* List */}
      <FlatList
        data={filteredInventory}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => <InventoryItem item={item} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={48} color="#6b6b80" />
            <Text style={styles.emptyText}>No products found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 8,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#1e1e3f',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
    alignItems: 'center',
  },
  statIcon: {
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 11,
    color: '#6b6b80',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  filtersContainer: {
    padding: 12,
    gap: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e3f',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#fff',
  },
  filterChips: {
    flexDirection: 'row',
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#1e1e3f',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2d2d4a',
  },
  filterChipActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  filterChipText: {
    fontSize: 12,
    color: '#6b6b80',
  },
  filterChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  listContent: {
    padding: 12,
    paddingBottom: 20,
  },
  itemCard: {
    backgroundColor: '#1e1e3f',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  itemSku: {
    fontSize: 12,
    color: '#6b6b80',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#2d2d4a',
  },
  detailRow: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 11,
    color: '#6b6b80',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 13,
    color: '#fff',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b6b80',
    marginTop: 8,
  },
});
