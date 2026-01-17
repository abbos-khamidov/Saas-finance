import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../services/authService';
import getDataService from '../services/dataService';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const dataService = getDataService();
  
  const [transactions, setTransactions] = useState([]);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('');
  const [type, setType] = useState('expense');
  const [description, setDescription] = useState('');
  
  const categories = ['Продукты', 'Транспорт', 'Развлечения', 'Здоровье', 'Коммунальные услуги', 'Одежда', 'Другое'];
  
  useEffect(() => {
    checkOnboarding();
    loadTransactions();
  }, []);

  const checkOnboarding = () => {
    if (!dataService.hasCompletedOnboarding()) {
      navigate('/onboarding');
    }
  };

  const loadTransactions = () => {
    const data = dataService.getTransactions();
    setTransactions(data.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
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
    loadTransactions();
    setAmount('');
    setCategory('');
    setDescription('');
  };

  const deleteTransaction = (id) => {
    dataService.deleteTransaction(id);
    loadTransactions();
  };

  const formatAmount = (val) => {
    return new Intl.NumberFormat('ru-RU').format(val) + ' сум';
  };

  const expenses = transactions.filter(t => t.type === 'expense');
  const incomes = transactions.filter(t => t.type === 'income');
  const totalExpense = expenses.reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalIncome = incomes.reduce((sum, t) => sum + (t.amount || 0), 0);
  const balance = totalIncome - totalExpense;

  return (
    <div className="container">
      <nav className="nav-bar">
        <div className="nav-links">
          <Link to="/" className="nav-link active">Главная</Link>
          <Link to="/analytics" className="nav-link">Аналитика</Link>
        </div>
        <div className="user-info">
          <span className="user-email">{user?.email || 'Загрузка...'}</span>
          <button onClick={logout} className="btn-logout">Выход</button>
        </div>
      </nav>

      <header className="header">
        <h1 className="header-title">Учёт Финансов</h1>
        <p className="header-subtitle">Контролируйте доходы и расходы</p>
      </header>

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
    </div>
  );
}