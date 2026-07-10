import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  increment,
  deleteField,
  serverTimestamp,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  limit,
} from "firebase/firestore";
import { db, auth } from "../firebase/firebase";
import { checkAndDowngradeIfExpired } from "../utils/planExpiry";
import "../styles/matches.css";

const BACKEND_URL = "https://mini-project-backend-4kid.onrender.com";

const PLAN_MULTIPLIER = { Free: 1, Silver: 2, Gold: 5 };
const BASE_POINTS = 10;
const JOIN_LIMITS = { Free: 5, Silver: 10, Gold: Infinity };

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

const getCurrentMonthKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
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
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [reportingUid, setReportingUid] = useState(null);
  const [reportReason, setReportReason] = useState("");
  const [ratingTargetUid, setRatingTargetUid] = useState(null);

  // Team-match join flow (captain sends one request covering their whole team)
  const [myCaptainTeams, setMyCaptainTeams] = useState([]);
  const [showTeamJoinSelect, setShowTeamJoinSelect] = useState(false);
  const [selectedJoinTeamId, setSelectedJoinTeamId] = useState("");

  // In-app match chat
  const [chatMessages, setChatMessages] = useState([]);
  const [chatText, setChatText] = useState("");
  const [chatSending, setChatSending] = useState(false);

  const currentUid = auth.currentUser?.uid;

  // Live listener — the match page (players, requests, scoreboard) updates
  // for everyone in real time without needing a manual refresh.
  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(
      doc(db, "matches", id),
      (snap) => {
        if (snap.exists()) {
          setMatch({ id: snap.id, ...snap.data() });
        } else {
          setMatch(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Error listening to match:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [id]);

  useEffect(() => {
    const loadPlan = async () => {
      if (!currentUid) return;
      try {
        await checkAndDowngradeIfExpired(currentUid);
        const snap = await getDoc(doc(db, "users", currentUid));
        if (snap.exists()) {
          if (snap.data().plan) setCurrentUserPlan(snap.data().plan);
          if (Array.isArray(snap.data().blockedUsers)) setBlockedUsers(snap.data().blockedUsers);
        }
      } catch (e) {
        // fallback stays Free
      }
    };
    loadPlan();
  }, [currentUid]);

  // Teams the current user captains — used to offer "Join as my team".
  useEffect(() => {
    const loadCaptainTeams = async () => {
      if (!currentUid) return;
      try {
        const snap = await getDocs(
          query(collection(db, "teams"), where("createdBy", "==", currentUid))
        );
        setMyCaptainTeams(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error("Error loading captain teams:", e);
      }
    };
    loadCaptainTeams();
  }, [currentUid]);

  // Live match chat — only rendered/usable for joined players, but the
  // listener is safe to set up once currentUid exists (rules gate access).
  useEffect(() => {
    if (!currentUid) return;
    const q = query(collection(db, "matches", id, "messages"), orderBy("createdAt", "asc"), limit(100));
    const unsub = onSnapshot(
      q,
      (snap) => setChatMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => console.error("Error listening to chat:", err)
    );
    return () => unsub();
  }, [id, currentUid]);

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

  const finalizeJoinRequest = async (userName, userPlan, usage) => {
    const monthKey = getCurrentMonthKey();
    const joinsThisMonth = usage?.month === monthKey ? (usage.joinsThisMonth || 0) : 0;
    const organizesThisMonth = usage?.month === monthKey ? (usage.organizesThisMonth || 0) : 0;

    await updateDoc(doc(db, "matches", id), {
      [`pendingRequests.${currentUid}`]: {
        name: userName,
        role: selectedRole,
        plan: userPlan,
        requestedAt: serverTimestamp(),
      },
      [`requestHistory.${currentUid}`]: deleteField(),
    });

    await setDoc(doc(db, "users", currentUid), {
      usage: {
        month: monthKey,
        joinsThisMonth: joinsThisMonth + 1,
        organizesThisMonth,
      },
    }, { merge: true });
  };

  const handleRequestJoin = async () => {
    if (!currentUid) {
      navigate("/login");
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
      let usage = null;
      try {
        const userDoc = await getDoc(doc(db, "users", currentUid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.name) userName = data.name;
          if (data.plan) userPlan = data.plan;
          usage = data.usage || null;
        }
      } catch (e) {
        // fallback
      }

      const monthKey = getCurrentMonthKey();
      const joinsThisMonth = usage?.month === monthKey ? (usage.joinsThisMonth || 0) : 0;
      const joinLimit = JOIN_LIMITS[userPlan] ?? JOIN_LIMITS.Free;
      if (joinsThisMonth >= joinLimit) {
        setError(`Is mahine ka join limit (${joinLimit}) khatam ho gaya. Plan upgrade karo ya agle mahine try karo.`);
        setBusy(false);
        return;
      }

      if (match.costPerPlayer > 0) {
        // Paid match: charge before the join request is created.
        const res = await fetch(BACKEND_URL + "/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "match_join", matchId: id, amount: match.costPerPlayer }),
        });
        const data = await res.json();
        if (data.error) { setError(data.error); setBusy(false); return; }

        const options = {
          key: data.keyId,
          amount: data.amount,
          currency: data.currency,
          name: "Knowora",
          description: "Join fee — " + match.title,
          order_id: data.orderId,
          handler: async (response) => {
            try {
              const vRes = await fetch(BACKEND_URL + "/verify-payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  order_id: response.razorpay_order_id,
                  payment_id: response.razorpay_payment_id,
                  signature: response.razorpay_signature,
                }),
              });
              const vData = await vRes.json();
              if (vData.verified) {
                await finalizeJoinRequest(userName, userPlan, usage);
                setShowRoleSelect(false);
                setSelectedRole("");
              } else {
                setError("Payment verification failed. Request nahi bheji gayi.");
              }
            } catch (e) {
              console.error("Error finalizing paid join request:", e);
              setError("Kuch gadbad hui. Dobara try karo.");
            }
            setBusy(false);
          },
          modal: { ondismiss: () => setBusy(false) },
          prefill: { email: auth.currentUser.email },
          theme: { color: "#3b82f6" },
        };
        const rzp = new window.Razorpay(options);
        rzp.open();
        return;
      }

      // Free match: no payment needed
      await finalizeJoinRequest(userName, userPlan, usage);
      setShowRoleSelect(false);
      setSelectedRole("");
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
    } catch (err) {
      console.error("Error cancelling request:", err);
    }
    setBusy(false);
  };

  /* ─────────────── TEAM MATCH JOIN ─────────────── */
  // The captain sends ONE request tagged with their team's member list.
  // On approval, the organizer's write (which already has full rights)
  // adds every team member to the match at once — no rule changes needed.

  const finalizeTeamJoinRequest = async (team, userName, userPlan) => {
    const teamMembers = (team.members || []).map((uid) => ({
      uid,
      name: team.memberNames?.[uid] || "Player",
    }));

    await updateDoc(doc(db, "matches", id), {
      [`pendingRequests.${currentUid}`]: {
        name: userName,
        role: "Team Captain",
        plan: userPlan,
        isTeam: true,
        teamId: team.id,
        teamName: team.name,
        teamMembers,
        requestedAt: serverTimestamp(),
      },
      [`requestHistory.${currentUid}`]: deleteField(),
    });

    setShowTeamJoinSelect(false);
    setSelectedJoinTeamId("");
  };

  const handleRequestJoinAsTeam = async () => {
    if (!currentUid || !selectedJoinTeamId) {
      setError("Pehle team select karo.");
      return;
    }
    const team = myCaptainTeams.find((t) => t.id === selectedJoinTeamId);
    if (!team) return;

    const teamSize = team.members?.length || 0;
    const spotsAvailable = match.maxPlayers - (match.joinedPlayers?.length || 0);
    if (teamSize > spotsAvailable) {
      setError(`Is match mein sirf ${spotsAvailable} spots bache hain, aapki team mein ${teamSize} members hain.`);
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

      const totalCost = (match.costPerPlayer || 0) * teamSize;

      if (totalCost > 0) {
        const res = await fetch(BACKEND_URL + "/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "match_join", matchId: id, amount: totalCost }),
        });
        const data = await res.json();
        if (data.error) { setError(data.error); setBusy(false); return; }

        const options = {
          key: data.keyId,
          amount: data.amount,
          currency: data.currency,
          name: "Knowora",
          description: `Team join fee — ${team.name} (${teamSize} players) — ${match.title}`,
          order_id: data.orderId,
          handler: async (response) => {
            try {
              const vRes = await fetch(BACKEND_URL + "/verify-payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  order_id: response.razorpay_order_id,
                  payment_id: response.razorpay_payment_id,
                  signature: response.razorpay_signature,
                }),
              });
              const vData = await vRes.json();
              if (vData.verified) {
                await finalizeTeamJoinRequest(team, userName, userPlan);
              } else {
                setError("Payment verification failed. Team request nahi bheji gayi.");
              }
            } catch (e) {
              console.error("Error finalizing team join:", e);
              setError("Kuch gadbad hui. Dobara try karo.");
            }
            setBusy(false);
          },
          modal: { ondismiss: () => setBusy(false) },
          prefill: { email: auth.currentUser.email },
          theme: { color: "#3b82f6" },
        };
        const rzp = new window.Razorpay(options);
        rzp.open();
        return;
      }

      await finalizeTeamJoinRequest(team, userName, userPlan);
    } catch (err) {
      console.error("Error sending team join request:", err);
      setError("Team request nahi bheji ja saki. Dobara try karo.");
    }
    setBusy(false);
  };

  const handleApproveTeamRequest = async (uid) => {
    const request = match.pendingRequests?.[uid];
    if (!request || !request.isTeam) return;

    setBusy(true);
    setError("");
    try {
      const members = request.teamMembers || [];
      const newJoinedCount = (match.joinedPlayers?.length || 0) + members.length;

      const updatePayload = {
        joinedPlayers: arrayUnion(...members.map((m) => m.uid)),
        [`pendingRequests.${uid}`]: deleteField(),
        [`requestHistory.${uid}`]: deleteField(),
        status: newJoinedCount >= match.maxPlayers ? "full" : "open",
      };
      members.forEach((m) => {
        updatePayload[`joinedPlayerNames.${m.uid}`] = m.name;
        updatePayload[`joinedPlayerRoles.${m.uid}`] = `Team: ${request.teamName}`;
      });

      await updateDoc(doc(db, "matches", id), updatePayload);

      // Award points to every team member, based on each member's own plan.
      for (const m of members) {
        try {
          const memberSnap = await getDoc(doc(db, "users", m.uid));
          const memberPlan = memberSnap.exists() ? memberSnap.data().plan || "Free" : "Free";
          const multiplier = PLAN_MULTIPLIER[memberPlan] || 1;
          await updateDoc(doc(db, "users", m.uid), {
            points: increment(BASE_POINTS * multiplier),
          });
        } catch (e) {
          console.error("Error awarding points to team member:", m.uid, e);
        }
      }
    } catch (err) {
      console.error("Error approving team request:", err);
      setError("Team approve nahi ho paya. Dobara try karo.");
    }
    setBusy(false);
  };

  const handleApprove = async (uid) => {
    const request = match.pendingRequests?.[uid];
    if (!request) return;

    if (request.isTeam) {
      await handleApproveTeamRequest(uid);
      return;
    }

    setBusy(true);
    setError("");
    try {
      const newJoinedCount = (match.joinedPlayers?.length || 0) + 1;

      await updateDoc(doc(db, "matches", id), {
        joinedPlayers: arrayUnion(uid),
        [`joinedPlayerNames.${uid}`]: request.name,
        [`joinedPlayerRoles.${uid}`]: request.role,
        [`pendingRequests.${uid}`]: deleteField(),
        [`requestHistory.${uid}`]: deleteField(),
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
    } catch (err) {
      console.error("Error approving request:", err);
      setError("Approve nahi ho paya. Dobara try karo.");
    }
    setBusy(false);
  };

  const handleReject = async (uid) => {
    const request = match.pendingRequests?.[uid];
    setBusy(true);
    setError("");
    try {
      await updateDoc(doc(db, "matches", id), {
        [`pendingRequests.${uid}`]: deleteField(),
        [`requestHistory.${uid}`]: {
          status: "rejected",
          role: request?.role || "",
          respondedAt: serverTimestamp(),
        },
      });
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
    } catch (err) {
      console.error("Error leaving match:", err);
      setError("TRY AGAIN.");
    }
    setBusy(false);
  };

  /* ─────────────── SAFETY: REPORT & BLOCK ─────────────── */

  const handleBlockPlayer = async (uid, name) => {
    if (!currentUid || uid === currentUid) return;
    if (!window.confirm(`Block ${name}? You won't see matches they host anymore, and their join requests to your matches will be hidden.`)) {
      return;
    }
    try {
      await updateDoc(doc(db, "users", currentUid), {
        blockedUsers: arrayUnion(uid),
      });
      setBlockedUsers((prev) => [...prev, uid]);
    } catch (err) {
      console.error("Error blocking player:", err);
    }
  };

  const handleSubmitReport = async (uid, name) => {
    if (!currentUid || !reportReason.trim()) {
      setError("Report ki wajah likho.");
      return;
    }
    setBusy(true);
    try {
      await addDoc(collection(db, "reports"), {
        reportedUid: uid,
        reportedName: name,
        reportedBy: currentUid,
        reporterName: auth.currentUser?.displayName || "Anonymous",
        matchId: id,
        matchTitle: match.title,
        reason: reportReason.trim(),
        createdAt: serverTimestamp(),
        status: "open",
      });
      setReportingUid(null);
      setReportReason("");
      alert("Report submitted. Our team will review it.");
    } catch (err) {
      console.error("Error submitting report:", err);
      setError("Report submit nahi hua. Dobara try karo.");
    }
    setBusy(false);
  };

  /* ─────────────── SAFETY: NO-SHOW TRACKING ─────────────── */

  const handleMarkNoShow = async (uid) => {
    if (!isCreatorCheck() || !match) return;
    if (!window.confirm("Mark this player as a no-show for this match?")) return;

    setBusy(true);
    try {
      await updateDoc(doc(db, "matches", id), {
        noShows: arrayUnion(uid),
      });
      await updateDoc(doc(db, "users", uid), {
        noShowCount: increment(1),
      });
    } catch (err) {
      console.error("Error marking no-show:", err);
      setError("No-show mark nahi hua. Dobara try karo.");
    }
    setBusy(false);
  };

  function isCreatorCheck() {
    return currentUid === match?.createdBy;
  }

  /* ─────────────── MATCH CHAT ─────────────── */

  const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if (!currentUid || !chatText.trim()) return;

    setChatSending(true);
    try {
      let userName = auth.currentUser.displayName || "Anonymous";
      try {
        const userDoc = await getDoc(doc(db, "users", currentUid));
        if (userDoc.exists() && userDoc.data().name) userName = userDoc.data().name;
      } catch (e) {
        // fallback
      }

      await addDoc(collection(db, "matches", id, "messages"), {
        text: chatText.trim().slice(0, 500),
        senderUid: currentUid,
        senderName: userName,
        createdAt: serverTimestamp(),
      });
      setChatText("");
    } catch (err) {
      console.error("Error sending chat message:", err);
      setError("Message bhej nahi paya. Dobara try karo.");
    }
    setChatSending(false);
  };

  /* ─────────────── POST-MATCH RATINGS ─────────────── */

  const handleSubmitRating = async (targetUid, stars) => {
    if (!currentUid || targetUid === currentUid || !match) return;
    const key = `${currentUid}_${targetUid}`;
    if (match.ratings?.[key]) return; // already rated this player for this match

    setBusy(true);
    setError("");
    try {
      await updateDoc(doc(db, "matches", id), {
        [`ratings.${key}`]: stars,
      });
      await updateDoc(doc(db, "users", targetUid), {
        ratingSum: increment(stars),
        ratingCount: increment(1),
      });
      setRatingTargetUid(null);
    } catch (err) {
      console.error("Error submitting rating:", err);
      setError("Rating submit nahi hui. Dobara try karo.");
    }
    setBusy(false);
  };

  /* ─────────────── SCORECARD (Gold feature, live) ─────────────── */

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
  const wasRejected = match.requestHistory?.[currentUid]?.status === "rejected";
  const isGoldOrganizer = isCreator && currentUserPlan === "Gold";
  const totalCost = (match.costPerPlayer || 0) * (match.joinedPlayers?.length || 0);
  const pendingList = Object.entries(match.pendingRequests || {}).filter(
    ([uid]) => !blockedUsers.includes(uid)
  );
  const roleOptions = ROLES_BY_SPORT[match.sport] || ROLES_BY_SPORT.Other;
  const statLabel = STAT_LABEL_BY_SPORT[match.sport] || "Score";
  const spotsLeft = match.maxPlayers - (match.joinedPlayers?.length || 0);

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
              {!isFull && spotsLeft > 0 && ` — need ${spotsLeft} more`}
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

        {wasRejected && !hasJoined && !hasPendingRequest && !showRoleSelect && (
          <div className="form-error">
            Your last join request ({match.requestHistory[currentUid].role}) was rejected by the organizer. You can send a new request below.
          </div>
        )}

        <div className="match-actions">
          {!hasJoined && !hasPendingRequest && !isFull && !showRoleSelect && !showTeamJoinSelect && (
            <button className="join-btn" onClick={() => setShowRoleSelect(true)}>
              Request to Join
            </button>
          )}

          {!hasJoined && !hasPendingRequest && !isFull && !showRoleSelect && !showTeamJoinSelect && myCaptainTeams.length > 0 && (
            <button className="leave-btn" onClick={() => setShowTeamJoinSelect(true)}>
              👥 Join as my team
            </button>
          )}

          {showTeamJoinSelect && (
            <div className="role-select-box">
              <select value={selectedJoinTeamId} onChange={(e) => setSelectedJoinTeamId(e.target.value)}>
                <option value="">Select your team</option>
                {myCaptainTeams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.members?.length || 0} members)</option>
                ))}
              </select>
              <button
                className="join-btn"
                onClick={handleRequestJoinAsTeam}
                disabled={busy || !selectedJoinTeamId}
              >
                {busy ? "Processing..." : "Send Team Request"}
              </button>
              <button className="link-btn" onClick={() => setShowTeamJoinSelect(false)}>
                Cancel
              </button>
            </div>
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
                {busy ? "Processing..." : match.costPerPlayer > 0 ? `Pay ₹${match.costPerPlayer} & Request` : "Send Request"}
              </button>
              <button className="link-btn" onClick={() => setShowRoleSelect(false)}>
                Cancel
              </button>
            </div>
          )}

          {hasPendingRequest && (
            <>
              <span className="status-tag status-pending">
                {match.pendingRequests[currentUid].isTeam
                  ? `Team request pending — ${match.pendingRequests[currentUid].teamName} (${match.pendingRequests[currentUid].teamMembers?.length || 0} members)`
                  : `Request pending — ${match.pendingRequests[currentUid].role}`}
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
                <div className="request-name">
                  {req.isTeam ? `${req.teamName} — ${req.name} (Captain)` : req.name}
                </div>
                {req.isTeam ? (
                  <span className="role-badge">👥 {req.teamMembers?.length || 0} team members</span>
                ) : (
                  <span className="role-badge">{req.role}</span>
                )}
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
        {match.joinedPlayers?.map((uid) => {
          const name = match.joinedPlayerNames?.[uid] || "Player";
          const isSelf = uid === currentUid;
          const isNoShow = match.noShows?.includes(uid);
          const matchHasPassed = match.date && (match.date.toDate ? match.date.toDate() : new Date(match.date)) < new Date();
          return (
            <div key={uid} className="player-chip-wrap">
              <div className="player-chip">
                <div className="player-avatar">
                  {name.charAt(0).toUpperCase()}
                </div>
                <Link to={`/players/${uid}`} className="player-name-link">{name}</Link>
                {match.joinedPlayerRoles?.[uid] && (
                  <span className="role-badge">{match.joinedPlayerRoles[uid]}</span>
                )}
                {uid === match.createdBy && (
                  <span className="organizer-badge">Organizer</span>
                )}
                {isNoShow && (
                  <span className="noshow-badge">No-show</span>
                )}
              </div>

              {!isSelf && currentUid && (
                <div className="player-safety-actions">
                  <button className="safety-link-btn" onClick={() => handleBlockPlayer(uid, name)}>
                    Block
                  </button>
                  <button
                    className="safety-link-btn"
                    onClick={() => setReportingUid(reportingUid === uid ? null : uid)}
                  >
                    Report
                  </button>
                  {isCreator && matchHasPassed && !isNoShow && uid !== match.createdBy && (
                    <button className="safety-link-btn safety-link-btn--warn" onClick={() => handleMarkNoShow(uid)}>
                      Mark no-show
                    </button>
                  )}
                </div>
              )}

              {!isSelf && currentUid && matchHasPassed && (
                match.ratings?.[`${currentUid}_${uid}`] ? (
                  <span className="rated-tag">✓ Rated {match.ratings[`${currentUid}_${uid}`]}★</span>
                ) : ratingTargetUid === uid ? (
                  <div className="rate-box">
                    <span className="rate-box-label">Rate {name}:</span>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        className="rate-star-btn"
                        onClick={() => handleSubmitRating(uid, n)}
                        disabled={busy}
                      >
                        ⭐
                      </button>
                    ))}
                    <button className="link-btn" onClick={() => setRatingTargetUid(null)}>Cancel</button>
                  </div>
                ) : (
                  <button className="safety-link-btn" onClick={() => setRatingTargetUid(uid)}>
                    Rate this player
                  </button>
                )
              )}

              {reportingUid === uid && (
                <div className="report-box">
                  <input
                    type="text"
                    placeholder="Why are you reporting this player?"
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    maxLength={200}
                  />
                  <button className="join-btn" onClick={() => handleSubmitReport(uid, name)} disabled={busy}>
                    {busy ? "Sending..." : "Submit"}
                  </button>
                  <button className="link-btn" onClick={() => { setReportingUid(null); setReportReason(""); }}>
                    Cancel
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MATCH CHAT (joined players only) */}
      {hasJoined && (
        <div className="scorecard-section">
          <div className="scorecard-header">
            <h2>Match Chat</h2>
          </div>
          <div className="chat-box">
            <div className="chat-messages">
              {chatMessages.length === 0 ? (
                <p className="empty-text-small">No messages yet. Say hi to your teammates!</p>
              ) : (
                chatMessages.map((m) => (
                  <div
                    key={m.id}
                    className={"chat-message " + (m.senderUid === currentUid ? "chat-message--me" : "")}
                  >
                    <span className="chat-sender">{m.senderUid === currentUid ? "You" : m.senderName}</span>
                    <span className="chat-text">{m.text}</span>
                  </div>
                ))
              )}
            </div>
            <form className="chat-input-row" onSubmit={handleSendChatMessage}>
              <input
                type="text"
                placeholder="Type a message..."
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                maxLength={500}
              />
              <button type="submit" className="join-btn" disabled={chatSending || !chatText.trim()}>
                Send
              </button>
            </form>
          </div>
        </div>
      )}

      {/* LIVE SCOREBOARD (Gold feature) */}
      <div className="scorecard-section">
        <div className="scorecard-header">
          <h2>Live Scoreboard</h2>
          {isGoldOrganizer && !showScorecardForm && (
            <button className="link-btn" onClick={openScorecardForm}>
              {match.scorecard ? "Update Score" : "+ Add Scorecard"}
            </button>
          )}
        </div>

        {!match.scorecard && !showScorecardForm && (
          <p className="empty-text-small">
            {isCreator
              ? isGoldOrganizer
                ? "No scorecard yet. Add one and it updates live for everyone watching."
                : "Scorecards are a Gold plan feature. Upgrade to add a live scorecard for this match."
              : "Organizer hasn't started a scoreboard for this match yet."}
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
                {busy ? "Saving..." : "Save & Update Live"}
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