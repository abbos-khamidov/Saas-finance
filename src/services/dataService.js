// Data Service - хранит данные в localStorage (JSON)
// В будущем можно заменить на PostgreSQL через API

class DataService {
  constructor() {
    this.userId = this.getUserId();
  }

  getUserId() {
    const user = localStorage.getItem('finance_user');
    return user ? JSON.parse(user).id : null;
  }

  getKey(key) {
    return `finance_${this.userId}_${key}`;
  }

  // Transactions (expenses & incomes)
  getTransactions() {
    const key = this.getKey('transactions');
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  saveTransaction(transaction) {
    const transactions = this.getTransactions();
    const newTransaction = {
      ...transaction,
      id: transaction.id || Date.now().toString(),
      timestamp: transaction.timestamp || Date.now()
    };
    transactions.push(newTransaction);
    localStorage.setItem(this.getKey('transactions'), JSON.stringify(transactions));
    return newTransaction;
  }

  deleteTransaction(id) {
    const transactions = this.getTransactions();
    const filtered = transactions.filter(t => t.id !== id);
    localStorage.setItem(this.getKey('transactions'), JSON.stringify(filtered));
  }

  // User Settings
  getUserSettings() {
    const key = this.getKey('settings');
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : {
      monthlyIncome: 0,
      fixedExpenses: 0,
      financialGoal: '',
      budgets: {},
      subscription: 'free',
      onboardingCompleted: false
    };
  }

  saveUserSettings(settings) {
    const current = this.getUserSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(this.getKey('settings'), JSON.stringify(updated));
    return updated;
  }

  completeOnboarding(data) {
    const settings = {
      monthlyIncome: parseFloat(data.monthlyIncome) || 0,
      fixedExpenses: parseFloat(data.fixedExpenses) || 0,
      financialGoal: data.financialGoal || '',
      budgets: {},
      subscription: 'free',
      onboardingCompleted: true
    };
    return this.saveUserSettings(settings);
  }

  hasCompletedOnboarding() {
    const settings = this.getUserSettings();
    return settings.onboardingCompleted === true;
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