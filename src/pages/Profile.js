import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "../styles/dashboard.css";
import "../styles/profile.css";

function Profile() {
  const navigate = useNavigate();
  const autocompleteRef = useRef(null);
  const inputRef = useRef(null);

  const [currentUser, setCurrentUser] = useState(null);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [name, setName] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { navigate("/login"); return; }
      setCurrentUser(user);
      setName(user.displayName || "");
      setPhotoURL(user.photoURL || "");

      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        setPhone(data.phone || "");
        setAddress(data.address || "");
        setName(data.name || user.displayName || "");
        setPhotoURL(data.photoURL || user.photoURL || "");
        if (data.role === "admin") setIsAdmin(true);
      }
    });
    return () => unsub();
  }, [navigate]);

  useEffect(() => {
    if (!window.google || !inputRef.current) return;
    autocompleteRef.current = new window.google.maps.places.Autocomplete(
      inputRef.current,
      { types: ["geocode"] }
    );
    autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current.getPlace();
      setAddress(place.formatted_address || "");
    });
  }, [currentUser]);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoURL(URL.createObjectURL(file));
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const downloadProfile = () => {
    const pdf = new jsPDF();
    pdf.setFontSize(18);
    pdf.text("User Profile", 20, 20);
    autoTable(pdf, {
      startY: 35,
      head: [["Field", "Value"]],
      body: [
        ["Name", name || "-"],
        ["Email", currentUser?.email || "-"],
        ["Phone", phone || "-"],
        ["Address", address || "-"],
      ],
    });
    pdf.save("Profile.pdf");
  };

  const saveProfile = async () => {
    if (!currentUser) { alert("Please login first"); return; }
    setLoading(true);
    try {
      let uploadedPhotoURL = photoURL;
      if (photoFile) {
        uploadedPhotoURL = URL.createObjectURL(photoFile);
      }
      await setDoc(doc(db, "users", currentUser.uid), {
        name,
        email: currentUser.email,
        phone,
        address,
        photoURL: uploadedPhotoURL,
      }, { merge: true });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      alert(error.message);
    }
    setLoading(false);
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
            <Link to="/dashboard" className="db-nav-item">
              <span className="db-nav-ico">📊</span> Dashboard
            </Link>
            <Link to="/profile" className="db-nav-item db-nav-item--active">
              <span className="db-nav-ico">👤</span> Profile
            </Link>
            <Link to="/pricing" className="db-nav-item">
              <span className="db-nav-ico">💳</span> Pricing plans
            </Link>
            {isAdmin && (
              <>
                <span className="db-nav-label" style={{marginTop:"16px"}}>Admin</span>
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
              {name ? name.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="db-user-info">
              <div className="db-user-name">{name || "User"}</div>
              <div className="db-user-email">{currentUser?.email || ""}</div>
            </div>
          </div>
          <button className="db-logout" onClick={handleLogout}>Sign out</button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="db-main">
        <header className="db-topbar">
          <div>
            <h1 className="db-page-title">Profile</h1>
            <p className="db-page-sub">Manage your personal information</p>
          </div>
          <button className="db-upgrade-btn" onClick={downloadProfile}>
            Download PDF
          </button>
        </header>

        <div className="db-body">
          <div className="pf-grid">

            {/* ── LEFT: PHOTO CARD ── */}
            <div className="pf-photo-card">
              <div className="pf-avatar-wrap">
                {photoURL ? (
                  <img src={photoURL} alt="Profile" className="pf-avatar-img" />
                ) : (
                  <div className="pf-avatar-placeholder">
                    {name ? name.charAt(0).toUpperCase() : "U"}
                  </div>
                )}
              </div>
              <p className="pf-avatar-name">{name || currentUser?.email}</p>
              <p className="pf-avatar-email">{currentUser?.email}</p>
              <label className="pf-upload-btn">
                📷 Upload photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  style={{ display: "none" }}
                />
              </label>
              <p className="pf-upload-hint">JPG, PNG — max 2MB</p>

              <div className="pf-info-list">
                <div className="pf-info-item">
                  <span className="pf-info-label">Email verified</span>
                  <span className={"pf-info-val " + (currentUser?.emailVerified ? "pf-val--green" : "pf-val--amber")}>
                    {currentUser?.emailVerified ? "✓ Verified" : "✗ Not verified"}
                  </span>
                </div>
                <div className="pf-info-item">
                  <span className="pf-info-label">Account role</span>
                  <span className="pf-info-val">{isAdmin ? "Admin" : "User"}</span>
                </div>
              </div>
            </div>

            {/* ── RIGHT: FORM CARD ── */}
            <div className="pf-form-card">
              <div className="pf-form-header">
                <h2 className="pf-form-title">Personal information</h2>
              </div>

              <div className="pf-form-grid">
                <div className="pf-form-group">
                  <label className="pf-label">Full name</label>
                  <input
                    className="pf-input"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                  />
                </div>

                <div className="pf-form-group">
                  <label className="pf-label">Email</label>
                  <input
                    className="pf-input pf-input--disabled"
                    type="email"
                    value={currentUser?.email || ""}
                    disabled
                  />
                </div>

                <div className="pf-form-group">
                  <label className="pf-label">Phone number</label>
                  <input
                    className="pf-input"
                    type="text"
                    placeholder="Enter phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="pf-form-group pf-full-width">
                  <label className="pf-label">Address</label>
                  <input
                    className="pf-input"
                    type="text"
                    placeholder="Start typing your address..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    ref={inputRef}
                  />
                </div>

                {address && (
                  <div className="pf-form-group pf-full-width">
                    <label className="pf-label">Location on map</label>
                    <iframe
                      className="pf-map"
                      title="map"
                      src={"https://maps.google.com/maps?q=" + encodeURIComponent(address) + "&output=embed"}
                      allowFullScreen
                    />
                  </div>
                )}
              </div>

              <div className="pf-form-actions">
                {saved && <span className="pf-saved">✓ Profile saved!</span>}
                <button className="pf-save-btn" onClick={saveProfile} disabled={loading}>
                  {loading ? "Saving..." : "Save profile"}
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;