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
  setDoc,
  updateDoc,
  increment,
} from "firebase/firestore";
import { db, auth } from "../firebase/firebase";
import { checkAndDowngradeIfExpired } from "../utils/planExpiry";
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
const ORGANIZE_LIMITS = { Free: 1, Silver: 2, Gold: 10 };

// Verified venues — picking from this list avoids typos and keeps
// listings trustworthy. "Other" lets a host add a venue not yet verified
// (it won't have coordinates, so it's excluded from "near me" search).
const VERIFIED_VENUES = [
  { name: "Church Street Ground, MG Road", lat: 12.9750, lng: 77.6050 },
  { name: "Turf Arena, Koramangala", lat: 12.9352, lng: 77.6245 },
  { name: "Smash Court, Indiranagar", lat: 12.9719, lng: 77.6412 },
  { name: "City Sports Complex, HSR Layout", lat: 12.9121, lng: 77.6446 },
  { name: "Green Court Club, Whitefield", lat: 12.9698, lng: 77.7500 },
  { name: "Lakeside Sports Arena, Hebbal", lat: 13.0358, lng: 77.5970 },
  { name: "Riverside Ground, Jayanagar", lat: 12.9250, lng: 77.5938 },
  { name: "Municipal Stadium, Yelahanka", lat: 13.1005, lng: 77.5963 },
  { name: "Other (not listed)", lat: null, lng: null },
];

