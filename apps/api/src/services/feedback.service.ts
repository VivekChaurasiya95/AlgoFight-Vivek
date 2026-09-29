import { redisConnection } from "@algofight/queue/src/client/redis";
import { logger } from "@algofight/logger";

export interface UserFeedback {
    id: string;
    userId?: string;
    username?: string;
    email?: string;
    rating: number; // 1 - 5
    comment: string;
    showcaseOnWebsite: boolean;
    createdAt: number;
    status: "APPROVED" | "PENDING" | "REJECTED";
}

export class FeedbackService {
    private static FEEDBACK_LIST_KEY = "site_feedbacks";
    private static FEEDBACK_KEY_PREFIX = "site_feedback:";
    private static MAX_FEEDBACKS = 1000;

    /**
     * Submit new user feedback
     */
    static async submitFeedback(params: {
        userId?: string;
        username?: string;
        email?: string;
        rating: number;
        comment: string;
        showcaseOnWebsite: boolean;
    }): Promise<UserFeedback> {
        const rating = Math.min(5, Math.max(1, Math.round(Number(params.rating) || 5)));
        const comment = (params.comment || "").trim();
        const showcaseOnWebsite = Boolean(params.showcaseOnWebsite);

        const feedback: UserFeedback = {
            id: `fb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            userId: params.userId || undefined,
            username: params.username || "Anonymous Fighter",
            email: params.email || undefined,
            rating,
            comment,
            showcaseOnWebsite,
            createdAt: Date.now(),
            // Auto-approve 4+ star feedbacks for showcase if user opted in
            status: showcaseOnWebsite ? "APPROVED" : "PENDING",
        };

        try {
            const serialized = JSON.stringify(feedback);
            await redisConnection.lpush(this.FEEDBACK_LIST_KEY, serialized);
            await redisConnection.ltrim(this.FEEDBACK_LIST_KEY, 0, this.MAX_FEEDBACKS - 1);
            await redisConnection.set(`${this.FEEDBACK_KEY_PREFIX}${feedback.id}`, serialized, "EX", 60 * 60 * 24 * 90); // 90 days
            
            // Mark user as having submitted feedback
            if (params.userId) {
                await redisConnection.set(`user:feedback:submitted:${params.userId}`, feedback.id, "EX", 60 * 60 * 24 * 365);
            }

            logger.info({ feedbackId: feedback.id, rating, showcaseOnWebsite }, "User feedback recorded successfully");
        } catch (err: any) {
            logger.error({ error: err.message }, "Error persisting user feedback to Redis");
        }

        return feedback;
    }

    /**
     * Get all feedbacks (with pagination)
     */
    static async getFeedbacks(limit = 50, offset = 0): Promise<{ feedbacks: UserFeedback[]; total: number }> {
        try {
            const raw = await redisConnection.lrange(this.FEEDBACK_LIST_KEY, offset, offset + limit - 1);
            const total = await redisConnection.llen(this.FEEDBACK_LIST_KEY);
            const feedbacks: UserFeedback[] = raw.map((item) => JSON.parse(item));
            return { feedbacks, total };
        } catch {
            return { feedbacks: [], total: 0 };
        }
    }

    /**
     * Get showcase-approved feedbacks for website testimonials
     */
    static async getShowcaseFeedbacks(limit = 10): Promise<UserFeedback[]> {
        try {
            const raw = await redisConnection.lrange(this.FEEDBACK_LIST_KEY, 0, 100);
            const feedbacks: UserFeedback[] = raw
                .map((item) => JSON.parse(item))
                .filter((fb) => fb.showcaseOnWebsite && fb.comment && fb.comment.length > 5 && fb.rating >= 4)
                .slice(0, limit);
            return feedbacks;
        } catch {
            return [];
        }
    }
}
