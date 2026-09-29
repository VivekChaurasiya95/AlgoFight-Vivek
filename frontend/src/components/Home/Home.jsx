import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './Home.css';
import heroCharacterVideo from '../../assets/watermark-removed-gemini_generated_video_a46fd70e.mp4';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlay,
  faArrowRight,
  faArrowDown,
  faBolt,
  faUsers,
  faTrophy,
  faFire,
  faCode,
  faPlus,
  faBullhorn
} from "@fortawesome/free-solid-svg-icons";
import { useNavigate } from 'react-router-dom';
import BackgroundPaths from '../BackgroundPaths/BackgroundPaths';
import '../BackgroundPaths/BackgroundPaths.css';
import { useAuth } from '../../contexts/AuthContext';
import Footer from '../Common/Footer/Footer';
import BrandIntro from '../BrandIntro/BrandIntro';

const mockAvatars = [
  "/testimonials/palash.png",
  "/testimonials/sneha.png",
  "/testimonials/prateek.png",
];

const publicNewsData = [
  {
    id: 1,
    tag: "TOURNAMENT",
    title: "Weekend 1v1 Blitz Series",
    desc: "Ranked algorithmic duels open Saturday 8 PM IST. Earn Season 4 title banners.",
    action: "Join Duel",
    link: "/battle",
  },
  {
    id: 2,
    tag: "ARENA 2.0",
    title: "Direct 1v1 Battles Active",
    desc: "Real-time presence directory, sub-second execution sandboxes, and Elo telemetry are live.",
    action: "View Players",
    link: "/battle",
  },
  {
    id: 3,
    tag: "INTEGRITY",
    title: "Anti-Cheat Engine v2.4",
    desc: "Automated plagiarism detection & sealed judging test suites deployed.",
    action: "Practice Now",
    link: "/practice",
  },
  {
    id: 4,
    tag: "COMMUNITY",
    title: "Global Hall of Fame",
    desc: "Climb from Rookie to Grandmaster with live match analytics and seasonal badges.",
    action: "Leaderboard",
    link: "/leaderboard",
  },
];

const dynamicWords = [
  { w1: "SHARP", w2: "MINDS", c1: "dynamic-pink", c2: "dynamic-cyan" },
  { w1: "ELITE", w2: "CODERS", c1: "dynamic-gold", c2: "dynamic-purple" },
  { w1: "FUTURE", w2: "MASTERS", c1: "dynamic-cyan", c2: "dynamic-green" },
  { w1: "SPEED", w2: "DEMONS", c1: "dynamic-pink", c2: "dynamic-gold" },
  { w1: "CODE", w2: "WARRIORS", c1: "dynamic-purple", c2: "dynamic-cyan" },
];

