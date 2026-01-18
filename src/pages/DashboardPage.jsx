import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../services/authService';
import getDataService from '../services/dataService';
import { FinancialInsights } from '../utils/insights';
import Footer from '../components/Footer';
import SavingsCalculator from '../components/SavingsCalculator';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const dataService = getDataService();
  
  const [transactions, setTransactions] = useState([]);
  const [userSettings, setUserSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('');
  const [type, setType] = useState('expense');
  const [description, setDescription] = useState('');
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showFormulaExplanation, setShowFormulaExplanation] = useState(false);
  const [categories, setCategories] = useState([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [activeTab, setActiveTab] = useState('transactions'); // 'transactions' или 'savings'
  const [expandedMonths, setExpandedMonths] = useState(new Set()); // Управление раскрытием месяцев
  
  // Дефолтные категории для обратной совместимости
  const defaultCategories = ['Продукты', 'Транспорт', 'Развлечения', 'Здоровье', 'Коммунальные услуги', 'Одежда', 'Другое'];
  
  useEffect(() => {
    checkOnboarding();
    loadData();
    loadCategories();
  }, []);

  const checkOnboarding = async () => {
    const completed = await dataService.hasCompletedOnboarding();
    if (!completed) {
      navigate('/onboarding');
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await dataService.getTransactions();
      setTransactions(data.sort((a, b) => {
        const aTime = a.created_at || a.timestamp || 0;
        const bTime = b.created_at || b.timestamp || 0;
        return new Date(bTime) - new Date(aTime);
      }));
      const settings = await dataService.getUserSettings();
      setUserSettings(settings);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const userCategories = await dataService.getCategories();
      // Объединяем пользовательские категории с дефолтными
      const allCategories = [...defaultCategories];
      userCategories.forEach(cat => {
        if (!allCategories.includes(cat.name)) {
          allCategories.push(cat.name);
        }
      });
      setCategories(allCategories);
    } catch (error) {
      console.error('Error loading categories:', error);
      setCategories(defaultCategories);
    }
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!categoryName.trim()) return;

    try {
      await dataService.saveCategory({
        id: editingCategory?.id,
        name: categoryName.trim(),
      });
      await loadCategories();
      setShowCategoryModal(false);
      setCategoryName('');
      setEditingCategory(null);
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Ошибка при сохранении категории');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!confirm('Удалить эту категорию?')) return;
    try {
      await dataService.deleteCategory(id);
      await loadCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Ошибка при удалении категории');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || !date) return;

    const transaction = {
      type,
      amount: parseFloat(amount),
      date,
      category: type === 'expense' ? category : '',
      description: type === 'income' ? description : '',
    };

    try {
      await dataService.saveTransaction(transaction);
      await loadData();
      setAmount('');
      setCategory('');
      setDescription('');
    } catch (error) {
      console.error('Error saving transaction:', error);
      alert('Ошибка при сохранении транзакции');
    }
  };

  const deleteTransaction = async (id) => {
    try {
      await dataService.deleteTransaction(id);
      await loadData();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Ошибка при удалении транзакции');
    }
  };

  const formatAmount = (val) => {
    return new Intl.NumberFormat('ru-RU').format(val) + ' сум';
  };

  // Группировка транзакций по месяцам и дням
  const groupedTransactions = useMemo(() => {
    const grouped = {};
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    transactions.forEach(transaction => {
      const date = new Date(transaction.date || transaction.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const dayKey = `${monthKey}-${String(date.getDate()).padStart(2, '0')}`;
      
      if (!grouped[monthKey]) {
        grouped[monthKey] = {
          monthKey,
          monthName: date.toLocaleDateString('ru-RU', { year: 'numeric', month: 'long' }),
          isCurrent: monthKey === currentMonthKey,
          days: {},
          income: 0,
          expense: 0,
        };
      }
      
      if (!grouped[monthKey].days[dayKey]) {
        grouped[monthKey].days[dayKey] = {
          dayKey,
          dayName: date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' }),
          date: date,
          transactions: [],
          income: 0,
          expense: 0,
        };
      }
      
      grouped[monthKey].days[dayKey].transactions.push(transaction);
      
      if (transaction.type === 'income') {
        grouped[monthKey].days[dayKey].income += transaction.amount || 0;
        grouped[monthKey].income += transaction.amount || 0;
      } else {
        grouped[monthKey].days[dayKey].expense += transaction.amount || 0;
        grouped[monthKey].expense += transaction.amount || 0;
      }
    });

    // Сортируем дни внутри месяца по дате (новые сверху)
    Object.keys(grouped).forEach(monthKey => {
      const days = Object.values(grouped[monthKey].days).sort((a, b) => b.date - a.date);
      grouped[monthKey].daysSorted = days;
    });

    // Сортируем месяцы (новые сверху)
    return Object.values(grouped).sort((a, b) => {
      if (a.monthKey > b.monthKey) return -1;
      if (a.monthKey < b.monthKey) return 1;
      return 0;
    });
  }, [transactions]);

  // Инициализация: раскрываем только текущий месяц
  useEffect(() => {
    if (groupedTransactions.length > 0 && expandedMonths.size === 0) {
      const currentMonth = groupedTransactions.find(m => m.isCurrent);
      if (currentMonth) {
        setExpandedMonths(new Set([currentMonth.monthKey]));
      }
    }
  }, [groupedTransactions, expandedMonths]);

  const toggleMonth = (monthKey) => {
    setExpandedMonths(prev => {
      const newSet = new Set(prev);
      if (newSet.has(monthKey)) {
        newSet.delete(monthKey);
      } else {
        newSet.add(monthKey);
      }
      return newSet;
    });
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

  // Все функции доступны без ограничений Pro
  const dailyLimit = insights?.dailyLimit || { dailyRemaining: 0, daysRemaining: 0, formula: null };
  const forecast = insights?.forecast || { forecastBalance: 0 };
  const comparison = insights?.comparison || { current: 0, previous: 0, percentage: 0, trend: 'same' };
  const overspending = insights?.overspending || [];
  const streak = insights?.streak || { days: 0, isActive: false, message: '' };
  const automaticInsights = insights?.automaticInsights || [];

  const progressPercentage = dailyLimit.dailyLimit > 0 
    ? Math.min(100, (dailyLimit.dailyRemaining / dailyLimit.dailyLimit) * 100)
    : 0;

  return (
    <div className="container">
      <nav className="nav-bar">
        <div className="nav-links">
          <Link to="/" className="nav-link active">Главная</Link>
          <Link to="/analytics" className="nav-link">Аналитика</Link>
          <Link to="/goals" className="nav-link">Цели</Link>
        </div>
        <div className="user-info">
          <span className="user-email">{user?.email || 'Загрузка...'}</span>
          <button onClick={logout} className="btn-logout">Выход</button>
        </div>
      </nav>

      {/* Hero Insight - Daily Spending Limit - ГЛАВНЫЙ БЛОК ПРИНЯТИЯ РЕШЕНИЙ */}
      {!loading && userSettings && userSettings.monthlyIncome > 0 && (
        <div className="hero-insight wow">
          <div className="hero-insight-content">
            <div className="hero-icon">💰</div>
            <div className="hero-label">Можно потратить сегодня</div>
            <div className="hero-value">{formatAmount(dailyLimit.dailyRemaining)}</div>
            <div className="hero-subtitle">
              Осталось дней в месяце: <span>{dailyLimit.daysRemaining}</span>
              {dailyLimit.formula && (
                <button 
                  className="hero-formula-btn"
                  onClick={() => setShowFormulaExplanation(!showFormulaExplanation)}
                  title="Как это рассчитывается?"
                >
                  ℹ️
                </button>
              )}
            </div>
            {showFormulaExplanation && dailyLimit.formula && (
              <div className="hero-formula-explanation">
                <p><strong>Формула расчета:</strong></p>
                <p>Доход ({formatAmount(dailyLimit.formula.monthlyIncome)}) − Обязательные расходы ({formatAmount(dailyLimit.formula.fixedExpenses)}) = {formatAmount(dailyLimit.formula.availableForMonth)}</p>
                <p>{formatAmount(dailyLimit.formula.availableForMonth)} ÷ {dailyLimit.formula.daysInMonth} дней = {formatAmount(dailyLimit.formula.dailyLimit)}/день</p>
                <p>Осталось {formatAmount(dailyLimit.formula.remainingForMonth)} ÷ {dailyLimit.daysRemaining} дней = <strong>{formatAmount(dailyLimit.dailyRemaining)}/день</strong></p>
                {dailyLimit.dailyRemaining < dailyLimit.dailyLimit * 0.3 && (
                  <p className="formula-warning">⚠️ Осталось менее 30% от дневного лимита. Будьте осторожны с тратами!</p>
                )}
              </div>
            )}
          </div>
          <div className={`hero-progress ${progressPercentage > 50 ? 'good' : progressPercentage > 25 ? 'warning' : 'danger'}`} 
               style={{ width: `${progressPercentage}%` }}></div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Загрузка данных...</p>
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

      {/* Financial Discipline - Streaks */}
      {!loading && streak.isActive && (
        <div className="streak-card wow">
          <div className="streak-content">
            <div className="streak-icon">🔥</div>
            <div className="streak-info">
              <div className="streak-label">Дней без перерасхода</div>
              <div className="streak-value">{streak.days} дней</div>
              <div className="streak-message">{streak.message}</div>
            </div>
          </div>
        </div>
      )}

      {/* Automatic Financial Insights - ВЫВОДЫ, НЕ ГРАФИКИ */}
      {!loading && automaticInsights.length > 0 && (
        <div className="insights-section">
          <h2 className="section-title">Важные выводы</h2>
          <div className="insights-list">
            {automaticInsights.map((insight, idx) => (
              <div key={idx} className={`insight-card insight-${insight.type} wow`}>
                <div className="insight-header">
                  <span className="insight-title">{insight.title}</span>
                </div>
                <div className="insight-message">{insight.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overspending Alerts */}
      {!loading && overspending.length > 0 && (
        <div className="alerts-container">
          {overspending.map((item, idx) => (
            <div key={idx} className={`alert ${item.status === 'over' ? 'alert-danger' : 'alert-warning'}`}>
              <strong>{item.category}</strong>: превышен бюджет на {formatAmount(Math.abs(item.remaining))}
              ({item.percentage}% использовано)
            </div>
          ))}
        </div>
      )}


      {/* Main Tabs: Transactions / Savings */}
      <div className="form-section">
        <div className="transaction-tabs" style={{ marginBottom: '20px' }}>
          <button 
            className={`transaction-tab ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveTab('transactions')}
          >
            Транзакции
          </button>
          <button 
            className={`transaction-tab ${activeTab === 'savings' ? 'active' : ''}`}
            onClick={() => setActiveTab('savings')}
          >
            Откладывать
          </button>
        </div>
      </div>

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <>
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
                <label className="form-label">
                  Категория
                  <button 
                    type="button"
                    onClick={() => setShowCategoryModal(true)}
                    style={{ 
                      marginLeft: '10px', 
                      padding: '4px 8px', 
                      fontSize: '0.75rem',
                      background: 'var(--primary)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    ✏️ Управление
                  </button>
                </label>
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

          {/* Transactions List - Grouped by Month/Day */}
          <div className="form-section" style={{ marginTop: '20px' }}>
            <h2 className="section-title">Транзакции</h2>
            <div className="expenses-list">
              {!loading && transactions.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📊</div>
                  <h3 className="empty-title">Нет транзакций</h3>
                  <p className="empty-description">
                    Начните отслеживать свои финансы. Добавьте первую транзакцию выше.
                  </p>
                  <p className="empty-hint">
                    После добавления нескольких записей здесь появятся аналитика и инсайты.
                  </p>
                </div>
              ) : !loading ? (
                groupedTransactions.map(month => {
                  const isExpanded = expandedMonths.has(month.monthKey);
                  const monthBalance = month.income - month.expense;
                  
                  return (
                    <div key={month.monthKey} className="transaction-month-group">
                      {/* Month Header - Accordion */}
                      <div 
                        className="transaction-month-header"
                        onClick={() => toggleMonth(month.monthKey)}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '15px',
                          background: 'var(--bg-secondary)',
                          borderRadius: '8px',
                          marginBottom: '10px',
                          cursor: 'pointer',
                          border: '1px solid var(--border)',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '1.2rem' }}>{isExpanded ? '▼' : '▶'}</span>
                          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>{month.monthName}</h3>
                          {month.isCurrent && (
                            <span style={{ 
                              fontSize: '0.75rem', 
                              padding: '2px 8px', 
                              background: 'var(--primary)',
                              borderRadius: '12px',
                              color: 'white'
                            }}>Текущий</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '20px', fontSize: '0.9rem' }}>
                          <span style={{ color: 'var(--success)' }}>
                            Доходы: {formatAmount(month.income)}
                          </span>
                          <span style={{ color: 'var(--danger)' }}>
                            Расходы: {formatAmount(month.expense)}
                          </span>
                          <span style={{ 
                            color: monthBalance >= 0 ? 'var(--success)' : 'var(--danger)',
                            fontWeight: 'bold'
                          }}>
                            Итого: {formatAmount(monthBalance)}
                          </span>
                        </div>
                      </div>

                      {/* Month Content - Days */}
                      {isExpanded && (
                        <div className="transaction-days-container" style={{ marginBottom: '20px', marginLeft: '20px' }}>
                          {month.daysSorted.map(day => (
                            <div key={day.dayKey} className="transaction-day-group" style={{ marginBottom: '15px' }}>
                              <div style={{
                                fontSize: '0.9rem',
                                color: 'var(--text-secondary)',
                                marginBottom: '8px',
                                fontWeight: '500'
                              }}>
                                {day.dayName}
                              </div>
                              <div className="expenses-list">
                                {day.transactions.map(transaction => (
                                  <div key={transaction.id} className={`expense-item ${transaction.type === 'income' ? 'income-item' : ''}`}>
                                    <div className="expense-category">{transaction.type === 'income' ? '+' : '−'}</div>
                                    <div className="expense-details">
                                      <div className="expense-category-name">
                                        {transaction.type === 'income' ? transaction.description || 'Доход' : transaction.category}
                                      </div>
                                      <div className="expense-date">
                                        {new Date(transaction.date || transaction.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                      </div>
                                    </div>
                                    <div className={`expense-amount ${transaction.type === 'income' ? 'income-amount' : ''}`}>
                                      {transaction.type === 'income' ? '+' : '−'}{formatAmount(transaction.amount)}
                                    </div>
                                    <button 
                                      onClick={() => deleteTransaction(transaction.id)}
                                      className="btn-delete"
                                      style={{ marginLeft: 'auto' }}
                                      title="Удалить"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                              </div>
                              {(day.income > 0 || day.expense > 0) && (
                                <div style={{
                                  fontSize: '0.85rem',
                                  color: 'var(--text-secondary)',
                                  marginTop: '8px',
                                  marginBottom: '10px',
                                  paddingLeft: '10px',
                                  borderLeft: '2px solid var(--border)'
                                }}>
                                  <span style={{ color: 'var(--success)', marginRight: '15px' }}>
                                    +{formatAmount(day.income)}
                                  </span>
                                  <span style={{ color: 'var(--danger)' }}>
                                    −{formatAmount(day.expense)}
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : null}
            </div>
          </div>
        </>
        )}

        {/* Savings Tab */}
        {activeTab === 'savings' && (
          <div className="form-section">
            <h2 className="section-title">Откладывать деньги</h2>
            {!userSettings || !userSettings.monthlyIncome ? (
              <div className="empty-state">
                <div className="empty-icon">💰</div>
                <p>Настройте доход в настройках, чтобы увидеть рекомендации по откладыванию</p>
              </div>
            ) : (
              <SavingsCalculator 
                transactions={transactions}
                userSettings={userSettings}
                formatAmount={formatAmount}
                dataService={dataService}
              />
            )}
          </div>
        )}

      {/* Category Management Modal */}
      {showCategoryModal && (
        <div className="modal" style={{ display: 'flex' }} onClick={(e) => e.target.className === 'modal' && setShowCategoryModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Управление категориями</h2>
              <button onClick={() => { setShowCategoryModal(false); setEditingCategory(null); setCategoryName(''); }} className="modal-close">×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSaveCategory}>
                <div className="form-group">
                  <label className="form-label">Название категории</label>
                  <input
                    type="text"
                    className="form-input"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    placeholder="Например: Подписки"
                    required
                  />
                </div>
                <div className="modal-footer">
                  <button type="button" onClick={() => { setShowCategoryModal(false); setEditingCategory(null); setCategoryName(''); }} className="btn btn-secondary">
                    Отмена
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingCategory ? 'Сохранить' : 'Добавить'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
