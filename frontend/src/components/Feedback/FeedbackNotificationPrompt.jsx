import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar, faTimes, faCommentDots } from '@fortawesome/free-solid-svg-icons';
import FeedbackModal from './FeedbackModal';
import { useNotificationInbox } from '../../contexts/NotificationInboxContext';
import './FeedbackNotificationPrompt.css';

export default function FeedbackNotificationPrompt() {
    const { addFeedbackNotificationToInbox } = useNotificationInbox();
    const [isVisible, setIsVisible] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        // Check if user already submitted feedback
        const hasSubmitted = localStorage.getItem('af_feedback_submitted') === 'true';
        if (hasSubmitted) return;

        // Ensure the feedback form resides in their inbox right away
        if (typeof addFeedbackNotificationToInbox === 'function') {
            addFeedbackNotificationToInbox();
        }

        // Check if welcome prompt was already dismissed in this browser session
        const sessionPromptShown = sessionStorage.getItem('af_welcome_feedback_prompt_shown');
        if (sessionPromptShown) return;

        // Trigger welcome prompt after 2 seconds
        const timer = setTimeout(() => {
            setIsVisible(true);
            sessionStorage.setItem('af_welcome_feedback_prompt_shown', 'true');
        }, 2000);

        return () => clearTimeout(timer);
    }, [addFeedbackNotificationToInbox]);

    // Auto-leave notification after 10 seconds if untouched
    useEffect(() => {
        if (!isVisible) return;
        const autoDismissTimer = setTimeout(() => {
            handleDismiss();
        }, 10000);

        return () => clearTimeout(autoDismissTimer);
    }, [isVisible]);

    const handleDismiss = () => {
        setIsVisible(false);
        // Ensure feedback form definitely resides in the inbox once notification leaves
        if (typeof addFeedbackNotificationToInbox === 'function') {
            addFeedbackNotificationToInbox();
        }
    };

    const handleOpenForm = () => {
        setIsVisible(false);
        setIsModalOpen(true);
        if (typeof addFeedbackNotificationToInbox === 'function') {
            addFeedbackNotificationToInbox();
        }
    };

    return (
        <>
            <AnimatePresence>
                {isVisible && (
                    <motion.aside
                        className="feedback-welcome-toast"
                        initial={{ opacity: 0, y: -25, x: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.92 }}
                        transition={{ duration: 0.28, ease: 'easeOut' }}
                        role="dialog"
                        aria-label="Welcome Feedback Notification"
                    >
                        <div className="feedback-toast-glow" />
                        <div className="feedback-toast-content">
                            <div className="feedback-toast-icon-wrap">
                                <FontAwesomeIcon icon={faStar} className="feedback-toast-star" />
                            </div>

                            <div className="feedback-toast-text">
                                <div className="feedback-toast-badge-row">
                                    <span className="feedback-toast-badge">NEW COMBATANT NOTICE</span>
                                    <span className="feedback-toast-inbox-hint">Saved to Inbox 📬</span>
                                </div>
                                <h4 className="feedback-toast-title">Welcome to AlgoFight! ⚡</h4>
                                <p className="feedback-toast-msg">
                                    How is your arena experience so far? Rate the platform and share your suggestions with us!
                                </p>

                                <div className="feedback-toast-actions">
                                    <button
                                        type="button"
                                        className="feedback-toast-btn-action"
                                        onClick={handleOpenForm}
                                    >
                                        <FontAwesomeIcon icon={faCommentDots} /> Give Feedback
                                    </button>
                                    <button
                                        type="button"
                                        className="feedback-toast-btn-later"
                                        onClick={handleDismiss}
                                    >
                                        Later (In Inbox)
                                    </button>
                                </div>
                            </div>

                            <button
                                type="button"
                                className="feedback-toast-close"
                                onClick={handleDismiss}
                                aria-label="Close notification"
                            >
                                <FontAwesomeIcon icon={faTimes} />
                            </button>
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>

            {/* Standalone Feedback Modal if clicked directly from notification */}
            <FeedbackModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </>
    );
}
