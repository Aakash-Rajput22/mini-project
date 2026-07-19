import { Link, useNavigate } from "react-router-dom";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase/firebase";
import { useState, useEffect } from "react";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import "../styles/dashboard.css";
import "../styles/leaderboard.css";

function Leaderboard() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [leaders, setLeaders] = useState([]);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("All");
  const [totalMatches, setTotalMatches] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists() && snap.data().role === "admin") setIsAdmin(true);
      }
    });
    fetchLeaderboard();
    return () => unsub();
  }, []);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const usersSnap = await getDocs(collection(db, "users"));
      const users = usersSnap.docs.map((d) => ({ uid: d.id, ...d.data() }));

      const matchesSnap = await getDocs(collection(db, "matches"));
      const matchCounts = {};
      matchesSnap.docs.forEach((d) => {
        const m = d.data();
        (m.joinedPlayers || []).forEach((uid) => {
          matchCounts[uid] = (matchCounts[uid] || 0) + 1;
        });
      });
      setTotalMatches(matchesSnap.size);

      const ranked = users
        .map((u) => ({
          uid: u.uid,
          name: u.name || "Player",
          plan: u.plan || "Free",
          points: u.points || 0,
          matchesPlayed: matchCounts[u.uid] || 0,
        }))
        .filter((u) => u.points > 0 || u.matchesPlayed > 0)
        .sort((a, b) => b.points - a.points)
        .map((u, idx) => ({ ...u, rank: idx }));

      setLeaders(ranked);
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
    }
    setLoading(false);
  };

  const handleLogout = async () => { await signOut(auth); navigate("/login"); };

  const planIcon = (plan) => {
    if (plan === "Gold") return "🥇";
    if (plan === "Silver") return "🥈";
    return "🆓";
  };

  const planBadgeClass = (plan) => {
    if (plan === "Gold") return "db-badge--gold";
    if (plan === "Silver") return "db-badge--silver";
    return "db-badge--free";
  };

  const rankBadge = (idx) => {
    if (idx === 0) return { label: "🥇", cls: "lb-rank--gold" };
    if (idx === 1) return { label: "🥈", cls: "lb-rank--silver" };
    if (idx === 2) return { label: "🥉", cls: "lb-rank--bronze" };
    return { label: `#${idx + 1}`, cls: "" };
  };

  const topScore = leaders[0]?.points || 0;

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
            <Link to="/teams" className="db-nav-item">
              <i className="ti ti-users-group db-nav-ico" aria-hidden="true"></i> Teams
            </Link>
            <Link to="/leaderboard" className="db-nav-item db-nav-item--active">
              <i className="ti ti-trophy db-nav-ico" aria-hidden="true"></i> Leaderboard
            </Link>
            <Link to="/profile" className="db-nav-item">
              <i className="ti ti-user db-nav-ico" aria-hidden="true"></i> Profile
            </Link>
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
          <div className="db-user-row">
            <div className="db-user-avatar">
              {currentUser?.displayName ? currentUser.displayName.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="db-user-info">
              <div className="db-user-name">{currentUser?.displayName || "User"}</div>
              <div className="db-user-email">{currentUser?.email || ""}</div>
            </div>
          </div>
          <button className="db-logout" onClick={handleLogout}>
            <i className="ti ti-logout" aria-hidden="true"></i> Sign out
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="db-main">

        {/* TOPBAR */}
        <header className="db-topbar">
          <div>
            <h1 className="db-page-title">Leaderboard</h1>
            <p className="db-page-sub">Top players ranked by points earned across all matches</p>
          </div>
        </header>

        <div className="db-body">

          {/* STATS STRIP */}
          <div className="db-stats-grid">
            <div className="db-stat-card">
              <div className="db-stat-top">
                <span className="db-stat-label">Ranked players</span>
                <div className="db-stat-ico db-ico--blue">
                  <i className="ti ti-users" aria-hidden="true"></i>
                </div>
              </div>
              <p className="db-stat-value">{loading ? "—" : leaders.length}</p>
            </div>

            <div className="db-stat-card">
              <div className="db-stat-top">
                <span className="db-stat-label">Matches hosted</span>
                <div className="db-stat-ico db-ico--amber">
                  <i className="ti ti-ball-basketball" aria-hidden="true"></i>
                </div>
              </div>
              <p className="db-stat-value">{loading ? "—" : totalMatches}</p>
            </div>

            <div className="db-stat-card">
              <div className="db-stat-top">
                <span className="db-stat-label">Top score</span>
                <div className="db-stat-ico db-ico--green">
                  <i className="ti ti-trophy" aria-hidden="true"></i>
                </div>
              </div>
              <p className="db-stat-value">{loading ? "—" : topScore}</p>
            </div>
          </div>

          {/* LEADERBOARD LIST */}
          <div className="db-section-card">
            <div className="db-section-card-header">
              <span className="db-section-card-title">Rankings</span>
              <Link to="/matches" className="db-section-card-link">Play a match to earn points</Link>
            </div>

            <div className="lb-filters">
              <input
                type="text"
                className="lb-search"
                placeholder="Search player by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className="lb-plan-filter"
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
              >
                <option value="All">All plans</option>
                <option value="Free">Free</option>
                <option value="Silver">Silver</option>
                <option value="Gold">Gold</option>
              </select>
            </div>

            {loading ? (
              <p className="lb-empty">Loading leaderboard...</p>
            ) : leaders.length === 0 ? (
              <p className="lb-empty">No ranked players yet. Join or host a match to appear on the leaderboard!</p>
            ) : (
              (() => {
                const filteredLeaders = leaders.filter((p) => {
                  const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
                  const matchesPlan = planFilter === "All" || p.plan === planFilter;
                  return matchesSearch && matchesPlan;
                });

                if (filteredLeaders.length === 0) {
                  return <p className="lb-empty">No players match this filter.</p>;
                }

                return (
                  <div className="lb-list">
                    {filteredLeaders.map((p) => {
                      const badge = rankBadge(p.rank);
                      const isMe = p.uid === currentUser?.uid;
                      return (
                        <div key={p.uid} className={"lb-row " + (isMe ? "lb-row--me" : "")}>
                          <div className={"lb-rank " + badge.cls}>{badge.label}</div>
                      <div className="lb-avatar">{p.name.charAt(0).toUpperCase()}</div>
                      <div className="lb-player">
                        <Link to={`/players/${p.uid}`} className="lb-player-name">
                          {p.name} {isMe && <span className="lb-you-tag">You</span>}
                        </Link>
                        <span className={"db-badge " + planBadgeClass(p.plan)}>
                          {planIcon(p.plan)} {p.plan}
                        </span>
                      </div>
                      <div className="lb-stat-col">
                        <div className="lb-stat-num">{p.matchesPlayed}</div>
                        <div className="lb-stat-label">Matches</div>
                      </div>
                      <div className="lb-points">
                        <div className="lb-points-num">{p.points}</div>
                        <div className="lb-stat-label">Points</div>
                      </div>
                    </div>
                  );
                })}
                  </div>
                );
              })()
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

export default Leaderboard;