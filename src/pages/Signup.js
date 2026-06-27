import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  signInWithPopup,
} from "firebase/auth";

import {
  auth,
  googleProvider,
  facebookProvider,
} from "../firebase/firebase";

import InputField from "../components/InputField";
import Button from "../components/Button";
import "../styles/signup.css";

function Signup() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSignup = async () => {
    if (!name || !email || !password || !confirmPassword) {
      alert("Please fill all fields");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    try {
      const userCredential =
        await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

      await updateProfile(userCredential.user, {
        displayName: name,
      });

      await sendEmailVerification(userCredential.user);

      alert(
        "Account created successfully.\nPlease verify your email before login."
      );

      navigate("/login");
    } catch (error) {
      alert(error.message);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      alert("Google Signup Successful");
      navigate("/dashboard");
    } catch (error) {
      alert(error.message);
    }
  };

  const handleFacebookSignup = async () => {
    try {
      await signInWithPopup(auth, facebookProvider);
      alert("Facebook Signup Successful");
      navigate("/dashboard");
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-box">

        <h2>Create Account</h2>

        <InputField
          type="text"
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <InputField
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <InputField
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <InputField
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <Button
          text="Signup"
          onClick={handleSignup}
        />

        <button
          onClick={handleGoogleSignup}
          className="login-btn"
        >
          Continue with Google
        </button>

        <button
          onClick={handleFacebookSignup}
          className="login-btn"
        >
          Continue with Facebook
        </button>

        <p>
          Already have an account?
          <Link to="/login"> Login</Link>
        </p>

      </div>
    </div>
  );
}

export default Signup;