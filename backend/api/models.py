from django.db import models
from django.utils import timezone


class User(models.Model):
    """Пользователь приложения"""
    email = models.EmailField(unique=True)
    password_hash = models.CharField(max_length=255)
    name = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'users'


class UserSettings(models.Model):
    """Настройки пользователя"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='settings')
    monthly_income = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    fixed_expenses = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    financial_goal = models.TextField(blank=True)
    onboarding_completed = models.BooleanField(default=False)
    budgets = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'user_settings'


class Transaction(models.Model):
    """Транзакция (доход или расход)"""
    TRANSACTION_TYPES = [
        ('expense', 'Расход'),
        ('income', 'Доход'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='transactions')
    type = models.CharField(max_length=10, choices=TRANSACTION_TYPES)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    category = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    date = models.DateField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'transactions'
        ordering = ['-date', '-created_at']
        indexes = [
            models.Index(fields=['user', '-date']),
            models.Index(fields=['user', 'type']),
        ]


class Category(models.Model):
    """Пользовательская категория расходов"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='categories')
    name = models.CharField(max_length=100)
    is_default = models.BooleanField(default=False)  # Системные категории
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'categories'
        unique_together = ['user', 'name']
        ordering = ['is_default', 'name']

    def __str__(self):
        return self.name


class FinancialGoal(models.Model):
    """Финансовая цель"""
    STATUS_CHOICES = [
        ('active', 'Активна'),
        ('completed', 'Завершена'),
        ('cancelled', 'Отменена'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='goals')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    target_amount = models.DecimalField(max_digits=15, decimal_places=2)
    current_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    deadline = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    # Связь с категориями: JSON поле для хранения {category_id: amount_to_save}
    category_savings = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'financial_goals'
        ordering = ['-created_at']

    @property
    def progress_percentage(self):
        if self.target_amount > 0:
            return min(100, (self.current_amount / self.target_amount) * 100)
        return 0


class Insight(models.Model):
    """Сохраненные инсайты для пользователя"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='insights')
    date = models.DateField(default=timezone.now)
    daily_limit = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    forecast_balance = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    monthly_spending = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    comparison_data = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'insights'
        unique_together = ['user', 'date']
