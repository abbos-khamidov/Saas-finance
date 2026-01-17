// Authentication Module
import { auth } from './firebase-config.js';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

// DOM Elements
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginTab = document.getElementById('loginTab');
const registerTab = document.getElementById('registerTab');
const loginError = document.getElementById('loginError');
const registerError = document.getElementById('registerError');
const registerSuccess = document.getElementById('registerSuccess');

// Tab Switching
loginTab.addEventListener('click', () => {
    switchTab('login');
});

registerTab.addEventListener('click', () => {
    switchTab('register');
});

function switchTab(tab) {
    // Clear messages
    clearMessages();

    if (tab === 'login') {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
    } else {
        registerTab.classList.add('active');
        loginTab.classList.remove('active');
        registerForm.classList.add('active');
        loginForm.classList.remove('active');
    }
}

// Login Form Handler
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessages();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        showLoading(loginForm, true);
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log('User logged in:', userCredential.user);

        // Redirect to main app
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Login error:', error);
        showError(loginError, getErrorMessage(error.code));
    } finally {
        showLoading(loginForm, false);
    }
});

// Register Form Handler
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessages();

    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value;

    // Validate passwords match
    if (password !== passwordConfirm) {
        showError(registerError, 'Пароли не совпадают');
        return;
    }

    try {
        showLoading(registerForm, true);
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log('User registered:', userCredential.user);

        showSuccess(registerSuccess, 'Аккаунт успешно создан! Перенаправление...');

        // Redirect after short delay
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
    } catch (error) {
        console.error('Registration error:', error);
        showError(registerError, getErrorMessage(error.code));
    } finally {
        showLoading(registerForm, false);
    }
});

// Auth State Observer
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is already logged in, redirect to app
        console.log('User already authenticated, redirecting...');
        window.location.href = 'index.html';
    }
});

// Helper Functions
function showError(element, message) {
    element.textContent = message;
    element.style.display = 'block';
}

function showSuccess(element, message) {
    element.textContent = message;
    element.style.display = 'block';
}

function clearMessages() {
    loginError.style.display = 'none';
    registerError.style.display = 'none';
    registerSuccess.style.display = 'none';
    loginError.textContent = '';
    registerError.textContent = '';
    registerSuccess.textContent = '';
}

function showLoading(form, isLoading) {
    const button = form.querySelector('button[type="submit"]');
    if (isLoading) {
        button.disabled = true;
        button.textContent = 'Загрузка...';
    } else {
        button.disabled = false;
        button.textContent = form.id === 'loginForm' ? 'Войти' : 'Зарегистрироваться';
    }
}

function getErrorMessage(errorCode) {
    const errorMessages = {
        'auth/email-already-in-use': 'Этот email уже используется',
        'auth/invalid-email': 'Неверный формат email',
        'auth/operation-not-allowed': 'Операция не разрешена',
        'auth/weak-password': 'Слишком слабый пароль (минимум 6 символов)',
        'auth/user-disabled': 'Этот аккаунт заблокирован',
        'auth/user-not-found': 'Пользователь не найден',
        'auth/wrong-password': 'Неверный пароль',
        'auth/invalid-credential': 'Неверный email или пароль',
        'auth/too-many-requests': 'Слишком много попыток. Попробуйте позже',
        'auth/network-request-failed': 'Ошибка сети. Проверьте подключение к интернету'
    };

    return errorMessages[errorCode] || 'Произошла ошибка. Попробуйте снова';
}
