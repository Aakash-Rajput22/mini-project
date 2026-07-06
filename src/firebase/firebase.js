import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  FacebookAuthProvider,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAwSH-CFzz6Ebfojo2GgCMDrWASNxCYXm4",
  authDomain: "mini-project-65ad7.firebaseapp.com",
  projectId: "mini-project-65ad7",
  storageBucket: "mini-project-65ad7.firebasestorage.app",
  messagingSenderId: "161246027919",
  appId: "1:161246027919:web:4438fd6b06d0878f9910fa",
  measurementId: "G-QLJKZTQM8N",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export const googleProvider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();

export default app;