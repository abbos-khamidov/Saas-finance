# Архитектура SaaS-продукта для учёта финансов

## Обзор

Приложение для учёта финансов с подпиской $9/месяц, ориентированное на фрилансеров и самозанятых.

## Структура данных Firestore

### Коллекции

#### 1. `expenses` (Расходы)
```javascript
{
  amount: number,
  category: string,
  date: string (YYYY-MM-DD),
  userId: string,
  timestamp: Timestamp
}
```

#### 2. `incomes` (Доходы)
```javascript
{
  amount: number,
  description: string,
  date: string (YYYY-MM-DD),
  userId: string,
  timestamp: Timestamp
}
```

#### 3. `userSettings` (Настройки пользователя)
```javascript
{
  monthlyIncome: number,
  fixedExpenses: number,
  financialGoal: string,
  onboardingCompleted: boolean,
  subscription: 'free' | 'pro',
  budgets: {
    [category: string]: number
  },
  createdAt: string (ISO),
  budgetsUpdatedAt: string (ISO),
  subscriptionUpdatedAt: string (ISO)
}
```

## Расчёты

### Серверные (через Cloud Functions - будущее)

1. **Ежедневные отчёты** - агрегация данных за день
2. **Месячные сводки** - расчёт статистики за месяц
3. **Уведомления** - отправка предупреждений о превышении бюджета

### Клиентские (текущая реализация)

#### Модуль `insights.js` - FinancialInsights

**Методы:**

1. `getDailySpendingLimit()`
   - Вход: `monthlyIncome`, `fixedExpenses`, текущие транзакции
   - Выход: `{ dailyLimit, dailyRemaining, remainingForMonth, daysRemaining }`
   - Логика: `(monthlyIncome - fixedExpenses) / daysInMonth`

2. `getCurrentMonthSpending()`
   - Фильтрует транзакции текущего месяца
   - Суммирует расходы

3. `getPreviousMonthSpending()`
   - Аналогично для предыдущего месяца

4. `getPeriodComparison()`
   - Сравнивает текущий и предыдущий месяц
   - Возвращает: `{ current, previous, difference, percentage, trend }`

5. `getMonthEndForecast()`
   - Прогноз баланса до конца месяца
   - Формула: `monthlyIncome - fixedExpenses - projectedSpending`
   - `projectedSpending = currentSpending + (avgDailySpending * daysRemaining)`

6. `getCategoryOverspending(budgets)`
   - Сравнивает фактические расходы с бюджетами
   - Возвращает категории с превышением
   - Статусы: `ok` (<80%), `warning` (80-99%), `over` (≥100%)

## Тарифы

### Free
- Базовый учёт доходов и расходов
- Просмотр транзакций
- Простая статистика
- Ограничение: до 50 транзакций в месяц

### Pro ($9/месяц)
- Неограниченные транзакции
- Финансовые инсайты:
  - Дневной лимит трат
  - Прогноз до конца месяца
  - Сравнение с прошлым периодом
- Бюджеты по категориям:
  - Лимиты
  - Визуальные индикаторы
  - Предупреждения
- Расширенная аналитика
- Экспорт данных (CSV, JSON)

## Onboarding Flow

1. Пользователь регистрируется
2. Проверка `userSettings.onboardingCompleted`
3. Если `false` → редирект на `/onboarding.html`
4. Заполнение:
   - Доход в месяц
   - Обязательные расходы
   - Финансовая цель (опционально)
5. Сохранение в `userSettings`
6. Редирект на главную с персональным дашбордом

## UI/UX Приоритеты

### Главная страница

1. **Hero Insight** - "Можно потратить сегодня"
   - Крупный, заметный блок
   - Прогресс-бар
   - Цветовая индикация (green/yellow/red)

2. **Прогноз до конца месяца**
   - Показывается только если есть данные
   - Прогнозируемый баланс

3. **Бюджеты по категориям**
   - Визуальные индикаторы прогресса
   - Кнопка "Настроить"

4. **Алерты о перерасходе**
   - Выделенные блоки для категорий с превышением

5. **Форма добавления транзакции**
   - Вкладки: Расход / Доход

6. **Последние транзакции**
   - Фильтры по типу и категории

## Оптимизация производительности

### Клиентская сторона

1. **Ленивая загрузка модулей**
   - `insights.js` загружается только при необходимости
   - Графики на странице аналитики загружаются по требованию

2. **Кэширование**
   - Настройки пользователя кэшируются в памяти
   - Обновление только при изменении

3. **Debounce для фильтров**
   - Задержка при вводе в фильтры

### Firestore

1. **Индексы**
   - `expenses`: `userId`, `date`
   - `incomes`: `userId`, `date`
   - `userSettings`: `userId` (документ)

2. **Ограничения запросов**
   - Загрузка только текущего месяца для главной
   - Пагинация для истории транзакций

## Безопасность

### Firestore Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Expenses
    match /expenses/{expenseId} {
      allow read, write: if request.auth != null && 
                          request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && 
                       request.auth.uid == request.resource.data.userId;
    }
    
    // Incomes
    match /incomes/{incomeId} {
      allow read, write: if request.auth != null && 
                          request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && 
                       request.auth.uid == request.resource.data.userId;
    }
    
    // User Settings
    match /userSettings/{userId} {
      allow read, write: if request.auth != null && 
                          request.auth.uid == userId;
    }
  }
}
```

## Масштабирование

### Текущая архитектура
- Клиентские расчёты
- Real-time обновления через Firestore listeners
- Статический хостинг на Vercel

### Будущие улучшения

1. **Cloud Functions**
   - Ежедневные расчёты
   - Агрегация данных
   - Уведомления

2. **Кэширование**
   - Redis для часто запрашиваемых данных
   - CDN для статических ресурсов

3. **Аналитика**
   - Google Analytics / Mixpanel
   - Отслеживание конверсий

4. **Платежи**
   - Stripe для подписок
   - Webhook для обновления статуса

## Деплой на Vercel

### Конфигурация (`vercel.json`)
- Статические файлы из корня
- Rewrites для SPA-роутинга
- Кэширование статических ресурсов
- Security headers

### Environment Variables
- Firebase конфигурация (уже в коде, но лучше вынести)
- API ключи для аналитики (будущее)

## Метрики успеха

1. **Retention**
   - D1: >60%
   - D7: >40%
   - D30: >25%

2. **Конверсия в Pro**
   - Trial → Pro: >15%
   - Free → Pro: >5%

3. **Engagement**
   - Среднее количество транзакций в день
   - Использование инсайтов
   - Настройка бюджетов

## Roadmap

### Phase 1 (Текущая)
- ✅ Базовый учёт
- ✅ Инсайты
- ✅ Бюджеты
- ✅ Onboarding

### Phase 2
- [ ] Экспорт данных
- [ ] Уведомления
- [ ] Мобильное приложение (PWA)

### Phase 3
- [ ] Интеграции (банки, карты)
- [ ] Автоматическая категоризация
- [ ] Совместные бюджеты

### Phase 4
- [ ] AI-рекомендации
- [ ] Прогнозирование на год
- [ ] Инвестиционные советы