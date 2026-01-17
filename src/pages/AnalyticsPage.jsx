import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../services/authService';
import getDataService from '../services/dataService';
import Footer from '../components/Footer';

export default function AnalyticsPage() {
  const { user, logout } = useAuth();
  const dataService = getDataService();
  const [transactions, setTransactions] = useState([]);
  const [period, setPeriod] = useState('all');

  useEffect(() => {
    loadTransactions();
  }, [period]);

  const loadTransactions = () => {
    const all = dataService.getTransactions();
    let filtered = all;
    
    if (period === 'month') {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      filtered = all.filter(t => new Date(t.date) >= startOfMonth);
    } else if (period === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      filtered = all.filter(t => new Date(t.date) >= weekAgo);
    }
    
    setTransactions(filtered.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
  };

  const formatAmount = (val) => {
    return new Intl.NumberFormat('ru-RU').format(val) + ' сум';
  };

  const expenses = transactions.filter(t => t.type === 'expense');
  const incomes = transactions.filter(t => t.type === 'income');
  const totalExpense = expenses.reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalIncome = incomes.reduce((sum, t) => sum + (t.amount || 0), 0);
  const balance = totalIncome - totalExpense;

  // Category breakdown
  const byCategory = {};
  expenses.forEach(e => {
    const cat = e.category || 'Другое';
    byCategory[cat] = (byCategory[cat] || 0) + (e.amount || 0);
  });

  return (
    <div className="container">
      <nav className="nav-bar">
        <div className="nav-links">
          <Link to="/" className="nav-link">Главная</Link>
          <Link to="/analytics" className="nav-link active">Аналитика</Link>
        </div>
        <div className="user-info">
          <span className="user-email">{user?.email || 'Загрузка...'}</span>
          <button onClick={logout} className="btn-logout">Выход</button>
        </div>
      </nav>

      <header className="analytics-header">
        <div className="analytics-header-content">
          <h1 className="analytics-title">Аналитика</h1>
          <p className="analytics-subtitle">Глубокий анализ ваших финансовых данных</p>
        </div>
      </header>

      <div className="form-section">
        <div className="period-filter">
          <button 
            className={`period-btn ${period === 'all' ? 'active' : ''}`}
            onClick={() => setPeriod('all')}
          >
            Все время
          </button>
          <button 
            className={`period-btn ${period === 'month' ? 'active' : ''}`}
            onClick={() => setPeriod('month')}
          >
            Месяц
          </button>
          <button 
            className={`period-btn ${period === 'week' ? 'active' : ''}`}
            onClick={() => setPeriod('week')}
          >
            Неделя
          </button>
        </div>
      </div>

      <div className="stats-section">
        <div className="stat-card">
          <div className="stat-icon income-icon">↑</div>
          <span className="stat-label">Доходы</span>
          <span className="stat-value income">{formatAmount(totalIncome)}</span>
        </div>
        <div className="stat-card">
          <div className="stat-icon expense-icon">↓</div>
          <span className="stat-label">Расходы</span>
          <span className="stat-value expense">{formatAmount(totalExpense)}</span>
        </div>
        <div className="stat-card">
          <div className="stat-icon balance-icon">⚖</div>
          <span className="stat-label">Баланс</span>
          <span className={`stat-value balance ${balance >= 0 ? 'positive' : 'negative'}`}>
            {formatAmount(balance)}
          </span>
        </div>
      </div>

      <div className="form-section">
        <h2 className="section-title">Расходы по категориям</h2>
        <div className="category-breakdown">
          {Object.keys(byCategory).length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
              Нет данных для отображения
            </p>
          ) : (
            Object.entries(byCategory)
              .sort((a, b) => b[1] - a[1])
              .map(([category, amount]) => {
                const percentage = totalExpense > 0 ? ((amount / totalExpense) * 100).toFixed(1) : 0;
                return (
                  <div key={category} className="category-item">
                    <div className="category-info">
                      <span className="category-name">{category}</span>
                      <span className="category-amount">{formatAmount(amount)}</span>
                    </div>
                    <div className="category-percentage">{percentage}%</div>
                  </div>
                );
              })
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}