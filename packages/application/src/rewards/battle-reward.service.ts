import { REWARD_CONFIG } from "./reward-config";
import { PointLedgerService } from "./point-ledger.service";
import { IntegrityService } from "./integrity.service";

export interface BattleRewardInput {
    roomId: string;
    userId: string;
    userRating: number;
    opponentRatings: number[];
    opponentIds: string[];
    placement: number; // 1-indexed (1 = winner)
    totalParticipants: number;
    performanceScore: number; // X_t in [0, 1]
    isFriendly?: boolean;
    roomType?: string;
    solvedCount?: number;
    timeTakenSeconds?: number;
}

export class BattleRewardService {
    constructor(
        private readonly pointLedgerService: PointLedgerService,
        private readonly integrityService: IntegrityService
    ) {}

    /**
     * Calculates and awards Arena Points for a completed rated battle.
     */
    public async processBattleReward(input: BattleRewardInput): Promise<{ awardedPoints: number; reason: string }> {
        // 1. Evaluate Integrity & Unrated Room Status
        const integrity = await this.integrityService.evaluateBattleIntegrity({
            roomId: input.roomId,
            userId: input.userId,
            opponentIds: input.opponentIds,
            isFriendly: input.isFriendly,
            roomType: input.roomType,
            solvedCount: input.solvedCount,
            timeTakenSeconds: input.timeTakenSeconds,
        });

        if (integrity.integrityMultiplier <= 0) {
            return { awardedPoints: 0, reason: integrity.reason || "Unrated or zero-participation match (0 points)" };
        }

        const isWin = input.placement <= Math.ceil(input.totalParticipants / 2);
        const baseValue = isWin ? REWARD_CONFIG.BATTLE.BASE_WIN_REWARD : REWARD_CONFIG.BATTLE.BASE_LOSS_REWARD;

        // 2. Opponent strength bonus
        let strengthBonus = 0;
        if (input.opponentRatings.length > 0) {
            const avgOppRating = input.opponentRatings.reduce((a, b) => a + b, 0) / input.opponentRatings.length;
            const ratingDelta = avgOppRating - input.userRating;
            if (ratingDelta > 0 && isWin) {
                strengthBonus = Math.min(
                    REWARD_CONFIG.BATTLE.MAX_OPPONENT_STRENGTH_BONUS,
                    Math.round((ratingDelta / 400) * 20)
                );
            }
        }

        // 3. Performance multiplier
        const perfMultiplier = 0.6 + (0.4 * Math.max(0, Math.min(1, input.performanceScore)));

        // 4. Final calculated points
        const rawPoints = (baseValue + strengthBonus) * perfMultiplier * integrity.integrityMultiplier;
        const finalPoints = Math.max(0, Math.round(rawPoints));

        if (finalPoints > 0) {
            await this.pointLedgerService.awardPoints({
                userId: input.userId,
                amount: finalPoints,
                type: "RATED_BATTLE",
                source: "BATTLE",
                sourceId: `${input.roomId}_${input.userId}`,
                metadata: {
                    roomId: input.roomId,
                    placement: input.placement,
                    isWin,
                    strengthBonus,
                    performanceScore: input.performanceScore,
                    integrityMultiplier: integrity.integrityMultiplier,
                }
            });
        }

        return {
            awardedPoints: finalPoints,
            reason: `Rated Battle ${isWin ? "Victory" : "Performance"} (+${finalPoints} Pts)`
        };
    }
}
