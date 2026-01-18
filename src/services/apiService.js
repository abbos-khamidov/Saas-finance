// API Service - работа с Django бэкендом
// На продакшене (Railway) используем тот же домен для API
const getApiBaseUrl = () => {
  // Если указана переменная окружения, используем её
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Если мы на Railway (production), используем тот же домен
  if (window.location.hostname.includes('railway.app') || window.location.hostname.includes('up.railway.app')) {
    return `${window.location.origin}/api`;
  }
  
  // Для локальной разработки
  return 'http://localhost:8000/api';
};

const API_BASE_URL = getApiBaseUrl();

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
      console.log('API Request:', url, config.method || 'GET', config.body);
      const response = await fetch(url, config);
      
      // Проверяем, есть ли тело ответа перед парсингом JSON
      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error(`Server returned non-JSON: ${response.status} ${response.statusText}`);
      }
      
      if (!response.ok) {
        console.error('API Error Response:', response.status, data);
        throw new Error(data.error || data.detail || data.message || `Request failed: ${response.status} ${response.statusText}`);
      }
      
      return data;
    } catch (error) {
      console.error('API Error:', error.message, 'URL:', url);
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

  // Categories
  async getCategories(userId) {
    return this.request(`/categories/?user_id=${userId}`);
  }

  async createCategory(userId, category) {
    return this.request('/categories/', {
      method: 'POST',
      body: {
        user_id: userId,
        ...category,
      },
    });
  }

  async updateCategory(categoryId, category) {
    return this.request(`/categories/${categoryId}/`, {
      method: 'PUT',
      body: category,
    });
  }

  async deleteCategory(categoryId) {
    return this.request(`/categories/${categoryId}/`, {
      method: 'DELETE',
    });
  }

  // Goal calculations
  async getGoalCalculations(goalId) {
    return this.request(`/goals/${goalId}/calculations/`);
  }
}

export default new ApiService();
