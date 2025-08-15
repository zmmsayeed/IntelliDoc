import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class ApiService {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
    });

    this.setupInterceptors();
    this.loadTokenFromStorage();
  }

  setupInterceptors() {
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          this.clearToken();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  loadTokenFromStorage() {
    const token = localStorage.getItem('access_token');
    if (token) {
      this.client.defaults.headers.Authorization = `Bearer ${token}`;
    }
  }

  setToken(token) {
    localStorage.setItem('access_token', token);
    this.client.defaults.headers.Authorization = `Bearer ${token}`;
  }

  clearToken() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    delete this.client.defaults.headers.Authorization;
  }

  // Authentication
  async register(email, password, name) {
    const response = await this.client.post('/auth/register', {
      email,
      password,
      name,
    });
    return response.data;
  }

  async login(email, password) {
    const response = await this.client.post('/auth/login', {
      email,
      password,
    });
    return response.data;
  }

  async getProfile() {
    const response = await this.client.get('/auth/profile');
    return response.data;
  }

  async updateProfile(data) {
    const response = await this.client.put('/auth/profile', data);
    return response.data;
  }

  // Documents
  async uploadDocument(file, onProgress) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.client.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
    return response.data;
  }

  async getDocuments(skip = 0, limit = 20) {
    const response = await this.client.get(`/documents/?skip=${skip}&limit=${limit}`);
    return response.data;
  }

  async getDocument(id) {
    const response = await this.client.get(`/documents/${id}`);
    return response.data;
  }

  async deleteDocument(id) {
    const response = await this.client.delete(`/documents/${id}`);
    return response.data;
  }

  async searchDocuments(query, documentId, limit = 10) {
    const response = await this.client.post('/documents/search', {
      query,
      document_id: documentId,
      limit,
    });
    return response.data;
  }

  async addTag(documentId, tag) {
    const response = await this.client.post(`/documents/${documentId}/tags`, { tag });
    return response.data;
  }

  async removeTag(documentId, tag) {
    const response = await this.client.delete(`/documents/${documentId}/tags/${tag}`);
    return response.data;
  }

  // Chat
  async createChat(documentId, title = 'New Chat') {
    const response = await this.client.post('/chat/', {
      document_id: documentId,
      title,
    });
    return response.data;
  }

  async getChats(skip = 0, limit = 20) {
    const response = await this.client.get(`/chat/?skip=${skip}&limit=${limit}`);
    return response.data;
  }

  async getChat(id) {
    const response = await this.client.get(`/chat/${id}`);
    return response.data;
  }

  async sendMessage(chatId, message) {
    const response = await this.client.post(`/chat/${chatId}/messages`, { message });
    return response.data;
  }

  async updateChat(id, title) {
    const response = await this.client.put(`/chat/${id}`, { title });
    return response.data;
  }

  async deleteChat(id) {
    const response = await this.client.delete(`/chat/${id}`);
    return response.data;
  }

  async clearChat(id) {
    const response = await this.client.post(`/chat/${id}/clear`);
    return response.data;
  }

  async askQuestion(question, documentId) {
    const response = await this.client.post('/chat/ask', {
      question,
      document_id: documentId,
    });
    return response.data;
  }

  // Analytics
  async getDashboardData() {
    const response = await this.client.get('/analytics/dashboard');
    return response.data;
  }

  async getDocumentStats(days = 7) {
    const response = await this.client.get(`/analytics/documents/stats?days=${days}`);
    return response.data;
  }

  async getSearchTrends(days = 30) {
    const response = await this.client.get(`/analytics/search/trends?days=${days}`);
    return response.data;
  }

  async getPerformanceMetrics() {
    const response = await this.client.get('/analytics/performance');
    return response.data;
  }

  async exportData(type, format = 'json') {
    const response = await this.client.post('/analytics/export', { type, format });
    return response.data;
  }
}

export const apiService = new ApiService();
export default apiService;