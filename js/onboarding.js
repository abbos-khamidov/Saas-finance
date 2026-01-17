// Onboarding Flow
import { auth } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { UserSettings } from './user-settings.js';

const onboardingForm = document.getElementById('onboardingForm');
let currentUser = null;

// Check auth state
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
    } else {
        window.location.href = 'auth.html';
    }
});

// Handle form submission
onboardingForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const monthlyIncome = document.getElementById('monthlyIncome').value;
    const fixedExpenses = document.getElementById('fixedExpenses').value;
    const financialGoal = document.getElementById('financialGoal').value;

    if (!monthlyIncome || !fixedExpenses) {
        alert('Пожалуйста, заполните обязательные поля');
        return;
    }

    const userSettings = new UserSettings(currentUser.uid);
    const success = await userSettings.saveOnboarding({
        monthlyIncome,
        fixedExpenses,
        financialGoal
    });

    if (success) {
        // Show welcome screen
        showWelcomeScreen();
    } else {
        alert('Ошибка при сохранении данных. Попробуйте еще раз.');
    }
});

// Show welcome screen with wow effect
function showWelcomeScreen() {
    const welcomeHTML = `
        <div class="welcome-overlay">
            <div class="welcome-card">
                <div class="welcome-icon">🎉</div>
                <h2 class="welcome-title">Добро пожаловать!</h2>
                <p class="welcome-text">Ваш профиль настроен. Теперь вы можете:</p>
                <ul class="welcome-features">
                    <li>✓ Видеть сколько можно потратить сегодня</li>
                    <li>✓ Получать прогнозы до конца месяца</li>
                    <li>✓ Контролировать бюджеты по категориям</li>
                    <li>✓ Анализировать свои финансы</li>
                </ul>
                <button class="btn btn-primary btn-large" id="startUsingBtn">Начать использовать</button>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', welcomeHTML);
    
    const startBtn = document.getElementById('startUsingBtn');
    startBtn.addEventListener('click', () => {
        document.querySelector('.welcome-overlay').remove();
        window.location.href = 'index.html';
    });
    
    // Auto close after 5 seconds
    setTimeout(() => {
        const overlay = document.querySelector('.welcome-overlay');
        if (overlay) {
            overlay.remove();
            window.location.href = 'index.html';
        }
    }, 5000);
}