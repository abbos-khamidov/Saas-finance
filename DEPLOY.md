# Деплой на Vercel - Инструкция

## Быстрый деплой

### Вариант 1: Через Vercel CLI (рекомендуется)

1. **Установите Vercel CLI** (если еще не установлен):
   ```bash
   npm i -g vercel
   ```

2. **Войдите в Vercel**:
   ```bash
   vercel login
   ```

3. **Задеплойте проект**:
   ```bash
   vercel
   ```
   При первом деплое:
   - Выберите проект или создайте новый
   - Подтвердите настройки (framework: Vite будет определен автоматически)

4. **Продакшн деплой**:
   ```bash
   vercel --prod
   ```

### Вариант 2: Через GitHub (автоматический деплой)

1. **Закоммитьте и запушьте код**:
   ```bash
   git add .
   git commit -m "Ready for Vercel deployment"
   git push
   ```

2. **В Vercel Dashboard**:
   - Зайдите на [vercel.com](https://vercel.com)
   - Нажмите "New Project"
   - Импортируйте репозиторий из GitHub
   - Vercel автоматически определит настройки:
     - Framework: **Vite**
     - Build Command: `npm run build`
     - Output Directory: `dist`
     - Install Command: `npm install`

3. **Нажмите Deploy**

## Настройки проекта

### Framework Preset
- **Framework**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### Environment Variables (если нужно)

В Vercel Dashboard → Settings → Environment Variables:

```
VITE_API_URL=https://your-api-domain.com/api
```

**Важно**: 
- Если используете Django backend отдельно, укажите его URL
- Если используете только localStorage, переменная не нужна

## Структура деплоя

### Что деплоится на Vercel:
- ✅ `src/` - React код
- ✅ `index.html` - точка входа
- ✅ `package.json` - зависимости
- ✅ `vite.config.js` - конфигурация Vite
- ✅ `vercel.json` - конфигурация Vercel

### Что НЕ деплоится (в `.vercelignore`):
- ❌ `backend/` - Django backend (деплоится отдельно)
- ❌ Старые HTML файлы (`analytics.html`, `auth.html` и т.д.)
- ❌ `node_modules/` - устанавливается на Vercel

## После деплоя

1. **Проверьте URL**: `https://your-project.vercel.app`

2. **Если используете Django backend**:
   - Задеплойте backend отдельно (Railway, Heroku, DigitalOcean)
   - Обновите `VITE_API_URL` в Vercel с URL вашего API

3. **Если используете только localStorage**:
   - Все будет работать из коробки
   - Данные хранятся в браузере пользователя

## Troubleshooting

### Ошибка: "Module not found"
- Проверьте, что `package.json` содержит все зависимости
- Убедитесь, что `npm install` выполняется без ошибок

### Ошибка: "Cannot find module"
- Проверьте пути импортов в React компонентах
- Убедитесь, что все файлы в `src/` правильно импортируются

### Страница пустая или показывает ошибки
- Проверьте консоль браузера (F12)
- Проверьте Network tab - все ли файлы загружаются
- Проверьте, что `index.html` правильно настроен

### Роутинг не работает
- Убедитесь, что `vercel.json` содержит правильный rewrite:
  ```json
  {
    "rewrites": [
      { "source": "/(.*)", "destination": "/index.html" }
    ]
  }
  ```

## Оптимизация

Текущие настройки `vite.config.js` уже оптимизированы:
- ✅ Минификация кода
- ✅ Удаление console.log
- ✅ Разделение на chunks (react-vendor, chart-vendor)
- ✅ Sourcemaps отключены для продакшена

## Проверка деплоя

После деплоя проверьте:
1. ✅ Главная страница загружается
2. ✅ Авторизация работает
3. ✅ Роутинг работает (/analytics, /goals)
4. ✅ Данные сохраняются (localStorage или API)
5. ✅ Стили применяются корректно
