import { Link } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import "../styles/landing.css";

function useCountUp(target, durationMs = 1200) {
  const [value, setValue] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const start = performance.now();
    const step = (now) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, durationMs]);

  return value;
}

function Landing() {
  const matchesCount = useCountUp(1240);
  const playersCount = useCountUp(8500);
  const citiesCount = useCountUp(42);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeLink, setActiveLink] = useState(null);
  const headerRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 12);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const measure = () => {
      if (headerRef.current) setHeaderHeight(headerRef.current.offsetHeight);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    const sectionIds = ["features", "how", "pricing", "reviews", "faq"];
    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveLink(entry.target.id);
          }
        });
      },
      {
        rootMargin: `-${headerHeight + 40}px 0px -60% 0px`,
        threshold: 0,
      }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [headerHeight]);

  const navLinks = [
    { id: "features", label: "Features" },
    { id: "how", label: "How it works" },
    { id: "pricing", label: "Pricing" },
    { id: "reviews", label: "Reviews" },
    { id: "faq", label: "FAQ" },
  ];

  return (
    <div className="lp">

      {/* HEADER */}
      <header
        ref={headerRef}
        className="lp-header"
        style={{
          ...(isScrolled
            ? {
                backgroundColor: "rgba(10,12,20,0.92)",
                backdropFilter: "blur(10px)",
                boxShadow: "0 2px 16px rgba(0,0,0,0.25)",
              }
            : {}),
          transition: "background-color 0.25s ease, box-shadow 0.25s ease",
        }}
      >
        <div className="lp-nav-inner">
          <Link
            to="/"
            className="lp-brand"
            style={isScrolled ? { color: "#ffffff" } : undefined}
          >
            <span className="lp-brand-mark">K</span>
            Knowora
          </Link>

          <nav className="lp-nav-links">
            {navLinks.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                onClick={() => setActiveLink(link.id)}
                className={activeLink === link.id ? "lp-nav-active" : ""}
                style={isScrolled ? { color: "rgba(255,255,255,0.8)" } : undefined}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="lp-nav-cta">
            <Link
              to="/login"
              className="lp-btn-ghost"
              style={
                isScrolled
                  ? { color: "#ffffff", borderColor: "rgba(255,255,255,0.4)" }
                  : undefined
              }
            >
              Log in
            </Link>
            <Link to="/dashboard" className="lp-btn-primary">Get started</Link>
          </div>
        </div>
      </header>

      <div style={{ height: headerHeight }} aria-hidden="true" />

      {/* HERO */}
      <section
        className="lp-hero"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(8,12,24,0.78) 0%, rgba(8,12,24,0.88) 55%, rgba(8,12,24,0.96) 100%), url('https://images.pexels.com/photos/16588259/pexels-photo-16588259.jpeg?auto=compress&cs=tinysrgb&w=1920&q=80')",
          backgroundSize: "cover",
          backgroundPosition: "center 30%",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="lp-wrap lp-hero-inner">
          <div className="lp-pill">🏆 Play · Match · Compete · Win</div>

          <h1 className="lp-hero-h1" style={{ color: "#ffffff" }}>
            Find your next game,<br />
            <span className="lp-gradient-text">meet your perfect match</span>
          </h1>

          <p className="lp-hero-sub" style={{ color: "rgba(255,255,255,0.85)" }}>
            Post a match, join a game near you, and get matched with players
            at your skill level — across any sport. Knowora is your
            community-powered sports matchmaking hub.
          </p>

          <div className="lp-hero-actions">
            <Link to="/dashboard" className="lp-btn-primary lp-btn-lg">
              Start for free — no card needed
            </Link>
            <Link
              to="/login"
              className="lp-btn-outline lp-btn-lg"
              style={{
                color: "#ffffff",
                borderColor: "rgba(255,255,255,0.7)",
                backgroundColor: "transparent",
              }}
            >
              Log in to your account
            </Link>
          </div>

          <div className="lp-hero-trust" style={{ color: "rgba(255,255,255,0.75)" }}>
            <span className="lp-trust-item">
              <span className="lp-check">✓</span> Free plan — instant access
            </span>
            <span className="lp-trust-sep">|</span>
            <span className="lp-trust-item">
              <span className="lp-check">✓</span> Any sport, any city
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
            <div className="lp-stat-num">{matchesCount.toLocaleString("en-IN")}+</div>
            <div className="lp-stat-label">Matches hosted</div>
          </div>
          <div className="lp-stat">
            <div className="lp-stat-num">{playersCount.toLocaleString("en-IN")}+</div>
            <div className="lp-stat-label">Players on Knowora</div>
          </div>
          <div className="lp-stat">
            <div className="lp-stat-num">{citiesCount}</div>
            <div className="lp-stat-label">Cities and counting</div>
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
                <li>Role-based join requests</li>
                <li>Approve players yourself</li>
              </ul>
            </div>

            <div
              className="lp-feature-card lp-feature-card--highlight"
              style={{
                backgroundImage:
                  "linear-gradient(160deg, rgba(30,10,50,0.88) 0%, rgba(20,8,40,0.93) 100%), url('https://images.pexels.com/photos/2202685/pexels-photo-2202685.jpeg?auto=compress&cs=tinysrgb&w=1200&q=80')",
                backgroundSize: "cover",
                backgroundPosition: "center",
                color: "#ffffff",
              }}
            >
              <div className="lp-feature-ico lp-ico-purple">🤝</div>
              <h3 style={{ color: "#ffffff" }}>Join and earn</h3>
              <p style={{ color: "rgba(255,255,255,0.85)" }}>Join matches hosted by others. Earn points for every game you play, and build your reputation on the platform.</p>
              <ul className="lp-feature-list" style={{ color: "rgba(255,255,255,0.85)" }}>
                <li>Points for every match played</li>
                <li>Sport-specific role selection</li>
                <li>Player leaderboard</li>
                <li>Skill-level badges</li>
              </ul>
            </div>

            <div className="lp-feature-card">
              <div className="lp-feature-ico lp-ico-green">🥇</div>
              <h3>Live scoreboards</h3>
              <p>Gold members can run a live scoreboard for their match — team scores, winner, and per-player stats, visible to everyone.</p>
              <ul className="lp-feature-list">
                <li>Real-time score updates</li>
                <li>Per-player stat tracking</li>
                <li>Shareable match summary</li>
                <li>Profile data download</li>
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
                <p>Post a game in your sport, or browse open matches nearby and request to join at your role.</p>
              </div>
            </div>
            <div className="lp-step-arrow">→</div>
            <div className="lp-step">
              <div className="lp-step-num">03</div>
              <div className="lp-step-body">
                <h3>Play and rank up</h3>
                <p>Get points for every match played. Track live scores, climb the leaderboard, and build your reputation.</p>
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
                <li><span className="lp-check">✓</span> Post &amp; join matches</li>
                <li><span className="lp-check">✓</span> 5 joins / 1 organize per month</li>
                <li><span className="lp-check">✓</span> Profile management</li>
                <li><span className="lp-check">✓</span> No card required</li>
                <li className="lp-feature-off"><span className="lp-cross">✗</span> Points earning</li>
                <li className="lp-feature-off"><span className="lp-cross">✗</span> Silver badge</li>
                <li className="lp-feature-off"><span className="lp-cross">✗</span> Live scoreboards</li>
                <li className="lp-feature-off"><span className="lp-cross">✗</span> 25% off sports equipment</li>
              </ul>
              <Link to="/dashboard" className="lp-plan-btn">Get started free</Link>
            </div>

            <div className="lp-plan lp-plan--featured">
              <div className="lp-plan-badge">Most popular</div>
              <div className="lp-plan-header">
                <span className="lp-plan-name">Silver</span>
                <div className="lp-plan-price">₹199</div>
                <div className="lp-plan-dur">1 month access</div>
              </div>
              <ul className="lp-plan-features">
                <li><span className="lp-check">✓</span> Post &amp; join matches</li>
                <li><span className="lp-check">✓</span> 10 joins / 2 organizes per month</li>
                <li><span className="lp-check">✓</span> Profile management</li>
                <li className="lp-feature-off"><span className="lp-cross">✗</span> No card required</li>
                <li><span className="lp-check">✓</span> 2× points earning</li>
                <li><span className="lp-check">✓</span> Silver badge</li>
                <li className="lp-feature-off"><span className="lp-cross">✗</span> Live scoreboards</li>
                <li className="lp-feature-off"><span className="lp-cross">✗</span> 25% off sports equipment</li>
              </ul>
              <Link to="/dashboard" className="lp-plan-btn lp-plan-btn--primary">Choose Silver</Link>
            </div>

            <div className="lp-plan lp-plan--gold">
              <div className="lp-plan-header">
                <span className="lp-plan-name">Gold</span>
                <div className="lp-plan-price">₹499</div>
                <div className="lp-plan-dur">2 months access</div>
              </div>
              <ul className="lp-plan-features">
                <li><span className="lp-check lp-check--gold">✓</span> Post &amp; join matches</li>
                <li><span className="lp-check lp-check--gold">✓</span> Unlimited joins, 10 organizes</li>
                <li><span className="lp-check lp-check--gold">✓</span> Profile management</li>
                <li className="lp-feature-off"><span className="lp-cross">✗</span> No card required</li>
                <li><span className="lp-check lp-check--gold">✓</span> 5× points earning</li>
                <li><span className="lp-check lp-check--gold">✓</span> Silver badge</li>
                <li><span className="lp-check lp-check--gold">✓</span> Live scoreboards</li>
                <li><span className="lp-check lp-check--gold">✓</span> 25% off sports equipment</li>
              </ul>
              <Link to="/dashboard" className="lp-plan-btn lp-plan-btn--gold">Choose Gold</Link>
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
              <p className="lp-review-text">"I love hosting matches here — I earn points and actually get a full team together in minutes. The live scoreboard makes it feel official."</p>
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
              <p>Any registered player on Knowora can request to join with their role. You confirm players, and points are awarded once approved.</p>
            </div>
            <div className="lp-faq-item">
              <h3>How do I earn points?</h3>
              <p>You earn points for every match you play or host. Gold plan users earn 5× points per match.</p>
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
              <h3>What's a live scoreboard?</h3>
              <p>Gold organizers can post team scores and per-player stats during a match — everyone watching sees it update instantly.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section
        className="lp-cta-section"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(6,10,20,0.85) 0%, rgba(6,10,20,0.92) 100%), url('https://images.pexels.com/photos/30651230/pexels-photo-30651230.jpeg?auto=compress&cs=tinysrgb&w=1920&q=80')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="lp-wrap lp-cta-inner">
          <h2 style={{ color: "#ffffff" }}>Ready to play your next match?</h2>
          <p style={{ color: "rgba(255,255,255,0.85)" }}>Join Knowora today — post or join your first match for free, no card needed.</p>
          <div className="lp-cta-actions">
            <Link to="/dashboard" className="lp-btn-primary lp-btn-lg">Create a free account</Link>
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