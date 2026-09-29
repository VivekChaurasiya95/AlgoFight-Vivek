// frontend/src/components/Home/Home.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
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
  faPlus
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
            
            {/* Card 1: Global Rating */}
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

              <div className="dash-stat-big">{userRating}</div>
              <div className="dash-card-subtext">Compete • Improve • Climb</div>

              {/* Glowing Sparkline Graph */}
              <div className="sparkline-wrapper">
                <svg className="sparkline-svg" viewBox="0 0 240 50">
                  <defs>
                    <linearGradient id="sparklineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                      <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#a855f7" stopOpacity="1" />
                    </linearGradient>
                    <linearGradient id="sparklineArea" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.18" />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
                    </linearGradient>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>
                  <path
                    d="M 8,38 C 45,39 60,36 90,34 C 120,32 140,24 170,27 C 195,29 215,18 232,13 L 232,48 L 8,48 Z"
                    fill="url(#sparklineArea)"
                  />
                  <path 
                    d="M 8,38 C 45,39 60,36 90,34 C 120,32 140,24 170,27 C 195,29 215,18 232,13" 
                    fill="none" 
                    stroke="url(#sparklineGrad)" 
                    strokeWidth="2.5" 
                    strokeLinecap="round"
                    filter="url(#glow)"
                  />
                  <circle cx="8" cy="38" r="2.5" fill="#60a5fa" />
                  <circle cx="90" cy="34" r="2.5" fill="#818cf8" />
                  <circle cx="170" cy="27" r="2.5" fill="#a78bfa" />
                  <circle cx="232" cy="13" r="4.5" fill="#c084fc" className="sparkline-pulse-node" />
                </svg>
              </div>
            </motion.div>

            {/* Card 2: Win Rate */}
            <motion.div 
              className="dash-card winrate-card"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              whileHover={{ y: -4 }}
            >
              <div className="dash-card-header">
                <div className="dash-card-title-group">
                  <div className="dash-icon-box icon-cyan">
                    <FontAwesomeIcon icon={faBolt} />
                  </div>
                  <span className="dash-card-title">Win Rate</span>
                </div>
                <span className="dash-pill-tag tag-muted">{(userRank || 'UNRANKED').toUpperCase()}</span>
              </div>

              <div className="dash-stat-big">{winRate}%</div>
              <div className="dash-card-subtext">
                {totalBattles > 0 ? `${userWins} won out of ${totalBattles} battles.` : 'Still preparing for your first battle.'}
              </div>

              {/* Progress Bar */}
              <div className="dash-progress-track">
                <motion.div 
                  className="dash-progress-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(winRate, 8)}%` }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                >
                  <span className="dash-progress-dot" />
                </motion.div>
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
              <span className="kicker-slash">//</span> CODE <span className="kicker-cross">×</span> COMPETE <span className="kicker-cross">×</span> <span className="text-cyan">GROW</span> <span className="kicker-slash">//</span>
            </motion.div>

            {/* Main Title */}
            <motion.h1 
              className="hero-main-heading"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.15 }}
            >
              ALGORITHMIC BATTLES<br />
              FOR <span className="hero-word-sharp">SHARP</span> <span className="hero-word-minds">MINDS</span>
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
