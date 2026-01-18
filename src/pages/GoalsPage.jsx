import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../services/authService';
import getDataService from '../services/dataService';
import Footer from '../components/Footer';

export default function GoalsPage() {
  const { user, logout } = useAuth();
  const dataService = getDataService();
  
  const [goals, setGoals] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    target_amount: '',
    deadline: '',
  });

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      const data = await dataService.getGoals();
      setGoals(data || []);
    } catch (error) {
      console.error('Error loading goals:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.target_amount) {
      alert('Заполните название и целевую сумму');
      return;
    }

    try {
      const goalData = {
        ...formData,
        target_amount: parseFloat(formData.target_amount),
        current_amount: editingGoal?.current_amount || 0,
        status: editingGoal?.status || 'active',
      };
      
      if (editingGoal) {
        goalData.id = editingGoal.id;
      }

      await dataService.saveGoal(goalData);
      await loadGoals();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving goal:', error);
      alert('Ошибка при сохранении цели');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить эту цель?')) return;
    try {
      await dataService.deleteGoal(id);
      await loadGoals();
    } catch (error) {
      console.error('Error deleting goal:', error);
      alert('Ошибка при удалении цели');
    }
  };

  const handleEdit = (goal) => {
    setEditingGoal(goal);
    setFormData({
      title: goal.title || '',
      description: goal.description || '',
      target_amount: goal.target_amount?.toString() || '',
      deadline: goal.deadline || '',
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingGoal(null);
    setFormData({
      title: '',
      description: '',
      target_amount: '',
      deadline: '',
    });
  };

  const formatAmount = (val) => {
    return new Intl.NumberFormat('ru-RU').format(val) + ' сум';
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 100) return 'var(--success)';
    if (percentage >= 75) return 'var(--primary)';
    if (percentage >= 50) return 'var(--warning)';
    return 'var(--danger)';
  };

  return (
    <div className="container">
      <nav className="nav-bar">
        <div className="nav-links">
          <Link to="/" className="nav-link">Главная</Link>
          <Link to="/analytics" className="nav-link">Аналитика</Link>
          <Link to="/goals" className="nav-link active">Цели</Link>
        </div>
        <div className="user-info">
          <span className="user-email">{user?.email || 'Загрузка...'}</span>
          <button onClick={logout} className="btn-logout">Выход</button>
        </div>
      </nav>

      <header className="header">
        <h1 className="header-title">Финансовые цели</h1>
        <p className="header-subtitle">Ставьте цели и отслеживайте прогресс</p>
      </header>

      <div className="form-section">
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          + Добавить цель
        </button>
      </div>

      <div className="form-section">
        {goals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎯</div>
            <p>У вас пока нет финансовых целей</p>
            <p style={{ fontSize: '0.875rem', marginTop: '8px' }}>
              Создайте первую цель, чтобы начать накапливать
            </p>
          </div>
        ) : (
          <div className="goals-grid">
            {goals.map(goal => {
              const progress = goal.progress_percentage || ((goal.current_amount / goal.target_amount) * 100);
              return (
                <div key={goal.id} className="goal-card wow">
                  <div className="goal-header">
                    <h3 className="goal-title">{goal.title}</h3>
                    <div className="goal-actions">
                      <button onClick={() => handleEdit(goal)} className="btn-sm">✏️</button>
                      <button onClick={() => handleDelete(goal.id)} className="btn-sm">🗑️</button>
                    </div>
                  </div>
                  {goal.description && (
                    <p className="goal-description">{goal.description}</p>
                  )}
                  <div className="goal-progress">
                    <div className="goal-progress-info">
                      <span className="goal-current">{formatAmount(goal.current_amount || 0)}</span>
                      <span className="goal-separator">/</span>
                      <span className="goal-target">{formatAmount(goal.target_amount)}</span>
                    </div>
                    <div className="goal-progress-bar-wrapper">
                      <div 
                        className="goal-progress-bar"
                        style={{ 
                          width: `${Math.min(100, progress)}%`,
                          backgroundColor: getProgressColor(progress)
                        }}
                      ></div>
                    </div>
                    <div className="goal-progress-percentage">{Math.round(progress)}%</div>
                  </div>
                  {goal.deadline && (
                    <div className="goal-deadline">
                      Срок: {new Date(goal.deadline).toLocaleDateString('ru-RU')}
                    </div>
                  )}
                  <div className="goal-status">
                    <span className={`goal-status-badge ${goal.status}`}>
                      {goal.status === 'completed' ? '✅ Завершена' : 
                       goal.status === 'cancelled' ? '❌ Отменена' : '🔄 Активна'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Goal Modal */}
      {showModal && (
        <div className="modal" style={{ display: 'flex' }} onClick={(e) => e.target.className === 'modal' && handleCloseModal()}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingGoal ? 'Редактировать цель' : 'Новая цель'}</h2>
              <button onClick={handleCloseModal} className="modal-close">×</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-group">
                <label className="form-label">Название цели</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Например: Накопить на отпуск"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Описание (опционально)</label>
                <textarea
                  className="form-input"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Подробнее о цели..."
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Целевая сумма (сум)</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.target_amount}
                  onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
                  placeholder="5000000"
                  step="1000"
                  min="0"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Срок достижения (опционально)</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                />
              </div>
              <div className="modal-footer">
                <button type="button" onClick={handleCloseModal} className="btn btn-secondary">
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingGoal ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
