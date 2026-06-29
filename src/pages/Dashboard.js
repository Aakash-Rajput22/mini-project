import { Link, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/firebase";
import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import Card from "../components/Card";
import "../styles/dashboard.css";

function Dashboard() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      const user = auth.currentUser;
      if (user) {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) setUserData(snap.data());
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (!userData || !userData.planExpiry) return;
    const interval = setInterval(() => {
      const now = new Date();
      const expiry = userData.planExpiry.toDate();
      const diff = expiry - now;
      if (diff <= 0) {
        setTimeLeft("Expired");
        clearInterval(interval);
      } else {
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setTimeLeft(h + "h " + m + "m " + s + "s");
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [userData]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      alert(error.message);
    }
  };

  const handlePlanSelect = (plan) => {
    navigate("/pricing?plan=" + plan);
  };

  const getPlanBadgeClass = (plan) => {
    if (plan === "Gold") return "badge badge-gold";
    if (plan === "Silver") return "badge badge-silver";
    return "badge badge-free";
  };

  return (
    <div className="app">

      <aside className="sidebar">
        <div className="sidebar-brand">Mini Project</div>
        <nav>
          <Link to="/dashboard" className="nav-item active">Dashboard</Link>
          <Link to="/profile" className="nav-item">Profile</Link>
          <Link to="/pricing" className="nav-item">Pricing plans</Link>
        </nav>
        <div className="sidebar-bottom">
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>

      <div className="main">

        <header className="topbar">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-sub">
              Welcome back, {userData && userData.name ? userData.name : auth.currentUser ? auth.currentUser.email : ""}
            </p>
          </div>
          {userData && userData.plan && (
            <span className={getPlanBadgeClass(userData.plan)}>
              {userData.plan} plan
            </span>
          )}
        </header>

        <div className="page-body">

          <div className="plan-status-card">
            <div className="plan-status-left">
              <p className="stat-label">Current plan</p>
              <p className="plan-name">{userData && userData.plan ? userData.plan : "Free"}</p>
              {userData && userData.planExpiry ? (
                <p className="plan-expiry">
                  Expires in: <span className={timeLeft === "Expired" ? "down" : "up"}>{timeLeft}</span>
                </p>
              ) : (
                <p className="plan-expiry">No active plan</p>
              )}
            </div>
            <div className="plan-status-right">
              <button className="upgrade-btn" onClick={() => navigate("/pricing")}>
                Upgrade plan
              </button>
            </div>
          </div>

          <div className="card-container">
            <Card title="Plan" value={userData && userData.plan ? userData.plan : "Free"} />
            <Card title="Profile" value={userData && userData.name ? "Complete" : "Incomplete"} />
            <Card title="Email verified" value={auth.currentUser && auth.currentUser.emailVerified ? "Yes" : "No"} />
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">Pricing plans</span>
            </div>
            <div className="plans-grid">

              <div className="plan-card">
                <p className="plan-card-name">Free</p>
                <p className="plan-card-price">Rs. 0</p>
                <p className="plan-card-duration">1 hour access</p>
                <ul className="plan-features">
                  <li>Basic access</li>
                  <li>Profile management</li>
                </ul>
                <button className="plan-btn plan-btn-free" onClick={() => handlePlanSelect("Free")}>
                  Get Free
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
                <button className="plan-btn plan-btn-silver" onClick={() => handlePlanSelect("Silver")}>
                  Get Silver
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
                <button className="plan-btn plan-btn-gold" onClick={() => handlePlanSelect("Gold")}>
                  Get Gold
                </button>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Dashboard;