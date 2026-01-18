from rest_framework import viewsets, status
from rest_framework.decorators import api_view, action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Sum, Q, Count
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal

from .models import User, UserSettings, Transaction, FinancialGoal, Insight
from .serializers import (
    UserSerializer, UserSettingsSerializer, TransactionSerializer,
    FinancialGoalSerializer, InsightSerializer
)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    @action(detail=False, methods=['post'])
    def register(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        
        if User.objects.filter(email=email).exists():
            return Response({'error': 'User already exists'}, status=status.HTTP_400_BAD_REQUEST)
        
        user = User.objects.create(
            email=email,
            password_hash=password,  # В продакшене использовать хеширование
            name=email.split('@')[0]
        )
        
        # Создать настройки по умолчанию
        UserSettings.objects.create(user=user)
        
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def login(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        
        try:
            user = User.objects.get(email=email, password_hash=password)
            return Response(UserSerializer(user).data)
        except User.DoesNotExist:
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)


class TransactionViewSet(viewsets.ModelViewSet):
    serializer_class = TransactionSerializer

    def get_queryset(self):
        user_id = self.request.query_params.get('user_id')
        if user_id:
            return Transaction.objects.filter(user_id=user_id)
        return Transaction.objects.none()

    def perform_create(self, serializer):
        user_id = self.request.data.get('user_id')
        user = get_object_or_404(User, id=user_id)
        serializer.save(user=user)


class UserSettingsViewSet(viewsets.ModelViewSet):
    serializer_class = UserSettingsSerializer

    def get_queryset(self):
        user_id = self.request.query_params.get('user_id')
        if user_id:
            return UserSettings.objects.filter(user_id=user_id)
        return UserSettings.objects.none()


class FinancialGoalViewSet(viewsets.ModelViewSet):
    serializer_class = FinancialGoalSerializer

    def get_queryset(self):
        user_id = self.request.query_params.get('user_id')
        if user_id:
            return FinancialGoal.objects.filter(user_id=user_id)
        return FinancialGoal.objects.none()

    def perform_create(self, serializer):
        user_id = self.request.data.get('user_id')
        user = get_object_or_404(User, id=user_id)
        serializer.save(user=user)


@api_view(['GET'])
def analytics(request, user_id):
    """Глубокая аналитика для пользователя"""
    user = get_object_or_404(User, id=user_id)
    period = request.query_params.get('period', 'all')
    
    # Фильтрация по периоду
    now = timezone.now().date()
    if period == 'month':
        start_date = now.replace(day=1)
        end_date = now
    elif period == 'week':
        start_date = now - timedelta(days=7)
        end_date = now
    else:
        start_date = None
        end_date = None

    transactions_query = Transaction.objects.filter(user=user)
    if start_date:
        transactions_query = transactions_query.filter(date__gte=start_date, date__lte=end_date)

    # Базовые метрики
    expenses = transactions_query.filter(type='expense').aggregate(total=Sum('amount'))['total'] or Decimal('0')
    incomes = transactions_query.filter(type='income').aggregate(total=Sum('amount'))['total'] or Decimal('0')
    balance = incomes - expenses

    # По категориям
    category_stats = (
        transactions_query.filter(type='expense')
        .values('category')
        .annotate(total=Sum('amount'), count=Count('id'))
        .order_by('-total')
    )

    # По датам (последние 30 дней)
    date_stats = []
    for i in range(30):
        date = now - timedelta(days=i)
        day_expenses = Transaction.objects.filter(
            user=user, type='expense', date=date
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        day_incomes = Transaction.objects.filter(
            user=user, type='income', date=date
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        date_stats.append({
            'date': date.isoformat(),
            'expenses': float(day_expenses),
            'incomes': float(day_incomes)
        })

    # Тренды
    current_month_spending = Transaction.objects.filter(
        user=user, type='expense',
        date__gte=now.replace(day=1)
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

    prev_month = now.replace(day=1) - timedelta(days=1)
    prev_month_spending = Transaction.objects.filter(
        user=user, type='expense',
        date__gte=prev_month.replace(day=1),
        date__lte=prev_month
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

    trend_percentage = 0
    if prev_month_spending > 0:
        trend_percentage = float(((current_month_spending - prev_month_spending) / prev_month_spending) * 100)

    # Средний дневной расход
    days_count = max(1, (now - start_date).days) if start_date else 30
    avg_daily = float(expenses / days_count)

    return Response({
        'summary': {
            'expenses': float(expenses),
            'incomes': float(incomes),
            'balance': float(balance),
            'avg_daily': avg_daily
        },
        'categories': list(category_stats),
        'date_stats': list(reversed(date_stats)),
        'trends': {
            'current_month': float(current_month_spending),
            'prev_month': float(prev_month_spending),
            'percentage': round(trend_percentage, 2)
        }
    })


@api_view(['GET'])
def insights(request, user_id):
    """Расширенные инсайты для пользователя"""
    user = get_object_or_404(User, id=user_id)
    settings = get_object_or_404(UserSettings, user=user)
    
    now = timezone.now().date()
    start_of_month = now.replace(day=1)
    days_in_month = (now.replace(month=now.month % 12 + 1, day=1) - timedelta(days=1)).day
    current_day = now.day
    days_remaining = days_in_month - current_day + 1

    # Текущие траты месяца
    current_spending = Transaction.objects.filter(
        user=user, type='expense', date__gte=start_of_month
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

    # Доступно на месяц
    available = Decimal(str(settings.monthly_income)) - Decimal(str(settings.fixed_expenses))
    daily_limit = available / days_in_month if days_in_month > 0 else Decimal('0')
    remaining_for_month = available - current_spending
    daily_remaining = remaining_for_month / days_remaining if days_remaining > 0 else Decimal('0')

    # Прогноз
    avg_daily = current_spending / current_day if current_day > 0 else Decimal('0')
    projected_spending = current_spending + (avg_daily * days_remaining)
    forecast_balance = available - projected_spending

    # Бюджеты
    budgets = settings.budgets or {}
    overspending = []
    for category, budget_limit in budgets.items():
        spent = Transaction.objects.filter(
            user=user, type='expense', category=category, date__gte=start_of_month
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        if budget_limit > 0:
            percentage = (spent / Decimal(str(budget_limit))) * 100
            if percentage >= 80:
                overspending.append({
                    'category': category,
                    'spent': float(spent),
                    'budget': float(budget_limit),
                    'percentage': float(percentage)
                })

    return Response({
        'daily_limit': {
            'limit': float(daily_limit),
            'remaining': float(daily_remaining),
            'days_remaining': days_remaining
        },
        'forecast': {
            'balance': float(forecast_balance),
            'projected_spending': float(projected_spending),
            'current_spending': float(current_spending)
        },
        'overspending': overspending
    })
