import { doc, getDoc, updateDoc, deleteField } from "firebase/firestore";
import { db } from "../firebase/firebase";

export const checkAndDowngradeIfExpired = async (uid) => {
  if (!uid) return;
  try {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;

    const data = snap.data();
    if (!data.planExpiry || !data.plan || data.plan === "Free") return;

    const expiry = data.planExpiry.toDate ? data.planExpiry.toDate() : new Date(data.planExpiry);
    if (expiry <= new Date()) {
      await updateDoc(ref, {
        plan: "Free",
        planExpiry: deleteField(),
      });
    }
  } catch (err) {
    console.error("Error checking plan expiry:", err);
  }
};