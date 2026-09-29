import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faCommentDots } from '@fortawesome/free-solid-svg-icons';
import FeedbackForm from './FeedbackForm';
import './FeedbackModal.css';

export default function FeedbackModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="feedback-modal-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.div
                    className="feedback-modal-container"
                    initial={{ opacity: 0, scale: 0.94, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.94, y: 15 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="feedback-modal-header">
                        <div className="feedback-header-left">
                            <div className="feedback-header-icon">
                                <FontAwesomeIcon icon={faCommentDots} />
                            </div>
                            <div>
                                <h3 className="feedback-modal-title">AlgoFight Feedback</h3>
                                <p className="feedback-modal-subtitle">Share your combat experience & ideas</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            className="feedback-modal-close-btn"
                            onClick={onClose}
                            aria-label="Close"
                        >
                            <FontAwesomeIcon icon={faTimes} />
                        </button>
                    </div>

                    <div className="feedback-modal-body">
                        <FeedbackForm onClose={onClose} />
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
