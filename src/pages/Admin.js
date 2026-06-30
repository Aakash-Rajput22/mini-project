import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase/firebase";
import { collection, getDocs } from "firebase/firestore";
import "../styles/dashboard.css";
import "../styles/admin.css";

function Admin() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [isAdmin, setIsAdmin] = useState(null);

  const usersPerPage = 5;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        navigate("/login");
        return;
      }

      try {
        const snapshot = await getDocs(collection(db, "users"));
        const allUsers = [];
        let adminFound = false;

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          allUsers.push({ id: docSnap.id, ...data });
          if (docSnap.id === currentUser.uid && data.role === "admin") {
            adminFound = true;
          }
        });

        setIsAdmin(adminFound);
        if (adminFound) {
          setUsers(allUsers);
        }
      } catch (error) {
        console.log("Error fetching users:", error.message);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="app">
        <div className="main">
          <div className="page-body">
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="app">
        <div className="main">
          <div className="page-body">
            <div className="card">
              <p style={{ fontSize: "16px", color: "#dc2626" }}>
                Access denied. You are not authorized to view this page.
              </p>
              <Link to="/dashboard" className="card-action">
                Go back to dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      (u.name && u.name.toLowerCase().includes(search.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(search.toLowerCase()));

    const matchesPlan =
      planFilter === "All" || (u.plan || "Free") === planFilter;

    return matchesSearch && matchesPlan;
  });

  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + usersPerPage);

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
          <Link to="/dashboard" className="nav-item">Dashboard</Link>
          <Link to="/profile" className="nav-item">Profile</Link>
          <Link to="/pricing" className="nav-item">Pricing plans</Link>
          <Link to="/admin" className="nav-item active">Admin panel</Link>
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
            <h1 className="page-title">Admin panel</h1>
            <p className="page-sub">{filteredUsers.length} users found</p>
          </div>
        </header>

        <div className="page-body">

          <div className="card">

            <div className="admin-controls">
              <input
                type="text"
                className="form-input admin-search"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
              />

              <select
                className="form-input admin-filter"
                value={planFilter}
                onChange={(e) => {
                  setPlanFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="All">All plans</option>
                <option value="Free">Free</option>
                <option value="Silver">Silver</option>
                <option value="Gold">Gold</option>
              </select>
            </div>

            <table className="orders-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Plan</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", color: "#9ca3af", padding: "24px" }}>
                      No users found
                    </td>
                  </tr>
                )}
                {paginatedUsers.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name || "—"}</td>
                    <td>{u.email || "—"}</td>
                    <td>{u.phone || "—"}</td>
                    <td>
                      <span className={getPlanBadgeClass(u.plan)}>
                        {u.plan || "Free"}
                      </span>
                    </td>
                    <td>{u.role === "admin" ? "Admin" : "User"}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="page-btn"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  Previous
                </button>

                <span className="page-info">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  className="page-btn"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            )}

          </div>

        </div>
      </div>
    </div>
  );
}

export default Admin;