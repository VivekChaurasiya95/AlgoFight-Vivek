// apps/api/src/routes/faculty.route.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { FacultyController } from "../controllers/faculty.controller";
import { prisma } from "@algofight/database";
import { isAdminEmail } from "../constants/admins";

const facultyController = new FacultyController();

const requireFacultyOrAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user || !request.user.id) {
        return reply.status(401).send({ error: "UNAUTHORIZED", message: "Authentication required." });
    }
    const isExplicitAdmin =
        request.user.role === "ADMIN" ||
        isAdminEmail(request.user.email) ||
        request.headers["x-admin-key"] === process.env.ADMIN_SECRET_KEY;
    if (isExplicitAdmin) return;

    try {
        let user = await prisma.user.findUnique({
            where: { id: request.user.id },
            select: { id: true, userType: true, institutionName: true, department: true, email: true },
        });

        const userEmail = (user?.email || request.user.email || "").toLowerCase().trim();
        const isFacultyEmail = userEmail.endsWith("@mitsgwalior.in") ||
                               userEmail.endsWith(".mitsgwalior.in") ||
                               userEmail.includes("mitsgwalior.in");

        if (isFacultyEmail && user && user.userType !== "FACULTY") {
            user = await prisma.user.update({
                where: { id: user.id },
                data: {
                    userType: "FACULTY",
                    institutionName: user.institutionName || "Madhav Institute of Technology & Science",
                    institutionDomain: "mitsgwalior.in",
                    institutionId: "mits-gwalior",
                },
                select: { id: true, userType: true, institutionName: true, department: true, email: true },
            });
        }

        if (user?.userType === "FACULTY" || isAdminEmail(user?.email) || isFacultyEmail) {
            (request as any).facultyRecord = user;
            return;
        }
    } catch {}

    return reply.status(403).send({
        error: "FORBIDDEN",
        message: "Only verified faculty members or administrators can access the Faculty Hub.",
    });
};

export async function facultyRoutes(app: FastifyInstance) {
    // 1. Get student roster with eligibility filtering
    app.get("/faculty/students", { preHandler: [requireFacultyOrAdmin] }, async (req) => {
        const query = req.query as any;
        return facultyController.getStudents(
            {
                department: query.department,
                branch: query.branch,
                batchYear: query.batchYear,
                search: query.search,
                page: query.page ? parseInt(query.page, 10) : 1,
                limit: query.limit ? parseInt(query.limit, 10) : 50,
            },
            req.user
        );
    });

    // 1b. Directory of registered faculties (for Super Admin overview)
    app.get("/faculty/faculties", { preHandler: [requireFacultyOrAdmin] }, async (req) => {
        const query = req.query as any;
        return facultyController.listFaculties({
            search: query?.search,
            department: query?.department,
        });
    });

    // 2. Dispatch reminder or announcement
    app.post("/faculty/reminders", { preHandler: [requireFacultyOrAdmin] }, async (req) => {
        const body = req.body as any;
        return facultyController.dispatchReminder(body, req.user);
    });

    // 3. Get dispatched reminders
    app.get("/faculty/reminders", { preHandler: [requireFacultyOrAdmin] }, async (req) => {
        const query = req.query as any;
        const targetFacultyId = query?.targetFacultyId || query?.facultyId;
        return facultyController.getReminders(req.user, targetFacultyId);
    });

    // 3b. Delete reminder
    app.delete("/faculty/reminders/:id", { preHandler: [requireFacultyOrAdmin] }, async (req) => {
        const { id } = req.params as { id: string };
        return facultyController.deleteReminder(id, req.user);
    });

    // 4. Create Quiz / Assessment
    app.post("/faculty/quizzes", { preHandler: [requireFacultyOrAdmin] }, async (req) => {
        const body = req.body as any;
        return facultyController.createQuiz(body, req.user);
    });

    // 5. Get Quizzes
    app.get("/faculty/quizzes", { preHandler: [requireFacultyOrAdmin] }, async (req) => {
        const query = req.query as any;
        const targetFacultyId = query?.targetFacultyId || query?.facultyId;
        return facultyController.getQuizzes(req.user, targetFacultyId);
    });

    // 5b. Delete Quiz
    app.delete("/faculty/quizzes/:id", { preHandler: [requireFacultyOrAdmin] }, async (req) => {
        const { id } = req.params as { id: string };
        return facultyController.deleteQuiz(id, req.user);
    });

    // 6. Get Faculty Dashboard Stats
    app.get("/faculty/stats", { preHandler: [requireFacultyOrAdmin] }, async (req) => {
        const query = req.query as any;
        const targetFacultyId = query?.targetFacultyId || query?.facultyId;
        return facultyController.getFacultyStats(req.user, targetFacultyId);
    });

    // 7. Update Faculty Profile
    app.put("/faculty/profile", { preHandler: [requireFacultyOrAdmin] }, async (req, reply) => {
        const body = req.body as any;
        const targetUserId = req.user!.id;
        if (!body.school) {
            return reply.status(400).send({
                error: "BAD_REQUEST",
                message: "School or Centre is mandatory for faculty profiles.",
            });
        }
        return facultyController.updateFacultyProfile(targetUserId, {
            school: body.school,
            department: body.department,
            designation: body.designation,
            institutionName: body.institutionName,
        });
    });
}
