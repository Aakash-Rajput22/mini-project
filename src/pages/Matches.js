import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  doc,
  getDoc,
  updateDoc,
  increment,
} from "firebase/firestore";
import { db, auth } from "../firebase/firebase";
import "../styles/matches.css";

const SPORTS = [
  "All",
  "Cricket",
  "Football",
  "Badminton",
  "Basketball",
  "Volleyball",
  "Tennis",
  "Other",
];

const PLAN_MULTIPLIER = { Free: 1, Silver: 2, Gold: 5 };
const BASE_POINTS = 10;

function Matches() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialSport = new URLSearchParams(location.search).get("sport");

  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSport, setActiveSport] = useState(
    initialSport && SPORTS.includes(initialSport) ? initialSport : "All"
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Create form state
  const [title, setTitle] = useState("");
  const [sport, setSport] = useState("Cricket");
  const [venue, setVenue] = useState("");
  const [matchDate, setMatchDate] = useState("");
  const [matchTime, setMatchTime] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [costPerPlayer, setCostPerPlayer] = useState(0);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchMatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "matches"), orderBy("date", "asc"));
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      // Only show matches that haven't passed yet, most recent created first among past filtered out
      const now = new Date();
      const upcoming = list.filter((m) => {
        const d = m.date?.toDate ? m.date.toDate() : new Date(m.date);
        return d >= now || m.status === "completed";
      });
      setMatches(upcoming);
    } catch (err) {
      console.error("Error fetching matches:", err);
    }
    setLoading(false);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!auth.currentUser) {
      setError("Match banane ke liye login karo.");
      return;
    }
    if (title.trim().length < 5) {
      setError("Match ka title thoda detail mein likho.");
      return;
    }
    if (!venue.trim()) {
      setError("Ground/venue ka naam daalo.");
      return;
    }
    if (!matchDate || !matchTime) {
      setError("Date aur time dono select karo.");
      return;
    }
    const dateTimeObj = new Date(`${matchDate}T${matchTime}`);
    if (dateTimeObj <= new Date()) {
      setError("Match ka time future mein hona chahiye.");
      return;
    }
    if (maxPlayers < 2) {
      setError("Kam se kam 2 players chahiye.");
      return;
    }

    setPosting(true);
    try {
      const uid = auth.currentUser.uid;
      let userName = auth.currentUser.displayName || "Anonymous";
      let userPlan = "Free";
      try {
        const userDoc = await getDoc(doc(db, "users", uid));
        if (userDoc.exists()) {
          if (userDoc.data().name) userName = userDoc.data().name;
          if (userDoc.data().plan) userPlan = userDoc.data().plan;
        }
      } catch (e) {
        // fallback
      }

      await addDoc(collection(db, "matches"), {
        title: title.trim(),
        sport,
        venue: venue.trim(),
        date: Timestamp.fromDate(dateTimeObj),
        maxPlayers: Number(maxPlayers),
        joinedPlayers: [uid],
        joinedPlayerNames: { [uid]: userName },
        costPerPlayer: Number(costPerPlayer) || 0,
        createdBy: uid,
        createdByName: userName,
        status: "open",
        createdAt: serverTimestamp(),
      });

      // Award points for hosting a match, scaled by plan
      try {
        const multiplier = PLAN_MULTIPLIER[userPlan] || 1;
        await updateDoc(doc(db, "users", uid), {
          points: increment(BASE_POINTS * multiplier),
        });
      } catch (e) {
        console.error("Error awarding points:", e);
      }

      setTitle("");
      setVenue("");
      setMatchDate("");
      setMatchTime("");
      setMaxPlayers(10);
      setCostPerPlayer(0);
      setSport("Cricket");
      setShowCreateForm(false);
      fetchMatches();
    } catch (err) {
      console.error("Error creating match:", err);
      setError("Match create nahi ho paya. Dobara try karo.");
    }
    setPosting(false);
  };

  const filteredMatches = matches.filter((m) => {
    const matchesSport = activeSport === "All" || m.sport === activeSport;
    const matchesSearch =
      m.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.venue?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSport && matchesSearch;
  });

  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
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
      <div className="matches-header">
        <h1>Knowora Matches</h1>
        <button
          className="create-btn"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? "Cancel" : "+ Create Match"}
        </button>
      </div>

      {showCreateForm && (
        <form className="create-form" onSubmit={handleCreateSubmit}>
          {error && <div className="form-error">{error}</div>}
          <input
            type="text"
            placeholder="Match ka title (e.g. Sunday Morning Cricket)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
          />
          <div className="form-row">
            <select value={sport} onChange={(e) => setSport(e.target.value)}>
              {SPORTS.filter((s) => s !== "All").map((s) => (
                <option key={s} value={s}>
                  {sportIcon(s)} {s}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Ground / Venue"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
            />
          </div>
          <div className="form-row">
            <input
              type="date"
              value={matchDate}
              onChange={(e) => setMatchDate(e.target.value)}
            />
            <input
              type="time"
              value={matchTime}
              onChange={(e) => setMatchTime(e.target.value)}
            />
          </div>
          <div className="form-row">
            <label className="form-label">
              Max players
              <input
                type="number"
                min={2}
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(e.target.value)}
              />
            </label>
            <label className="form-label">
              Cost per player (₹)
              <input
                type="number"
                min={0}
                value={costPerPlayer}
                onChange={(e) => setCostPerPlayer(e.target.value)}
              />
            </label>
          </div>
          <button type="submit" disabled={posting}>
            {posting ? "Creating..." : "Create Match"}
          </button>
        </form>
      )}

      <div className="matches-toolbar">
        <input
          type="text"
          className="search-box"
          placeholder="Search matches by title or venue..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="sport-filters">
          {SPORTS.map((s) => (
            <button
              key={s}
              className={`sport-chip ${activeSport === s ? "active" : ""}`}
              onClick={() => setActiveSport(s)}
            >
              {s !== "All" && sportIcon(s)} {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loading-text">Loading matches...</div>
      ) : filteredMatches.length === 0 ? (
        <div className="empty-text">
          <p>Koi match nahi mila.</p>
          <button
            className="link-btn"
            onClick={() => setShowCreateForm(true)}
          >
            Pehla match tum create karo →
          </button>
        </div>
      ) : (
        <div className="matches-list">
          {filteredMatches.map((m) => {
            const spotsLeft = m.maxPlayers - (m.joinedPlayers?.length || 0);
            return (
              <div
                key={m.id}
                className="match-card"
                onClick={() => navigate(`/matches/${m.id}`)}
              >
                <div className="match-card-main">
                  <h3>
                    {sportIcon(m.sport)} {m.title}
                  </h3>
                  <div className="match-meta">
                    <span className="sport-tag">{m.sport}</span>
                    <span>📍 {m.venue}</span>
                    <span>🕒 {formatDate(m.date)}</span>
                  </div>
                  <div className="match-meta">
                    <span>Organized by {m.createdByName}</span>
                    {m.costPerPlayer > 0 && (
                      <span>₹{m.costPerPlayer} / player</span>
                    )}
                  </div>
                </div>
                <div className="match-stats">
                  <div className="stat">
                    <strong>
                      {m.joinedPlayers?.length || 0}/{m.maxPlayers}
                    </strong>
                    <span>Players</span>
                  </div>
                  <span
                    className={`status-tag ${
                      spotsLeft <= 0 ? "status-full" : "status-open"
                    }`}
                  >
                    {spotsLeft <= 0 ? "Full" : `${spotsLeft} spots left`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Matches;