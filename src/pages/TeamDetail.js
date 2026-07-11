import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { doc, updateDoc, deleteDoc, arrayRemove, onSnapshot } from "firebase/firestore";
import { db, auth } from "../firebase/firebase";
import "../styles/matches.css";
import "../styles/teams.css";

function TeamDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const currentUid = auth.currentUser?.uid;

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "teams", id),
      (snap) => {
        if (snap.exists()) setTeam({ id: snap.id, ...snap.data() });
        else setTeam(null);
        setLoading(false);
      },
      (err) => {
        console.error("Error loading team:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [id]);

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

  const handleCopyCode = () => {
    if (!team?.inviteCode) return;
    navigator.clipboard.writeText(team.inviteCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleLeaveTeam = async () => {
    if (!currentUid || !team) return;
    if (currentUid === team.createdBy) {
      setError("Captain team nahi chhod sakta. Disband karo ya baad mein kisi aur ko captain banane ka option add karo.");
      return;
    }
    if (!window.confirm("Kya aap sach mein is team ko chhodna chahte ho?")) return;

    setBusy(true);
    setError("");
    try {
      await updateDoc(doc(db, "teams", id), {
        members: arrayRemove(currentUid),
      });
      navigate("/teams");
    } catch (err) {
      console.error("Error leaving team:", err);
      setError("Team chhodna fail ho gaya. Dobara try karo.");
    }
    setBusy(false);
  };

  const handleDisbandTeam = async () => {
    if (!currentUid || !team || currentUid !== team.createdBy) return;
    if (!window.confirm("Ye team hamesha ke liye delete ho jayegi. Confirm karo?")) return;

    setBusy(true);
    setError("");
    try {
      await deleteDoc(doc(db, "teams", id));
      navigate("/teams");
    } catch (err) {
      console.error("Error disbanding team:", err);
      setError("Disband fail ho gaya. Dobara try karo.");
    }
    setBusy(false);
  };

  if (loading) return <div className="loading-text">Loading...</div>;

  if (!team) {
    return (
      <div className="empty-text">
        Ye team nahi mili.{" "}
        <button className="link-btn" onClick={() => navigate("/teams")}>Go back</button>
      </div>
    );
  }

  const isCaptain = currentUid === team.createdBy;

  return (
    <div className="match-detail-page">
      <button className="back-btn" onClick={() => navigate("/teams")}>
        <i className="ti ti-arrow-left" aria-hidden="true"></i> Back to Teams
      </button>

      <div className="match-full">
        <span className="sport-tag">
          {sportIcon(team.sport)} {team.sport}
        </span>
        <h1>{team.name}</h1>
        {team.description && <p className="match-organizer">{team.description}</p>}
        <p className="match-organizer">Captain: {team.createdByName}</p>

        {error && <div className="form-error">{error}</div>}

        <div className="team-invite-box">
          <span className="team-invite-label">Invite code</span>
          <span className="team-invite-code">{team.inviteCode}</span>
          <button className="link-btn" onClick={handleCopyCode}>
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        <div className="match-actions">
          {!isCaptain && (
            <button className="leave-btn" onClick={handleLeaveTeam} disabled={busy}>
              {busy ? "Leaving..." : "Leave Team"}
            </button>
          )}
          {isCaptain && (
            <button className="leave-btn" onClick={handleDisbandTeam} disabled={busy}>
              {busy ? "Disbanding..." : "Disband Team"}
            </button>
          )}
        </div>
      </div>

      <h2>Members ({team.members?.length || 0})</h2>
      <div className="players-list">
        {team.members?.map((uid) => (
          <div key={uid} className="player-chip">
            <div className="player-avatar">
              {(team.memberNames?.[uid] || "U").charAt(0).toUpperCase()}
            </div>
            <Link to={`/players/${uid}`} className="player-name-link">
              {team.memberNames?.[uid] || "Player"}
            </Link>
            {uid === team.createdBy && <span className="organizer-badge">Captain</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default TeamDetail;