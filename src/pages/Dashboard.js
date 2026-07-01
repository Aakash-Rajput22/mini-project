import { Link, useNavigate } from "react-router-dom";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase/firebase";
import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import "../styles/dashboard.css";

function Dashboard() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [timeLeft, setTimeLeft] = useState("");
  const [timePercent, setTimePercent] = useState(100);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { navigate("/login"); return; }
      setCurrentUser(user);
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        setUserData(data);
        if (data.role === "admin") setIsAdmin(true);
      }
    });
    return () => unsub();
  }, [navigate]);

  useEffect(() => {
    if (!userData || !userData.planExpiry) return;
    const durations = { Free: 3600000, Silver: 21600000, Gold: 43200000 };
    const total = durations[userData.plan] || 3600000;
    const interval = setInterval(() => {
      const now = new Date();
      const expiry = userData.planExpiry.toDate();
      const diff = expiry - now;
      if (diff <= 0) {
        setTimeLeft("Expired");
        setTimePercent(0);
        clearInterval(interval);
      } else {
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setTimeLeft(h + "h " + m + "m " + s + "s");
        setTimePercent(Math.min(100, (diff / total) * 100));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [userData]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const planColor = (plan) => {
    if (plan === "Gold") return "db-badge--gold";
    if (plan === "Silver") return "db-badge--silver";
    return "db-badge--free";
  };

  const planIcon = (plan) => {
    if (plan === "Gold") return "🥇";
    if (plan === "Silver") return "🥈";
    return "🆓";
  };

  return (
    <div className="db-shell">

      {/* ── SIDEBAR ── */}
      <aside className="db-sidebar">
        <div className="db-sidebar-top">
          <div className="db-brand">
            <span className="db-brand-mark">M</span>
            <span className="db-brand-name">Mini Project</span>
          </div>

          <nav className="db-nav">
            <span className="db-nav-label">Main</span>
            <Link to="/dashboard" className="db-nav-item db-nav-item--active">
              <span className="db-nav-ico">📊</span> Dashboard
            </Link>
            <Link to="/profile" className="db-nav-item">
              <span className="db-nav-ico">👤</span> Profile
            </Link>
            <Link to="/pricing" className="db-nav-item">
              <span className="db-nav-ico">💳</span> Pricing plans
            </Link>
            {isAdmin && (
              <>
                <span className="db-nav-label" style={{marginTop: "16px"}}>Admin</span>
                <Link to="/admin" className="db-nav-item">
                  <span className="db-nav-ico">🛡️</span> Admin panel
                </Link>
              </>
            )}
          </nav>
        </div>

        <div className="db-sidebar-foot">
          <div className="db-user-row">
            <div className="db-user-avatar">
              {userData && userData.name ? userData.name.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="db-user-info">
              <div className="db-user-name">{userData && userData.name ? userData.name : "User"}</div>
              <div className="db-user-email">{currentUser ? currentUser.email : ""}</div>
            </div>
          </div>
          <button className="db-logout" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="db-main">

        {/* TOPBAR */}
        <header className="db-topbar">
          <div>
            <h1 className="db-page-title">Dashboard</h1>
            <p className="db-page-sub">
              {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <div className="db-topbar-right">
            {userData && userData.plan && (
              <span className={"db-badge " + planColor(userData.plan)}>
                {planIcon(userData.plan)} {userData.plan} plan
              </span>
            )}
          </div>
        </header>

        {/* BODY */}
        <div className="db-body">

          {/* ── PLAN STATUS ── */}
          <div className="db-plan-card">
            <div className="db-plan-left">
              <div className="db-plan-icon">{planIcon(userData && userData.plan ? userData.plan : "Free")}</div>
              <div>
                <p className="db-plan-label">Current plan</p>
                <p className="db-plan-name">{userData && userData.plan ? userData.plan : "Free"}</p>
                {userData && userData.planExpiry ? (
                  <p className={"db-plan-timer " + (timeLeft === "Expired" ? "db-plan-timer--expired" : "")}>
                    {timeLeft === "Expired" ? "⚠️ Access expired" : "⏱ Expires in " + timeLeft}
                  </p>
                ) : (
                  <p className="db-plan-timer db-plan-timer--none">No active session</p>
                )}
              </div>
            </div>
            <div className="db-plan-right">
              {userData && userData.planExpiry && timeLeft !== "Expired" && (
                <div className="db-plan-progress-wrap">
                  <div className="db-plan-progress-label">Session remaining</div>
                  <div className="db-plan-progress-bar">
                    <div className="db-plan-progress-fill" style={{width: timePercent + "%"}} />
                  </div>
                  <div className="db-plan-progress-pct">{Math.round(timePercent)}%</div>
                </div>
              )}
              <button className="db-upgrade-btn" onClick={() => navigate("/pricing")}>
                {userData && userData.plan && userData.plan !== "Free" ? "Change plan" : "Upgrade plan"}
              </button>
            </div>
          </div>

          {/* ── STAT CARDS ── */}
          <div className="db-stats-grid">
            <div className="db-stat-card">
              <div className="db-stat-icon db-stat-icon--blue">💳</div>
              <div>
                <p className="db-stat-label">Active plan</p>
                <p className="db-stat-value">{userData && userData.plan ? userData.plan : "Free"}</p>
              </div>
            </div>

            <div className="db-stat-card">
              <div className={"db-stat-icon " + (userData && userData.name ? "db-stat-icon--green" : "db-stat-icon--amber")}>
                {userData && userData.name ? "✅" : "⚠️"}
              </div>
              <div>
                <p className="db-stat-label">Profile status</p>
                <p className="db-stat-value">{userData && userData.name ? "Complete" : "Incomplete"}</p>
              </div>
            </div>

            <div className="db-stat-card">
              <div className={"db-stat-icon " + (currentUser && currentUser.emailVerified ? "db-stat-icon--green" : "db-stat-icon--amber")}>
                {currentUser && currentUser.emailVerified ? "✅" : "⚠️"}
              </div>
              <div>
                <p className="db-stat-label">Email verified</p>
                <p className="db-stat-value">{currentUser && currentUser.emailVerified ? "Verified" : "Not verified"}</p>
              </div>
            </div>

            <div className="db-stat-card">
              <div className="db-stat-icon db-stat-icon--purple">🔐</div>
              <div>
                <p className="db-stat-label">Account role</p>
                <p className="db-stat-value">{isAdmin ? "Admin" : "User"}</p>
              </div>
            </div>
          </div>

          {/* ── QUICK ACTIONS ── */}
          <div className="db-section-title">Quick actions</div>
          <div className="db-quick-grid">
            <Link to="/profile" className="db-quick-card">
              <div className="db-quick-icon">👤</div>
              <div>
                <div className="db-quick-name">Update profile</div>
                <div className="db-quick-desc">Edit your name, photo and address</div>
              </div>
              <span className="db-quick-arrow">→</span>
            </Link>

            <Link to="/pricing" className="db-quick-card">
              <div className="db-quick-icon">⚡</div>
              <div>
                <div className="db-quick-name">Get more time</div>
                <div className="db-quick-desc">Upgrade to Silver or Gold plan</div>
              </div>
              <span className="db-quick-arrow">→</span>
            </Link>

            {isAdmin && (
              <Link to="/admin" className="db-quick-card">
                <div className="db-quick-icon">🛡️</div>
                <div>
                  <div className="db-quick-name">Admin panel</div>
                  <div className="db-quick-desc">Manage users and view all accounts</div>
                </div>
                <span className="db-quick-arrow">→</span>
              </Link>
            )}
          </div>

          {/* ── PRICING PLANS ── */}
          <div className="db-section-title">Pricing plans</div>
          <div className="db-plans-grid">

            <div className="db-plan-option">
              <div className="db-plan-option-header">
                <span className="db-plan-option-name">Free</span>
                <span className="db-plan-option-price">₹0</span>
              </div>
              <p className="db-plan-option-dur">1 hour access</p>
              <ul className="db-plan-option-features">
                <li>Basic access</li>
                <li>Profile management</li>
              </ul>
              <button className="db-plan-option-btn" onClick={() => navigate("/pricing?plan=Free")}>
                Get Free
              </button>
            </div>

            <div className="db-plan-option db-plan-option--featured">
              <div className="db-plan-option-badge">Most popular</div>
              <div className="db-plan-option-header">
                <span className="db-plan-option-name">Silver</span>
                <span className="db-plan-option-price">₹199</span>
              </div>
              <p className="db-plan-option-dur">6 hours access</p>
              <ul className="db-plan-option-features">
                <li>All Free features</li>
                <li>Priority support</li>
                <li>Extended access</li>
              </ul>
              <button className="db-plan-option-btn db-plan-option-btn--primary" onClick={() => navigate("/pricing?plan=Silver")}>
                Get Silver
              </button>
            </div>

            <div className="db-plan-option db-plan-option--gold">
              <div className="db-plan-option-header">
                <span className="db-plan-option-name">Gold</span>
                <span className="db-plan-option-price">₹499</span>
              </div>
              <p className="db-plan-option-dur">12 hours access</p>
              <ul className="db-plan-option-features">
                <li>All Silver features</li>
                <li>Premium support</li>
                <li>Full access</li>
              </ul>
              <button className="db-plan-option-btn db-plan-option-btn--gold" onClick={() => navigate("/pricing?plan=Gold")}>
                Get Gold
              </button>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}

export default Dashboard;