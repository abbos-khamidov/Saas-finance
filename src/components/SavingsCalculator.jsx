import React, { useState, useEffect } from 'react';

export default function SavingsCalculator({ transactions, userSettings, formatAmount, dataService }) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      const data = await dataService.getGoals();
      setGoals(data.filter(g => g.status === 'active') || []);
    } catch (error) {
      console.error('Error loading goals:', error);
    } finally {
      setLoading(false);
    }
  };

  // Расчет доступных средств для откладывания
  const expenses = transactions.filter(t => t.type === 'expense');
  const incomes = transactions.filter(t => t.type === 'income');
  const currentMonthExpenses = expenses.filter(t => {
    const date = new Date(t.date);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).reduce((sum, t) => sum + (t.amount || 0), 0);
  
  const currentMonthIncomes = incomes.filter(t => {
    const date = new Date(t.date);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).reduce((sum, t) => sum + (t.amount || 0), 0);

  const monthlyIncome = userSettings.monthlyIncome || 0;
  const fixedExpenses = userSettings.fixedExpenses || 0;
  const availableForSavings = monthlyIncome - fixedExpenses - currentMonthExpenses;
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const currentDay = new Date().getDate();
  const daysRemaining = daysInMonth - currentDay + 1;

  const recommendedDaily = availableForSavings > 0 && daysRemaining > 0 
    ? availableForSavings / daysRemaining 
    : 0;
  const recommendedMonthly = availableForSavings > 0 ? availableForSavings : 0;

  return (
    <div>
      <div className="insight-card wow">
        <div className="insight-header">
          <span className="insight-title">💰 Доступно для откладывания</span>
        </div>
        <div className="insight-message">
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '10px' }}>
            {formatAmount(availableForSavings)}
          </div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Доход: {formatAmount(monthlyIncome)} - Обязательные: {formatAmount(fixedExpenses)} - Текущие расходы: {formatAmount(currentMonthExpenses)}
          </div>
        </div>
      </div>

      {availableForSavings > 0 ? (
        <div className="insight-card wow" style={{ marginTop: '20px' }}>
          <div className="insight-header">
            <span className="insight-title">📅 Рекомендуемое откладывание</span>
          </div>
          <div className="insight-message">
            <div style={{ marginBottom: '10px' }}>
              <strong>В день:</strong> {formatAmount(recommendedDaily)}
            </div>
            <div>
              <strong>В месяц:</strong> {formatAmount(recommendedMonthly)}
            </div>
            {daysRemaining > 0 && (
              <div style={{ marginTop: '10px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Осталось дней в месяце: {daysRemaining}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="insight-card insight-danger wow" style={{ marginTop: '20px' }}>
          <div className="insight-header">
            <span className="insight-title">⚠️ Нет средств для откладывания</span>
          </div>
          <div className="insight-message">
            Текущие расходы превышают доступные средства. Рекомендуется сократить траты.
          </div>
        </div>
      )}

      {goals.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h3 className="section-title" style={{ fontSize: '1.1rem', marginBottom: '15px' }}>По вашим целям</h3>
          {goals.map(goal => {
            const remaining = goal.target_amount - (goal.current_amount || 0);
            const deadlineDays = goal.deadline ? Math.max(1, Math.ceil((new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24))) : 30;
            const dailyForGoal = remaining > 0 && deadlineDays > 0 
              ? Math.min(recommendedDaily, remaining / deadlineDays)
              : 0;
            
            return (
              <div key={goal.id} className="insight-card wow" style={{ marginBottom: '15px' }}>
                <div className="insight-header">
                  <span className="insight-title">{goal.title}</span>
                </div>
                <div className="insight-message">
                  <div>Осталось: {formatAmount(remaining)}</div>
                  {goal.deadline && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '5px' }}>
                      Срок: {new Date(goal.deadline).toLocaleDateString('ru-RU')}
                    </div>
                  )}
                  {dailyForGoal > 0 && (
                    <div style={{ marginTop: '10px', fontWeight: 'bold' }}>
                      Рекомендуется откладывать: {formatAmount(dailyForGoal)} в день
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
