import { prisma } from "@algofight/database";
import { REWARD_CONFIG } from "./reward-config";
import { PointLedgerService } from "./point-ledger.service";

export class ConsistencyRewardService {
    constructor(private readonly pointLedgerService: PointLedgerService) {}

    /**
     * Helper to get ISO week key e.g. "2026-W40"
     */
    public getWeekKey(d = new Date()): string {
        const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
    }

    /**
     * Registers an Active Day for a user upon meaningful activity (Accepted Problem or Rated Battle).
     */
    public async recordActiveDay(userId: string, activityType: "ACCEPTED_PROBLEM" | "RATED_BATTLE"): Promise<{ weekKey: string; activeDaysCount: number }> {
        const now = new Date();
        const weekKey = this.getWeekKey(now);
        const dayIndex = now.getDay(); // 0 (Sun) to 6 (Sat)

        const record = await prisma.weeklyActivity.findUnique({
            where: { userId_weekKey: { userId, weekKey } }
        });

        const activeDays = record ? record.activeDays : [];
        if (!activeDays.includes(dayIndex)) {
            const newActiveDays = [...activeDays, dayIndex].sort((a, b) => a - b);
            const updated = await prisma.weeklyActivity.upsert({
                where: { userId_weekKey: { userId, weekKey } },
                create: {
                    userId,
                    weekKey,
                    activeDays: [dayIndex],
                    claimedMilestones: [],
                },
                update: {
                    activeDays: newActiveDays,
                }
            });
            return { weekKey, activeDaysCount: updated.activeDays.length };
        }

        return { weekKey, activeDaysCount: activeDays.length };
    }

    /**
     * Returns weekly consistency dashboard state for a user.
     */
    public async getWeeklyStatus(userId: string) {
        const weekKey = this.getWeekKey();
        const record = await prisma.weeklyActivity.findUnique({
            where: { userId_weekKey: { userId, weekKey } }
        });

        const activeDays = record ? record.activeDays : [];
        const claimedMilestones = record ? record.claimedMilestones : [];

        const milestones = REWARD_CONFIG.WEEKLY_CONSISTENCY.map((m) => {
            const isEligible = activeDays.length >= m.daysRequired;
            const isClaimed = claimedMilestones.includes(m.daysRequired);
            return {
                daysRequired: m.daysRequired,
                rewardPoints: m.rewardPoints,
                isEligible,
                isClaimed,
                canClaim: isEligible && !isClaimed,
            };
        });

        return {
            weekKey,
            activeDays,
            activeDaysCount: activeDays.length,
            milestones,
        };
    }

    /**
     * Server-side authoritative claim for weekly consistency reward.
     */
    public async claimWeeklyReward(userId: string, daysRequired: number): Promise<{ success: boolean; rewardPoints: number; newBalance: number; error?: string }> {
        const weekKey = this.getWeekKey();
        const configRule = REWARD_CONFIG.WEEKLY_CONSISTENCY.find((r) => r.daysRequired === daysRequired);

        if (!configRule) {
            return { success: false, rewardPoints: 0, newBalance: 0, error: "Invalid consistency threshold" };
        }

        return await prisma.$transaction(async (tx) => {
            const record = await tx.weeklyActivity.findUnique({
                where: { userId_weekKey: { userId, weekKey } }
            });

            if (!record || record.activeDays.length < daysRequired) {
                return { success: false, rewardPoints: 0, newBalance: 0, error: "Weekly active days threshold not reached" };
            }

            if (record.claimedMilestones.includes(daysRequired)) {
                return { success: false, rewardPoints: 0, newBalance: 0, error: "Milestone already claimed for this week" };
            }

            const updatedClaimed = [...record.claimedMilestones, daysRequired].sort((a, b) => a - b);
            await tx.weeklyActivity.update({
                where: { userId_weekKey: { userId, weekKey } },
                data: { claimedMilestones: updatedClaimed }
            });

            const awardResult = await this.pointLedgerService.awardPoints({
                userId,
                amount: configRule.rewardPoints,
                type: "CONSISTENCY_REWARD",
                source: "WEEKLY",
                sourceId: `${weekKey}_${daysRequired}`,
                metadata: { weekKey, daysRequired }
            });

            return {
                success: true,
                rewardPoints: configRule.rewardPoints,
                newBalance: awardResult.newBalance,
            };
        });
    }
}
