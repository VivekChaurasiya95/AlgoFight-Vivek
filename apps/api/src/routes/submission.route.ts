import { FastifyInstance } from "fastify";
import { SubmissionController } from "../controllers/submission.controllers";
import {
    PrismaSubmissionRepository,
    PrismaProblemRepository,
    prisma
} from "@algofight/database";
import { createRedisClient } from "@algofight/queue";
import {
    SubmissionInput,
    submissionSchema,
    TestRunInput,
    testRunSchema
} from "../schema/submission.schema";
import { requireAuth } from "../plugins/auth.plugin";

const redis = createRedisClient();
const submissionRepository = new PrismaSubmissionRepository();
const problemRepository = new PrismaProblemRepository();
const submissionController = new SubmissionController(
    submissionRepository,
    problemRepository
);

export async function submissionRoutes(app: FastifyInstance) {
    // 1. Submit Code (Strict rate limit: 15 req/min, Authenticated)
    app.post(
        "/submit",
        {
            preHandler: [requireAuth],
            config: {
                rateLimit: {
                    max: 15,
                    timeWindow: "1 minute",
                },
            },
        },
        async (request, reply) => {
            const body: SubmissionInput = submissionSchema.parse(request.body);
            const authenticatedUserId = request.user!.id;

            return submissionController.submit(body, authenticatedUserId);
        },
    );

    // 2. Test Code (Rate limit: 30 req/min)
    app.post(
        "/test",
        {
            config: {
                rateLimit: {
                    max: 30,
                    timeWindow: "1 minute",
                },
            },
        },
        async (request) => {
            const body: TestRunInput = testRunSchema.parse(request.body);
            return submissionController.test(body);
        },
    );

    // 3. Practice Evaluate (Rate limit: 15 req/min, Authenticated) - AF-001 & AF-005
    app.post(
        "/practice/evaluate",
        {
            preHandler: [requireAuth],
            config: {
                rateLimit: {
                    max: 15,
                    timeWindow: "1 minute",
                },
            },
        },
        async (request) => {
            const body = request.body as any;
            return submissionController.evaluatePractice(body);
        },
    );

    // 3a. Practice Checkpoint Get (Redis -> Fallback to PostgreSQL latest submission)
    app.get(
        "/practice/checkpoints/:problemId",
        {
            preHandler: [requireAuth],
        },
        async (request, reply) => {
            const userId = request.user?.id;
            const { problemId } = request.params as { problemId: string };
            if (!userId || !problemId) {
                return reply.status(400).send({ error: "Missing userId or problemId" });
            }

            const redisKey = `practice_checkpoint:${userId}:${problemId}`;

            try {
                const cached = await redis.get(redisKey);
                if (cached) {
                    return JSON.parse(cached);
                }
            } catch (_) {}

            // Fallback to latest PostgreSQL submission for this user and problem
            const latestSub = await prisma.submission.findFirst({
                where: { userId, problemId },
                orderBy: { createdAt: "desc" },
                select: {
                    code: true,
                    language: true,
                    updatedAt: true,
                },
            }).catch(() => null);

            if (latestSub) {
                return {
                    problemId,
                    code: latestSub.code,
                    language: latestSub.language,
                    revision: 1,
                    updatedAt: new Date(latestSub.updatedAt).getTime(),
                };
            }

            return { problemId, code: null };
        }
    );

    // 3b. Practice Checkpoint Save (Redis hot storage with 7-day TTL)
    app.post(
        "/practice/checkpoints/:problemId",
        {
            preHandler: [requireAuth],
        },
        async (request, reply) => {
            const userId = request.user?.id;
            const { problemId } = request.params as { problemId: string };
            const body = request.body as any;

            if (!userId || !problemId || !body || typeof body.code !== "string") {
                return reply.status(400).send({ error: "Invalid checkpoint payload" });
            }

            const redisKey = `practice_checkpoint:${userId}:${problemId}`;
            const checkpoint = {
                userId,
                problemId,
                code: body.code,
                language: body.language || "javascript",
                revision: body.revision || 1,
                updatedAt: body.updatedAt || Date.now(),
            };

            await redis.set(redisKey, JSON.stringify(checkpoint), "EX", 7 * 86400);

            return { success: true, revision: checkpoint.revision };
        }
    );



    // 4. Submissions List (Public Summary DTOs)
    app.get(
        "/submissions",
        async (request) => {
            return submissionController.getAllSubmission(request.user?.id);
        },
    );

    // 5. Direct Runtime Code Execution (Callable for both prewarmed baseline & extended instances)
    app.post(
        "/submissions/execute-direct",
        {
            config: {
                rateLimit: {
                    max: 60,
                    timeWindow: "1 minute",
                },
            },
        },
        async (request) => {
            const body = (request.body as any) || {};
            return submissionController.executeDirect(body);
        }
    );

    // Alias: Direct Piston Runtime Execution
    app.post(
        "/runtimes/execute",
        {
            config: {
                rateLimit: {
                    max: 60,
                    timeWindow: "1 minute",
                },
            },
        },
        async (request) => {
            const body = (request.body as any) || {};
            return submissionController.executeDirect(body);
        }
    );

    // 6. Runtime Pool Discovery (Lists all prewarmed baseline and extended Piston instances)
    app.get(
        "/runtimes",
        async () => {
            return submissionController.getRuntimePoolStatus();
        }
    );

    app.get(
        "/submissions/runtimes",
        async () => {
            return submissionController.getRuntimePoolStatus();
        }
    );

    // 7. Submission Details by ID (Object-Level Authorization)
    app.get(
        "/submissions/:id",
        async (request, reply) => {
            const { id } = request.params as { id: string };
            const submission = await submissionController.getSubmissionById(id, request.user?.id, request.user?.role);
            if (!submission) {
                return reply.status(404).send({ error: "NOT_FOUND", message: "Submission not found." });
            }
            return submission;
        }
    );
}
