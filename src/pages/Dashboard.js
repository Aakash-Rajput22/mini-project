import logo from "../assets/knowora-logo.png";
import { Link, useNavigate } from "react-router-dom";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase/firebase";
import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc, deleteField, collection, query, where, getDocs } from "firebase/firestore";
import { Skeleton, SkeletonList } from "../components/Skeleton";
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
  const [reminderMatches, setReminderMatches] = useState([]);
  const [newMatches, setNewMatches] = useState([]);
  const [followingMatches, setFollowingMatches] = useState([]);
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

  // Real action shots for the "Browse by Sport" tiles — falls back to the
  // emoji chip for sports without a photo (Volleyball, Other).
  const sportPhoto = (s) => {
    const photos = {
      Cricket: "https://images.pexels.com/photos/28759001/pexels-photo-28759001.jpeg?auto=compress&cs=tinysrgb&w=300&q=80",
      Football: "https://images.pexels.com/photos/5648177/pexels-photo-5648177.jpeg?auto=compress&cs=tinysrgb&w=300&q=80",
      Badminton: "https://images.pexels.com/photos/8796050/pexels-photo-8796050.jpeg?auto=compress&cs=tinysrgb&w=300&q=80",
      Basketball: "https://images.pexels.com/photos/5384609/pexels-photo-5384609.jpeg?auto=compress&cs=tinysrgb&w=300&q=80",
      Tennis: "https://images.pexels.com/photos/33436529/pexels-photo-33436529.jpeg?auto=compress&cs=tinysrgb&w=300&q=80",
    };
    return photos[s] || null;
  };

  // Fetches match stats. Works for both logged-in (personal stats) and
  // guest (uid = null, only general/upcoming stats) views.
  const fetchMatchStats = async (uid, following = []) => {
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

        // Reminders — joined matches starting within the next 24 hours.
        const next24h = new Date(now.getTime() + 24 * 3600000);
        const soon = upcomingJoined
          .filter((m) => {
            const d = m.date?.toDate ? m.date.toDate() : new Date(m.date);
            return d <= next24h;
          })
          .sort((a, b) => {
            const da = a.date?.toDate ? a.date.toDate() : new Date(a.date);
            const dbb = b.date?.toDate ? b.date.toDate() : new Date(b.date);
            return da - dbb;
          });
        setReminderMatches(soon);

        // "New match posted" alerts — matches created in the last 24 hours
        // by someone else, that this player hasn't already joined. This is
        // an in-app notification feed (no push/Cloud Function needed).
        const last24h = new Date(now.getTime() - 24 * 3600000);
        const freshMatches = allMatches
          .filter((m) => {
            const created = m.createdAt?.toDate ? m.createdAt.toDate() : null;
            if (!created || created < last24h) return false;
            if (m.createdBy === uid) return false;
            if (m.joinedPlayers?.includes(uid)) return false;
            const d = m.date?.toDate ? m.date.toDate() : new Date(m.date);
            return d >= now;
          })
          .sort((a, b) => {
            const ca = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
            const cb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
            return cb - ca;
          })
          .slice(0, 5);
        setNewMatches(freshMatches);

        // Matches hosted by players this user follows — surfaced as a
        // dedicated feed so following someone actually does something.
        const fromFollowing = allMatches
          .filter((m) => {
            if (!following.includes(m.createdBy)) return false;
            if (m.joinedPlayers?.includes(uid)) return false;
            const d = m.date?.toDate ? m.date.toDate() : new Date(m.date);
            return d >= now;
          })
          .sort((a, b) => {
            const da = a.date?.toDate ? a.date.toDate() : new Date(a.date);
            const dbb = b.date?.toDate ? b.date.toDate() : new Date(b.date);
            return da - dbb;
          })
          .slice(0, 5);
        setFollowingMatches(fromFollowing);
      } else {
        setMyMatchStats({ joinedCount: 0, createdCount: 0, upcomingCount: 0 });
        setReminderMatches([]);
        setNewMatches([]);
        setFollowingMatches([]);
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
      fetchMatchStats(user.uid, snap.exists() && Array.isArray(snap.data().following) ? snap.data().following : []);
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

  // Achievement badges — derived entirely from data already on the user
  // doc + match stats, so no new backend fields are needed.
  const totalMatches = myMatchStats.joinedCount + myMatchStats.createdCount;
  const points = userData?.points || 0;
  const ratingCount = userData?.ratingCount || 0;
  const avgRating = ratingCount > 0 ? (userData?.ratingSum || 0) / ratingCount : 0;
  const noShowCount = userData?.noShowCount || 0;

  const BADGES = [
    {
      id: "first-timer",
      icon: "🎯",
      label: "First Timer",
      desc: "Play or host your first match",
      achieved: totalMatches >= 1,
    },
    {
      id: "regular",
      icon: "🔥",
      label: "Regular",
      desc: "5 matches played or hosted",
      achieved: totalMatches >= 5,
    },
    {
      id: "veteran",
      icon: "🏆",
      label: "Veteran",
      desc: "25 matches played or hosted",
      achieved: totalMatches >= 25,
    },
    {
      id: "organizer",
      icon: "🎖️",
      label: "Organizer",
      desc: "Host 3 matches",
      achieved: myMatchStats.createdCount >= 3,
    },
    {
      id: "century-club",
      icon: "💯",
      label: "Century Club",
      desc: "Earn 100 points",
      achieved: points >= 100,
    },
    {
      id: "high-scorer",
      icon: "🚀",
      label: "High Scorer",
      desc: "Earn 500 points",
      achieved: points >= 500,
    },
    {
      id: "top-rated",
      icon: "⭐",
      label: "Top Rated",
      desc: "4.5★ average from 3+ ratings",
      achieved: ratingCount >= 3 && avgRating >= 4.5,
    },
    {
      id: "reliable",
      icon: "🛡️",
      label: "Reliable",
      desc: "3+ matches, zero no-shows",
      achieved: totalMatches >= 3 && noShowCount === 0,
    },
    {
      id: "gold-member",
      icon: "👑",
      label: "Gold Member",
      desc: "Be on the Gold plan",
      achieved: plan === "Gold",
    },
  ];
  const earnedBadgeCount = BADGES.filter((b) => b.achieved).length;

  // Plan tiers rank low → high. A user can only move UP: their current
  // tier and everything below it is blocked in "Available plans", only
  // strictly higher tiers stay selectable as upgrades.
  const PLAN_RANK = { Free: 0, Silver: 1, Gold: 2 };
  const currentPlanRank = PLAN_RANK[plan] ?? 0;

  const planTileState = (tileName) => {
    if (isGuest) return { disabled: false, label: "Select" };
    const tileRank = PLAN_RANK[tileName];
    if (tileRank === currentPlanRank) return { disabled: true, label: "Current plan" };
    if (tileRank < currentPlanRank) return { disabled: true, label: "Included" };
    return { disabled: false, label: "Select" };
  };

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
  <img src={logo} alt="Knowora" className="db-brand-logo" />
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
            <Link to="/settings" className="db-nav-item">
              <i className="ti ti-settings db-nav-ico" aria-hidden="true"></i> Settings
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

          {/* MATCH REMINDERS */}
          {!isGuest && reminderMatches.length > 0 && (
            <div className="db-section-card" style={{ borderColor: "#fde68a", background: "#fffbeb" }}>
              <div className="db-section-card-header" style={{ borderBottom: "1px solid #fde68a" }}>
                <span className="db-section-card-title">⏰ Coming up in the next 24 hours</span>
              </div>
              <div className="db-actions-list">
                {reminderMatches.map((m) => (
                  <Link to={`/matches/${m.id}`} className="db-action-row" key={m.id}>
                    <div className="db-action-ico db-ico--amber">
                      <i className="ti ti-alarm" aria-hidden="true"></i>
                    </div>
                    <div className="db-action-body">
                      <div className="db-action-name">{sportIcon(m.sport)} {m.title}</div>
                      <div className="db-action-desc">
                        {m.venue} · {formatMatchDate(m.date)}
                      </div>
                    </div>
                    <i className="ti ti-chevron-right db-action-arrow" aria-hidden="true"></i>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* NEW MATCH ALERTS */}
          {!isGuest && newMatches.length > 0 && (
            <div className="db-section-card" style={{ borderColor: "#bfdbfe", background: "#eff6ff" }}>
              <div className="db-section-card-header" style={{ borderBottom: "1px solid #bfdbfe" }}>
                <span className="db-section-card-title">🔔 New matches posted</span>
              </div>
              <div className="db-actions-list">
                {newMatches.map((m) => (
                  <Link to={`/matches/${m.id}`} className="db-action-row" key={m.id}>
                    {m.venuePhotoURL ? (
                      <img src={m.venuePhotoURL} alt="" className="db-action-photo" />
                    ) : (
                      <div className="db-action-ico db-ico--blue">
                        {sportIcon(m.sport)}
                      </div>
                    )}
                    <div className="db-action-body">
                      <div className="db-action-name">{sportIcon(m.sport)} {m.title}</div>
                      <div className="db-action-desc">
                        {m.venue} · {formatMatchDate(m.date)} · by {m.createdByName}
                      </div>
                    </div>
                    <i className="ti ti-chevron-right db-action-arrow" aria-hidden="true"></i>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* FROM PLAYERS YOU FOLLOW */}
          {!isGuest && followingMatches.length > 0 && (
            <div className="db-section-card" style={{ borderColor: "#d9d0fb", background: "#f7f4ff" }}>
              <div className="db-section-card-header" style={{ borderBottom: "1px solid #d9d0fb" }}>
                <span className="db-section-card-title">👥 From players you follow</span>
              </div>
              <div className="db-actions-list">
                {followingMatches.map((m) => (
                  <Link to={`/matches/${m.id}`} className="db-action-row" key={m.id}>
                    {m.venuePhotoURL ? (
                      <img src={m.venuePhotoURL} alt="" className="db-action-photo" />
                    ) : (
                      <div className="db-action-ico db-ico--purple">
                        {sportIcon(m.sport)}
                      </div>
                    )}
                    <div className="db-action-body">
                      <div className="db-action-name">{sportIcon(m.sport)} {m.title}</div>
                      <div className="db-action-desc">
                        {m.venue} · {formatMatchDate(m.date)} · by {m.createdByName}
                      </div>
                    </div>
                    <i className="ti ti-chevron-right db-action-arrow" aria-hidden="true"></i>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* GUEST BANNER */}
          {isGuest && (
            <div
              className="db-plan-hero db-plan-hero--photo"
              style={{
                backgroundImage:
                  "linear-gradient(120deg, rgba(6,20,16,0.90) 0%, rgba(11,58,38,0.80) 100%), url('https://images.pexels.com/photos/7551306/pexels-photo-7551306.jpeg?auto=compress&cs=tinysrgb&w=1600&q=80')",
              }}
            >
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
            <div
              className="db-plan-hero db-plan-hero--photo"
              style={{
                backgroundImage:
                  "linear-gradient(120deg, rgba(6,20,16,0.90) 0%, rgba(11,58,38,0.80) 100%), url('https://images.pexels.com/photos/7551306/pexels-photo-7551306.jpeg?auto=compress&cs=tinysrgb&w=1600&q=80')",
              }}
            >
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
              <div className="db-section-card-body">
                <div className="db-stats-grid">
                  <div className="db-stat-card">
                    <div className="db-stat-top">
                      <span className="db-stat-label">Matches joined</span>
                      <div className="db-stat-ico db-ico--blue">
                        <i className="ti ti-users" aria-hidden="true"></i>
                      </div>
                    </div>
                    <p className="db-stat-value">{statsLoading ? <Skeleton width="34px" height="22px" /> : myMatchStats.joinedCount}</p>
                  </div>

                  <div className="db-stat-card">
                    <div className="db-stat-top">
                      <span className="db-stat-label">Matches created</span>
                      <div className="db-stat-ico db-ico--amber">
                        <i className="ti ti-flag" aria-hidden="true"></i>
                      </div>
                    </div>
                    <p className="db-stat-value">{statsLoading ? <Skeleton width="34px" height="22px" /> : myMatchStats.createdCount}</p>
                  </div>

                  <div className="db-stat-card">
                    <div className="db-stat-top">
                      <span className="db-stat-label">Upcoming for me</span>
                      <div className="db-stat-ico db-ico--green">
                        <i className="ti ti-calendar-event" aria-hidden="true"></i>
                      </div>
                    </div>
                    <p className="db-stat-value">{statsLoading ? <Skeleton width="34px" height="22px" /> : myMatchStats.upcomingCount}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ACHIEVEMENTS */}
          {!isGuest && (
            <div className="db-section-card">
              <div className="db-section-card-header">
                <span className="db-section-card-title">🏅 Achievements</span>
                <span className="db-section-card-sub">{earnedBadgeCount}/{BADGES.length} unlocked</span>
              </div>
              <div className="db-badges-grid">
                {BADGES.map((b) => (
                  <div
                    key={b.id}
                    className={"db-badge-tile " + (b.achieved ? "db-badge-tile--earned" : "db-badge-tile--locked")}
                    title={b.desc}
                  >
                    <span className="db-badge-icon">{b.achieved ? b.icon : "🔒"}</span>
                    <span className="db-badge-label">{b.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* UPCOMING MATCHES + BROWSE BY SPORT (visible to guests too) */}
          <div className="db-two-col">
            <div className="db-section-card">
              <div className="db-section-card-header kn-header-photo kn-header-photo--matches">
                <span className="db-section-card-title">Upcoming Matches</span>
                <Link to="/matches" className="db-section-card-link">View all</Link>
              </div>
              <div className="db-actions-list">
                {statsLoading ? (
                  <SkeletonList count={4} />
                ) : upcomingMatches.length === 0 ? (
                  <p className="db-plan-tile-dur">No upcoming matches found. Create one!</p>
                ) : (
                  upcomingMatches.map((m, idx) => (
                    <Link
                      to={`/matches/${m.id}`}
                      className="db-action-row"
                      key={m.id}
                    >
                      {sportPhoto(m.sport) ? (
                        <div className="db-sport-thumb">
                          <img src={sportPhoto(m.sport)} alt={m.sport} />
                          <span className="db-sport-thumb-emoji">{sportIcon(m.sport)}</span>
                        </div>
                      ) : (
                        <div
                          className={
                            "db-action-ico " +
                            ["db-ico--blue", "db-ico--green", "db-ico--amber", "db-ico--purple", "db-ico--gray"][idx % 5]
                          }
                        >
                          {sportIcon(m.sport)}
                        </div>
                      )}
                      <div className="db-action-body">
                        <div className="db-action-name">{m.title}</div>
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
              <div className="db-section-card-header kn-header-photo kn-header-photo--sport">
                <span className="db-section-card-title">Browse by Sport</span>
              </div>
              <div className="db-actions-list">
                {statsLoading ? (
                  <SkeletonList count={5} />
                ) : (
                  sportStats.map((s, idx) => (
                  <div
                    className="db-action-row"
                    key={s.sport}
                    onClick={() => navigate(`/matches?sport=${encodeURIComponent(s.sport)}`)}
                    style={{ cursor: "pointer" }}
                  >
                    {sportPhoto(s.sport) ? (
                      <div className="db-sport-thumb">
                        <img src={sportPhoto(s.sport)} alt={s.sport} />
                        <span className="db-sport-thumb-emoji">{sportIcon(s.sport)}</span>
                      </div>
                    ) : (
                      <div
                        className={
                          "db-action-ico " +
                          ["db-ico--blue", "db-ico--green", "db-ico--amber", "db-ico--purple", "db-ico--gray"][idx % 5]
                        }
                      >
                        {sportIcon(s.sport)}
                      </div>
                    )}
                    <div className="db-action-body">
                      <div className="db-action-name">{s.sport}</div>
                      <div className="db-action-desc">{s.count} upcoming matches</div>
                    </div>
                    <i className="ti ti-chevron-right db-action-arrow" aria-hidden="true"></i>
                  </div>
                ))
                )}
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
                  <li className="pr-feature-off"><span className="pr-cross">✗</span> Priority match visibility</li>
                  <li className="pr-feature-off"><span className="pr-cross">✗</span> Pro player status</li>
                  <li className="pr-feature-off"><span className="pr-cross">✗</span> Scorecards + 25% off equipment</li>
                </ul>
                <button
                  className="db-plan-tile-btn"
                  disabled={planTileState("Free").disabled}
                  onClick={() => navigate(isGuest ? "/login" : "/pricing?plan=Free")}
                >
                  {planTileState("Free").label}
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
                  <li><span className="pr-check">✓</span> Post &amp; join matches</li>
                  <li><span className="pr-check">✓</span> Basic player profile</li>
                  <li><span className="pr-check">✓</span> 2× points per match</li>
                  <li><span className="pr-check">✓</span> 10 joins / 2 organizes per month</li>
                  <li><span className="pr-check">✓</span> Priority match visibility</li>
                  <li className="pr-feature-off"><span className="pr-cross">✗</span> Pro player status</li>
                  <li className="pr-feature-off"><span className="pr-cross">✗</span> Scorecards + 25% off equipment</li>
                </ul>
                <button
                  className="db-plan-tile-btn db-plan-tile-btn--primary"
                  disabled={planTileState("Silver").disabled}
                  onClick={() => navigate(isGuest ? "/login" : "/pricing?plan=Silver")}
                >
                  {planTileState("Silver").label}
                </button>
              </div>

              <div className="db-plan-tile db-plan-tile--gold">
                <div className="db-plan-tile-top">
                  <span className="db-plan-tile-name">Gold</span>
                  <span className="db-plan-tile-price">₹499</span>
                </div>
                <p className="db-plan-tile-dur">2 months · Razorpay</p>
                <ul className="pr-features">
                  <li><span className="pr-check--gold">✓</span> Post &amp; join matches</li>
                  <li><span className="pr-check--gold">✓</span> Basic player profile</li>
                  <li><span className="pr-check--gold">✓</span> 5× points per match</li>
                  <li><span className="pr-check--gold">✓</span> Unlimited joins / 10 organizes</li>
                  <li><span className="pr-check--gold">✓</span> Priority match visibility</li>
                  <li><span className="pr-check--gold">✓</span> Pro player status</li>
                  <li><span className="pr-check--gold">✓</span> Scorecards + 25% off equipment</li>
                </ul>
                <button
                  className="db-plan-tile-btn db-plan-tile-btn--gold"
                  disabled={planTileState("Gold").disabled}
                  onClick={() => navigate(isGuest ? "/login" : "/pricing?plan=Gold")}
                >
                  {planTileState("Gold").label}
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