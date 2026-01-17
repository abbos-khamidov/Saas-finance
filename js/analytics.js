// Analytics Page
import {
    auth,
    db
} from './firebase-config.js';
import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import {
    collection,
    query,
    where,
    onSnapshot,
    Timestamp
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

// DOM Elements
const userEmailEl = document.getElementById('userEmail');
const logoutBtn = document.getElementById('logoutBtn');
const totalIncomeEl = document.getElementById('totalIncome');
const totalExpenseEl = document.getElementById('totalExpense');
const balanceEl = document.getElementById('balance');
const periodButtons = document.querySelectorAll('.period-btn');
const customPeriodDiv = document.getElementById('customPeriod');
const dateFromInput = document.getElementById('dateFrom');
const dateToInput = document.getElementById('dateTo');
const applyCustomPeriodBtn = document.getElementById('applyCustomPeriod');
const categoryBreakdown = document.getElementById('categoryBreakdown');
const recentTransactions = document.getElementById('recentTransactions');

// Chart instances
let expensesChart = null;
let incomeChart = null;
let categoryChart = null;
let comparisonChart = null;

// Global Variables
let allTransactions = [];
let currentUser = null;
let currentPeriod = 'all';
let dateFrom = null;
let dateTo = null;
let unsubscribeSnapshot = null;

// Category Icons (using text labels instead of emojis)
const categoryIcons = {
    'Продукты': '•',
    'Транспорт': '•',
    'Развлечения': '•',
    'Здоровье': '•',
    'Коммунальные услуги': '•',
    'Одежда': '•',
    'Другое': '•'
};

// Initialize animations
window.addEventListener('DOMContentLoaded', () => {
    // Check if Chart is available
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded');
        return;
    }
    
    initAnalyticsAnimations();
});

// Initialize WOW animations for analytics
function initAnalyticsAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });
    
    document.querySelectorAll('.wow').forEach(el => {
        observer.observe(el);
    });
}

// Auth State Observer
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        userEmailEl.textContent = user.email;
        // Wait a bit for DOM to be ready
        setTimeout(() => {
            loadTransactions();
        }, 100);
    } else {
        window.location.href = 'auth.html';
    }
});

// Period Filter Handlers
periodButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        periodButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentPeriod = btn.dataset.period;

        if (currentPeriod === 'custom') {
            customPeriodDiv.style.display = 'block';
        } else {
            customPeriodDiv.style.display = 'none';
            updateDateRange();
            updateCharts();
        }
    });
});

applyCustomPeriodBtn.addEventListener('click', () => {
    if (!dateFromInput.value || !dateToInput.value) {
        alert('Выберите обе даты');
        return;
    }
    dateFrom = new Date(dateFromInput.value);
    dateTo = new Date(dateToInput.value);
    dateTo.setHours(23, 59, 59, 999);

    if (dateFrom > dateTo) {
        alert('Дата начала должна быть раньше даты окончания');
        return;
    }

    updateCharts();
});

// Load transactions from Firestore
function loadTransactions() {
    if (!currentUser) return;

    if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
    }

    const expensesRef = collection(db, 'expenses');
    const incomesRef = collection(db, 'incomes');

    const expensesQuery = query(expensesRef, where('userId', '==', currentUser.uid));
    const incomesQuery = query(incomesRef, where('userId', '==', currentUser.uid));

    let expensesLoaded = false;
    let incomesLoaded = false;

    onSnapshot(expensesQuery, (querySnapshot) => {
        allTransactions = allTransactions.filter(t => t.type !== 'expense');
        querySnapshot.forEach((doc) => {
            allTransactions.push({
                id: doc.id,
                type: 'expense',
                ...doc.data()
            });
        });
        expensesLoaded = true;
        if (incomesLoaded) {
            processTransactions();
        }
    });

    onSnapshot(incomesQuery, (querySnapshot) => {
        allTransactions = allTransactions.filter(t => t.type !== 'income');
        querySnapshot.forEach((doc) => {
            allTransactions.push({
                id: doc.id,
                type: 'income',
                ...doc.data()
            });
        });
        incomesLoaded = true;
        if (expensesLoaded) {
            processTransactions();
        }
    });
}

