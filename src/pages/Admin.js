import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase/firebase";
import { collection, getDocs } from "firebase/firestore";
import "../styles/dashboard.css";

function Admin() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [isAdmin, setIsAdmin] = useState(null);
  const usersPerPage = 8;

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
        if (adminFound) setUsers(allUsers);
      } catch (error) {
        console.log("Error:", error.message);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [navigate]);

  const handleLogout = async () => { await signOut(auth); navigate("/login"); };

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
    return matchSearch && matchPlan;
  });

  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const paginated = filteredUsers.slice((currentPage - 1) * usersPerPage, currentPage * usersPerPage);

  const planBadge = (plan) => {
    if (plan === "Gold")   return <span className="db-badge db-badge--gold">🥇 Gold</span>;
    if (plan === "Silver") return <span className="db-badge db-badge--silver">🥈 Silver</span>;
    return <span className="db-badge db-badge--free">🆓 Free</span>;
  };

  return (
    <div className="db-shell">

      {/* SIDEBAR */}
      <aside className="db-sidebar">
        <div className="db-sidebar-top">
          <div className="db-brand">
            <span className="db-brand-mark">M</span>
            <span className="db-brand-name">Knowora</span>
          </div>
          <nav className="db-nav">
            <span className="db-nav-label">Main</span>
            <Link to="/dashboard" className="db-nav-item"><span className="db-nav-ico">📊</span> Dashboard</Link>
            <Link to="/profile"   className="db-nav-item"><span className="db-nav-ico">👤</span> Profile</Link>
            <Link to="/pricing"   className="db-nav-item"><span className="db-nav-ico">💳</span> Pricing plans</Link>
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
                <p className="db-stat-value">{users.filter(u => !u.plan || u.plan === "Free").length}</p>
              </div>
            </div>
            <div className="db-stat-card">
              <div className="db-stat-icon" style={{background:"#f0f9ff",fontSize:"20px",width:"44px",height:"44px",borderRadius:"10px",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>🥈</div>
              <div>
                <p className="db-stat-label">Silver plan</p>
                <p className="db-stat-value">{users.filter(u => u.plan === "Silver").length}</p>
              </div>
            </div>
            <div className="db-stat-card">
              <div className="db-stat-icon db-stat-icon--amber">🥇</div>
              <div>
                <p className="db-stat-label">Gold plan</p>
                <p className="db-stat-value">{users.filter(u => u.plan === "Gold").length}</p>
              </div>
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
        </div>
      </div>
    </div>
  );
}

export default Admin;