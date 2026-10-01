import { FastifyInstance } from "fastify";
import { requireAuth } from "../plugins/auth.plugin";
import {
    PointLedgerService,
    ConsistencyRewardService,
    AchievementRewardService
} from "@algofight/application";

const ledger = new PointLedgerService();
const consistency = new ConsistencyRewardService(ledger);
const achievements = new AchievementRewardService(ledger);

export async function rewardRoutes(app: FastifyInstance) {
    // 1. Get weekly consistency status and milestones
    app.get("/rewards/weekly-status", { preHandler: [requireAuth] }, async (req) => {
        const userId = req.user!.id;
        return consistency.getWeeklyStatus(userId);
    });

    // 2. Claim weekly consistency milestone reward (Server-authoritative)
    app.post("/rewards/claim-weekly", { preHandler: [requireAuth] }, async (req, reply) => {
        const userId = req.user!.id;
        const body = (req.body as any) || {};
        const daysRequired = Number(body.daysRequired);

        if (!daysRequired || isNaN(daysRequired)) {
            return reply.status(400).send({ error: "BAD_REQUEST", message: "daysRequired is required." });
        }

        const result = await consistency.claimWeeklyReward(userId, daysRequired);
        if (!result.success) {
            return reply.status(400).send({ error: "CLAIM_FAILED", message: result.error });
        }

        return result;
    });

    // 3. Get user point transaction history
    app.get("/rewards/history", { preHandler: [requireAuth] }, async (req) => {
        const userId = req.user!.id;
        const query = (req.query as any) || {};
        const limit = Number(query.limit) || 20;
        const offset = Number(query.offset) || 0;

        return ledger.getHistory(userId, limit, offset);
    });

    // 4. Redeem Vault Reward
    app.post("/rewards/redeem", { preHandler: [requireAuth] }, async (req, reply) => {
        const userId = req.user!.id;
        const body = (req.body as any) || {};
        const cost = Number(body.cost);
        const rewardTitle = body.rewardTitle || "Reward Item";

        if (!cost || cost <= 0 || isNaN(cost)) {
            return reply.status(400).send({ error: "BAD_REQUEST", message: "Invalid reward cost." });
        }

        const result = await ledger.deductPoints({
            userId,
            amount: cost,
            type: "REWARD_REDEMPTION",
            source: "VAULT",
            sourceId: `${Date.now()}_${rewardTitle}`,
            metadata: { rewardTitle, cost }
        });

        if (!result.success) {
            return reply.status(400).send({ error: "INSUFFICIENT_FUNDS", message: result.error || "Insufficient Arena Points balance." });
        }

        return {
            success: true,
            newBalance: result.newBalance,
            message: `Successfully redeemed ${rewardTitle}! Request placed in fulfillment queue.`,
        };
    });

    // 5. Get user unlocked achievements
    app.get("/rewards/achievements", { preHandler: [requireAuth] }, async (req) => {
        const userId = req.user!.id;
        return achievements.getUserAchievements(userId);
    });
}
