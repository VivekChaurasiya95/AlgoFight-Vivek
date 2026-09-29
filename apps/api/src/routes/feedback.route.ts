import { FastifyInstance } from "fastify";
import { FeedbackController } from "../controllers/feedback.controller";

const feedbackController = new FeedbackController();

export async function feedbackRoutes(app: FastifyInstance) {
    // Submit user feedback (Public or Auth)
    app.post("/feedback", async (req, reply) => {
        return feedbackController.submitFeedback(req, reply);
    });

    // Get showcase feedbacks for website testimonials (Public)
    app.get("/feedback/showcase", async (req, reply) => {
        return feedbackController.getShowcaseFeedbacks(req, reply);
    });

    // Get all feedbacks (Internal / ControlHub)
    app.get("/feedback", async (req, reply) => {
        return feedbackController.getFeedbacks(req, reply);
    });
}
