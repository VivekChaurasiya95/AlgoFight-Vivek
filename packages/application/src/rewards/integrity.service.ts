import { prisma } from "@algofight/database";
import { REWARD_CONFIG } from "./reward-config";

export interface BattleIntegrityInput {
    roomId: string;
    userId: string;
    opponentIds: string[];
    isFriendly?: boolean;
    roomType?: string;
    solvedCount?: number;
    timeTakenSeconds?: number;
}

export class IntegrityService {
    /**
     * Calculates anti-farming integrity multiplier for a battle participant.
     */
    public async evaluateBattleIntegrity(input: BattleIntegrityInput): Promise<{ integrityMultiplier: number; isFlagged: boolean; reason?: string }> {
        // 1. Unrated / Friendly match check
        if (input.isFriendly || input.roomType === "UNRATED") {
            return { integrityMultiplier: 0, isFlagged: false, reason: "Unrated match generate 0 points" };
        }

        // 2. Abandoned match / Zero participation check
        if ((input.solvedCount ?? 0) === 0 && (input.timeTakenSeconds ?? 0) === 0) {
            return { integrityMultiplier: 0, isFlagged: false, reason: "Zero participation or abandoned match" };
        }

        // 3. Repeated opponent pair frequency check (Custom Room anti-farming)
        if (input.opponentIds.length > 0) {
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

            // Count previous matches between this user and opponent in last 24h
            const previousMatches = await prisma.battleParticipant.count({
                where: {
                    userId: input.userId,
                    joinedAt: { gte: twentyFourHoursAgo },
                    room: {
                        participants: {
                            some: {
                                userId: { in: input.opponentIds }
                            }
                        }
                    }
                }
            });

            const threshold = REWARD_CONFIG.INTEGRITY.REPEATED_OPPONENT_PENALTY_THRESHOLD;
            if (previousMatches > threshold) {
                const excess = previousMatches - threshold;
                const decay = REWARD_CONFIG.INTEGRITY.REPEATED_OPPONENT_DECAY;
                const multiplier = Math.max(
                    REWARD_CONFIG.INTEGRITY.MIN_INTEGRITY_MULTIPLIER,
                    1.0 - (decay * excess)
                );

                return {
                    integrityMultiplier: Math.round(multiplier * 100) / 100,
                    isFlagged: true,
                    reason: "Repeated opponent match frequency adjustment"
                };
            }
        }

        return { integrityMultiplier: 1.0, isFlagged: false };
    }
}
