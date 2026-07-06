import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useEffect, useState } from "react";
import "../styles/dashboard.css";
import "../styles/matches.css";

function PlayerProfile() {
  const { uid } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [matchesPlayed, setMatchesPlayed] = useState(0);
  const [matchesOrganized, setMatchesOrganized] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, "users", uid));
        if (snap.exists()) setProfile(snap.data());
        else setProfile(null);

        const joinedSnap = await getDocs(
          query(collection(db, "matches"), where("joinedPlayers", "array-contains", uid))
        );
        setMatchesPlayed(joinedSnap.size);

        const organizedSnap = await getDocs(
          query(collection(db, "matches"), where("createdBy", "==", uid))
        );
        setMatchesOrganized(organizedSnap.size);
      } catch (err) {
        console.error("Error loading player profile:", err);
      }
      setLoading(false);
    };
    load();
  }, [uid]);

  const planIcon = (plan) => (plan === "Gold" ? "🥇" : plan === "Silver" ? "🥈" : "🆓");

  if (loading) return <div className="loading-text">Loading profile...</div>;

  if (!profile) {
    return (
      <div className="empty-text">
        This player could not be found.{" "}
        <button className="link-btn" onClick={() => navigate("/matches")}>Go back</button>
      </div>
    );
  }

  const avgRating = profile.ratingCount > 0 ? (profile.ratingSum / profile.ratingCount).toFixed(1) : null;

  return (
    <div className="matches-page">
      <button className="back-btn" onClick={() => navigate(-1)}>&larr; Back</button>

      <div className="pf-grid">
        <div className="pf-photo-card">
          {profile.photoURL ? (
            <div className="pf-avatar-wrap">
              <img className="pf-avatar-img" src={profile.photoURL} alt={profile.name || "Player"} />
            </div>
          ) : (
            <div className="pf-avatar-placeholder">
              {(profile.name || "U").charAt(0).toUpperCase()}
            </div>
          )}
          <div className="pf-avatar-name">{profile.name || "Player"}</div>
          <div className="pf-avatar-email">{planIcon(profile.plan)} {profile.plan || "Free"} plan</div>

          <div className="pf-info-list">
            <div className="pf-info-item">
              <span className="pf-info-label">Points</span>
              <span className="pf-info-val">{profile.points || 0}</span>
            </div>
            <div className="pf-info-item">
              <span className="pf-info-label">Matches played</span>
              <span className="pf-info-val">{matchesPlayed}</span>
            </div>
            <div className="pf-info-item">
              <span className="pf-info-label">Matches organized</span>
              <span className="pf-info-val">{matchesOrganized}</span>
            </div>
            <div className="pf-info-item">
              <span className="pf-info-label">Average rating</span>
              <span className="pf-info-val">
                {avgRating ? `⭐ ${avgRating} / 5 (${profile.ratingCount})` : "Not rated yet"}
              </span>
            </div>
            <div className="pf-info-item">
              <span className="pf-info-label">No-shows</span>
              <span className={"pf-info-val " + (profile.noShowCount > 0 ? "pf-val--amber" : "pf-val--green")}>
                {profile.noShowCount || 0}
              </span>
            </div>
          </div>
        </div>

        <div className="pf-form-card">
          <div className="pf-form-header">
            <div className="pf-form-title">About {profile.name || "this player"}</div>
          </div>
          <p style={{ fontSize: "14px", color: "#6b7280", lineHeight: 1.65 }}>
            {profile.bio || "This player hasn't added a bio yet."}
          </p>
        </div>
      </div>
    </div>
  );
}

export default PlayerProfile;