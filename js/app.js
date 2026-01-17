// Main Application with Firestore
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import {
    collection,
    addDoc,
    deleteDoc,
    doc,
    query,
    where,
    onSnapshot,
    Timestamp
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

// Lazy load modules only when authenticated
let FinancialInsights = null;
let UserSettings = null;

async function loadModules() {
    if (!FinancialInsights) {
        const insightsModule = await import('./insights.js');
        FinancialInsights = insightsModule.FinancialInsights;
    }
    if (!UserSettings) {
        const settingsModule = await import('./user-settings.js');
        UserSettings = settingsModule.UserSettings;
    }
}

// DOM Elements
const expenseForm = document.getElementById('expenseForm');
const amountInput = document.getElementById('amount');
const categoryInput = document.getElementById('category');
const descriptionInput = document.getElementById('description');
const dateInput = document.getElementById('date');
const expensesList = document.getElementById('expensesList');
const totalExpenseEl = document.getElementById('totalExpense');
const totalIncomeEl = document.getElementById('totalIncome');
const balanceEl = document.getElementById('balance');
const filterCategorySelect = document.getElementById('filterCategory');
const filterTypeSelect = document.getElementById('filterType');
const clearAllBtn = document.getElementById('clearAll');
const logoutBtn = document.getElementById('logoutBtn');
const userEmailEl = document.getElementById('userEmail');
const transactionTabs = document.querySelectorAll('.transaction-tab');
const categoryGroup = document.getElementById('categoryGroup');
const descriptionGroup = document.getElementById('descriptionGroup');
const submitBtn = document.getElementById('submitBtn');

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

// Global Variables
let expenses = [];
let incomes = [];
let allTransactions = [];
let currentUser = null;
let unsubscribeExpenses = null;
let unsubscribeIncomes = null;
let currentTransactionType = 'expense';
let userSettings = null;
let userSettingsManager = null;

// Auth State Observer - Fast redirect for unauthenticated users
let authChecked = false;

onAuthStateChanged(auth, async (user) => {
    if (authChecked) return; // Prevent multiple redirects
    
    if (!user) {
        // Fast redirect for unauthenticated users - don't wait for modules
        const currentPath = window.location.pathname;
        if (currentPath !== '/auth.html' && !currentPath.includes('auth.html')) {
            authChecked = true;
            window.location.replace('/auth.html');
        }
        return;
    }
    
    authChecked = true;
    
    // Load modules only after authentication confirmed
    await loadModules();
    
    currentUser = user;
    if (userEmailEl) {
        userEmailEl.textContent = user.email;
    }
    console.log('User authenticated:', user.email);

    // Check onboarding (only on index page)
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname === '') {
        try {
            userSettingsManager = new UserSettings(user.uid);
            const hasOnboarding = await userSettingsManager.hasCompletedOnboarding();
            
            if (!hasOnboarding) {
                window.location.href = '/onboarding.html';
                return;
            }

            // Load user settings
            await loadUserSettings();
        } catch (error) {
            console.error('Error loading user settings:', error);
        }
    }
    
    // Load user's transactions
    loadTransactions();
}, (error) => {
    console.error('Auth error:', error);
    // On auth error, redirect to auth page
    if (window.location.pathname !== '/auth.html' && !window.location.pathname.includes('auth.html')) {
        window.location.replace('/auth.html');
    }
});

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    setDefaultDate();
    setupTransactionTabs();
    initAnimations();
});

// Initialize WOW animations
function initAnimations() {
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

// Setup transaction type tabs
function setupTransactionTabs() {
    transactionTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            transactionTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentTransactionType = tab.dataset.type;
            
            if (currentTransactionType === 'income') {
                categoryGroup.style.display = 'none';
                descriptionGroup.style.display = 'block';
                categoryInput.removeAttribute('required');
                descriptionInput.setAttribute('required', 'required');
                submitBtn.textContent = 'Добавить доход';
            } else {
                categoryGroup.style.display = 'block';
                descriptionGroup.style.display = 'none';
                categoryInput.setAttribute('required', 'required');
                descriptionInput.removeAttribute('required');
                submitBtn.textContent = 'Добавить расход';
            }
        });
    });
}

