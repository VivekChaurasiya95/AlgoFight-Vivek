import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faBell,
    faBolt,
    faCheckDouble,
    faCrosshairs,
    faInfoCircle,
    faTimes,
    faTrash,
    faTrophy,
    faBullhorn,
    faComments,
} from '@fortawesome/free-solid-svg-icons';
import { getSocket } from '../../services/socket';
import { useNotificationInbox } from '../../contexts/NotificationInboxContext';
import SystemBroadcastCard from '../Common/broadcasts/SystemBroadcastCard.jsx';
import FeedbackInboxCard from '../Feedback/FeedbackInboxCard.jsx';
import './InboxDropdown.css';

function formatTimeAgo(timestamp) {
    if (!timestamp) return 'Just now';
    const timeMs = typeof timestamp === 'string' ? new Date(timestamp).getTime() : Number(timestamp);
    if (isNaN(timeMs)) return 'Just now';
    const seconds = Math.max(0, Math.floor((Date.now() - timeMs) / 1000));
    if (seconds < 45) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(timeMs).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getNotificationIcon(type) {
    switch (type) {
        case 'SYSTEM':
            return faBullhorn;
        case 'CHALLENGE':
        case 'PUBLIC_CHALLENGE':
            return faCrosshairs;
        case 'CHALLENGE_ACCEPTED':
            return faBolt;
        case 'CHALLENGE_DECLINED':
            return faTimes;
        case 'BATTLE_START':
        case 'BATTLE_RESULT':
            return faTrophy;
        case 'FEEDBACK':
            return faComments;
        default:
            return faInfoCircle;
    }
}

function getNotificationTone(type) {
    switch (type) {
        case 'SYSTEM':
            return 'tone-cyan';
        case 'CHALLENGE':
            return 'tone-cyan';
        case 'PUBLIC_CHALLENGE':
            return 'tone-gold';
        case 'CHALLENGE_ACCEPTED':
            return 'tone-green';
        case 'CHALLENGE_DECLINED':
            return 'tone-pink';
        case 'BATTLE_START':
        case 'BATTLE_RESULT':
            return 'tone-gold';
        case 'FEEDBACK':
            return 'tone-purple';
        default:
            return 'tone-cyan';
    }
}

export default function InboxDropdown({ isOpen, onClose }) {
    const navigate = useNavigate();
    const { notifications, unreadCount, markAsRead, markAllAsRead, clearInbox } = useNotificationInbox();
    const [filter, setFilter] = useState('ALL');

    // Close on Escape key
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const handleAcceptChallenge = (e, challengeId, notificationId) => {
        e.stopPropagation();
        const socket = getSocket();
        if (socket) {
            socket.emit("accept_challenge", { challengeId });
        }
        markAsRead(notificationId);
        onClose();
    };

    const handleDeclineChallenge = (e, challengeId, notificationId) => {
        e.stopPropagation();
        const socket = getSocket();
        if (socket) {
            socket.emit("decline_challenge", { challengeId });
        }
        markAsRead(notificationId);
    };

    if (!isOpen) return null;

    const filteredNotifications = notifications.filter((item) => {
        if (filter === 'UNREAD') return !item.read;
        return true;
    });

    return (
        <AnimatePresence>
            <motion.div
                className="inbox-dropdown-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                onClick={onClose}
            >
                <motion.div
                    className="inbox-dropdown-panel"
                    initial={{ opacity: 0, y: -12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.98 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="inbox-panel-header">
                        <div className="inbox-header-title">
                            <div className="inbox-bell-wrap">
                                <FontAwesomeIcon icon={faBell} />
                            </div>
                            <h3>Notifications</h3>
                            {unreadCount > 0 && (
                                <span className="inbox-unread-count-pill">{unreadCount}</span>
                            )}
                        </div>

                        <div className="inbox-header-actions">
                            {unreadCount > 0 && (
                                <button
                                    type="button"
                                    className="inbox-header-action-btn"
                                    onClick={markAllAsRead}
                                    title="Mark all as read"
                                >
                                    <FontAwesomeIcon icon={faCheckDouble} />
                                    <span>Read all</span>
                                </button>
                            )}
                            {notifications.length > 0 && (
                                <button
                                    type="button"
                                    className="inbox-header-action-btn tone-clear"
                                    onClick={clearInbox}
                                    title="Clear all notifications"
                                >
                                    <FontAwesomeIcon icon={faTrash} />
                                </button>
                            )}
                            <button
                                type="button"
                                className="inbox-close-btn"
                                onClick={onClose}
                                title="Close"
                                aria-label="Close"
                            >
                                <FontAwesomeIcon icon={faTimes} />
                            </button>
                        </div>
                    </div>

                    {/* Filter Tabs (Clean 2-tab segmented control) */}
                    <div className="inbox-filter-bar">
                        <button
                            type="button"
                            className={`inbox-filter-tab ${filter === 'ALL' ? 'active' : ''}`}
                            onClick={() => setFilter('ALL')}
                        >
                            All ({notifications.length})
                        </button>
                        <button
                            type="button"
                            className={`inbox-filter-tab ${filter === 'UNREAD' ? 'active' : ''}`}
                            onClick={() => setFilter('UNREAD')}
                        >
                            Unread ({unreadCount})
                        </button>
                    </div>

                    {/* Notification List */}
                    <div className="inbox-notification-list">
                        {filteredNotifications.length === 0 ? (
                            <div className="inbox-empty-state">
                                <div className="inbox-empty-icon-wrap">
                                    <FontAwesomeIcon icon={faBell} />
                                </div>
                                <h4>No notifications</h4>
                                <p>
                                    {filter === 'UNREAD'
                                        ? "You've read all your notifications!"
                                        : "You're all caught up for now."}
                                </p>
                            </div>
                        ) : (
                            filteredNotifications.map((item) => {
                                if (item.type === 'FEEDBACK' || item.metadata?.isFeedback) {
                                    return (
                                        <FeedbackInboxCard
                                            key={item.id}
                                            item={item}
                                            onCompleted={() => {
                                                markAsRead(item.id);
                                            }}
                                        />
                                    );
                                }

                                const isBroadcast = item.type === 'SYSTEM' || item.metadata?.isBroadcast;

                                if (isBroadcast) {
                                    return (
                                        <div
                                            key={item.id}
                                            className={`inbox-broadcast-wrapper ${!item.read ? 'is-unread' : ''}`}
                                            onClick={() => markAsRead(item.id)}
                                        >
                                            <SystemBroadcastCard
                                                broadcast={{
                                                    id: item.id,
                                                    title: item.title,
                                                    message: item.message,
                                                    type: item.metadata?.broadcastType || 'INFO',
                                                    createdAt: item.createdAt,
                                                    expiresAt: item.metadata?.expiresAt,
                                                    content: item.metadata?.content,
                                                    action: item.metadata?.action,
                                                }}
                                                isUnread={!item.read}
                                                onActionClick={() => {
                                                    markAsRead(item.id);
                                                    onClose();
                                                }}
                                            />
                                        </div>
                                    );
                                }

                                return (
                                    <div
                                        key={item.id}
                                        className={`inbox-item-card ${!item.read ? 'is-unread' : ''}`}
                                        onClick={() => markAsRead(item.id)}
                                    >
                                        <div className={`inbox-item-icon ${getNotificationTone(item.type)}`}>
                                            <FontAwesomeIcon icon={getNotificationIcon(item.type)} />
                                        </div>

                                        <div className="inbox-item-body">
                                            <div className="inbox-item-top">
                                                <h4 className="inbox-item-title">{item.title}</h4>
                                                <span className="inbox-item-time">{formatTimeAgo(item.createdAt)}</span>
                                            </div>

                                            <p className="inbox-item-message">{item.message}</p>

                                            {/* Direct 1v1 Challenge Details */}
                                            {item.type === 'CHALLENGE' && !item.read && item.metadata?.challengeId && (
                                                <div className="inbox-challenge-box">
                                                    {item.metadata?.config && (
                                                        <div className="inbox-challenge-specs">
                                                            <span>⏱️ {item.metadata.config.timeLimitMinutes || 15}m</span>
                                                            <span>🎯 {item.metadata.config.difficulty || "MEDIUM"}</span>
                                                            <span>📝 {item.metadata.config.problemCount || 1} Q</span>
                                                        </div>
                                                    )}
                                                    <div className="inbox-challenge-buttons">
                                                        <button
                                                            type="button"
                                                            className="inbox-btn-accept"
                                                            onClick={(e) => handleAcceptChallenge(e, item.metadata.challengeId, item.id)}
                                                        >
                                                            <FontAwesomeIcon icon={faBolt} /> Accept
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="inbox-btn-decline"
                                                            onClick={(e) => handleDeclineChallenge(e, item.metadata.challengeId, item.id)}
                                                        >
                                                            Decline
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Open Public Duel Challenge */}
                                            {item.type === 'PUBLIC_CHALLENGE' && item.metadata?.roomCode && (
                                                <div className="inbox-challenge-box">
                                                    <div className="inbox-challenge-specs">
                                                        <span>⏱️ {item.metadata.timeLimitMinutes || 15}m</span>
                                                        <span>🎯 {item.metadata.difficulty || "MIX"}</span>
                                                        <span>🏆 {item.metadata.hostRating || 1200} ELO</span>
                                                    </div>
                                                    <div className="inbox-challenge-buttons">
                                                        <button
                                                            type="button"
                                                            className="inbox-btn-accept"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                markAsRead(item.id);
                                                                onClose();
                                                                navigate(`/battle/room/${item.metadata.roomCode}`);
                                                            }}
                                                        >
                                                            <FontAwesomeIcon icon={faBolt} /> Join Duel
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {!item.read && <span className="inbox-unread-dot" />}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
