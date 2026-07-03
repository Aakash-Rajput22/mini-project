import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  increment,
  deleteField,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "../firebase/firebase";
import "../styles/matches.css";

const PLAN_MULTIPLIER = { Free: 1, Silver: 2, Gold: 5 };
const BASE_POINTS = 10;

const ROLES_BY_SPORT = {
  Cricket: ["Batsman", "Bowler", "All-rounder", "Wicketkeeper"],
  Football: ["Forward", "Midfielder", "Defender", "Goalkeeper"],
  Badminton: ["Singles Player", "Doubles Player"],
  Basketball: ["Point Guard", "Shooting Guard", "Small Forward", "Power Forward", "Center"],
  Volleyball: ["Setter", "Spiker", "Libero", "Blocker"],
  Tennis: ["Singles Player", "Doubles Player"],
  Other: ["Player"],
};

const STAT_LABEL_BY_SPORT = {
  Cricket: "Runs",
  Football: "Goals",
  Badminton: "Points",
  Basketball: "Points",
  Volleyball: "Points",
  Tennis: "Points",
  Other: "Score",
};

function MatchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [currentUserPlan, setCurrentUserPlan] = useState("Free");

  const [showRoleSelect, setShowRoleSelect] = useState(false);
  const [selectedRole, setSelectedRole] = useState("");

  const [showScorecardForm, setShowScorecardForm] = useState(false);
  const [teamAName, setTeamAName] = useState("Team A");
  const [teamBName, setTeamBName] = useState("Team B");
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [winner, setWinner] = useState("Team A");
  const [playerStats, setPlayerStats] = useState({});

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

  useEffect(() => {
    const loadPlan = async () => {
      if (!currentUid) return;
      try {
        const snap = await getDoc(doc(db, "users", currentUid));
        if (snap.exists() && snap.data().plan) setCurrentUserPlan(snap.data().plan);
      } catch (e) {
        // fallback stays Free
      }
    };
    loadPlan();
  }, [currentUid]);

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

  /* ─────────────── JOIN REQUEST FLOW ─────────────── */

  const handleRequestJoin = async () => {
    if (!currentUid) {
      setError("Match join karne ke liye login karo.");
      return;
    }
    if (!selectedRole) {
      setError("Pehle apna role select karo.");
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
      let userPlan = "Free";
      try {
        const userDoc = await getDoc(doc(db, "users", currentUid));
        if (userDoc.exists()) {
          if (userDoc.data().name) userName = userDoc.data().name;
          if (userDoc.data().plan) userPlan = userDoc.data().plan;
        }
      } catch (e) {
        // fallback
      }

      await updateDoc(doc(db, "matches", id), {
        [`pendingRequests.${currentUid}`]: {
          name: userName,
          role: selectedRole,
          plan: userPlan,
          requestedAt: serverTimestamp(),
        },
      });

      setShowRoleSelect(false);
      setSelectedRole("");
      await fetchMatch();
    } catch (err) {
      console.error("Error sending join request:", err);
      setError("Request nahi bheji ja saki. Dobara try karo.");
    }
    setBusy(false);
  };

  const handleCancelRequest = async () => {
    setBusy(true);
    setError("");
    try {
      await updateDoc(doc(db, "matches", id), {
        [`pendingRequests.${currentUid}`]: deleteField(),
      });
      await fetchMatch();
    } catch (err) {
      console.error("Error cancelling request:", err);
    }
    setBusy(false);
  };

  const handleApprove = async (uid) => {
    const request = match.pendingRequests?.[uid];
    if (!request) return;

    setBusy(true);
    setError("");
    try {
      const newJoinedCount = (match.joinedPlayers?.length || 0) + 1;

      await updateDoc(doc(db, "matches", id), {
        joinedPlayers: arrayUnion(uid),
        [`joinedPlayerNames.${uid}`]: request.name,
        [`joinedPlayerRoles.${uid}`]: request.role,
        [`pendingRequests.${uid}`]: deleteField(),
        status: newJoinedCount >= match.maxPlayers ? "full" : "open",
      });

      try {
        const multiplier = PLAN_MULTIPLIER[request.plan] || 1;
        await updateDoc(doc(db, "users", uid), {
          points: increment(BASE_POINTS * multiplier),
        });
      } catch (e) {
        console.error("Error awarding points:", e);
      }

      await fetchMatch();
    } catch (err) {
      console.error("Error approving request:", err);
      setError("Approve nahi ho paya. Dobara try karo.");
    }
    setBusy(false);
  };

  const handleReject = async (uid) => {
    setBusy(true);
    setError("");
    try {
      await updateDoc(doc(db, "matches", id), {
        [`pendingRequests.${uid}`]: deleteField(),
      });
      await fetchMatch();
    } catch (err) {
      console.error("Error rejecting request:", err);
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
        [`joinedPlayerRoles.${currentUid}`]: deleteField(),
        status: "open",
      });
      await fetchMatch();
    } catch (err) {
      console.error("Error leaving match:", err);
      setError("TRY AGAIN.");
    }
    setBusy(false);
  };

  /* ─────────────── SCORECARD (Gold feature) ─────────────── */

  const openScorecardForm = () => {
    const sc = match.scorecard;
    setTeamAName(sc?.teamAName || "Team A");
    setTeamBName(sc?.teamBName || "Team B");
    setScoreA(sc?.scoreA ?? 0);
    setScoreB(sc?.scoreB ?? 0);
    setWinner(sc?.winner || "Team A");
    const stats = {};
    (match.joinedPlayers || []).forEach((uid) => {
      stats[uid] = sc?.playerStats?.[uid] ?? 0;
    });
    setPlayerStats(stats);
    setShowScorecardForm(true);
  };

  const handleSaveScorecard = async () => {
    setBusy(true);
    setError("");
    try {
      const scorecard = {
        teamAName: teamAName.trim() || "Team A",
        teamBName: teamBName.trim() || "Team B",
        scoreA: Number(scoreA) || 0,
        scoreB: Number(scoreB) || 0,
        winner,
        statLabel: STAT_LABEL_BY_SPORT[match.sport] || "Score",
        playerStats,
        updatedAt: serverTimestamp(),
      };
      await updateDoc(doc(db, "matches", id), { scorecard });
      setShowScorecardForm(false);
      await fetchMatch();
    } catch (err) {
      console.error("Error saving scorecard:", err);
      setError("Scorecard save nahi hua. Dobara try karo.");
    }
    setBusy(false);
  };

  if (loading) return <div className="loading-text">Loading...</div>;
  if (!match)
    return (
      <div className="empty-text">
        This match does not exist..{" "}
        <button className="link-btn" onClick={() => navigate("/matches")}>
          Go back
        </button>
      </div>
    );

  const hasJoined = match.joinedPlayers?.includes(currentUid);
  const isFull = (match.joinedPlayers?.length || 0) >= match.maxPlayers;
  const isCreator = currentUid === match.createdBy;
  const hasPendingRequest = !!match.pendingRequests?.[currentUid];
  const isGoldOrganizer = isCreator && currentUserPlan === "Gold";
  const totalCost = (match.costPerPlayer || 0) * (match.joinedPlayers?.length || 0);
  const pendingList = Object.entries(match.pendingRequests || {});
  const roleOptions = ROLES_BY_SPORT[match.sport] || ROLES_BY_SPORT.Other;
  const statLabel = STAT_LABEL_BY_SPORT[match.sport] || "Score";

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
          {!hasJoined && !hasPendingRequest && !isFull && !showRoleSelect && (
            <button className="join-btn" onClick={() => setShowRoleSelect(true)}>
              Request to Join
            </button>
          )}

          {showRoleSelect && (
            <div className="role-select-box">
              <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
                <option value="">Select your role</option>
                {roleOptions.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <button
                className="join-btn"
                onClick={handleRequestJoin}
                disabled={busy || !selectedRole}
              >
                {busy ? "Sending..." : "Send Request"}
              </button>
              <button className="link-btn" onClick={() => setShowRoleSelect(false)}>
                Cancel
              </button>
            </div>
          )}

          {hasPendingRequest && (
            <>
              <span className="status-tag status-pending">
                Request pending — {match.pendingRequests[currentUid].role}
              </span>
              <button className="leave-btn" onClick={handleCancelRequest} disabled={busy}>
                {busy ? "Cancelling..." : "Cancel request"}
              </button>
            </>
          )}

          {hasJoined && !isCreator && (
            <button className="leave-btn" onClick={handleLeave} disabled={busy}>
              {busy ? "Leaving..." : "Leave Match"}
            </button>
          )}

          {isFull && !hasJoined && !hasPendingRequest && (
            <span className="status-tag status-full">Match Full</span>
          )}

          {match.costPerPlayer > 0 && (
            <span className="total-cost-note">
              Total ground cost: ₹{totalCost} (₹{match.costPerPlayer} × {match.joinedPlayers?.length || 0} players)
            </span>
          )}
        </div>
      </div>

      {/* ORGANIZER: PENDING JOIN REQUESTS */}
      {isCreator && pendingList.length > 0 && (
        <div className="requests-panel">
          <h2>Join Requests ({pendingList.length})</h2>
          {pendingList.map(([uid, req]) => (
            <div key={uid} className="request-row">
              <div className="player-avatar">{req.name.charAt(0).toUpperCase()}</div>
              <div className="request-info">
                <div className="request-name">{req.name}</div>
                <span className="role-badge">{req.role}</span>
              </div>
              <div className="request-actions">
                <button className="approve-btn" onClick={() => handleApprove(uid)} disabled={busy}>
                  Approve
                </button>
                <button className="reject-btn" onClick={() => handleReject(uid)} disabled={busy}>
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PLAYERS JOINED */}
      <h2>Players Joined ({match.joinedPlayers?.length || 0})</h2>
      <div className="players-list">
        {match.joinedPlayers?.map((uid) => (
          <div key={uid} className="player-chip">
            <div className="player-avatar">
              {(match.joinedPlayerNames?.[uid] || "U").charAt(0).toUpperCase()}
            </div>
            <span>{match.joinedPlayerNames?.[uid] || "Player"}</span>
            {match.joinedPlayerRoles?.[uid] && (
              <span className="role-badge">{match.joinedPlayerRoles[uid]}</span>
            )}
            {uid === match.createdBy && (
              <span className="organizer-badge">Organizer</span>
            )}
          </div>
        ))}
      </div>

      {/* SCORECARD (Gold feature) */}
      <div className="scorecard-section">
        <div className="scorecard-header">
          <h2>Scorecard</h2>
          {isGoldOrganizer && !showScorecardForm && (
            <button className="link-btn" onClick={openScorecardForm}>
              {match.scorecard ? "Edit Scorecard" : "+ Add Scorecard"}
            </button>
          )}
        </div>

        {!match.scorecard && !showScorecardForm && (
          <p className="empty-text-small">
            {isCreator
              ? isGoldOrganizer
                ? "No scorecard yet. Add one once the match is played."
                : "Scorecards are a Gold plan feature. Upgrade to add a scorecard for this match."
              : "Organizer hasn't posted a scorecard for this match yet."}
          </p>
        )}

        {showScorecardForm && isGoldOrganizer && (
          <div className="scorecard-form">
            <div className="form-row">
              <input
                type="text"
                placeholder="Team A name"
                value={teamAName}
                onChange={(e) => setTeamAName(e.target.value)}
              />
              <input
                type="number"
                placeholder="Team A score"
                value={scoreA}
                onChange={(e) => setScoreA(e.target.value)}
              />
            </div>
            <div className="form-row">
              <input
                type="text"
                placeholder="Team B name"
                value={teamBName}
                onChange={(e) => setTeamBName(e.target.value)}
              />
              <input
                type="number"
                placeholder="Team B score"
                value={scoreB}
                onChange={(e) => setScoreB(e.target.value)}
              />
            </div>
            <select value={winner} onChange={(e) => setWinner(e.target.value)}>
              <option value={teamAName || "Team A"}>{teamAName || "Team A"} won</option>
              <option value={teamBName || "Team B"}>{teamBName || "Team B"} won</option>
              <option value="Draw">Draw</option>
            </select>

            <p className="scorecard-stats-label">Per-player {statLabel.toLowerCase()}</p>
            {(match.joinedPlayers || []).map((uid) => (
              <div className="form-row stat-input-row" key={uid}>
                <span className="stat-input-name">
                  {match.joinedPlayerNames?.[uid] || "Player"}
                </span>
                <input
                  type="number"
                  min={0}
                  value={playerStats[uid] ?? 0}
                  onChange={(e) =>
                    setPlayerStats({ ...playerStats, [uid]: e.target.value })
                  }
                />
              </div>
            ))}

            <div className="form-row">
              <button className="join-btn" onClick={handleSaveScorecard} disabled={busy}>
                {busy ? "Saving..." : "Save Scorecard"}
              </button>
              <button className="link-btn" onClick={() => setShowScorecardForm(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {match.scorecard && !showScorecardForm && (
          <div className="scorecard-display">
            <div className="scorecard-summary">
              <div className="scorecard-team">
                <span className="scorecard-team-name">{match.scorecard.teamAName}</span>
                <span className="scorecard-team-score">{match.scorecard.scoreA}</span>
              </div>
              <span className="scorecard-vs">vs</span>
              <div className="scorecard-team">
                <span className="scorecard-team-name">{match.scorecard.teamBName}</span>
                <span className="scorecard-team-score">{match.scorecard.scoreB}</span>
              </div>
              <span className="scorecard-winner">
                🏆 {match.scorecard.winner === "Draw" ? "Match drawn" : `${match.scorecard.winner} won`}
              </span>
            </div>

            <div className="scorecard-players">
              <div className="scorecard-row scorecard-row--head">
                <span>Player</span>
                <span>{match.scorecard.statLabel || statLabel}</span>
              </div>
              {(match.joinedPlayers || []).map((uid) => (
                <div className="scorecard-row" key={uid}>
                  <span>{match.joinedPlayerNames?.[uid] || "Player"}</span>
                  <span>{match.scorecard.playerStats?.[uid] ?? 0}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MatchDetail;