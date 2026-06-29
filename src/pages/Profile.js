import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import "../styles/profile.css";

function Profile() {
  const user = auth.currentUser;
  const navigate = useNavigate();
  const autocompleteRef = useRef(null);
  const inputRef = useRef(null);

  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [name, setName] = useState(user?.displayName || "");
  const [photoURL, setPhotoURL] = useState(user?.photoURL || "");
  const [photoFile, setPhotoFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        setPhone(data.phone || "");
        setAddress(data.address || "");
        setName(data.name || user.displayName || "");
        setPhotoURL(data.photoURL || user.photoURL || "");
      }
    };
    fetchProfile();
  }, [user]);

  useEffect(() => {
    if (!window.google) return;
    autocompleteRef.current = new window.google.maps.places.Autocomplete(
      inputRef.current,
      { types: ["geocode"] }
    );
    autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current.getPlace();
      setAddress(place.formatted_address || "");
    });
  }, []);

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

  const saveProfile = async () => {
    if (!user) { alert("Please login first"); return; }
    setLoading(true);
    try {
      let uploadedPhotoURL = photoURL;

      // Storj upload - apna Storj config yahan lagana
      if (photoFile) {
        const formData = new FormData();
        formData.append("file", photoFile);
        // Storj integration baad mein — abhi local URL use ho raha hai
        uploadedPhotoURL = URL.createObjectURL(photoFile);
      }

      await setDoc(doc(db, "users", user.uid), {
        name: name,
        email: user.email,
        phone: phone,
        address: address,
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
    <div className="app">

      <aside className="sidebar">
        <div className="sidebar-brand">Mini Project</div>
        <nav>
          <Link to="/dashboard" className="nav-item">Dashboard</Link>
          <Link to="/profile" className="nav-item active">Profile</Link>
          <Link to="/pricing" className="nav-item">Pricing plans</Link>
        </nav>
        <div className="sidebar-bottom">
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </aside>

      <div className="main">

        <header className="topbar">
          <div>
            <h1 className="page-title">Profile</h1>
            <p className="page-sub">Manage your personal information</p>
          </div>
        </header>

        <div className="page-body">
          <div className="profile-grid">

            {/* LEFT — Photo card */}
            <div className="card photo-card">
              <div className="avatar-wrap">
                {photoURL ? (
                  <img src={photoURL} alt="Profile" className="avatar-img" />
                ) : (
                  <div className="avatar-placeholder">
                    {name ? name.charAt(0).toUpperCase() : "U"}
                  </div>
                )}
              </div>
              <p className="avatar-name">{name || user?.email}</p>
              <p className="avatar-email">{user?.email}</p>
              <label className="upload-btn">
                Upload photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  style={{ display: "none" }}
                />
              </label>
              <p className="upload-hint">JPG, PNG — max 2MB</p>
            </div>

            {/* RIGHT — Form card */}
            <div className="card form-card">
              <div className="card-header">
                <span className="card-title">Personal information</span>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Full name</label>
                  <input
                    className="form-input"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    className="form-input disabled"
                    type="email"
                    value={user?.email || ""}
                    disabled
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Phone number</label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Enter phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="form-group full-width">
                  <label className="form-label">Address</label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Start typing your address..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    ref={inputRef}
                  />
                </div>

                {address && (
                  <div className="form-group full-width">
                    <label className="form-label">Location on map</label>
                    <iframe
                      className="map-frame"
                      title="map"
                      src={"https://maps.google.com/maps?q=" + encodeURIComponent(address) + "&output=embed"}
                      allowFullScreen
                    />
                  </div>
                )}
              </div>

              <div className="form-actions">
                {saved && <span className="saved-msg">Profile saved!</span>}
                <button
                  className="save-btn"
                  onClick={saveProfile}
                  disabled={loading}
                >
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