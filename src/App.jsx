// src/App.jsx

import { Routes, Route, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Home from "./pages/Home";
import Groups from "./pages/Groups";
import Fixtures from "./pages/Fixtures";
import Predictions from "./pages/Predictions";
import MyPredictions from "./pages/MyPredictions";

const NAV_LINKS = [
  { to: "/",                label: "Home",          icon: "🏠" },
  { to: "/groups",          label: "Groups",        icon: "🗂️" },
  { to: "/fixtures",        label: "Fixtures",      icon: "📅" },
  { to: "/my-predictions",  label: "My Picks",      icon: "🎯" },
  { to: "/predictions",     label: "AI Predictions",icon: "🤖" },
];

function Layout({ children }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚽</span>
            <span className="font-bold text-primary-800 text-lg">
              WC2026 Predictor
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 hidden sm:inline font-medium">
              {profile?.displayName}
            </span>
            <span className="text-sm text-primary-600 font-bold hidden sm:inline">
              {profile?.totalPoints ?? 0} pts
            </span>
            <button
              onClick={handleSignOut}
              className="text-xs text-red-500 hover:text-red-700 border border-red-200 px-2 py-1 rounded hover:bg-red-50 transition"
            >
              Sign Out
            </button>
          </div>
        </div>

        <nav className="max-w-4xl mx-auto px-4 flex gap-0 -mb-px overflow-x-auto">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition ${
                location.pathname === link.to
                  ? "border-primary-600 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <span>{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          ))}
        </nav>
      </header>

      <main>{children}</main>
    </div>
  );
}

function ProtectedLayout({ component: Component }) {
  return (
    <ProtectedRoute>
      <Layout>
        <Component />
      </Layout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login"  element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/"               element={<ProtectedLayout component={Home} />} />
      <Route path="/groups"         element={<ProtectedLayout component={Groups} />} />
      <Route path="/fixtures"       element={<ProtectedLayout component={Fixtures} />} />
      <Route path="/my-predictions" element={<ProtectedLayout component={MyPredictions} />} />
      <Route path="/predictions"    element={<ProtectedLayout component={Predictions} />} />
    </Routes>
  );
}
