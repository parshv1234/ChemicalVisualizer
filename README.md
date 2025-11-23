# Chemical Equipment Parameter Visualizer (Hybrid App)

A full-stack hybrid application that runs as both a **Web Application (React)** and a **Desktop Application (PyQt5)**, powered by a shared Django backend. This project demonstrates data visualization, CSV parsing, API integration, and cross-platform synchronization.

---

## 🚀 Live Demo & Quick Access

### 1. Web Application

- **Frontend URL**: [https://chemical-visualizer-two.vercel.app/](https://chemical-visualizer-two.vercel.app/)
- **Backend API**: [https://chemical-backend-nghd.onrender.com/api/](https://chemical-backend-nghd.onrender.com/api/)

> ⚠️ **Cold Start Warning**: The backend is hosted on Render's Free Tier. If the app has been inactive, the first request (Login/Upload) may take **50-60 seconds** to wake up the server. Please be patient.

### 2. Desktop Application (Executables)

You do **not** need to install Python to run the desktop app if you use the pre-built executables.

1. Navigate to the `desktop-app/dist/` folder in this repository.
2. **Windows**: Double-click `ChemicalVisualizer.exe`.
3. **Mac**: Double-click `ChemicalVisualizer.app`.

These apps are pre-configured to fetch data from the **Live Render Server**.

---

## 🔑 Test Credentials (Admin)

- **Username**: `admin`
- **Password**: `ADMIN@PM#0614`

---

## ⚙️ Configuration: Switching between Local & Live

To run this project **Locally**, you must update the API URLs in the source code. I have marked the specific lines in the files below.

### 1. Web Frontend (`web-frontend/src/App.jsx`)

Search for `const API_URL`. Comment out the Live URL and uncomment the Localhost URL.

```javascript
// CHANGE THIS LINE FOR LOCAL DEV:
const API_URL = 'http://127.0.0.1:8000/api'; // <--- Localhost
// const API_URL = 'https://chemical-backend-nghd.onrender.com/api'; // <--- Live Production
```

### 2. Desktop Frontend (`desktop-app/desktop_main.py`)

Search for `API_URL`. Comment out the Live URL and uncomment the Localhost URL.

```python
# CHANGE THIS LINE FOR LOCAL DEV:
API_URL = "http://127.0.0.1:8000/api" # <--- Localhost
# API_URL = "https://chemical-backend-nghd.onrender.com/api" # <--- Live Production
```

---

## 💻 Local Development Setup

Follow these steps to run the entire stack on your machine.

### Part 1: Backend (Django)

1. **Navigate to the backend folder:**

```bash
cd backend
```

2. **Create and Activate Virtual Environment:**

**Mac/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

3. **Install Dependencies & Run:**

```bash
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
# Follow prompts to create a local admin (e.g., admin / password123)
python manage.py runserver
```

The backend is now running at **http://127.0.0.1:8000**

### Part 2: Web Frontend (React)

1. **Open a new terminal and navigate to the frontend:**

```bash
cd web-frontend
```

2. **Install and Run:**

```bash
npm install
npm run dev
```

Access the web app at **http://localhost:5173**

### Part 3: Desktop App (Source Code)

1. **Open a new terminal and navigate to desktop app:**

```bash
cd desktop-app
```

2. **Install Dependencies:**

**Mac/Linux:** `source ../backend/venv/bin/activate` (Reuse backend venv) or install fresh:

```bash
pip install PyQt5 requests matplotlib pandas
```

3. **Run the App:**

```bash
python desktop_main.py
```

---

## ☁️ Production Deployment Guide

This project is deployed using **Render** (Backend) and **Vercel** (Frontend).

### Step 1: Prepare Django for Production

1. **Install Gunicorn and Whitenoise**: `pip install gunicorn whitenoise`.
2. **Update `settings.py`**: Set `DEBUG = False`, `ALLOWED_HOSTS = ['*']`, and add `'whitenoise.middleware.WhiteNoiseMiddleware'` to Middleware.
3. **Create `requirements.txt`**: `pip freeze > requirements.txt`.

### Step 2: Deploy Backend to Render

1. Push code to GitHub.
2. Create a **New Web Service** on Render.
3. Connect your GitHub repo and select the `backend` folder as **Root Directory**.
4. **Build Command**: `pip install -r requirements.txt && python manage.py collectstatic --noinput`
5. **Start Command** (Crucial for SQLite Persistence):

Since the free tier wipes the DB on restart, we use this command to migrate and recreate the superuser automatically:

```bash
python manage.py migrate && python manage.py shell -c "from django.contrib.auth.models import User; User.objects.create_superuser('admin', 'admin@example.com', 'ADMIN@PM#0614') if not User.objects.filter(username='admin').exists() else None" && gunicorn config.wsgi:application
```

### Step 3: Deploy Frontend to Vercel

1. Push code to GitHub.
2. Import the project into Vercel.
3. Select `web-frontend` as the **Root Directory**.
4. Ensure the `API_URL` in `App.jsx` is set to the Render URL.
5. Click **Deploy**.

### Step 4: Build Desktop Executable (Optional)

To create the standalone files found in `dist/`:

```bash
pip install pyinstaller
pyinstaller --onefile --windowed --name="ChemicalVisualizer" desktop_main.py
```

---

## 📂 Project Structure

```
ChemicalVisualizer/
├── backend/                 # Django API
│   ├── api/                 # Logic (Views, Models)
│   ├── config/              # Settings
│   ├── manage.py
│   └── requirements.txt
├── web-frontend/            # React App
│   ├── src/App.jsx          # <-- Check here for API_URL config
│   └── package.json
├── desktop-app/             # PyQt5 App
│   ├── desktop_main.py      # <-- Check here for API_URL config
│   └── dist/                # Contains executable apps (Mac/Win)
└── sample_equipment_data.csv
```

---