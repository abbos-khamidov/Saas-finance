# Как запустить Django сервер

## Windows (PowerShell)

```powershell
cd backend
python manage.py runserver
```

Сервер запустится на `http://localhost:8000`

## Проверка работы

После запуска сервера, API будет доступен по адресам:
- `http://localhost:8000/api/transactions/` - транзакции
- `http://localhost:8000/api/users/register/` - регистрация
- `http://localhost:8000/api/settings/` - настройки

## Если получаете 404 ошибку

1. Убедитесь, что сервер запущен (должна быть строка "Starting development server at http://127.0.0.1:8000/")
2. Проверьте, что порт 8000 свободен
3. Убедитесь, что выполнены миграции: `python manage.py migrate`