function processTransactions() {
    allTransactions.sort((a, b) => {
        const aTime = a.timestamp?.seconds || 0;
        const bTime = b.timestamp?.seconds || 0;
        return bTime - aTime;
    });
    
    updateDateRange();
    updateCharts();
    updateStats();
    updateCategoryBreakdown();
    updateRecentTransactions();
    updateKeyInsights();
}

function updateDateRange() {
    const now = new Date();
    switch (currentPeriod) {
        case 'week':
            dateFrom = new Date(now);
            dateFrom.setDate(now.getDate() - 7);
            dateTo = now;
            break;
        case 'month':
            dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
            dateTo = now;
            break;
        case 'all':
        default:
            dateFrom = null;
            dateTo = null;
            break;
    }
}

function getFilteredTransactions() {
    if (!dateFrom && !dateTo) {
        return allTransactions;
    }

    return allTransactions.filter(transaction => {
        if (!transaction.date) return false;
        const transactionDate = new Date(transaction.date + 'T00:00:00');

        if (dateFrom && transactionDate < dateFrom) return false;
        if (dateTo && transactionDate > dateTo) return false;
        return true;
    });
}

function updateStats() {
    const filtered = getFilteredTransactions();
    const expenses = filtered.filter(t => t.type === 'expense');
    const incomes = filtered.filter(t => t.type === 'income');

    const totalExpense = expenses.reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalIncome = incomes.reduce((sum, t) => sum + (t.amount || 0), 0);
    const balance = totalIncome - totalExpense;

    totalExpenseEl.textContent = formatAmount(totalExpense);
    totalIncomeEl.textContent = formatAmount(totalIncome);
    balanceEl.textContent = formatAmount(balance);

    balanceEl.className = 'stat-value balance ' + (balance >= 0 ? 'positive' : 'negative');
}

function updateCharts() {
    const filtered = getFilteredTransactions();
    const expenses = filtered.filter(t => t.type === 'expense');
    const incomes = filtered.filter(t => t.type === 'income');

    updateExpensesChart(expenses);
    updateIncomeChart(incomes);
    updateCategoryChart(expenses);
    updateComparisonChart(expenses, incomes);
}

function updateExpensesChart(expenses) {
    const canvas = document.getElementById('expensesChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Group by date
    const byDate = {};
    expenses.forEach(expense => {
        if (!expense.date) return;
        const date = expense.date;
        byDate[date] = (byDate[date] || 0) + (expense.amount || 0);
    });

    const dates = Object.keys(byDate).sort();
    const amounts = dates.map(date => byDate[date]);

    if (expensesChart) {
        expensesChart.destroy();
    }

    if (dates.length === 0) {
        expensesChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Расходы',
                    data: [],
                    borderColor: '#f5576c',
                    backgroundColor: 'rgba(245, 87, 108, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
        return;
    }

    expensesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates.map(d => formatDateShort(d)),
            datasets: [{
                label: 'Расходы',
                data: amounts,
                borderColor: '#f5576c',
                backgroundColor: 'rgba(245, 87, 108, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatAmount(value);
                        }
                    }
                }
            }
        }
    });
}

function updateIncomeChart(incomes) {
    const canvas = document.getElementById('incomeChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const byDate = {};
    incomes.forEach(income => {
        if (!income.date) return;
        const date = income.date;
        byDate[date] = (byDate[date] || 0) + (income.amount || 0);
    });

    const dates = Object.keys(byDate).sort();
    const amounts = dates.map(date => byDate[date]);

    if (incomeChart) {
        incomeChart.destroy();
    }

    if (dates.length === 0) {
        incomeChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Доходы',
                    data: [],
                    borderColor: '#4facfe',
                    backgroundColor: 'rgba(79, 172, 254, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
        return;
    }

    incomeChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates.map(d => formatDateShort(d)),
            datasets: [{
                label: 'Доходы',
                data: amounts,
                borderColor: '#4facfe',
                backgroundColor: 'rgba(79, 172, 254, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatAmount(value);
                        }
                    }
                }
            }
        }
    });
}

