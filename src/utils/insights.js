// Financial Insights Engine - Расширенная версия для SaaS продукта
export class FinancialInsights {
  constructor(transactions, userSettings) {
    this.transactions = transactions || [];
    this.userSettings = userSettings || {};
    this.now = new Date();
  }

  getDailySpendingLimit() {
    const monthlyIncome = this.userSettings.monthlyIncome || 0;
    const fixedExpenses = this.userSettings.fixedExpenses || 0;
    const daysInMonth = new Date(this.now.getFullYear(), this.now.getMonth() + 1, 0).getDate();
    const currentDay = this.now.getDate();
    const daysRemaining = daysInMonth - currentDay + 1;

    const availableForMonth = monthlyIncome - fixedExpenses;
    const dailyLimit = availableForMonth / daysInMonth;
    const remainingForMonth = availableForMonth - this.getCurrentMonthSpending();
    const dailyRemaining = remainingForMonth / daysRemaining;

    // Формула для объяснения
    const formula = {
      monthlyIncome,
      fixedExpenses,
      availableForMonth,
      daysInMonth,
      dailyLimit,
      currentSpending: this.getCurrentMonthSpending(),
      remainingForMonth,
      daysRemaining
    };

    return {
      dailyLimit: Math.max(0, dailyLimit),
      dailyRemaining: Math.max(0, dailyRemaining),
      remainingForMonth: Math.max(0, remainingForMonth),
      daysRemaining,
      formula
    };
  }

  getCurrentMonthSpending() {
    const startOfMonth = new Date(this.now.getFullYear(), this.now.getMonth(), 1);
    const endOfMonth = new Date(this.now.getFullYear(), this.now.getMonth() + 1, 0, 23, 59, 59);

    return this.transactions
      .filter(t => t.type === 'expense')
      .filter(t => {
        const date = new Date(t.date + 'T00:00:00');
        return date >= startOfMonth && date <= endOfMonth;
      })
      .reduce((sum, t) => sum + (t.amount || 0), 0);
  }

