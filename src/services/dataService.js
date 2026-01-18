// Data Service - работает с Django API с fallback на localStorage
import apiService from './apiService';

class DataService {
  constructor() {
    this.userId = this.getUserId();
    this.useAPI = true; // Использовать API по умолчанию
  }

  getUserId() {
    const user = localStorage.getItem('finance_user');
    return user ? JSON.parse(user).id : null;
  }

  getKey(key) {
    return `finance_${this.userId}_${key}`;
  }

  // Transactions
  async getTransactions() {
    if (this.useAPI && this.userId) {
      try {
        const result = await apiService.getTransactions(this.userId);
        return Array.isArray(result) ? result : [];
      } catch (error) {
        console.warn('API unavailable, using localStorage', error);
        this.useAPI = false;
      }
    }
    // Fallback to localStorage
    const key = this.getKey('transactions');
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  async saveTransaction(transaction) {
    if (this.useAPI && this.userId) {
      try {
        return await apiService.createTransaction(this.userId, {
          type: transaction.type,
          amount: transaction.amount.toString(),
          category: transaction.category || '',
          description: transaction.description || '',
          date: transaction.date,
        });
      } catch (error) {
        console.warn('API unavailable, using localStorage', error);
        this.useAPI = false;
      }
    }
    // Fallback to localStorage
    const transactions = await this.getTransactions();
    const newTransaction = {
      ...transaction,
      id: transaction.id || Date.now().toString(),
      timestamp: transaction.timestamp || Date.now()
    };
    transactions.push(newTransaction);
    localStorage.setItem(this.getKey('transactions'), JSON.stringify(transactions));
    return newTransaction;
  }

  async deleteTransaction(id) {
    if (this.useAPI) {
      try {
        await apiService.deleteTransaction(id);
        return;
      } catch (error) {
        console.warn('API unavailable, using localStorage', error);
        this.useAPI = false;
      }
    }
    // Fallback to localStorage
    const transactions = await this.getTransactions();
    const filtered = transactions.filter(t => t.id !== id);
    localStorage.setItem(this.getKey('transactions'), JSON.stringify(filtered));
  }

  // User Settings
  async getUserSettings() {
    if (this.useAPI && this.userId) {
      try {
        const settings = await apiService.getSettings(this.userId);
        if (settings) {
          // Конвертируем формат из API в формат приложения
          return {
            monthlyIncome: parseFloat(settings.monthly_income) || 0,
            fixedExpenses: parseFloat(settings.fixed_expenses) || 0,
            financialGoal: settings.financial_goal || '',
            budgets: settings.budgets || {},
            onboardingCompleted: settings.onboarding_completed || false,
            id: settings.id,
            userId: settings.user
          };
        }
      } catch (error) {
        console.warn('API unavailable, using localStorage', error);
        this.useAPI = false;
      }
    }
    // Fallback to localStorage
    const key = this.getKey('settings');
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : {
      monthlyIncome: 0,
      fixedExpenses: 0,
      financialGoal: '',
      budgets: {},
      onboardingCompleted: false
    };
  }

  async saveUserSettings(settings) {
    if (this.useAPI && this.userId) {
      try {
        const current = await this.getUserSettings();
        const apiSettings = {
          monthly_income: settings.monthlyIncome || current.monthlyIncome,
          fixed_expenses: settings.fixedExpenses || current.fixedExpenses,
          financial_goal: settings.financialGoal !== undefined ? settings.financialGoal : current.financialGoal,
          budgets: settings.budgets !== undefined ? settings.budgets : current.budgets,
          onboarding_completed: settings.onboardingCompleted !== undefined ? settings.onboardingCompleted : current.onboardingCompleted,
        };

        if (current.id) {
          await apiService.updateSettings(current.id, apiSettings);
        } else {
          await apiService.createSettings(this.userId, apiSettings);
        }
        return await this.getUserSettings();
      } catch (error) {
        console.warn('API unavailable, using localStorage', error);
        this.useAPI = false;
      }
    }
    // Fallback to localStorage
    const current = await this.getUserSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(this.getKey('settings'), JSON.stringify(updated));
    return updated;
  }

  async completeOnboarding(data) {
    const settings = {
      monthlyIncome: parseFloat(data.monthlyIncome) || 0,
      fixedExpenses: parseFloat(data.fixedExpenses) || 0,
      financialGoal: data.financialGoal || '',
      budgets: {},
      onboardingCompleted: true
    };
    return this.saveUserSettings(settings);
  }

  async hasCompletedOnboarding() {
    const settings = await this.getUserSettings();
    return settings.onboardingCompleted === true;
  }

  // Goals
  async getGoals() {
    if (this.useAPI && this.userId) {
      try {
        return await apiService.getGoals(this.userId);
      } catch (error) {
        console.warn('API unavailable, using localStorage', error);
        this.useAPI = false;
      }
    }
    const key = this.getKey('goals');
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  async saveGoal(goal) {
    if (this.useAPI && this.userId) {
      try {
        if (goal.id) {
          return await apiService.updateGoal(goal.id, {
            title: goal.title,
            description: goal.description || '',
            target_amount: goal.target_amount.toString(),
            current_amount: goal.current_amount.toString(),
            deadline: goal.deadline || null,
            status: goal.status || 'active',
          });
        } else {
          return await apiService.createGoal(this.userId, {
            title: goal.title,
            description: goal.description || '',
            target_amount: goal.target_amount.toString(),
            current_amount: goal.current_amount || '0',
            deadline: goal.deadline || null,
            status: 'active',
          });
        }
      } catch (error) {
        console.warn('API unavailable, using localStorage', error);
        this.useAPI = false;
      }
    }
    // Fallback to localStorage
    const goals = await this.getGoals();
    if (goal.id) {
      const index = goals.findIndex(g => g.id === goal.id);
      if (index >= 0) goals[index] = goal;
    } else {
      goal.id = Date.now().toString();
      goals.push(goal);
    }
    localStorage.setItem(this.getKey('goals'), JSON.stringify(goals));
    return goal;
  }

  async deleteGoal(id) {
    if (this.useAPI) {
      try {
        await apiService.deleteGoal(id);
        return;
      } catch (error) {
        console.warn('API unavailable, using localStorage', error);
        this.useAPI = false;
      }
    }
    const goals = await this.getGoals();
    const filtered = goals.filter(g => g.id !== id);
    localStorage.setItem(this.getKey('goals'), JSON.stringify(filtered));
  }

  // Categories
  async getCategories() {
    if (this.useAPI && this.userId) {
      try {
        return await apiService.getCategories(this.userId);
      } catch (error) {
        console.warn('API unavailable, using localStorage', error);
        this.useAPI = false;
      }
    }
    const key = this.getKey('categories');
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  async saveCategory(category) {
    if (this.useAPI && this.userId) {
      try {
        if (category.id) {
          return await apiService.updateCategory(category.id, {
            name: category.name,
          });
        } else {
          return await apiService.createCategory(this.userId, {
            name: category.name,
          });
        }
      } catch (error) {
        console.warn('API unavailable, using localStorage', error);
        this.useAPI = false;
      }
    }
    const categories = await this.getCategories();
    if (category.id) {
      const index = categories.findIndex(c => c.id === category.id);
      if (index >= 0) categories[index] = category;
    } else {
      category.id = Date.now().toString();
      categories.push(category);
    }
    localStorage.setItem(this.getKey('categories'), JSON.stringify(categories));
    return category;
  }

  async deleteCategory(id) {
    if (this.useAPI) {
      try {
        await apiService.deleteCategory(id);
        return;
      } catch (error) {
        console.warn('API unavailable, using localStorage', error);
        this.useAPI = false;
      }
    }
    const categories = await this.getCategories();
    const filtered = categories.filter(c => c.id !== id);
    localStorage.setItem(this.getKey('categories'), JSON.stringify(filtered));
  }

  // Goal calculations
  async getGoalCalculations(goalId) {
    if (this.useAPI) {
      try {
        return await apiService.getGoalCalculations(goalId);
      } catch (error) {
        console.warn('API unavailable for goal calculations', error);
        return null;
      }
    }
    return null;
  }
}

// Singleton instance
let instance = null;

export function getDataService() {
  if (!instance) {
    instance = new DataService();
  }
  return instance;
}

export default getDataService;
