// src/App.jsx — safe version with error boundaries

import { Routes, Route, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Home from "./pages/Home";
import MyPredictions from "./pages/MyPredictions";
import Profile from "./pages/Profile";

const GITHUB_URL = "https://github.com/AmirMotefaker/wc2026-prediction-webapp";
const SITE_URL   = "https://amirmotefaker.ir";

const NAV_LINKS = [
  { to: "/",               label: "Dashboard", icon: "⚽" },
  { to: "/my-predictions", label: "My Picks",  icon: "🎯" },
];

function GitHubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
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
    <div style={{ minHeight: "100vh", background: "#0D1B2A" }}>
      {/* Header */}
      <header style={{ background: "#1A3A5C", borderBottom: "1px solid #C8A84B22", position: "sticky", top: 0, zIndex: 50 }}>
        <div className="max-w-4xl mx-auto px-4" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 52 }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>⚽</span>
            <div>
              <span style={{ fontWeight: 900, fontSize: 14, color: "#C8A84B", letterSpacing: 0.5 }}>
                WorldCup 2026 Predictor
              </span>
              <span style={{ color: "#7BA4C5", fontSize: 13 }}> by </span>
              <a href="https://github.com/AmirMotefaker" target="_blank" rel="noreferrer"
                style={{ fontWeight: 700, fontSize: 13, color: "#C8A84B", textDecoration: "none" }}>
                Amir Motefaker
              </a>
            </div>
          </div>

          {/* Right */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" style={{ color: "#7BA4C5" }} title="GitHub">
              <GitHubIcon />
            </a>
            <a href={SITE_URL} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#7BA4C5", textDecoration: "none" }}>🌐</a>

            <button onClick={() => navigate("/profile")} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer" }}>
              {profile?.photoURL
                ? <img src={profile.photoURL} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} />
                : <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#C8A84B", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, color: "#0D1B2A" }}>
                    {profile?.displayName?.[0]?.toUpperCase() || "?"}
                  </div>
              }
              <span style={{ fontSize: 12, color: "#7BA4C5", fontWeight: 600 }} className="hidden sm:inline">{profile?.displayName}</span>
            </button>

            <span style={{ fontSize: 13, fontWeight: 900, color: "#C8A84B" }} className="hidden sm:inline">
              {profile?.totalPoints ?? 0} pts
            </span>

            <button onClick={handleSignOut}
              style={{ fontSize: 11, color: "#FC8181", border: "1px solid #FC818133", borderRadius: 6, padding: "4px 8px", background: "none", cursor: "pointer" }}>
              Sign Out
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav className="max-w-4xl mx-auto px-4" style={{ display: "flex", gap: 0, marginBottom: -1, overflowX: "auto" }}>
          {NAV_LINKS.map(link => (
            <Link key={link.to} to={link.to}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 16px", fontSize: 13, fontWeight: 600,
                borderBottom: location.pathname === link.to ? "2px solid #C8A84B" : "2px solid transparent",
                color: location.pathname === link.to ? "#C8A84B" : "#7BA4C5",
                textDecoration: "none", whiteSpace: "nowrap", transition: "color .2s",
              }}>
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
      <Route path="/my-predictions" element={<ProtectedLayout component={MyPredictions} />} />
      <Route path="/profile"        element={<ProtectedLayout component={Profile} />} />
    </Routes>
  );
}
