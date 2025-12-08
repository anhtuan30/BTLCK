import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
};

// Products API
export const productAPI = {
  getAll: (search = '', showHidden = false) => 
    api.get('/products', { params: { search, showHidden } }),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  toggleVisibility: (id) => api.patch(`/products/${id}/visibility`),
  delete: (id) => api.delete(`/products/${id}`),
};

// Customers API
export const customerAPI = {
  getAll: (search = '') => 
    api.get('/customers', { params: { search } }),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
};

// Orders API
export const orderAPI = {
  getAll: (keyword = '') => 
    api.get('/orders', { params: { keyword } }),
  getById: (id) => api.get(`/orders/${id}`),
  getByCustomer: (customerId) => api.get(`/orders/customer/${customerId}`),
  create: (data) => api.post('/orders', data),
  updateStatus: (id, status) => api.put(`/orders/${id}`, { status }),
  delete: (id) => api.delete(`/orders/${id}`),
  updatePayment: (id, status) => api.put(`/orders/${id}/payment`, { status }),
};

// Stock API
export const stockAPI = {
  createImport: (data) => api.post('/stock/imports', data),
  getImports: () => api.get('/stock/imports'),
};

// Reports API
export const reportAPI = {
  getCurrentStock: () => api.get('/reports/stock/current'),
  getCustomerHistory: (customerId) => api.get(`/reports/customer/${customerId}/history`),
  getRevenueByDate: (date) => api.get('/reports/revenue/date', { params: { date } }),
  getTopSelling: () => api.get('/reports/top-selling'),
  getRevenue: (params) => api.get('/reports/revenue', { params }),
  getStockByDate: (date) => api.get(`/reports/stock/date?date=${date}`),
};

export default api;

