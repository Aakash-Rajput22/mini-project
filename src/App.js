import { Routes, Route, Navigate } from "react-router-dom";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Pricing from "./pages/Pricing";
import Admin from "./pages/Admin";
import Matches from "./pages/Matches";
import MatchDetail from "./pages/MatchDetail";

function App() {
  return (
    <Routes>

      {/* Landing Page */}
      <Route path="/" element={<Landing />} />

      {/* Authentication */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Main Pages */}
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/admin" element={<Admin />} />

      {/* PlayXchange Pages */}
      <Route path="/matches" element={<Matches />} />
      <Route path="/matches/:id" element={<MatchDetail />} />

      {/* Invalid Route */}
      <Route path="*" element={<Navigate to="/" />} />

    </Routes>
  );
}

export default App;