// Set default date
function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
}

// Load transactions from Firestore with real-time updates
function loadTransactions() {
    if (!currentUser) return;

    // Unsubscribe from previous listeners if exist
    if (unsubscribeExpenses) unsubscribeExpenses();
    if (unsubscribeIncomes) unsubscribeIncomes();

    const expensesRef = collection(db, 'expenses');
    const incomesRef = collection(db, 'incomes');
    
    const expensesQuery = query(expensesRef, where('userId', '==', currentUser.uid));
    const incomesQuery = query(incomesRef, where('userId', '==', currentUser.uid));

    // Load expenses
    unsubscribeExpenses = onSnapshot(expensesQuery, (querySnapshot) => {
        expenses = [];
        querySnapshot.forEach((doc) => {
            expenses.push({
                id: doc.id,
                type: 'expense',
                ...doc.data()
            });
        });
        expenses.sort((a, b) => {
            const aTime = a.timestamp?.seconds || 0;
            const bTime = b.timestamp?.seconds || 0;
            return bTime - aTime;
        });
        updateAllTransactions();
    }, (error) => {
        console.error('Error loading expenses:', error);
        alert('Ошибка загрузки расходов: ' + error.message);
    });

    // Load incomes
    unsubscribeIncomes = onSnapshot(incomesQuery, (querySnapshot) => {
        incomes = [];
        querySnapshot.forEach((doc) => {
            incomes.push({
                id: doc.id,
                type: 'income',
                ...doc.data()
            });
        });
        incomes.sort((a, b) => {
            const aTime = a.timestamp?.seconds || 0;
            const bTime = b.timestamp?.seconds || 0;
            return bTime - aTime;
        });
        updateAllTransactions();
    }, (error) => {
        console.error('Error loading incomes:', error);
        alert('Ошибка загрузки доходов: ' + error.message);
    });
}

async function loadUserSettings() {
    if (!userSettingsManager) return;
    userSettings = await userSettingsManager.getSettings();
    
    // Update subscription badge
    const subscriptionBadge = document.getElementById('subscriptionBadge');
    if (subscriptionBadge) {
        if (userSettings.subscription === 'pro') {
            subscriptionBadge.textContent = 'Pro';
            subscriptionBadge.style.display = 'inline-block';
            subscriptionBadge.className = 'subscription-badge pro';
        } else {
            subscriptionBadge.textContent = 'Free';
            subscriptionBadge.style.display = 'inline-block';
            subscriptionBadge.className = 'subscription-badge free';
        }
    }
}

function updateAllTransactions() {
    allTransactions = [...expenses, ...incomes];
    allTransactions.sort((a, b) => {
        const aTime = a.timestamp?.seconds || 0;
        const bTime = b.timestamp?.seconds || 0;
        return bTime - aTime;
    });
    renderTransactions();
    updateStats();
    updateInsights();
    updateBudgets();
}

// Form submission
expenseForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const amount = parseFloat(amountInput.value);
    const date = dateInput.value;

    if (!amount || !date) {
        alert('Пожалуйста, заполните все обязательные поля');
        return;
    }

    if (amount <= 0) {
        alert('Сумма должна быть больше нуля');
        return;
    }

    if (currentTransactionType === 'expense') {
        const category = categoryInput.value;
        if (!category) {
            alert('Пожалуйста, выберите категорию');
            return;
        }
    await addExpenseToFirestore(amount, category, date);
    } else {
        const description = descriptionInput.value || 'Доход';
        await addIncomeToFirestore(amount, description, date);
    }

    expenseForm.reset();
    setDefaultDate();
    amountInput.focus();
});

// Add expense to Firestore
async function addExpenseToFirestore(amount, category, date) {
    if (!currentUser) {
        alert('Пожалуйста, войдите в систему');
        return;
    }

    try {
        const expenseData = {
            amount: amount,
            category: category,
            date: date,
            userId: currentUser.uid,
            timestamp: Timestamp.now()
        };

        await addDoc(collection(db, 'expenses'), expenseData);
        console.log('Expense added successfully');
    } catch (error) {
        console.error('Error adding expense:', error);
        alert('Ошибка при добавлении расхода: ' + error.message);
    }
}

