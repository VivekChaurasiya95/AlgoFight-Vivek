import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faUsers,
    faBolt,
    faTrophy,
    faMagnifyingGlass,
    faShieldHalved,
    faCircle,
    faCopy,
    faCrosshairs,
    faArrowRotateRight,
    faBuildingColumns,
    faCheck,
    faTimes,
    faFire,
    faHourglassHalf,
    faGamepad,
    faRobot,
} from "@fortawesome/free-solid-svg-icons";
import { fetchAvailablePlayers } from "../../services/api";
import { connectSocket, getSocket } from "../../services/socket";
import { getSessionToken } from "../../services/authStorage";
import { useAuth } from "../../contexts/AuthContext";
import { useNotification } from "../../contexts/NotificationContext";
import RankEmblem, { getRankTier } from "../Common/gamification/RankEmblem";
import "./AvailablePlayers.css";

export default function AvailablePlayers({ onPlayerCountChange }) {
    const { user } = useAuth();
    const { notify } = useNotification();
    const navigate = useNavigate();

    const [dbPlayers, setDbPlayers] = useState([]);
    const [onlinePresences, setOnlinePresences] = useState(new Map());
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL"); // ALL | AVAILABLE | IN_BATTLE | IN_LOBBY
    const [sortBy, setSortBy] = useState("rating"); // rating | wins | winRate | name

    // Direct Challenge States
    const [outgoingChallenge, setOutgoingChallenge] = useState(null); // { challengeId, targetUsername, expiresAt }
    const [incomingChallenge, setIncomingChallenge] = useState(null); // { challengeId, fromUsername, fromRating, expiresAt }
    const [challengeTimeRemaining, setChallengeTimeRemaining] = useState(30);

    const currentUserId = user?.uid || user?.email || "Guest";
    const currentUsername = user?.displayName || user?.email?.split("@")[0] || "Player";

    // 1. Fetch Registered Players from REST API
    const loadPlayersFromDb = async () => {
        try {
            setLoading(true);
            const data = await fetchAvailablePlayers({ limit: 100 });
            if (Array.isArray(data)) {
                setDbPlayers(data);
            }
        } catch (err) {
            console.error("Failed to load players directory:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPlayersFromDb();
    }, []);

    // 2. Setup WebSocket Presence & Challenge listeners
    useEffect(() => {
        let active = true;
        let token = null;

        const initSocket = async () => {
            if (user) {
                token = typeof user.getIdToken === "function"
                    ? await user.getIdToken().catch(() => null)
                    : getSessionToken();
            }
            if (!active) return;

            const socket = connectSocket(token, currentUserId, currentUsername);

            // Ask for current online snapshot
            socket.emit("get_available_players");

            const handlePresenceSync = (data) => {
                const list = data?.onlinePlayers || data?.payload?.onlinePlayers || [];
                const nextMap = new Map();
                for (const p of list) {
                    if (p.userId) nextMap.set(p.userId, p);
                }
                setOnlinePresences(nextMap);
            };

            const handlePresenceUpdate = (presence) => {
                if (!presence?.userId) return;
                setOnlinePresences((prev) => {
                    const next = new Map(prev);
                    next.set(presence.userId, presence);
                    return next;
                });
            };

            const handlePlayerOffline = (data) => {
                const uid = data?.userId || data?.payload?.userId;
                if (!uid) return;
                setOnlinePresences((prev) => {
                    const next = new Map(prev);
                    next.delete(uid);
                    return next;
                });
            };

            const handleChallengeReceived = (challenge) => {
                setIncomingChallenge(challenge);
                setChallengeTimeRemaining(30);
                notify({
                    type: "info",
                    title: "⚔️ Duel Challenge!",
                    message: `${challenge.fromUsername} challenged you to a 1v1 battle!`,
                    duration: 5000,
                });
            };

            const handleChallengeSent = (challenge) => {
                setOutgoingChallenge(challenge);
                setChallengeTimeRemaining(30);
                notify({
                    type: "success",
                    title: "Challenge Dispatched",
                    message: `Waiting for ${challenge.targetUsername} to accept...`,
                    duration: 4000,
                });
            };

            const handleChallengeDeclined = (data) => {
                setOutgoingChallenge(null);
                notify({
                    type: "warning",
                    title: "Duel Declined",
                    message: `${data.targetUsername || "Player"} declined the battle challenge.`,
                    duration: 4000,
                });
            };

            const handleChallengeCancelled = () => {
                setIncomingChallenge(null);
                setOutgoingChallenge(null);
                notify({
                    type: "info",
                    title: "Challenge Cancelled",
                    message: "The challenge was cancelled.",
                    duration: 3000,
                });
            };

            const handleChallengeExpired = () => {
                setIncomingChallenge(null);
                setOutgoingChallenge(null);
            };

            const handleMatchFound = (matchPayload) => {
                setIncomingChallenge(null);
                setOutgoingChallenge(null);
                notify({
                    type: "success",
                    title: "Combat Engaged!",
                    message: "Entering live battle arena...",
                    duration: 2500,
                });
                const roomCode = matchPayload?.roomCode || matchPayload?.roomId;
                navigate(roomCode ? `/battle/live/${roomCode}` : "/battle/live", { state: { matchData: matchPayload } });
            };

            socket.on("presence_sync", handlePresenceSync);
            socket.on("player_presence_update", handlePresenceUpdate);
            socket.on("player_offline", handlePlayerOffline);
            socket.on("challenge_received", handleChallengeReceived);
            socket.on("challenge_sent", handleChallengeSent);
            socket.on("challenge_declined", handleChallengeDeclined);
            socket.on("challenge_cancelled", handleChallengeCancelled);
            socket.on("challenge_expired", handleChallengeExpired);
            socket.on("match_found", handleMatchFound);

            return () => {
                socket.off("presence_sync", handlePresenceSync);
                socket.off("player_presence_update", handlePresenceUpdate);
                socket.off("player_offline", handlePlayerOffline);
                socket.off("challenge_received", handleChallengeReceived);
                socket.off("challenge_sent", handleChallengeSent);
                socket.off("challenge_declined", handleChallengeDeclined);
                socket.off("challenge_cancelled", handleChallengeCancelled);
                socket.off("challenge_expired", handleChallengeExpired);
                socket.off("match_found", handleMatchFound);
            };
        };

        const cleanupPromise = initSocket();

        return () => {
            active = false;
            cleanupPromise.then((cleanup) => {
                if (typeof cleanup === "function") cleanup();
            });
        };
    }, [currentUserId, currentUsername, navigate, notify, user]);

    // 3. Countdown timer for active challenges
    useEffect(() => {
        if (!outgoingChallenge && !incomingChallenge) return;

        const timer = setInterval(() => {
            setChallengeTimeRemaining((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setOutgoingChallenge(null);
                    setIncomingChallenge(null);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [outgoingChallenge, incomingChallenge]);

    // 4. Merge DB players with live WebSocket presences — KEEP ONLY ONLINE PLAYERS
    const onlinePlayers = useMemo(() => {
        const dbMap = new Map();
        for (const p of dbPlayers) {
            if (p.userType === "FACULTY" || p.role === "FACULTY") continue;
            dbMap.set(p.id, p);
        }

        const onlineMap = new Map();

        // 1. All currently active socket presences
        for (const [userId, pres] of onlinePresences.entries()) {
            if (pres.userType === "FACULTY" || pres.role === "FACULTY") continue;
            const dbData = dbMap.get(userId);
            const isMe = userId === currentUserId || pres.username === currentUsername;

            onlineMap.set(userId, {
                id: userId,
                username: pres.username || dbData?.username || "Player",
                platformCode: pres.platformCode || dbData?.platformCode || "",
                institutionName: pres.institutionName || dbData?.institutionName || "",
                userType: pres.userType || dbData?.userType || "INDIVIDUAL",
                rating: pres.rating ?? dbData?.rating ?? 1200,
                matchesWon: dbData?.matchesWon ?? dbData?.wins ?? 0,
                matchesPlayed: dbData?.matchesPlayed ?? ((dbData?.wins || 0) + (dbData?.losses || 0)),
                winRate: dbData?.winRate ?? (dbData?.wins && (dbData.wins + (dbData.losses || 0)) > 0
                    ? Math.round((dbData.wins / (dbData.wins + dbData.losses)) * 100)
                    : 0),
                photoURL: pres.photoURL || dbData?.photoURL || (isMe ? user?.photoURL : null),
                status: pres.status || "AVAILABLE",
                isMe,
            });
        }

        // 2. Ensure current user appears in the online table if logged in
        if (currentUserId && currentUserId !== "Guest" && !onlineMap.has(currentUserId)) {
            const dbMe = dbMap.get(currentUserId);
            onlineMap.set(currentUserId, {
                id: currentUserId,
                username: currentUsername,
                platformCode: dbMe?.platformCode || "",
                institutionName: dbMe?.institutionName || "",
                userType: dbMe?.userType || "INDIVIDUAL",
                rating: dbMe?.rating ?? user?.rating ?? 1200,
                matchesWon: dbMe?.matchesWon ?? dbMe?.wins ?? 0,
                matchesPlayed: dbMe?.matchesPlayed ?? ((dbMe?.wins || 0) + (dbMe?.losses || 0)),
                winRate: dbMe?.winRate ?? 0,
                photoURL: dbMe?.photoURL || user?.photoURL || null,
                status: "AVAILABLE",
                isMe: true,
            });
        }

        return Array.from(onlineMap.values());
    }, [dbPlayers, onlinePresences, currentUserId, currentUsername, user]);

    // Live counts of online combatants
    const onlineCount = onlinePlayers.length;

    const availableCount = useMemo(() => {
        return onlinePlayers.filter((p) => p.status === "AVAILABLE" && !p.isMe).length;
    }, [onlinePlayers]);

    const battlingCount = useMemo(() => {
        return onlinePlayers.filter((p) => p.status === "IN_BATTLE").length;
    }, [onlinePlayers]);

    const inLobbyCount = useMemo(() => {
        return onlinePlayers.filter((p) => p.status === "IN_LOBBY").length;
    }, [onlinePlayers]);

    // Update parent tab badge with active online count
    useEffect(() => {
        if (typeof onPlayerCountChange === "function") {
            onPlayerCountChange(onlineCount);
        }
    }, [onlineCount, onPlayerCountChange]);

    // 5. Filter and Sort Online Players
    const filteredPlayers = useMemo(() => {
        return onlinePlayers
            .filter((p) => {
                // Search query match
                if (searchQuery.trim()) {
                    const q = searchQuery.toLowerCase().trim();
                    const matchName = p.username.toLowerCase().includes(q);
                    const matchCode = p.platformCode.toLowerCase().includes(q);
                    const matchInst = p.institutionName.toLowerCase().includes(q);
                    if (!matchName && !matchCode && !matchInst) return false;
                }

                // Status filter
                if (statusFilter === "AVAILABLE") {
                    return p.status === "AVAILABLE";
                }
                if (statusFilter === "IN_BATTLE") {
                    return p.status === "IN_BATTLE";
                }
                if (statusFilter === "IN_LOBBY") {
                    return p.status === "IN_LOBBY";
                }

                return true;
            })
            .sort((a, b) => {
                if (sortBy === "rating") {
                    return (b.rating || 0) - (a.rating || 0);
                }
                if (sortBy === "wins") {
                    return (b.matchesWon || 0) - (a.matchesWon || 0);
                }
                if (sortBy === "winRate") {
                    return (b.winRate || 0) - (a.winRate || 0);
                }
                if (sortBy === "name") {
                    return a.username.localeCompare(b.username);
                }
                return 0;
            });
    }, [onlinePlayers, searchQuery, statusFilter, sortBy]);

    // 6. Action Handlers
    const handleSendChallenge = (targetPlayer) => {
        const socket = getSocket();
        if (!socket || !socket.connected) {
            notify({ type: "error", title: "Connection Error", message: "Connecting to server, please try again." });
            return;
        }

        socket.emit("send_challenge", {
            targetUserId: targetPlayer.id,
            targetUsername: targetPlayer.username,
            fromUsername: currentUsername,
        });
    };

    const handleAcceptChallenge = () => {
        if (!incomingChallenge) return;
        const socket = getSocket();
        socket.emit("accept_challenge", {
            challengeId: incomingChallenge.challengeId,
        });
    };

    const handleDeclineChallenge = () => {
        if (!incomingChallenge) return;
        const socket = getSocket();
        socket.emit("decline_challenge", {
            challengeId: incomingChallenge.challengeId,
        });
        setIncomingChallenge(null);
    };

    const handleCancelChallenge = () => {
        if (!outgoingChallenge) return;
        const socket = getSocket();
        socket.emit("cancel_challenge", {
            challengeId: outgoingChallenge.challengeId,
        });
        setOutgoingChallenge(null);
    };

    const copyCode = (code) => {
        if (!code) return;
        navigator.clipboard.writeText(code);
        notify({ type: "success", title: "Copied!", message: `Player code ${code} copied to clipboard.` });
    };

    return (
        <div className="ap-container">
            {/* Top Compact Live Stats Bar */}
            <div className="ap-stats-row">
                <div className="ap-stat-card tone-cyan">
                    <div className="ap-stat-icon-wrap">
                        <FontAwesomeIcon icon={faBolt} />
                    </div>
                    <div className="ap-stat-info">
                        <div className="ap-stat-number">{onlineCount}</div>
                        <div className="ap-stat-label">Active Combatants Online</div>
                    </div>
                </div>

                <div className="ap-stat-card tone-gold">
                    <div className="ap-stat-icon-wrap">
                        <FontAwesomeIcon icon={faCrosshairs} />
                    </div>
                    <div className="ap-stat-info">
                        <div className="ap-stat-number">{availableCount}</div>
                        <div className="ap-stat-label">Ready for 1v1 Duel</div>
                    </div>
                </div>

                <div className="ap-stat-card tone-pink">
                    <div className="ap-stat-icon-wrap">
                        <FontAwesomeIcon icon={faFire} />
                    </div>
                    <div className="ap-stat-info">
                        <div className="ap-stat-number">{battlingCount}</div>
                        <div className="ap-stat-label">In Live Battles</div>
                    </div>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="ap-toolbar">
                {/* Search Input */}
                <div className="ap-search-box">
                    <FontAwesomeIcon icon={faMagnifyingGlass} className="ap-search-icon" />
                    <input
                        type="text"
                        className="ap-search-input"
                        placeholder="Search online players by name, code (AF-...), institute..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Status Filter Tabs */}
                <div className="ap-filters-group">
                    <button
                        className={`ap-tab-btn ${statusFilter === "ALL" ? "active" : ""}`}
                        onClick={() => setStatusFilter("ALL")}
                    >
                        🟢 All Online <span className="ap-count-pill">{onlineCount}</span>
                    </button>

                    <button
                        className={`ap-tab-btn ${statusFilter === "AVAILABLE" ? "active" : ""}`}
                        onClick={() => setStatusFilter("AVAILABLE")}
                    >
                        ⚡ Available <span className="ap-count-pill">{availableCount}</span>
                    </button>

                    <button
                        className={`ap-tab-btn ${statusFilter === "IN_BATTLE" ? "active" : ""}`}
                        onClick={() => setStatusFilter("IN_BATTLE")}
                    >
                        ⚔️ In Duel <span className="ap-count-pill">{battlingCount}</span>
                    </button>

                    {inLobbyCount > 0 && (
                        <button
                            className={`ap-tab-btn ${statusFilter === "IN_LOBBY" ? "active" : ""}`}
                            onClick={() => setStatusFilter("IN_LOBBY")}
                        >
                            ⏳ In Lobby <span className="ap-count-pill">{inLobbyCount}</span>
                        </button>
                    )}

                    {/* Sorting dropdown */}
                    <select
                        className="ap-sort-select"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                    >
                        <option value="rating">Highest Rating</option>
                        <option value="wins">Most Wins</option>
                        <option value="winRate">Best Win Rate</option>
                        <option value="name">Name (A-Z)</option>
                    </select>

                    {/* Refresh Button */}
                    <button className="ap-refresh-btn" onClick={loadPlayersFromDb} title="Refresh Directory">
                        <FontAwesomeIcon icon={faArrowRotateRight} spin={loading} />
                    </button>
                </div>
            </div>

            {/* High-Density Tabular Format */}
            <div className="ap-table-container">
                <div className="ap-table-responsive">
                    <table className="ap-table">
                        <thead>
                            <tr>
                                <th className="th-player">Combatant</th>
                                <th className="th-status">Live Status</th>
                                <th className="th-rating">Rating & Rank</th>
                                <th className="th-record">Record & Win Rate</th>
                                <th className="th-action text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPlayers.map((player) => {
                                const isAvailable = player.status === "AVAILABLE" && !player.isMe;
                                const isInBattle = player.status === "IN_BATTLE";
                                const isInLobby = player.status === "IN_LOBBY";
                                const codeToCopy = player.platformCode || `AF-${player.id ? player.id.slice(0, 6).toUpperCase() : "USR"}`;

                                return (
                                    <tr
                                        key={player.id}
                                        className={`ap-table-row ${player.isMe ? "is-self" : ""} ${isInBattle ? "is-in-battle" : ""}`}
                                        onClick={() => navigate(player.isMe ? "/profile" : `/profile/${encodeURIComponent(player.id)}`)}
                                        title={`Click to view ${player.username}'s profile`}
                                    >
                                        {/* Col 1: Combatant Info */}
                                        <td className="td-player">
                                            <div className="ap-table-player-cell">
                                                <div className="ap-table-avatar-wrap">
                                                    {player.photoURL ? (
                                                        <img
                                                            src={player.photoURL}
                                                            alt={player.username}
                                                            className="ap-table-avatar-img"
                                                        />
                                                    ) : (
                                                        <div className="ap-table-avatar">
                                                            {(player.username || "P")[0].toUpperCase()}
                                                        </div>
                                                    )}
                                                    <span className={`ap-status-indicator ${player.status.toLowerCase()}`} />
                                                </div>

                                                <div className="ap-table-player-meta">
                                                    <div className="ap-player-name-row">
                                                        <span className="ap-player-name">{player.username}</span>
                                                        {player.isMe && <span className="ap-self-pill">YOU</span>}
                                                    </div>

                                                    <div className="ap-player-sub-row">
                                                        <span
                                                            className="ap-code-badge"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                copyCode(codeToCopy);
                                                            }}
                                                            title="Click to copy platform code"
                                                        >
                                                            {codeToCopy} <FontAwesomeIcon icon={faCopy} />
                                                        </span>

                                                        {player.institutionName && (
                                                            <span className="ap-table-inst-text" title={player.institutionName}>
                                                                <FontAwesomeIcon icon={faBuildingColumns} /> {player.institutionName}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Col 2: Live Status */}
                                        <td className="td-status">
                                            {isAvailable ? (
                                                <span className="ap-status-pill available">
                                                    <span className="pulse-dot available" /> Available
                                                </span>
                                            ) : isInBattle ? (
                                                <span className="ap-status-pill battle">
                                                    <span className="pulse-dot battle" /> In Duel
                                                </span>
                                            ) : isInLobby ? (
                                                <span className="ap-status-pill lobby">
                                                    <span className="pulse-dot lobby" /> In Lobby
                                                </span>
                                            ) : (
                                                <span className="ap-status-pill online">
                                                    <span className="pulse-dot online" /> Online
                                                </span>
                                            )}
                                        </td>

                                        {/* Col 3: Rating & Tier */}
                                        <td className="td-rating">
                                            <div className="ap-rating-tier-cell">
                                                <div className="ap-table-rating-num">{player.rating ?? 1200}</div>
                                                <RankEmblem rating={player.rating ?? 1200} size={22} showBadge={true} glow={false} />
                                            </div>
                                        </td>

                                        {/* Col 4: Record & Win Rate */}
                                        <td className="td-record">
                                            <div className="ap-table-record-cell">
                                                <div className="ap-record-text">
                                                    <strong>{player.winRate || 0}% Win Rate</strong>
                                                    <span>({player.matchesWon || 0}W / {player.matchesPlayed || 0}M)</span>
                                                </div>
                                                <div className="ap-winrate-track">
                                                    <div
                                                        className="ap-winrate-fill"
                                                        style={{ width: `${Math.min(100, Math.max(6, player.winRate || 0))}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>

                                        {/* Col 5: Actions */}
                                        <td className="td-action text-right">
                                            {player.isMe ? (
                                                <button
                                                    className="ap-btn-table-self"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate("/profile");
                                                    }}
                                                >
                                                    <FontAwesomeIcon icon={faShieldHalved} /> Your Profile
                                                </button>
                                            ) : isAvailable ? (
                                                <button
                                                    className="ap-btn-table-challenge"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleSendChallenge(player);
                                                    }}
                                                    title={`Send direct 1v1 duel challenge to ${player.username}`}
                                                >
                                                    <FontAwesomeIcon icon={faBolt} /> Challenge 1v1
                                                </button>
                                            ) : isInBattle ? (
                                                <span className="ap-status-tag-in-battle">
                                                    <FontAwesomeIcon icon={faFire} /> In Active Duel
                                                </span>
                                            ) : (
                                                <span className="ap-status-tag-in-lobby">
                                                    <FontAwesomeIcon icon={faHourglassHalf} /> In Lobby
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Empty State */}
                {filteredPlayers.length === 0 && !loading && (
                    <div className="ap-empty-box">
                        <FontAwesomeIcon icon={faUsers} className="ap-empty-icon" />
                        <h3>{onlineCount === 0 ? "No Other Players Online" : "No Matching Online Combatants"}</h3>
                        <p>
                            {onlineCount === 0
                                ? "There are currently no other combatants online right now. You can challenge our adaptive AlgoBot AI instantly or share your room code with peers!"
                                : "No online combatants matched your active search or status filter."}
                        </p>
                        <div className="ap-empty-actions">
                            {onlineCount === 0 ? (
                                <button
                                    className="ap-btn-bot-duel"
                                    onClick={() => navigate("/battle/live", { state: { autoBot: true } })}
                                >
                                    <FontAwesomeIcon icon={faRobot} /> Duel AlgoBot (AI) Now
                                </button>
                            ) : (
                                <button
                                    className="ap-empty-reset-btn"
                                    onClick={() => {
                                        setSearchQuery("");
                                        setStatusFilter("ALL");
                                    }}
                                >
                                    Reset Filters
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Outgoing Challenge Dialog */}
            <AnimatePresence>
                {outgoingChallenge && (
                    <motion.div
                        className="ap-modal-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="ap-challenge-modal"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                        >
                            <div className="ap-modal-icon-halo">
                                <FontAwesomeIcon icon={faCrosshairs} />
                            </div>
                            <h3 className="ap-modal-title">Duel Challenge Sent!</h3>
                            <p className="ap-modal-desc">
                                Waiting for <span className="ap-modal-target-name">{outgoingChallenge.targetUsername}</span> to accept your 1v1 challenge...
                            </p>

                            <div className="ap-modal-timer-bar">
                                <div
                                    className="ap-modal-timer-progress"
                                    style={{ width: `${(challengeTimeRemaining / 30) * 100}%` }}
                                />
                            </div>

                            <button className="ap-modal-btn-cancel" onClick={handleCancelChallenge}>
                                Cancel Challenge ({challengeTimeRemaining}s)
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Incoming Challenge Modal */}
            <AnimatePresence>
                {incomingChallenge && (
                    <motion.div
                        className="ap-modal-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="ap-challenge-modal ap-incoming-card"
                            initial={{ scale: 0.85, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.85, opacity: 0 }}
                        >
                            <div className="ap-modal-icon-halo ap-incoming-icon-halo">
                                <FontAwesomeIcon icon={faFire} />
                            </div>
                            <h3 className="ap-modal-title">Incoming 1v1 Challenge!</h3>
                            <p className="ap-modal-desc">
                                <span className="ap-modal-target-name">{incomingChallenge.fromUsername}</span> (Rating: {incomingChallenge.fromRating ?? 1200}) has challenged you to an instant battle duel!
                            </p>

                            {incomingChallenge.config && (
                                <div style={{ display: "flex", justifyContent: "center", gap: "12px", margin: "10px 0", fontSize: "0.8rem", color: "#00e5ff", background: "rgba(0, 229, 255, 0.08)", padding: "6px 12px", borderRadius: "8px", border: "1px solid rgba(0, 229, 255, 0.25)" }}>
                                    <span>⏱️ {incomingChallenge.config.timeLimitMinutes || 15} Mins</span>
                                    <span>🎯 {incomingChallenge.config.difficulty || "MEDIUM"}</span>
                                    <span>📝 {incomingChallenge.config.problemCount || 1} Question{(incomingChallenge.config.problemCount || 1) > 1 ? "s" : ""}</span>
                                </div>
                            )}

                            <div className="ap-modal-timer-bar">
                                <div
                                    className="ap-modal-timer-progress"
                                    style={{ width: `${(challengeTimeRemaining / 30) * 100}%` }}
                                />
                            </div>

                            <div className="ap-incoming-actions">
                                <button className="ap-btn-accept" onClick={handleAcceptChallenge}>
                                    <FontAwesomeIcon icon={faCheck} /> Accept Duel ({challengeTimeRemaining}s)
                                </button>
                                <button className="ap-btn-decline" onClick={handleDeclineChallenge}>
                                    <FontAwesomeIcon icon={faTimes} /> Decline
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
