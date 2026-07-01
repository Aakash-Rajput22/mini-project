import { Link } from "react-router-dom";
import "../styles/landing.css";

function Landing() {
  return (
    <div className="lp">

      {/* ── HEADER ── */}
      <header className="lp-header">
        <div className="lp-nav-inner">
          <Link to="/" className="lp-brand">
            <span className="lp-brand-mark">M</span>
            Mini Project
          </Link>

          <nav className="lp-nav-links">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#pricing">Pricing</a>
            <a href="#reviews">Reviews</a>
            <a href="#faq">FAQ</a>
          </nav>

          <div className="lp-nav-cta">
            <Link to="/login" className="lp-btn-ghost">Log in</Link>
            <Link to="/signup" className="lp-btn-primary">Get started</Link>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="lp-hero">
        <div className="lp-wrap lp-hero-inner">
          <div className="lp-pill">🔐 Powered by Firebase &amp; Razorpay</div>

          <h1 className="lp-hero-h1">
            The auth system that<br />
            <span className="lp-gradient-text">expires on purpose</span>
          </h1>

          <p className="lp-hero-sub">
            Sign in with email or Google, set up your profile, choose a plan,
            and get access for exactly as long as you need — then it stops.
            No subscriptions. No forgotten charges.
          </p>

          <div className="lp-hero-actions">
            <Link to="/signup" className="lp-btn-primary lp-btn-lg">
              Start for free — no card needed
            </Link>
            <Link to="/login" className="lp-btn-outline lp-btn-lg">
              Log in to your account
            </Link>
          </div>

          <div className="lp-hero-trust">
            <span className="lp-trust-item">
              <span className="lp-check">✓</span> Free plan — 1 hour access
            </span>
            <span className="lp-trust-sep">|</span>
            <span className="lp-trust-item">
              <span className="lp-check">✓</span> Auto-expires, no manual cancel
            </span>
            <span className="lp-trust-sep">|</span>
            <span className="lp-trust-item">
              <span className="lp-check">✓</span> Secure Firebase auth
            </span>
          </div>
        </div>
      </section>

      {/* ── STATS STRIP ── */}
      <section className="lp-stats">
        <div className="lp-wrap lp-stats-grid">
          <div className="lp-stat">
            <div className="lp-stat-num">3</div>
            <div className="lp-stat-label">Plan tiers</div>
          </div>
          <div className="lp-stat-div" />
          <div className="lp-stat">
            <div className="lp-stat-num">1–12h</div>
            <div className="lp-stat-label">Per session</div>
          </div>
          <div className="lp-stat-div" />
          <div className="lp-stat">
            <div className="lp-stat-num">100%</div>
            <div className="lp-stat-label">Auto-expiry</div>
          </div>
          <div className="lp-stat-div" />
          <div className="lp-stat">
            <div className="lp-stat-num">₹0</div>
            <div className="lp-stat-label">To get started</div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="lp-section">
        <div className="lp-wrap">
          <div className="lp-section-header">
            <span className="lp-label">01 / Features</span>
            <h2>Everything you need, nothing you don't</h2>
            <p>Three core features built to work together — auth, profile, and timed access control.</p>
          </div>

          <div className="lp-features-grid">
            <div className="lp-feature-card">
              <div className="lp-feature-ico lp-ico-blue">🔐</div>
              <h3>Secure authentication</h3>
              <p>Email and password login, or sign in with Google in one click. Accounts with the same email merge automatically — zero duplicate accounts.</p>
              <ul className="lp-feature-list">
                <li>Email + password signup</li>
                <li>Google OAuth login</li>
                <li>Email verification</li>
                <li>Auto account merge</li>
              </ul>
            </div>

            <div className="lp-feature-card lp-feature-card--highlight">
              <div className="lp-feature-ico lp-ico-purple">⏱</div>
              <h3>Time-limited access plans</h3>
              <p>Three plans — Free (1h), Silver (6h), Gold (12h). Pay once, access starts instantly, expires automatically. A background job handles revocation.</p>
              <ul className="lp-feature-list">
                <li>Free, Silver, Gold tiers</li>
                <li>Razorpay payment integration</li>
                <li>Auto-expiry via cron job</li>
                <li>Live countdown on dashboard</li>
              </ul>
            </div>

            <div className="lp-feature-card">
              <div className="lp-feature-ico lp-ico-green">👤</div>
              <h3>Full profile management</h3>
              <p>Upload a profile photo, update your address with live map suggestions, and download your data anytime.</p>
              <ul className="lp-feature-list">
                <li>Photo upload (Storj storage)</li>
                <li>Address with map suggestions</li>
                <li>Profile data download</li>
                <li>Admin panel (role-based)</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="lp-section lp-section--alt">
        <div className="lp-wrap">
          <div className="lp-section-header">
            <span className="lp-label">02 / How it works</span>
            <h2>Up and running in three steps</h2>
            <p>From landing on this page to having active access takes under two minutes.</p>
          </div>

          <div className="lp-steps">
            <div className="lp-step">
              <div className="lp-step-num">01</div>
              <div className="lp-step-body">
                <h3>Create your account</h3>
                <p>Sign up with email or Google. Verify your email and your profile is ready to set up — photo, address, and all.</p>
              </div>
            </div>

            <div className="lp-step-arrow">→</div>

            <div className="lp-step">
              <div className="lp-step-num">02</div>
              <div className="lp-step-body">
                <h3>Choose your plan</h3>
                <p>Pick the session length that fits — 1 hour free, 6 hours for ₹199, or 12 hours for ₹499. Pay once via Razorpay.</p>
              </div>
            </div>

            <div className="lp-step-arrow">→</div>

            <div className="lp-step">
              <div className="lp-step-num">03</div>
              <div className="lp-step-body">
                <h3>Access starts immediately</h3>
                <p>Your plan activates the moment payment confirms. The dashboard shows a live countdown. When time's up, access stops — automatically.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="lp-section">
        <div className="lp-wrap">
          <div className="lp-section-header">
            <span className="lp-label">03 / Pricing</span>
            <h2>Pay once, access for as long as you need</h2>
            <p>No subscriptions. No auto-renewal. You choose when to start.</p>
          </div>

          <div className="lp-pricing-grid">
            <div className="lp-plan">
              <div className="lp-plan-header">
                <span className="lp-plan-name">Free</span>
                <div className="lp-plan-price">₹0</div>
                <div className="lp-plan-dur">1 hour access</div>
              </div>
              <ul className="lp-plan-features">
                <li><span className="lp-check">✓</span> Basic access</li>
                <li><span className="lp-check">✓</span> Profile management</li>
                <li><span className="lp-check">✓</span> Email login</li>
                <li><span className="lp-check">✓</span> No card required</li>
              </ul>
              <Link to="/signup" className="lp-plan-btn">Get started free</Link>
            </div>

            <div className="lp-plan lp-plan--featured">
              <div className="lp-plan-badge">Most popular</div>
              <div className="lp-plan-header">
                <span className="lp-plan-name">Silver</span>
                <div className="lp-plan-price">₹199</div>
                <div className="lp-plan-dur">6 hours access</div>
              </div>
              <ul className="lp-plan-features">
                <li><span className="lp-check">✓</span> Everything in Free</li>
                <li><span className="lp-check">✓</span> 6× longer session</li>
                <li><span className="lp-check">✓</span> Priority support</li>
                <li><span className="lp-check">✓</span> Razorpay payment</li>
              </ul>
              <Link to="/signup" className="lp-plan-btn lp-plan-btn--primary">Choose Silver</Link>
            </div>

            <div className="lp-plan lp-plan--gold">
              <div className="lp-plan-header">
                <span className="lp-plan-name">Gold</span>
                <div className="lp-plan-price">₹499</div>
                <div className="lp-plan-dur">12 hours access</div>
              </div>
              <ul className="lp-plan-features">
                <li><span className="lp-check lp-check--gold">✓</span> Everything in Silver</li>
                <li><span className="lp-check lp-check--gold">✓</span> 12× longer session</li>
                <li><span className="lp-check lp-check--gold">✓</span> Premium support</li>
                <li><span className="lp-check lp-check--gold">✓</span> Full access</li>
              </ul>
              <Link to="/signup" className="lp-plan-btn lp-plan-btn--gold">Choose Gold</Link>
            </div>
          </div>

          <p className="lp-pricing-note">
            All plans activate immediately on payment. Access expires automatically — no manual cancellation needed.
          </p>
        </div>
      </section>

      {/* ── REVIEWS ── */}
      <section id="reviews" className="lp-section lp-section--alt">
        <div className="lp-wrap">
          <div className="lp-section-header">
            <span className="lp-label">04 / Reviews</span>
            <h2>What people say</h2>
            <p>From students to freelancers who wanted access without a subscription.</p>
          </div>

          <div className="lp-reviews-grid">
            <div className="lp-review">
              <div className="lp-stars">★★★★★</div>
              <p className="lp-review-text">"Needed access for a few hours to finish a task. Paid for Silver, got exactly 6 hours, and it stopped on its own. No forgetting to cancel anything."</p>
              <div className="lp-reviewer">
                <div className="lp-avatar lp-avatar--blue">RS</div>
                <div>
                  <div className="lp-reviewer-name">Riya Sharma</div>
                  <div className="lp-reviewer-role">Freelance designer</div>
                </div>
              </div>
            </div>

            <div className="lp-review">
              <div className="lp-stars">★★★★★</div>
              <p className="lp-review-text">"The free hour was enough to test everything before I paid for anything. Sign-up with Google took under a minute. Clean and fast."</p>
              <div className="lp-reviewer">
                <div className="lp-avatar lp-avatar--green">AK</div>
                <div>
                  <div className="lp-reviewer-name">Arjun Kapoor</div>
                  <div className="lp-reviewer-role">CS student</div>
                </div>
              </div>
            </div>

            <div className="lp-review">
              <div className="lp-stars">★★★★★</div>
              <p className="lp-review-text">"Profile setup with map address suggestions was smoother than most full-size apps I've used. The dashboard timer is a great touch."</p>
              <div className="lp-reviewer">
                <div className="lp-avatar lp-avatar--purple">PM</div>
                <div>
                  <div className="lp-reviewer-name">Priya Mehta</div>
                  <div className="lp-reviewer-role">Product intern</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="lp-section">
        <div className="lp-wrap">
          <div className="lp-section-header">
            <span className="lp-label">05 / FAQ</span>
            <h2>Good to know</h2>
          </div>

          <div className="lp-faq-grid">
            <div className="lp-faq-item">
              <h3>What happens when my plan expires?</h3>
              <p>Access is revoked automatically the moment the session ends. No action needed from your side — a background job handles it.</p>
            </div>
            <div className="lp-faq-item">
              <h3>Can I buy another plan after mine expires?</h3>
              <p>Yes — you can purchase a new plan anytime from the Pricing page. Each plan is a fresh session.</p>
            </div>
            <div className="lp-faq-item">
              <h3>Do I need a card for the free plan?</h3>
              <p>No. The Free plan gives one hour of access with zero payment required. Just sign up and go.</p>
            </div>
            <div className="lp-faq-item">
              <h3>How is payment processed?</h3>
              <p>Payments run through Razorpay — India's leading payment gateway. Cards, UPI, and net banking are all supported.</p>
            </div>
            <div className="lp-faq-item">
              <h3>Is my data safe?</h3>
              <p>Auth runs on Firebase, profile photos on Storj, and payments on Razorpay. None of your data touches an unverified server.</p>
            </div>
            <div className="lp-faq-item">
              <h3>Is there an admin panel?</h3>
              <p>Yes — admin accounts can see a full user listing with search, filter by plan, and pagination. Access is role-restricted.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="lp-cta-section">
        <div className="lp-wrap lp-cta-inner">
          <h2>Start your first session today</h2>
          <p>One hour free. No card required. Cancel isn't even a button — time does it for you.</p>
          <div className="lp-cta-actions">
            <Link to="/signup" className="lp-btn-primary lp-btn-lg">Create a free account</Link>
            <Link to="/login" className="lp-btn-outline lp-btn-lg lp-btn-light">Already have an account?</Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lp-footer">
        <div className="lp-wrap lp-footer-inner">
          <div className="lp-footer-brand">
            <span className="lp-brand-mark">M</span>
            Mini Project
          </div>

          <div className="lp-footer-cols">
            <div className="lp-footer-col">
              <div className="lp-footer-col-title">Product</div>
              <a href="#features">Features</a>
              <a href="#pricing">Pricing</a>
              <a href="#how">How it works</a>
            </div>
            <div className="lp-footer-col">
              <div className="lp-footer-col-title">Account</div>
              <Link to="/login">Log in</Link>
              <Link to="/signup">Sign up</Link>
            </div>
            <div className="lp-footer-col">
              <div className="lp-footer-col-title">Support</div>
              <a href="#faq">FAQ</a>
              <a href="#reviews">Reviews</a>
            </div>
          </div>
        </div>

        <div className="lp-wrap lp-footer-bottom">
          <span>© 2026 Mini Project. Built with React, Firebase &amp; Razorpay.</span>
        </div>
      </footer>

    </div>
  );
}

export default Landing;