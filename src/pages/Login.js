import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import { auth } from "../firebase";
import "../styles/login.css";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
  if (!email || !password) {
    alert("Please fill all fields");
    return;
  }

  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    const user = userCredential.user;

    if (!user.emailVerified) {
      alert("Please verify your email before login.");

      await signOut(auth);

      return;
    }

    alert("Login Successful");

    navigate("/dashboard");
  } catch (error) {
    alert(error.message);
  }
};

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      alert("Please enter a valid email");
      return;
    }

    if (!password) {
      alert("Password is required");
      return;
    }

    if (password.length < 8) {
      alert("Password must be at least 8 characters");
      return;
    }

    console.log("Email:", email);
    console.log("Password:", password);

    navigate("/dashboard");
  };

  return (
    <div className="login-container">
      <div className="login-box">

        <h2>Login</h2>

        {/* Email */}
        <input
          type="email"
          placeholder="Enter Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {/* Password */}
        <div className="password-box">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Enter Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            type="button"
            className="eye-btn"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? "🙈" : "👁️"}
          </button>
        </div>

        {/* Login Button */}
        <button
          type="button"
          className="login-btn"
          onClick={handleLogin}
        >
          Login
        </button>

        <p>
          Don't have an account?{" "}
          <Link to="/signup">Signup</Link>
        </p>

      </div>
    </div>
  );
}

export default Login;