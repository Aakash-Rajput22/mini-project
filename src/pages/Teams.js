import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { db, auth } from "../firebase/firebase";
import "../styles/matches.css";
import "../styles/teams.css";

const SPORTS = ["Cricket", "Football", "Badminton", "Basketball", "Volleyball", "Tennis", "Other"];

const generateInviteCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no confusing 0/O/1/I
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
};

function Teams() {
  const navigate = useNavigate();
  const [myTeams, setMyTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sport, setSport] = useState("Cricket");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    fetchMyTeams();
  }, []);

  const fetchMyTeams = async () => {
    setLoading(true);
    try {
      if (!auth.currentUser) {
        setMyTeams([]);
        setLoading(false);
        return;
      }
      const snap = await getDocs(
        query(collection(db, "teams"), where("members", "array-contains", auth.currentUser.uid))
      );
      setMyTeams(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Error fetching teams:", err);
    }
    setLoading(false);
  };

  const openCreateForm = () => {
    if (!auth.currentUser) {
      navigate("/login");
      return;
    }
    setShowCreateForm(!showCreateForm);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!auth.currentUser) {
      navigate("/login");
      return;
    }
    if (name.trim().length < 3) {
      setError("Write taem name in detail.");
      return;
    }

    setPosting(true);
    try {
      const uid = auth.currentUser.uid;
      let userName = auth.currentUser.displayName || "Anonymous";
      try {
        const userDoc = await getDoc(doc(db, "users", uid));
        if (userDoc.exists() && userDoc.data().name) userName = userDoc.data().name;
      } catch (e) {
        // fallback
      }

      await addDoc(collection(db, "teams"), {
        name: name.trim(),
        description: description.trim(),
        sport,
        createdBy: uid,
        createdByName: userName,
        members: [uid],
        memberNames: { [uid]: userName },
        inviteCode: generateInviteCode(),
        createdAt: serverTimestamp(),
      });

      setName("");
      setDescription("");
      setSport("Cricket");
      setShowCreateForm(false);
      fetchMyTeams();
    } catch (err) {
      console.error("Error creating team:", err);
      setError("Team not creatd. please try again.");
    }
    setPosting(false);
  };

  const handleJoinByCode = async () => {
    if (!auth.currentUser) {
      navigate("/login");
      return;
    }
    if (!joinCode.trim()) {
      setError("write invite code.");
      return;
    }
    setJoining(true);
    setError("");
    try {
      const snap = await getDocs(
        query(collection(db, "teams"), where("inviteCode", "==", joinCode.trim().toUpperCase()))
      );
      if (snap.empty) {
        setError("The invite code you entered is not valid.");
        setJoining(false);
        return;
      }
      const teamDoc = snap.docs[0];
      const uid = auth.currentUser.uid;
      if (teamDoc.data().members.includes(uid)) {
        setError("You are already a member of this team.");
        setJoining(false);
        return;
      }
      let userName = auth.currentUser.displayName || "Anonymous";
      try {
        const userDoc = await getDoc(doc(db, "users", uid));
        if (userDoc.exists() && userDoc.data().name) userName = userDoc.data().name;
      } catch (e) {
        // fallback
      }

      await updateDoc(doc(db, "teams", teamDoc.id), {
        members: arrayUnion(uid),
        [`memberNames.${uid}`]: userName,
      });

      setJoinCode("");
      fetchMyTeams();
      navigate(`/teams/${teamDoc.id}`);
    } catch (err) {
      console.error("Error joining team:", err);
      setError("Failed to join the team. Please try again.");
    }
    setJoining(false);
  };

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

  return (
    <div className="matches-page">
      <button className="back-btn" onClick={() => navigate(-1)}>
        <i className="ti ti-arrow-left" aria-hidden="true"></i> Back
      </button>
      <div className="matches-header">
        <h1>My Teams</h1>
        <button className="create-btn" onClick={openCreateForm}>
          {showCreateForm ? "Cancel" : "+ Create Team"}
        </button>
      </div>

      {error && <div className="form-error" style={{ marginBottom: "16px" }}>{error}</div>}

      {showCreateForm && (
        <form className="create-form" onSubmit={handleCreateSubmit}>
          <input
            type="text"
            placeholder="Team name (e.g. Sunday Warriors)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
          />
          <div className="form-row">
            <select value={sport} onChange={(e) => setSport(e.target.value)}>
              {SPORTS.map((s) => (
                <option key={s} value={s}>
                  {sportIcon(s)} {s}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Short description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={120}
            />
          </div>
          <button type="submit" disabled={posting}>
            {posting ? "Creating..." : "Create Team"}
          </button>
        </form>
      )}

      <div className="team-join-box">
        <input
          type="text"
          placeholder="Have an invite code? Enter it here"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          maxLength={6}
        />
        <button className="join-btn" onClick={handleJoinByCode} disabled={joining}>
          {joining ? "Joining..." : "Join Team"}
        </button>
      </div>

      {loading ? (
        <div className="loading-text">Loading teams...</div>
      ) : myTeams.length === 0 ? (
        <div className="empty-text">
          <p>You are not a member of any team now .</p>
          <button className="link-btn" onClick={openCreateForm}>
            Create your first team →
          </button>
        </div>
      ) : (
        <div className="matches-list">
          {myTeams.map((t) => (
            <div key={t.id} className="match-card" onClick={() => navigate(`/teams/${t.id}`)}>
              <div className="match-card-main">
                <h3>
                  {sportIcon(t.sport)} {t.name}
                </h3>
                <div className="match-meta">
                  <span className="sport-tag">{t.sport}</span>
                  <span>👥 {t.members.length} members</span>
                </div>
                {t.description && (
                  <div className="match-meta">
                    <span>{t.description}</span>
                  </div>
                )}
              </div>
              <div className="match-stats">
                {t.createdBy === auth.currentUser?.uid && (
                  <span className="status-tag status-open">Captain</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Teams;