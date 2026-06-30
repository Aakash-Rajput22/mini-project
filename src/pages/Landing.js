import { Link } from "react-router-dom";
import "../styles/landing.css";

function Landing() {
  return (
    <div className="landing">

      {/* Navbar */}
      <header className="navbar">
        <div className="logo">Mini Project</div>

        <nav>
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <Link to="/login">Login</Link>
          <Link to="/signup" className="signup-btn">
            Sign Up
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <h1>Secure Authentication System</h1>

        <p>
          Manage your account securely with Firebase Authentication,
          Profile Management and Pricing Plans.
        </p>

        <div className="hero-buttons">
          <Link to="/signup" className="primary-btn">
            Get Started
          </Link>

          <Link to="/login" className="secondary-btn">
            Login
          </Link>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="features">
        <h2>Features</h2>

        <div className="feature-grid">

          <div className="feature-card">
            <h3>🔐 Secure Login</h3>
            <p>
              Login and Signup with Email, Google and Facebook Authentication.
            </p>
          </div>

          <div className="feature-card">
            <h3>👤 Profile Management</h3>
            <p>
              Update your profile, upload photo and manage your information.
            </p>
          </div>

          <div className="feature-card">
            <h3>💳 Pricing Plans</h3>
            <p>
              Choose Free, Silver or Gold plan according to your needs.
            </p>
          </div>

        </div>
      </section>

      {/* Pricing Preview */}
      <section id="pricing" className="pricing-preview">

        <h2>Pricing Plans</h2>

        <div className="pricing-grid">

          <div className="price-card">
            <h3>Free</h3>
            <h1>₹0</h1>
            <p>1 Hour Access</p>
          </div>

          <div className="price-card popular">
            <span>Most Popular</span>
            <h3>Silver</h3>
            <h1>₹199</h1>
            <p>6 Hours Access</p>
          </div>

          <div className="price-card">
            <h3>Gold</h3>
            <h1>₹499</h1>
            <p>12 Hours Access</p>
          </div>

        </div>

        <Link to="/pricing" className="view-btn">
          View Full Pricing
        </Link>

      </section>

      {/* Footer */}
      <footer className="footer">
        © 2026 Mini Project | Built with React & Firebase
      </footer>

    </div>
  );
}

export default Landing;