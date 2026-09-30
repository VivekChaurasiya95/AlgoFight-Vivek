import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useNotification } from './NotificationContext';
import {
    fetchUserNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearUserNotifications,
} from '../services/api';
import { getSocket } from '../services/socket';
import { getSessionToken } from '../services/authStorage';

const NotificationInboxContext = createContext();

export function NotificationInboxProvider({ children }) {
    const { user } = useAuth();
    const { notify } = useNotification();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    const userId = user?.uid || user?.email;

    const getFeedbackInboxItem = useCallback(() => {
        const isSubmitted = localStorage.getItem('af_feedback_submitted') === 'true';
        const isRead = isSubmitted || localStorage.getItem('af_feedback_notif_read') === 'true';
        return {
            id: 'notif_welcome_feedback',
            type: 'FEEDBACK',
            title: 'Platform Feedback & Review',
            message: 'Welcome to AlgoFight! Rate your arena experience, share your suggestions, and optionally showcase your review on our homepage.',
            read: isRead,
            createdAt: Number(localStorage.getItem('af_feedback_created_at')) || Date.now() - 60000,
            metadata: {
                isFeedback: true,
                isSubmitted,
            },
        };
    }, []);

    const addFeedbackNotificationToInbox = useCallback(() => {
        const item = getFeedbackInboxItem();
        setNotifications((prev) => {
            if (prev.some((n) => n.id === 'notif_welcome_feedback')) {
                return prev;
            }
            const updated = [item, ...prev];
            setUnreadCount(updated.filter((n) => !n.read).length);
            return updated;
        });
    }, [getFeedbackInboxItem]);

    const fetchInbox = useCallback(async () => {
        if (!userId) {
            const feedbackItem = getFeedbackInboxItem();
            setNotifications([feedbackItem]);
            setUnreadCount(feedbackItem.read ? 0 : 1);
            return;
        }

        setIsLoading(true);
        try {
            const data = await fetchUserNotifications(userId);
            const rawList = data?.notifications || [];
            const now = Date.now();

            // Filter out any expired broadcast items
            const activeList = rawList.filter((n) => {
                if (n.metadata?.expiresAt) {
                    return new Date(n.metadata.expiresAt).getTime() > now;
                }
                return true;
            });

            // Ensure feedback notification resides in inbox
            const hasFeedbackItem = activeList.some((n) => n.id === 'notif_welcome_feedback' || n.type === 'FEEDBACK');
            const mergedList = hasFeedbackItem ? activeList : [getFeedbackInboxItem(), ...activeList];

            // Calculate active unread count
            const validUnread = mergedList.filter((n) => !n.read).length;

            setNotifications(mergedList);
            setUnreadCount(validUnread);
        } catch (err) {
            console.error("Failed to load notification inbox:", err);
            setNotifications([getFeedbackInboxItem()]);
        } finally {
            setIsLoading(false);
        }
    }, [userId, getFeedbackInboxItem]);

    // Initial load on user login
    useEffect(() => {
        fetchInbox();
    }, [fetchInbox]);

    // Periodic 10s auto-expiry pruning timer for client-side instant cleanup
    useEffect(() => {
        const timer = setInterval(() => {
            const now = Date.now();
            setNotifications((prev) => {
                const filtered = prev.filter((n) => {
                    if (n.metadata?.expiresAt) {
                        return new Date(n.metadata.expiresAt).getTime() > now;
                    }
                    return true;
                });
                if (filtered.length !== prev.length) {
                    setUnreadCount(filtered.filter((n) => !n.read).length);
                    return filtered;
                }
                return prev;
            });
        }, 10000);

        return () => clearInterval(timer);
    }, []);

    // Live WebSocket inbox event sync
    useEffect(() => {
        if (!user) return;

        let active = true;

        const setupSocket = async () => {
            const token = typeof user?.getIdToken === 'function'
                ? await user.getIdToken().catch(() => null)
                : getSessionToken();
            if (!active) return;

            const socket = getSocket();

            const handleInboxNotification = (newNotif) => {
                if (!newNotif) return;
                const now = Date.now();
                if (newNotif.metadata?.expiresAt && new Date(newNotif.metadata.expiresAt).getTime() <= now) {
                    return; // Ignore expired
                }

                setNotifications((prev) => {
                    const exists = prev.some((n) => n.id === newNotif.id);
                    if (exists) return prev;

                    // Flash on screen using the app's custom notification system
                    notify({
                        title: newNotif.title || "NEW NOTIFICATION",
                        message: newNotif.message || "You have a new update in your inbox.",
                        type: newNotif.type === "WARNING" ? "warning" : newNotif.type === "BATTLE_START" || newNotif.type === "CHALLENGE_ACCEPTED" ? "success" : "info",
                        duration: 5000,
                    });

                    setUnreadCount((c) => c + 1);
                    return [newNotif, ...prev];
                });
            };

            const handleBroadcastAnnouncement = (broadcast) => {
                if (!broadcast) return;
                const now = Date.now();
                if (broadcast.expiresAt && new Date(broadcast.expiresAt).getTime() <= now) {
                    return;
                }

                const notifItem = {
                    id: broadcast.id,
                    userId: currentUserId,
                    type: "SYSTEM",
                    title: broadcast.title,
                    message: broadcast.message,
                    read: false,
                    createdAt: Date.now(),
                    metadata: {
                        isBroadcast: true,
                        broadcastId: broadcast.id,
                        broadcastType: broadcast.type,
                        flashBanner: broadcast.flashBanner,
                        expiresAt: broadcast.expiresAt,
                        content: broadcast.content,
                        action: broadcast.action,
                    },
                };

                setNotifications((prev) => {
                    const exists = prev.some(
                        (n) => n.id === broadcast.id || n.metadata?.broadcastId === broadcast.id
                    );
                    if (exists) return prev;

                    // Flash announcement using the custom notification system
                    notify({
                        title: `📢 ${broadcast.title || "SYSTEM ANNOUNCEMENT"}`,
                        message: broadcast.message,
                        type: broadcast.type === "WARNING" ? "warning" : "info",
                        duration: 6000,
                    });

                    setUnreadCount((c) => c + 1);
                    return [notifItem, ...prev];
                });
            };

            const handleBroadcastRevoked = ({ broadcastId }) => {
                if (!broadcastId) return;

                setNotifications((prev) => {
                    const hadItem = prev.some(
                        (n) => n.id === broadcastId || n.metadata?.broadcastId === broadcastId || n.metadata?.id === broadcastId
                    );
                    if (!hadItem) return prev;

                    const filtered = prev.filter(
                        (n) => n.id !== broadcastId && n.metadata?.broadcastId !== broadcastId && n.metadata?.id !== broadcastId
                    );
                    setUnreadCount(filtered.filter((n) => !n.read).length);

                    // Flash notice that broadcast has been revoked (never native alert)
                    notify({
                        title: "NOTICE WITHDRAWN",
                        message: "A system broadcast has been revoked by administrators.",
                        type: "info",
                        duration: 3500,
                    });

                    return filtered;
                });

                try {
                    sessionStorage.removeItem(`af_dismissed_broadcast_${broadcastId}`);
                } catch {}
            };

            const handlePublicChallengeCreated = (challenge) => {
                if (!challenge || !challenge.roomCode) return;
                const currentId = user?.uid || user?.email;
                if (currentId && (currentId === challenge.hostId || currentId === challenge.hostUsername)) {
                    return;
                }

                // Flash toast notification on active user screen
                notify({
                    title: "⚔️ PUBLIC DUEL CHALLENGE",
                    message: `${challenge.hostUsername || "A player"} (${challenge.hostRating || 1200} ELO) opened a public ${challenge.difficulty || "MIX"} duel! Tap to compete.`,
                    type: "info",
                    duration: 8000,
                    onClick: () => {
                        window.location.href = `/battle/room/${challenge.roomCode}`;
                    },
                });

                // Add to notification inbox dropdown
                const publicItem = {
                    id: `pub_chal_${challenge.roomCode}`,
                    type: "PUBLIC_CHALLENGE",
                    title: `⚔️ Public Duel: ${challenge.hostUsername || "Player"}`,
                    message: `${challenge.hostUsername || "Player"} opened an open challenge (${challenge.questionCount || 3} Qs • ${challenge.timeLimitMinutes || 15}m • ${challenge.difficulty || "MIX"}).`,
                    read: false,
                    createdAt: Date.now(),
                    metadata: {
                        ...challenge,
                        isPublicChallenge: true,
                    },
                };

                setNotifications((prev) => {
                    const exists = prev.some((n) => n.id === publicItem.id || n.metadata?.roomCode === challenge.roomCode);
                    if (exists) return prev;
                    setUnreadCount((c) => c + 1);
                    return [publicItem, ...prev];
                });
            };

            const handlePublicChallengeRemoved = ({ roomCode } = {}) => {
                if (!roomCode) return;
                setNotifications((prev) =>
                    prev.filter((n) => n.metadata?.roomCode !== roomCode && n.id !== `pub_chal_${roomCode}`)
                );
            };

            socket.on("inbox_notification", handleInboxNotification);
            socket.on("system_broadcast_announcement", handleBroadcastAnnouncement);
            socket.on("system_broadcast_revoked", handleBroadcastRevoked);
            socket.on("public_challenge_created", handlePublicChallengeCreated);
            socket.on("public_challenge_removed", handlePublicChallengeRemoved);

            return () => {
                socket.off("inbox_notification", handleInboxNotification);
                socket.off("system_broadcast_announcement", handleBroadcastAnnouncement);
                socket.off("system_broadcast_revoked", handleBroadcastRevoked);
                socket.off("public_challenge_created", handlePublicChallengeCreated);
                socket.off("public_challenge_removed", handlePublicChallengeRemoved);
            };
        };

        const cleanupPromise = setupSocket();

        return () => {
            active = false;
            cleanupPromise.then((cleanup) => {
                if (typeof cleanup === "function") cleanup();
            });
        };
    }, [user]);

    const markAsRead = async (notificationId) => {
        if (!notificationId) return;

        if (notificationId === 'notif_welcome_feedback') {
            localStorage.setItem('af_feedback_notif_read', 'true');
            setNotifications((prev) =>
                prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));
            return;
        }

        if (!userId) return;

        // Optimistic UI update
        setNotifications((prev) =>
            prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));

        try {
            await markNotificationAsRead(userId, notificationId);
        } catch (err) {
            console.error("Failed to mark notification read:", err);
            fetchInbox(); // Re-sync on failure
        }
    };

    const markAllAsRead = async () => {
        localStorage.setItem('af_feedback_notif_read', 'true');
        // Optimistic UI update
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);

        if (!userId) return;

        try {
            await markAllNotificationsAsRead(userId);
        } catch (err) {
            console.error("Failed to mark all notifications read:", err);
            fetchInbox();
        }
    };

    const clearInbox = async () => {
        if (!userId) {
            setNotifications([]);
            setUnreadCount(0);
            return;
        }

        setNotifications([]);
        setUnreadCount(0);

        try {
            await clearUserNotifications(userId);
        } catch (err) {
            console.error("Failed to clear inbox:", err);
            fetchInbox();
        }
    };

    return (
        <NotificationInboxContext.Provider
            value={{
                notifications,
                unreadCount,
                isLoading,
                fetchInbox,
                markAsRead,
                markAllAsRead,
                clearInbox,
                addFeedbackNotificationToInbox,
            }}
        >
            {children}
        </NotificationInboxContext.Provider>
    );
}

export function useNotificationInbox() {
    const context = useContext(NotificationInboxContext);
    if (!context) {
        throw new Error("useNotificationInbox must be used within a NotificationInboxProvider");
    }
    return context;
}
