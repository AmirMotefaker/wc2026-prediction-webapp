// src/App.jsx

import { Routes, Route, Link, useNavigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

function Home() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-primary-800">⚽ WC2026 Predictor</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {profile?.displayName || "Loading..."}
            </span>
            <button
              onClick={handleSignOut}
              className="text-sm text-red-500 hover:text-red-700 font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Welcome, {profile?.displayName}! 🎉
          </h2>
          <p className="text-gray-500">
            Your total points: <span className="font-bold text-primary-600">{profile?.totalPoints ?? 0}</span>
          </p>
          <p className="text-gray-400 text-sm mt-4">
            🚧 Fixtures, predictions, and leaderboard coming in the next phases!
          </p>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
