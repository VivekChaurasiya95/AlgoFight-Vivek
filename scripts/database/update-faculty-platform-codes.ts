// scripts/database/update-faculty-platform-codes.ts
import "dotenv/config";
import { prisma, ensureFacultyPlatformCode } from "../../packages/database/src/index";

async function run() {
    console.log("Starting faculty platform code migration...");

    const facultyUsers = await prisma.user.findMany({
        where: {
            OR: [
                { userType: "FACULTY" },
                { email: { contains: "mitsgwalior.in", mode: "insensitive" } },
            ],
        },
        select: {
            id: true,
            email: true,
            username: true,
            userType: true,
            platformCode: true,
        },
    });

    console.log(`Found ${facultyUsers.length} total faculty/institutional records.`);

    let updatedCount = 0;
    for (const f of facultyUsers) {
        const needsCodeFix = !f.platformCode || !f.platformCode.startsWith("AF-FAC-");
        const needsTypeFix = f.userType !== "FACULTY";

        if (needsCodeFix || needsTypeFix) {
            const newCode = ensureFacultyPlatformCode(f.platformCode);
            await prisma.user.update({
                where: { id: f.id },
                data: {
                    platformCode: newCode,
                    userType: "FACULTY",
                },
            });
            console.log(`Updated faculty: ${f.username} (${f.email}) -> [${f.platformCode || "NULL"}] => [${newCode}]`);
            updatedCount++;
        } else {
            console.log(`Already compliant: ${f.username} (${f.email}) -> [${f.platformCode}]`);
        }
    }

    console.log(`Faculty platform code migration complete. Total updated: ${updatedCount}.`);
}

run()
    .catch((err) => {
        console.error("Migration failed:", err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect().catch(() => {});
        process.exit(0);
    });
