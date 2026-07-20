import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase/firebase";
import { doc, setDoc, getDoc, updateDoc, increment, collection, query, where, getDocs } from "firebase/firestore";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useToast } from "../components/Toast";
import "../styles/dashboard.css";
import "../styles/profile.css";

const CLOUDINARY_CLOUD_NAME = "g5bvacyh";
const CLOUDINARY_UPLOAD_PRESET = "knowora_profiles";

function Profile() {
  const navigate = useNavigate();
  const toast = useToast();
  const debounceRef = useRef(null);

  const [currentUser, setCurrentUser] = useState(null);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [bio, setBio] = useState("");
  const [name, setName] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState("");
  const [locatingAddress, setLocatingAddress] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [referralCode, setReferralCode] = useState("");
  const [referredBy, setReferredBy] = useState("");
  const [referralInput, setReferralInput] = useState("");
  const [referralBusy, setReferralBusy] = useState(false);
  const [referralMsg, setReferralMsg] = useState("");

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
        setBio(data.bio || "");
        setName(data.name || user.displayName || "");
        setPhotoURL(data.photoURL || user.photoURL || "");
        setReferredBy(data.referredBy || "");
        if (data.role === "admin") setIsAdmin(true);

        if (data.referralCode) {
          setReferralCode(data.referralCode);
        } else {
          const newCode = (user.uid.slice(0, 4) + Math.random().toString(36).slice(2, 6)).toUpperCase();
          setReferralCode(newCode);
          try {
            await setDoc(ref, { referralCode: newCode }, { merge: true });
          } catch (e) {
            console.error("Error saving referral code:", e);
          }
        }
      }
      setPageLoading(false);
    });
    return () => unsub();
  }, [navigate]);

  // Free address search using OpenStreetMap's Nominatim — no API key or
  // billing needed, unlike Google Places Autocomplete.
  const handleAddressChange = (e) => {
    const value = e.target.value;
    setAddress(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 3) {
      setAddressSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&addressdetails=0&limit=5`
        );
        const data = await res.json();
        setAddressSuggestions(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Address search error:", err);
      }
    }, 400);
  };

  const handleSelectSuggestion = (suggestion) => {
    setAddress(suggestion.display_name);
    setAddressSuggestions([]);
  };

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

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size must be less than 2 MB. Choose a smaller file.");
      e.target.value = "";
      return;
    }
    if (!currentUser) {
      toast.error("Please login first.");
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
      toast.error("Photo upload failed: " + error.message);
      setPhotoURL(previousPhotoURL);
      URL.revokeObjectURL(previewUrl);
    }
    setUploadProgress("");
    e.target.value = "";
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Location is not detected in this browser.");
      return;
    }
    setLocatingAddress(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
          );
          if (!res.ok) throw new Error("Reverse geocoding failed");
          const data = await res.json();
          if (data && data.display_name) {
            setAddress(data.display_name);
            setAddressSuggestions([]);
          } else {
            toast.error("Address not found. Please type it manually.");
          }
        } catch (err) {
          console.error("Reverse geocoding error:", err);
          toast.error("Failed to fetch address. Please type it manually.");
        }
        setLocatingAddress(false);
      },
      (err) => {
        console.error("Geolocation error:", err);
        setLocatingAddress(false);
        toast.error("Location access not allowed. Please check your browser settings.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
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
        ["Bio", bio || "-"],
      ],
    });
    pdf.save("Profile.pdf");
  };

  const saveProfile = async () => {
    if (!currentUser) { toast.error("Please login first"); return; }
    setLoading(true);
    try {
      await setDoc(doc(db, "users", currentUser.uid), {
        name,
        email: currentUser.email,
        phone,
        address,
        bio,
        photoURL,
      }, { merge: true });

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      toast.error(error.message);
    }
    setLoading(false);
  };

  const handleRedeemReferralCode = async () => {
    if (!currentUser) return;
    const code = referralInput.trim().toUpperCase();
    if (!code) {
      setReferralMsg("Enter referral code.");
      return;
    }
    if (code === referralCode) {
      setReferralMsg("You cannot use your own referral code.");
      return;
    }

    setReferralBusy(true);
    setReferralMsg("");
    try {
      const snap = await getDocs(
        query(collection(db, "users"), where("referralCode", "==", code))
      );
      if (snap.empty) {
        setReferralMsg("The referral code does not match any user.");
        setReferralBusy(false);
        return;
      }
      const referrerDoc = snap.docs[0];
      const REFERRAL_BONUS = 20;

      await updateDoc(doc(db, "users", currentUser.uid), {
        referredBy: referrerDoc.id,
        points: increment(REFERRAL_BONUS),
      });
      await updateDoc(doc(db, "users", referrerDoc.id), {
        points: increment(REFERRAL_BONUS),
      });

      setReferredBy(referrerDoc.id);
      setReferralInput("");
      setReferralMsg(`Code applied! You and ${referrerDoc.data().name || "your friend"} each received ${REFERRAL_BONUS} points.`);
    } catch (err) {
      console.error("Error redeeming referral code:", err);
      setReferralMsg("Failed to apply code. Please try again.");
    }
    setReferralBusy(false);
  };

  if (pageLoading) {
    return (
      <div className="db-shell">
        <div className="db-main" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ color: "#94a3b8" }}>Loading profile...</p>
        </div>
      </div>
    );
  }

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
            <Link to="/matches" className="db-nav-item">
              <i className="ti ti-ball-basketball db-nav-ico" aria-hidden="true"></i> Matches
            </Link>
            <Link to="/teams" className="db-nav-item">
              <i className="ti ti-users-group db-nav-ico" aria-hidden="true"></i> Teams
            </Link>
            <Link to="/leaderboard" className="db-nav-item">
              <i className="ti ti-trophy db-nav-ico" aria-hidden="true"></i> Leaderboard
            </Link>
            <Link to="/profile" className="db-nav-item db-nav-item--active">
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
            <button className="db-back-btn" onClick={() => navigate(-1)}>
              <i className="ti ti-arrow-left" aria-hidden="true"></i> Back
            </button>
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

              {/* REFERRALS */}
              <div className="pf-referral-box">
                <p className="pf-label" style={{ marginBottom: "6px" }}>Your referral code</p>
                <div className="pf-referral-code-row">
                  <span className="pf-referral-code">{referralCode}</span>
                  <button
                    type="button"
                    className="pf-location-btn"
                    onClick={() => {
                      navigator.clipboard.writeText(referralCode);
                      setReferralMsg("Code copied!");
                      setTimeout(() => setReferralMsg(""), 2000);
                    }}
                  >
                    Copy
                  </button>
                </div>
                <p className="pf-upload-hint">Share this code with a friend and you both get 20 points when they use it.</p>

                {!referredBy && (
                  <div className="pf-referral-redeem">
                    <input
                      type="text"
                      className="pf-input"
                      placeholder="Enter a friend's code"
                      value={referralInput}
                      onChange={(e) => setReferralInput(e.target.value.toUpperCase())}
                      maxLength={10}
                    />
                    <button
                      type="button"
                      className="pf-location-btn"
                      onClick={handleRedeemReferralCode}
                      disabled={referralBusy}
                    >
                      {referralBusy ? "Applying..." : "Apply"}
                    </button>
                  </div>
                )}
                {referralMsg && <p className="pf-referral-msg">{referralMsg}</p>}
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
                  <div className="pf-input-wrap">
                    <input
                      className="pf-input"
                      type="text"
                      placeholder="Start typing your address..."
                      value={address}
                      onChange={handleAddressChange}
                      autoComplete="off"
                    />
                    {addressSuggestions.length > 0 && (
                      <ul className="pf-suggestions">
                        {addressSuggestions.map((s) => (
                          <li
                            key={s.place_id}
                            onClick={() => handleSelectSuggestion(s)}
                          >
                            {s.display_name}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <button
                    type="button"
                    className="pf-location-btn"
                    onClick={handleUseCurrentLocation}
                    disabled={locatingAddress}
                  >
                    📍 {locatingAddress ? "Detecting..." : "Use my current location"}
                  </button>
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

                <div className="pf-form-group pf-full-width">
                  <label className="pf-label">Bio</label>
                  <textarea
                    className="pf-input pf-textarea"
                    placeholder="Tell other players a bit about yourself — favourite sports, skill level, availability..."
                    value={bio}
                    maxLength={300}
                    onChange={(e) => setBio(e.target.value)}
                    rows={4}
                  />
                  <span className="pf-char-count">{bio.length}/300</span>
                </div>
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