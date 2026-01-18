// API Service - работа с Django бэкендом
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.detail || 'Request failed');
      }
      
      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Authentication
  async register(email, password) {
    return this.request('/users/register/', {
      method: 'POST',
      body: { email, password },
    });
  }

  async login(email, password) {
    return this.request('/users/login/', {
      method: 'POST',
      body: { email, password },
    });
  }

  // Transactions
  async getTransactions(userId) {
    return this.request(`/transactions/?user_id=${userId}`);
  }

  async createTransaction(userId, transaction) {
    return this.request('/transactions/', {
      method: 'POST',
      body: {
        user_id: userId,
        ...transaction,
      },
    });
  }

  async deleteTransaction(transactionId) {
    return this.request(`/transactions/${transactionId}/`, {
      method: 'DELETE',
    });
  }

  // Settings
  async getSettings(userId) {
    const results = await this.request(`/settings/?user_id=${userId}`);
    return results.length > 0 ? results[0] : null;
  }

  async updateSettings(settingsId, settings) {
    return this.request(`/settings/${settingsId}/`, {
      method: 'PUT',
      body: settings,
    });
  }

  async createSettings(userId, settings) {
    return this.request('/settings/', {
      method: 'POST',
      body: {
        user_id: userId,
        ...settings,
      },
    });
  }

  // Goals
  async getGoals(userId) {
    return this.request(`/goals/?user_id=${userId}`);
  }

  async createGoal(userId, goal) {
    return this.request('/goals/', {
      method: 'POST',
      body: {
        user_id: userId,
        ...goal,
      },
    });
  }

  async updateGoal(goalId, goal) {
    return this.request(`/goals/${goalId}/`, {
      method: 'PUT',
      body: goal,
    });
  }

  async deleteGoal(goalId) {
    return this.request(`/goals/${goalId}/`, {
      method: 'DELETE',
    });
  }

  // Analytics
  async getAnalytics(userId, period = 'all') {
    return this.request(`/analytics/${userId}/?period=${period}`);
  }

  // Insights
  async getInsights(userId) {
    return this.request(`/insights/${userId}/`);
  }
}

export default new ApiService();
