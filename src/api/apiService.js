import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_URL || "https://solicitudes-back.onrender.com";

axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("jwtToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const apiService = {
  // ==================== DASHBOARD ====================
  getDashboardStats: async () => {
    const response = await axios.get(`${API_BASE_URL}/api/dashboard/stats`);
    return response.data;
  },

  getRecentRequests: async () => {
    const response = await axios.get(`${API_BASE_URL}/api/dashboard/recent`);
    return response.data;
  },

  // ==================== SOLICITUDES ====================
  getRequestsList: async (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    const response = await axios.get(`${API_BASE_URL}/api/requests?${params}`);
    return response.data;
  },

  getRequestDetail: async (id) => {
    const response = await axios.get(`${API_BASE_URL}/api/requests/${id}`);
    return response.data;
  },

  createRequest: async (data) => {
    const response = await axios.post(`${API_BASE_URL}/api/requests`, data);
    return response.data;
  },

approveRequest: async (id, comments, approverId) => {
  const payload = { comments, approverId }
  const response = await axios.post(`${API_BASE_URL}/api/requests/${id}/approve`, payload)
  return response.data
},

rejectRequest: async (id, comments, approverId) => {
  const payload = { comments, approverId }
  const response = await axios.post(`${API_BASE_URL}/api/requests/${id}/reject`, payload)
  return response.data
},

  // ==================== CONFIGURACIÓN ====================
  // Categorías
  getCategories: async () => {
    const response = await axios.get(`${API_BASE_URL}/api/categories`);
    return response.data;
  },

  createCategory: async (data) => {
    const response = await axios.post(`${API_BASE_URL}/api/categories`, data);
    return response.data;
  },

  updateCategory: async (id, data) => {
    const response = await axios.put(
      `${API_BASE_URL}/api/categories/${id}`,
      data
    );
    return response.data;
  },

  deleteCategory: async (id) => {
    const response = await axios.delete(`${API_BASE_URL}/api/categories/${id}`);
    return response.data;
  },

  // Departamentos
  getDepartments: async () => {
    const response = await axios.get(`${API_BASE_URL}/api/departments`);
    return response.data;
  },

  createDepartment: async (data) => {
    const response = await axios.post(`${API_BASE_URL}/api/departments`, data);
    return response.data;
  },

  updateDepartment: async (id, data) => {
    const response = await axios.put(
      `${API_BASE_URL}/api/departments/${id}`,
      data
    );
    return response.data;
  },

  deleteDepartment: async (id) => {
    const response = await axios.delete(
      `${API_BASE_URL}/api/departments/${id}`
    );
    return response.data;
  },

  // Centros de Costos
  getCenters: async () => {
    const response = await axios.get(`${API_BASE_URL}/api/cost-centers`);
    return response.data;
  },

  createCenter: async (data) => {
    const response = await axios.post(`${API_BASE_URL}/api/cost-centers`, data);
    return response.data;
  },

  updateCenter: async (id, data) => {
    const response = await axios.put(
      `${API_BASE_URL}/api/cost-centers/${id}`,
      data
    );
    return response.data;
  },

  deleteCenter: async (id) => {
    const response = await axios.delete(
      `${API_BASE_URL}/api/cost-centers/${id}`
    );
    return response.data;
  },

  // Usuarios
  getUsers: async () => {
    const response = await axios.get(`${API_BASE_URL}/api/users`);
    return response.data;
  },

  createUser: async (data) => {
    const response = await axios.post(`${API_BASE_URL}/api/users`, data);
    return response.data;
  },

  updateUser: async (id, data) => {
    const response = await axios.put(`${API_BASE_URL}/api/users/${id}`, data);
    return response.data;
  },

  deleteUser: async (id) => {
    const response = await axios.delete(`${API_BASE_URL}/api/users/${id}`);
    return response.data;
  },

  // ==================== REPORTES ====================
  getReports: async (filters = {}) => {
    const params = new URLSearchParams(filters).toString()
    const response = await axios.get(`${API_BASE_URL}/api/reports?${params}`)
    return response.data
  },

  updateLineProvider: async (lineId, provider) => {
    const response = await axios.post(`${API_BASE_URL}/api/request-lines/${lineId}/provider`, { provider })
    return response.data
  },

  // ==================== ORDEN DE COMPRA ====================
  updatePurchaseOrder: async (requestId, data) => {
    const response = await axios.put(`${API_BASE_URL}/api/requests/${requestId}/purchase-order`, data)
    return response.data
  },

  updateRequestLine: async (lineId, data) => {
    const response = await axios.put(`${API_BASE_URL}/api/request-lines/${lineId}`, data)
    return response.data
  },

  generatePurchaseOrders: async (requestId) => {
    const response = await axios.post(`${API_BASE_URL}/api/requests/${requestId}/generate-purchase-orders`)
    return response.data
  },

  generatePaymentOrder: async (requestId) => {
    const response = await axios.post(`${API_BASE_URL}/api/requests/${requestId}/generate-payment-order`)
    return response.data
  },

  // Proveedores
  getProviders: async () => {
    const response = await axios.get(`${API_BASE_URL}/api/providers`)
    return response.data
  },

  createProvider: async (data) => {
    const response = await axios.post(`${API_BASE_URL}/api/providers`, data)
    return response.data
  },

  updateProvider: async (id, data) => {
    const response = await axios.put(`${API_BASE_URL}/api/providers/${id}`, data)
    return response.data
  },

  deleteProvider: async (id) => {
    const response = await axios.delete(`${API_BASE_URL}/api/providers/${id}`)
    return response.data
  },

  // ==================== ARTÍCULOS ====================
  getArticles: async () => {
    const response = await axios.get(`${API_BASE_URL}/api/articles`)
    return response.data
  },

  createArticle: async (data) => {
    const response = await axios.post(`${API_BASE_URL}/api/articles`, data)
    return response.data
  },

  updateArticle: async (id, data) => {
    const response = await axios.put(`${API_BASE_URL}/api/articles/${id}`, data)
    return response.data
  },

  deleteArticle: async (id) => {
    const response = await axios.delete(`${API_BASE_URL}/api/articles/${id}`)
    return response.data
  },

  // ==================== ALMACENES ====================
  getWarehouses: async () => {
    const response = await axios.get(`${API_BASE_URL}/api/warehouses`)
    return response.data
  },

  createWarehouse: async (data) => {
    const response = await axios.post(`${API_BASE_URL}/api/warehouses`, data)
    return response.data
  },

  updateWarehouse: async (id, data) => {
    const response = await axios.put(`${API_BASE_URL}/api/warehouses/${id}`, data)
    return response.data
  },

  deleteWarehouse: async (id) => {
    const response = await axios.delete(`${API_BASE_URL}/api/warehouses/${id}`)
    return response.data
  },
};

export default apiService;
