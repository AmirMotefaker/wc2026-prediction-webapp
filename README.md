[![Status](https://img.shields.io/badge/Status-In%20Development-yellow)](https://github.com/AmirMotefaker/wc2026-prediction-webapp)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![Firebase](https://img.shields.io/badge/Firebase-Auth%20%2B%20Firestore-FFCA28?logo=firebase&logoColor=white)](https://firebase.google.com)
[![License](https://img.shields.io/github/license/AmirMotefaker/wc2026-prediction-webapp)](./LICENSE)

# ⚽ WC2026 Predictin Web App

> A React + Firebase web application where users sign up, predict FIFA World Cup 2026 match scores, and compete on a leaderboard.

Companion project to [ai-football-prediction-engine-world-cup-2026](https://github.com/AmirMotefaker/ai-football-prediction-engine-world-cup-2026) — uses the same team/venue datasets and (eventually) the same Poisson + Monte Carlo engine for AI-suggested predictions.

---

## 🎯 Features

- ✅ Email/Password + Google Authentication (Firebase Auth)
- ✅ User profiles stored in Firestore
- 🚧 Group stage fixtures (48 teams, 12 groups, real WC2026 data)
- 🚧 Prediction form — pick scores before kickoff
- 🚧 Scoring system (exact score = 3 pts, correct outcome = 1 pt)
- 🚧 Leaderboard ranked by total points
- 🚧 AI-suggested predictions powered by the Python prediction engine

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- A Firebase project (Auth + Firestore enabled)

### Setup

```bash
git clone https://github.com/AmirMotefaker/wc2026-prediction-webapp.git
cd wc2026-prediction-webapp
npm install
```

### Configure Firebase

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Authentication** → Email/Password + Google sign-in methods
3. Enable **Firestore Database** (test mode is fine to start)
4. Add a Web App in Project Settings → copy the config values
5. Create `.env.local` in the project root:

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

⚠️ `.env.local` is gitignored — never commit your Firebase keys.

### Run locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## 📁 Project Structure

```
wc2026-prediction-webapp/
├── src/
│   ├── context/
│   │   └── AuthContext.jsx     ← Auth state + user profile (Firestore)
│   ├── components/
│   │   └── ProtectedRoute.jsx  ← Route guard for logged-in users
│   ├── pages/
│   │   ├── Login.jsx
│   │   └── Signup.jsx
│   ├── firebase.js             ← Firebase init (reads .env.local)
│   ├── App.jsx                 ← Routes
│   └── main.jsx                ← Entry point
├── .env.example
├── tailwind.config.js
└── README.md
```

---

## 🗺️ Roadmap

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Project setup (Vite + React + Tailwind) | ✅ |
| 2 | Firebase setup (Auth + Firestore) | ✅ |
| 3 | Authentication (Login/Signup/Protected routes) | ✅ |
| 4 | Fixtures & groups display (real WC2026 data) | ✅ |
| 5 | Prediction form | ✅ |
| 6 | Scoring & leaderboard | ✅ |
| 7 | AI prediction integration | ✅ |

---

## 🤝 Related Projects

- [ai-football-prediction-engine-world-cup-2026](https://github.com/AmirMotefaker/ai-football-prediction-engine-world-cup-2026) — the Python/AI prediction engine that powers this app's "AI suggestion" feature

---

## ⚠️ Disclaimer

For educational and entertainment purposes. Predictions are not betting advice.

---

## 📜 License

MIT License
