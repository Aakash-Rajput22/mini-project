import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase/firebase";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import "../styles/dashboard.css";

function Pricing() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(null);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const handlePlanSelect = async (plan) => {
    const user = auth.currentUser;
    if (!user) { navigate("/login"); return; }

    setLoading(plan);

    try {
      const durations = { Free: 1, Silver: 6, Gold: 12 };
      const hours = durations[plan];
      const expiry = new Date();
      expiry.setHours(expiry.getHours() + hours);

      await setDoc(doc(db, "users", user.uid), {
        plan: plan,
        planExpiry: Timestamp.fromDate(expiry),
      }, { merge: true });

      alert(plan + " plan activated! Expires in " + hours + " hour(s).");
      navigate("/dashboard");
    } catch (error) {
      alert(error.message);
    }

    setLoading(null);
  };

  return (
    <div className="app">

      <aside className="sidebar">
        <div className="sidebar-brand">Mini Project</div>
        <nav>
          <Link to="/dashboard" className="nav-item">Dashboard</Link>
          <Link to="/profile" className="nav-item">Profile</Link>
          <Link to="/pricing" className="nav-item active">Pricing plans</Link>
        </nav>
        <div className="sidebar-bottom">
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </aside>

      <div className="main">

        <header className="topbar">
          <div>
            <h1 className="page-title">Pricing plans</h1>
            <p className="page-sub">Choose a plan that works for you</p>
          </div>
        </header>

        <div className="page-body">
          <div className="plans-grid">

            <div className="plan-card">
              <p className="plan-card-name">Free</p>
              <p className="plan-card-price">Rs. 0</p>
              <p className="plan-card-duration">1 hour access</p>
              <ul className="plan-features">
                <li>Basic access</li>
                <li>Profile management</li>
              </ul>
              <button
                className="plan-btn plan-btn-free"
                onClick={() => handlePlanSelect("Free")}
                disabled={loading === "Free"}
              >
                {loading === "Free" ? "Activating..." : "Get Free"}
              </button>
            </div>

            <div className="plan-card plan-card-popular">
              <span className="popular-badge">Most popular</span>
              <p className="plan-card-name">Silver</p>
              <p className="plan-card-price">Rs. 199</p>
              <p className="plan-card-duration">6 hours access</p>
              <ul className="plan-features">
                <li>All Free features</li>
                <li>Priority support</li>
                <li>Extended access</li>
              </ul>
              <button
                className="plan-btn plan-btn-silver"
                onClick={() => handlePlanSelect("Silver")}
                disabled={loading === "Silver"}
              >
                {loading === "Silver" ? "Activating..." : "Get Silver"}
              </button>
            </div>

            <div className="plan-card">
              <p className="plan-card-name">Gold</p>
              <p className="plan-card-price">Rs. 499</p>
              <p className="plan-card-duration">12 hours access</p>
              <ul className="plan-features">
                <li>All Silver features</li>
                <li>Premium support</li>
                <li>Full access</li>
              </ul>
              <button
                className="plan-btn plan-btn-gold"
                onClick={() => handlePlanSelect("Gold")}
                disabled={loading === "Gold"}
              >
                {loading === "Gold" ? "Activating..." : "Get Gold"}
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

export default Pricing;