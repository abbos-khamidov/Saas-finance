from django.contrib import admin
from .models import User, UserSettings, Transaction, FinancialGoal, Insight


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['id', 'email', 'name', 'created_at']
    search_fields = ['email', 'name']


@admin.register(UserSettings)
class UserSettingsAdmin(admin.ModelAdmin):
    list_display = ['user', 'monthly_income', 'onboarding_completed']
    list_filter = ['onboarding_completed']


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'type', 'amount', 'category', 'date']
    list_filter = ['type', 'date']
    search_fields = ['category', 'description']


@admin.register(FinancialGoal)
class FinancialGoalAdmin(admin.ModelAdmin):
    list_display = ['user', 'title', 'target_amount', 'current_amount', 'status']
    list_filter = ['status']
    search_fields = ['title', 'description']


@admin.register(Insight)
class InsightAdmin(admin.ModelAdmin):
    list_display = ['user', 'date', 'daily_limit', 'forecast_balance']
