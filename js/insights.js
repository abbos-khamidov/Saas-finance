// Financial Insights Engine
// Calculates insights, forecasts, and budget status

export class FinancialInsights {
    constructor(transactions, userSettings) {
        this.transactions = transactions;
        this.userSettings = userSettings || {};
        this.now = new Date();
    }

    // Calculate daily spending limit
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

        return {
            dailyLimit: Math.max(0, dailyLimit),
            dailyRemaining: Math.max(0, dailyRemaining),
            remainingForMonth: Math.max(0, remainingForMonth),
            daysRemaining: daysRemaining
        };
    }

    // Get current month spending
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

    // Get previous month spending
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

    // Compare with previous period
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

    // Forecast balance to end of month
    getMonthEndForecast() {
        const monthlyIncome = this.userSettings.monthlyIncome || 0;
        const fixedExpenses = this.userSettings.fixedExpenses || 0;
        const currentSpending = this.getCurrentMonthSpending();
        const daysInMonth = new Date(this.now.getFullYear(), this.now.getMonth() + 1, 0).getDate();
        const currentDay = this.now.getDate();
        const avgDailySpending = currentSpending / currentDay;
        const daysRemaining = daysInMonth - currentDay;
        const projectedSpending = currentSpending + (avgDailySpending * daysRemaining);
        const forecastBalance = monthlyIncome - fixedExpenses - projectedSpending;

        return {
            forecastBalance: Math.round(forecastBalance),
            projectedSpending: Math.round(projectedSpending),
            currentSpending,
            monthlyIncome,
            fixedExpenses,
            daysRemaining
        };
    }

    // Get overspending by category
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

    // Get all insights
    getAllInsights(budgets) {
        const dailyLimit = this.getDailySpendingLimit();
        const comparison = this.getPeriodComparison();
        const forecast = this.getMonthEndForecast();
        const overspending = this.getCategoryOverspending(budgets);

        return {
            dailyLimit,
            comparison,
            forecast,
            overspending,
            currentSpending: this.getCurrentMonthSpending(),
            monthlyIncome: this.userSettings.monthlyIncome || 0
        };
    }
}