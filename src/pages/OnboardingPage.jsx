import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import getDataService from '../services/dataService';

export default function OnboardingPage() {
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [fixedExpenses, setFixedExpenses] = useState('');
  const [financialGoal, setFinancialGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!monthlyIncome || !fixedExpenses) {
        alert('Пожалуйста, заполните обязательные поля');
        return;
      }

      const dataService = getDataService();
      await dataService.completeOnboarding({
        monthlyIncome,
        fixedExpenses,
        financialGoal
      });

      // Show welcome screen briefly
      navigate('/');
    } catch (error) {
      alert('Ошибка при сохранении данных: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '600px' }}>
      <div className="onboarding-container">
        <div className="onboarding-header">
          <h1 className="onboarding-title">Добро пожаловать!</h1>
          <p className="onboarding-subtitle">Настройте профиль за 2 минуты и получите персональные инсайты</p>
        </div>

        <form onSubmit={handleSubmit} className="onboarding-form">
          <div className="form-section">
            <div className="form-group">
              <label className="form-label">Ваш доход в месяц (сум)</label>
              <input
                type="number"
                className="form-input"
                placeholder="5000000"
                step="1000"
                min="0"
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(e.target.value)}
                required
              />
              <p className="form-hint">Средний доход за месяц</p>
            </div>

            <div className="form-group">
              <label className="form-label">Обязательные расходы в месяц (сум)</label>
              <input
                type="number"
                className="form-input"
                placeholder="2000000"
                step="1000"
                min="0"
                value={fixedExpenses}
                onChange={(e) => setFixedExpenses(e.target.value)}
                required
              />
              <p className="form-hint">Аренда, коммунальные, кредиты и т.д.</p>
            </div>

            <div className="form-group">
              <label className="form-label">Финансовая цель (опционально)</label>
              <input
                type="text"
                className="form-input"
                placeholder="Накопить на отпуск"
                value={financialGoal}
                onChange={(e) => setFinancialGoal(e.target.value)}
              />
              <p className="form-hint">На что хотите накопить?</p>
            </div>
          </div>

          <div className="onboarding-actions">
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? 'Сохранение...' : 'Начать использовать'}
            </button>
          </div>
        </form>
      </div>

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-text">Made by <strong>Adams Midov</strong></div>
          <div className="footer-links">
            <a href="https://t.me/adamsmidov" target="_blank" rel="noopener noreferrer" className="footer-link" title="Telegram">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.165 1.632-1.279 5.594-1.805 7.417-.223.799-.665 1.065-1.092 1.089-.917.048-1.614-.605-2.503-1.186-1.113-.729-1.743-1.131-2.823-1.811-1.256-.785-.442-1.217.274-1.924.188-.184 3.247-2.977 3.307-3.23.007-.032.014-.152-.057-.213-.071-.061-.176-.038-.253-.023-.107.024-1.793 1.139-5.062 3.345-.479.328-.913.488-1.302.48-.428-.008-1.252-.241-1.865-.44-.753-.244-1.349-.372-1.297-.785.027-.211.403-.428 1.109-.65 4.375-1.91 7.297-3.168 8.767-3.774 4.139-1.756 4.996-2.061 5.558-2.08.126-.004.408.03.591.183.155.129.198.303.219.423.02.12.045.394.025.606z"/>
              </svg>
              Telegram
            </a>
            <a href="https://github.com/adamsmidov" target="_blank" rel="noopener noreferrer" className="footer-link" title="GitHub">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}