function updateCategoryChart(expenses) {
    const canvas = document.getElementById('categoryChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const byCategory = {};
    expenses.forEach(expense => {
        const cat = expense.category || 'Другое';
        byCategory[cat] = (byCategory[cat] || 0) + (expense.amount || 0);
    });

    const categories = Object.keys(byCategory);
    const amounts = categories.map(cat => byCategory[cat]);

    const colors = [
        '#667eea', '#f5576c', '#4facfe', '#00f2fe',
        '#f093fb', '#764ba2', '#a0a0b8'
    ];

    if (categoryChart) {
        categoryChart.destroy();
    }

    if (categories.length === 0) {
        categoryChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: colors,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
        return;
    }

    categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: categories,
            datasets: [{
                data: amounts,
                backgroundColor: colors.slice(0, categories.length),
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function updateComparisonChart(expenses, incomes) {
    const canvas = document.getElementById('comparisonChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const byDate = {};
    expenses.forEach(expense => {
        if (!expense.date) return;
        const date = expense.date;
        if (!byDate[date]) byDate[date] = {
            expense: 0,
            income: 0
        };
        byDate[date].expense += (expense.amount || 0);
    });

    incomes.forEach(income => {
        if (!income.date) return;
        const date = income.date;
        if (!byDate[date]) byDate[date] = {
            expense: 0,
            income: 0
        };
        byDate[date].income += (income.amount || 0);
    });

    const dates = Object.keys(byDate).sort();
    const expenseData = dates.map(date => byDate[date].expense);
    const incomeData = dates.map(date => byDate[date].income);

    if (comparisonChart) {
        comparisonChart.destroy();
    }

    if (dates.length === 0) {
        comparisonChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Доходы',
                    data: [],
                    backgroundColor: 'rgba(79, 172, 254, 0.7)',
                    borderColor: '#4facfe',
                    borderWidth: 1
                }, {
                    label: 'Расходы',
                    data: [],
                    backgroundColor: 'rgba(245, 87, 108, 0.7)',
                    borderColor: '#f5576c',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
        return;
    }

    comparisonChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dates.map(d => formatDateShort(d)),
            datasets: [{
                label: 'Доходы',
                data: incomeData,
                backgroundColor: 'rgba(79, 172, 254, 0.7)',
                borderColor: '#4facfe',
                borderWidth: 1
            }, {
                label: 'Расходы',
                data: expenseData,
                backgroundColor: 'rgba(245, 87, 108, 0.7)',
                borderColor: '#f5576c',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatAmount(value);
                        }
                    }
                }
            }
        }
    });
}

function updateCategoryBreakdown() {
    const filtered = getFilteredTransactions();
    const expenses = filtered.filter(t => t.type === 'expense');

    const byCategory = {};
    expenses.forEach(expense => {
        const cat = expense.category || 'Другое';
        byCategory[cat] = (byCategory[cat] || 0) + (expense.amount || 0);
    });

    const total = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    const sorted = Object.entries(byCategory)
        .sort((a, b) => b[1] - a[1]);

    if (sorted.length === 0) {
        categoryBreakdown.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">Нет данных</p>';
        return;
    }

    categoryBreakdown.innerHTML = sorted.map(([category, amount]) => {
        const percentage = total > 0 ? ((amount / total) * 100).toFixed(1) : 0;
        const icon = categoryIcons[category] || '•';
        return `
            <div class="category-item">
                <div class="category-info">
                    <span class="category-icon">${icon}</span>
                    <span class="category-name">${category}</span>
                </div>
                <div class="category-stats">
                    <span class="category-amount">${formatAmount(amount)}</span>
                    <span class="category-percentage">${percentage}%</span>
                </div>
            </div>
        `;
    }).join('');
}

function updateRecentTransactions() {
    const filtered = getFilteredTransactions();
    const recent = filtered.slice(0, 10);

    if (recent.length === 0) {
        recentTransactions.innerHTML = '<div class="empty-state"><p>Нет транзакций</p></div>';
        return;
    }

    recentTransactions.innerHTML = recent.map(transaction => {
        const isIncome = transaction.type === 'income';
        const icon = isIncome ? '+' : '−';
        const typeLabel = isIncome ? 'Доход' : transaction.category || 'Расход';
        
        return `
            <div class="expense-item ${isIncome ? 'income-item' : ''}">
                <div class="expense-category">${icon}</div>
                <div class="expense-details">
                    <div class="expense-category-name">${typeLabel}</div>
                    <div class="expense-date">${formatDate(transaction.date)}</div>
                </div>
                <div class="expense-amount ${isIncome ? 'income-amount' : ''}">
                    ${isIncome ? '+' : '−'}${formatAmount(transaction.amount || 0)}
                </div>
            </div>
        `;
    }).join('');
}

