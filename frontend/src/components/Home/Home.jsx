// frontend/src/components/Home/Home.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import './Home.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlay,
  faArrowRight,
  faArrowRightToBracket,
  faBolt,
  faUsers,
  faTrophy,
  faBrain,
  faClock,
  faShieldHalved,
  faCalendar,
  faCircle,
  faCodeBranch,
  faBuildingColumns,
  faMicrochip,
  faLock,
  faFire,
  faCheckCircle,
  faFileCode
} from "@fortawesome/free-solid-svg-icons";
import { useNavigate } from 'react-router-dom';
import BackgroundPaths from '../BackgroundPaths/BackgroundPaths';
import '../BackgroundPaths/BackgroundPaths.css';
import { fetchPracticeProblems } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import Footer from '../Common/Footer/Footer';
import HeroCodeEditor from '../LandingPage/HeroCodeEditor';
import BrandIntro from '../BrandIntro/BrandIntro';
import CircularTestimonials from '../ui/circular-testimonials';
import logoIcon from '../../assets/algofight-logo.png';

const testimonialsData = [
  {
    quote: "AlgoFight's real-time battles push me out of my comfort zone every day. The adrenaline, live telemetry, and instant compiler feedback are real.",
    name: "Palash Rai",
    designation: "Top 1% Global Grandmaster",
    src: "/testimonials/palash.png",
  },
  {
    quote: "The best platform to level up problem solving speed and compete with elite coders under live pressure. HMAC anti-cheat is truly top-tier.",
    name: "Sneha",
    designation: "5★ Problem Solver • Rank 42",
    src: "/testimonials/sneha.png",
  },
  {
    quote: "Clean cyber UI, fair matches, and zero-lag WebSocket sync. The synchronized 1v1 arenas make competitive programming feel like true esports.",
    name: "Prateek Amar Batham",
    designation: "Competitive Programmer • Tier 1",
    src: "/testimonials/prateek.png",
  },
  {
    quote: "Sub-second execution with automated judging changed how our team prepares for collegiate coding hackathons and technical rounds.",
    name: "Sarvesh Baghel",
    designation: "Collegiate ICPC Finalist",
    src: "/testimonials/sarvesh.png",
  },
  {
    quote: "The 1v1 duel format creates unbeatable focus. You don't just solve algorithms, you master them under pressure.",
    name: "Aishwary Pahariya",
    designation: "Senior Systems Engineer",
    src: "/testimonials/aishwary.png",
  }
];

const featureCards = [
  {
    title: 'Real-Time 1v1 Duels',
    copy: 'Head-to-head algorithmic combat with synchronized room lifecycles, live opponent progress, and dynamic Elo ratings.',
    icon: faBolt,
    tone: 'tone-cyan',
  },
  {
    title: 'Multiplayer Lobbies',
    copy: 'Host private arenas for up to 100 players with configurable problem sets, dynamic difficulty, and live scoreboards.',
    icon: faBuildingColumns,
    tone: 'tone-purple',
  },
  {
    title: 'Anti-Cheat Integrity',
    copy: 'Strict competitive integrity with automated plagiarism detection, sealed judge test suites, and fair-play enforcement.',
    icon: faLock,
    tone: 'tone-pink',
  },
  {
    title: 'Execution Sandboxes',
    copy: 'Hardware-isolated execution environments supporting C++, Python, Java, and JavaScript with sub-second feedback.',
    icon: faMicrochip,
    tone: 'tone-green',
  },
  {
    title: 'Combatant Badges',
    copy: 'Showcase your achievements, custom title banners, verified match credentials, and seasonal victory emblems.',
    icon: faShieldHalved,
    tone: 'tone-gold',
  },
  {
    title: 'Global Leaderboards',
    copy: 'Climb through official competitive tiers from Rookie to Grandmaster with live match analytics and Hall of Fame standings.',
    icon: faTrophy,
    tone: 'tone-yellow',
  },
];

