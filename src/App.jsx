// src/App.jsx

import { Routes, Route, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Home from "./pages/Home";
import Groups from "./pages/Groups";
import Fixtures from "./pages/Fixtures";
import MyPredictions from "./pages/MyPredictions";
import Profile from "./pages/Profile";

const GITHUB_URL = "https://github.com/AmirMotefaker/wc2026-prediction-webapp";
const SITE_URL   = "https://amirmotefaker.ir";

const NAV_LINKS = [
  { to: "/",                label: "Dashboard",  icon: "⚽" },
  { to: "/my-predictions",  label: "My Picks",   icon: "🎯" },
  { to: "/groups",          label: "Groups",     icon: "🗂️" },
  { to: "/fixtures",        label: "Fixtures",   icon: "📅" },
];

function GitHubIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.39.6.11.82-.26.82-.58 0-.29-.01-1.04-.02-2.04-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.21.08 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 016 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.49 5.92.43.37.81 1.1.81 2.22 0 1.6-.01 2.89-.01 3.29 0 .32.22.7.83.58A12.01 12.01 0 0024 12c0-6.63-5.37-12-12-12z"/>
    </svg>
  );
}

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
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl">⚽</span>
            <h1 className="font-bold text-primary-800 text-base sm:text-lg truncate">
              WorldCup 2026 Predictor by{" "}
              <a href="https://github.com/AmirMotefaker" target="_blank" rel="noreferrer" className="hover:underline text-primary-600">
                Amir Motefaker
              </a>
            </h1>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" title="View source on GitHub" className="text-gray-500 hover:text-gray-800 transition">
              <GitHubIcon className="w-5 h-5" />
            </a>
            <a href={SITE_URL} target="_blank" rel="noreferrer" title="amirmotefaker.ir" className="text-gray-500 hover:text-primary-600 transition">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </a>

            <button onClick={() => navigate("/profile")} className="flex items-center gap-2 group">
              {profile?.photoURL ? (
                <img src={profile.photoURL} alt="" className="w-7 h-7 rounded-full object-cover border border-gray-200" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-xs font-bold text-primary-600">
                  {profile?.displayName?.[0]?.toUpperCase() || "?"}
                </div>
              )}
              <span className="text-sm text-gray-600 hidden sm:inline font-medium group-hover:text-primary-600">
                {profile?.displayName}
              </span>
            </button>

            <span className="text-sm text-primary-600 font-bold hidden sm:inline">
              {profile?.totalPoints ?? 0} pts
            </span>

            <button onClick={handleSignOut} className="text-xs text-red-500 hover:text-red-700 border border-red-200 px-2 py-1 rounded hover:bg-red-50 transition">
              Sign Out
            </button>
          </div>
        </div>

        <nav className="max-w-4xl mx-auto px-4 flex gap-0 -mb-px overflow-x-auto">
          {NAV_LINKS.map((link) => (
            <Link key={link.to} to={link.to}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition ${
                location.pathname === link.to ? "border-primary-600 text-primary-600" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>
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
      <Layout><Component /></Layout>
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
      <Route path="/profile"        element={<ProtectedLayout component={Profile} />} />
    </Routes>
  );
}
