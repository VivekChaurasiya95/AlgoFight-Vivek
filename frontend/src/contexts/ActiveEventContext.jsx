import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { useNotification } from "./NotificationContext";
import { getSocket } from "../services/socket";
import { requestJson } from "../services/api";

const STORAGE_KEY = "af_active_event_session";

const ActiveEventContext = createContext(null);

export function ActiveEventProvider({ children }) {
    const { user } = useAuth();
    const { notify } = useNotification();
    const location = useLocation();
    const navigate = useNavigate();

    const [activeEvent, setActiveEventState] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    });

    const [countdown, setCountdown] = useState(null); // number | null (3, 2, 1...)
    const [pendingMatchData, setPendingMatchData] = useState(null);

    const activeEventRef = useRef(activeEvent);
    activeEventRef.current = activeEvent;

    const currentUserId = user?.uid || user?.email || "Guest";
    const currentUsername = user?.displayName || user?.email?.split("@")[0] || "Player";

    // Persist to localStorage
    const setActiveEvent = useCallback((event) => {
        setActiveEventState(event);
        if (event) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(event));
            } catch (_) {}
        } else {
            try {
                localStorage.removeItem(STORAGE_KEY);
            } catch (_) {}
        }
        window.dispatchEvent(new Event("af_active_event_change"));
    }, []);

    const updateActiveEvent = useCallback((partial) => {
        setActiveEventState((prev) => {
            if (!prev) return null;
            const updated = { ...prev, ...partial };
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            } catch (_) {}
            return updated;
        });
        window.dispatchEvent(new Event("af_active_event_change"));
    }, []);

    const clearActiveEvent = useCallback(() => {
        setActiveEventState(null);
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (_) {}
        window.dispatchEvent(new Event("af_active_event_change"));
    }, []);

    // Explicitly leave the active event (API + socket + clear state)
    const leaveActiveEvent = useCallback(async () => {
        const event = activeEventRef.current;
        if (!event) return;

        const targetId = event.roomId || event.roomCode;
        const socket = getSocket();

        if (socket && targetId) {
            if (event.type === "LOBBY") {
                socket.emit("leave_room_channel", {
                    roomCode: event.roomCode,
                    userId: currentUserId,
                    username: currentUsername,
                });
            } else if (event.type === "BATTLE") {
                socket.emit("leave_battle", {
                    roomId: targetId,
                    userId: currentUserId,
                    username: currentUsername,
                });
            } else if (event.type === "MATCHMAKING") {
                socket.emit("cancel_queue", { userId: currentUserId });
            }
        }

        if (targetId && event.type === "LOBBY") {
            try {
                await requestJson(`/api/battle/rooms/${encodeURIComponent(targetId)}/leave`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId: currentUserId }),
                    includeAuth: true,
                });
            } catch (_) {}
        }

        clearActiveEvent();
        notify({
            type: "info",
            title: "Left Event",
            message: `You left ${event.roomCode ? `room ${event.roomCode}` : "the active event"}.`,
        });
    }, [clearActiveEvent, currentUserId, currentUsername, notify]);

    // Return to the active event page
    const returnToEvent = useCallback(() => {
        const event = activeEventRef.current;
        if (!event) return;

        if (event.type === "LOBBY" && event.roomCode) {
            navigate(`/battle/room/${encodeURIComponent(event.roomCode)}`);
        } else if (event.type === "BATTLE") {
            navigate("/battle/live", {
                state: {
                    matchData: {
                        roomId: event.roomId,
                        roomCode: event.roomCode,
                        timeLimitSeconds: event.persistedTimeRemaining || event.timeLimitSeconds,
                    },
                    roomCode: event.roomCode,
                },
            });
        } else if (event.type === "MATCHMAKING") {
            navigate("/battle");
        }
    }, [navigate]);

    // 1. Maintain background room channel subscription & handle start events while roaming
    useEffect(() => {
        const socket = getSocket();
        if (!socket || !activeEvent?.roomCode) return;

        const roomCode = activeEvent.roomCode;

        // Keep socket connected to the active room channel
        const joinChannel = () => {
            socket.emit("join_room_channel", {
                roomCode,
                userId: currentUserId,
                username: currentUsername,
            });
        };

        joinChannel();
        const unregConnect = socket.on("connect", joinChannel);

        // Handler when host starts battle
        const handleBattleStarted = (data) => {
            const isAlreadyOnLive = location.pathname.startsWith("/battle/live");
            if (isAlreadyOnLive) return;

            setPendingMatchData(data);
            setCountdown(3);

            notify({
                type: "success",
                title: "⚔️ Battle Commencing!",
                message: `Host started the battle in ${roomCode}! Transferring in 3 seconds...`,
                duration: 4000,
            });

            let count = 3;
            const timer = setInterval(() => {
                count -= 1;
                setCountdown(count);
                if (count <= 0) {
                    clearInterval(timer);
                    setCountdown(null);
                    updateActiveEvent({ type: "BATTLE", status: "RUNNING" });
                    navigate("/battle/live", {
                        state: {
                            matchData: data,
                            roomCode,
                        },
                    });
                }
            }, 1000);
        };

        const handleRoomUpdated = (data) => {
            const currentCount = Array.isArray(data?.participants) ? data.participants.length : undefined;
            if (currentCount !== undefined) {
                updateActiveEvent({ participantCount: currentCount });
            }
        };

        const handlePlayerKicked = (data) => {
            if (data?.targetUserId === currentUserId) {
                clearActiveEvent();
                notify({
                    type: "warning",
                    title: "Removed from Room",
                    message: "You were removed from the room by the host.",
                });
                if (location.pathname.startsWith("/battle/room")) {
                    navigate("/battle");
                }
            }
        };

        socket.on("battle_started", handleBattleStarted);
        socket.on("match_found", handleBattleStarted);
        socket.on("room_updated", handleRoomUpdated);
        socket.on("player_kicked", handlePlayerKicked);

        return () => {
            if (unregConnect) unregConnect();
            socket.off("connect", joinChannel);
            socket.off("battle_started", handleBattleStarted);
            socket.off("match_found", handleBattleStarted);
            socket.off("room_updated", handleRoomUpdated);
            socket.off("player_kicked", handlePlayerKicked);
        };
    }, [activeEvent?.roomCode, currentUserId, currentUsername, location.pathname, navigate, notify, updateActiveEvent, clearActiveEvent]);

    // 2. Periodic background verification (every 10s) while roaming to check if room is still active
    useEffect(() => {
        if (!activeEvent?.roomCode) return;

        // Skip polling if already on the room lobby page (RoomLobby has its own sync)
        const isCurrentRoute =
            location.pathname === `/battle/room/${encodeURIComponent(activeEvent.roomCode)}` ||
            location.pathname === `/battle/room/${activeEvent.roomCode}`;
        if (isCurrentRoute) return;

        let active = true;

        const checkRoomHealth = async () => {
            try {
                const data = await requestJson(`/api/battle/rooms/${encodeURIComponent(activeEvent.roomCode)}`);
                if (!active) return;
                const roomData = data?.room || data;

                if (!roomData || roomData.status === "CANCELLED") {
                    clearActiveEvent();
                    notify({
                        type: "info",
                        title: "Lobby Closed",
                        message: `Room ${activeEvent.roomCode} was cancelled or closed.`,
                    });
                    return;
                }

                // If room transitioned to running while roaming, auto-route to live battle
                if (roomData.status === "RUNNING" && activeEvent.type !== "BATTLE") {
                    updateActiveEvent({ type: "BATTLE", status: "RUNNING" });
                    navigate("/battle/live", {
                        state: {
                            matchData: {
                                roomId: roomData.id,
                                roomCode: roomData.roomCode || activeEvent.roomCode,
                                timeLimitSeconds: roomData.timeLimitMinutes ? roomData.timeLimitMinutes * 60 : undefined,
                            },
                            roomCode: activeEvent.roomCode,
                        },
                    });
                    return;
                }

                if (Array.isArray(roomData.participants)) {
                    updateActiveEvent({ participantCount: roomData.participants.length });
                }
            } catch {
                // Ignore transient errors
            }
        };

        const interval = setInterval(checkRoomHealth, 10000);
        return () => {
            active = false;
            clearInterval(interval);
        };
    }, [activeEvent?.roomCode, activeEvent?.type, clearActiveEvent, location.pathname, navigate, notify, updateActiveEvent]);

    return (
        <ActiveEventContext.Provider
            value={{
                activeEvent,
                setActiveEvent,
                updateActiveEvent,
                clearActiveEvent,
                leaveActiveEvent,
                returnToEvent,
                countdown,
                pendingMatchData,
            }}
        >
            {children}
        </ActiveEventContext.Provider>
    );
}

export function useActiveEvent() {
    const context = useContext(ActiveEventContext);
    if (!context) {
        throw new Error("useActiveEvent must be used within an ActiveEventProvider");
    }
    return context;
}