// Add income to Firestore
async function addIncomeToFirestore(amount, description, date) {
    if (!currentUser) {
        alert('Пожалуйста, войдите в систему');
        return;
    }

    try {
        const incomeData = {
            amount: amount,
            description: description,
            date: date,
            userId: currentUser.uid,
            timestamp: Timestamp.now()
        };

        await addDoc(collection(db, 'incomes'), incomeData);
        console.log('Income added successfully');
    } catch (error) {
        console.error('Error adding income:', error);
        alert('Ошибка при добавлении дохода: ' + error.message);
    }
}

// Delete transaction from Firestore
async function deleteTransaction(id, type) {
    if (confirm('Вы уверены, что хотите удалить эту запись?')) {
        try {
            const collectionName = type === 'expense' ? 'expenses' : 'incomes';
            await deleteDoc(doc(db, collectionName, id));
            console.log('Transaction deleted successfully');
        } catch (error) {
            console.error('Error deleting transaction:', error);
            alert('Ошибка при удалении записи: ' + error.message);
        }
    }
}

// Render transactions
function renderTransactions() {
    const typeFilter = filterTypeSelect.value;
    const categoryFilter = filterCategorySelect.value;

    let filtered = allTransactions;

    // Filter by type
    if (typeFilter === 'expense') {
        filtered = filtered.filter(t => t.type === 'expense');
    } else if (typeFilter === 'income') {
        filtered = filtered.filter(t => t.type === 'income');
    }

    // Filter by category (only for expenses)
    if (categoryFilter !== 'all') {
        filtered = filtered.filter(t => {
            if (t.type === 'expense') {
                return t.category === categoryFilter;
            }
            return true;
        });
    }

    if (filtered.length === 0) {
        expensesList.innerHTML = `
            <div class="empty-state">
                <p>Нет транзакций</p>
                <p class="empty-state-subtitle">Добавьте первую запись выше</p>
            </div>
        `;
        return;
    }

    expensesList.innerHTML = filtered.map(transaction => {
        const isIncome = transaction.type === 'income';
        const icon = isIncome ? '+' : '−';
        const label = isIncome ? (transaction.description || 'Доход') : transaction.category;
        
        return `
            <div class="expense-item ${isIncome ? 'income-item' : ''}">
                <div class="expense-category">${icon}</div>
            <div class="expense-details">
                    <div class="expense-category-name">${label}</div>
                    <div class="expense-date">${formatDate(transaction.date)}</div>
                </div>
                <div class="expense-amount ${isIncome ? 'income-amount' : ''}">
                    ${isIncome ? '+' : '−'}${formatAmount(transaction.amount)}
                </div>
                <button class="btn-delete" onclick="deleteTransaction('${transaction.id}', '${transaction.type}')">Удалить</button>
            </div>
        `;
    }).join('');
}

// Update statistics
function updateStats() {
    const totalExpense = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
    const totalIncome = incomes.reduce((sum, income) => sum + (income.amount || 0), 0);
    const balance = totalIncome - totalExpense;

    // Animate values
    if (totalExpenseEl) animateValue(totalExpenseEl, 0, totalExpense, 800, formatAmount);
    if (totalIncomeEl) animateValue(totalIncomeEl, 0, totalIncome, 800, formatAmount);
    if (balanceEl) {
        animateValue(balanceEl, 0, balance, 800, formatAmount);
        balanceEl.className = 'stat-value balance ' + (balance >= 0 ? 'positive' : 'negative');
    }
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

// Filter handlers
filterTypeSelect.addEventListener('change', () => {
    if (filterTypeSelect.value === 'income') {
        filterCategorySelect.style.display = 'none';
        filterCategorySelect.value = 'all';
    } else {
        filterCategorySelect.style.display = 'block';
    }
    renderTransactions();
});

filterCategorySelect.addEventListener('change', () => {
    renderTransactions();
});

// Clear all transactions (if button exists)
if (clearAllBtn) {
clearAllBtn.addEventListener('click', async () => {
        if (allTransactions.length === 0) {
        alert('Нет записей для удаления');
        return;
    }

    if (confirm('Вы уверены, что хотите удалить все записи? Это действие нельзя отменить.')) {
        try {
                const deletePromises = allTransactions.map(transaction => {
                    const collectionName = transaction.type === 'expense' ? 'expenses' : 'incomes';
                    return deleteDoc(doc(db, collectionName, transaction.id));
                });
            await Promise.all(deletePromises);
                console.log('All transactions deleted');
        } catch (error) {
                console.error('Error clearing transactions:', error);
            alert('Ошибка при удалении записей: ' + error.message);
        }
    }
});
}

// Logout handler
logoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
        console.log('User signed out');
        window.location.href = 'auth.html';
    } catch (error) {
        console.error('Logout error:', error);
        alert('Ошибка при выходе: ' + error.message);
    }
});

