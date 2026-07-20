import { Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase/firebase";
import { ToastProvider } from "./components/Toast";
import { ConfirmProvider } from "./components/ConfirmDialog";
import "./styles/toast.css";
import "./styles/skeleton.css";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Pricing from "./pages/Pricing";
import Admin from "./pages/Admin";
import Matches from "./pages/Matches";
import MatchDetail from "./pages/MatchDetail";
import Leaderboard from "./pages/Leaderboard";
import PlayerProfile from "./pages/PlayerProfile";
import Teams from "./pages/Teams";
import TeamDetail from "./pages/TeamDetail";
import Settings from "./pages/Settings";

// Root route: logged-in visitors go straight to the Dashboard.
// Logged-out visitors see the Landing page (not a forced login screen).
function RootRoute() {
  const [checking, setChecking] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setLoggedIn(!!user);
      setChecking(false);
    });
    return () => unsub();
  }, []);

  if (checking) return null;
  return loggedIn ? <Navigate to="/dashboard" /> : <Landing />;
}

function App() {
  return (
    <ToastProvider>
    <ConfirmProvider>
    <Routes>

      {/* Root: dashboard if logged in, landing otherwise */}
      <Route path="/" element={<RootRoute />} />

      {/* Authentication */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Main Pages */}
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/settings" element={<Settings />} />

      {/* PlayXchange Pages */}
      <Route path="/matches" element={<Matches />} />
      <Route path="/matches/:id" element={<MatchDetail />} />
      <Route path="/leaderboard" element={<Leaderboard />} />
      <Route path="/players/:uid" element={<PlayerProfile />} />
      <Route path="/teams" element={<Teams />} />
      <Route path="/teams/:id" element={<TeamDetail />} />

      {/* Invalid Route */}
      <Route path="*" element={<Navigate to="/" />} />

    </Routes>
    </ConfirmProvider>
    </ToastProvider>
  );
}

export default App;