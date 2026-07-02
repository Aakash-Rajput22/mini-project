import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db, auth } from "../firebase/firebase";
import "../styles/matches.css";

function MatchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const currentUid = auth.currentUser?.uid;

  const fetchMatch = useCallback(async () => {
    const snap = await getDoc(doc(db, "matches", id));
    if (snap.exists()) {
      setMatch({ id: snap.id, ...snap.data() });
    } else {
      setMatch(null);
    }
  }, [id]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchMatch();
      setLoading(false);
    };
    load();
  }, [fetchMatch]);

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

  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleJoin = async () => {
    if (!currentUid) {
      setError("Match join karne ke liye login karo.");
      return;
    }
    if (!match) return;
    if ((match.joinedPlayers?.length || 0) >= match.maxPlayers) {
      setError("Yeh match already full hai.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      let userName = auth.currentUser.displayName || "Anonymous";
      try {
        const userDoc = await getDoc(doc(db, "users", currentUid));
        if (userDoc.exists() && userDoc.data().name) {
          userName = userDoc.data().name;
        }
      } catch (e) {
        // fallback
      }

      const matchRef = doc(db, "matches", id);
      const newJoinedCount = (match.joinedPlayers?.length || 0) + 1;

      await updateDoc(matchRef, {
        joinedPlayers: arrayUnion(currentUid),
        [`joinedPlayerNames.${currentUid}`]: userName,
        status: newJoinedCount >= match.maxPlayers ? "full" : "open",
      });

      await fetchMatch();
    } catch (err) {
      console.error("Error joining match:", err);
      setError("Join nahi ho paya. Dobara try karo.");
    }
    setBusy(false);
  };

  const handleLeave = async () => {
    if (!currentUid || !match) return;
    if (currentUid === match.createdBy) {
      setError("Match organizer match nahi chhod sakta. Match cancel karne ke liye admin se baat karo.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const matchRef = doc(db, "matches", id);
      await updateDoc(matchRef, {
        joinedPlayers: arrayRemove(currentUid),
        status: "open",
      });
      await fetchMatch();
    } catch (err) {
      console.error("Error leaving match:", err);
      setError("Leave nahi ho paya. Dobara try karo.");
    }
    setBusy(false);
  };

  if (loading) return <div className="loading-text">Loading...</div>;
  if (!match)
    return (
      <div className="empty-text">
        Yeh match nahi mila.{" "}
        <button className="link-btn" onClick={() => navigate("/matches")}>
          Wapas jao
        </button>
      </div>
    );

  const hasJoined = match.joinedPlayers?.includes(currentUid);
  const isFull = (match.joinedPlayers?.length || 0) >= match.maxPlayers;
  const isCreator = currentUid === match.createdBy;
  const totalCost = (match.costPerPlayer || 0) * (match.joinedPlayers?.length || 0);

  return (
    <div className="match-detail-page">
      <button className="back-btn" onClick={() => navigate("/matches")}>
        &larr; Back to Matches
      </button>

      <div className="match-full">
        <span className="sport-tag">
          {sportIcon(match.sport)} {match.sport}
        </span>
        <h1>{match.title}</h1>
        <div className="match-info-grid">
          <div className="info-item">
            <span className="info-label">📍 Venue</span>
            <span className="info-val">{match.venue}</span>
          </div>
          <div className="info-item">
            <span className="info-label">🕒 Date & Time</span>
            <span className="info-val">{formatDate(match.date)}</span>
          </div>
          <div className="info-item">
            <span className="info-label">👥 Players</span>
            <span className="info-val">
              {match.joinedPlayers?.length || 0} / {match.maxPlayers}
            </span>
          </div>
          {match.costPerPlayer > 0 && (
            <div className="info-item">
              <span className="info-label">💰 Cost / player</span>
              <span className="info-val">₹{match.costPerPlayer}</span>
            </div>
          )}
        </div>
        <p className="match-organizer">Organized by {match.createdByName}</p>

        {error && <div className="form-error">{error}</div>}

        <div className="match-actions">
          {!hasJoined && !isFull && (
            <button className="join-btn" onClick={handleJoin} disabled={busy}>
              {busy ? "Joining..." : "Join Match"}
            </button>
          )}
          {hasJoined && !isCreator && (
            <button className="leave-btn" onClick={handleLeave} disabled={busy}>
              {busy ? "Leaving..." : "Leave Match"}
            </button>
          )}
          {isFull && !hasJoined && (
            <span className="status-tag status-full">Match Full</span>
          )}
          {match.costPerPlayer > 0 && (
            <span className="total-cost-note">
              Total ground cost: ₹{totalCost} (₹{match.costPerPlayer} × {match.joinedPlayers?.length || 0} players)
            </span>
          )}
        </div>
      </div>

      <h2>Players Joined ({match.joinedPlayers?.length || 0})</h2>
      <div className="players-list">
        {match.joinedPlayers?.map((uid) => (
          <div key={uid} className="player-chip">
            <div className="player-avatar">
              {(match.joinedPlayerNames?.[uid] || "U").charAt(0).toUpperCase()}
            </div>
            <span>{match.joinedPlayerNames?.[uid] || "Player"}</span>
            {uid === match.createdBy && (
              <span className="organizer-badge">Organizer</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default MatchDetail;