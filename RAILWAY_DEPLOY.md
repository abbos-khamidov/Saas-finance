# Деплой на Railway - Полная инструкция

## Обзор

Railway позволяет задеплоить весь проект (frontend + backend) в одном месте.

**Вариант 1: Монолитный деплой (рекомендуется для начала)**
- Django обслуживает API и статические файлы React
- Один сервис на Railway

**Вариант 2: Два сервиса**
- Backend (Django API) - один сервис
- Frontend (React Static) - второй сервис
- Более масштабируемо

## Вариант 1: Монолитный деплой (Django + React)

### Шаг 1: Подготовка

1. **Соберите React приложение**:
   ```bash
   npm run build
   ```
   Это создаст папку `dist/` с собранными файлами.

2. **Скопируйте собранные файлы в Django**:
   ```bash
   # Создайте папку для статики React
   mkdir -p backend/static
   
   # Скопируйте собранные файлы
   cp -r dist/* backend/static/
   ```

### Шаг 2: Настройка Django для обслуживания React

Обновите `backend/finance_api/urls.py`:

```python
from django.contrib import admin
from django.urls import path, include
from django.views.generic import TemplateView
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
    # Обслуживаем React SPA
    path('', TemplateView.as_view(template_name='index.html')),
    path('<path:path>', TemplateView.as_view(template_name='index.html')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```

### Шаг 3: Создание шаблона

Создайте `backend/templates/index.html` (скопируйте из `dist/index.html`).

### Шаг 4: Деплой на Railway

1. **Установите Railway CLI**:
   ```bash
   npm i -g @railway/cli
   ```

2. **Войдите в Railway**:
   ```bash
   railway login
   ```

3. **Инициализируйте проект**:
   ```bash
   cd backend
   railway init
   ```

4. **Добавьте переменные окружения**:
   ```bash
   railway variables set SECRET_KEY=your-secret-key-here
   railway variables set DEBUG=False
   ```

5. **Деплой**:
   ```bash
   railway up
   ```

### Шаг 5: Настройка в Railway Dashboard

1. Зайдите на [railway.app](https://railway.app)
2. Выберите проект
3. **Settings**:
   - **Root Directory**: `backend`
   - **Start Command**: `python manage.py migrate && gunicorn finance_api.wsgi:application --bind 0.0.0.0:$PORT`
   - **Build Command**: `pip install -r requirements.txt && python manage.py collectstatic --noinput`

4. **Variables**:
   ```
   SECRET_KEY=your-random-secret-key
   DEBUG=False
   ALLOWED_HOSTS=your-app.railway.app,*.railway.app
   ```

5. **Database**: Railway автоматически предоставит PostgreSQL (опционально)

## Вариант 2: Два сервиса (Frontend + Backend отдельно)

### Backend (Django API)

1. **Создайте первый сервис**:
   ```bash
   cd backend
   railway init
   railway up
   ```

2. **Настройки**:
   - Root Directory: `backend`
   - Start Command: `python manage.py migrate && gunicorn finance_api.wsgi:application --bind 0.0.0.0:$PORT`

3. **Получите URL API**: `https://your-api.railway.app/api/`

### Frontend (React Static)

1. **Создайте второй сервис**:
   ```bash
   cd .  # в корне проекта
   railway init
   railway up
   ```

2. **Настройки**:
   - Root Directory: `.` (корень)
   - Build Command: `npm install && npm run build`
   - Output Directory: `dist`

3. **Переменные окружения**:
   ```
   VITE_API_URL=https://your-api.railway.app/api
   ```

## Вариант 3: Простой монолитный деплой (самый простой)

### 1. Сборка React

```bash
npm run build
```

### 2. Обновите Django для обслуживания статики

Обновите `backend/finance_api/urls.py` как описано выше.

### 3. Через Railway Dashboard

1. Зайдите на [railway.app](https://railway.app)
2. **New Project** → **Deploy from GitHub repo**
3. Выберите репозиторий
4. **Settings**:
   - **Root Directory**: `backend`
   - Railway автоматически определит Python
   - Добавьте Start Command: `python manage.py migrate && gunicorn finance_api.wsgi:application --bind 0.0.0.0:$PORT`

5. **Variables**:
   ```
   SECRET_KEY=<сгенерируйте случайный ключ>
   DEBUG=False
   ```

6. **Generate Domain** → получите URL вашего приложения

## Проверка деплоя

После деплоя проверьте:

1. ✅ API доступен: `https://your-app.railway.app/api/`
2. ✅ Frontend доступен: `https://your-app.railway.app/`
3. ✅ Роутинг работает: `/analytics`, `/goals`
4. ✅ Данные сохраняются

## Переменные окружения

В Railway Dashboard → Variables добавьте:

```
SECRET_KEY=your-secret-key-min-50-chars
DEBUG=False
ALLOWED_HOSTS=*.railway.app,your-app.railway.app
```

## Troubleshooting

### Ошибка: "No module named 'gunicorn'"
- Убедитесь, что `gunicorn` в `requirements.txt`
- Пересоберите проект

### Ошибка: "Static files not found"
- Запустите `python manage.py collectstatic --noinput` в build command
- Проверьте `STATIC_ROOT` в settings.py

### Ошибка: "Database connection failed"
- Railway автоматически создает PostgreSQL
- Проверьте переменную `DATABASE_URL` в Railway Dashboard

### Frontend не загружается
- Убедитесь, что React build скопирован в `backend/static/`
- Проверьте пути в `index.html`

## Рекомендации

- ✅ Используйте PostgreSQL вместо SQLite в production (Railway предоставляет автоматически)
- ✅ Установите `DEBUG=False` в production
- ✅ Используйте сильный `SECRET_KEY`
- ✅ Настройте `ALLOWED_HOSTS` правильно

## Обновление приложения

После изменений просто:
```bash
git push
```
Railway автоматически пересоберет и задеплоит изменения.
