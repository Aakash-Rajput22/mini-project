import { Link, useNavigate } from "react-router-dom";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase/firebase";
import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc, deleteField, collection, query, where, getDocs } from "firebase/firestore";
import "../styles/dashboard.css";

function Dashboard() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const [timePercent, setTimePercent] = useState(100);
  const [isAdmin, setIsAdmin] = useState(false);

  const [myMatchStats, setMyMatchStats] = useState({
    joinedCount: 0,
    createdCount: 0,
    upcomingCount: 0,
  });
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [sportStats, setSportStats] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);

  const SPORTS = ["Cricket", "Football", "Badminton", "Basketball", "Volleyball", "Tennis", "Other"];

  const sportIcon = (s) => {
    const icons = {
      Cricket: "🏏",
      Football: "⚽",
      Badminton: "🏸",
      Basketball: "🏀",
      Volleyball: "🏐",
      Tennis: "🎾",
      Other: "🎮",
    };
    return icons[s] || "🎮";
  };

  // Fetches match stats. Works for both logged-in (personal stats) and
  // guest (uid = null, only general/upcoming stats) views.
  const fetchMatchStats = async (uid) => {
    setStatsLoading(true);
    try {
      const allSnap = await getDocs(collection(db, "matches"));
      const allMatches = allSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const now = new Date();

      const upcomingAll = allMatches
        .filter((m) => {
          const d = m.date?.toDate ? m.date.toDate() : new Date(m.date);
          return d >= now;
        })
        .sort((a, b) => {
          const da = a.date?.toDate ? a.date.toDate() : new Date(a.date);
          const dbb = b.date?.toDate ? b.date.toDate() : new Date(b.date);
          return da - dbb;
        })
        .slice(0, 5);

      const sportCounts = SPORTS.map((s) => ({
        sport: s,
        count: allMatches.filter((m) => m.sport === s && (() => {
          const d = m.date?.toDate ? m.date.toDate() : new Date(m.date);
          return d >= now;
        })()).length,
      }));

      setUpcomingMatches(upcomingAll);
      setSportStats(sportCounts);

      if (uid) {
        const createdSnap = await getDocs(
          query(collection(db, "matches"), where("createdBy", "==", uid))
        );
        const joinedMatches = allMatches.filter((m) => m.joinedPlayers?.includes(uid));
        const upcomingJoined = joinedMatches.filter((m) => {
          const d = m.date?.toDate ? m.date.toDate() : new Date(m.date);
          return d >= now;
        });
        setMyMatchStats({
          joinedCount: joinedMatches.length,
          createdCount: createdSnap.size,
          upcomingCount: upcomingJoined.length,
        });
      } else {
        setMyMatchStats({ joinedCount: 0, createdCount: 0, upcomingCount: 0 });
      }
    } catch (err) {
      console.error("Error fetching match stats:", err);
    }
    setStatsLoading(false);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setAuthChecked(true);
      if (!user) {
        // Guest mode: show the dashboard shell with general stats only.
        setCurrentUser(null);
        setUserData(null);
        setIsAdmin(false);
        fetchMatchStats(null);
        return;
      }
      setCurrentUser(user);
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        setUserData(data);
        if (data.role === "admin") setIsAdmin(true);
      }
      fetchMatchStats(user.uid);
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Countdown + auto-downgrade to Free once a paid plan expires.
  useEffect(() => {
    if (!currentUser || !userData || !userData.planExpiry) return;

    const durationsMs = { Free: 3600000, Silver: 30 * 24 * 3600000, Gold: 60 * 24 * 3600000 };
    const total = durationsMs[userData.plan] || 3600000;
    let downgraded = false;

    const tick = () => {
      const now = new Date();
      const expiry = userData.planExpiry.toDate();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft("Expired");
        setTimePercent(0);
        if (!downgraded && userData.plan !== "Free") {
          downgraded = true;
          updateDoc(doc(db, "users", currentUser.uid), {
            plan: "Free",
            planExpiry: deleteField(),
          }).then(() => {
            setUserData((prev) => (prev ? { ...prev, plan: "Free", planExpiry: null } : prev));
          }).catch((e) => console.error("Error auto-downgrading plan:", e));
        }
        return;
      }

      const totalSeconds = Math.floor(diff / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      setTimeLeft(
        days > 0 ? `${days}d ${hours}h ${minutes}m` : `${hours}h ${minutes}m ${seconds}s`
      );
      setTimePercent(Math.min(100, Math.round((diff / total) * 100)));
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [userData, currentUser]);

  const handleLogout = async () => { await signOut(auth); navigate("/login"); };

  const requireLogin = () => navigate("/login");

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

  const plan = userData?.plan || "Free";
  const isGuest = authChecked && !currentUser;

  const formatMatchDate = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
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
            <Link to="/dashboard" className="db-nav-item db-nav-item--active">
              <i className="ti ti-layout-dashboard db-nav-ico" aria-hidden="true"></i> Dashboard
            </Link>
            <Link to="/matches" className="db-nav-item">
              <i className="ti ti-ball-basketball db-nav-ico" aria-hidden="true"></i> Matches
            </Link>
            <Link to="/teams" className="db-nav-item">
              <i className="ti ti-users-group db-nav-ico" aria-hidden="true"></i> Teams
            </Link>
            <Link to="/leaderboard" className="db-nav-item">
              <i className="ti ti-trophy db-nav-ico" aria-hidden="true"></i> Leaderboard
            </Link>
            {isGuest ? (
              <button
                className="db-nav-item"
                onClick={requireLogin}
                style={{ background: "none", border: "none", width: "100%", textAlign: "left", cursor: "pointer", font: "inherit" }}
              >
                <i className="ti ti-user db-nav-ico" aria-hidden="true"></i> Profile
              </button>
            ) : (
              <Link to="/profile" className="db-nav-item">
                <i className="ti ti-user db-nav-ico" aria-hidden="true"></i> Profile
              </Link>
            )}
            <Link to="/pricing" className="db-nav-item">
              <i className="ti ti-credit-card db-nav-ico" aria-hidden="true"></i> Pricing plans
            </Link>
            {isAdmin && (
              <>
                <span className="db-nav-label" style={{marginTop:"16px"}}>Admin</span>
                <Link to="/admin" className="db-nav-item">
                  <i className="ti ti-shield db-nav-ico" aria-hidden="true"></i> Admin panel
                </Link>
              </>
            )}
          </nav>
        </div>

        <div className="db-sidebar-foot">
          {isGuest ? (
            <button className="db-upgrade-btn" onClick={requireLogin} style={{width: "100%"}}>
              <i className="ti ti-login" aria-hidden="true"></i> Log in / Sign up
            </button>
          ) : (
            <>
              <div className="db-user-row">
                <div className="db-user-avatar">
                  {userData?.name ? userData.name.charAt(0).toUpperCase() : "U"}
                </div>
                <div className="db-user-info">
                  <div className="db-user-name">{userData?.name || "User"}</div>
                  <div className="db-user-email">{currentUser?.email || ""}</div>
                </div>
              </div>
              <button className="db-logout" onClick={handleLogout}>
                <i className="ti ti-logout" aria-hidden="true"></i> Sign out
              </button>
            </>
          )}
        </div>
      </aside>

      {/* MAIN */}
      <div className="db-main">

        {/* TOPBAR */}
        <header className="db-topbar">
          <div>
            <h1 className="db-page-title">Dashboard</h1>
            <p className="db-page-sub">
              {new Date().toLocaleDateString("en-IN", { weekday:"long", day:"numeric", month:"long", year:"numeric" })}
            </p>
          </div>
          <div className="db-topbar-right">
            {!isGuest && userData?.plan && (
              <span className={"db-badge " + planColor(plan)}>
                {planIcon(plan)} {plan} plan
              </span>
            )}
          </div>
        </header>

        <div className="db-body">

          {/* GUEST BANNER */}
          {isGuest && (
            <div className="db-plan-hero">
              <div className="db-plan-hero-left">
                <div className="db-plan-hero-icon">👋</div>
                <div>
                  <p className="db-plan-hero-label">You're browsing as a guest</p>
                  <p className="db-plan-hero-name" style={{fontSize:"16px"}}>
                    Login to join or host matches, track points, and manage your profile
                  </p>
                </div>
              </div>
              <div className="db-plan-hero-right">
                <button className="db-upgrade-btn" onClick={requireLogin}>
                  <i className="ti ti-login" aria-hidden="true"></i> Log in / Sign up
                </button>
              </div>
            </div>
          )}

          {/* PLAN HERO CARD */}
          {!isGuest && (
            <div className="db-plan-hero">
              <div className="db-plan-hero-left">
                <div className="db-plan-hero-icon">{planIcon(plan)}</div>
                <div>
                  <p className="db-plan-hero-label">Current plan</p>
                  <p className="db-plan-hero-name">{plan}</p>
                  {userData?.planExpiry ? (
                    <p className={"db-plan-hero-timer " + (timeLeft === "Expired" ? "db-timer--red" : "db-timer--green")}>
                      <i className={"ti " + (timeLeft === "Expired" ? "ti-alert-triangle" : "ti-clock")} aria-hidden="true"></i>
                      {timeLeft === "Expired" ? " Access expired" : " Expires in " + timeLeft}
                    </p>
                  ) : (
                    <p className="db-plan-hero-timer db-timer--muted">
                      <i className="ti ti-clock" aria-hidden="true"></i> No active session
                    </p>
                  )}
                </div>
              </div>

              <div className="db-plan-hero-right">
                {userData?.planExpiry && timeLeft !== "Expired" && (
                  <div className="db-progress-block">
                    <div className="db-progress-top">
                      <span>Session remaining</span>
                      <span>{timePercent}%</span>
                    </div>
                    <div className="db-progress-track">
                      <div className="db-progress-fill" style={{width: timePercent + "%"}} />
                    </div>
                  </div>
                )}
                <button className="db-upgrade-btn" onClick={() => navigate("/pricing")}>
                  <i className="ti ti-bolt" aria-hidden="true"></i>
                  {plan !== "Free" ? " Change plan" : " Upgrade plan"}
                </button>
              </div>
            </div>
          )}

          {/* STAT CARDS */}
          {!isGuest && (
            <div className="db-stats-grid">
              <div className="db-stat-card">
                <div className="db-stat-top">
                  <span className="db-stat-label">Active plan</span>
                  <div className="db-stat-ico db-ico--blue">
                    <i className="ti ti-credit-card" aria-hidden="true"></i>
                  </div>
                </div>
                <p className="db-stat-value">{plan}</p>
              </div>

              <div className="db-stat-card">
                <div className="db-stat-top">
                  <span className="db-stat-label">Profile</span>
                  <div className={"db-stat-ico " + (userData?.name ? "db-ico--green" : "db-ico--amber")}>
                    <i className={"ti " + (userData?.name ? "ti-circle-check" : "ti-alert-circle")} aria-hidden="true"></i>
                  </div>
                </div>
                <p className="db-stat-value">{userData?.name ? "Complete" : "Incomplete"}</p>
              </div>

              <div className="db-stat-card">
                <div className="db-stat-top">
                  <span className="db-stat-label">Email verified</span>
                  <div className={"db-stat-ico " + (currentUser?.emailVerified ? "db-ico--green" : "db-ico--amber")}>
                    <i className={"ti " + (currentUser?.emailVerified ? "ti-circle-check" : "ti-mail")} aria-hidden="true"></i>
                  </div>
                </div>
                <p className="db-stat-value">{currentUser?.emailVerified ? "Verified" : "Pending"}</p>
              </div>

              <div className="db-stat-card">
                <div className="db-stat-top">
                  <span className="db-stat-label">Account role</span>
                  <div className={"db-stat-ico " + (isAdmin ? "db-ico--purple" : "db-ico--gray")}>
                    <i className={"ti " + (isAdmin ? "ti-shield" : "ti-user")} aria-hidden="true"></i>
                  </div>
                </div>
                <p className="db-stat-value">{isAdmin ? "Admin" : "User"}</p>
              </div>
            </div>
          )}

          {/* MY MATCH STATS */}
          {!isGuest && (
            <div className="db-section-card">
              <div className="db-section-card-header">
                <span className="db-section-card-title">My Matches</span>
                <Link to="/matches" className="db-section-card-link">Go to Matches</Link>
              </div>
              <div className="db-stats-grid">
                <div className="db-stat-card">
                  <div className="db-stat-top">
                    <span className="db-stat-label">Matches joined</span>
                    <div className="db-stat-ico db-ico--blue">
                      <i className="ti ti-users" aria-hidden="true"></i>
                    </div>
                  </div>
                  <p className="db-stat-value">{statsLoading ? "—" : myMatchStats.joinedCount}</p>
                </div>

                <div className="db-stat-card">
                  <div className="db-stat-top">
                    <span className="db-stat-label">Matches created</span>
                    <div className="db-stat-ico db-ico--amber">
                      <i className="ti ti-flag" aria-hidden="true"></i>
                    </div>
                  </div>
                  <p className="db-stat-value">{statsLoading ? "—" : myMatchStats.createdCount}</p>
                </div>

                <div className="db-stat-card">
                  <div className="db-stat-top">
                    <span className="db-stat-label">Upcoming for me</span>
                    <div className="db-stat-ico db-ico--green">
                      <i className="ti ti-calendar-event" aria-hidden="true"></i>
                    </div>
                  </div>
                  <p className="db-stat-value">{statsLoading ? "—" : myMatchStats.upcomingCount}</p>
                </div>
              </div>
            </div>
          )}

          {/* UPCOMING MATCHES + BROWSE BY SPORT (visible to guests too) */}
          <div className="db-two-col">
            <div className="db-section-card">
              <div className="db-section-card-header">
                <span className="db-section-card-title">Upcoming Matches</span>
                <Link to="/matches" className="db-section-card-link">View all</Link>
              </div>
              <div className="db-actions-list">
                {statsLoading ? (
                  <p className="db-plan-tile-dur">Loading...</p>
                ) : upcomingMatches.length === 0 ? (
                  <p className="db-plan-tile-dur">No upcoming matches found. Create one!</p>
                ) : (
                  upcomingMatches.map((m, idx) => (
                    <Link
                      to={`/matches/${m.id}`}
                      className="db-action-row"
                      key={m.id}
                    >
                      <div
                        className={
                          "db-action-ico " +
                          ["db-ico--blue", "db-ico--green", "db-ico--amber", "db-ico--purple", "db-ico--gray"][idx % 5]
                        }
                      >
                        <i className="ti ti-ball-basketball" aria-hidden="true"></i>
                      </div>
                      <div className="db-action-body">
                        <div className="db-action-name">{sportIcon(m.sport)} {m.title}</div>
                        <div className="db-action-desc">
                          {m.venue} · {formatMatchDate(m.date)} · {m.joinedPlayers?.length || 0}/{m.maxPlayers} players
                        </div>
                      </div>
                      <i className="ti ti-chevron-right db-action-arrow" aria-hidden="true"></i>
                    </Link>
                  ))
                )}
              </div>
            </div>

            <div className="db-section-card">
              <div className="db-section-card-header">
                <span className="db-section-card-title">Browse by Sport</span>
              </div>
              <div className="db-actions-list">
                {sportStats.map((s, idx) => (
                  <div
                    className="db-action-row"
                    key={s.sport}
                    onClick={() => navigate(`/matches?sport=${encodeURIComponent(s.sport)}`)}
                    style={{ cursor: "pointer" }}
                  >
                    <div
                      className={
                        "db-action-ico " +
                        ["db-ico--blue", "db-ico--green", "db-ico--amber", "db-ico--purple", "db-ico--gray"][idx % 5]
                      }
                    >
                      {sportIcon(s.sport)}
                    </div>
                    <div className="db-action-body">
                      <div className="db-action-name">{s.sport}</div>
                      <div className="db-action-desc">{s.count} upcoming matches</div>
                    </div>
                    <i className="ti ti-chevron-right db-action-arrow" aria-hidden="true"></i>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* TWO COLUMN */}
          <div className="db-two-col">

            {/* QUICK ACTIONS */}
            <div className="db-section-card">
              <div className="db-section-card-header">
                <span className="db-section-card-title">Quick actions</span>
              </div>
              <div className="db-actions-list">
                <Link to="/matches" className="db-action-row">
                  <div className="db-action-ico db-ico--blue">
                    <i className="ti ti-ball-basketball" aria-hidden="true"></i>
                  </div>
                  <div className="db-action-body">
                    <div className="db-action-name">Find or create a match</div>
                    <div className="db-action-desc">Browse matches or organize your own</div>
                  </div>
                  <i className="ti ti-chevron-right db-action-arrow" aria-hidden="true"></i>
                </Link>

                {isGuest ? (
                  <button className="db-action-row" onClick={requireLogin} style={{width:"100%", textAlign:"left", background:"none", border:"none", cursor:"pointer"}}>
                    <div className="db-action-ico db-ico--blue">
                      <i className="ti ti-user-edit" aria-hidden="true"></i>
                    </div>
                    <div className="db-action-body">
                      <div className="db-action-name">Update profile</div>
                      <div className="db-action-desc">Log in to edit name, photo and address</div>
                    </div>
                    <i className="ti ti-chevron-right db-action-arrow" aria-hidden="true"></i>
                  </button>
                ) : (
                  <Link to="/profile" className="db-action-row">
                    <div className="db-action-ico db-ico--blue">
                      <i className="ti ti-user-edit" aria-hidden="true"></i>
                    </div>
                    <div className="db-action-body">
                      <div className="db-action-name">Update profile</div>
                      <div className="db-action-desc">Edit name, photo and address</div>
                    </div>
                    <i className="ti ti-chevron-right db-action-arrow" aria-hidden="true"></i>
                  </Link>
                )}

                <Link to="/pricing" className="db-action-row">
                  <div className="db-action-ico db-ico--amber">
                    <i className="ti ti-bolt" aria-hidden="true"></i>
                  </div>
                  <div className="db-action-body">
                    <div className="db-action-name">Get more time</div>
                    <div className="db-action-desc">Upgrade to Silver or Gold</div>
                  </div>
                  <i className="ti ti-chevron-right db-action-arrow" aria-hidden="true"></i>
                </Link>

                {isAdmin && (
                  <Link to="/admin" className="db-action-row">
                    <div className="db-action-ico db-ico--purple">
                      <i className="ti ti-shield" aria-hidden="true"></i>
                    </div>
                    <div className="db-action-body">
                      <div className="db-action-name">Admin panel</div>
                      <div className="db-action-desc">Manage users and accounts</div>
                    </div>
                    <i className="ti ti-chevron-right db-action-arrow" aria-hidden="true"></i>
                  </Link>
                )}
              </div>
            </div>

            {/* PLAN SUMMARY */}
            {!isGuest && (
              <div className="db-section-card">
                <div className="db-section-card-header">
                  <span className="db-section-card-title">Plan details</span>
                  <Link to="/pricing" className="db-section-card-link">View all plans</Link>
                </div>
                <div className="db-plan-details">
                  <div className="db-plan-detail-row">
                    <span className="db-pd-label">Current plan</span>
                    <span className={"db-badge " + planColor(plan)}>{planIcon(plan)} {plan}</span>
                  </div>
                  <div className="db-plan-detail-row">
                    <span className="db-pd-label">Duration</span>
                    <span className="db-pd-val">
                      {plan === "Gold" ? "2 months" : plan === "Silver" ? "1 month" : "1 hour"}
                    </span>
                  </div>
                  <div className="db-plan-detail-row">
                    <span className="db-pd-label">Price</span>
                    <span className="db-pd-val">
                      {plan === "Gold" ? "₹499" : plan === "Silver" ? "₹199" : "₹0"}
                    </span>
                  </div>
                  <div className="db-plan-detail-row">
                    <span className="db-pd-label">Status</span>
                    <span className={"db-status-dot " + (timeLeft === "Expired" || !userData?.planExpiry ? "db-status-dot--off" : "db-status-dot--on")}>
                      {timeLeft === "Expired" || !userData?.planExpiry ? "Inactive" : "Active"}
                    </span>
                  </div>
                  <div className="db-plan-detail-row">
                    <span className="db-pd-label">Expires in</span>
                    <span className={"db-pd-val " + (timeLeft === "Expired" ? "db-pd-red" : "")}>
                      {timeLeft || "—"}
                    </span>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* PRICING PLANS */}
          <div className="db-section-card">
            <div className="db-section-card-header">
              <span className="db-section-card-title">Available plans</span>
              <Link to="/pricing" className="db-section-card-link">Manage plan</Link>
            </div>
            <div className="db-plans-row">

              <div className="db-plan-tile">
                <div className="db-plan-tile-top">
                  <span className="db-plan-tile-name">Free</span>
                  <span className="db-plan-tile-price">₹0</span>
                </div>
                <p className="db-plan-tile-dur">1 hour · no card needed</p>
                <ul className="pr-features">
                  <li><span className="pr-check">✓</span> Post &amp; join matches</li>
                  <li><span className="pr-check">✓</span> Basic player profile</li>
                  <li><span className="pr-check">✓</span> 1× points per match</li>
                  <li><span className="pr-check">✓</span> 5 joins / 1 organize per month</li>
                </ul>
                <button className="db-plan-tile-btn" onClick={() => navigate(isGuest ? "/login" : "/pricing?plan=Free")}>
                  Select
                </button>
              </div>

              <div className="db-plan-tile db-plan-tile--featured">
                <div className="db-plan-tile-badge">Popular</div>
                <div className="db-plan-tile-top">
                  <span className="db-plan-tile-name">Silver</span>
                  <span className="db-plan-tile-price">₹199</span>
                </div>
                <p className="db-plan-tile-dur">1 month · Razorpay</p>
                <ul className="pr-features">
                  <li><span className="pr-check">✓</span> Everything in Free</li>
                  <li><span className="pr-check">✓</span> Priority match visibility</li>
                  <li><span className="pr-check">✓</span> 2× points per match</li>
                  <li><span className="pr-check">✓</span> 10 joins / 2 organizes per month</li>
                </ul>
                <button className="db-plan-tile-btn db-plan-tile-btn--primary" onClick={() => navigate(isGuest ? "/login" : "/pricing?plan=Silver")}>
                  Select
                </button>
              </div>

              <div className="db-plan-tile db-plan-tile--gold">
                <div className="db-plan-tile-top">
                  <span className="db-plan-tile-name">Gold</span>
                  <span className="db-plan-tile-price">₹499</span>
                </div>
                <p className="db-plan-tile-dur">2 months · Razorpay</p>
                <ul className="pr-features">
                  <li><span className="pr-check--gold">✓</span> Everything in Silver</li>
                  <li><span className="pr-check--gold">✓</span> Pro player status</li>
                  <li><span className="pr-check--gold">✓</span> 5× points per match</li>
                  <li><span className="pr-check--gold">✓</span> Unlimited joins / 10 organizes</li>
                  <li><span className="pr-check--gold">✓</span> Scorecards + 25% off equipment</li>
                </ul>
                <button className="db-plan-tile-btn db-plan-tile-btn--gold" onClick={() => navigate(isGuest ? "/login" : "/pricing?plan=Gold")}>
                  Select
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