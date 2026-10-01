import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faBolt,
    faBriefcase,
    faCheckCircle,
    faCircleInfo,
    faCode,
    faGift,
    faLaptopCode,
    faMedal,
    faRotate,
    faRocket,
    faTicket,
    faStopwatch,
    faFire,
    faLayerGroup,
    faChartPie,
    faClockRotateLeft
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { fetchUserProfile, requestJson } from '../../services/api';
import {
    calculateArenaPointBreakdown,
    getRankProgressByRating,
    normalizeUserStats,
    RANK_TIERS,
} from '../../utils/playerMetrics';
import RankEmblem from '../Common/gamification/RankEmblem';
import BackgroundPaths from '../BackgroundPaths/BackgroundPaths';
import '../BackgroundPaths/BackgroundPaths.css';
import Footer from '../Common/Footer/Footer';
import './Rewards.css';

const rewardCatalog = [
    {
        title: 'Amazon Gift Cards',
        description: 'Redeem credits from $10 to $500 for textbooks, hardware gear, or dev software.',
        category: 'Marketplace',
        cost: 1000,
        icon: faGift,
        tone: 'pink',
    },
    {
        title: 'Hackathon Entry Pass',
        description: 'Get sponsored entry passes to premier global hackathons and coding tournaments.',
        category: 'Competition',
        cost: 1500,
        icon: faTicket,
        tone: 'cyan',
    },
    {
        title: 'Premium Coding Tools',
        description: 'Unlock full pro licenses to leading cloud IDEs, Copilot suites, and debuggers.',
        category: 'Productivity',
        cost: 2500,
        icon: faLaptopCode,
        tone: 'blue',
    },
    {
        title: 'Tech Internship Track',
        description: 'Direct fast-track interview consideration with premier engineering teams.',
        category: 'Career',
        cost: 5000,
        icon: faBriefcase,
        tone: 'orange',
    },
    {
        title: 'Course Subscription Vault',
        description: 'Full-access passes to advanced DSA, concurrency, and distributed systems tracks.',
        category: 'Learning',
        cost: 3000,
        comingSoon: true,
        icon: faCode,
        tone: 'purple',
    },
    {
        title: 'Hardware Rewards Drop',
        description: 'Curated mechanical keyboards, ultra-fast mice, and 4K programming monitors.',
        category: 'Hardware',
        cost: 7500,
        comingSoon: true,
        icon: faRocket,
        tone: 'teal',
    },
];

const recentRedeems = [];

const numberFormatter = new Intl.NumberFormat('en-US');

function getRewardStatusLabel(status) {
    if (status === 'redeem') return 'Available';
    if (status === 'locked') return 'Locked';
    return 'Coming Soon';
}

function getRewardActionLabel(status) {
    if (status === 'redeem') return 'Claim Reward';
    if (status === 'locked') return 'Need More Points';
    return 'Coming Soon';
}

