import React from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faHourglassHalf,
    faBolt,
    faCrosshairs,
    faArrowRight,
    faTimes,
    faUsers,
    faShieldHalved,
} from "@fortawesome/free-solid-svg-icons";
import { useActiveEvent } from "../../contexts/ActiveEventContext";
import "./ActiveEventDock.css";

export default function ActiveEventDock() {
    const { activeEvent, returnToEvent, leaveActiveEvent } = useActiveEvent();
    const location = useLocation();

    if (!activeEvent) return null;

    // Check if user is currently already on the event's page
    const isCurrentRoute =
        (activeEvent.type === "LOBBY" &&
            (location.pathname === `/battle/room/${encodeURIComponent(activeEvent.roomCode)}` ||
                location.pathname === `/battle/room/${activeEvent.roomCode}`)) ||
        (activeEvent.type === "BATTLE" && location.pathname.startsWith("/battle/live"));

    if (isCurrentRoute) return null;

    const getIcon = () => {
        switch (activeEvent.type) {
            case "BATTLE":
                return faBolt;
            case "MATCHMAKING":
                return faCrosshairs;
            default:
                return faHourglassHalf;
        }
    };

    const getStatusText = () => {
        if (activeEvent.type === "BATTLE") {
            return "Live Match in Progress";
        }
        if (activeEvent.type === "MATCHMAKING") {
            return "Searching 1v1 Challenger...";
        }
        return activeEvent.status === "READY"
            ? "Ready for Battle • Waiting for Host"
            : "Waiting for Host to Start";
    };

    return (
        <AnimatePresence>
            <motion.aside
                className="af-active-event-dock"
                initial={{ opacity: 0, y: 35, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 35, scale: 0.94 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                role="region"
                aria-label="Active Event Session"
            >
                <div className="dock-glow-edge" />
                <div className="dock-content-wrapper">
                    {/* Live Pulse Indicator */}
                    <div className="dock-pulse-indicator">
                        <span className="dock-pulse-ping" />
                        <span className="dock-pulse-dot" />
                    </div>

                    {/* Icon */}
                    <div className="dock-icon-box">
                        <FontAwesomeIcon icon={getIcon()} />
                    </div>

                    {/* Meta info */}
                    <div className="dock-meta" onClick={returnToEvent}>
                        <div className="dock-title-row">
                            <span className="dock-tag">
                                {activeEvent.type === "BATTLE" ? "ARENA MATCH" : "ACTIVE LOBBY"}
                            </span>
                            {activeEvent.roomCode && (
                                <span className="dock-room-code">{activeEvent.roomCode}</span>
                            )}
                            {activeEvent.participantCount !== undefined && (
                                <span className="dock-participant-pill">
                                    <FontAwesomeIcon icon={faUsers} /> {activeEvent.participantCount}
                                </span>
                            )}
                        </div>
                        <div className="dock-desc-row">
                            <span className="dock-status-label">{getStatusText()}</span>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="dock-actions">
                        <button
                            type="button"
                            className="dock-btn-return"
                            onClick={returnToEvent}
                            title="Return to room lobby"
                        >
                            <span>Return to Lobby</span>
                            <FontAwesomeIcon icon={faArrowRight} />
                        </button>

                        <button
                            type="button"
                            className="dock-btn-leave"
                            onClick={leaveActiveEvent}
                            title="Leave room"
                            aria-label="Leave event"
                        >
                            <FontAwesomeIcon icon={faTimes} />
                        </button>
                    </div>
                </div>
            </motion.aside>
        </AnimatePresence>
    );
}
