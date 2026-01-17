# SaaS Finance - React версия

## Описание

Легкий и оптимизированный React проект для учета финансов с хранением данных в localStorage (JSON). В будущем планируется миграция на PostgreSQL.

## Технологии

- **React 18** - UI библиотека
- **Vite** - Быстрый сборщик
- **React Router** - Роутинг
- **Chart.js** - Графики и аналитика
- **localStorage** - Хранение данных (JSON)

## Быстрый старт

### Установка зависимостей

```bash
npm install
```

### Запуск dev сервера

```bash
npm run dev
```

### Сборка для продакшена

```bash
npm run build
```

### Просмотр сборки

```bash
npm run preview
```

## Структура проекта

```
src/
  ├── pages/           # Страницы приложения
  │   ├── AuthPage.jsx
  │   ├── OnboardingPage.jsx
  │   ├── DashboardPage.jsx
  │   └── AnalyticsPage.jsx
  ├── components/      # React компоненты
  ├── services/        # Сервисы (auth, data)
  │   ├── authService.js
  │   └── dataService.js
  ├── utils/           # Утилиты
  ├── App.jsx          # Главный компонент
  ├── main.jsx         # Точка входа
  └── index.css        # Стили

```

## Хранение данных

### Текущая реализация (localStorage)

Данные хранятся в `localStorage` в формате JSON:

- `finance_user` - данные пользователя
- `finance_{userId}_transactions` - транзакции
- `finance_{userId}_settings` - настройки пользователя

### Миграция на PostgreSQL

Для перехода на PostgreSQL нужно:

1. Создать API endpoint'ы (Node.js/Express или другой бэкенд)
2. Обновить `dataService.js` - заменить localStorage на API вызовы
3. Настроить PostgreSQL базу данных
4. Реализовать аутентификацию (JWT или сессии)

## Функционал

- ✅ Аутентификация (mock, готово к замене на реальную)
- ✅ Onboarding при первом входе
- ✅ Учет доходов и расходов
- ✅ Аналитика с графиками
- ✅ Бюджеты по категориям
- ✅ Финансовые инсайты

## Деплой на Vercel

Проект готов к деплою на Vercel:

1. Подключите репозиторий GitHub к Vercel
2. Vercel автоматически определит Vite проект
3. Build command: `npm run build`
4. Output directory: `dist`

## TODO

- [ ] Доработать DashboardPage с полным функционалом
- [ ] Доработать AnalyticsPage с графиками
- [ ] Добавить реальную аутентификацию
- [ ] Мигрировать на PostgreSQL через API
- [ ] Добавить экспорт данных
- [ ] Оптимизировать bundle size

## Автор

Made by **Adams Midov**
- Telegram: [@adamsmidov](https://t.me/adamsmidov)
- GitHub: [adamsmidov](https://github.com/adamsmidov)
