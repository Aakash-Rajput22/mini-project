import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "../styles/dashboard.css";
import "../styles/profile.css";

const CLOUDINARY_CLOUD_NAME = "g5bvacyh";
const CLOUDINARY_UPLOAD_PRESET = "knowora_profiles";

function Profile() {
  const navigate = useNavigate();
  const autocompleteRef = useRef(null);
  const inputRef = useRef(null);

  const [currentUser, setCurrentUser] = useState(null);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [name, setName] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");

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

  const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    formData.append("folder", "knowora/profiles");

    const res = await fetch(
      "https://api.cloudinary.com/v1_1/" + CLOUDINARY_CLOUD_NAME + "/image/upload",
      { method: "POST", body: formData }
    );

    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      throw new Error(errData?.error?.message || "Cloudinary upload failed");
    }

    const data = await res.json();
    return data.secure_url;
  };

  // Photo now uploads AND saves to Firestore immediately on selection —
  // it no longer waits for the "Save profile" button, which was the bug:
  // selecting a photo only showed a local preview until Save was clicked,
  // so an unsaved preview would revert on refresh.
  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("File size 2MB se zyada hai. Chhoti file choose karo.");
      e.target.value = "";
      return;
    }
    if (!currentUser) {
      alert("Please login first.");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    const previousPhotoURL = photoURL;
    setPhotoURL(previewUrl);

    try {
      setUploadProgress("Uploading photo...");
      const uploadedUrl = await uploadToCloudinary(file);

      setUploadProgress("Saving...");
      await setDoc(doc(db, "users", currentUser.uid), {
        photoURL: uploadedUrl,
      }, { merge: true });

      setPhotoURL(uploadedUrl);
      URL.revokeObjectURL(previewUrl);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error("Error uploading photo:", error);
      alert("Photo upload/save nahi hui: " + error.message);
      setPhotoURL(previousPhotoURL);
      URL.revokeObjectURL(previewUrl);
    }
    setUploadProgress("");
    e.target.value = "";
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  // Fetches a remote image (Cloudinary URL) and converts it to a data URL
  // so jsPDF can embed it — jsPDF cannot use a plain remote URL directly.
  const loadImageAsDataURL = (url) => {
    return new Promise((resolve, reject) => {
      fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error("Could not fetch photo");
          return res.blob();
        })
        .then((blob) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        })
        .catch(reject);
    });
  };

  const downloadProfile = async () => {
    const pdf = new jsPDF();
    pdf.setFontSize(18);
    pdf.text("User Profile", 20, 20);

    let tableStartY = 35;

    if (photoURL) {
      try {
        const imgData = await loadImageAsDataURL(photoURL);
        const format = imgData.substring(imgData.indexOf("/") + 1, imgData.indexOf(";")).toUpperCase();
        pdf.addImage(imgData, format, 150, 10, 35, 35);
        tableStartY = 55;
      } catch (err) {
        console.error("Could not add photo to PDF:", err);
      }
    }

    autoTable(pdf, {
      startY: tableStartY,
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
      await setDoc(doc(db, "users", currentUser.uid), {
        name,
        email: currentUser.email,
        phone,
        address,
        photoURL,
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
            <Link to="/profile" className="db-nav-item db-nav-item--active">
              <i className="ti ti-user db-nav-ico" aria-hidden="true"></i> Profile
            </Link>
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
          <div className="db-user-row">
            <div className="db-user-avatar" style={{overflow:"hidden"}}>
              {photoURL ? (
                <img
                  src={photoURL}
                  alt=""
                  style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:"50%"}}
                />
              ) : (
                name ? name.charAt(0).toUpperCase() : "U"
              )}
            </div>
            <div className="db-user-info">
              <div className="db-user-name">{name || "User"}</div>
              <div className="db-user-email">{currentUser?.email || ""}</div>
            </div>
          </div>
          <button className="db-logout" onClick={handleLogout}>
            <i className="ti ti-logout" aria-hidden="true"></i> Sign out
          </button>
        </div>
      </aside>

      <div className="db-main">
        <header className="db-topbar">
          <div>
            <h1 className="db-page-title">Profile</h1>
            <p className="db-page-sub">Manage your personal information</p>
          </div>
          <button className="db-upgrade-btn" onClick={downloadProfile}>
            <i className="ti ti-download" aria-hidden="true"></i> Download PDF
          </button>
        </header>

        <div className="db-body">
          <div className="pf-grid">

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
              {uploadProgress && (
                <p style={{fontSize:"12px",color:"#60a5fa",marginTop:"4px"}}>
                  {uploadProgress}
                </p>
              )}
              <p className="pf-upload-hint">JPG, PNG — max 2MB · saves instantly</p>

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
                <button
                  className="pf-save-btn"
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