// Update insights
function updateInsights() {
    if (!userSettings || !userSettingsManager || !FinancialInsights) return;
    
    const insights = new FinancialInsights(allTransactions, userSettings);
    const allInsights = insights.getAllInsights(userSettings.budgets || {});
    
    // Update daily spending limit
    const dailyRemainingEl = document.getElementById('dailyRemaining');
    const daysRemainingEl = document.getElementById('daysRemaining');
    const heroProgressEl = document.getElementById('heroProgress');
    const heroTipEl = document.getElementById('heroTip');
    
    if (dailyRemainingEl) {
        if (allInsights.dailyLimit.dailyRemaining > 0) {
            animateValue(dailyRemainingEl, 0, allInsights.dailyLimit.dailyRemaining, 1000, formatAmount);
        } else {
            dailyRemainingEl.textContent = formatAmount(0);
        }
        if (daysRemainingEl) {
            daysRemainingEl.textContent = allInsights.dailyLimit.daysRemaining || 0;
        }
        
        // Progress bar
        if (heroProgressEl) {
            const percentage = Math.min(100, (allInsights.dailyLimit.dailyRemaining / allInsights.dailyLimit.dailyLimit) * 100);
            setTimeout(() => {
                heroProgressEl.style.width = percentage + '%';
                heroProgressEl.className = 'hero-progress ' + (percentage > 50 ? 'good' : percentage > 25 ? 'warning' : 'danger');
            }, 100);
        }
        
        // Tip
        if (heroTipEl) {
            if (allInsights.dailyLimit.dailyRemaining < allInsights.dailyLimit.dailyLimit * 0.3) {
                heroTipEl.textContent = '💡 Совет: Сегодня лучше контролировать расходы';
            } else if (allInsights.dailyLimit.dailyRemaining > allInsights.dailyLimit.dailyLimit * 1.5) {
                heroTipEl.textContent = '💡 Отлично! У вас хороший запас';
            } else {
                heroTipEl.textContent = '';
            }
        }
    }
    
    // Update forecast
    const forecastCard = document.getElementById('forecastCard');
    const forecastBalanceEl = document.getElementById('forecastBalance');
    const forecastDetailsEl = document.getElementById('forecastDetails');
    const forecastChartEl = document.getElementById('forecastChart');
    
    if (forecastCard && forecastBalanceEl && allInsights.forecast.monthlyIncome > 0) {
        const forecast = allInsights.forecast;
        animateValue(forecastBalanceEl, 0, forecast.forecastBalance, 1000, formatAmount);
        forecastCard.style.display = 'block';
        
        if (forecastDetailsEl) {
            forecastDetailsEl.innerHTML = `
                <div><strong>Прогноз расходов:</strong> ${formatAmount(forecast.projectedSpending)}</div>
                <div><strong>Текущие расходы:</strong> ${formatAmount(forecast.currentSpending)}</div>
                <div><strong>Дней осталось:</strong> ${forecast.daysRemaining}</div>
            `;
        }
        
        // Forecast chart
        if (forecastChartEl) {
            const days = Math.min(forecast.daysRemaining, 7);
            const avgDaily = forecast.currentSpending / (30 - forecast.daysRemaining);
            forecastChartEl.innerHTML = Array.from({length: days}, (_, i) => {
                const height = Math.random() * 40 + 20;
                return `<div class="forecast-chart-bar" style="height: ${height}%"></div>`;
            }).join('');
        }
    }
    
    // Update comparison
    updateComparison(allInsights.comparison);
    
    // Update stats with changes
    updateStatsWithChanges(allInsights.comparison);
    
    // Show overspending alerts
    updateOverspendingAlerts(allInsights.overspending);
    
    // Show Pro CTA if Free user
    showProCTA();
}

