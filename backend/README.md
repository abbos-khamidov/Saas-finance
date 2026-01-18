# Finance API - Django Backend

## Установка

```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser  # опционально для админки
```

## Запуск

```bash
python manage.py runserver
```

API будет доступен по адресу: http://localhost:8000/api/

## API Endpoints

### Authentication
- `POST /api/users/register/` - Регистрация
- `POST /api/users/login/` - Вход

### Transactions
- `GET /api/transactions/?user_id=1` - Список транзакций
- `POST /api/transactions/` - Создать транзакцию
- `DELETE /api/transactions/{id}/` - Удалить транзакцию

### Settings
- `GET /api/settings/?user_id=1` - Настройки пользователя
- `PUT /api/settings/{id}/` - Обновить настройки

### Goals
- `GET /api/goals/?user_id=1` - Список целей
- `POST /api/goals/` - Создать цель
- `PUT /api/goals/{id}/` - Обновить цель

### Analytics
- `GET /api/analytics/{user_id}/?period=month` - Аналитика

### Insights
- `GET /api/insights/{user_id}/` - Инсайты и прогнозы
