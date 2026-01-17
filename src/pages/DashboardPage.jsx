import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../services/authService';
import getDataService from '../services/dataService';
import { FinancialInsights } from '../utils/insights';
import Footer from '../components/Footer';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const dataService = getDataService();
  
  const [transactions, setTransactions] = useState([]);
  const [userSettings, setUserSettings] = useState(null);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('');
  const [type, setType] = useState('expense');
  const [description, setDescription] = useState('');
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  
  const categories = ['Продукты', 'Транспорт', 'Развлечения', 'Здоровье', 'Коммунальные услуги', 'Одежда', 'Другое'];
  
  useEffect(() => {
    checkOnboarding();
    loadData();
  }, []);

  const checkOnboarding = () => {
    if (!dataService.hasCompletedOnboarding()) {
      navigate('/onboarding');
    }
  };

  const loadData = () => {
    const data = dataService.getTransactions();
    setTransactions(data.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
    const settings = dataService.getUserSettings();
    setUserSettings(settings);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount || !date) return;

    const transaction = {
      id: Date.now().toString(),
      type,
      amount: parseFloat(amount),
      date,
      category: type === 'expense' ? category : '',
      description: type === 'income' ? description : '',
      timestamp: Date.now()
    };

    dataService.saveTransaction(transaction);
    loadData();
    setAmount('');
    setCategory('');
    setDescription('');
  };

  const deleteTransaction = (id) => {
    dataService.deleteTransaction(id);
    loadData();
  };

  const formatAmount = (val) => {
    return new Intl.NumberFormat('ru-RU').format(val) + ' сум';
  };

  const expenses = transactions.filter(t => t.type === 'expense');
  const incomes = transactions.filter(t => t.type === 'income');
  const totalExpense = expenses.reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalIncome = incomes.reduce((sum, t) => sum + (t.amount || 0), 0);
  const balance = totalIncome - totalExpense;

  // Calculate insights
  const insights = useMemo(() => {
    if (!userSettings) return null;
    const insightsCalc = new FinancialInsights(transactions, userSettings);
    return insightsCalc.getAllInsights(userSettings.budgets || {});
  }, [transactions, userSettings]);

  const isPro = userSettings?.subscription === 'pro';
  const dailyLimit = insights?.dailyLimit || { dailyRemaining: 0, daysRemaining: 0 };
  const forecast = insights?.forecast || { forecastBalance: 0 };
  const comparison = insights?.comparison || { current: 0, previous: 0, percentage: 0, trend: 'same' };
  const overspending = insights?.overspending || [];

  const handleUpgradeToPro = () => {
    alert('Переход на страницу оплаты Pro подписки ($8.99/мес)...\n\nВ будущем здесь будет интеграция с платежной системой (Stripe)');
    // В будущем: dataService.updateSubscription('pro');
  };

  const progressPercentage = dailyLimit.dailyLimit > 0 
    ? Math.min(100, (dailyLimit.dailyRemaining / dailyLimit.dailyLimit) * 100)
    : 0;

  return (
    <div className="container">
      <nav className="nav-bar">
        <div className="nav-links">
          <Link to="/" className="nav-link active">Главная</Link>
          <Link to="/analytics" className="nav-link">Аналитика</Link>
        </div>
        <div className="user-info">
          <span className="user-email">{user?.email || 'Загрузка...'}</span>
          {isPro && <span className="subscription-badge pro">Pro</span>}
          {!isPro && <button onClick={handleUpgradeToPro} className="btn-upgrade">Перейти на Pro</button>}
          <button onClick={logout} className="btn-logout">Выход</button>
        </div>
      </nav>

      {/* Hero Insight - Daily Spending Limit */}
      {userSettings && userSettings.monthlyIncome > 0 && (
        <div className="hero-insight wow">
          <div className="hero-insight-content">
            <div className="hero-icon">💰</div>
            <div className="hero-label">Можно потратить сегодня</div>
            <div className="hero-value">{formatAmount(dailyLimit.dailyRemaining)}</div>
            <div className="hero-subtitle">Осталось дней в месяце: <span>{dailyLimit.daysRemaining}</span></div>
          </div>
          <div className={`hero-progress ${progressPercentage > 50 ? 'good' : progressPercentage > 25 ? 'warning' : 'danger'}`} 
               style={{ width: `${progressPercentage}%` }}></div>
        </div>
      )}

      {/* Stats Section */}
      <div className="stats-section">
        <div className="stat-card wow">
          <div className="stat-icon income-icon">↑</div>
          <span className="stat-label">Доходы</span>
          <span className="stat-value income">{formatAmount(totalIncome)}</span>
        </div>
        <div className="stat-card wow">
          <div className="stat-icon expense-icon">↓</div>
          <span className="stat-label">Расходы</span>
          <span className="stat-value expense">{formatAmount(totalExpense)}</span>
        </div>
        <div className="stat-card wow balance-card">
          <div className="stat-icon balance-icon">⚖</div>
          <span className="stat-label">Баланс</span>
          <span className={`stat-value balance ${balance >= 0 ? 'positive' : 'negative'}`}>
            {formatAmount(balance)}
          </span>
        </div>
      </div>

      {/* Insights Grid */}
      {(forecast.forecastBalance !== 0 || comparison.previous > 0) && (
        <div className="insights-grid">
          {forecast.forecastBalance !== 0 && (
            <div className="forecast-card wow">
              <div className="forecast-header">
                <h3 className="forecast-title">Прогноз до конца месяца</h3>
              </div>
              <div className="forecast-content">
                <div className="forecast-value" style={{ color: forecast.forecastBalance >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {formatAmount(forecast.forecastBalance)}
                </div>
                <div className="forecast-details">
                  <div>Прогноз расходов: {formatAmount(forecast.projectedSpending || 0)}</div>
                  <div>Текущие расходы: {formatAmount(forecast.currentSpending || 0)}</div>
                </div>
              </div>
            </div>
          )}

          {comparison.previous > 0 && (
            <div className="forecast-card wow" id="comparisonCard">
              <div className="forecast-header">
                <h3 className="forecast-title">Сравнение с прошлым месяцем</h3>
              </div>
              <div className="forecast-content">
                <div className="forecast-value" style={{ color: comparison.trend === 'up' ? 'var(--danger)' : 'var(--success)' }}>
                  {comparison.trend === 'up' ? '📈' : comparison.trend === 'down' ? '📉' : '➡️'} {Math.abs(comparison.percentage)}%
                </div>
                <div className="forecast-details">
                  <div>Текущий: {formatAmount(comparison.current)}</div>
                  <div>Прошлый: {formatAmount(comparison.previous)}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Overspending Alerts */}
      {overspending.length > 0 && (
        <div className="alerts-container">
          {overspending.map((item, idx) => (
            <div key={idx} className={`alert ${item.status === 'over' ? 'alert-danger' : 'alert-warning'}`}>
              <strong>{item.category}</strong>: превышен бюджет на {formatAmount(Math.abs(item.remaining))}
              ({item.percentage}% использовано)
            </div>
          ))}
        </div>
      )}

      {/* Pro CTA */}
      {!isPro && transactions.length >= 3 && (
        <div className="pro-cta wow" id="proCTA">
          <div className="pro-cta-content">
            <h3>🚀 Перейдите на Pro за $8.99/мес</h3>
            <p>Получите доступ к расширенной аналитике, неограниченным бюджетам и экспорту данных</p>
            <button onClick={handleUpgradeToPro} className="btn btn-primary">Перейти на Pro</button>
          </div>
        </div>
      )}

      {/* Transaction Form */}
      <div className="form-section">
        <div className="transaction-tabs">
          <button 
            className={`transaction-tab ${type === 'expense' ? 'active' : ''}`}
            onClick={() => setType('expense')}
          >
            Расход
          </button>
          <button 
            className={`transaction-tab ${type === 'income' ? 'active' : ''}`}
            onClick={() => setType('income')}
          >
            Доход
          </button>
        </div>

        <form onSubmit={handleSubmit} className="expense-form">
          <div className="form-group">
            <label className="form-label">Сумма (сум)</label>
            <input 
              type="number" 
              className="form-input" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required 
              step="1000" 
              min="0"
            />
          </div>
          
          {type === 'expense' ? (
            <div className="form-group">
              <label className="form-label">Категория</label>
              <select 
                className="form-input" 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              >
                <option value="">Выберите категорию</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">Описание</label>
              <input 
                type="text" 
                className="form-input" 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Источник дохода"
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Дата</label>
            <input 
              type="date" 
              className="form-input" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full">
            Добавить {type === 'expense' ? 'расход' : 'доход'}
          </button>
        </form>
      </div>

      {/* Transactions List */}
      <div className="form-section">
        <h2 className="section-title">Транзакции</h2>
        <div className="expenses-list">
          {transactions.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px' }}>
              Нет транзакций. Добавьте первую запись выше.
            </p>
          ) : (
            transactions.map(transaction => (
              <div key={transaction.id} className={`expense-item ${transaction.type === 'income' ? 'income-item' : ''}`}>
                <div className="expense-category">{transaction.type === 'income' ? '+' : '−'}</div>
                <div className="expense-details">
                  <div className="expense-category-name">
                    {transaction.type === 'income' ? transaction.description || 'Доход' : transaction.category}
                  </div>
                  <div className="expense-date">{new Date(transaction.date).toLocaleDateString('ru-RU')}</div>
                </div>
                <div className={`expense-amount ${transaction.type === 'income' ? 'income-amount' : ''}`}>
                  {transaction.type === 'income' ? '+' : '−'}{formatAmount(transaction.amount)}
                </div>
                <button 
                  onClick={() => deleteTransaction(transaction.id)}
                  className="btn-delete"
                  style={{ marginLeft: 'auto' }}
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