function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [featuredProblems, setFeaturedProblems] = useState([]);
  const [loadingProblems, setLoadingProblems] = useState(true);
  const [showIntro, setShowIntro] = useState(() => {
    if (typeof window !== 'undefined') {
      return !sessionStorage.getItem('af_brand_intro_played');
    }
    return false;
  });

  useEffect(() => {
    const getProblems = async () => {
      try {
        setLoadingProblems(true);
        const data = await fetchPracticeProblems({ limit: 50, mode: 'practice' });
        const problemsList = data?.problems || [];
        const shuffled = [...problemsList].sort(() => 0.5 - Math.random());
        setFeaturedProblems(shuffled.slice(0, 3));
      } catch (err) {
        console.error("Error fetching featured problems:", err);
      } finally {
        setLoadingProblems(false);
      }
    };
    getProblems();
  }, []);

  return (
    <BackgroundPaths>
      {/* Brand First-Load Reveal Animation */}
      {showIntro && <BrandIntro onComplete={() => setShowIntro(false)} />}

      {/* Floating decorative code symbol */}
      <motion.div 
        className="bg-floating-code-symbol"
        animate={{ 
          y: [0, -12, 0],
          opacity: [0.22, 0.38, 0.22]
        }}
        transition={{ 
          duration: 6, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
      >
        &lt;/&gt;
      </motion.div>

      <div className="home-container">
        {/* ================= HERO SECTION ================= */}
        <motion.div
          className="hero-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="hero-left">
            {/* Logo with gentle floating levitation */}
            <motion.div 
              className="algofight-hero-logo-wrapper"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
              whileHover={{ scale: 1.06 }}
              onClick={() => navigate('/')}
            >
              <img 
                src={logoIcon} 
                alt="AlgoFight Logo" 
                className="hero-brand-logo-image"
              />
            </motion.div>

            <div className="hero-badge">
              <span className="badge-pulse-dot" />
              <span>COMPETITIVE PROGRAMMING REDEFINED</span>
            </div>

            <h1 className="hero-heading">
              <span className="text-white">CODE.{' '}</span>
              <span className="text-cyan-gradient battle-glow-word">BATTLE.{' '}</span>
              <span className="text-pink">DOMINATE.</span>
            </h1>

            <p className="hero-description">
              AlgoFight is the next-generation competitive coding arena where developers practice with intent, duel in real-time under pressure, and accelerate algorithmic mastery.
            </p>

            <div className="hero-buttons">
              <button className="btn-primary-glow" onClick={() => navigate("/battle")}>
                <FontAwesomeIcon icon={faBolt} className="btn-icon" /> Start Competing
              </button>
              <button className="btn-secondary-glass" onClick={() => navigate("/practice")}>
                <FontAwesomeIcon icon={faCodeBranch} className="btn-icon-left" /> Practice Arena
              </button>
              {!user && (
                <button className="btn-primary-login" onClick={() => navigate("/login")}>
                  <FontAwesomeIcon icon={faArrowRightToBracket} className="btn-icon" />
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </div>

          <div className="hero-right">
            <HeroCodeEditor />
          </div>
        </motion.div>

        {/* ================= STATS / METRICS STRIP ================= */}
        <motion.section 
          className="stats-strip-container"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="stat-card-glass">
            {/* Stat 1 */}
            <div className="stat-block-item">
              <div className="stat-icon-wrapper">
                <FontAwesomeIcon icon={faUsers} className="stat-icon-cyan" />
              </div>
              <div className="stat-meta">
                <div className="stat-number stat-pink">50K+</div>
                <div className="stat-label">ACTIVE COMBATANTS</div>
              </div>
            </div>

            <div className="stat-divider" />

            {/* Stat 2 */}
            <div className="stat-block-item">
              <div className="stat-icon-wrapper">
                <FontAwesomeIcon icon={faFileCode} className="stat-icon-cyan" />
              </div>
              <div className="stat-meta">
                <div className="stat-number stat-cyan">2M+</div>
                <div className="stat-label">SUBMISSIONS JUDGED</div>
              </div>
            </div>

            <div className="stat-divider" />

            {/* Stat 3 */}
            <div className="stat-block-item">
              <div className="stat-icon-wrapper">
                <FontAwesomeIcon icon={faBolt} className="stat-icon-yellow" />
              </div>
              <div className="stat-meta">
                <div className="stat-number stat-yellow">&lt; 6MS</div>
                <div className="stat-label">GATEWAY LATENCY</div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* ================= FEATURED PROBLEMS ================= */}
        <motion.section
          className="competitions-section home-panel"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="comp-header-row">
            <div>
              <div className="pre-heading">HANDPICKED CHALLENGES</div>
              <h2 className="home-section-title">Prove Your <span className="text-yellow-gradient">Skills</span></h2>
            </div>
            <button className="btn-dark btn-view-all" onClick={() => navigate('/practice')}>
              <FontAwesomeIcon icon={faCodeBranch} /> View All Problems
            </button>
          </div>

          <div className="comp-grid">
            {!loadingProblems && featuredProblems.length > 0 ? featuredProblems.map((problem) => {
              const problemId = problem.id || problem._id;
              const diff = (problem.difficulty || "Medium").toLowerCase();
              return (
                <motion.article
                  key={problemId}
                  className="comp-card"
                  whileHover={{ y: -5 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="comp-card-top">
                    <h3 className="comp-title">{problem.title}</h3>
                    <span className={`comp-tag diff-${diff}`}>
                      {problem.difficulty || "Medium"}
                    </span>
                  </div>

                  <p className="comp-snippet">
                    {problem.statement || problem.description 
                      ? (problem.statement || problem.description).substring(0, 110) + '...'
                      : 'Challenge your algorithmic thinking with this classic problem designed to test speed and accuracy.'}
                  </p>

                  <button
                    className="btn-card-action"
                    onClick={() => navigate('/practice/' + problemId)}
                  >
                    <span>Solve Problem</span>
                    <FontAwesomeIcon icon={faArrowRight} />
                  </button>
                </motion.article>
              );
            }) : (
              <div className="problems-loading-box">
                <div className="loader-ring" />
                <p>Scanning battle archives for challenges...</p>
              </div>
            )}
          </div>
        </motion.section>

        {/* ================= FEATURES SECTION ================= */}
        <motion.section
          className="features-section home-panel"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="pre-heading">PLATFORM CAPABILITIES</div>
          <h2 className="home-section-title">Engineered For <span className="text-cyan-gradient">Champions</span></h2>

          <div className="features-grid">
            {featureCards.map((feature) => (
              <motion.article
                key={feature.title}
                className="feature-card"
                whileHover={{ y: -5 }}
                transition={{ duration: 0.2 }}
              >
                <div className={`feature-icon ${feature.tone}`}>
                  <FontAwesomeIcon icon={feature.icon} />
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.copy}</p>
              </motion.article>
            ))}
          </div>
        </motion.section>

        {/* ================= TESTIMONIALS SECTION ================= */}
        <motion.section 
          className="combatants-feedback-section home-panel"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="feedback-header">
            <div className="pre-heading">TRUSTED BY DEVELOPERS WORLDWIDE</div>
            <h2 className="home-section-title">
              WHAT <span className="text-cyan-gradient">COMBATANTS</span> SAY
            </h2>
          </div>

          <div className="circular-testimonials-wrapper">
            <CircularTestimonials
              testimonials={testimonialsData}
              autoplay={true}
              colors={{
                name: "#00e5ff",
                designation: "#94a3b8",
                testimony: "#f1f5f9",
                arrowBackground: "rgba(0, 229, 255, 0.12)",
                arrowForeground: "#00e5ff",
                arrowHoverBackground: "#00e5ff",
              }}
              fontSizes={{
                name: "1.75rem",
                designation: "0.95rem",
                quote: "1.15rem",
              }}
            />
          </div>
        </motion.section>

        {/* ================= CTA SECTION ================= */}
        <motion.section
          className="cta-section"
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="cta-glass">
            <div className="cta-glow-bg" />
            <h2 className="cta-heading">Ready to <span className="text-purple">Level Up?</span></h2>
            <p className="cta-description">Join thousands of developers sharpening their algorithmic instincts and climbing global leaderboards in real time.</p>
            <div className="cta-buttons">
              {user ? (
                <>
                  <button className="btn-primary-glow" onClick={() => navigate('/battle')}>
                    Start Duels <FontAwesomeIcon icon={faArrowRight} />
                  </button>
                  <button className="btn-secondary-glass" onClick={() => navigate('/developer')}>
                    Meet Our Developers <FontAwesomeIcon icon={faArrowRight} />
                  </button>
                </>
              ) : (
                <>
                  <button className="btn-primary-glow" onClick={() => navigate('/signup')}>
                    Create Free Account <FontAwesomeIcon icon={faArrowRight} />
                  </button>
                  <button className="btn-secondary-glass" onClick={() => navigate('/login')}>
                    Sign In
                  </button>
                </>
              )}
              <button className="btn-secondary-glass" onClick={() => navigate('/practice')}>
                Explore Problems
              </button>
            </div>
            <p className="cta-subtext">⚡ Instant access. Start dueling in seconds.</p>
          </div>
        </motion.section>
      </div>

      {/* Shared Unified Footer */}
      <Footer />
    </BackgroundPaths>
  );
}

export default Home;
