import { FastifyReply, FastifyRequest } from "fastify";
import { FeedbackService } from "../services/feedback.service";
import { auditService } from "../services/audit.service";
import { extractClientIp } from "../utils/ip.util";

export class FeedbackController {
    async submitFeedback(req: FastifyRequest, reply: FastifyReply) {
        const body = (req.body || {}) as {
            rating: number;
            comment: string;
            showcaseOnWebsite?: boolean;
            name?: string;
            email?: string;
        };

        const user = (req as any).user;
        const clientIp = extractClientIp(req);

        const feedback = await FeedbackService.submitFeedback({
            userId: user?.id,
            username: user?.username || body.name || "Anonymous Combatant",
            email: user?.email || body.email,
            rating: body.rating,
            comment: body.comment,
            showcaseOnWebsite: Boolean(body.showcaseOnWebsite),
        });

        // Audit log
        auditService.recordEvent({
            category: "SYSTEM",
            severity: "INFO",
            action: "FEEDBACK_SUBMITTED",
            actor: user?.username || body.name || "Guest",
            ip: clientIp,
            details: `User submitted feedback (Rating: ${feedback.rating}/5, Showcase: ${feedback.showcaseOnWebsite})`,
            metadata: { feedbackId: feedback.id, rating: feedback.rating, showcaseOnWebsite: feedback.showcaseOnWebsite },
        });

        return reply.code(201).send({
            success: true,
            message: "Thank you for your feedback! Your review helps sharpen AlgoFight.",
            feedback,
        });
    }

    async getFeedbacks(req: FastifyRequest, reply: FastifyReply) {
        const query = (req.query || {}) as { limit?: string; offset?: string };
        const limit = query.limit ? Math.min(100, parseInt(query.limit, 10)) : 50;
        const offset = query.offset ? parseInt(query.offset, 10) : 0;

        const result = await FeedbackService.getFeedbacks(limit, offset);
        return reply.send(result);
    }

    async getShowcaseFeedbacks(req: FastifyRequest, reply: FastifyReply) {
        const query = (req.query || {}) as { limit?: string };
        const limit = query.limit ? Math.min(30, parseInt(query.limit, 10)) : 10;

        const feedbacks = await FeedbackService.getShowcaseFeedbacks(limit);
        reply.header("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
        return reply.send({ feedbacks });
    }
}
