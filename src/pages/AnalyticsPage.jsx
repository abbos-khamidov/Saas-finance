import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { useAuth } from '../services/authService';
import getDataService from '../services/dataService';
import { FinancialInsights } from '../utils/insights';
import Footer from '../components/Footer';

// Регистрация компонентов Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function AnalyticsPage() {
  const { user, logout } = useAuth();
  const dataService = getDataService();
  const [transactions, setTransactions] = useState([]);
  const [userSettings, setUserSettings] = useState(null);
  const [period, setPeriod] = useState('all');
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Загрузка данных при монтировании и при изменении периода
  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    setLoading(true);
    try {
      const all = await dataService.getTransactions();
      let filtered = all;
      
      if (period === 'month') {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        filtered = all.filter(t => {
          const date = new Date(t.date || t.created_at);
          return date >= startOfMonth;
        });
      } else if (period === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        filtered = all.filter(t => {
          const date = new Date(t.date || t.created_at);
          return date >= weekAgo;
        });
      }
      
      setTransactions(filtered.sort((a, b) => {
        const aTime = a.created_at || a.timestamp || 0;
        const bTime = b.created_at || b.timestamp || 0;
        return new Date(bTime) - new Date(aTime);
      }));

      const settings = await dataService.getUserSettings();
      setUserSettings(settings);
      setDataLoaded(true);
    } catch (error) {
      console.error('Error loading data:', error);
      setDataLoaded(true); // Помечаем что загрузка завершена даже при ошибке
    } finally {
      setLoading(false);
    }
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

  // Calculate insights
  const insights = useMemo(() => {
    if (!userSettings) return null;
    const insightsCalc = new FinancialInsights(transactions, userSettings);
    return insightsCalc.getAllInsights(userSettings.budgets || {});
  }, [transactions, userSettings]);

  // Prepare data for charts
  const chartData = useMemo(() => {
    const now = new Date();
    const daysToShow = period === 'week' ? 7 : period === 'month' ? 30 : Math.min(30, transactions.length || 30);
    
    // Группировка по датам
    const expensesByDate = {};
    const incomesByDate = {};
    
    transactions.forEach(t => {
      const date = new Date(t.date || t.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
      if (t.type === 'expense') {
        expensesByDate[date] = (expensesByDate[date] || 0) + (t.amount || 0);
      } else {
        incomesByDate[date] = (incomesByDate[date] || 0) + (t.amount || 0);
      }
    });

    // Генерация дат для графика
    const dates = [];
    const expenseData = [];
    const incomeData = [];
    
    for (let i = daysToShow - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
      dates.push(dateStr);
      expenseData.push(expensesByDate[dateStr] || 0);
      incomeData.push(incomesByDate[dateStr] || 0);
    }

    return { dates, expenseData, incomeData };
  }, [transactions, period]);

  // Line chart options
  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: '#e5e7eb',
          font: { size: 12 }
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => formatAmount(context.parsed.y)
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: '#9ca3af',
          callback: (value) => {
            if (value >= 1000000) return (value / 1000000).toFixed(1) + 'М';
            if (value >= 1000) return (value / 1000).toFixed(0) + 'К';
            return value;
          }
        },
        grid: {
          color: 'rgba(156, 163, 175, 0.1)'
        }
      },
      x: {
        ticks: {
          color: '#9ca3af'
        },
        grid: {
          display: false
        }
      }
    }
  };

  // Expenses line chart
  const expensesChartData = {
    labels: chartData.dates,
    datasets: [{
      label: 'Расходы',
      data: chartData.expenseData,
      borderColor: 'rgb(239, 68, 68)',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderWidth: 2,
      fill: true,
      tension: 0.4
    }]
  };

  // Income line chart
  const incomeChartData = {
    labels: chartData.dates,
    datasets: [{
      label: 'Доходы',
      data: chartData.incomeData,
      borderColor: 'rgb(16, 185, 129)',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      borderWidth: 2,
      fill: true,
      tension: 0.4
    }]
  };

  // Category doughnut chart
  const categoryLabels = Object.keys(byCategory);
  const categoryValues = categoryLabels.map(cat => byCategory[cat]);
  const categoryColors = [
    'rgba(99, 102, 241, 0.8)',
    'rgba(239, 68, 68, 0.8)',
    'rgba(245, 158, 11, 0.8)',
    'rgba(16, 185, 129, 0.8)',
    'rgba(236, 72, 153, 0.8)',
    'rgba(59, 130, 246, 0.8)',
    'rgba(139, 92, 246, 0.8)'
  ];

  const categoryChartData = {
    labels: categoryLabels,
    datasets: [{
      data: categoryValues,
      backgroundColor: categoryColors.slice(0, categoryLabels.length),
      borderWidth: 0
    }]
  };

  const categoryChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#e5e7eb',
          padding: 15,
          font: { size: 11 }
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${formatAmount(value)} (${percentage}%)`;
          }
        }
      }
    }
  };

  // Comparison bar chart
  const comparisonChartData = {
    labels: chartData.dates,
    datasets: [
      {
        label: 'Доходы',
        data: chartData.incomeData,
        backgroundColor: 'rgba(16, 185, 129, 0.7)',
        borderColor: 'rgb(16, 185, 129)',
        borderWidth: 1
      },
      {
        label: 'Расходы',
        data: chartData.expenseData,
        backgroundColor: 'rgba(239, 68, 68, 0.7)',
        borderColor: 'rgb(239, 68, 68)',
        borderWidth: 1
      }
    ]
  };

  // Key insights
  const avgDailyExpense = expenses.length > 0 ? totalExpense / Math.max(transactions.length, 1) : 0;
  const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
  const trend = insights?.comparison?.trend || 'same';

  return (
    <div className="container">
      <nav className="nav-bar">
        <div className="nav-links">
          <Link to="/" className="nav-link">Главная</Link>
          <Link to="/analytics" className="nav-link active">Аналитика</Link>
          <Link to="/goals" className="nav-link">Цели</Link>
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

      {/* Loading State */}
      {loading && !dataLoaded && (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Загрузка аналитики...</p>
        </div>
      )}

      {(!loading || dataLoaded) && (
        <>
          {/* Period Filter */}
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

          {/* Key Insights Cards */}
          {transactions.length > 0 && (
            <div className="insights-section">
              <h2 className="section-title">Ключевые инсайты</h2>
              <div className="insights-grid">
                <div className="insight-card insight-info wow">
                  <div className="insight-header">
                    <span className="insight-title">💰 Средний расход в день</span>
                  </div>
                  <div className="insight-message">{formatAmount(avgDailyExpense)}</div>
                </div>
                
                {topCategory && (
                  <div className="insight-card insight-warning wow">
                    <div className="insight-header">
                      <span className="insight-title">📊 Самая затратная категория</span>
                    </div>
                    <div className="insight-message">
                      <strong>{topCategory[0]}</strong> — {formatAmount(topCategory[1])}
                      ({totalExpense > 0 ? ((topCategory[1] / totalExpense) * 100).toFixed(1) : 0}%)
                    </div>
                  </div>
                )}

                {insights?.comparison && insights.comparison.previous > 0 && (
                  <div className={`insight-card insight-${trend === 'up' ? 'danger' : trend === 'down' ? 'success' : 'info'} wow`}>
                    <div className="insight-header">
                      <span className="insight-title">
                        {trend === 'up' ? '📈' : trend === 'down' ? '📉' : '➡️'} Тренд расходов
                      </span>
                    </div>
                    <div className="insight-message">
                      {trend === 'up' ? 'Рост' : trend === 'down' ? 'Снижение' : 'Без изменений'} на {Math.abs(insights.comparison.percentage)}%
                      {trend === 'down' && ' — отличная работа!'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Stats Section */}
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

          {/* Charts Section */}
          {transactions.length > 0 ? (
            <div className="charts-section">
              <div className="section-header-large">
                <h2 className="section-title">Визуализация данных</h2>
                <p className="section-subtitle">Графики и диаграммы для понимания ваших финансов</p>
              </div>

              <div className="charts-grid">
                {/* Expenses by Date Line Chart */}
                {expenses.length > 0 ? (
                  <div className="chart-card wow">
                    <div className="chart-header">
                      <div className="chart-icon">📉</div>
                      <div>
                        <h3 className="chart-title">Расходы по датам</h3>
                        <p className="chart-description">
                          Динамика ваших расходов во времени. Видно, в какие дни траты больше или меньше.
                        </p>
                      </div>
                    </div>
                    <div className="chart-container">
                      <Line data={expensesChartData} options={lineChartOptions} />
                    </div>
                  </div>
                ) : (
                  <div className="chart-card wow">
                    <div className="chart-header">
                      <div className="chart-icon">📉</div>
                      <div>
                        <h3 className="chart-title">Расходы по датам</h3>
                        <p className="chart-description">
                          Для отображения графика расходов необходимо добавить хотя бы одну транзакцию с типом "Расход".
                        </p>
                      </div>
                    </div>
                    <div className="chart-container" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      <p>Недостаточно данных для отображения графика расходов</p>
                      <p style={{ marginTop: '10px', fontSize: '0.9em' }}>Добавьте расходы на главной странице</p>
                    </div>
                  </div>
                )}

                {/* Income by Date Line Chart */}
                {incomes.length > 0 ? (
                  <div className="chart-card wow">
                    <div className="chart-header">
                      <div className="chart-icon">📈</div>
                      <div>
                        <h3 className="chart-title">Доходы по датам</h3>
                        <p className="chart-description">
                          Как изменяются ваши доходы. Отслеживайте регулярность поступлений.
                        </p>
                      </div>
                    </div>
                    <div className="chart-container">
                      <Line data={incomeChartData} options={lineChartOptions} />
                    </div>
                  </div>
                ) : (
                  <div className="chart-card wow">
                    <div className="chart-header">
                      <div className="chart-icon">📈</div>
                      <div>
                        <h3 className="chart-title">Доходы по датам</h3>
                        <p className="chart-description">
                          Для отображения графика доходов необходимо добавить хотя бы одну транзакцию с типом "Доход".
                        </p>
                      </div>
                    </div>
                    <div className="chart-container" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      <p>Недостаточно данных для отображения графика доходов</p>
                      <p style={{ marginTop: '10px', fontSize: '0.9em' }}>Добавьте доходы на главной странице</p>
                    </div>
                  </div>
                )}

                {/* Category Doughnut Chart */}
                {expenses.length > 0 && categoryLabels.length > 0 ? (
                  <div className="chart-card wow">
                    <div className="chart-header">
                      <div className="chart-icon">🥧</div>
                      <div>
                        <h3 className="chart-title">Расходы по категориям</h3>
                        <p className="chart-description">
                          Распределение трат по категориям. Какая категория забирает больше всего?
                        </p>
                      </div>
                    </div>
                    <div className="chart-container">
                      <Doughnut data={categoryChartData} options={categoryChartOptions} />
                    </div>
                  </div>
                ) : (
                  <div className="chart-card wow">
                    <div className="chart-header">
                      <div className="chart-icon">🥧</div>
                      <div>
                        <h3 className="chart-title">Расходы по категориям</h3>
                        <p className="chart-description">
                          Для отображения диаграммы по категориям необходимо добавить расходы с указанными категориями.
                        </p>
                      </div>
                    </div>
                    <div className="chart-container" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      <p>Недостаточно данных для отображения диаграммы</p>
                      <p style={{ marginTop: '10px', fontSize: '0.9em' }}>Добавьте расходы с категориями на главной странице</p>
                    </div>
                  </div>
                )}

                {/* Comparison Bar Chart */}
                {(expenses.length > 0 || incomes.length > 0) ? (
                  <div className="chart-card wow full-width">
                    <div className="chart-header">
                      <div className="chart-icon">⚖</div>
                      <div>
                        <h3 className="chart-title">Доходы vs Расходы</h3>
                        <p className="chart-description">
                          Сравнение доходов и расходов. Зелёные столбцы — доходы, красные — расходы.
                        </p>
                      </div>
                    </div>
                    <div className="chart-container">
                      <Bar data={comparisonChartData} options={lineChartOptions} />
                    </div>
                  </div>
                ) : (
                  <div className="chart-card wow full-width">
                    <div className="chart-header">
                      <div className="chart-icon">⚖</div>
                      <div>
                        <h3 className="chart-title">Доходы vs Расходы</h3>
                        <p className="chart-description">
                          Для сравнения доходов и расходов необходимо добавить транзакции обоих типов.
                        </p>
                      </div>
                    </div>
                    <div className="chart-container" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      <p>Недостаточно данных для сравнения</p>
                      <p style={{ marginTop: '10px', fontSize: '0.9em' }}>Добавьте доходы и расходы на главной странице</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="empty-state wow">
              <div className="empty-icon">📊</div>
              <h3 className="empty-title">Нет данных для аналитики</h3>
              <p className="empty-description">
                Для отображения графиков и аналитики необходимо добавить транзакции (доходы или расходы) на главной странице.
              </p>
              <p className="empty-description" style={{ marginTop: '10px', fontSize: '0.9em', color: 'var(--text-secondary)' }}>
                После добавления транзакций здесь появятся графики, диаграммы и ключевые инсайты.
              </p>
            </div>
          )}

          {/* Category Breakdown */}
          <div className="form-section">
            <h2 className="section-title">Детализация по категориям</h2>
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
        </>
      )}

      <Footer />
    </div>
  );
}