function Rewards() {
    const { user, loading: authLoading } = useAuth();
    const { notify } = useNotification();
    const [profile, setProfile] = useState(null);
    const [weeklyStatus, setWeeklyStatus] = useState(null);
    const [historyTransactions, setHistoryTransactions] = useState([]);
    const [isLoadingProfile, setIsLoadingProfile] = useState(false);
    const [profileError, setProfileError] = useState('');

    const loadWeeklyAndHistory = async () => {
        try {
            const wStatus = await requestJson('/api/rewards/weekly-status', { includeAuth: true });
            if (wStatus) setWeeklyStatus(wStatus);
        } catch {}

        try {
            const hData = await requestJson('/api/rewards/history?limit=10', { includeAuth: true });
            if (hData && Array.isArray(hData.transactions)) {
                setHistoryTransactions(hData.transactions);
            }
        } catch {}
    };

    useEffect(() => {
        let active = true;

        const loadProfile = async () => {
            if (!user?.uid) {
                setProfile(null);
                setIsLoadingProfile(false);
                return;
            }

            setIsLoadingProfile(true);
            setProfileError('');

            try {
                const data = await fetchUserProfile(user.uid);
                if (!active) return;
                setProfile(data || null);
                loadWeeklyAndHistory();
            } catch {
                if (!active) return;
                setProfileError('Could not sync reward metrics. Showing computed defaults.');
                setProfile(null);
            } finally {
                if (active) setIsLoadingProfile(false);
            }
        };

        loadProfile();

        return () => {
            active = false;
        };
    }, [user?.uid]);

    const stats = useMemo(() => normalizeUserStats(profile || {}), [profile]);
    const pointBreakdown = useMemo(
        () =>
            calculateArenaPointBreakdown({
                rating: stats.rating,
                matchesWon: stats.matchesWon,
                matchesPlayed: stats.matchesPlayed,
                practiceSolved: stats.practiceSolved,
            }),
        [stats.rating, stats.matchesWon, stats.matchesPlayed, stats.practiceSolved]
    );

    const arenaPoints = pointBreakdown.total;
    const {
        currentTier,
        nextTier,
        currentTierIndex,
        progressToNext,
        ratingToNextTier,
    } = getRankProgressByRating(stats.rating);

    const computedRewards = useMemo(
        () =>
            rewardCatalog.map((reward) => {
                const status = reward.comingSoon
                    ? 'coming-soon'
                    : arenaPoints >= reward.cost
                        ? 'redeem'
                        : 'locked';

                return {
                    ...reward,
                    status,
                    cta: getRewardActionLabel(status),
                };
            }),
        [arenaPoints]
    );

    const pointSourceRows = useMemo(
        () => [
            { label: 'Rating contribution', value: pointBreakdown.ratingPoints, icon: faMedal, color: '#ffd500' },
            { label: 'Battle wins contribution', value: pointBreakdown.battleWinPoints, icon: faBolt, color: '#00e5ff' },
            { label: 'Speed & Efficiency bonus', value: pointBreakdown.speedEfficiencyPoints, icon: faStopwatch, color: '#ff2a7a' },
            { label: 'Practice solved contribution', value: pointBreakdown.practiceSolvedPoints, icon: faCode, color: '#c084fc' },
            { label: 'Participation contribution', value: pointBreakdown.participationPoints, icon: faRotate, color: '#38bdf8' },
        ],
        [pointBreakdown]
    );

    const [activeCategory, setActiveCategory] = useState('All');

    const categories = ['All', 'Marketplace', 'Competition', 'Productivity', 'Career', 'Learning', 'Hardware'];

    const filteredRewards = useMemo(() => {
        if (activeCategory === 'All') return computedRewards;
        return computedRewards.filter((r) => r.category === activeCategory);
    }, [computedRewards, activeCategory]);

    const redeemableCount = computedRewards.filter((reward) => reward.status === 'redeem').length;

    const handleClaimClick = async (reward) => {
        if (reward.status === 'redeem') {
            try {
                const res = await requestJson('/api/rewards/redeem', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cost: reward.cost, rewardTitle: reward.title }),
                    includeAuth: true,
                });

                if (notify) {
                    notify({
                        type: 'success',
                        title: 'Reward Redeemed!',
                        message: res.message || `Your request for "${reward.title}" has been placed in the fulfillment queue.`,
                    });
                }
                
                // Refresh profile & transactions
                const updatedProfile = await fetchUserProfile(user.uid);
                if (updatedProfile) setProfile(updatedProfile);
                loadWeeklyAndHistory();
            } catch (err) {
                if (notify) {
                    notify({
                        type: 'error',
                        title: 'Redemption Failed',
                        message: err.message || 'Could not process redemption.',
                    });
                }
            }
        } else if (reward.status === 'locked') {
            const needed = reward.cost - arenaPoints;
            if (notify) {
                notify({
                    type: 'warning',
                    title: 'Points Required',
                    message: `You need ${numberFormatter.format(needed)} more points to unlock this reward. Win rated battles or solve challenges to earn points!`,
                });
            }
        }
    };

    const handleClaimWeekly = async (daysRequired) => {
        try {
            const res = await requestJson('/api/rewards/claim-weekly', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ daysRequired }),
                includeAuth: true,
            });

            if (notify) {
                notify({
                    type: 'success',
                    title: 'Consistency Bonus Claimed!',
                    message: `Claimed +${res.rewardPoints} Arena Points for completing ${daysRequired} active days!`,
                });
            }

            const updatedProfile = await fetchUserProfile(user.uid);
            if (updatedProfile) setProfile(updatedProfile);
            loadWeeklyAndHistory();
        } catch (err) {
            if (notify) {
                notify({
                    type: 'error',
                    title: 'Claim Failed',
                    message: err.message || 'Could not claim weekly consistency reward.',
                });
            }
        }
    };

    if (authLoading || isLoadingProfile) {
        return (
            <BackgroundPaths>
                <div className="rewards-page">
                    <div className="rewards-loading-container">
                        <div className="rewards-spinner" />
                        <p>Syncing vault & reward metrics...</p>
                    </div>
                </div>
                <Footer />
            </BackgroundPaths>
        );
    }

    return (
        <BackgroundPaths>
            <div className="rewards-page">
                {/* Header Section */}
                <motion.section
                    className="rewards-hero-header"
                    initial={{ opacity: 0, y: -16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <h1 className="rewards-hero-title">
                        REDEEM SKILLS INTO <span className="word-glow-cyan">REAL REWARDS</span>
                    </h1>

                    <p className="rewards-hero-desc">
                        Convert algorithmic speed, runtime efficiency, and battle victories into physical tech gear, pro software licenses, and career interview tracks.
                    </p>

                    {profileError ? (
                        <div className="rewards-warning-banner">
                            <FontAwesomeIcon icon={faCircleInfo} />
                            <span>{profileError}</span>
                        </div>
                    ) : null}
                </motion.section>

                {/* KPI Metrics Dashboard Grid */}
                <motion.section
                    className="rewards-kpi-grid"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                >
                    {/* Card 1: Arena Points */}
                    <article className="dash-card rewards-dash-kpi">
                        <div className="dash-card-header">
                            <div className="dash-card-title-group">
                                <div className="dash-icon-box icon-cyan">
                                    <FontAwesomeIcon icon={faBolt} />
                                </div>
                                <span className="dash-card-title">Arena Points</span>
                            </div>
                            <span className="dash-pill-tag tag-cyan">BALANCE</span>
                        </div>
                        <div className="dash-stat-big stat-cyan">
                            {numberFormatter.format(arenaPoints)}
                        </div>
                        <div className="kpi-subtext">
                            Includes speed & execution multipliers
                        </div>
                    </article>

                    {/* Card 2: Current Rank */}
                    <article className="dash-card rewards-dash-kpi">
                        <div className="dash-card-header">
                            <div className="dash-card-title-group">
                                <div className="dash-icon-box icon-trophy">
                                    <FontAwesomeIcon icon={faMedal} />
                                </div>
                                <span className="dash-card-title">Rating Tier</span>
                            </div>
                            <span className="dash-pill-tag tag-gold">ACTIVE</span>
                        </div>
                        <div className="dash-stat-big kpi-rank-stat">
                            <RankEmblem rating={stats.rating} size={28} glow={false} />
                            <span>{currentTier.label}</span>
                        </div>
                        <div className="kpi-subtext">
                            {ratingToNextTier > 0
                                ? `${ratingToNextTier} rating to reach ${nextTier.label}`
                                : 'Top Grandmaster Tier Unlocked'}
                        </div>
                    </article>

                    {/* Card 3: Efficiency Bonus */}
                    <article className="dash-card rewards-dash-kpi">
                        <div className="dash-card-header">
                            <div className="dash-card-title-group">
                                <div className="dash-icon-box icon-pink">
                                    <FontAwesomeIcon icon={faFire} />
                                </div>
                                <span className="dash-card-title">Efficiency Surge</span>
                            </div>
                            <span className="dash-pill-tag tag-pink">SPEED BONUS</span>
                        </div>
                        <div className="dash-stat-big stat-pink">
                            +{numberFormatter.format(pointBreakdown.speedEfficiencyPoints)}
                        </div>
                        <div className="kpi-subtext">
                            Earned from rapid & clean execution
                        </div>
                    </article>

                    {/* Card 4: Rewards Ready */}
                    <article className="dash-card rewards-dash-kpi">
                        <div className="dash-card-header">
                            <div className="dash-card-title-group">
                                <div className="dash-icon-box icon-purple">
                                    <FontAwesomeIcon icon={faGift} />
                                </div>
                                <span className="dash-card-title">Unlocked Items</span>
                            </div>
                            <span className="dash-pill-tag tag-purple">READY</span>
                        </div>
                        <div className="dash-stat-big stat-purple">
                            {redeemableCount}
                        </div>
                        <div className="kpi-subtext">
                            {redeemableCount === 1 ? '1 item ready to claim now' : `${redeemableCount} items ready to claim now`}
                        </div>
                    </article>
                </motion.section>

                {/* Main Rewards Layout */}
                <div className="rewards-layout">
                    {/* Left Panel: Available Rewards Catalog */}
                    <motion.section
                        className="dash-card rewards-main-panel"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >
                        <div className="panel-headline-row">
                            <div className="dash-card-title-group">
                                <div className="dash-icon-box icon-cyan">
                                    <FontAwesomeIcon icon={faLayerGroup} />
                                </div>
                                <h2 className="panel-heading-title">Reward Catalog</h2>
                            </div>
                            <span className="dash-pill-tag tag-cyan">WEEKLY RESTOCK</span>
                        </div>

                        {/* Category Filter Pills */}
                        <div className="rewards-category-pills">
                            {categories.map((cat) => (
                                <button
                                    key={cat}
                                    type="button"
                                    className={`category-pill ${activeCategory === cat ? 'is-active' : ''}`}
                                    onClick={() => setActiveCategory(cat)}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        {/* Catalog Cards Grid */}
                        <div className="rewards-grid">
                            {filteredRewards.length > 0 ? (
                                filteredRewards.map((reward) => (
                                    <article
                                        key={reward.title}
                                        className={`reward-card dash-card status-${reward.status}`}
                                    >
                                        <div className="reward-card-top">
                                            <div className={`dash-icon-box tone-${reward.tone}`}>
                                                <FontAwesomeIcon icon={reward.icon} />
                                            </div>
                                            <span className="reward-category-tag">{reward.category}</span>
                                        </div>

                                        <h3 className="reward-item-title">{reward.title}</h3>
                                        <p className="reward-item-desc">{reward.description}</p>

                                        <div className="reward-meta-row">
                                            <div className="reward-cost-badge">
                                                <span className="cost-num">{numberFormatter.format(reward.cost)}</span>
                                                <span className="cost-unit">PTS</span>
                                            </div>
                                            <span className={`reward-status-pill status-${reward.status}`}>
                                                {getRewardStatusLabel(reward.status)}
                                            </span>
                                        </div>

                                        <button
                                            className={`reward-action-btn action-${reward.status}`}
                                            type="button"
                                            onClick={() => handleClaimClick(reward)}
                                        >
                                            {reward.cta}
                                        </button>
                                    </article>
                                ))
                            ) : (
                                <div className="rewards-empty-state">
                                    <p>No rewards currently listed in this category.</p>
                                </div>
                            )}
                        </div>
                    </motion.section>

                    {/* Right Side Column */}
                    <aside className="rewards-side-column">
                        {/* Rank Tier Progress */}
                        <motion.section
                            className="dash-card rewards-side-card"
                            initial={{ opacity: 0, x: 16 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: 0.25 }}
                        >
                            <div className="side-card-header">
                                <div className="dash-card-title-group">
                                    <div className="dash-icon-box icon-cyan">
                                        <FontAwesomeIcon icon={faMedal} />
                                    </div>
                                    <h2 className="side-card-title">Rank Progress</h2>
                                </div>
                                <span className="progress-percent-badge">{Math.round(progressToNext)}%</span>
                            </div>

                            <div className="tier-rail">
                                <span className="tier-rail-current">{currentTier.label}</span>
                                <span className="tier-rail-next">{nextTier.label}</span>
                            </div>

                            <div className="tier-progress-track">
                                <div className="tier-progress-fill" style={{ width: `${progressToNext}%` }} />
                            </div>

                            <p className="tier-progress-copy">
                                {ratingToNextTier > 0
                                    ? `${ratingToNextTier} rating needed to reach ${nextTier.label}`
                                    : 'Maximum competitive tier unlocked'}
                            </p>

                            <ul className="tier-list">
                                {RANK_TIERS.map((tier, index) => {
                                    const isComplete = stats.rating >= tier.minRating;
                                    const isCurrent = index === currentTierIndex;

                                    return (
                                        <li key={tier.label} className={`tier-list-item ${isCurrent ? 'tier-current' : ''}`}>
                                            <div className="tier-left">
                                                <RankEmblem rating={tier.minRating} size={20} glow={false} />
                                                <span className="tier-label-name">{tier.label}</span>
                                                {isComplete && (
                                                    <FontAwesomeIcon icon={faCheckCircle} className="tier-check-icon" />
                                                )}
                                            </div>
                                            <span className="tier-points-tag">{numberFormatter.format(tier.minRating)} Elo</span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </motion.section>

                        {/* Points Breakdown */}
                        <motion.section
                            className="dash-card rewards-side-card"
                            initial={{ opacity: 0, x: 16 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                        >
                            <div className="side-card-header">
                                <div className="dash-card-title-group">
                                    <div className="dash-icon-box icon-purple">
                                        <FontAwesomeIcon icon={faChartPie} />
                                    </div>
                                    <h2 className="side-card-title">Points Breakdown</h2>
                                </div>
                            </div>

                            <ul className="earn-list">
                                {pointSourceRows.map((source) => (
                                    <li key={source.label} className="earn-list-item">
                                        <div className="earn-left">
                                            <span className="earn-icon-bullet" style={{ color: source.color }}>
                                                <FontAwesomeIcon icon={source.icon} />
                                            </span>
                                            <span>{source.label}</span>
                                        </div>
                                        <span className="earn-points-badge">+{numberFormatter.format(source.value)}</span>
                                    </li>
                                ))}
                            </ul>
                        </motion.section>

                        {/* Weekly Consistency Activity Tracker */}
                        <motion.section
                            className="dash-card rewards-side-card"
                            initial={{ opacity: 0, x: 16 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                        >
                            <div className="side-card-header">
                                <div className="dash-card-title-group">
                                    <div className="dash-icon-box icon-pink">
                                        <FontAwesomeIcon icon={faFire} />
                                    </div>
                                    <h2 className="side-card-title">Weekly Consistency</h2>
                                </div>
                                <span className="dash-pill-tag tag-pink">
                                    {weeklyStatus?.activeDaysCount || 0} / 7 Active Days
                                </span>
                            </div>

                            {/* Mon-Sun Day Bullets */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', margin: '14px 0' }}>
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName, index) => {
                                    const isActive = weeklyStatus?.activeDays?.includes(index);
                                    return (
                                        <div
                                            key={dayName}
                                            style={{
                                                textAlign: 'center',
                                                padding: '8px 2px',
                                                borderRadius: '6px',
                                                background: isActive ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                                                border: isActive ? '1px solid #06b6d4' : '1px solid rgba(255, 255, 255, 0.06)',
                                            }}
                                        >
                                            <div style={{ fontSize: '0.65rem', color: isActive ? '#38bdf8' : '#64748b', fontWeight: 800 }}>{dayName}</div>
                                            <div style={{ fontSize: '0.8rem', color: isActive ? '#00e5ff' : '#475569', marginTop: '2px' }}>
                                                {isActive ? '✓' : '•'}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Weekly Milestones Claim List */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {(weeklyStatus?.milestones || [
                                    { daysRequired: 3, rewardPoints: 10 },
                                    { daysRequired: 5, rewardPoints: 20 },
                                    { daysRequired: 7, rewardPoints: 30 },
                                ]).map((m) => (
                                    <div
                                        key={m.daysRequired}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justify: 'space-between',
                                            padding: '8px 12px',
                                            borderRadius: '6px',
                                            background: 'rgba(255, 255, 255, 0.02)',
                                            border: '1px solid rgba(255, 255, 255, 0.06)',
                                        }}
                                    >
                                        <span style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
                                            {m.daysRequired} Active Days (+{m.rewardPoints} Pts)
                                        </span>
                                        {m.isClaimed ? (
                                            <span style={{ fontSize: '0.7rem', color: '#4ade80', fontWeight: 800 }}>CLAIMED</span>
                                        ) : m.canClaim ? (
                                            <button
                                                type="button"
                                                className="btn-hud-primary"
                                                style={{ padding: '2px 10px', fontSize: '0.7rem' }}
                                                onClick={() => handleClaimWeekly(m.daysRequired)}
                                            >
                                                Claim
                                            </button>
                                        ) : (
                                            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>LOCKED</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </motion.section>

                        {/* Audited Point Transaction History */}
                        <motion.section
                            className="dash-card rewards-side-card"
                            initial={{ opacity: 0, x: 16 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: 0.35 }}
                        >
                            <div className="side-card-header">
                                <div className="dash-card-title-group">
                                    <div className="dash-icon-box icon-blue">
                                        <FontAwesomeIcon icon={faClockRotateLeft} />
                                    </div>
                                    <h2 className="side-card-title">Point History Ledger</h2>
                                </div>
                            </div>

                            <ul className="redeem-list">
                                {historyTransactions.length > 0 ? (
                                    historyTransactions.map((tx) => {
                                        const isPositive = tx.amount > 0;
                                        return (
                                            <li key={tx.id} className="redeem-item">
                                                <div className="redeem-left">
                                                    <span>{tx.type.replace('_', ' ')}</span>
                                                    <small>{new Date(tx.createdAt).toLocaleDateString()}</small>
                                                </div>
                                                <span className="redeem-cost" style={{ color: isPositive ? '#4ade80' : '#f87171' }}>
                                                    {isPositive ? `+${tx.amount}` : tx.amount}
                                                </span>
                                            </li>
                                        );
                                    })
                                ) : (
                                    <li className="redeem-empty">
                                        <span>No recent point transactions found in ledger.</span>
                                    </li>
                                )}
                            </ul>
                        </motion.section>
                    </aside>
                </div>
            </div>
            <Footer />
        </BackgroundPaths>
    );
}

export default Rewards;