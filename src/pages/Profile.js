import { useState } from "react";
import Navbar from "../components/Navbar";
import { auth, db } from "../firebase/firebase";
import { doc, setDoc } from "firebase/firestore";
import "../styles/profile.css";

function Profile() {
  const user = auth.currentUser;

  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const saveProfile = async () => {
    if (!user) {
      alert("Please login first");
      return;
    }

    try {
      await setDoc(doc(db, "users", user.uid), {
        name: user.displayName,
        email: user.email,
        phone: phone,
        address: address,
      });

      alert("Profile Saved Successfully");
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <>
      <Navbar />

      <div className="profile-container">
        <div className="profile-box">
          <h2>My Profile</h2>

          <label>Name</label>
          <input
            type="text"
            value={user?.displayName || ""}
            disabled
          />

          <label>Email</label>
          <input
            type="email"
            value={user?.email || ""}
            disabled
          />

          <label>Phone</label>
          <input
            type="text"
            placeholder="Enter Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <label>Address</label>
          <textarea
            placeholder="Enter Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

          <button
            className="save-btn"
            onClick={saveProfile}
          >
            Save Profile
          </button>
        </div>
      </div>
    </>
  );
}

export default Profile;