// Format amount in UZS
function formatAmount(amount) {
    return new Intl.NumberFormat('ru-RU', {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount) + ' сум';
}

// Format date
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00');
    return new Intl.DateTimeFormat('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(date);
}

function formatDateShort(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00');
    return new Intl.DateTimeFormat('ru-RU', {
        month: 'short',
        day: 'numeric'
    }).format(date);
}

// Update key insights
function updateKeyInsights() {
    const filtered = getFilteredTransactions();
    const expenses = filtered.filter(t => t.type === 'expense');
    
    // Average daily spending
    const avgDailyInsight = document.getElementById('avgDailyInsight');
    const avgDailyValue = document.getElementById('avgDailyValue');
    if (avgDailyInsight) {
        if (expenses.length > 0) {
            const total = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
            const days = new Set(expenses.map(e => e.date)).size || 1;
            const avg = Math.round(total / days);
            if (avgDailyValue) {
                avgDailyValue.textContent = formatAmount(avg);
                avgDailyValue.style.fontSize = '1.75rem';
                avgDailyValue.style.fontWeight = '700';
            }
            avgDailyInsight.style.display = 'block';
        } else {
            avgDailyInsight.style.display = 'none';
        }
    }
    
    // Top category
    const topCategoryInsight = document.getElementById('topCategoryInsight');
    const topCategoryValue = document.getElementById('topCategoryValue');
    if (topCategoryInsight) {
        if (expenses.length > 0) {
            const byCategory = {};
            expenses.forEach(e => {
                const cat = e.category || 'Другое';
                byCategory[cat] = (byCategory[cat] || 0) + (e.amount || 0);
            });
            const top = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
            if (topCategoryValue && top) {
                topCategoryValue.innerHTML = `<div style="font-size: 1.25rem; font-weight: 700; margin-bottom: 4px;">${top[0]}</div><div style="font-size: 1rem; color: var(--text-secondary);">${formatAmount(top[1])}</div>`;
            }
            topCategoryInsight.style.display = 'block';
        } else {
            topCategoryInsight.style.display = 'none';
        }
    }
    
    // Trend
    const trendInsight = document.getElementById('trendInsight');
    const trendValue = document.getElementById('trendValue');
    if (trendInsight) {
        if (expenses.length > 0) {
            const now = new Date();
            const currentMonth = expenses.filter(e => {
                const date = new Date(e.date + 'T00:00:00');
                return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
            });
            const prevMonth = expenses.filter(e => {
                const date = new Date(e.date + 'T00:00:00');
                const prev = new Date(now.getFullYear(), now.getMonth() - 1);
                return date.getMonth() === prev.getMonth() && date.getFullYear() === prev.getFullYear();
            });
            
            const currentTotal = currentMonth.reduce((sum, e) => sum + (e.amount || 0), 0);
            const prevTotal = prevMonth.reduce((sum, e) => sum + (e.amount || 0), 0);
            
            if (prevTotal > 0 && trendValue) {
                const change = ((currentTotal - prevTotal) / prevTotal) * 100;
                const trendIcon = change > 0 ? '📈' : change < 0 ? '📉' : '➡️';
                const trendText = change > 0 ? `+${Math.round(change)}%` : change < 0 ? `${Math.round(change)}%` : 'Без изменений';
                trendValue.innerHTML = `<div style="font-size: 2rem; margin-bottom: 4px;">${trendIcon}</div><div style="font-size: 1.25rem; font-weight: 700;">${trendText}</div>`;
                trendValue.style.color = change > 0 ? 'var(--danger)' : change < 0 ? 'var(--success)' : 'var(--text-secondary)';
            } else if (trendValue) {
                trendValue.innerHTML = '<div style="font-size: 1rem;">Недостаточно данных</div>';
                trendValue.style.color = 'var(--text-secondary)';
            }
            trendInsight.style.display = 'block';
        } else {
            trendInsight.style.display = 'none';
        }
    }
}

// Logout handler
logoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
        window.location.href = 'auth.html';
    } catch (error) {
        console.error('Logout error:', error);
        alert('Ошибка при выходе');
    }
});