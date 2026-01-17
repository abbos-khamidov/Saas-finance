import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import getDataService from '../services/dataService';
import Footer from '../components/Footer';

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

      <Footer />
    </div>
  );
}
    </div>
  );
}