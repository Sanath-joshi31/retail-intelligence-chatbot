import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Products API
export const productsAPI = {
  getAll: (params = {}) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  getByCategory: (category) => api.get(`/products/category/${category}`),
  getLowStock: () => api.get('/products/low-stock'),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
};

// Inventory API
export const inventoryAPI = {
  getAll: (params = {}) => api.get('/inventory', { params }),
  getStatus: () => api.get('/inventory/status'),
  getValue: () => api.get('/inventory/value'),
  getByProduct: (productId) => api.get(`/inventory/${productId}`),
  update: (id, data) => api.put(`/inventory/${id}`, data),
  bulkUpdate: (updates) => api.post('/inventory/bulk-update', updates),
};

// Sales API
export const salesAPI = {
  getAll: (params = {}) => api.get('/sales', { params }),
  getById: (id) => api.get(`/sales/${id}`),
  create: (data) => api.post('/sales', data),
  updateStatus: (id, status) => api.patch(`/sales/${id}/status`, { status }),
  getAnalytics: (params = {}) => api.get('/sales/analytics', { params }),
  getTrends: (params = {}) => api.get('/sales/trends', { params }),
  getForecast: (params = {}) => api.get('/sales/forecast', { params }),
};

// Chatbot API
export const chatbotAPI = {
  sendMessage: (data) => api.post('/chatbot/message', data),
  getHistory: (sessionId) => api.get('/chatbot/history', { params: { sessionId } }),
  clearHistory: (sessionId) => api.post('/chatbot/history/clear', { sessionId }),
  healthCheck: () => api.get('/chatbot/health'),
};

export default api;
