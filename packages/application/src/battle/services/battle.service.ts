import { createRedisClient } from "../../utils/redis.client";
import { logger } from "@algofight/logger";
import { BattleRoomRepository, prisma } from "@algofight/database";
import { BattleRoomService } from "./battle-room.service";
import { isModifiedFromStarter, isIdenticalToExistingSubmission } from "./diff-matcher";

export class BattleService {
    private readonly redis = createRedisClient();

    constructor(
        private readonly battleRoomRepo?:
            BattleRoomRepository,
        private readonly battleRoomService?: BattleRoomService
    ) { }

    async createBattle(roomId: string): Promise<void> {
        if (this.battleRoomService) {
            // Already created via battleRoomService
            return;
        }
    }

    async startBattle(roomId: string, hostId?: string): Promise<void> {
        if (this.battleRoomService && hostId) {
            await this.battleRoomService.startBattle(roomId, hostId);
        }
    }

    async finishBattle(roomId: string, reason: string, winnerId?: string,
        forfeitedUserId?: string
    ): Promise<void> {
        try {
            const stateKey = `battle_state:${roomId}`;
            const rawState = await this.redis.get(stateKey);
            if (!rawState) {
                logger.warn({ roomId }, "No battle state found in Redis during finalization");
                return;
            }
            const state = JSON.parse(rawState);

            // 🛡️ AF-CHK: Idempotency Guard - Prevent duplicate finalization executions
            if (state.status === "FINISHING" || state.status === "FINISHED") {
                logger.info({ roomId, status: state.status }, "Battle finalization already in progress or completed");
                return;
            }

            state.status = "FINISHING";
            await this.redis.set(stateKey, JSON.stringify(state), "EX", 600);

            // Fetch room problems for starter template comparisons
            const roomProblems = await prisma.problem.findMany({
                where: {
                    battleRooms: {
                        some: { id: roomId }
                    }
                }
            }).catch(() => []);
            const problemMap = new Map<string, any>(roomProblems.map(p => [p.id, p]));

            // 1. Process participant checkpoints with Diff Matching into PostgreSQL
            for (const player of (state.players || [])) {
                if (player.userId !== "bot") {
                    try {
                        // Retrieve combined checkpoints map
                        const combinedKey = `battle_checkpoints:${roomId}:${player.userId}`;
                        const rawCombined = await this.redis.get(combinedKey);
                        const checkpointsMap: Record<string, any> = rawCombined ? JSON.parse(rawCombined) : {};

                        // Also check backward-compatible single keys
                        const singleKeys = await this.redis.keys(`battle_checkpoint:${roomId}:${player.userId}:*`);
                        for (const sKey of singleKeys) {
                            const rawSingle = await this.redis.get(sKey);
                            if (rawSingle) {
                                try {
                                    const parsed = JSON.parse(rawSingle);
                                    if (parsed.problemId && !checkpointsMap[parsed.problemId]) {
                                        checkpointsMap[parsed.problemId] = parsed;
                                    }
                                } catch (_) {}
                            }
                        }

                        // Query existing evaluated submissions for this room & user to avoid duplicate entries
                        const existingSubmissions = await prisma.submission.findMany({
                            where: {
                                roomId,
                                userId: player.userId
                            },
                            select: {
                                problemId: true,
                                code: true,
                                language: true
                            }
                        }).catch(() => []);

                        for (const [probId, cp] of Object.entries(checkpointsMap)) {
                            if (!cp || !cp.code || typeof cp.code !== "string" || !cp.code.trim()) {
                                continue;
                            }

                            const problemDef = problemMap.get(probId) || await prisma.problem.findUnique({
                                where: { id: probId }
                            }).catch(() => null);

                            const lang = cp.language || "javascript";

                            // Diff Check 1: Skip untouched starter templates
                            if (!isModifiedFromStarter(problemDef, lang, cp.code)) {
                                logger.debug({ roomId, userId: player.userId, probId }, "Diff matcher: skipped unmodified starter code");
                                continue;
                            }

                            // Diff Check 2: Skip duplicate identical submissions already evaluated in DB
                            if (isIdenticalToExistingSubmission(existingSubmissions, probId, cp.code)) {
                                logger.debug({ roomId, userId: player.userId, probId }, "Diff matcher: skipped identical existing submission");
                                continue;
                            }

                            // Persist genuine user progress as finalized checkpoint submission
                            const isSolved = player.solvedProblems?.some((sp: any) => sp.problemId === probId);
                            await prisma.submission.create({
                                data: {
                                    userId: player.userId,
                                    roomId,
                                    problemId: probId,
                                    language: lang,
                                    code: cp.code,
                                    status: "FINALIZED",
                                    verdict: isSolved ? "ACCEPTED" : null,
                                    executionTime: 0,
                                }
                            }).catch((subErr) => {
                                logger.error({ subErr, roomId, userId: player.userId, probId }, "Failed to persist checkpoint submission");
                            });
                        }
                    } catch (chkErr) {
                        logger.error({ chkErr, roomId, userId: player.userId }, "Error processing participant checkpoints during finalization");
                    }

                    if (this.battleRoomRepo) {
                        await this.battleRoomRepo.recordParticipantScore(
                            roomId,
                            player.userId,
                            player.points,
                            player.solvedCount > 0
                        ).catch(() => { });
                    }
                }
            }

            let eloResults;
            if (this.battleRoomService) {
                const result = await this.battleRoomService.finishBattle(
                    roomId, forfeitedUserId
                );
                eloResults = result.eloResults;
            }

            state.status = "FINISHED";

            // Evict Redis checkpoint keys ONLY after successful PostgreSQL operations
            for (const player of (state.players || [])) {
                if (player.userId !== "bot") {
                    await this.redis.del(`battle_checkpoints:${roomId}:${player.userId}`).catch(() => {});
                    const sKeys = await this.redis.keys(`battle_checkpoint:${roomId}:${player.userId}:*`);
                    if (sKeys.length > 0) {
                        await this.redis.del(...sKeys).catch(() => {});
                    }
                }
            }
            await this.redis.del(stateKey);

            const eventPayload = {
                event: "BATTLE_FINISHED",
                roomId,
                winnerId: winnerId || null,
                forfeitedUserId: forfeitedUserId || null,
                reason,
                finalState: state,
                eloResults
            };

            await this.redis.publish("battle-events",
                JSON.stringify(eventPayload)
            );
            logger.info({ roomId, reason }, "Battle finished successfully and checkpoints migrated to database.")
        } catch (error) {
            logger.error({
                error, roomId
            }, "Failed to finish battle")

        }
    }


