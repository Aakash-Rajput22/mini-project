import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase/firebase";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import "../styles/dashboard.css";

const BACKEND_URL = "https://mini-project-backend-4kid.onrender.com";

function Pricing() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(null);

  const handleLogout = async () => { await signOut(auth); navigate("/login"); };

  const activatePlan = async (plan) => {
    const user = auth.currentUser;
    const durations = { Free: 1, Silver: 6, Gold: 12 };
    const hours = durations[plan];
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + hours);
    await setDoc(doc(db, "users", user.uid), {
      plan,
      planExpiry: Timestamp.fromDate(expiry),
    }, { merge: true });
    alert(plan + " plan activated! Expires in " + hours + " hour(s).");
    navigate("/dashboard");
  };

  const handlePlanSelect = async (plan) => {
    const user = auth.currentUser;
    if (!user) { navigate("/login"); return; }
    setLoading(plan);
    try {
      if (plan === "Free") { await activatePlan(plan); setLoading(null); return; }
      const res = await fetch(BACKEND_URL + "/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.error) { alert(data.error); setLoading(null); return; }
      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "Knowora",
        description: plan + " Plan",
        order_id: data.orderId,
        handler: async (response) => {
          const vRes = await fetch(BACKEND_URL + "/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              order_id: response.razorpay_order_id,
              payment_id: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            }),
          });
          const vData = await vRes.json();
          if (vData.verified) await activatePlan(plan);
          else alert("Payment verification failed");
          setLoading(null);
        },
        modal: { ondismiss: () => setLoading(null) },
        prefill: { email: user.email },
        theme: { color: "#3b82f6" },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      alert(error.message);
      setLoading(null);
    }
  };

  return (
    <div className="db-shell">

      {/* SIDEBAR */}
      <aside className="db-sidebar">
        <div className="db-sidebar-top">
          <div className="db-brand">
            <span className="db-brand-mark">K</span>
            <span className="db-brand-name">Knowora</span>
          </div>
          <nav className="db-nav">
            <span className="db-nav-label">Main</span>
            <Link to="/dashboard" className="db-nav-item">
              <i className="ti ti-layout-dashboard db-nav-ico" aria-hidden="true"></i> Dashboard
            </Link>
            <Link to="/matches" className="db-nav-item">
              <i className="ti ti-ball-basketball db-nav-ico" aria-hidden="true"></i> Matches
            </Link>
            <Link to="/leaderboard" className="db-nav-item">
              <i className="ti ti-trophy db-nav-ico" aria-hidden="true"></i> Leaderboard
            </Link>
            <Link to="/profile" className="db-nav-item">
              <i className="ti ti-user db-nav-ico" aria-hidden="true"></i> Profile
            </Link>
            <Link to="/pricing" className="db-nav-item db-nav-item--active">
              <i className="ti ti-credit-card db-nav-ico" aria-hidden="true"></i> Pricing plans
            </Link>
          </nav>
        </div>
        <div className="db-sidebar-foot">
          <button className="db-logout" onClick={handleLogout}>
            <i className="ti ti-logout" aria-hidden="true"></i> Sign out
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="db-main">
        <header className="db-topbar">
          <div>
            <h1 className="db-page-title">Pricing plans</h1>
            <p className="db-page-sub">Pay once, play for exactly as long as you need</p>
          </div>
        </header>

        <div className="db-body">

          <div className="pr-grid">

            {/* FREE */}
            <div className="pr-card">
              <div className="pr-plan-icon">🆓</div>
              <div className="pr-plan-name">Free</div>
              <div className="pr-plan-price">₹0</div>
              <div className="pr-plan-dur">1 hour access · No card required</div>
              <ul className="pr-features">
                <li><span className="pr-check">✓</span> Post &amp; join matches</li>
                <li><span className="pr-check">✓</span> Basic player profile</li>
                <li><span className="pr-check">✓</span> 1× points per match</li>
                <li><span className="pr-check">✓</span> Community leaderboard access</li>
              </ul>
              <button
                className="pr-btn"
                onClick={() => handlePlanSelect("Free")}
                disabled={loading === "Free"}
              >
                {loading === "Free" ? "Activating..." : "Get started free"}
              </button>
            </div>

            {/* SILVER */}
            <div className="pr-card pr-card--featured">
              <div className="pr-badge">Most popular</div>
              <div className="pr-plan-icon">🥈</div>
              <div className="pr-plan-name">Silver</div>
              <div className="pr-plan-price">₹199</div>
              <div className="pr-plan-dur">6 hours access · Razorpay payment</div>
              <ul className="pr-features">
                <li><span className="pr-check">✓</span> Everything in Free</li>
                <li><span className="pr-check">✓</span> Priority match visibility</li>
                <li><span className="pr-check">✓</span> 2× points per match</li>
                <li><span className="pr-check">✓</span> Silver badge on profile</li>
              </ul>
              <button
                className="pr-btn pr-btn--primary"
                onClick={() => handlePlanSelect("Silver")}
                disabled={loading === "Silver"}
              >
                {loading === "Silver" ? "Processing..." : "Choose Silver"}
              </button>
            </div>

            {/* GOLD */}
            <div className="pr-card pr-card--gold">
              <div className="pr-plan-icon">🥇</div>
              <div className="pr-plan-name">Gold</div>
              <div className="pr-plan-price">₹499</div>
              <div className="pr-plan-dur">12 hours access · Razorpay payment</div>

              <ul className="pr-features">
                <li><span className="pr-check--gold">✓</span> Everything in Silver</li>
                <li><span className="pr-check--gold">✓</span> Pro player status</li>
                <li><span className="pr-check--gold">✓</span> 5× points per match</li>
                <li><span className="pr-check--gold">✓</span> Create match scorecards</li>
                <li><span className="pr-check--gold">✓</span> Featured host on match listings</li>
              </ul>
              <button
                className="pr-btn pr-btn--gold"
                onClick={() => handlePlanSelect("Gold")}
                disabled={loading === "Gold"}
              >
                {loading === "Gold" ? "Processing..." : "Choose Gold"}
              </button>
            </div>

          </div>

          <p className="pr-note">
            All plans activate immediately on payment. Access expires automatically — no manual cancellation needed.
          </p>

        </div>
      </div>
    </div>
  );
}

export default Pricing;