  getPreviousMonthSpending() {
    const prevMonth = new Date(this.now.getFullYear(), this.now.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(this.now.getFullYear(), this.now.getMonth(), 0, 23, 59, 59);

    return this.transactions
      .filter(t => t.type === 'expense')
      .filter(t => {
        const date = new Date(t.date + 'T00:00:00');
        return date >= prevMonth && date <= endOfPrevMonth;
      })
      .reduce((sum, t) => sum + (t.amount || 0), 0);
  }

  getPeriodComparison() {
    const current = this.getCurrentMonthSpending();
    const previous = this.getPreviousMonthSpending();
    const difference = current - previous;
    const percentage = previous > 0 ? ((difference / previous) * 100) : 0;

    return {
      current,
      previous,
      difference,
      percentage: Math.round(percentage),
      trend: difference > 0 ? 'up' : difference < 0 ? 'down' : 'same'
    };
  }

  getMonthEndForecast() {
    const monthlyIncome = this.userSettings.monthlyIncome || 0;
    const fixedExpenses = this.userSettings.fixedExpenses || 0;
    const currentSpending = this.getCurrentMonthSpending();
    const daysInMonth = new Date(this.now.getFullYear(), this.now.getMonth() + 1, 0).getDate();
    const currentDay = this.now.getDate();
    const avgDailySpending = currentSpending / Math.max(currentDay, 1);
    const daysRemaining = daysInMonth - currentDay;
    const projectedSpending = currentSpending + (avgDailySpending * daysRemaining);
    const forecastBalance = monthlyIncome - fixedExpenses - projectedSpending;

    // Негативный сценарий (если тратить на 20% больше)
    const worstCaseSpending = projectedSpending * 1.2;
    const worstCaseBalance = monthlyIncome - fixedExpenses - worstCaseSpending;

    return {
      forecastBalance: Math.round(forecastBalance),
      projectedSpending: Math.round(projectedSpending),
      worstCaseBalance: Math.round(worstCaseBalance),
      currentSpending,
      monthlyIncome,
      fixedExpenses,
      daysRemaining,
      avgDailySpending: Math.round(avgDailySpending),
      scenario: forecastBalance > 0 ? 'positive' : forecastBalance < -50000 ? 'negative' : 'warning'
    };
  }

  getCategoryOverspending(budgets) {
    if (!budgets || Object.keys(budgets).length === 0) {
      return [];
    }

    const startOfMonth = new Date(this.now.getFullYear(), this.now.getMonth(), 1);
    const endOfMonth = new Date(this.now.getFullYear(), this.now.getMonth() + 1, 0, 23, 59, 59);

    const categorySpending = {};
    this.transactions
      .filter(t => t.type === 'expense')
      .filter(t => {
        const date = new Date(t.date + 'T00:00:00');
        return date >= startOfMonth && date <= endOfMonth;
      })
      .forEach(t => {
        const cat = t.category || 'Другое';
        categorySpending[cat] = (categorySpending[cat] || 0) + (t.amount || 0);
      });

    return Object.keys(budgets)
      .map(category => {
        const spent = categorySpending[category] || 0;
        const budget = budgets[category];
        const remaining = budget - spent;
        const percentage = budget > 0 ? (spent / budget) * 100 : 0;

        return {
          category,
          spent: Math.round(spent),
          budget: Math.round(budget),
          remaining: Math.round(remaining),
          percentage: Math.round(percentage),
          status: percentage >= 100 ? 'over' : percentage >= 80 ? 'warning' : 'ok'
        };
      })
      .filter(item => item.status !== 'ok')
      .sort((a, b) => b.percentage - a.percentage);
  }

  // Новые методы для SaaS продукта

  // Streaks - дни без перерасхода
  getSpendingStreak() {
    const today = new Date(this.now);
    today.setHours(0, 0, 0, 0);
    
    const dailyLimit = this.getDailySpendingLimit().dailyLimit;
    let streak = 0;
    let currentDate = new Date(today);

    while (currentDate >= new Date(this.now.getFullYear(), this.now.getMonth(), 1)) {
      const dayExpenses = this.transactions
        .filter(t => {
          if (t.type !== 'expense') return false;
          const tDate = new Date(t.date + 'T00:00:00');
          tDate.setHours(0, 0, 0, 0);
          return tDate.getTime() === currentDate.getTime();
        })
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      if (dayExpenses <= dailyLimit) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    return {
      days: streak,
      isActive: streak > 0,
      message: streak > 7 ? 'Отличная дисциплина! 🔥' : streak > 3 ? 'Хорошая работа!' : 'Продолжайте!'
    };
  }

  // Самый дорогой день/категория
  getTopSpendingInsights() {
    const startOfMonth = new Date(this.now.getFullYear(), this.now.getMonth(), 1);
    const monthExpenses = this.transactions.filter(t => {
      if (t.type !== 'expense') return false;
      const date = new Date(t.date + 'T00:00:00');
      return date >= startOfMonth;
    });

    // Самый дорогой день
    const byDate = {};
    monthExpenses.forEach(t => {
      const date = t.date || new Date(t.created_at).toISOString().split('T')[0];
      byDate[date] = (byDate[date] || 0) + (t.amount || 0);
    });
    const topDay = Object.entries(byDate)
      .sort((a, b) => b[1] - a[1])[0];

    // Самая затратная категория
    const byCategory = {};
    monthExpenses.forEach(t => {
      const cat = t.category || 'Другое';
      byCategory[cat] = (byCategory[cat] || 0) + (t.amount || 0);
    });
    const topCategory = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])[0];

    return {
      topDay: topDay ? { date: topDay[0], amount: topDay[1] } : null,
      topCategory: topCategory ? { name: topCategory[0], amount: topCategory[1] } : null
    };
  }

  // Инсайт "если сократить X, сэкономишь Y"
  getSavingsOpportunities() {
    const topCategory = this.getTopSpendingInsights().topCategory;
    if (!topCategory) return null;

    const avgDaily = topCategory.amount / this.now.getDate();
    const savings10Percent = Math.round(topCategory.amount * 0.1);
    const savings20Percent = Math.round(topCategory.amount * 0.2);

    return {
      category: topCategory.name,
      current: topCategory.amount,
      ifReduce10: savings10Percent,
      ifReduce20: savings20Percent,
      message: `Если сократить "${topCategory.name}" на 20%, сэкономишь ${this.formatAmount(savings20Percent)}`
    };
  }

