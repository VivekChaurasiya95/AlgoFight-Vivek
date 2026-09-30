import React, { useState, useEffect, useMemo } from 'react';
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
  faBullhorn,
  faGift,
  faCoins,
  faTicket,
  faLaptopCode,
  faBriefcase,
  faRocket,
  faCheckCircle,
  faClock
} from "@fortawesome/free-solid-svg-icons";
import { useNavigate } from 'react-router-dom';
import BackgroundPaths from '../BackgroundPaths/BackgroundPaths';
import '../BackgroundPaths/BackgroundPaths.css';
import { useAuth } from '../../contexts/AuthContext';
import Footer from '../Common/Footer/Footer';
import BrandIntro from '../BrandIntro/BrandIntro';
import { fetchPublicRooms, fetchPlatformStats, fetchShowcaseFeedback } from '../../services/api';
import { connectSocket } from '../../services/socket';
import { getSessionToken } from '../../services/authStorage';
import CreateRoomModal from '../Battle/CreateRoomModal';
import { calculateArenaPointBreakdown } from '../../utils/playerMetrics';

const coderTestimonialsData = [
  {
    id: 1,
    name: "Palash Rai",
    role: "Top 1% Grandmaster",
    avatar: "/testimonials/palash.png",
    rating: "2140 ELO",
    quote: "AlgoFight's real-time battles push me out of my comfort zone every day. The live telemetry and instant compiler feedback are insane.",
  },
  {
    id: 2,
    name: "Sneha",
    role: "5★ Problem Solver",
    avatar: "/testimonials/sneha.png",
    rating: "1980 ELO",
    quote: "The best platform to level up problem solving speed and compete with elite coders under live pressure. HMAC judging is top-tier.",
  },
  {
    id: 3,
    name: "Prateek Amar Batham",
    role: "Competitive Programmer",
    avatar: "/testimonials/prateek.png",
    rating: "1850 ELO",
    quote: "Clean cyber UI, fair matches, and zero-lag WebSocket sync. The synchronized 1v1 arenas make competitive programming feel like esports.",
  },
  {
    id: 4,
    name: "Sarvesh Baghel",
    role: "ICPC Finalist",
    avatar: "/testimonials/sarvesh.png",
    rating: "2010 ELO",
    quote: "Sub-second execution with automated judging changed how our team prepares for collegiate hackathons and technical interviews.",
  },
  {
    id: 5,
    name: "Aishwary Pahariya",
    role: "Senior Systems Engineer",
    avatar: "/testimonials/aishwary.png",
    rating: "1920 ELO",
    quote: "The 1v1 duel format creates unbeatable focus. You don't just solve algorithms, you master them under high pressure.",
  },
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

const coderOffersData = [
  {
    id: "off_amazon",
    title: "Amazon $50 E-Gift Card",
    category: "Marketplace",
    categoryTag: "MARKETPLACE",
    cost: 1000,
    statusText: "Active Perk",
    isUpcoming: false,
    desc: "Redeem credits from $10 to $500 for dev books, hardware gear, or pro software.",
    perkHighlight: "$50 Instant Voucher",
    link: "/rewards",
    actionText: "Claim Perk",
    tone: "pink",
    icon: faGift,
  },
  {
    id: "off_hackathon",
    title: "Hackathon Entry Pass",
    category: "Competition",
    categoryTag: "SPONSORED PASS",
    cost: 1500,
    statusText: "Sponsored Seat",
    isUpcoming: false,
    desc: "Full entry sponsorship to tier-1 developer hackathons and algorithm championships.",
    perkHighlight: "100% Entry Covered",
    link: "/rewards",
    actionText: "Redeem Pass",
    tone: "cyan",
    icon: faTicket,
  },
  {
    id: "off_tools",
    title: "Premium Dev Toolkits",
    category: "Productivity",
    categoryTag: "DEV TOOLS",
    cost: 2500,
    statusText: "Dev License",
    isUpcoming: false,
    desc: "Unlock annual pro IDE subscriptions, AI copilots, and sandbox acceleration tools.",
    perkHighlight: "Annual Pro Access",
    link: "/rewards",
    actionText: "Unlock License",
    tone: "blue",
    icon: faLaptopCode,
  },
  {
    id: "off_internship",
    title: "Tech Internship Track",
    category: "Career",
    categoryTag: "CAREER FAST-TRACK",
    cost: 5000,
    statusText: "Direct Referral",
    isUpcoming: false,
    desc: "Priority screening & direct interview referrals with top partner tech companies.",
    perkHighlight: "Priority Shortlist",
    link: "/rewards",
    actionText: "View Track",
    tone: "gold",
    icon: faBriefcase,
  },
  {
    id: "off_vault",
    title: "Course Subscription Vault",
    category: "Learning",
    categoryTag: "COMING SOON",
    cost: 3000,
    statusText: "Upcoming Drop",
    isUpcoming: true,
    dropDate: "Drops Next Month",
    desc: "Curated masterclasses in Advanced DSA, System Design, and Competitive Programming.",
    perkHighlight: "Lifetime Access",
    link: "/rewards",
    actionText: "Preview Drop",
    tone: "purple",
    icon: faCode,
  },
  {
    id: "off_hardware",
    title: "Hardware Rewards Drop",
    category: "Hardware",
    categoryTag: "SEASON 4 LOOT",
    cost: 7500,
    statusText: "Hardware Loot",
    isUpcoming: true,
    dropDate: "Season 4 Finals",
    desc: "Mechanical tactile keyboards, high-refresh esports monitors, and creator gear.",
    perkHighlight: "Custom Rig Drop",
    link: "/rewards",
    actionText: "View Hardware",
    tone: "teal",
    icon: faRocket,
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
  const [publicChallenges, setPublicChallenges] = useState([]);
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [totalPlatformCoders, setTotalPlatformCoders] = useState("100+");
  const [testimonialIndex, setTestimonialIndex] = useState(0);

  // Fetch actual enrolled platform coders count
  const [liveFeedbackList, setLiveFeedbackList] = useState([]);

  useEffect(() => {
    fetchPlatformStats()
      .then((res) => {
        if (res?.displayCount) {
          setTotalPlatformCoders(res.displayCount);
        }
      })
      .catch(() => {});

    fetchShowcaseFeedback()
      .then((res) => {
        if (Array.isArray(res?.feedbacks) && res.feedbacks.length > 0) {
          const mapped = res.feedbacks.map((f, idx) => ({
            id: f.id || `live_fb_${idx}`,
            name: f.username || "Verified Coder",
            role: "Platform Coder",
            avatar: "/testimonials/palash.png",
            rating: `${Math.round((f.rating || 5) * 350 + 400)} ELO`,
            quote: f.comment,
          }));
          setLiveFeedbackList(mapped);
        }
      })
      .catch(() => {});
  }, []);

  const allTestimonials = useMemo(() => {
    if (liveFeedbackList.length > 0) {
      return [...liveFeedbackList, ...coderTestimonialsData];
    }
    return coderTestimonialsData;
  }, [liveFeedbackList]);

  // Auto-rotate coder testimonials with smooth animation
  useEffect(() => {
    const timer = setInterval(() => {
      setTestimonialIndex((prev) => (prev + 1) % allTestimonials.length);
    }, 4600);
    return () => clearInterval(timer);
  }, [allTestimonials.length]);

  // Fetch active public rooms on mount
  useEffect(() => {
    fetchPublicRooms()
      .then((res) => {
        if (Array.isArray(res)) {
          setPublicChallenges(res);
        }
      })
      .catch(() => {});
  }, []);

  // Listen for real-time public challenge broadcasts
  useEffect(() => {
    let active = true;

    const setupHomeSocket = async () => {
      const token = user
        ? (typeof user.getIdToken === 'function' ? await user.getIdToken().catch(() => null) : getSessionToken())
        : null;
      if (!active) return;

      const socket = connectSocket(token, user?.uid || "guest", user?.displayName || "Guest");
      if (!socket) return;

      const onChallengeCreated = (challenge) => {
        if (!challenge?.roomCode) return;
        setPublicChallenges((prev) => {
          const exists = prev.some((c) => c.roomCode === challenge.roomCode);
          if (exists) return prev;
          return [challenge, ...prev];
        });
        setNewsIndex(0); // Immediately spotlight new public duel
      };

      const onChallengeRemoved = ({ roomCode } = {}) => {
        if (!roomCode) return;
        setPublicChallenges((prev) => prev.filter((c) => c.roomCode !== roomCode));
      };

      socket.on("public_challenge_created", onChallengeCreated);
      socket.on("public_challenge_removed", onChallengeRemoved);

      return () => {
        socket.off("public_challenge_created", onChallengeCreated);
        socket.off("public_challenge_removed", onChallengeRemoved);
      };
    };

    const cleanupPromise = setupHomeSocket();
    return () => {
      active = false;
      cleanupPromise.then((cleanup) => {
        if (typeof cleanup === "function") cleanup();
      });
    };
  }, [user]);

  // Combine live public challenges with platform news dispatches
  const publicChallengeItems = publicChallenges.map((c) => ({
    id: `chal_${c.roomCode}`,
    tag: `⚔️ ${c.difficulty || "MIX"} DUEL`,
    title: `${c.hostUsername}'s Arena Challenge`,
    desc: `${c.questionCount || 3} Questions • ${c.timeLimitMinutes || 15} Mins • Host ELO: ${c.hostRating || 1200}`,
    action: "Join Duel",
    link: `/battle/room/${c.roomCode}`,
    isPublicChallenge: true,
    raw: c,
  }));

  const combinedItems = [...publicChallengeItems, ...publicNewsData];
  const safeIndex = newsIndex >= combinedItems.length ? 0 : newsIndex;
  const currentItem = combinedItems[safeIndex] || publicNewsData[0];
  const hasActivePublicChallenge = publicChallenges.length > 0;

  useEffect(() => {
    if (combinedItems.length <= 1) return;
    const timer = setInterval(() => {
      setNewsIndex((prev) => (prev + 1) % combinedItems.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [combinedItems.length]);

  // Compute live user stats or sensible defaults
  const userRating = user?.rating ?? 0;
  const userWins = user?.wins ?? 0;
  const userLosses = user?.losses ?? 0;
  const totalBattles = userWins + userLosses;
  const winRate = totalBattles > 0 ? Math.round((userWins / totalBattles) * 100) : 0;
  const userRank = user?.highestRank && user.highestRank !== "ROOKIE" ? user.highestRank : "Unranked";
  const userSubmissions = user?.totalSubmissions ?? (userWins > 0 ? userWins * 2 : 0);

  // Dynamic user reward points breakdown consistent with Rewards page
  const userPointBreakdown = useMemo(() => {
    return calculateArenaPointBreakdown({
      rating: userRating,
      matchesWon: userWins,
      matchesPlayed: totalBattles,
      practiceSolved: userSubmissions > 0 ? Math.floor(userSubmissions / 2) : 0,
    });
  }, [userRating, userWins, totalBattles, userSubmissions]);

  const userPoints = userPointBreakdown.total;

  // Coder Perks carousel state
  const [offerIndex, setOfferIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setOfferIndex((prev) => (prev + 1) % coderOffersData.length);
    }, 5200);
    return () => clearInterval(timer);
  }, []);

  const currentOffer = coderOffersData[offerIndex] || coderOffersData[0];
  const offerProgressPct = Math.min(100, Math.round((userPoints / currentOffer.cost) * 100));
  const isOfferClaimable = userPoints >= currentOffer.cost && !currentOffer.isUpcoming;
  const activeTestimonial = allTestimonials[testimonialIndex] || allTestimonials[0];

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
                  <span className="rating-trend-arrow">▲</span> {user?.ratingDelta ? `+${user.ratingDelta} pts` : `+${userRating > 0 ? Math.min(142, userRating) : 0} pts`}
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
                <span className={`dash-pill-tag ${hasActivePublicChallenge ? "tag-gold live-duel-tag" : "tag-cyan live-news-tag"}`}>
                  <span className={hasActivePublicChallenge ? "live-duel-pulse" : "live-news-pulse"} />
                  {hasActivePublicChallenge ? "LIVE DUEL" : "NEWS"}
                </span>
              </div>

              {/* Dynamic News Item with AnimatePresence */}
              <div className="news-content-box">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentItem.id || safeIndex}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.28, ease: "easeOut" }}
                    className="news-item-body"
                  >
                    <div className="news-badge-row">
                      <span className={`news-category-badge ${currentItem.isPublicChallenge ? "public-challenge-badge" : ""}`}>
                        {currentItem.tag}
                      </span>
                      <span className="news-time-label">
                        {currentItem.isPublicChallenge ? `Seats: ${currentItem.raw?.currentPlayers || 1}/${currentItem.raw?.maxPlayers || 2}` : "Active"}
                      </span>
                    </div>

                    <h4 className="news-title" title={currentItem.title}>
                      {currentItem.title}
                    </h4>

                    <p className="news-snippet">
                      {currentItem.desc}
                    </p>

                    <div className="news-footer-row">
                      <div className="news-dots-group">
                        {combinedItems.slice(0, 5).map((item, idx) => (
                          <button
                            key={item.id}
                            type="button"
                            className={`news-dot-btn ${idx === (safeIndex % Math.min(5, combinedItems.length)) ? 'active' : ''}`}
                            onClick={() => setNewsIndex(idx)}
                            aria-label={`Show item ${idx + 1}`}
                          />
                        ))}
                      </div>

                      <div className="news-footer-actions">
                        <button
                          type="button"
                          className="home-host-duel-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!user) {
                              navigate('/login');
                              return;
                            }
                            setShowCreateRoomModal(true);
                          }}
                          title="Host an open public room"
                        >
                          <FontAwesomeIcon icon={faPlus} /> Host
                        </button>

                        <button
                          type="button"
                          className={`news-action-btn ${currentItem.isPublicChallenge ? "action-btn-duel" : ""}`}
                          onClick={() => navigate(currentItem.link)}
                        >
                          <span>{currentItem.action}</span>
                          <FontAwesomeIcon icon={faArrowRight} className="news-btn-icon" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Card 3: Real Enrolled Coders & Live Testimonials Rotator */}
            <motion.div 
              className="dash-card testimonials-card"
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
                <span className="dash-pill-tag tag-cyan live-news-tag">
                  <span className="live-news-pulse" />
                  {totalPlatformCoders} CODERS
                </span>
              </div>

              {/* Dynamic Animated Testimonials Carousel */}
              <div className="testimonials-content-box">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTestimonial.id || testimonialIndex}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.28, ease: "easeOut" }}
                    className="testimonial-item-body"
                  >
                    <p className="testimonial-quote-text" title={activeTestimonial.quote}>
                      “{activeTestimonial.quote}”
                    </p>

                    <div className="testimonial-author-row">
                      <img 
                        src={activeTestimonial.avatar} 
                        alt={activeTestimonial.name} 
                        className="testimonial-author-avatar"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                      <div className="testimonial-author-meta">
                        <span className="testimonial-author-name">{activeTestimonial.name}</span>
                        <span className="testimonial-author-role">{activeTestimonial.role}</span>
                      </div>
                      <span className="testimonial-elo-badge">{activeTestimonial.rating}</span>
                    </div>

                    <div className="testimonial-footer-row">
                      <div className="testimonial-dots-group">
                        {allTestimonials.slice(0, 6).map((item, idx) => (
                          <button
                            key={item.id}
                            type="button"
                            className={`testimonial-dot-btn ${idx === (testimonialIndex % Math.min(6, allTestimonials.length)) ? 'active' : ''}`}
                            onClick={() => setTestimonialIndex(idx)}
                            aria-label={`Show review ${idx + 1}`}
                          />
                        ))}
                      </div>

                      <button 
                        type="button" 
                        className="testimonial-explore-btn"
                        onClick={() => navigate('/leaderboard')}
                      >
                        <span>Rankings</span>
                        <FontAwesomeIcon icon={faArrowRight} className="testimonial-btn-icon" />
                      </button>
                    </div>
                  </motion.div>
                </AnimatePresence>
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
              <span className="hero-second-line">
                <span className="hero-for-text">FOR </span>
                <span className="dynamic-rotator-wrapper">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={wordIndex}
                      className="dynamic-word-pair"
                      initial={{ y: 12, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -12, opacity: 0 }}
                      transition={{ duration: 0.35, ease: "easeOut" }}
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
                  <span className="q-stat-value">{user?.longestStreak ?? user?.currentStreak ?? (userWins > 0 ? 1 : 0)}</span>
                </div>

                <div className="q-stat-row">
                  <div className="q-stat-label-group">
                    <FontAwesomeIcon icon={faCode} className="q-icon text-muted" />
                    <span>Total Submissions</span>
                  </div>
                  <span className="q-stat-value">{user?.totalSubmissions ?? userSubmissions}</span>
                </div>
              </div>
            </motion.div>

            {/* Card 3: Coder Perks & Reward Offers Box */}
            <motion.div 
              className="dash-card offers-card"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.35 }}
              whileHover={{ y: -4 }}
            >
              <div className="dash-card-header">
                <div className="dash-card-title-group">
                  <div className={`dash-icon-box icon-${currentOffer.tone || 'gold'}`}>
                    <FontAwesomeIcon icon={faGift} />
                  </div>
                  <span className="dash-card-title">Coder Perks</span>
                </div>
                <span className={`dash-pill-tag ${currentOffer.isUpcoming ? 'tag-purple' : 'tag-gold'} live-offers-tag`}>
                  <span className="live-offers-pulse" />
                  {currentOffer.isUpcoming ? "UPCOMING" : "ACTIVE PERK"}
                </span>
              </div>

              {/* Dynamic Offers Content Box with AnimatePresence */}
              <div className="offers-content-box">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentOffer.id || offerIndex}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.28, ease: "easeOut" }}
                    className="offer-item-body"
                  >
                    <div className="offer-badge-row">
                      <span className={`offer-category-badge badge-${currentOffer.tone || 'gold'}`}>
                        {currentOffer.categoryTag}
                      </span>
                      <span className="offer-cost-badge">
                        <FontAwesomeIcon icon={faCoins} className="offer-coin-icon" />
                        <span>{currentOffer.cost.toLocaleString()} Pts</span>
                      </span>
                    </div>

                    <h4 className="offer-title" title={currentOffer.title}>
                      {currentOffer.title}
                    </h4>

                    <p className="offer-snippet">
                      {currentOffer.desc}
                    </p>

                    {/* Dynamic User Progress Bar towards this reward */}
                    <div className="offer-progress-container">
                      <div className="offer-progress-header">
                        <span className="offer-progress-label">
                          {currentOffer.isUpcoming ? (
                            <span className="text-upcoming">
                              <FontAwesomeIcon icon={faClock} /> {currentOffer.dropDate}
                            </span>
                          ) : isOfferClaimable ? (
                            <span className="text-ready">
                              <FontAwesomeIcon icon={faCheckCircle} /> Ready to Claim!
                            </span>
                          ) : (
                            <span>Your Progress ({offerProgressPct}%)</span>
                          )}
                        </span>
                        <span className="offer-progress-pts">
                          {userPoints.toLocaleString()} / {currentOffer.cost.toLocaleString()} Pts
                        </span>
                      </div>

                      <div className="offer-progress-track">
                        <div 
                          className={`offer-progress-fill fill-${currentOffer.tone || 'gold'} ${isOfferClaimable ? 'fill-ready' : ''}`}
                          style={{ width: `${offerProgressPct}%` }}
                        />
                      </div>
                    </div>

                    <div className="offer-footer-row">
                      <div className="offer-dots-group">
                        {coderOffersData.map((item, idx) => (
                          <button
                            key={item.id}
                            type="button"
                            className={`offer-dot-btn ${idx === offerIndex ? 'active' : ''}`}
                            onClick={() => setOfferIndex(idx)}
                            aria-label={`Show offer ${idx + 1}`}
                          />
                        ))}
                      </div>

                      <button
                        type="button"
                        className={`offer-action-btn ${isOfferClaimable ? 'btn-claim-ready' : ''}`}
                        onClick={() => navigate(currentOffer.link)}
                      >
                        <span>{isOfferClaimable ? 'Claim Now' : currentOffer.actionText}</span>
                        <FontAwesomeIcon icon={faArrowRight} className="offer-btn-icon" />
                      </button>
                    </div>
                  </motion.div>
                </AnimatePresence>
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

      {/* Quick Host Duel Modal from Home */}
      <CreateRoomModal
        isOpen={showCreateRoomModal}
        onClose={() => setShowCreateRoomModal(false)}
      />
    </BackgroundPaths>
  );
}

export default Home;
