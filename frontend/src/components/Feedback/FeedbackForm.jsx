import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar, faPaperPlane, faCheckCircle, faGlobe, faCommentDots } from '@fortawesome/free-solid-svg-icons';
import { submitPlatformFeedback } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import './FeedbackForm.css';

const RATING_LABELS = {
    1: 'Needs Improvement ⚠️',
    2: 'Fair Experience ⚡',
    3: 'Good & Promising 🛡️',
    4: 'Great Platform! 🚀',
    5: 'Exceptional Duel Arena! 🏆',
};

export default function FeedbackForm({ isCompact = false, onSubmitted, onClose }) {
    const { user } = useAuth();
    const { notify } = useNotification();

    const [rating, setRating] = useState(5);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState('');
    const [showcaseOnWebsite, setShowcaseOnWebsite] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(() => {
        return localStorage.getItem('af_feedback_submitted') === 'true';
    });

    const activeRating = hoverRating || rating;

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (!comment.trim()) {
            notify({
                type: 'warning',
                title: 'Comment Required',
                message: 'Please write a brief comment or suggestion before submitting.',
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                rating,
                comment: comment.trim(),
                showcaseOnWebsite,
                name: user?.displayName || user?.email?.split('@')[0] || 'Combatant',
                email: user?.email || undefined,
            };

            await submitPlatformFeedback(payload);

            localStorage.setItem('af_feedback_submitted', 'true');
            localStorage.setItem('af_feedback_submitted_at', String(Date.now()));
            localStorage.setItem('af_feedback_rating', String(rating));
            localStorage.setItem('af_feedback_comment', comment.trim());

            setSubmitted(true);

            notify({
                type: 'success',
                title: 'Feedback Received! ⚔️',
                message: showcaseOnWebsite
                    ? 'Thank you! Your feedback will be showcased on our community testimonials.'
                    : 'Thank you! Your feedback helps us build a sharper duel arena.',
                duration: 4500,
            });

            if (onSubmitted) {
                onSubmitted({ rating, comment, showcaseOnWebsite });
            }
        } catch (err) {
            console.error('Feedback submit error:', err);
            notify({
                type: 'error',
                title: 'Submission Failed',
                message: err?.message || 'Could not send feedback. Please try again.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <motion.div
                className={`feedback-success-card ${isCompact ? 'compact' : ''}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
            >
                <div className="success-icon-wrapper">
                    <FontAwesomeIcon icon={faCheckCircle} className="success-check-icon" />
                </div>
                <h4>Feedback Submitted!</h4>
                <p>
                    Thank you for sharpening AlgoFight. Your insights help make competitive programming faster, fairer,
                    and more exciting for everyone.
                </p>
                <div className="submitted-summary-stars">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <FontAwesomeIcon
                            key={star}
                            icon={faStar}
                            className={`summary-star ${star <= Number(localStorage.getItem('af_feedback_rating') || rating) ? 'filled' : ''}`}
                        />
                    ))}
                </div>
                {onClose && (
                    <button type="button" className="feedback-done-btn" onClick={onClose}>
                        Done
                    </button>
                )}
            </motion.div>
        );
    }

    return (
        <form className={`af-feedback-form ${isCompact ? 'compact' : ''}`} onSubmit={handleSubmit}>
            {/* Header info for compact inbox card */}
            {isCompact ? (
                <div className="feedback-compact-header">
                    <div className="feedback-tag">
                        <FontAwesomeIcon icon={faCommentDots} />
                        <span>QUICK REVIEW</span>
                    </div>
                    <span className="feedback-sub-prompt">How is your arena experience?</span>
                </div>
            ) : null}

            {/* Star Rating Selector */}
            <div className="feedback-rating-group">
                <label className="feedback-label">Your Rating</label>
                <div className="stars-interactive-row" onMouseLeave={() => setHoverRating(0)}>
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            type="button"
                            className={`star-btn ${star <= activeRating ? 'active' : ''}`}
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            aria-label={`${star} Star`}
                        >
                            <FontAwesomeIcon icon={faStar} />
                        </button>
                    ))}
                    <span className="rating-text-indicator">{RATING_LABELS[activeRating] || ''}</span>
                </div>
            </div>

            {/* Comment Area */}
            <div className="feedback-input-group">
                <label className="feedback-label" htmlFor="feedback-comment">
                    Your Thoughts or Suggestions
                </label>
                <textarea
                    id="feedback-comment"
                    rows={isCompact ? 2 : 4}
                    className="feedback-textarea"
                    placeholder="What do you love most, or what features would you like to see next? (e.g. UI, matchmaking, problems...)"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    maxLength={1000}
                    required
                />
                <div className="char-count">{comment.length}/1000</div>
            </div>

            {/* Showcase Checker Toggle */}
            <div className="feedback-showcase-box" onClick={() => setShowcaseOnWebsite((prev) => !prev)}>
                <input
                    type="checkbox"
                    id="showcaseOnWebsite"
                    className="feedback-checkbox"
                    checked={showcaseOnWebsite}
                    onChange={(e) => setShowcaseOnWebsite(e.target.checked)}
                    onClick={(e) => e.stopPropagation()}
                />
                <label htmlFor="showcaseOnWebsite" className="showcase-label" onClick={(e) => e.stopPropagation()}>
                    <span className="showcase-title">
                        <FontAwesomeIcon icon={faGlobe} className="globe-icon" /> Showcase my comment on the website
                    </span>
                    <span className="showcase-desc">
                        Feature your feedback and username in our community testimonials section on the homepage.
                    </span>
                </label>
            </div>

            {/* Submit Action Button */}
            <div className="feedback-actions-row">
                {onClose && (
                    <button type="button" className="feedback-btn-cancel" onClick={onClose} disabled={isSubmitting}>
                        Cancel
                    </button>
                )}
                <button type="submit" className="feedback-btn-submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                        <span className="btn-spinner">Submitting...</span>
                    ) : (
                        <>
                            <FontAwesomeIcon icon={faPaperPlane} />
                            <span>Submit Feedback</span>
                        </>
                    )}
                </button>
            </div>
        </form>
    );
}
