import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut, deleteUser } from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayRemove,
  deleteDoc,
  increment,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { auth, db } from "../firebase/firebase";
import { useToast } from "../components/Toast";
import { useConfirm } from "../components/ConfirmDialog";
import "../styles/dashboard.css";
import "../styles/settings.css";

const BACKEND_URL = "https://mini-project-backend-4kid.onrender.com";
const REFERRAL_BONUS_POINTS = 50;
const REFERRAL_BONUS_WALLET = 20;
const WALLET_TOPUP_AMOUNTS = [100, 200, 500];

// Short, shareable code — doesn't need to be cryptographically strong,
// just unique enough for a friend-referral flow.
const generateReferralCode = () =>
  Math.random().toString(36).slice(2, 8).toUpperCase();

const DEFAULT_SETTINGS = {
  notifyReminders: true,
  notifyNewMatches: true,
  profilePublic: true,
  darkMode: false,
};

function Settings() {
  const navigate = useNavigate();
  const toast = useToast();
  const confirmDialog = useConfirm();
  const [currentUser, setCurrentUser] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [blockedNames, setBlockedNames] = useState({});
  const [followingUsers, setFollowingUsers] = useState([]);
  const [followingNames, setFollowingNames] = useState({});
  const [unfollowingUid, setUnfollowingUid] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [unblocking, setUnblocking] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Wallet
  const [walletBalance, setWalletBalance] = useState(0);
  const [addingMoney, setAddingMoney] = useState(false);
  const [customAmount, setCustomAmount] = useState("");

  // Referrals
  const [referralCode, setReferralCode] = useState("");
  const [referralCount, setReferralCount] = useState(0);
  const [referredBy, setReferredBy] = useState(null);
  const [redeemInput, setRedeemInput] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [redeemMsg, setRedeemMsg] = useState("");
  const [referralCopied, setReferralCopied] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/login");
        return;
      }
      setCurrentUser(user);
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          const merged = { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
          setSettings(merged);
          applyTheme(merged.darkMode);

          const blocked = Array.isArray(data.blockedUsers) ? data.blockedUsers : [];
          setBlockedUsers(blocked);

          setWalletBalance(data.walletBalance || 0);
          setReferralCount(data.referralCount || 0);
          setReferredBy(data.referredBy || null);

          if (data.referralCode) {
            setReferralCode(data.referralCode);
          } else {
            const newCode = generateReferralCode();
            try {
              await setDoc(doc(db, "users", user.uid), { referralCode: newCode }, { merge: true });
              setReferralCode(newCode);
            } catch (e) {
              console.error("Error creating referral code:", e);
            }
          }

          const names = {};
          await Promise.all(
            blocked.map(async (uid) => {
              try {
                const bSnap = await getDoc(doc(db, "users", uid));
                names[uid] = bSnap.exists() ? bSnap.data().name || "Player" : "Player";
              } catch (e) {
                names[uid] = "Player";
              }
            })
          );
          setBlockedNames(names);

          const following = Array.isArray(data.following) ? data.following : [];
          setFollowingUsers(following);
          const fNames = {};
          await Promise.all(
            following.map(async (uid) => {
              try {
                const fSnap = await getDoc(doc(db, "users", uid));
                fNames[uid] = fSnap.exists() ? fSnap.data().name || "Player" : "Player";
              } catch (e) {
                fNames[uid] = "Player";
              }
            })
          );
          setFollowingNames(fNames);
        } else {
          applyTheme(false);
        }
      } catch (e) {
        console.error("Error loading settings:", e);
      }
      setLoading(false);
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Toggles the "kn-dark" class on <body> and remembers the choice locally
  // so the theme survives a refresh before Firestore has even responded.
  const applyTheme = (isDark) => {
    document.body.classList.toggle("kn-dark", !!isDark);
    localStorage.setItem("knowora-dark-mode", isDark ? "1" : "0");
  };

  const updateSetting = async (key, value) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    if (key === "darkMode") applyTheme(value);

    if (!currentUser) return;
    setSaving(key);
    try {
      await setDoc(doc(db, "users", currentUser.uid), { settings: next }, { merge: true });
    } catch (e) {
      console.error("Error saving setting:", e);
    }
    setSaving("");
  };

  /* ─────────────── WALLET ─────────────── */

  const handleAddMoney = async (amount) => {
    if (!currentUser || !amount || amount <= 0) return;
    setAddingMoney(true);
    try {
      const res = await fetch(BACKEND_URL + "/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "wallet_topup", amount }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        setAddingMoney(false);
        return;
      }
      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "Knowora",
        description: `Add ₹${amount} to wallet`,
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
              await updateDoc(doc(db, "users", currentUser.uid), {
                walletBalance: increment(amount),
              });
              setWalletBalance((prev) => prev + amount);
              setCustomAmount("");
            } else {
              toast.error("Payment verification failed. Wallet not credited.");
            }
          } catch (e) {
            console.error("Error crediting wallet:", e);
          }
          setAddingMoney(false);
        },
        modal: { ondismiss: () => setAddingMoney(false) },
        prefill: { email: currentUser.email },
        theme: { color: "#12805A" },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (e) {
      console.error("Error starting wallet top-up:", e);
      toast.error("Could not start payment. Please try again.");
      setAddingMoney(false);
    }
  };

  /* ─────────────── REFERRALS ─────────────── */

  const handleCopyReferral = async () => {
    const link = `${window.location.origin}/login?ref=${referralCode}`;
    const text = `Join me on Knowora and find sports matches near you! Use my code ${referralCode} when you sign up — we both get bonus points. ${link}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Join Knowora", text, url: link });
        return;
      }
      await navigator.clipboard.writeText(text);
      setReferralCopied(true);
      setTimeout(() => setReferralCopied(false), 2500);
    } catch (e) {
      // share sheet cancelled — nothing to do
    }
  };

  const handleRedeemCode = async () => {
    const code = redeemInput.trim().toUpperCase();
    setRedeemMsg("");
    if (!code) {
      setRedeemMsg("Enter a referral code first.");
      return;
    }
    if (code === referralCode) {
      setRedeemMsg("You can't use your own code.");
      return;
    }
    if (referredBy) {
      setRedeemMsg("You've already redeemed a referral code.");
      return;
    }

    setRedeeming(true);
    try {
      const snap = await getDocs(
        query(collection(db, "users"), where("referralCode", "==", code))
      );
      if (snap.empty) {
        setRedeemMsg("That code doesn't look right — please check and try again.");
        setRedeeming(false);
        return;
      }
      const referrerDoc = snap.docs[0];
      const referrerUid = referrerDoc.id;

      await updateDoc(doc(db, "users", currentUser.uid), {
        referredBy: referrerUid,
        points: increment(REFERRAL_BONUS_POINTS),
        walletBalance: increment(REFERRAL_BONUS_WALLET),
      });
      await updateDoc(doc(db, "users", referrerUid), {
        referralCount: increment(1),
        points: increment(REFERRAL_BONUS_POINTS),
        walletBalance: increment(REFERRAL_BONUS_WALLET),
      });

      setReferredBy(referrerUid);
      setWalletBalance((prev) => prev + REFERRAL_BONUS_WALLET);
      setRedeemMsg(`Code applied! You earned ₹${REFERRAL_BONUS_WALLET} wallet credit + ${REFERRAL_BONUS_POINTS} points.`);
      setRedeemInput("");
    } catch (e) {
      console.error("Error redeeming referral code:", e);
      setRedeemMsg("Something went wrong. Please try again.");
    }
    setRedeeming(false);
  };

  const handleUnblock = async (uid) => {
    if (!currentUser) return;
    setUnblocking(uid);
    try {
      await updateDoc(doc(db, "users", currentUser.uid), {
        blockedUsers: arrayRemove(uid),
      });
      setBlockedUsers((prev) => prev.filter((id) => id !== uid));
    } catch (e) {
      console.error("Error unblocking user:", e);
    }
    setUnblocking("");
  };

  const handleUnfollow = async (uid) => {
    if (!currentUser) return;
    setUnfollowingUid(uid);
    try {
      await updateDoc(doc(db, "users", currentUser.uid), {
        following: arrayRemove(uid),
      });
      setFollowingUsers((prev) => prev.filter((id) => id !== uid));
    } catch (e) {
      console.error("Error unfollowing player:", e);
    }
    setUnfollowingUid("");
  };

  const handleSignOut = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const handleDeleteAccount = async () => {
    if (!currentUser) return;
    const confirmed = await confirmDialog({
      title: "Delete your account?",
      message: "This permanently removes your Knowora account and profile data. This cannot be undone.",
      confirmLabel: "Delete account",
      danger: true,
    });
    if (!confirmed) return;

    setDeleting(true);
    try {
      await deleteDoc(doc(db, "users", currentUser.uid));
      await deleteUser(currentUser);
      navigate("/login");
    } catch (e) {
      console.error("Error deleting account:", e);
      toast.error(
        e.code === "auth/requires-recent-login"
          ? "For security, please sign out and log in again before deleting your account."
          : "Could not delete account. Please try again."
      );
    }
    setDeleting(false);
  };

  const Toggle = ({ id, checked, onChange }) => (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      className={"kn-toggle " + (checked ? "kn-toggle--on" : "")}
      onClick={() => onChange(!checked)}
    >
      <span className="kn-toggle-knob" />
    </button>
  );

  return (
    <div className="db-shell">
      {/* SIDEBAR */}
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
            <Link to="/profile" className="db-nav-item">
              <i className="ti ti-user db-nav-ico" aria-hidden="true"></i> Profile
            </Link>
            <Link to="/pricing" className="db-nav-item">
              <i className="ti ti-credit-card db-nav-ico" aria-hidden="true"></i> Pricing plans
            </Link>
            <Link to="/settings" className="db-nav-item db-nav-item--active">
              <i className="ti ti-settings db-nav-ico" aria-hidden="true"></i> Settings
            </Link>
          </nav>
        </div>
        <div className="db-sidebar-foot">
          <button className="db-logout" onClick={handleSignOut}>
            <i className="ti ti-logout" aria-hidden="true"></i> Sign out
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="db-main">
        <header className="db-topbar">
          <div>
            <button className="db-back-btn" onClick={() => navigate(-1)}>
              <i className="ti ti-arrow-left" aria-hidden="true"></i> Back
            </button>
            <h1 className="db-page-title">Settings</h1>
            <p className="db-page-sub">Manage notifications, privacy and your account</p>
          </div>
        </header>

        <div className="db-body">
          {loading ? (
            <p className="loading-text">Loading settings...</p>
          ) : (
            <>
              {/* NOTIFICATIONS */}
              <div className="db-section-card">
                <div className="db-section-card-header">
                  <span className="db-section-card-title">🔔 Notifications</span>
                </div>
                <div className="kn-settings-list">
                  <div className="kn-settings-row">
                    <div>
                      <div className="kn-settings-row-title">Match reminders</div>
                      <div className="kn-settings-row-desc">
                        Get a heads-up when a match you joined starts within 24 hours.
                      </div>
                    </div>
                    <Toggle
                      checked={settings.notifyReminders}
                      onChange={(v) => updateSetting("notifyReminders", v)}
                    />
                  </div>
                  <div className="kn-settings-row">
                    <div>
                      <div className="kn-settings-row-title">New match alerts</div>
                      <div className="kn-settings-row-desc">
                        Show newly posted matches near your sports on the dashboard.
                      </div>
                    </div>
                    <Toggle
                      checked={settings.notifyNewMatches}
                      onChange={(v) => updateSetting("notifyNewMatches", v)}
                    />
                  </div>
                </div>
              </div>

              {/* PRIVACY */}
              <div className="db-section-card">
                <div className="db-section-card-header">
                  <span className="db-section-card-title">🔒 Privacy</span>
                </div>
                <div className="kn-settings-list">
                  <div className="kn-settings-row">
                    <div>
                      <div className="kn-settings-row-title">Public profile</div>
                      <div className="kn-settings-row-desc">
                        Let other players see your name, points and match history.
                        Turning this off hides your profile from search and player lists.
                      </div>
                    </div>
                    <Toggle
                      checked={settings.profilePublic}
                      onChange={(v) => updateSetting("profilePublic", v)}
                    />
                  </div>
                </div>
              </div>

              {/* APPEARANCE */}
              <div className="db-section-card">
                <div className="db-section-card-header">
                  <span className="db-section-card-title">🎨 Appearance</span>
                </div>
                <div className="kn-settings-list">
                  <div className="kn-settings-row">
                    <div>
                      <div className="kn-settings-row-title">Dark mode</div>
                      <div className="kn-settings-row-desc">
                        Switch the app to a darker color scheme.
                      </div>
                    </div>
                    <Toggle
                      checked={settings.darkMode}
                      onChange={(v) => updateSetting("darkMode", v)}
                    />
                  </div>
                </div>
              </div>

              {/* WALLET */}
              <div className="db-section-card">
                <div className="db-section-card-header">
                  <span className="db-section-card-title">💰 Wallet</span>
                </div>
                <div className="kn-wallet-box">
                  <div>
                    <div className="kn-wallet-label">Balance</div>
                    <div className="kn-wallet-balance">₹{walletBalance}</div>
                    <div className="kn-settings-row-desc">
                      Use your wallet to pay for match fees instantly — no payment gateway needed at join time.
                    </div>
                  </div>
                  <div className="kn-wallet-amounts">
                    {WALLET_TOPUP_AMOUNTS.map((amt) => (
                      <button
                        key={amt}
                        className="kn-amount-btn"
                        onClick={() => handleAddMoney(amt)}
                        disabled={addingMoney}
                      >
                        + ₹{amt}
                      </button>
                    ))}
                    <div className="kn-custom-amount-row">
                      <input
                        type="number"
                        min="10"
                        placeholder="Custom amount"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                      />
                      <button
                        className="kn-amount-btn kn-amount-btn--primary"
                        onClick={() => handleAddMoney(Number(customAmount))}
                        disabled={addingMoney || !customAmount || Number(customAmount) <= 0}
                      >
                        {addingMoney ? "Processing..." : "Add"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* REFER & EARN */}
              <div className="db-section-card">
                <div className="db-section-card-header">
                  <span className="db-section-card-title">🎁 Refer & Earn</span>
                </div>
                <div className="kn-settings-list">
                  <div className="kn-settings-row">
                    <div>
                      <div className="kn-settings-row-title">Your referral code</div>
                      <div className="kn-settings-row-desc">
                        Share this with friends. When they redeem it, you both get{" "}
                        ₹{REFERRAL_BONUS_WALLET} wallet credit + {REFERRAL_BONUS_POINTS} points.
                        {referralCount > 0 && ` You've referred ${referralCount} player${referralCount === 1 ? "" : "s"} so far.`}
                      </div>
                    </div>
                    <div className="kn-referral-code-box">
                      <span className="kn-referral-code">{referralCode || "..."}</span>
                      <button className="kn-unblock-btn" onClick={handleCopyReferral}>
                        {referralCopied ? "✓ Copied" : "Share"}
                      </button>
                    </div>
                  </div>

                  {!referredBy && (
                    <div className="kn-settings-row">
                      <div>
                        <div className="kn-settings-row-title">Have a friend's code?</div>
                        <div className="kn-settings-row-desc">
                          Redeem it once to get your welcome bonus.
                        </div>
                        {redeemMsg && <div className="kn-redeem-msg">{redeemMsg}</div>}
                      </div>
                      <div className="kn-redeem-box">
                        <input
                          type="text"
                          placeholder="Enter code"
                          value={redeemInput}
                          onChange={(e) => setRedeemInput(e.target.value.toUpperCase())}
                          maxLength={8}
                        />
                        <button
                          className="kn-unblock-btn"
                          onClick={handleRedeemCode}
                          disabled={redeeming}
                        >
                          {redeeming ? "Checking..." : "Redeem"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* FOLLOWING */}
              <div className="db-section-card">
                <div className="db-section-card-header">
                  <span className="db-section-card-title">👥 Following</span>
                </div>
                {followingUsers.length === 0 ? (
                  <p className="kn-settings-empty">
                    You're not following anyone yet. Follow players from a match page to see
                    their matches highlighted on your dashboard.
                  </p>
                ) : (
                  <div className="kn-settings-list">
                    {followingUsers.map((uid) => (
                      <div className="kn-settings-row" key={uid}>
                        <div className="kn-settings-row-title">
                          {followingNames[uid] || "Player"}
                        </div>
                        <button
                          className="kn-unblock-btn"
                          onClick={() => handleUnfollow(uid)}
                          disabled={unfollowingUid === uid}
                        >
                          {unfollowingUid === uid ? "Removing..." : "Unfollow"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* BLOCKED PLAYERS */}
              <div className="db-section-card">
                <div className="db-section-card-header">
                  <span className="db-section-card-title">🚫 Blocked players</span>
                </div>
                {blockedUsers.length === 0 ? (
                  <p className="kn-settings-empty">You haven't blocked anyone.</p>
                ) : (
                  <div className="kn-settings-list">
                    {blockedUsers.map((uid) => (
                      <div className="kn-settings-row" key={uid}>
                        <div className="kn-settings-row-title">
                          {blockedNames[uid] || "Player"}
                        </div>
                        <button
                          className="kn-unblock-btn"
                          onClick={() => handleUnblock(uid)}
                          disabled={unblocking === uid}
                        >
                          {unblocking === uid ? "Unblocking..." : "Unblock"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ACCOUNT / DANGER ZONE */}
              <div className="db-section-card kn-danger-card">
                <div className="db-section-card-header">
                  <span className="db-section-card-title">⚠️ Account</span>
                </div>
                <div className="kn-settings-list">
                  <div className="kn-settings-row">
                    <div>
                      <div className="kn-settings-row-title">Delete account</div>
                      <div className="kn-settings-row-desc">
                        Permanently deletes your Knowora profile, points and settings. Your
                        past matches stay on record for other players. This can't be undone.
                      </div>
                    </div>
                    <button
                      className="kn-delete-btn"
                      onClick={handleDeleteAccount}
                      disabled={deleting}
                    >
                      {deleting ? "Deleting..." : "Delete account"}
                    </button>
                  </div>
                </div>
              </div>

              {saving && <p className="kn-saving-note">Saving {saving}...</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Settings;