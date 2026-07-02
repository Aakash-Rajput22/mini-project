import { Link } from "react-router-dom";
import "../styles/landing.css";

function Landing() {
  return (
    <div className="lp">

      {/* HEADER */}
      <header className="lp-header">
        <div className="lp-nav-inner">
          <Link to="/" className="lp-brand">
            <span className="lp-brand-mark">K</span>
            Knowora
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

      {/* HERO */}
      <section className="lp-hero">
        <div className="lp-wrap lp-hero-inner">
          <div className="lp-pill">🏆 Play · Match · Compete · Win</div>

          <h1 className="lp-hero-h1">
            Find your next game,<br />
            <span className="lp-gradient-text">meet your perfect match</span>
          </h1>

          <p className="lp-hero-sub">
            Post a match, join a game near you, and get matched with players
            at your skill level — across any sport. Knowora is your
            community-powered sports matchmaking hub.
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
              <span className="lp-check">✓</span> Free plan — instant access
            </span>
            <span className="lp-trust-sep">|</span>
            <span className="lp-trust-item">
              <span className="lp-check">✓</span> Unlimited match requests
            </span>
            <span className="lp-trust-sep">|</span>
            <span className="lp-trust-item">
              <span className="lp-check">✓</span> Secure Firebase auth
            </span>
          </div>
        </div>
      </section>

      {/* STATS STRIP */}
      <section className="lp-stats">
        <div className="lp-wrap lp-stats-grid">
          <div className="lp-stat">
            <div className="lp-stat-num">3</div>
            <div className="lp-stat-label">Plan tiers</div>
          </div>
          <div className="lp-stat-div" />
          <div className="lp-stat">
            <div className="lp-stat-num">All Sports</div>
            <div className="lp-stat-label">Community driven</div>
          </div>
          <div className="lp-stat-div" />
          <div className="lp-stat">
            <div className="lp-stat-num">100%</div>
            <div className="lp-stat-label">Secure &amp; private</div>
          </div>
          <div className="lp-stat-div" />
          <div className="lp-stat">
            <div className="lp-stat-num">₹0</div>
            <div className="lp-stat-label">To get started</div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="lp-section">
        <div className="lp-wrap">
          <div className="lp-section-header">
            <span className="lp-label">01 / Features</span>
            <h2>Everything a sports matchmaking platform needs</h2>
            <p>Post games, join matches, earn points, and build your player rank — all in one place.</p>
          </div>

          <div className="lp-features-grid">
            <div className="lp-feature-card">
              <div className="lp-feature-ico lp-ico-blue">🏟️</div>
              <h3>Post any match</h3>
              <p>Host a game in any sport — Cricket, Football, Badminton, Tennis and more. Get matched with players fast.</p>
              <ul className="lp-feature-list">
                <li>Sport-wise categories</li>
                <li>Set venue, date &amp; slot</li>
                <li>Mark confirmed players</li>
                <li>Get notified on requests</li>
              </ul>
            </div>

            <div className="lp-feature-card lp-feature-card--highlight">
              <div className="lp-feature-ico lp-ico-purple">🤝</div>
              <h3>Join and earn</h3>
              <p>Join matches hosted by others. Earn points for every game you play, get upvoted by teammates, and build your reputation on the platform.</p>
              <ul className="lp-feature-list">
                <li>Points for every match played</li>
                <li>Upvote / downvote teammates</li>
                <li>Player leaderboard</li>
                <li>Skill-level badges</li>
              </ul>
            </div>

            <div className="lp-feature-card">
              <div className="lp-feature-ico lp-ico-green">🥇</div>
              <h3>Grow your profile</h3>
              <p>Build a public player profile, showcase your sports and skill level, manage your account and download your data anytime.</p>
              <ul className="lp-feature-list">
                <li>Profile photo upload</li>
                <li>Points &amp; rank display</li>
                <li>Profile data download</li>
                <li>Admin panel (role-based)</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="lp-section lp-section--alt">
        <div className="lp-wrap">
          <div className="lp-section-header">
            <span className="lp-label">02 / How it works</span>
            <h2>Up and running in three steps</h2>
            <p>From signing up to playing your first match takes under two minutes.</p>
          </div>

          <div className="lp-steps">
            <div className="lp-step">
              <div className="lp-step-num">01</div>
              <div className="lp-step-body">
                <h3>Create your player profile</h3>
                <p>Sign up with email or Google. Set up your profile with your name, photo, sports and skill level.</p>
              </div>
            </div>
            <div className="lp-step-arrow">→</div>
            <div className="lp-step">
              <div className="lp-step-num">02</div>
              <div className="lp-step-body">
                <h3>Host or join a match</h3>
                <p>Post a game in your sport, or browse open matches nearby and join players at your level.</p>
              </div>
            </div>
            <div className="lp-step-arrow">→</div>
            <div className="lp-step">
              <div className="lp-step-num">03</div>
              <div className="lp-step-body">
                <h3>Play and rank up</h3>
                <p>Get points for every match played. Upvotes boost your reputation. Confirm the game and close the loop.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="lp-section">
        <div className="lp-wrap">
          <div className="lp-section-header">
            <span className="lp-label">03 / Pricing</span>
            <h2>Choose your plan</h2>
            <p>Start free. Upgrade when you need more access. No auto-renewal.</p>
          </div>

          <div className="lp-pricing-grid">
            <div className="lp-plan">
              <div className="lp-plan-header">
                <span className="lp-plan-name">Free</span>
                <div className="lp-plan-price">₹0</div>
                <div className="lp-plan-dur">1 hour access</div>
              </div>
              <ul className="lp-plan-features">
                <li><span className="lp-check">✓</span> Post matches</li>
                <li><span className="lp-check">✓</span> Join matches</li>
                <li><span className="lp-check">✓</span> Profile management</li>
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
                <li><span className="lp-check">✓</span> Priority match requests</li>
                <li><span className="lp-check">✓</span> 2× points earning</li>
                <li><span className="lp-check">✓</span> Silver badge</li>
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
                <li><span className="lp-check lp-check--gold">✓</span> Pro player status</li>
                <li><span className="lp-check lp-check--gold">✓</span> 5× points earning</li>
                <li><span className="lp-check lp-check--gold">✓</span> Gold badge</li>
              </ul>
              <Link to="/signup" className="lp-plan-btn lp-plan-btn--gold">Choose Gold</Link>
            </div>
          </div>

          <p className="lp-pricing-note">
            All plans activate immediately. Access expires automatically — no manual cancellation needed.
          </p>
        </div>
      </section>

      {/* REVIEWS */}
      <section id="reviews" className="lp-section lp-section--alt">
        <div className="lp-wrap">
          <div className="lp-section-header">
            <span className="lp-label">04 / Reviews</span>
            <h2>What players say</h2>
            <p>Players and hosts who found their perfect match when they needed one most.</p>
          </div>

          <div className="lp-reviews-grid">
            <div className="lp-review">
              <div className="lp-stars">★★★★★</div>
              <p className="lp-review-text">"Found a badminton doubles partner in under 5 minutes. The community is so active and matches fill up fast. Knowora is my go-to app for weekend games now."</p>
              <div className="lp-reviewer">
                <div className="lp-avatar lp-avatar--blue">RS</div>
                <div>
                  <div className="lp-reviewer-name">Riya Sharma</div>
                  <div className="lp-reviewer-role">Badminton player</div>
                </div>
              </div>
            </div>

            <div className="lp-review">
              <div className="lp-stars">★★★★★</div>
              <p className="lp-review-text">"I love hosting matches here — I earn points and actually get a full team together in minutes. It's like running a mini league every weekend."</p>
              <div className="lp-reviewer">
                <div className="lp-avatar lp-avatar--green">AK</div>
                <div>
                  <div className="lp-reviewer-name">Arjun Kapoor</div>
                  <div className="lp-reviewer-role">Football host</div>
                </div>
              </div>
            </div>

            <div className="lp-review">
              <div className="lp-stars">★★★★★</div>
              <p className="lp-review-text">"Clean interface, fast matchmaking, and the points system keeps me motivated to play every week. Much better experience than other sports apps."</p>
              <div className="lp-reviewer">
                <div className="lp-avatar lp-avatar--purple">PM</div>
                <div>
                  <div className="lp-reviewer-name">Priya Mehta</div>
                  <div className="lp-reviewer-role">Tennis player</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="lp-section">
        <div className="lp-wrap">
          <div className="lp-section-header">
            <span className="lp-label">05 / FAQ</span>
            <h2>Good to know</h2>
          </div>

          <div className="lp-faq-grid">
            <div className="lp-faq-item">
              <h3>Who can join my match?</h3>
              <p>Any registered player on Knowora can request to join. The host can confirm players, and the community can upvote the most reliable ones.</p>
            </div>
            <div className="lp-faq-item">
              <h3>How do I earn points?</h3>
              <p>You earn points for every match you play. Upvotes give bonus points. Gold plan users earn 5× points per match.</p>
            </div>
            <div className="lp-faq-item">
              <h3>Do I need a card for the free plan?</h3>
              <p>No. The Free plan gives you instant access with zero payment required. Just sign up and start playing.</p>
            </div>
            <div className="lp-faq-item">
              <h3>How is payment processed?</h3>
              <p>Payments run through Razorpay — India's leading payment gateway. Cards, UPI, and net banking are all supported.</p>
            </div>
            <div className="lp-faq-item">
              <h3>Is my data safe?</h3>
              <p>Auth runs on Firebase, profile photos on Storj, and payments on Razorpay. Your data is always secure.</p>
            </div>
            <div className="lp-faq-item">
              <h3>Is there an admin panel?</h3>
              <p>Yes — admin accounts can manage users, view all matches and requests, and moderate content with full role-based access.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="lp-cta-section">
        <div className="lp-wrap lp-cta-inner">
          <h2>Ready to play your next match?</h2>
          <p>Join Knowora today — post or join your first match for free, no card needed.</p>
          <div className="lp-cta-actions">
            <Link to="/signup" className="lp-btn-primary lp-btn-lg">Create a free account</Link>
            <Link to="/login" className="lp-btn-outline lp-btn-lg lp-btn-light">Already have an account?</Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="lp-footer">
        <div className="lp-wrap lp-footer-inner">
          <div className="lp-footer-brand">
            <span className="lp-brand-mark">K</span>
            Knowora
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
          <span>© 2026 Knowora. Built with React, Firebase &amp; Razorpay.</span>
        </div>
      </footer>

    </div>
  );
}

export default Landing;