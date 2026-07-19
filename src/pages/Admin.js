import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase/firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import "../styles/dashboard.css";

const PLAN_PRICE = { Silver: 199, Gold: 499 };
const SPORT_ICON = {
  Cricket: "🏏", Football: "⚽", Badminton: "🏸", Basketball: "🏀",
  Volleyball: "🏐", Tennis: "🎾", Other: "🎮",
};

function Admin() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("All");
  const [roleFilter, setRoleFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [isAdmin, setIsAdmin] = useState(null);
  const usersPerPage = 8;

  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportStatusFilter, setReportStatusFilter] = useState("All");
  const [reportSearch, setReportSearch] = useState("");

  const [matches, setMatches] = useState([]);
  const [matchesLoading, setMatchesLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) { navigate("/login"); return; }
      try {
        const snapshot = await getDocs(collection(db, "users"));
        const allUsers = [];
        let adminFound = false;
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          allUsers.push({ id: docSnap.id, ...data });
          if (docSnap.id === currentUser.uid && data.role === "admin") adminFound = true;
        });
        setIsAdmin(adminFound);
        if (adminFound) {
          setUsers(allUsers);
          await fetchReports();
          await fetchMatches();
        }
      } catch (error) {
        console.log("Error:", error.message);
      }
      setLoading(false);
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const fetchReports = async () => {
    setReportsLoading(true);
    try {
      const snap = await getDocs(collection(db, "reports"));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => {
        const da = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
        const dbb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
        return dbb - da;
      });
      setReports(list);
    } catch (error) {
      console.error("Error fetching reports:", error);
    }
    setReportsLoading(false);
  };

  const fetchMatches = async () => {
    setMatchesLoading(true);
    try {
      const snap = await getDocs(collection(db, "matches"));
      setMatches(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error("Error fetching matches:", error);
    }
    setMatchesLoading(false);
  };

  const handleUpdateReportStatus = async (reportId, status) => {
    try {
      await updateDoc(doc(db, "reports", reportId), { status });
      setReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, status } : r)));
    } catch (error) {
      console.error("Error updating report status:", error);
      alert("Status update failed. Please try again.");
    }
  };

  const handleLogout = async () => { await signOut(auth); navigate("/login"); };

  const formatDate = (timestamp) => {
    if (!timestamp) return "—";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  if (loading) return (
    <div className="db-shell">
      <div className="db-main" style={{display:"flex",alignItems:"center",justifyContent:"center"}}>
        <p style={{color:"#94a3b8"}}>Loading...</p>
      </div>
    </div>
  );

  if (!isAdmin) return (
    <div className="db-shell">
      <div className="db-main">
        <div className="db-body">
          <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:"16px",padding:"32px",textAlign:"center"}}>
            <p style={{fontSize:"18px",color:"#ef4444",fontWeight:"600",marginBottom:"12px"}}>Access denied</p>
            <p style={{color:"#64748b",marginBottom:"20px"}}>You are not authorized to view this page.</p>
            <Link to="/dashboard" style={{color:"#3b82f6",textDecoration:"none",fontWeight:"600"}}>← Go to dashboard</Link>
          </div>
        </div>
      </div>
    </div>
  );

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      (u.name && u.name.toLowerCase().includes(search.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(search.toLowerCase()));
    const matchPlan = planFilter === "All" || (u.plan || "Free") === planFilter;
    const matchRole =
      roleFilter === "All" ||
      (roleFilter === "Admin" ? u.role === "admin" : u.role !== "admin");
    return matchSearch && matchPlan && matchRole;
  });

  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const paginated = filteredUsers.slice((currentPage - 1) * usersPerPage, currentPage * usersPerPage);

  const filteredReports = reports.filter((r) => {
    const status = r.status || "open";
    const matchStatus = reportStatusFilter === "All" || status === reportStatusFilter;
    const matchSearch =
      !reportSearch ||
      (r.reportedName && r.reportedName.toLowerCase().includes(reportSearch.toLowerCase())) ||
      (r.reporterName && r.reporterName.toLowerCase().includes(reportSearch.toLowerCase()));
    return matchStatus && matchSearch;
  });

  const openReportsCount = reports.filter((r) => (r.status || "open") === "open").length;

  const planBadge = (plan) => {
    if (plan === "Gold")   return <span className="db-badge db-badge--gold">🥇 Gold</span>;
    if (plan === "Silver") return <span className="db-badge db-badge--silver">🥈 Silver</span>;
    return <span className="db-badge db-badge--free">🆓 Free</span>;
  };

  const reportStatusBadge = (status) => {
    const s = status || "open";
    if (s === "resolved") return <span className="adm-role adm-role--admin">✓ Resolved</span>;
    if (s === "dismissed") return <span className="adm-role adm-role--user">Dismissed</span>;
    return <span className="db-badge db-badge--gold">⚠ Open</span>;
  };

  /* ─────────────── ANALYTICS ─────────────── */

  const freeCount = users.filter((u) => !u.plan || u.plan === "Free").length;
  const silverCount = users.filter((u) => u.plan === "Silver").length;
  const goldCount = users.filter((u) => u.plan === "Gold").length;

  const now = new Date();
  const totalMatches = matches.length;
  const upcomingMatchesCount = matches.filter((m) => {
    const d = m.date?.toDate ? m.date.toDate() : new Date(m.date);
    return d >= now;
  }).length;
  const completedMatchesCount = totalMatches - upcomingMatchesCount;
  const avgMatchesPerUser = users.length > 0 ? (totalMatches / users.length).toFixed(1) : "0";

  const silverRevenue = silverCount * PLAN_PRICE.Silver;
  const goldRevenue = goldCount * PLAN_PRICE.Gold;
  const estRevenue = silverRevenue + goldRevenue;

  const sportCounts = {};
  matches.forEach((m) => {
    const s = m.sport || "Other";
    sportCounts[s] = (sportCounts[s] || 0) + 1;
  });
  const sportBars = Object.entries(sportCounts).sort((a, b) => b[1] - a[1]);

  const planBars = [
    { label: "🆓 Free", value: freeCount, color: "gray" },
    { label: "🥈 Silver", value: silverCount, color: "silver" },
    { label: "🥇 Gold", value: goldCount, color: "gold" },
  ];
  const revenueBars = [
    { label: "🥈 Silver", value: silverRevenue, color: "silver" },
    { label: "🥇 Gold", value: goldRevenue, color: "gold" },
  ];

  const BarChart = ({ rows, prefix = "", suffix = "" }) => {
    const max = Math.max(1, ...rows.map((r) => r.value));
    return (
      <div className="adm-bar-chart">
        {rows.map((r) => (
          <div className="adm-bar-row" key={r.label}>
            <span className="adm-bar-label">{r.label}</span>
            <div className="adm-bar-track">
              <div
                className={"adm-bar-fill adm-bar-fill--" + r.color}
                style={{ width: `${(r.value / max) * 100}%` }}
              />
            </div>
            <span className="adm-bar-value">{prefix}{r.value}{suffix}</span>
          </div>
        ))}
      </div>
    );
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
            <Link to="/dashboard" className="db-nav-item"><span className="db-nav-ico">📊</span> Dashboard</Link>
            <Link to="/matches"   className="db-nav-item"><span className="db-nav-ico">🏀</span> Matches</Link>
            <Link to="/teams"     className="db-nav-item"><span className="db-nav-ico">👥</span> Teams</Link>
            <Link to="/leaderboard" className="db-nav-item"><span className="db-nav-ico">🏆</span> Leaderboard</Link>
            <Link to="/profile"   className="db-nav-item"><span className="db-nav-ico">👤</span> Profile</Link>
            <Link to="/pricing"   className="db-nav-item"><span className="db-nav-ico">💳</span> Pricing plans</Link>
            <Link to="/settings"  className="db-nav-item"><span className="db-nav-ico">⚙️</span> Settings</Link>
            <span className="db-nav-label" style={{marginTop:"16px"}}>Admin</span>
            <Link to="/admin" className="db-nav-item db-nav-item--active"><span className="db-nav-ico">🛡️</span> Admin panel</Link>
          </nav>
        </div>
        <div className="db-sidebar-foot">
          <button className="db-logout" onClick={handleLogout}>Sign out</button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="db-main">
        <header className="db-topbar">
          <div>
            <button className="db-back-btn" onClick={() => navigate(-1)}>
              <i className="ti ti-arrow-left" aria-hidden="true"></i> Back
            </button>
            <h1 className="db-page-title">Admin panel</h1>
            <p className="db-page-sub">{filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""} found</p>
          </div>
          <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
            <span style={{fontSize:"13px",color:"#94a3b8"}}>{users.length} total users</span>
          </div>
        </header>

        <div className="db-body">

          {/* STAT CARDS */}
          <div className="db-stats-grid">
            <div className="db-stat-card">
              <div className="db-stat-icon db-stat-icon--blue">👥</div>
              <div>
                <p className="db-stat-label">Total users</p>
                <p className="db-stat-value">{users.length}</p>
              </div>
            </div>
            <div className="db-stat-card">
              <div className="db-stat-icon db-stat-icon--green">🆓</div>
              <div>
                <p className="db-stat-label">Free plan</p>
                <p className="db-stat-value">{freeCount}</p>
              </div>
            </div>
            <div className="db-stat-card">
              <div className="db-stat-icon" style={{background:"#f0f9ff",fontSize:"20px",width:"44px",height:"44px",borderRadius:"10px",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>🥈</div>
              <div>
                <p className="db-stat-label">Silver plan</p>
                <p className="db-stat-value">{silverCount}</p>
              </div>
            </div>
            <div className="db-stat-card">
              <div className="db-stat-icon db-stat-icon--amber">🥇</div>
              <div>
                <p className="db-stat-label">Gold plan</p>
                <p className="db-stat-value">{goldCount}</p>
              </div>
            </div>
          </div>

          {/* ANALYTICS */}
          <div className="db-section-card">
            <div className="db-section-card-header">
              <span className="db-section-card-title">📊 Analytics</span>
              <span className="db-section-card-sub">
                {matchesLoading ? "Loading matches..." : `${totalMatches} matches total`}
              </span>
            </div>

            <div className="db-section-card-body">
              <div className="db-stats-grid">
                <div className="db-stat-card">
                  <div className="db-stat-top">
                    <span className="db-stat-label">Total matches</span>
                    <div className="db-stat-ico db-ico--blue"><i className="ti ti-ball-basketball" aria-hidden="true"></i></div>
                  </div>
                  <p className="db-stat-value">{matchesLoading ? "—" : totalMatches}</p>
                </div>
                <div className="db-stat-card">
                  <div className="db-stat-top">
                    <span className="db-stat-label">Upcoming</span>
                    <div className="db-stat-ico db-ico--green"><i className="ti ti-calendar-event" aria-hidden="true"></i></div>
                  </div>
                  <p className="db-stat-value">{matchesLoading ? "—" : upcomingMatchesCount}</p>
                </div>
                <div className="db-stat-card">
                  <div className="db-stat-top">
                    <span className="db-stat-label">Completed</span>
                    <div className="db-stat-ico db-ico--gray"><i className="ti ti-flag" aria-hidden="true"></i></div>
                  </div>
                  <p className="db-stat-value">{matchesLoading ? "—" : completedMatchesCount}</p>
                </div>
                <div className="db-stat-card">
                  <div className="db-stat-top">
                    <span className="db-stat-label">Est. revenue</span>
                    <div className="db-stat-ico db-ico--amber"><i className="ti ti-currency-rupee" aria-hidden="true"></i></div>
                  </div>
                  <p className="db-stat-value">₹{estRevenue}</p>
                </div>
              </div>

              <div className="db-two-col" style={{ marginTop: "18px" }}>
                <div>
                  <p className="adm-chart-title">Users by plan</p>
                  <BarChart rows={planBars} />
                </div>
                <div>
                  <p className="adm-chart-title">Est. revenue by plan (₹{PLAN_PRICE.Silver}/{PLAN_PRICE.Gold})</p>
                  <BarChart rows={revenueBars} prefix="₹" />
                </div>
              </div>

              <div style={{ marginTop: "18px" }}>
                <p className="adm-chart-title">Matches by sport</p>
                {sportBars.length === 0 ? (
                  <p className="adm-empty" style={{ padding: "12px 0" }}>No matches yet.</p>
                ) : (
                  <BarChart
                    rows={sportBars.map(([sport, count]) => ({
                      label: `${SPORT_ICON[sport] || "🎮"} ${sport}`,
                      value: count,
                      color: "blue",
                    }))}
                  />
                )}
              </div>

              <p className="adm-chart-note">
                Avg. {avgMatchesPerUser} matches per user · Revenue is estimated from current plan
                holders at list price, not actual transaction history.
              </p>
            </div>
          </div>

          {/* TABLE CARD */}
          <div className="adm-card">

            {/* CONTROLS */}
            <div className="adm-controls">
              <div className="adm-search-wrap">
                <span className="adm-search-ico">🔍</span>
                <input
                  type="text"
                  className="adm-search"
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                />
              </div>
              <select
                className="adm-filter"
                value={planFilter}
                onChange={(e) => { setPlanFilter(e.target.value); setCurrentPage(1); }}
              >
                <option value="All">All plans</option>
                <option value="Free">Free</option>
                <option value="Silver">Silver</option>
                <option value="Gold">Gold</option>
              </select>
              <select
                className="adm-filter"
                value={roleFilter}
                onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
              >
                <option value="All">All roles</option>
                <option value="Admin">Admin</option>
                <option value="User">User</option>
              </select>
            </div>

            {/* TABLE */}
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Plan</th>
                    <th>Role</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="adm-empty">No users found</td>
                    </tr>
                  ) : paginated.map((u, i) => (
                    <tr key={u.id}>
                      <td className="adm-num">{(currentPage - 1) * usersPerPage + i + 1}</td>
                      <td>
                        <div className="adm-user">
                          <div className="adm-avatar">{u.name ? u.name.charAt(0).toUpperCase() : "?"}</div>
                          <span className="adm-name">{u.name || "—"}</span>
                        </div>
                      </td>
                      <td className="adm-email">{u.email || "—"}</td>
                      <td>{u.phone || "—"}</td>
                      <td>{planBadge(u.plan)}</td>
                      <td>
                        <span className={"adm-role " + (u.role === "admin" ? "adm-role--admin" : "adm-role--user")}>
                          {u.role === "admin" ? "🛡️ Admin" : "👤 User"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* PAGINATION */}
            {totalPages > 1 && (
              <div className="adm-pagination">
                <button
                  className="adm-page-btn"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                >← Previous</button>

                <div className="adm-page-nums">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      className={"adm-page-num " + (page === currentPage ? "adm-page-num--active" : "")}
                      onClick={() => setCurrentPage(page)}
                    >{page}</button>
                  ))}
                </div>

                <button
                  className="adm-page-btn"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                >Next →</button>
              </div>
            )}

          </div>

          {/* PLAYER REPORTS CARD */}
          <div className="adm-card" style={{ marginTop: "20px" }}>

            <div className="adm-controls">
              <div className="adm-search-wrap">
                <span className="adm-search-ico">🔍</span>
                <input
                  type="text"
                  className="adm-search"
                  placeholder="Search by player name..."
                  value={reportSearch}
                  onChange={(e) => setReportSearch(e.target.value)}
                />
              </div>
              <span className="db-section-card-title">Player Reports</span>
              {openReportsCount > 0 && (
                <span className="db-badge db-badge--gold" style={{ marginLeft: "6px" }}>
                  {openReportsCount} open
                </span>
              )}
              <select
                className="adm-filter"
                value={reportStatusFilter}
                onChange={(e) => setReportStatusFilter(e.target.value)}
                style={{ marginLeft: "auto" }}
              >
                <option value="All">All reports</option>
                <option value="open">Open</option>
                <option value="resolved">Resolved</option>
                <option value="dismissed">Dismissed</option>
              </select>
            </div>

            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Reported player</th>
                    <th>Reported by</th>
                    <th>Match</th>
                    <th>Reason</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reportsLoading ? (
                    <tr><td colSpan="8" className="adm-empty">Loading reports...</td></tr>
                  ) : filteredReports.length === 0 ? (
                    <tr><td colSpan="8" className="adm-empty">No reports found</td></tr>
                  ) : filteredReports.map((r, i) => (
                    <tr key={r.id}>
                      <td className="adm-num">{i + 1}</td>
                      <td>
                        <div className="adm-user">
                          <div className="adm-avatar">{(r.reportedName || "?").charAt(0).toUpperCase()}</div>
                          <span className="adm-name">{r.reportedName || "—"}</span>
                        </div>
                      </td>
                      <td className="adm-email">{r.reporterName || "—"}</td>
                      <td className="adm-email">{r.matchTitle || "—"}</td>
                      <td style={{ maxWidth: "220px" }}>{r.reason || "—"}</td>
                      <td className="adm-email">{formatDate(r.createdAt)}</td>
                      <td>{reportStatusBadge(r.status)}</td>
                      <td>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            className="adm-page-btn"
                            onClick={() => handleUpdateReportStatus(r.id, "resolved")}
                            disabled={(r.status || "open") === "resolved"}
                          >
                            Resolve
                          </button>
                          <button
                            className="adm-page-btn"
                            onClick={() => handleUpdateReportStatus(r.id, "dismissed")}
                            disabled={(r.status || "open") === "dismissed"}
                          >
                            Dismiss
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Admin;