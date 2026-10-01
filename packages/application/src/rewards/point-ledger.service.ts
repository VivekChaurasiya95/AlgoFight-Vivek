import { prisma } from "@algofight/database";

export interface TransactionInput {
    userId: string;
    amount: number;
    type: "PROBLEM_SOLVED" | "RATED_BATTLE" | "CONSISTENCY_REWARD" | "MILESTONE_REWARD" | "REWARD_REDEMPTION" | "ADMIN_ADJUSTMENT";
    source?: string;
    sourceId?: string;
    metadata?: Record<string, any>;
}

export class PointLedgerService {
    /**
     * Atomically awards points to a user and logs an auditable transaction.
     * Guaranteed idempotent if source and sourceId are provided.
     */
    public async awardPoints(input: TransactionInput): Promise<{ success: boolean; transactionId?: string; newBalance: number }> {
        if (input.amount <= 0) {
            const user = await prisma.user.findUnique({ where: { id: input.userId }, select: { arenaPoints: true } });
            return { success: false, newBalance: user?.arenaPoints ?? 0 };
        }

        return await prisma.$transaction(async (tx) => {
            // Idempotency check: verify if transaction with same source & sourceId already exists
            if (input.source && input.sourceId) {
                const existing = await tx.arenaPointTransaction.findFirst({
                    where: {
                        userId: input.userId,
                        source: input.source,
                        sourceId: input.sourceId,
                    }
                });
                if (existing) {
                    const currentUser = await tx.user.findUnique({ where: { id: input.userId }, select: { arenaPoints: true } });
                    return { success: false, transactionId: existing.id, newBalance: currentUser?.arenaPoints ?? 0 };
                }
            }

            const updatedUser = await tx.user.update({
                where: { id: input.userId },
                data: { arenaPoints: { increment: input.amount } },
                select: { arenaPoints: true }
            });

            const transaction = await tx.arenaPointTransaction.create({
                data: {
                    userId: input.userId,
                    amount: input.amount,
                    type: input.type,
                    source: input.source,
                    sourceId: input.sourceId,
                    metadata: input.metadata ?? {},
                }
            });

            return {
                success: true,
                transactionId: transaction.id,
                newBalance: updatedUser.arenaPoints
            };
        });
    }

    /**
     * Atomically deducts points for vault redemptions with strict balance checks.
     */
    public async deductPoints(input: TransactionInput): Promise<{ success: boolean; transactionId?: string; newBalance: number; error?: string }> {
        if (input.amount <= 0) {
            return { success: false, newBalance: 0, error: "Invalid deduction amount" };
        }

        return await prisma.$transaction(async (tx) => {
            const user = await tx.user.findUnique({
                where: { id: input.userId },
                select: { arenaPoints: true }
            });

            if (!user || user.arenaPoints < input.amount) {
                return {
                    success: false,
                    newBalance: user?.arenaPoints ?? 0,
                    error: "Insufficient Arena Points balance"
                };
            }

            const updatedUser = await tx.user.update({
                where: { id: input.userId },
                data: { arenaPoints: { decrement: input.amount } },
                select: { arenaPoints: true }
            });

            const transaction = await tx.arenaPointTransaction.create({
                data: {
                    userId: input.userId,
                    amount: -input.amount,
                    type: input.type,
                    source: input.source,
                    sourceId: input.sourceId,
                    metadata: input.metadata ?? {},
                }
            });

            return {
                success: true,
                transactionId: transaction.id,
                newBalance: updatedUser.arenaPoints
            };
        });
    }

    /**
     * Retrieves transaction history for user transparency.
     */
    public async getHistory(userId: string, limit = 20, offset = 0) {
        const [transactions, total] = await Promise.all([
            prisma.arenaPointTransaction.findMany({
                where: { userId },
                orderBy: { createdAt: "desc" },
                take: limit,
                skip: offset,
            }),
            prisma.arenaPointTransaction.count({ where: { userId } }),
        ]);

        return { transactions, total };
    }
}
