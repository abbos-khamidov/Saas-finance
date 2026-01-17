// User Settings & Onboarding Management
import { auth, db } from './firebase-config.js';
import { doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

export class UserSettings {
    constructor(userId) {
        this.userId = userId;
        this.settingsRef = doc(db, 'userSettings', userId);
    }

    // Check if user completed onboarding
    async hasCompletedOnboarding() {
        try {
            const docSnap = await getDoc(this.settingsRef);
            if (!docSnap.exists()) {
                return false;
            }
            const data = docSnap.data();
            return data.onboardingCompleted === true;
        } catch (error) {
            console.error('Error checking onboarding:', error);
            return false;
        }
    }

    // Get user settings
    async getSettings() {
        try {
            const docSnap = await getDoc(this.settingsRef);
            if (docSnap.exists()) {
                return docSnap.data();
            }
            return this.getDefaultSettings();
        } catch (error) {
            console.error('Error getting settings:', error);
            return this.getDefaultSettings();
        }
    }

    // Save onboarding data
    async saveOnboarding(data) {
        try {
            const settings = {
                monthlyIncome: parseFloat(data.monthlyIncome) || 0,
                fixedExpenses: parseFloat(data.fixedExpenses) || 0,
                financialGoal: data.financialGoal || '',
                onboardingCompleted: true,
                createdAt: new Date().toISOString(),
                subscription: 'free' // Default to free
            };

            await setDoc(this.settingsRef, settings, { merge: true });
            return true;
        } catch (error) {
            console.error('Error saving onboarding:', error);
            return false;
        }
    }

    // Update budgets
    async updateBudgets(budgets) {
        try {
            await updateDoc(this.settingsRef, {
                budgets: budgets,
                budgetsUpdatedAt: new Date().toISOString()
            });
            return true;
        } catch (error) {
            console.error('Error updating budgets:', error);
            return false;
        }
    }

    // Update subscription tier
    async updateSubscription(tier) {
        try {
            await updateDoc(this.settingsRef, {
                subscription: tier,
                subscriptionUpdatedAt: new Date().toISOString()
            });
            return true;
        } catch (error) {
            console.error('Error updating subscription:', error);
            return false;
        }
    }

    // Get default settings
    getDefaultSettings() {
        return {
            monthlyIncome: 0,
            fixedExpenses: 0,
            financialGoal: '',
            onboardingCompleted: false,
            subscription: 'free',
            budgets: {}
        };
    }

    // Check if user has Pro subscription
    async isPro() {
        try {
            const settings = await this.getSettings();
            return settings.subscription === 'pro';
        } catch (error) {
            return false;
        }
    }
}