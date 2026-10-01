import { prisma } from "@algofight/database";
import { REWARD_CONFIG } from "./reward-config";
import { PointLedgerService } from "./point-ledger.service";

export class AchievementRewardService {
    constructor(private readonly pointLedgerService: PointLedgerService) {}

    /**
     * Checks and unlocks one-time milestone achievements for a user.
     */
    public async checkAndUnlockAchievements(userId: string): Promise<Array<{ achievementKey: string; title: string; points: number }>> {
        const unlockedList: Array<{ achievementKey: string; title: string; points: number }> = [];

        // Fetch user stats
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { wins: true, rating: true }
        });

        if (!user) return [];

        const existingAchievements = await (prisma as any).userAchievement.findMany({
            where: { userId },
            select: { achievementKey: true }
        });

        const claimedKeys = new Set(existingAchievements.map((a: { achievementKey: string }) => a.achievementKey));

        // Solve statistics
        const acceptedSubmissions = await prisma.submission.findMany({
            where: { userId, verdict: "ACCEPTED" },
            select: { problem: { select: { difficulty: true } } }
        });

        const totalSolves = acceptedSubmissions.length;
        const mediumSolves = acceptedSubmissions.filter((s) => String(s.problem.difficulty) === "MEDIUM").length;
        const hardSolves = acceptedSubmissions.filter((s) => String(s.problem.difficulty) === "HARD").length;

        for (const milestone of REWARD_CONFIG.MILESTONES) {
            if (claimedKeys.has(milestone.key)) continue;

            let conditionMet = false;
            if (milestone.key === "FIRST_RATED_WIN" && user.wins >= 1) conditionMet = true;
            if (milestone.key === "FIRST_MEDIUM_SOLVE" && mediumSolves >= 1) conditionMet = true;
            if (milestone.key === "FIRST_HARD_SOLVE" && hardSolves >= 1) conditionMet = true;
            if (milestone.key === "TEN_HARD_SOLVES" && hardSolves >= 10) conditionMet = true;
            if (milestone.key === "FIFTY_SOLVES" && totalSolves >= 50) conditionMet = true;

            if (conditionMet) {
                try {
                    await (prisma as any).userAchievement.create({
                        data: {
                            userId,
                            achievementKey: milestone.key,
                            title: milestone.title,
                            rewardAmount: milestone.points,
                        }
                    });

                    await this.pointLedgerService.awardPoints({
                        userId,
                        amount: milestone.points,
                        type: "MILESTONE_REWARD",
                        source: "ACHIEVEMENT",
                        sourceId: milestone.key,
                        metadata: { achievementKey: milestone.key, title: milestone.title }
                    });

                    unlockedList.push({
                        achievementKey: milestone.key,
                        title: milestone.title,
                        points: milestone.points,
                    });
                } catch {
                    // Handle concurrency race condition if already created
                }
            }
        }

        return unlockedList;
    }

    /**
     * Returns user achievements list.
     */
    public async getUserAchievements(userId: string) {
        const achievements = await (prisma as any).userAchievement.findMany({
            where: { userId },
            orderBy: { unlockedAt: "desc" }
        });

        return achievements;
    }
}
