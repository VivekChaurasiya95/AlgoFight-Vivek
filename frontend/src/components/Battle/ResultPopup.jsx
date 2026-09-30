import React from "react";
import { motion } from "framer-motion";
import "./ResultPopup.css";

export default function ResultPopup({ result, onClose }) {
  const { winner, message, stats } = result || {};
  const youWon = winner === "You";
  const title = youWon ? "Victory" : winner ? `${winner} Won` : "Battle Result";

  return (
    <motion.div
      className="result-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className={`result-card ${youWon ? "result-card-win" : "result-card-loss"}`}
        initial={{ y: 40, scale: 0.96, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
      >
        <span className="result-accent" aria-hidden="true" />

        <div className="result-head">
          <div className="result-winner">{title}</div>
          <button className="close-x" onClick={onClose} aria-label="Close battle result">x</button>
        </div>

        <div className="result-body">
          <p className="result-msg">{message}</p>
          {stats && (
            <div className="result-stats">
              <div>Score: <strong>{stats.score ?? "-"}</strong></div>
              <div>Time: <strong>{stats.time ?? "-"}</strong></div>
              <div>Tab Switches: <strong style={{ color: (stats.tabSwitches ?? 0) > 0 ? '#f59e0b' : '#e9f5ff' }}>{stats.tabSwitches ?? 0}</strong></div>
            </div>
          )}
        </div>

        <div className="result-actions">
          <button className="btn primary" onClick={onClose}>Close</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