const getInitials = (user) => {
  if (!user) return 'KD';
  const name = user.displayName?.trim() || user.username?.trim() || user.email?.split('@')[0] || 'KD';
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showIntro, setShowIntro] = useState(() => {
    if (typeof window !== 'undefined') {
      return !sessionStorage.getItem('af_brand_intro_played');
    }
    return false;
  });

  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % dynamicWords.length);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  const [newsIndex, setNewsIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setNewsIndex((prev) => (prev + 1) % publicNewsData.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  // Compute live user stats or sensible defaults
  const userRating = user?.rating ?? 0;
  const userWins = user?.wins ?? 0;
  const userLosses = user?.losses ?? 0;
  const totalBattles = userWins + userLosses;
  const winRate = totalBattles > 0 ? Math.round((userWins / totalBattles) * 100) : 0;
  const userRank = user?.highestRank && user.highestRank !== "ROOKIE" ? user.highestRank : "Unranked";
  const userSubmissions = user?.totalSubmissions ?? (userWins > 0 ? userWins * 2 : 0);

  return (
    <BackgroundPaths>
      {/* Brand First-Load Reveal Animation */}
      {showIntro && <BrandIntro onComplete={() => setShowIntro(false)} />}

      <div className="home-dashboard-wrapper">
        {/* ================= 3-COLUMN HERO DASHBOARD ================= */}
        <div className="home-hero-grid">
          
          {/* ========== LEFT COLUMN: STATS & COMMUNITY ========== */}
          <div className="hero-side-col hero-left-col">
            
            {/* Card 1: Global Rating with Proper Graph Structure */}
            <motion.div 
              className="dash-card rating-card"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              whileHover={{ y: -4 }}
            >
              <div className="dash-card-header">
                <div className="dash-card-title-group">
                  <div className="dash-icon-box icon-purple">
                    <FontAwesomeIcon icon={faTrophy} />
                  </div>
                  <span className="dash-card-title">Global Rating</span>
                </div>
                <span className="dash-pill-tag tag-purple">ELO RANKED</span>
              </div>

              <div className="rating-stat-row">
                <div className="dash-stat-big">{userRating}</div>
                <div className="rating-trend-badge">
                  <span className="rating-trend-arrow">▲</span> +142 pts
                </div>
              </div>
              <div className="dash-card-subtext">Compete • Improve • Climb</div>

              {/* Proper Graph Structure with Coordinates, Axes, and Grid Lines */}
              <div className="proper-graph-container">
                <svg className="proper-graph-svg" viewBox="0 0 250 74" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="eloGraphGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="45%" stopColor="#8b5cf6" />
                      <stop offset="100%" stopColor="#c084fc" />
                    </linearGradient>
                    <linearGradient id="eloGraphArea" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.32" />
                      <stop offset="70%" stopColor="#8b5cf6" stopOpacity="0.08" />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
                    </linearGradient>
                    <filter id="graphGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="2.5" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  {/* Horizontal Grid lines */}
                  <line x1="32" y1="16" x2="242" y2="16" className="graph-grid-line" />
                  <line x1="32" y1="34" x2="242" y2="34" className="graph-grid-line" />
                  <line x1="32" y1="52" x2="242" y2="52" className="graph-grid-line" />

                  {/* Y-axis Ticks & Labels */}
                  <text x="4" y="19" className="graph-axis-text">1.5k</text>
                  <text x="4" y="37" className="graph-axis-text">1.3k</text>
                  <text x="4" y="55" className="graph-axis-text">1.1k</text>

                  {/* Vertical Guideline at Live Match */}
                  <line x1="234" y1="12" x2="234" y2="52" className="graph-live-guide" />

                  {/* Gradient Area Fill Under Curve */}
                  <path
                    d="M 36,50 C 52,52 64,48 78,44 C 92,40 102,46 116,42 C 130,38 140,28 156,26 C 172,24 182,32 196,28 C 210,24 220,16 234,13 L 234,52 L 36,52 Z"
                    fill="url(#eloGraphArea)"
                  />

                  {/* Main Metric Trajectory Curve */}
                  <path
                    d="M 36,50 C 52,52 64,48 78,44 C 92,40 102,46 116,42 C 130,38 140,28 156,26 C 172,24 182,32 196,28 C 210,24 220,16 234,13"
                    fill="none"
                    stroke="url(#eloGraphGrad)"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    filter="url(#graphGlow)"
                  />

                  {/* Match Data Points */}
                  <circle cx="36" cy="50" r="2.5" className="graph-node-dot" />
                  <circle cx="78" cy="44" r="2.5" className="graph-node-dot" />
                  <circle cx="116" cy="42" r="2.5" className="graph-node-dot" />
                  <circle cx="156" cy="26" r="2.5" className="graph-node-dot" />
                  <circle cx="196" cy="28" r="2.5" className="graph-node-dot" />

                  {/* Live Endpoint Pulse */}
                  <circle cx="234" cy="13" r="6" className="graph-pulse-ring" />
                  <circle cx="234" cy="13" r="3.5" fill="#e879f9" className="graph-live-dot" />

                  {/* X-axis Match Ticks & Labels */}
                  <text x="36" y="67" textAnchor="middle" className="graph-x-label">M1</text>
                  <text x="88" y="67" textAnchor="middle" className="graph-x-label">M3</text>
                  <text x="140" y="67" textAnchor="middle" className="graph-x-label">M5</text>
                  <text x="190" y="67" textAnchor="middle" className="graph-x-label">M7</text>
                  <text x="234" y="67" textAnchor="middle" className="graph-x-label graph-x-live">LIVE</text>
                </svg>
              </div>
            </motion.div>

            {/* Card 2: Public News & Battle Updates Dispatch */}
            <motion.div 
              className="dash-card news-dispatch-card"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              whileHover={{ y: -4 }}
            >
              <div className="dash-card-header">
                <div className="dash-card-title-group">
                  <div className="dash-icon-box icon-cyan">
                    <FontAwesomeIcon icon={faBullhorn} />
                  </div>
                  <span className="dash-card-title">Battle Dispatch</span>
                </div>
                <span className="dash-pill-tag tag-cyan live-news-tag">
                  <span className="live-news-pulse" />
                  NEWS
                </span>
              </div>

              {/* Dynamic News Item with AnimatePresence */}
              <div className="news-content-box">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={newsIndex}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.28, ease: "easeOut" }}
                    className="news-item-body"
                  >
                    <div className="news-badge-row">
                      <span className="news-category-badge">
                        {publicNewsData[newsIndex].tag}
                      </span>
                      <span className="news-time-label">Active</span>
                    </div>

                    <h4 className="news-title">
                      {publicNewsData[newsIndex].title}
                    </h4>

                    <p className="news-snippet">
                      {publicNewsData[newsIndex].desc}
                    </p>

                    <div className="news-footer-row">
                      <div className="news-dots-group">
                        {publicNewsData.map((item, idx) => (
                          <button
                            key={item.id}
                            type="button"
                            className={`news-dot-btn ${idx === newsIndex ? 'active' : ''}`}
                            onClick={() => setNewsIndex(idx)}
                            aria-label={`Show news item ${idx + 1}`}
                          />
                        ))}
                      </div>

                      <button
                        type="button"
                        className="news-action-btn"
                        onClick={() => navigate(publicNewsData[newsIndex].link)}
                      >
                        <span>{publicNewsData[newsIndex].action}</span>
                        <FontAwesomeIcon icon={faArrowRight} className="news-btn-icon" />
                      </button>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Card 3: Total Players */}
            <motion.div 
              className="dash-card players-card"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              whileHover={{ y: -4 }}
            >
              <div className="dash-card-header">
                <div className="dash-card-title-group">
                  <div className="dash-icon-box icon-blue">
                    <FontAwesomeIcon icon={faUsers} />
                  </div>
                  <span className="dash-card-title">Total Players</span>
                </div>
              </div>

              <div className="players-card-bottom">
                <div className="players-stat-col">
                  <div className="dash-stat-big">100+</div>
                  <div className="dash-card-subtext">Join a growing community of coders.</div>
                </div>

                {/* Overlapping Avatar Stack */}
                <div className="avatar-stack">
                  {mockAvatars.map((src, i) => (
                    <img 
                      key={i} 
                      src={src} 
                      alt="Player Avatar" 
                      className="stack-avatar-img"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ))}
                  <div className="stack-avatar-more">
                    <FontAwesomeIcon icon={faPlus} />
                  </div>
                </div>
              </div>
            </motion.div>

          </div>

          {/* ========== CENTER COLUMN: HERO HEADLINE & 3D ANIMATED CHARACTERS ========== */}
          <div className="hero-center-col">
            
            {/* Monospace Kicker */}
            <motion.div 
              className="hero-kicker-tag"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="kicker-slash">//</span>
              <span className="kicker-word">CODE</span>
              <span className="kicker-cross">×</span>
              <span className="kicker-word">COMPETE</span>
              <span className="kicker-cross">×</span>
              <span className="kicker-word word-glow-cyan">GROW</span>
              <span className="kicker-slash">//</span>
            </motion.div>

            {/* Main Title */}
            <motion.h1 
              className="hero-main-heading"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.15 }}
            >
              ALGORITHMIC BATTLES<br />
              <span className="hero-for-text">FOR </span>
              <span className="dynamic-rotator-wrapper">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={wordIndex}
                    className="dynamic-word-pair"
                    initial={{ y: 20, opacity: 0, filter: "blur(6px)" }}
                    animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                    exit={{ y: -20, opacity: 0, filter: "blur(6px)" }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <span className={`hero-word-sharp ${dynamicWords[wordIndex].c1}`}>
                      {dynamicWords[wordIndex].w1}
                    </span>{" "}
                    <span className={`hero-word-minds ${dynamicWords[wordIndex].c2}`}>
                      {dynamicWords[wordIndex].w2}
                    </span>
                  </motion.span>
                </AnimatePresence>
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p 
              className="hero-main-subtext"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
            >
              Solve problems. Earn points. Climb the leaderboard.<br />
              Show the world what you're made of.
            </motion.p>

            {/* Action Buttons */}
            <motion.div 
              className="hero-action-buttons"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.35 }}
            >
              <button className="btn-hero-compete" onClick={() => navigate('/battle')}>
                <FontAwesomeIcon icon={faPlay} className="btn-play-icon" />
                <span>Start Competing</span>
              </button>
              <button className="btn-hero-practice" onClick={() => navigate('/practice')}>
                <FontAwesomeIcon icon={faCode} className="btn-code-icon" />
                <span>Practice Arena</span>
              </button>
            </motion.div>

            {/* 3D Animated Character Hero Video */}
            <motion.div 
              className="hero-video-container"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <div className="hero-video-glow" />
              <div className="hero-video-wrap">
                <video
                  className="hero-video-character"
                  src={heroCharacterVideo}
                  autoPlay
                  loop
                  muted
                  playsInline
                  controls={false}
                  preload="auto"
                />
                <div className="hero-video-vignette" />
              </div>
            </motion.div>

            {/* Scroll Indicator */}
            <motion.div 
              className="scroll-explore-pill"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <div className="scroll-arrow-circle">
                <FontAwesomeIcon icon={faArrowDown} />
              </div>
              <span>Scroll to explore</span>
            </motion.div>
          </div>

          {/* ========== RIGHT COLUMN: LIVE ARENA & QUICK STATS ========== */}
          <div className="hero-side-col hero-right-col">
            
            {/* Card 1: Live Arena */}
            <motion.div 
              className="dash-card live-arena-card"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              whileHover={{ y: -4 }}
            >
              <div className="dash-card-header">
                <div className="dash-card-title-group">
                  <div className="dash-icon-box icon-cyan-code">
                    <FontAwesomeIcon icon={faCode} />
                  </div>
                  <span className="dash-card-title">Live Arena</span>
                </div>
                <span className="live-status-pill">
                  <span className="live-pulse-node" />
                  <span>LIVE</span>
                </span>
              </div>

              <div className="dash-card-subtext arena-sub">Real-time coding battles</div>

              {/* VS Matchup Section */}
              <div className="arena-matchup-box">
                {/* You */}
                <div className="combatant-avatar-block">
                  <div className="combatant-circle user-circle">
                    {user?.photoURL ? (
                      <img src={user.photoURL} alt="User Avatar" className="combatant-img" />
                    ) : (
                      <span>{getInitials(user)}</span>
                    )}
                  </div>
                  <div className="combatant-meta">
                    <span className="c-name">You</span>
                    <span className="c-rank">{userRank}</span>
                  </div>
                </div>

                {/* VS Watermark */}
                <div className="vs-watermark-text">VS</div>

                {/* Opponent */}
                <div className="combatant-avatar-block">
                  <div className="combatant-circle opp-circle">
                    <span>?</span>
                  </div>
                  <div className="combatant-meta">
                    <span className="c-name">Opponent</span>
                    <span className="c-rank">Unranked</span>
                  </div>
                </div>
              </div>

              {/* Join Match Button */}
              <button className="btn-join-match" onClick={() => navigate('/battle')}>
                <span>Join Match</span>
                <FontAwesomeIcon icon={faArrowRight} />
              </button>
            </motion.div>

            {/* Card 2: Quick Stats */}
            <motion.div 
              className="dash-card quick-stats-card"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              whileHover={{ y: -4 }}
            >
              <div className="dash-card-header">
                <div className="dash-card-title-group">
                  <div className="dash-icon-box icon-trophy">
                    <FontAwesomeIcon icon={faTrophy} />
                  </div>
                  <span className="dash-card-title">Quick Stats</span>
                </div>
              </div>

              <div className="quick-stats-list">
                <div className="q-stat-row">
                  <div className="q-stat-label-group">
                    <FontAwesomeIcon icon={faTrophy} className="q-icon text-muted" />
                    <span>Battles Won</span>
                  </div>
                  <span className="q-stat-value">{userWins}</span>
                </div>

                <div className="q-stat-row">
                  <div className="q-stat-label-group">
                    <FontAwesomeIcon icon={faBolt} className="q-icon text-cyan" />
                    <span>Win Rate</span>
                  </div>
                  <span className="q-stat-value">{winRate}%</span>
                </div>

                <div className="q-stat-row">
                  <div className="q-stat-label-group">
                    <FontAwesomeIcon icon={faFire} className="q-icon text-pink" />
                    <span>Longest Streak</span>
                  </div>
                  <span className="q-stat-value">{userWins > 0 ? Math.min(userWins, 5) : 0}</span>
                </div>

                <div className="q-stat-row">
                  <div className="q-stat-label-group">
                    <FontAwesomeIcon icon={faCode} className="q-icon text-muted" />
                    <span>Total Submissions</span>
                  </div>
                  <span className="q-stat-value">{userSubmissions}</span>
                </div>
              </div>
            </motion.div>

            {/* Built for coders tagline */}
            <div className="hero-built-tagline">
              <span className="built-icon">&lt;/&gt;</span>
              <span>Built for coders. By coders.</span>
            </div>

          </div>

        </div>
      </div>

      {/* Shared Unified Footer */}
      <Footer />
    </BackgroundPaths>
  );
}

export default Home;