    async processEvaluationResult(
        roomId: string,
        userId: string,
        problemId: string,
        isAccepted: boolean,
        points: number = 100
    ): Promise<void> {
        try {
            if (!isAccepted) return; // Only process correct answers for battle points

            const stateKey = `battle_state:${roomId}`;
            const rawState = await this.redis.get(stateKey);

            if (!rawState) {
                logger.warn({ roomId }, "Battle state not found in Redis, cannot update score");
                return;
            }

            const state = JSON.parse(rawState);
            const player = state.players.find((p: any) => p.userId === userId);

            if (!player) {
                logger.warn({ roomId, userId }, "Player not found in battle state");
                return;
            }

            // Check if already solved
            const alreadySolved = player.solvedProblems.some((sp: any) => sp.problemId === problemId);
            if (alreadySolved) {
                return; // Prevent duplicate points
            }

            const elapsedSeconds = Math.floor((Date.now() - state.startTime) / 1000);

            player.points += points;
            player.solvedCount += 1;
            player.solvedProblems.push({
                problemId,
                timeSeconds: elapsedSeconds,
                timeString: this.formatTime(elapsedSeconds)
            });

            // Save updated state back to Redis
            await this.redis.set(stateKey, JSON.stringify(state), "EX", state.timeLimitSeconds + 300);

            // Publish an event via Pub/Sub so WebSocket servers can pick it up
            const eventPayload = {
                event: "PLAYER_SOLVED",
                roomId,
                userId,
                username: player.username,
                pointsAdded: points,
                totalPoints: player.points,
                solvedCount: player.solvedCount,
                problemId,
                newState: state // Passing full state to sync
            };

            await this.redis.publish("battle-events", JSON.stringify(eventPayload));

            logger.info({ roomId, userId, problemId }, "Player solved problem in battle, event published");
            if (player.solvedCount >= state.totalQuestions) {
                await this.finishBattle(roomId, "ALL_SOLVED", userId)
                return;
            }

        } catch (error) {
            logger.error({ error, roomId, userId }, "Failed to process evaluation result for battle");
        }
    }

    private formatTime(seconds: number) {
        const m = Math.floor(seconds / 60).toString().padStart(2, "0");
        const s = (seconds % 60).toString().padStart(2, "0");
        return `${m}:${s}`;
    }
}