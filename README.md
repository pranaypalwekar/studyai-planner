# 📚 StudyAI Planner

An intelligent, AI-powered study planning SaaS platform that helps students organize their learning, get AI tutoring, and optimize their study sessions using machine learning.

---

## 🚀 Tech Stack

### 🖥️ Frontend

| Technology | Version | Purpose |
|---|---|---|
| **React** | v19 | Core UI framework |
| **Vite** | v8 | Build tool & dev server |
| **React Router DOM** | v7 | Client-side routing/navigation |
| **Axios** | v1.14 | HTTP requests to backend API |
| **Lucide React** | v1.7 | Icon library |
| **date-fns** | v4.1 | Date formatting & manipulation |
| **js-cookie** | v3 | Cookie management (for auth tokens) |
| **ESLint** | v9 | Code linting |
| **Vanilla CSS** | — | Custom styling |

### ⚙️ Backend

| Technology | Purpose |
|---|---|
| **Python** | Core backend language |
| **Flask** | Web framework / REST API server |
| **Flask-CORS** | Cross-origin request handling (frontend ↔ backend) |
| **Flask-JWT-Extended** | JWT-based authentication & protected routes |
| **PyMongo** | MongoDB database driver |
| **bcrypt** | Password hashing & security |
| **python-dotenv** | Environment variable management |
| **google-genai** | Google Gemini AI SDK (AI tutor / chat) |
| **scikit-learn** | Machine learning (subject prioritization) |
| **pandas** | Data manipulation for ML pipeline |
| **numpy** | Numerical computing for ML |

### 🗄️ Database & External Services

| Service | Purpose |
|---|---|
| **MongoDB** | Primary NoSQL database |
| **Google Gemini AI** | AI-powered tutoring & chat |
| **Google Classroom API** | Classroom data integration |
| **Google Meet API** | Meeting/session scheduling |

### 🔐 Auth & Security

| Item | Detail |
|---|---|
| **JWT (JSON Web Tokens)** | Stateless user authentication |
| **bcrypt** | Secure password hashing |
| **Environment Variables** | `.env` for secrets (Mongo URI, JWT secret, Gemini API key) |

---

## 🧠 AI / ML Stack

```
Google Gemini AI  →  AI Chat Tutor (natural language Q&A)
scikit-learn      →  Subject priority prediction (ML model)
pandas + numpy    →  Data processing for the ML pipeline
```

---

## 📁 Project Structure

```
ai planner/
├── backend/
│   ├── app.py                  # Flask app entry point
│   ├── config.py               # App configuration
│   ├── models.py               # Database models
│   ├── requirements.txt        # Python dependencies
│   ├── .env_template           # Environment variable template
│   ├── ml/
│   │   └── predictor.py        # ML subject prioritization model
│   └── routes/
│       ├── auth.py             # Register / Login / JWT
│       ├── study.py            # Study sessions
│       ├── classroom.py        # Google Classroom integration
│       ├── meet.py             # Google Meet integration
│       ├── pomodoro.py         # Pomodoro timer logic
│       └── ai_tutor.py         # Gemini AI tutor
│
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── App.jsx             # Root component & routing
        ├── App.css
        ├── index.css           # Global styles
        └── pages/
            ├── Login.jsx       # Authentication page
            ├── Dashboard.jsx   # Main dashboard
            ├── Planner.jsx     # Study planner & scheduling
            ├── AIChat.jsx      # AI tutor chat interface
            ├── Analytics.jsx   # Study analytics & stats
            ├── FocusMode.jsx   # Pomodoro / focus mode
            └── Settings.jsx    # User settings
```

---

## ⚙️ Setup & Installation

### Prerequisites
- Python 3.10+
- Node.js 18+
- MongoDB (local or Atlas)
- Google Gemini API Key

### 1. Clone the repo
```bash
git clone https://github.com/your-username/studyai-planner.git
cd studyai-planner
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
```

Copy `.env_template` to `.env` and fill in your values:
```env
MONGO_URI=mongodb://localhost:27017/studyai
JWT_SECRET_KEY=your_secure_random_string
GEMINI_API_KEY=your_gemini_api_key_here
PORT=5000
```

Run the backend:
```bash
python app.py
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 🌐 API Endpoints

| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login & get JWT |
| GET/POST | `/api/study/` | Study session management |
| GET/POST | `/api/pomodoro/` | Pomodoro timer |
| GET | `/api/classroom/` | Google Classroom data |
| GET | `/api/meet/` | Google Meet sessions |
| POST | `/api/ai-tutor/chat` | AI tutor chat |

---

## ✨ Features

- 🔐 **Secure Auth** — JWT-based login & registration with bcrypt password hashing
- 📅 **Smart Planner** — Schedule and manage study sessions
- 🤖 **AI Tutor** — Chat with Google Gemini for instant help on any subject
- 📊 **Analytics** — Track progress, study hours, and performance
- ⏱️ **Focus Mode** — Built-in Pomodoro timer for deep work
- 🏫 **Google Classroom** — Sync assignments and class data
- 📹 **Google Meet** — Schedule and join study sessions
- 🧠 **ML Prioritization** — AI-driven subject priority recommendations via scikit-learn

---

## 📄 License

MIT License © 2026 StudyAI Planner