// Animate number value
function animateValue(element, start, end, duration, formatter) {
    if (!element) return;
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
            current = end;
            clearInterval(timer);
        }
        element.textContent = formatter ? formatter(current) : Math.round(current);
    }, 16);
}

// Update comparison card
function updateComparison(comparison) {
    const comparisonCard = document.getElementById('comparisonCard');
    const comparisonContent = document.getElementById('comparisonContent');
    
    if (!comparisonCard || !comparisonContent || comparison.previous === 0) return;
    
    const trendIcon = comparison.trend === 'up' ? '📈' : comparison.trend === 'down' ? '📉' : '➡️';
    const trendColor = comparison.trend === 'up' ? 'var(--danger)' : comparison.trend === 'down' ? 'var(--success)' : 'var(--text-secondary)';
    
    comparisonContent.innerHTML = `
        <div class="comparison-item">
            <div class="comparison-item-label">Текущий месяц</div>
            <div class="comparison-item-value">${formatAmount(comparison.current)}</div>
        </div>
        <div class="comparison-item">
            <div class="comparison-item-label">Прошлый месяц</div>
            <div class="comparison-item-value">${formatAmount(comparison.previous)}</div>
        </div>
        <div class="comparison-item">
            <div class="comparison-item-label">Изменение</div>
            <div class="comparison-item-value" style="color: ${trendColor}">
                ${trendIcon} ${Math.abs(comparison.percentage)}%
            </div>
            <div class="comparison-item-change" style="color: ${trendColor}">
                ${comparison.difference > 0 ? '+' : ''}${formatAmount(comparison.difference)}
            </div>
        </div>
    `;
    
    comparisonCard.style.display = 'block';
}

// Update stats with changes
function updateStatsWithChanges(comparison) {
    const incomeChangeEl = document.getElementById('incomeChange');
    const expenseChangeEl = document.getElementById('expenseChange');
    const balanceChangeEl = document.getElementById('balanceChange');
    
    if (expenseChangeEl && comparison.previous > 0) {
        const changeText = comparison.percentage !== 0 
            ? `${comparison.percentage > 0 ? '+' : ''}${comparison.percentage}% к прошлому месяцу`
            : 'Без изменений';
        expenseChangeEl.textContent = changeText;
        expenseChangeEl.style.color = comparison.trend === 'up' ? 'var(--danger)' : comparison.trend === 'down' ? 'var(--success)' : 'var(--text-secondary)';
    }
}

// Show Pro CTA
function showProCTA() {
    const proCTA = document.getElementById('proCTA');
    const upgradeBtn = document.getElementById('upgradeBtn');
    const upgradeCTA = document.getElementById('upgradeCTA');
    
    if (!userSettings || userSettings.subscription === 'pro') {
        if (proCTA) proCTA.style.display = 'none';
        if (upgradeBtn) upgradeBtn.style.display = 'none';
        return;
    }
    
    // Show CTA after some transactions
    if (allTransactions.length >= 3) {
        if (proCTA) proCTA.style.display = 'block';
    }
    
    if (upgradeBtn) upgradeBtn.style.display = 'inline-block';
    
    // Handle upgrade clicks
    if (upgradeCTA) {
        upgradeCTA.addEventListener('click', () => {
            alert('Переход на страницу оплаты...\n\nВ будущем здесь будет интеграция с платежной системой (Stripe)');
        });
    }
    
    if (upgradeBtn) {
        upgradeBtn.addEventListener('click', () => {
            alert('Переход на страницу оплаты...\n\nВ будущем здесь будет интеграция с платежной системой (Stripe)');
        });
    }
}

