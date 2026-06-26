import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAwSH-CFzz6Ebfojo2GgCMDrWASNxCYXm4",
  authDomain: "mini-project-65ad7.firebaseapp.com",
  projectId: "mini-project-65ad7",
  storageBucket: "mini-project-65ad7.firebasestorage.app",
  messagingSenderId: "161246027919",
  appId: "1:161246027919:web:4438fd6b06d0878f9910fa"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export default app;