import { BattleRoomService, RatingService } from "@algofight/application";
import {
    PrismaBattleRoomRepository,
    PrismaProblemRepository,
    PrismaUserRepository,
} from "@algofight/database";
import { createRedisClient } from "@algofight/queue";

export class BattleController {
    private readonly battleRoomService: BattleRoomService;
    private readonly ratingService: RatingService;
    private readonly userRepository: PrismaUserRepository;
    private readonly redis = createRedisClient();

    constructor() {
        const battleRoomRepository = new PrismaBattleRoomRepository();
        const problemRepository = new PrismaProblemRepository();
        const userRepository = new PrismaUserRepository();

        this.userRepository = userRepository;
        this.ratingService = new RatingService(userRepository);
        this.battleRoomService = new BattleRoomService(
            battleRoomRepository,
            problemRepository,
            this.ratingService
        );
    }

    private async resolveUserId(identifier: string, authUser?: { id: string; email?: string; username?: string }): Promise<string> {
        let user = await this.userRepository.getUserById(identifier);
        if (!user && authUser && (authUser.id === identifier || authUser.email === identifier)) {
            const safeEmail = authUser.email || `${authUser.id.toLowerCase().replace(/[^a-z0-9_]/g, "")}_${Date.now()}@algofight.local`;
            const safeUsername = authUser.username || `Player_${Math.floor(1000 + Math.random() * 9000)}`;
            user = await this.userRepository.upsertUser({
                id: authUser.id,
                email: safeEmail,
                username: safeUsername,
            });
        }
        if (!user) {
            const clean = identifier.toLowerCase().replace(/[^a-z0-9_]/g, "") || "user";
            const safeEmail = `${clean}_${Date.now()}@algofight.local`;
            user = await this.userRepository.upsertUser({
                id: identifier,
                email: safeEmail,
                username: `Player_${Math.floor(1000 + Math.random() * 9000)}`,
            });
        }
        return user.id;
    }

    private async resolveUser(authUser: { id: string; email?: string; username?: string }): Promise<string> {
        let user = await this.userRepository.getUserById(authUser.id);
        if (!user) {
            const safeEmail = authUser.email || `${authUser.id.toLowerCase().replace(/[^a-z0-9_]/g, "")}_${Date.now()}@algofight.local`;
            const safeUsername = authUser.username || `Player_${Math.floor(1000 + Math.random() * 9000)}`;
            user = await this.userRepository.upsertUser({
                id: authUser.id,
                email: safeEmail,
                username: safeUsername,
            });
        }
        return user.id;
    }

    async createRoom(
        authUser: { id: string; email?: string; username?: string },
        maxPlayers = 2,
        timeLimitMinutes = 15,
        difficulty = "MIX",
        questionCount = 3,
        isFriendly?: boolean,
        problemIds?: string[],
        isPublic = true
    ) {
        const resolvedHostId = await this.resolveUser(authUser);
        const hostUser = await this.userRepository.getUserById(resolvedHostId);
        const room = await this.battleRoomService.createRoom({
            hostId: resolvedHostId,
            maxPlayers,
            timeLimitMinutes,
            difficulty,
            questionCount,
            isFriendly,
            problemIds,
        });

        if (isPublic) {
            const publicMeta = {
                roomId: room.id,
                roomCode: room.roomCode,
                hostId: resolvedHostId,
                hostUsername: hostUser?.username || authUser.username || "Arena Host",
                hostRating: hostUser?.rating ?? 1200,
                difficulty: room.difficulty,
                questionCount: room.questionCount,
                timeLimitMinutes: room.timeLimitMinutes,
                maxPlayers: room.maxPlayers,
                currentPlayers: 1,
                isFriendly: room.isFriendly ?? false,
                createdAt: room.createdAt ? new Date(room.createdAt).toISOString() : new Date().toISOString(),
                isPublic: true,
            };

            try {
                await this.redis.hset("public_battle_rooms", room.roomCode, JSON.stringify(publicMeta));
                await this.redis.expire("public_battle_rooms", 1800);
                await this.redis.publish("battle-events", JSON.stringify({
                    event: "PUBLIC_CHALLENGE_CREATED",
                    challenge: publicMeta,
                }));
            } catch (redisErr) {
                // Non-fatal if redis fails to publish
            }
        }

        return room;
    }

    async getPublicRooms() {
        try {
            const raw = await this.redis.hgetall("public_battle_rooms");
            if (raw && Object.keys(raw).length > 0) {
                const list = Object.values(raw).map((s) => {
                    try { return JSON.parse(s); } catch { return null; }
                }).filter(Boolean);
                if (list.length > 0) {
                    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                }
            }
        } catch {
            // Fallback to database
        }

        try {
            const dbRooms = await this.battleRoomService.getOpenWaitingRooms(10);
            return dbRooms
                .filter((r) => r.participants.length < r.maxPlayers)
                .map((r) => ({
                    roomId: r.id,
                    roomCode: r.roomCode,
                    hostId: r.hostId,
                    hostUsername: r.host?.username || "Arena Host",
                    hostRating: r.host?.rating ?? 1200,
                    difficulty: r.difficulty,
                    questionCount: r.questionCount,
                    timeLimitMinutes: r.timeLimitMinutes,
                    maxPlayers: r.maxPlayers,
                    currentPlayers: r.participants.length,
                    isFriendly: r.isFriendly,
                    createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
                    isPublic: true,
                }));
        } catch {
            return [];
        }
    }

