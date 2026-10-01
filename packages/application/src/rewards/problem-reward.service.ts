import { prisma } from "@algofight/database";
import { REWARD_CONFIG } from "./reward-config";
import { PointLedgerService } from "./point-ledger.service";

export interface ProblemSolveEvent {
    userId: string;
    problemId: string;
    submissionId: string;
    difficulty: string; // "EASY", "MEDIUM", "HARD", "EXPERT"
    verdict: string; // "ACCEPTED", etc.
}

export class ProblemRewardService {
    constructor(private readonly pointLedgerService: PointLedgerService) {}

    /**
     * Evaluates a problem submission and awards difficulty-based points if accepted.
     */
    public async processProblemSolve(event: ProblemSolveEvent): Promise<{ awardedPoints: number; reason: string }> {
        if (event.verdict !== "ACCEPTED") {
            return { awardedPoints: 0, reason: "Non-accepted submission" };
        }

        // 1. Novelty check: Has user solved this problem before?
        const previousAccepted = await prisma.submission.findFirst({
            where: {
                userId: event.userId,
                problemId: event.problemId,
                verdict: "ACCEPTED",
                id: { not: event.submissionId },
            }
        });

        if (previousAccepted) {
            return { awardedPoints: 0, reason: "Repeated problem practice (0 points)" };
        }

        // 2. Base difficulty points
        const diffKey = (event.difficulty || "EASY").toUpperCase();
        const diffConfig = REWARD_CONFIG.DIFFICULTY_POINTS[diffKey] || REWARD_CONFIG.DIFFICULTY_POINTS.EASY;
        const basePoints = diffConfig.basePoints;

        // 3. Diminishing returns calculation based on daily solves in same difficulty tier
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const dailySolvesCount = await prisma.arenaPointTransaction.count({
            where: {
                userId: event.userId,
                type: "PROBLEM_SOLVED",
                createdAt: { gte: todayStart },
                metadata: {
                    path: ["difficulty"],
                    equals: diffKey,
                }
            }
        });

        // Apply saturation curve
        let diminishingFactor = 1.0;
        if (dailySolvesCount >= diffConfig.saturationThreshold) {
            diminishingFactor = Math.max(diffConfig.minFactor, 1.0 - (0.15 * (dailySolvesCount - diffConfig.saturationThreshold + 1)));
        }

        const finalPoints = Math.max(1, Math.round(basePoints * diminishingFactor));

        // 4. Award points via Ledger
        await this.pointLedgerService.awardPoints({
            userId: event.userId,
            amount: finalPoints,
            type: "PROBLEM_SOLVED",
            source: "PROBLEM",
            sourceId: event.submissionId,
            metadata: {
                problemId: event.problemId,
                difficulty: diffKey,
                basePoints,
                diminishingFactor,
                dailySolvesCount,
            }
        });

        return {
            awardedPoints: finalPoints,
            reason: `Accepted ${diffKey} solution (+${finalPoints} Pts)`
        };
    }
}
