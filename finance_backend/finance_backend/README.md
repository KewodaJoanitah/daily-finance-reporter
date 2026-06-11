# Daily Finance Reporter — Setup Guide

## Backend (Django)

### 1. Install dependencies
```bash
cd finance_backend
pip install -r requirements.txt
```

### 2. Run migrations
```bash
python manage.py makemigrations
python manage.py migrate
```

### 3. Create users
```bash
python manage.py shell
```
```python
from finance.models import User

# Create accountant
User.objects.create_user(
    username='accountant',
    password='acc123',
    email='accountant@school.com',
    role='accountant',
    first_name='John',
    last_name='Doe'
)

# Create director
User.objects.create_user(
    username='director',
    password='dir123',
    email='director@school.com',
    role='director',
    first_name='Jane',
    last_name='Smith'
)
```

### 4. Start the server
```bash
python manage.py runserver 0.0.0.0:8000
```

---

## Frontend (React)

### 1. Install axios (if not already)
```bash
npm install axios
```

### 2. Add API URL to .env
Create a `.env` file in your React project root:
```
REACT_APP_API_URL=http://127.0.0.1:8000/api
```
If accessing from another device on the network:
```
REACT_APP_API_URL=http://192.168.1.64:8000/api
```

### 3. Place files
| File | Destination |
|------|------------|
| `api.js` | `src/api.js` |
| `App.js` | `src/App.js` |
| `LoginScreen_new.js` | `src/components/LoginScreen.js` (replace existing, keep bg image) |

### 4. Start React
```bash
npm start
```

---

## API Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| POST | /api/login/ | Login, returns JWT tokens |
| POST | /api/logout/ | Logout, blacklists token |
| GET | /api/me/ | Get current user |
| GET | /api/reports/ | List all reports (summary) |
| POST | /api/reports/ | Save/update a report |
| GET | /api/reports/2026-06-08/ | Get full report for a date |
| DELETE | /api/reports/2026-06-08/ | Delete a report |
| GET | /api/summary/ | Overall income/expense totals |
| POST | /api/token/refresh/ | Refresh access token |