// Update overspending alerts
function updateOverspendingAlerts(overspending) {
    const alertsContainer = document.getElementById('overspendingAlerts');
    if (!alertsContainer) return;
    
    if (overspending.length === 0) {
        alertsContainer.innerHTML = '';
        return;
    }
    
    alertsContainer.innerHTML = overspending.map(item => {
        const statusClass = item.status === 'over' ? 'alert-danger' : 'alert-warning';
        return `
            <div class="alert ${statusClass}">
                <strong>${item.category}</strong>: превышен бюджет на ${formatAmount(Math.abs(item.remaining))}
                (${item.percentage}% использовано)
            </div>
        `;
    }).join('');
}

// Update budgets display
function updateBudgets() {
    if (!userSettings || !userSettings.budgets) return;
    
    const budgetsSection = document.getElementById('budgetsSection');
    const budgetsList = document.getElementById('budgetsList');
    
    if (!budgetsSection || !budgetsList) return;
    
    const budgets = userSettings.budgets;
    if (Object.keys(budgets).length === 0) {
        budgetsSection.style.display = 'none';
        return;
    }
    
    budgetsSection.style.display = 'block';
    
    if (!FinancialInsights) return;
    const insights = new FinancialInsights(allTransactions, userSettings);
    const overspending = insights.getCategoryOverspending(budgets);
    const overspendingMap = {};
    overspending.forEach(item => {
        overspendingMap[item.category] = item;
    });
    
    budgetsList.innerHTML = Object.keys(budgets).map(category => {
        const budget = budgets[category];
        const status = overspendingMap[category];
        const percentage = status ? status.percentage : 0;
        const statusClass = percentage >= 100 ? 'danger' : percentage >= 80 ? 'warning' : 'ok';
        
        return `
            <div class="budget-item">
                <div class="budget-info">
                    <span class="budget-category">${category}</span>
                    <span class="budget-amount">${formatAmount(budget)}</span>
                </div>
                <div class="budget-progress">
                    <div class="budget-progress-bar ${statusClass}" style="width: ${Math.min(100, percentage)}%"></div>
                </div>
                ${status ? `<div class="budget-status ${statusClass}">${status.percentage}% использовано</div>` : ''}
            </div>
        `;
    }).join('');
}

// Budget modal handlers
const editBudgetsBtn = document.getElementById('editBudgetsBtn');
const budgetModal = document.getElementById('budgetModal');
const closeBudgetModal = document.getElementById('closeBudgetModal');
const cancelBudgetBtn = document.getElementById('cancelBudgetBtn');
const saveBudgetBtn = document.getElementById('saveBudgetBtn');
const budgetInputs = document.getElementById('budgetInputs');

if (editBudgetsBtn) {
    editBudgetsBtn.addEventListener('click', () => {
        if (!budgetModal) return;
        budgetModal.style.display = 'flex';
        
        const categories = ['Продукты', 'Транспорт', 'Развлечения', 'Здоровье', 'Коммунальные услуги', 'Одежда', 'Другое'];
        const currentBudgets = userSettings?.budgets || {};
        
        budgetInputs.innerHTML = categories.map(cat => `
            <div class="form-group">
                <label class="form-label">${cat}</label>
                <input type="number" class="form-input budget-input" data-category="${cat}" 
                       value="${currentBudgets[cat] || ''}" placeholder="Лимит (сум)">
            </div>
        `).join('');
    });
}

if (closeBudgetModal) {
    closeBudgetModal.addEventListener('click', () => {
        if (budgetModal) budgetModal.style.display = 'none';
    });
}

if (cancelBudgetBtn) {
    cancelBudgetBtn.addEventListener('click', () => {
        if (budgetModal) budgetModal.style.display = 'none';
    });
}

if (saveBudgetBtn) {
    saveBudgetBtn.addEventListener('click', async () => {
        if (!userSettingsManager) return;
        
        const inputs = budgetInputs.querySelectorAll('.budget-input');
        const budgets = {};
        
        inputs.forEach(input => {
            const category = input.dataset.category;
            const value = parseFloat(input.value);
            if (value > 0) {
                budgets[category] = value;
            }
        });
        
        await userSettingsManager.updateBudgets(budgets);
        userSettings = await userSettingsManager.getSettings();
        updateBudgets();
        updateInsights();
        
        if (budgetModal) budgetModal.style.display = 'none';
    });
}

// Make functions available globally
window.deleteTransaction = deleteTransaction;