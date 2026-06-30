import { Link } from "react-router-dom";
import "../styles/landing.css";

function Landing() {
  return (
    <div className="landing">

      {/* NAVBAR */}
      <header className="navbar">
        <div className="logo">
          <span className="logo-mark">M</span>
          Mini Project
        </div>

        <nav>
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <Link to="/login" className="nav-login">Log in</Link>
          <Link to="/signup" className="signup-btn">Create account</Link>
        </nav>
      </header>

      {/* HERO */}
      <section className="hero">
        <span className="hero-eyebrow">Access that runs on a clock</span>
        <h1>
          Authentication built<br />
          for <span className="accent">timed access</span>
        </h1>
        <p>
          Sign in with email or social login, manage your profile, and pick a
          plan that fits the hour — Free, Silver, or Gold. Access starts the
          moment you pay and ends the moment your time runs out.
        </p>

        <div className="hero-buttons">
          <Link to="/signup" className="primary-btn">Get started free</Link>
          <Link to="/login" className="secondary-btn">Log in</Link>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="features">
        <span className="section-eyebrow">What you get</span>
        <h2>Three things, done properly</h2>

        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon icon-lock" />
            <h3>Secure sign-in</h3>
            <p>
              Email and password, or continue with Google and Facebook.
              Accounts with the same email merge automatically — no
              duplicates, no confusion.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon icon-user" />
            <h3>A profile that's actually yours</h3>
            <p>
              Upload a photo, set your address with map auto-suggestions,
              and download your data whenever you want it.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon icon-clock" />
            <h3>Plans that respect your time</h3>
            <p>
              Pay once, get access for exactly as long as you chose.
              A background job revokes access the second the clock hits
              zero — no manual cancellation needed.
            </p>
          </div>
        </div>
      </section>

      {/* PRICING PREVIEW */}
      <section id="pricing" className="pricing-preview">
        <span className="section-eyebrow">Pricing</span>
        <h2>Pick your window</h2>

        <div className="pricing-grid">
          <div className="price-card">
            <h3>Free</h3>
            <div className="price-amount">₹0</div>
            <p className="price-duration">1 hour access</p>
            <ul className="price-features">
              <li>Basic access</li>
              <li>Profile management</li>
            </ul>
          </div>

          <div className="price-card popular">
            <span className="popular-tag">Most popular</span>
            <h3>Silver</h3>
            <div className="price-amount">₹199</div>
            <p className="price-duration">6 hours access</p>
            <ul className="price-features">
              <li>Everything in Free</li>
              <li>Priority support</li>
              <li>Extended access</li>
            </ul>
          </div>

          <div className="price-card gold">
            <h3>Gold</h3>
            <div className="price-amount">₹499</div>
            <p className="price-duration">12 hours access</p>
            <ul className="price-features">
              <li>Everything in Silver</li>
              <li>Premium support</li>
              <li>Full access</li>
            </ul>
          </div>
        </div>

        <Link to="/pricing" className="view-btn">See full pricing details</Link>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <span>© 2026 Mini Project</span>
        <span className="footer-dot">·</span>
        <span>Built with React &amp; Firebase</span>
      </footer>

    </div>
  );
}

export default Landing;