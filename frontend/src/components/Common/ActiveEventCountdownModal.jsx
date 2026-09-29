import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBolt, faPlay } from "@fortawesome/free-solid-svg-icons";
import { useActiveEvent } from "../../contexts/ActiveEventContext";
import "./ActiveEventCountdownModal.css";

export default function ActiveEventCountdownModal() {
    const { countdown, activeEvent, returnToEvent } = useActiveEvent();

    if (countdown === null) return null;

    return (
        <AnimatePresence>
            <div className="countdown-overlay-backdrop">
                <motion.div
                    className="countdown-modal-box"
                    initial={{ opacity: 0, scale: 0.85, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.85, y: -20 }}
                    transition={{ duration: 0.2 }}
                >
                    <div className="countdown-glow-line" />
                    
                    <div className="countdown-icon-halo">
                        <FontAwesomeIcon icon={faBolt} className="countdown-bolt-icon" />
                    </div>

                    <h2 className="countdown-heading">BATTLE COMMENCED!</h2>
                    <p className="countdown-subtext">
                        Host launched the match in{" "}
                        <span className="countdown-room-badge">{activeEvent?.roomCode || "your lobby"}</span>.
                        Transferring to combat arena in:
                    </p>

                    <div className="countdown-number-circle">
                        <motion.span
                            key={countdown}
                            initial={{ scale: 1.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.5, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="countdown-digit"
                        >
                            {countdown}
                        </motion.span>
                    </div>

                    <button
                        type="button"
                        className="countdown-instant-btn"
                        onClick={returnToEvent}
                    >
                        <FontAwesomeIcon icon={faPlay} />
                        <span>Enter Arena Immediately</span>
                    </button>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