    async getRoom(idOrCode: string, currentUserId?: string) {
        const room: any = await this.battleRoomService.getRoom(idOrCode);
        if (room && currentUserId) {
            try {
                const saved = await this.redis.get(`battle_timer_persisted:${room.id}:${currentUserId}`)
                    || await this.redis.get(`battle_timer_persisted:${room.roomCode}:${currentUserId}`);
                if (saved) {
                    room.persistedTimeRemaining = parseInt(saved, 10);
                }
            } catch {}
        }
        return room;
    }

    async persistPlayerTime(idOrCode: string, userId: string, timeRemaining: number) {
        if (!idOrCode || !userId || typeof timeRemaining !== "number") {
            return { success: false, message: "Invalid parameters" };
        }
        try {
            const room = await this.battleRoomService.getRoom(idOrCode).catch(() => null);
            const roomId = room?.id || idOrCode;
            const roomCode = room?.roomCode || idOrCode;
            await this.redis.set(`battle_timer_persisted:${roomId}:${userId}`, String(timeRemaining), "EX", 7200);
            await this.redis.set(`battle_timer_persisted:${roomCode}:${userId}`, String(timeRemaining), "EX", 7200);

            const rawState = await this.redis.get(`battle_state:${roomId}`);
            if (rawState) {
                const state = JSON.parse(rawState);
                const player = state.players?.find((p: any) => p.userId === userId);
                if (player) {
                    player.persistedTimeRemaining = timeRemaining;
                    await this.redis.set(`battle_state:${roomId}`, JSON.stringify(state), "EX", 7200);
                }
            }
            return { success: true, persistedTimeRemaining: timeRemaining };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    async joinRoom(idOrCode: string, userId: string, authUser?: { id: string; email?: string; username?: string }) {
        const resolvedUserId = await this.resolveUserId(userId, authUser);
        const room = await this.battleRoomService.joinRoom(idOrCode, resolvedUserId);
        
        try {
            if (room.participants.length >= room.maxPlayers) {
                await this.redis.hdel("public_battle_rooms", room.roomCode);
                await this.redis.publish("battle-events", JSON.stringify({
                    event: "PUBLIC_CHALLENGE_REMOVED",
                    roomCode: room.roomCode,
                }));
            } else {
                const existing = await this.redis.hget("public_battle_rooms", room.roomCode);
                if (existing) {
                    const parsed = JSON.parse(existing);
                    parsed.currentPlayers = room.participants.length;
                    await this.redis.hset("public_battle_rooms", room.roomCode, JSON.stringify(parsed));
                }
            }
        } catch {}

        return room;
    }

    async leaveRoom(roomId: string, userId: string) {
        const resolvedUserId = await this.resolveUserId(userId);
        const result = await this.battleRoomService.leaveRoom(roomId, resolvedUserId);
        if (result.remainingCount === 0) {
            try {
                const room = await this.battleRoomService.getRoom(roomId).catch(() => null);
                const code = room?.roomCode || roomId;
                await this.redis.hdel("public_battle_rooms", code);
                await this.redis.publish("battle-events", JSON.stringify({
                    event: "PUBLIC_CHALLENGE_REMOVED",
                    roomCode: code,
                }));
            } catch {}
        } else if (result.wasHost && result.newHostId) {
            try {
                const room = await this.battleRoomService.getRoom(roomId).catch(() => null);
                const code = room?.roomCode || roomId;
                const newHostUser = await this.userRepository.getUserById(result.newHostId);
                const existing = await this.redis.hget("public_battle_rooms", code);
                if (existing) {
                    const parsed = JSON.parse(existing);
                    parsed.hostId = result.newHostId;
                    parsed.hostUsername = newHostUser?.username || "Arena Host";
                    parsed.hostRating = newHostUser?.rating ?? 1200;
                    parsed.currentPlayers = result.remainingCount;
                    await this.redis.hset("public_battle_rooms", code, JSON.stringify(parsed));
                }
            } catch {}
        }
        return result;
    }

    async kickPlayer(roomId: string, hostId: string, targetUserId: string) {
        const resolvedHostId = await this.resolveUserId(hostId);
        const resolvedTargetUserId = await this.resolveUserId(targetUserId);
        return this.battleRoomService.kickPlayer(roomId, resolvedHostId, resolvedTargetUserId);
    }

    async setPlayerReady(roomId: string, userId: string, isReady: boolean) {
        const resolvedUserId = await this.resolveUserId(userId);
        return this.battleRoomService.setPlayerReady(roomId, resolvedUserId, isReady);
    }

    async startBattle(roomId: string, hostId: string, problemId?: string) {
        const resolvedHostId = await this.resolveUserId(hostId);
        const room = await this.battleRoomService.startBattle(roomId, resolvedHostId, problemId);
        try {
            await this.redis.hdel("public_battle_rooms", room.roomCode);
            await this.redis.publish("battle-events", JSON.stringify({
                event: "PUBLIC_CHALLENGE_REMOVED",
                roomCode: room.roomCode,
            }));
        } catch {}
        return room;
    }

    async finishBattle(roomId: string) {
        const result = await this.battleRoomService.finishBattle(roomId);
        try {
            if (result.room?.roomCode) {
                await this.redis.hdel("public_battle_rooms", result.room.roomCode);
                await this.redis.publish("battle-events", JSON.stringify({
                    event: "PUBLIC_CHALLENGE_REMOVED",
                    roomCode: result.room.roomCode,
                }));
            }
        } catch {}
        return result;
    }
}
