import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faBolt,
    faDoorOpen,
    faTimes,
    faShieldHalved,
    faPaperPlane,
    faCheckCircle,
    faTriangleExclamation,
    faSpinner,
    faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { useActiveEvent } from "../../contexts/ActiveEventContext";
import { useAuth } from "../../contexts/AuthContext";
import { getSocket } from "../../services/socket";
import "./RejoinSessionModal.css";

export default function RejoinSessionModal() {
    const {
        activeEvent,
        returnToEvent,
        leaveActiveEvent,
        isRejoinModalOpen,
        closeRejoinModal,
        updateActiveEvent,
    } = useActiveEvent();
    const { user } = useAuth();
    const location = useLocation();

    const [reentryStatus, setReentryStatus] = useState("idle"); // 'idle' | 'pending' | 'approved' | 'rejected'

    // Check if user is currently already on the active event's live page
    const isCurrentRoute =
        (activeEvent?.type === "LOBBY" &&
            (location.pathname === `/battle/room/${encodeURIComponent(activeEvent.roomCode)}` ||
                location.pathname === `/battle/room/${activeEvent.roomCode}`)) ||
        (activeEvent?.type === "BATTLE" && location.pathname.startsWith("/battle/live"));

    // Reset reentry status when activeEvent room changes
    useEffect(() => {
        setReentryStatus("idle");
    }, [activeEvent?.roomCode]);

    // Socket listeners for pardon responses
    useEffect(() => {
        const socket = getSocket();
        if (!socket || !activeEvent) return;

        const handleApproved = (data) => {
            setReentryStatus("approved");
            updateActiveEvent({ isDisqualified: false });
        };

        const handleRejected = () => {
            setReentryStatus("rejected");
        };

        const handlePending = () => {
            setReentryStatus("pending");
        };

        socket.on("anticheat_reentry_approved", handleApproved);
        socket.on("anticheat_reentry_rejected", handleRejected);
        socket.on("anticheat_reentry_pending", handlePending);

        return () => {
            socket.off("anticheat_reentry_approved", handleApproved);
            socket.off("anticheat_reentry_rejected", handleRejected);
            socket.off("anticheat_reentry_pending", handlePending);
        };
    }, [activeEvent, updateActiveEvent]);

    if (!activeEvent || !isRejoinModalOpen || isCurrentRoute) {
        return null;
    }

    const isDisqualified = Boolean(activeEvent.isDisqualified);
    const roomCode = activeEvent.roomCode || "ARENA";
    const totalSwitches = activeEvent.tabSwitches || 3;

    const handleSendPardonRequest = () => {
        const socket = getSocket();
        const targetId = activeEvent.roomId || activeEvent.roomCode;
        if (socket && targetId) {
            setReentryStatus("pending");
            socket.emit("request_anticheat_reentry", {
                roomId: targetId,
                roomCode: activeEvent.roomCode,
                tabSwitches: totalSwitches,
                userId: user?.uid,
                username: user?.displayName || "Combatant",
            });
        }
    };

    return (
        <AnimatePresence>
            <div className="af-rejoin-backdrop" role="dialog" aria-modal="true">
                <motion.div
                    className={`af-rejoin-card ${isDisqualified ? "disqualified-card" : "disconnected-card"}`}
                    initial={{ opacity: 0, scale: 0.9, y: 25 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 25 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                >
                    <div className="rejoin-card-glow" />

                    {/* Close / Minimize to Dock button */}
                    <button
                        type="button"
                        className="rejoin-btn-close"
                        onClick={closeRejoinModal}
                        title="Minimize to Dock"
                        aria-label="Minimize"
                    >
                        <FontAwesomeIcon icon={faTimes} />
                    </button>

                    {/* Modal Content */}
                    <div className="rejoin-body">
                        {isDisqualified ? (
                            /* ================= STATE B: ANTI-CHEAT DISQUALIFIED ================= */
                            <>
                                <div className="rejoin-badge badge-disqualified">
                                    <FontAwesomeIcon icon={faShieldHalved} />
                                    <span>ANTI-CHEAT DISQUALIFICATION</span>
                                </div>

                                <div className="rejoin-icon-circle circle-danger">
                                    <FontAwesomeIcon icon={faTriangleExclamation} />
                                </div>

                                <h2 className="rejoin-title">Direct Re-Entry Blocked</h2>
                                <p className="rejoin-desc">
                                    You were disqualified from room{" "}
                                    <span className="rejoin-room-badge">{roomCode}</span> for exceeding allowable
                                    tab switches. You cannot directly rejoin without host approval.
                                </p>

                                <div className="rejoin-stat-strip">
                                    <div className="stat-pill">
                                        <span className="stat-pill-label">Total Tab Switches</span>
                                        <span className="stat-pill-val amber">{totalSwitches}</span>
                                    </div>
                                    <div className="stat-pill">
                                        <span className="stat-pill-label">Violations</span>
                                        <span className="stat-pill-val red">3 / 3 (Limit Exceeded)</span>
                                    </div>
                                </div>

                                <div className="rejoin-pardon-container">
                                    {reentryStatus === "idle" && (
                                        <div className="rejoin-actions">
                                            <button
                                                type="button"
                                                className="btn-pardon-send"
                                                onClick={handleSendPardonRequest}
                                            >
                                                <FontAwesomeIcon icon={faPaperPlane} />
                                                <span>Send Re-Entry Request to Host</span>
                                            </button>
                                            <button
                                                type="button"
                                                className="btn-pardon-leave"
                                                onClick={leaveActiveEvent}
                                            >
                                                Leave Room
                                            </button>
                                        </div>
                                    )}

                                    {reentryStatus === "pending" && (
                                        <div className="pardon-status-box pending-box">
                                            <FontAwesomeIcon icon={faSpinner} spin className="pending-icon" />
                                            <div>
                                                <h4>Request Submitted to Host</h4>
                                                <p>Waiting for the room host to review and approve your re-entry...</p>
                                            </div>
                                            <button
                                                type="button"
                                                className="btn-pardon-leave-small"
                                                onClick={leaveActiveEvent}
                                            >
                                                Leave Room
                                            </button>
                                        </div>
                                    )}

                                    {reentryStatus === "approved" && (
                                        <div className="pardon-status-box approved-box">
                                            <FontAwesomeIcon icon={faCheckCircle} className="approved-icon" />
                                            <div>
                                                <h4>Re-Entry Approved!</h4>
                                                <p>The host approved your request. You can re-enter the arena now.</p>
                                            </div>
                                            <button
                                                type="button"
                                                className="btn-rejoin-primary"
                                                onClick={returnToEvent}
                                            >
                                                <FontAwesomeIcon icon={faDoorOpen} />
                                                <span>Re-Enter Arena Now</span>
                                            </button>
                                        </div>
                                    )}

                                    {reentryStatus === "rejected" && (
                                        <div className="pardon-status-box rejected-box">
                                            <FontAwesomeIcon icon={faTimes} className="rejected-icon" />
                                            <div>
                                                <h4>Re-Entry Declined</h4>
                                                <p>The host declined your re-entry request for this battle.</p>
                                            </div>
                                            <button
                                                type="button"
                                                className="btn-pardon-leave"
                                                onClick={leaveActiveEvent}
                                            >
                                                Leave Room
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            /* ================= STATE A: DISCONNECTED / ACTIVE LOBBY ================= */
                            <>
                                <div className="rejoin-badge badge-active">
                                    <FontAwesomeIcon icon={activeEvent.type === "BATTLE" ? faBolt : faUsers} />
                                    <span>
                                        {activeEvent.type === "BATTLE" ? "LIVE BATTLE IN PROGRESS" : "LOBBY SESSION ACTIVE"}
                                    </span>
                                </div>

                                <div className="rejoin-icon-circle circle-cyan">
                                    <FontAwesomeIcon icon={activeEvent.type === "BATTLE" ? faBolt : faDoorOpen} />
                                </div>

                                <h2 className="rejoin-title">Rejoin Active Session</h2>
                                <p className="rejoin-desc">
                                    You were disconnected or stepped away from room{" "}
                                    <span className="rejoin-room-badge">{roomCode}</span>. Would you like to rejoin
                                    now?
                                </p>

                                <div className="rejoin-actions">
                                    <button
                                        type="button"
                                        className="btn-rejoin-primary"
                                        onClick={returnToEvent}
                                    >
                                        <FontAwesomeIcon icon={faDoorOpen} />
                                        <span>
                                            {activeEvent.type === "BATTLE" ? "Rejoin Battle Arena" : "Rejoin Lobby"}
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        className="btn-rejoin-leave"
                                        onClick={leaveActiveEvent}
                                    >
                                        Leave Session
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
