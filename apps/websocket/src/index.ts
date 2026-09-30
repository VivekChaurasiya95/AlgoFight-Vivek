import { config } from "@algofight/config";
import { createRedisClient } from "@algofight/queue";
import { WebSocketServer, WebSocket } from "ws";
import { ConnectionManager } from "./server/connection-manager";
import { SocketHandler } from "./handlers/socket-handler";
import { logger } from "@algofight/logger";
import { syncBattleToTelemetry } from "./events/battle.events";

const WS_PORT = config.wsPort || (process.env.WS_PORT ? parseInt(process.env.WS_PORT, 10) : 4001);

const wss = new WebSocketServer({ port: WS_PORT, host: "0.0.0.0" });
const connectionManager = new ConnectionManager();
const socketHandler = new SocketHandler(connectionManager);

const redisPublisher = createRedisClient();

function publishAuditEvent(event: {
    category: string;
    severity: string;
    action: string;
    actor?: string;
    ip?: string;
    method?: string;
    details: string;
    metadata?: any;
}) {
    try {
        redisPublisher.publish("platform-audit-logs", JSON.stringify(event)).catch(() => {});
    } catch {}
}

// 💓 30-Second Ping/Pong Heartbeat to prune dead socket connections
const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws: any) => {
        if (ws.isAlive === false) {
            logger.info("Terminating inactive zombie socket");
            return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

wss.on("close", () => {
    clearInterval(heartbeatInterval);
});

wss.on("connection", (socket: any) => {
    socket.isAlive = true;
    socket.on("pong", () => {
        socket.isAlive = true;
    });

    logger.info("New WebSocket connection established");
    publishAuditEvent({
        category: "WEBSOCKET",
        severity: "INFO",
        action: "WS_STANDALONE_CONNECTED",
        actor: "WebSocket_Client",
        method: "WS",
        details: `Client connected to WebSocket server on port ${WS_PORT}`,
    });

    const currentUserId: { value: string | null } = { value: null };

    socket.on("message", (data: any) => {
        socketHandler.handleMessage(socket, data.toString(), currentUserId);
    });

    socket.on("close", () => {
        socketHandler.handleDisconnect(socket);
        if (currentUserId.value) {
            connectionManager.unregisterUser(currentUserId.value, socket);
        }
        publishAuditEvent({
            category: "WEBSOCKET",
            severity: "INFO",
            action: "WS_STANDALONE_DISCONNECTED",
            actor: currentUserId.value || "WebSocket_Client",
            method: "WS",
            details: `Client disconnected from WebSocket server${currentUserId.value ? ` (${currentUserId.value})` : ""}`,
        });
    });

    socket.on("error", (error: any) => {
        logger.error({ error }, "WebSocket error occurred");
        publishAuditEvent({
            category: "WEBSOCKET",
            severity: "ERROR",
            action: "WS_STANDALONE_ERROR",
            actor: currentUserId.value || "WebSocket_Client",
            method: "WS",
            details: error?.message || "WebSocket error occurred",
        });
    });
});

logger.info({ port: WS_PORT }, "WebSocket server is running with active heartbeat");

const redisSubscriber = createRedisClient();

redisSubscriber.on("error", (err) => {
    logger.warn({ error: err.message }, "Non-fatal Redis subscriber error in WebSocket server");
});

redisSubscriber.subscribe("battle-events", "system-announcements", (err, count) => {
    if (err) logger.error({ err }, "Failed to subscribe to redis channels");
    else logger.info({ count }, "Subscribed to battle-events and system-announcements channels");
});

redisSubscriber.on("message", (channel, message) => {
    if (channel === "battle-events") {
        try {
            const payload = JSON.parse(message);

            if (payload.event === "PLAYER_SOLVED") {
                connectionManager.broadcastToRoom(payload.roomId, "player_solved", payload);
                connectionManager.broadcastToRoom(payload.roomId, "battle_state_sync", payload.newState);
            }

            if (payload.event === "BATTLE_FINISHED") {
                const winnerPlayer = payload.finalState?.players?.find((p: any) => p.userId === payload.winnerId);
                const winnerUsername = winnerPlayer?.username || payload.winnerUsername || payload.winnerId;
                const forfeitedPlayer = payload.forfeitedPlayer || 
                    (payload.reason === "OPPONENT_FORFEIT" && payload.forfeitedUserId
                        ? payload.finalState?.players?.find((p: any) => p.userId === payload.forfeitedUserId)?.username
                        : undefined);

                connectionManager.broadcastToRoom(payload.roomId, "battle_over", {
                    roomId: payload.roomId,
                    winner: winnerUsername,
                    winnerId: payload.winnerId,
                    winnerUsername,
                    forfeitedPlayer,
                    forfeitedUserId: payload.forfeitedUserId,
                    reason: payload.reason,
                    finalState: payload.finalState,
                });

                if (payload.eloResults) {
                    connectionManager.broadcastToRoom(payload.roomId, "rating_updates", payload.eloResults);
                }

                for (const player of payload.finalState.players) {
                    if (player.userId !== "bot") {
                        connectionManager.updatePresenceStatus(player.userId, "AVAILABLE");
                    }
                }

                // 🛰️ Sync real battle event to Linux Telemetry Service
                syncBattleToTelemetry({
                    roomId: payload.roomId,
                    battleType: payload.finalState?.players?.length <= 2 ? "1v1" : "FFA_MULTIPLAYER",
                    durationSeconds: payload.finalState?.startTime ? Math.round((Date.now() - payload.finalState.startTime) / 1000) : 15,
                    winnerId: payload.winnerId,
                    participants: (payload.finalState?.players || []).map((p: any, idx: number) => ({
                        userId: p.userId,
                        username: p.username || `Player ${idx + 1}`,
                        score: p.points || 0,
                        rank: p.userId === payload.winnerId ? 1 : idx + 1,
                        verdict: p.points > 0 ? "ACCEPTED" : "WRONG_ANSWER",
                        testsPassed: p.solvedCount || (p.points > 0 ? 1 : 0),
                        testsTotal: payload.finalState?.totalQuestions || 1,
                    })),
                }).catch(() => {});
            }

            if (payload.event === "PUBLIC_CHALLENGE_CREATED" && payload.challenge) {
                connectionManager.broadcastPublicChallenge(payload.challenge);
                // Also broadcast general room creation to all lobby listeners
                connectionManager.broadcastToAll("public_challenge_created", payload.challenge);
            }

            if (payload.event === "PUBLIC_CHALLENGE_REMOVED" && payload.roomCode) {
                connectionManager.broadcastToAll("public_challenge_removed", { roomCode: payload.roomCode });
            }
        } catch (error) {
            logger.error({ error }, "Error parsing battle-events message");
        }
    }

    if (channel === "system-announcements") {
        try {
            const payload = JSON.parse(message);

            if (payload.event === "BROADCAST_CREATED" && payload.broadcast) {
                connectionManager.broadcastToAll("system_broadcast_announcement", payload.broadcast);
                connectionManager.broadcastToAll("inbox_notification", {
                    id: payload.broadcast.id,
                    type: "SYSTEM",
                    title: payload.broadcast.title,
                    message: payload.broadcast.message,
                    read: false,
                    createdAt: Date.now(),
                    metadata: {
                        isBroadcast: true,
                        broadcastType: payload.broadcast.type,
                        flashBanner: payload.broadcast.flashBanner,
                        expiresAt: payload.broadcast.expiresAt,
                        content: payload.broadcast.content,
                        action: payload.broadcast.action,
                    },
                });
            }

            if (payload.event === "BROADCAST_REVOKED") {
                connectionManager.broadcastToAll("system_broadcast_revoked", {
                    broadcastId: payload.broadcastId,
                });
            }
        } catch (error) {
            logger.error({ error }, "Error parsing system-announcements message");
        }
    }
});

// 🛑 Graceful Shutdown for WebSocket Gateway
const gracefulShutdown = async (signal: string) => {
    logger.info({ signal }, "Shutting down WebSocket Gateway...");
    clearInterval(heartbeatInterval);

    wss.clients.forEach((client) => {
        client.close(1001, "Server shutting down");
    });

    wss.close(() => {
        logger.info("WebSocket server closed");
    });

    await redisSubscriber.quit();
    logger.info("Redis subscriber connection closed");
    process.exit(0);
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

// 🛡️ Global Process Resilience - Prevent Unhandled Errors from Crashing WebSocket Server
process.on("unhandledRejection", (reason: any) => {
    logger.warn({ error: reason?.message || reason }, "Non-fatal unhandled promise rejection in WebSocket server");
});

process.on("uncaughtException", (error: Error) => {
    logger.error({ error: error.message, stack: error.stack }, "Uncaught exception in WebSocket server intercepted");
});

export { connectionManager };
