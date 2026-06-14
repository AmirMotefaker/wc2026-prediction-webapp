// src/App.jsx

import { Routes, Route, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Groups from "./pages/Groups";
import Fixtures from "./pages/Fixtures";

function Layout({ children }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  const navLinks = [
    { to: "/", label: "Home" },
    { to: "/groups", label: "Groups" },
    { to: "/fixtures", label: "Fixtures" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-primary-800">⚽ WC2026 Predictor</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 hidden sm:inline">
              {profile?.displayName}
            </span>
            <button
              onClick={handleSignOut}
              className="text-sm text-red-500 hover:text-red-700 font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
        <nav className="max-w-4xl mx-auto px-4 flex gap-1 -mb-px">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
                location.pathname === link.to
                  ? "border-primary-600 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>

      <main>{children}</main>
    </div>
  );
}

function Home() {
  const { profile } = useAuth();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-xl shadow-sm p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Welcome, {profile?.displayName}! 🎉
        </h2>
        <p className="text-gray-500">
          Your total points: <span className="font-bold text-primary-600">{profile?.totalPoints ?? 0}</span>
        </p>
        <div className="flex gap-3 justify-center mt-6">
          <Link
            to="/groups"
            className="bg-primary-600 hover:bg-primary-800 text-white font-medium px-4 py-2 rounded-lg transition"
          >
            View Groups
          </Link>
          <Link
            to="/fixtures"
            className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium px-4 py-2 rounded-lg transition"
          >
            View Fixtures
          </Link>
        </div>
        <p className="text-gray-400 text-sm mt-6">
          🚧 Predictions and leaderboard coming in the next phases!
        </p>
      </div>
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
            <Layout><Home /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/groups"
        element={
          <ProtectedRoute>
            <Layout><Groups /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/fixtures"
        element={
          <ProtectedRoute>
            <Layout><Fixtures /></Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