  // Повторяющиеся траты
  getRecurringExpenses() {
    const monthExpenses = this.transactions.filter(t => {
      if (t.type !== 'expense') return false;
      const date = new Date(t.date + 'T00:00:00');
      const startOfMonth = new Date(this.now.getFullYear(), this.now.getMonth(), 1);
      return date >= startOfMonth;
    });

    // Группируем по категории и сумме (примерно одинаковые суммы считаем повторяющимися)
    const groups = {};
    monthExpenses.forEach(t => {
      const cat = t.category || 'Другое';
      const rounded = Math.round(t.amount / 1000) * 1000;
      const key = `${cat}_${rounded}`;
      if (!groups[key]) {
        groups[key] = { category: cat, amount: rounded, count: 0, total: 0 };
      }
      groups[key].count++;
      groups[key].total += t.amount;
    });

    return Object.values(groups)
      .filter(g => g.count >= 3)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }

  // Автоматические выводы (инсайты)
  getAutomaticInsights() {
    const insights = [];
    
    const dailyLimit = this.getDailySpendingLimit();
    const forecast = this.getMonthEndForecast();
    const comparison = this.getPeriodComparison();
    const topInsights = this.getTopSpendingInsights();
    const savings = this.getSavingsOpportunities();

    // Инсайт о риске перерасхода
    if (forecast.forecastBalance < 0) {
      insights.push({
        type: 'warning',
        title: '⚠️ Риск перерасхода',
        message: `Если продолжите тратить так же, к концу месяца будете должны ${this.formatAmount(Math.abs(forecast.forecastBalance))}`,
        priority: 'high'
      });
    }

    // Инсайт о тренде
    if (comparison.trend === 'up' && comparison.percentage > 15) {
      insights.push({
        type: 'danger',
        title: '📈 Рост расходов',
        message: `Вы тратите на ${comparison.percentage}% больше, чем в прошлом месяце`,
        priority: 'medium'
      });
    } else if (comparison.trend === 'down' && comparison.percentage < -10) {
      insights.push({
        type: 'success',
        title: '📉 Снижение расходов',
        message: `Отлично! Вы тратите на ${Math.abs(comparison.percentage)}% меньше, чем в прошлом месяце`,
        priority: 'low'
      });
    }

    // Инсайт о самой затратной категории
    if (topInsights.topCategory) {
      insights.push({
        type: 'info',
        title: '💰 Самая затратная категория',
        message: `"${topInsights.topCategory.name}" — ${this.formatAmount(topInsights.topCategory.amount)} за месяц`,
        priority: 'medium'
      });
    }

    // Инсайт о возможностях экономии
    if (savings) {
      insights.push({
        type: 'opportunity',
        title: '💡 Возможность сэкономить',
        message: savings.message,
        priority: 'medium'
      });
    }

    // Инсайт о дневном лимите
    if (dailyLimit.dailyRemaining < dailyLimit.dailyLimit * 0.3) {
      insights.push({
        type: 'warning',
        title: '⏰ Лимит на исходе',
        message: `Сегодня можно потратить только ${this.formatAmount(dailyLimit.dailyRemaining)}. Будьте осторожны!`,
        priority: 'high'
      });
    }

    return insights.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  formatAmount(val) {
    return new Intl.NumberFormat('ru-RU').format(Math.round(val)) + ' сум';
  }

  getAllInsights(budgets) {
    return {
      dailyLimit: this.getDailySpendingLimit(),
      comparison: this.getPeriodComparison(),
      forecast: this.getMonthEndForecast(),
      overspending: this.getCategoryOverspending(budgets || {}),
      streak: this.getSpendingStreak(),
      topSpending: this.getTopSpendingInsights(),
      savingsOpportunities: this.getSavingsOpportunities(),
      recurringExpenses: this.getRecurringExpenses(),
      automaticInsights: this.getAutomaticInsights()
    };
  }
}