// Great-circle distance between two lat/lng points, in kilometers.
const distanceKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const getCurrentMonthKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

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
  const [needPlayersOnly, setNeedPlayersOnly] = useState(false);
  const [costFilter, setCostFilter] = useState("All");
  const [sortBy, setSortBy] = useState("soonest");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [nearMeOnly, setNearMeOnly] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [locatingUser, setLocatingUser] = useState(false);

  // Create form state
  const [title, setTitle] = useState("");
  const [sport, setSport] = useState("Cricket");
  const [venue, setVenue] = useState(VERIFIED_VENUES[0].name);
  const [customVenue, setCustomVenue] = useState("");
  const [matchDate, setMatchDate] = useState("");
  const [matchTime, setMatchTime] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [costPerPlayer, setCostPerPlayer] = useState(0);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const [blockedUsers, setBlockedUsers] = useState([]);

  useEffect(() => {
    fetchMatches();
    loadBlockedUsers();
    if (auth.currentUser) checkAndDowngradeIfExpired(auth.currentUser.uid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadBlockedUsers = async () => {
    if (!auth.currentUser) return;
    try {
      const snap = await getDoc(doc(db, "users", auth.currentUser.uid));
      if (snap.exists() && Array.isArray(snap.data().blockedUsers)) {
        setBlockedUsers(snap.data().blockedUsers);
      }
    } catch (e) {
      console.error("Error loading blocked users:", e);
    }
  };

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "matches"), orderBy("date", "asc"));
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
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

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Location detect nahi ho sakti is browser mein.");
      return;
    }
    setLocationError("");
    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setNearMeOnly(true);
        setLocatingUser(false);
      },
      (err) => {
        console.error("Geolocation error:", err);
        setLocationError("Location access allow nahi hui. Browser settings check karo.");
        setLocatingUser(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
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
    if (title.trim().length < 5) {
      setError("Match ka title thoda detail mein likho.");
      return;
    }
    if (venue === "Other (not listed)" && !customVenue.trim()) {
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
      let usage = null;
      try {
        const userDoc = await getDoc(doc(db, "users", uid));
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
      const organizesThisMonth = usage?.month === monthKey ? (usage.organizesThisMonth || 0) : 0;
      const joinsThisMonth = usage?.month === monthKey ? (usage.joinsThisMonth || 0) : 0;
      const organizeLimit = ORGANIZE_LIMITS[userPlan] ?? ORGANIZE_LIMITS.Free;

      if (organizesThisMonth >= organizeLimit) {
        setError(`Is mahine ka match-organize limit (${organizeLimit}) khatam ho gaya. Plan upgrade karo ya agle mahine try karo.`);
        setPosting(false);
        return;
      }

      const selectedVenue = VERIFIED_VENUES.find((v) => v.name === venue);

      await addDoc(collection(db, "matches"), {
        title: title.trim(),
        sport,
        venue: venue === "Other (not listed)" ? customVenue.trim() : venue,
        venueVerified: venue !== "Other (not listed)",
        venueLat: selectedVenue?.lat ?? null,
        venueLng: selectedVenue?.lng ?? null,
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

      // Update monthly usage
      try {
        await setDoc(doc(db, "users", uid), {
          usage: {
            month: monthKey,
            organizesThisMonth: organizesThisMonth + 1,
            joinsThisMonth,
          },
        }, { merge: true });
      } catch (e) {
        console.error("Error updating usage:", e);
      }

      setTitle("");
      setVenue(VERIFIED_VENUES[0].name);
      setCustomVenue("");
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

  const filteredMatches = matches
    .filter((m) => {
      const matchesSport = activeSport === "All" || m.sport === activeSport;
      const matchesSearch =
        m.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.venue?.toLowerCase().includes(searchTerm.toLowerCase());
      const spotsLeft = m.maxPlayers - (m.joinedPlayers?.length || 0);
      const matchesNeedPlayers = !needPlayersOnly || spotsLeft > 0;
      const hostNotBlocked = !blockedUsers.includes(m.createdBy);
      const matchesNearMe =
        !nearMeOnly ||
        !userLocation ||
        (m.venueLat != null &&
          m.venueLng != null &&
          distanceKm(userLocation.lat, userLocation.lng, m.venueLat, m.venueLng) <= 5);
      const matchesCost =
        costFilter === "All" ||
        (costFilter === "Free" ? !m.costPerPlayer || m.costPerPlayer === 0 : m.costPerPlayer > 0);
      return matchesSport && matchesSearch && matchesNeedPlayers && hostNotBlocked && matchesNearMe && matchesCost;
    })
    .sort((a, b) => {
      if (sortBy === "nearest" && userLocation) {
        const da = a.venueLat != null ? distanceKm(userLocation.lat, userLocation.lng, a.venueLat, a.venueLng) : Infinity;
        const db_ = b.venueLat != null ? distanceKm(userLocation.lat, userLocation.lng, b.venueLat, b.venueLng) : Infinity;
        return da - db_;
      }
      if (sortBy === "mostSpots") {
        const spotsA = a.maxPlayers - (a.joinedPlayers?.length || 0);
        const spotsB = b.maxPlayers - (b.joinedPlayers?.length || 0);
        return spotsB - spotsA;
      }
      // "soonest" — already sorted by date asc from the Firestore query,
      // but re-sort defensively in case filters reorder anything.
      const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
      const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
      return dateA - dateB;
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
      <button className="back-btn" onClick={() => navigate(-1)}>&larr; Back</button>
      <div className="matches-header">
        <h1>Knowora Matches</h1>
        <button className="create-btn" onClick={openCreateForm}>
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
            <select value={venue} onChange={(e) => setVenue(e.target.value)}>
              {VERIFIED_VENUES.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name === "Other (not listed)" ? v.name : "✅ " + v.name}
                </option>
              ))}
            </select>
          </div>
          {venue === "Other (not listed)" && (
            <input
              type="text"
              placeholder="Type the venue name (not yet verified)"
              value={customVenue}
              onChange={(e) => setCustomVenue(e.target.value)}
            />
          )}
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

      <div className="location-bar">
        <button className="location-btn" onClick={handleUseMyLocation} disabled={locatingUser}>
          📍 {locatingUser ? "Locating..." : userLocation ? "Location set" : "Use my location"}
        </button>
        {userLocation && (
          <button
            className={`sport-chip ${nearMeOnly ? "active" : ""}`}
            onClick={() => setNearMeOnly(!nearMeOnly)}
          >
            Within 5 km
          </button>
        )}
        {locationError && <span className="location-error">{locationError}</span>}
      </div>

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
          <button
            className={`sport-chip ${needPlayersOnly ? "active" : ""}`}
            onClick={() => setNeedPlayersOnly(!needPlayersOnly)}
          >
            🙋 Need Players
          </button>
          <button
            className={`sport-chip ${costFilter === "Free" ? "active" : ""}`}
            onClick={() => setCostFilter(costFilter === "Free" ? "All" : "Free")}
          >
            🆓 Free only
          </button>
          <button
            className={`sport-chip ${costFilter === "Paid" ? "active" : ""}`}
            onClick={() => setCostFilter(costFilter === "Paid" ? "All" : "Paid")}
          >
            💰 Paid only
          </button>
          <select
            className="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="soonest">Sort: Soonest</option>
            <option value="mostSpots">Sort: Most spots open</option>
            {userLocation && <option value="nearest">Sort: Nearest</option>}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading-text">Loading matches...</div>
      ) : filteredMatches.length === 0 ? (
        <div className="empty-text">
          <p>Koi match nahi mila.</p>
          <button className="link-btn" onClick={openCreateForm}>
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
                    <span>📍 {m.venue} {m.venueVerified && <span title="Verified venue">✅</span>}</span>
                    <span>🕒 {formatDate(m.date)}</span>
                    {userLocation && m.venueLat != null && (
                      <span className="distance-tag">
                        {distanceKm(userLocation.lat, userLocation.lng, m.venueLat, m.venueLng).toFixed(1)} km away
                      </span>
                    )}
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
                    {spotsLeft <= 0 ? "Full" : `Need ${spotsLeft} more`}
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