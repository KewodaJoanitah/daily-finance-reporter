# 🏫 Daily Finance Reporter

A practical web application that simplifies daily financial record-keeping for schools. It replaces manual Excel-based workflows with a digital system that supports role-based access, real-time calculations, and voice input.

---

##  Overview

Schools often track daily income and expenditure using Excel spreadsheets — a process that is time-consuming, error-prone, and hard to access across multiple devices. **Daily Finance Reporter** solves this by providing a clean, role-based web interface where:

- An **Accountant** enters daily income and expense records
- A **Director** views reports, summaries, and financial analytics

---

##  Features

### Accountant
- 📝 Create a daily finance report with income and expense entries
- 📥 Income items — balance b/f, withdrawals, collections, and custom items
- 📤 Expense items — grouped by category (Sports, Food & Kitchen, Salaries, Medical, Transport, etc.)
- 🔢 Auto-calculation — enter quantity × unit price and total is computed automatically
- ✏️ Edit past reports — click any saved report to load and update it
- ⚠️ Duplicate detection — warns if a report for that date already exists
- ⬇️ Export all reports to CSV

### Director
- 📊 Overview dashboard with 5 summary widgets:
  - Total balance, Total income, Total expenses, Profit, Loss
- 📋 Latest report breakdown — income and expense tables
- 📅 All reports list — click any report to open a full detail modal
- 📈 Per-report profit/loss indicators

### General
- 🔐 JWT-based authentication (access + refresh tokens)
- 👥 Role-based access control (accountant vs director)
- 💾 Data persisted in a database via Django REST API
- 🌐 Works across devices on the same network

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js |
| Backend | Django + Django REST Framework |
| Auth | Simple JWT |
| Database | SQLite (development) |
| Styling | Custom CSS (Inter font, glass morphism design) |
| HTTP Client | Axios |

---

## 📁 Project Structure

```
daily-finance-reporter/
│
├── daily-finance-reporter/          # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── LoginScreen.js
│   │   │   ├── AccountantDashboard.js
│   │   │   ├── DirectorDashboard.js
│   │   │   ├── IncomeTable.js
│   │   │   ├── ExpenseTable.js
│   │   │   
│   │   ├── styles/
│   │   │   ├── App.css
│   │   │   └── Dashboard.css
│   │   ├── utils/
│   │   │   └── exportCSV.js
│   │   ├── api.js
│   │   └── App.js
│
└── finance_backend/                 # Django backend
    └── finance_backend/
        ├── core/
        │   ├── settings.py
        │   └── urls.py
        ├── finance/
        │   ├── models.py
        │   ├── serializers.py
        │   ├── views.py
        │   ├── urls.py
        │   └── admin.py
        ├── manage.py
        └── requirements.txt
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- npm

---

### Backend Setup

```bash
# Navigate to backend
cd finance_backend/finance_backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py makemigrations finance
python manage.py migrate



```bash
# Start the backend server
python manage.py runserver 0.0.0.0:8000
```

---

### Frontend Setup

```bash
# Navigate to frontend
cd daily-finance-reporter

# Install dependencies
npm install

# Create .env file
echo "REACT_APP_API_URL=http://127.0.0.1:8000/api" > .env

# Start the app
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔗 API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/login/` | Login and get JWT tokens | Public |
| POST | `/api/logout/` | Logout and blacklist token | Required |
| GET | `/api/me/` | Get current user info | Required |
| GET | `/api/reports/` | List all reports (summary) | Required |
| POST | `/api/reports/` | Create or update a report | Accountant |
| GET | `/api/reports/<date>/` | Get full report for a date | Required |
| DELETE | `/api/reports/<date>/` | Delete a report | Accountant |
| GET | `/api/summary/` | Overall income/expense totals | Required |
| POST | `/api/token/refresh/` | Refresh access token | Public |

---

## 👤 Roles

| Role | Permissions |
|------|------------|
| **Accountant** | Create, view, edit, delete reports. Export CSV. |
| **Director** | View all reports and summaries. Read-only access. |

---

## 🖼️ Screenshots

> Login page with finance-themed background

> Accountant dashboard with income/expense columns and 5 summary widgets

> Director dashboard with clickable report detail modal

---

## 🔒 Security Notes

- Passwords are hashed using Django's built-in PBKDF2 algorithm
- JWT access tokens expire after 8 hours
- Refresh tokens expire after 7 days and are blacklisted on logout
- CORS is configured — restrict `CORS_ALLOW_ALL_ORIGINS` in production
- Change `SECRET_KEY` in `settings.py` before deploying

---

## 🗺️ Roadmap

- [ ] Deploy to Railway or Render
- [ ] Add monthly and yearly summary reports
- [ ] PDF report export
- [ ] Email report to director automatically at end of day
- [ ] Multi-school / multi-branch support
- [ ] Dark mode

---

## 👩‍💻 Author

**Joanitah Kewoda**
GitHub: [@KewodaJoanitah](https://github.com/KewodaJoanitah)
Email: kewodagoanitah@gmail.com

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
