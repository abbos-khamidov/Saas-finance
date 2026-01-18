# Переменные окружения для Railway

## Обязательные переменные для Django Backend

Добавьте эти переменные в Railway Dashboard → Variables:

### 1. SECRET_KEY (ОБЯЗАТЕЛЬНО!)

**НЕ используйте** дефолтный ключ `'django-insecure-dev-key-change-in-production'`

**Сгенерируйте новый безопасный ключ:**

#### Вариант A: Через Python
```bash
python -c "import secrets; print(secrets.token_urlsafe(50))"
```

#### Вариант B: Онлайн генератор
https://djecrety.ir/

#### Вариант C: Через Django
```bash
cd backend
python manage.py shell -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

**Пример сгенерированного ключа** (минимум 50 символов):
```
SECRET_KEY=django-insecure-1234567890abcdefghijklmnopqrstuvwxyz1234567890
```

### 2. DEBUG

```
DEBUG=False
```

**Важно**: В production всегда `False`!

### 3. ALLOWED_HOSTS

```
ALLOWED_HOSTS=*.railway.app,your-app-name.railway.app
```

Или просто:
```
ALLOWED_HOSTS=*.railway.app
```

## Переменные, которые Railway добавляет автоматически

- `DATABASE_URL` - если вы добавили PostgreSQL в Railway
- `PORT` - порт для приложения
- `RAILWAY_ENVIRONMENT` - окружение (production/development)

## Переменные для Frontend (если деплоите отдельно)

Если деплоите React frontend как отдельный сервис:

```
VITE_API_URL=https://your-backend-service.railway.app/api
```

## Как добавить в Railway

1. Зайдите в Railway Dashboard
2. Выберите ваш проект
3. Выберите сервис (backend)
4. Перейдите на вкладку **Variables**
5. Нажмите **+ New Variable**
6. Добавьте каждую переменную:
   - **Name**: `SECRET_KEY`
   - **Value**: сгенерированный ключ (без кавычек)

## Пример полного списка переменных для Railway

```
SECRET_KEY=django-insecure-your-generated-key-here-min-50-chars
DEBUG=False
ALLOWED_HOSTS=*.railway.app
```

## Безопасность

⚠️ **НИКОГДА не коммитьте SECRET_KEY в Git!**

✅ Используйте переменные окружения (Railway Variables)

✅ В `.gitignore` уже есть `.env` файлы

✅ Для локальной разработки создайте `.env` файл:

```bash
# backend/.env (НЕ коммитить!)
SECRET_KEY=ваш-ключ-для-разработки
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
```

## Проверка

После добавления переменных:

1. Перезапустите сервис в Railway
2. Проверьте логи - не должно быть предупреждений о SECRET_KEY
3. Проверьте, что DEBUG=False (безопасность)
