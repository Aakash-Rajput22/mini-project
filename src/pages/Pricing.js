import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "../firebase/firebase";
import { doc, setDoc, getDoc, Timestamp, collection, addDoc, serverTimestamp } from "firebase/firestore";
import "../styles/dashboard.css";
import "../styles/equipment.css";

const BACKEND_URL = "https://mini-project-backend-4kid.onrender.com";

// Duration in hours. Silver = 1 month, Gold = 2 months (30-day months).
const DURATIONS_HOURS = { Free: 1, Silver: 30 * 24, Gold: 60 * 24 };

const EQUIPMENT = [
  { id: "bat", name: "Cricket Bat", price: 1500, icon: "🏏" },
  { id: "football", name: "Football", price: 800, icon: "⚽" },
  { id: "racket", name: "Badminton Racket", price: 1200, icon: "🏸" },
  { id: "basketball", name: "Basketball", price: 900, icon: "🏀" },
  { id: "volleyball", name: "Volleyball", price: 700, icon: "🏐" },
  { id: "tennis", name: "Tennis Racket", price: 2000, icon: "🎾" },
  { id: "jersey", name: "Team Jersey Set (5 pcs)", price: 2500, icon: "👕" },
  { id: "kit", name: "Sports Kit Bag + Bottle", price: 600, icon: "🎒" },
];

function Pricing() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(null);
  const [equipLoading, setEquipLoading] = useState(null);
  const [currentPlan, setCurrentPlan] = useState("Free");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists() && snap.data().plan) setCurrentPlan(snap.data().plan);
      } catch (e) {
        // keep default Free
      }
    });
    return () => unsub();
  }, []);

  const handleLogout = async () => { await signOut(auth); navigate("/login"); };

  const activatePlan = async (plan) => {
    const user = auth.currentUser;
    const hours = DURATIONS_HOURS[plan];
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + hours);
    await setDoc(doc(db, "users", user.uid), {
      plan,
      planExpiry: Timestamp.fromDate(expiry),
    }, { merge: true });
    setCurrentPlan(plan);
    const durLabel = plan === "Gold" ? "2 months" : plan === "Silver" ? "1 month" : "1 hour";
    alert(plan + " plan activated! Expires in " + durLabel + ".");
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

  const handleBuyEquipment = async (item) => {
    const user = auth.currentUser;
    if (!user) { navigate("/login"); return; }
    setEquipLoading(item.id);
    const isGold = currentPlan === "Gold";
    const finalPrice = isGold ? Math.round(item.price * 0.75) : item.price;

    try {
      const res = await fetch(BACKEND_URL + "/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "equipment", itemId: item.id, discounted: isGold }),
      });
      const data = await res.json();
      if (data.error) { alert(data.error); setEquipLoading(null); return; }

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "Knowora",
        description: item.name + (isGold ? " (Gold 25% off)" : ""),
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
          if (vData.verified) {
            try {
              await addDoc(collection(db, "users", user.uid, "purchases"), {
                itemId: item.id,
                itemName: item.name,
                pricePaid: finalPrice,
                discountApplied: isGold,
                purchasedAt: serverTimestamp(),
              });
            } catch (e) {
              console.error("Error logging purchase:", e);
            }
            alert(item.name + " purchased successfully!");
          } else {
            alert("Payment verification failed");
          }
          setEquipLoading(null);
        },
        modal: { ondismiss: () => setEquipLoading(null) },
        prefill: { email: user.email },
        theme: { color: "#f59e0b" },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      alert(error.message);
      setEquipLoading(null);
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
                <li><span className="pr-check">✓</span> 5 joins / 1 organize per month</li>
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
              <div className="pr-plan-dur">1 month access · Razorpay payment</div>
              <ul className="pr-features">
                <li><span className="pr-check">✓</span> Everything in Free</li>
                <li><span className="pr-check">✓</span> Priority match visibility</li>
                <li><span className="pr-check">✓</span> 2× points per match</li>
                <li><span className="pr-check">✓</span> 10 joins / 2 organizes per month</li>
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
              <div className="pr-plan-dur">2 months access · Razorpay payment</div>

              <ul className="pr-features">
                <li><span className="pr-check--gold">✓</span> Everything in Silver</li>
                <li><span className="pr-check--gold">✓</span> Pro player status</li>
                <li><span className="pr-check--gold">✓</span> 5× points per match</li>
                <li><span className="pr-check--gold">✓</span> Unlimited joins / 10 organizes per month</li>
                <li><span className="pr-check--gold">✓</span> Create match scorecards</li>
                <li><span className="pr-check--gold">✓</span> 25% off all sports equipment</li>
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

          {/* EQUIPMENT STORE */}
          <div className="db-section-card equip-section">
            <div className="db-section-card-header">
              <span className="db-section-card-title">Equipment Store</span>
              {currentPlan === "Gold" ? (
                <span className="db-badge db-badge--gold">🥇 25% Gold discount applied</span>
              ) : (
                <span className="equip-upsell">Upgrade to Gold to unlock 25% off everything below</span>
              )}
            </div>

            <div className="equip-grid">
              {EQUIPMENT.map((item) => {
                const isGold = currentPlan === "Gold";
                const finalPrice = isGold ? Math.round(item.price * 0.75) : item.price;
                return (
                  <div className="equip-card" key={item.id}>
                    <div className="equip-icon">{item.icon}</div>
                    <div className="equip-name">{item.name}</div>
                    <div className="equip-price">
                      {isGold && <span className="equip-price-old">₹{item.price}</span>}
                      <span className="equip-price-final">₹{finalPrice}</span>
                    </div>
                    <button
                      className="pr-btn pr-btn--gold equip-buy-btn"
                      onClick={() => handleBuyEquipment(item)}
                      disabled={equipLoading === item.id}
                    >
                      {equipLoading === item.id ? "Processing..." : "Buy now"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Pricing;