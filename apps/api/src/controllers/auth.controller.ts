// apps/api/src/controllers/auth.controller.ts
import { prisma } from "@algofight/database";
import { logger } from "@algofight/logger";
import { googleTokenVerifier } from "../utils/google-auth.util";
import { hashPassword, verifyPassword } from "../utils/password.util";
import { userSessionStore } from "../gateway/session/user-session";
import { isAdminEmail } from "../constants/admins";
import { defaultStudentIdentityService } from "@algofight/institutional-identity";

export class AuthController {
    public async loginWithGoogle(params: {
        idToken: string;
        ip?: string;
        userAgent?: string;
    }) {
        const googleUser = await googleTokenVerifier.verifyIdToken(params.idToken);
        if (!googleUser) {
            throw { statusCode: 401, message: "Invalid or expired Google credential" };
        }

        // Check if user email is a faculty or institutional email (e.g. atul@mitsgwalior.in or 24ai10ar16@mitsgwl.ac.in)
        const cleanGoogleEmail = (googleUser.email || "").trim().toLowerCase();
        const isFaculty = cleanGoogleEmail.endsWith("@mitsgwalior.in") ||
                          cleanGoogleEmail.endsWith(".mitsgwalior.in") ||
                          cleanGoogleEmail.includes("mitsgwalior.in");

        let institutionalData: {
            userType?: "STUDENT" | "FACULTY";
            institutionName?: string;
            department?: string;
            batchYear?: string;
        } = {};

        if (isFaculty) {
            institutionalData = {
                userType: "FACULTY",
                institutionName: "Madhav Institute of Technology & Science",
                department: "School of Computer Science & Engineering",
            };
        } else if (cleanGoogleEmail.includes("@")) {
            try {
                const resolution = defaultStudentIdentityService.resolveFromEmail(cleanGoogleEmail);
                if (resolution.isInstitutional) {
                    institutionalData = {
                        userType: "STUDENT",
                        institutionName: resolution.institute.name,
                        department: resolution.identity.department || resolution.identity.branchName,
                        batchYear: String(resolution.identity.admissionYear),
                    };
                }
            } catch {
                // Ignore parsing errors for non-institutional emails
            }
        }

        let user = await (prisma.user as any).findUnique({
            where: { googleSub: googleUser.sub },
        });

        // If existing user by googleSub, ensure faculty or department is synced
        if (user && (isFaculty || institutionalData.department)) {
            const nextUserType = isFaculty ? "FACULTY" : (user.userType === "INDIVIDUAL" ? (institutionalData.userType || "STUDENT") : user.userType);
            user = await (prisma.user as any).update({
                where: { id: user.id },
                data: {
                    department: user.department || institutionalData.department,
                    institutionName: user.institutionName || institutionalData.institutionName,
                    batchYear: user.batchYear || institutionalData.batchYear,
                    userType: nextUserType,
                },
            });
        }

        // Link existing account by email if not already linked to googleSub
        if (!user && googleUser.email) {
            user = await (prisma.user as any).findUnique({
                where: { email: googleUser.email },
            });
            if (user) {
                const nextUserType = isFaculty ? "FACULTY" : (user.userType === "INDIVIDUAL" && institutionalData.userType ? institutionalData.userType : user.userType);
                user = await (prisma.user as any).update({
                    where: { id: user.id },
                    data: {
                        googleSub: googleUser.sub,
                        department: user.department || institutionalData.department || null,
                        institutionName: user.institutionName || institutionalData.institutionName || null,
                        batchYear: user.batchYear || institutionalData.batchYear || null,
                        userType: nextUserType,
                    },
                });
                logger.info({ userId: user.id, email: user.email, department: user.department, userType: nextUserType }, "Linked existing account to Google sub and synced institutional identity");
            }
        }

        // If new user, create account
        if (!user) {
            let baseUsername = (googleUser.name || googleUser.email.split("@")[0])
                .toLowerCase()
                .replace(/[^a-z0-9_]/g, "");
            if (!baseUsername || baseUsername.length < 3) baseUsername = `player_${Math.floor(1000 + Math.random() * 9000)}`;

            let uniqueUsername = baseUsername;
            let counter = 1;
            while (await prisma.user.findUnique({ where: { username: uniqueUsername } })) {
                uniqueUsername = `${baseUsername}_${Math.floor(100 + Math.random() * 900)}`;
                counter++;
                if (counter > 10) break;
            }

            const userType = isFaculty ? "FACULTY" : (institutionalData.userType || "INDIVIDUAL");
            const platformPrefix = userType === "FACULTY" ? "AF-FAC" : (userType === "STUDENT" ? "AF-STU" : "AF-USR");
            const platformCode = `${platformPrefix}-${Math.floor(10000 + Math.random() * 90000)}`;

            user = await (prisma.user as any).create({
                data: {
                    email: googleUser.email,
                    googleSub: googleUser.sub,
                    username: uniqueUsername,
                    primaryEmail: googleUser.email,
                    userType,
                    institutionName: institutionalData.institutionName || (isFaculty ? "Madhav Institute of Technology & Science" : null),
                    department: institutionalData.department || null,
                    batchYear: institutionalData.batchYear || null,
                    platformCode,
                    studentIdentityMetadata: {
                        ...(googleUser.picture ? { photoURL: googleUser.picture } : {}),
                        ...(isFaculty ? { designation: "Faculty Educator" } : {}),
                    },
                },
            });
            logger.info({ userId: user.id, username: user.username, department: user.department, userType }, "Created new user via Google authentication");
        } else if (googleUser.picture) {
            const existingMeta = (user.studentIdentityMetadata as any) || {};
            if (existingMeta.photoURL !== googleUser.picture) {
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        studentIdentityMetadata: {
                            ...existingMeta,
                            photoURL: googleUser.picture,
                        },
                    },
                });
            }
        }

        const isAdmin = isAdminEmail(user.email);
        const session = await userSessionStore.createSession({
            userId: user.id,
            email: user.email,
            username: user.username,
            role: isAdmin ? "ADMIN" : "USER",
            platformCode: user.platformCode || undefined,
            institutionName: user.institutionName || undefined,
            ip: params.ip,
            userAgent: params.userAgent,
        });

        const identityMeta = (user.studentIdentityMetadata as any) || {};
        return {
            success: true,
            token: session.sessionId,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                role: isAdmin ? "ADMIN" : "USER",
                userType: user.userType,
                platformCode: user.platformCode,
                institutionName: user.institutionName,
                department: user.department,
                school: identityMeta.school || null,
                designation: identityMeta.designation || (user.userType === "FACULTY" ? "Faculty Educator" : null),
                batchYear: user.batchYear,
                rating: user.rating,
                highestRank: user.highestRank,
                photoURL: googleUser.picture,
            },
        };
    }

    public async loginManual(params: {
        email: string;
        password: string;
        ip?: string;
        userAgent?: string;
    }) {
        const cleanEmail = params.email.trim().toLowerCase();
        const user = await prisma.user.findUnique({
            where: { email: cleanEmail },
        });

        if (!user || !(user as any).passwordHash) {
            throw { statusCode: 401, message: "Invalid email or password." };
        }

        const valid = verifyPassword(params.password, (user as any).passwordHash);
        if (!valid) {
            throw { statusCode: 401, message: "Invalid email or password." };
        }

        // Auto-upgrade to FACULTY if email is mitsgwalior.in
        const isFaculty = cleanEmail.endsWith("@mitsgwalior.in") ||
                          cleanEmail.endsWith(".mitsgwalior.in") ||
                          cleanEmail.includes("mitsgwalior.in");
        if (isFaculty && user.userType !== "FACULTY") {
            const updated = await prisma.user.update({
                where: { id: user.id },
                data: {
                    userType: "FACULTY",
                    institutionName: user.institutionName || "Madhav Institute of Technology & Science",
                },
            });
            user.userType = updated.userType;
            user.institutionName = updated.institutionName;
        }

        const isAdmin = isAdminEmail(user.email);
        const session = await userSessionStore.createSession({
            userId: user.id,
            email: user.email,
            username: user.username,
            role: isAdmin ? "ADMIN" : "USER",
            platformCode: user.platformCode || undefined,
            institutionName: user.institutionName || undefined,
            ip: params.ip,
            userAgent: params.userAgent,
        });

        const manualMeta = (user.studentIdentityMetadata as any) || {};
        return {
            success: true,
            token: session.sessionId,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                role: isAdmin ? "ADMIN" : "USER",
                userType: user.userType,
                platformCode: user.platformCode,
                institutionName: user.institutionName,
                department: user.department,
                school: manualMeta.school || null,
                designation: manualMeta.designation || (user.userType === "FACULTY" ? "Faculty Educator" : null),
                batchYear: user.batchYear,
                rating: user.rating,
                highestRank: user.highestRank,
            },
        };
    }

    public async signupManual(params: {
        email: string;
        password: string;
        username?: string;
        displayName?: string;
        userType?: "STUDENT" | "FACULTY" | "INDIVIDUAL";
        institutionName?: string;
        school?: string;
        department?: string;
        designation?: string;
        ip?: string;
        userAgent?: string;
    }) {
        const cleanEmail = params.email.trim().toLowerCase();

        const existingEmail = await prisma.user.findUnique({
            where: { email: cleanEmail },
        });
        if (existingEmail) {
            throw { statusCode: 400, message: "An account with this email already exists." };
        }

        let baseUsername = (params.username || params.displayName || cleanEmail.split("@")[0])
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, "");
        if (!baseUsername || baseUsername.length < 3) {
            baseUsername = `user_${Math.floor(1000 + Math.random() * 9000)}`;
        }

        let uniqueUsername = baseUsername;
        let counter = 1;
        while (await prisma.user.findUnique({ where: { username: uniqueUsername } })) {
            uniqueUsername = `${baseUsername}_${Math.floor(100 + Math.random() * 900)}`;
            counter++;
            if (counter > 10) break;
        }

        const isFaculty = cleanEmail.endsWith("@mitsgwalior.in") ||
                          cleanEmail.endsWith(".mitsgwalior.in") ||
                          cleanEmail.includes("mitsgwalior.in");

        let institutionalData: {
            userType?: "STUDENT" | "FACULTY";
            institutionName?: string;
            department?: string;
            batchYear?: string;
        } = {};

        if (isFaculty) {
            institutionalData = {
                userType: "FACULTY",
                institutionName: params.institutionName || "Madhav Institute of Technology & Science",
                department: params.department || "School of Computer Science & Engineering",
            };
        } else if (cleanEmail.includes("@")) {
            try {
                const resolution = defaultStudentIdentityService.resolveFromEmail(cleanEmail);
                if (resolution.isInstitutional) {
                    institutionalData = {
                        userType: "STUDENT",
                        institutionName: resolution.institute.name,
                        department: resolution.identity.department || resolution.identity.branchName,
                        batchYear: String(resolution.identity.admissionYear),
                    };
                }
            } catch {
                // Ignore parsing errors for non-institutional emails
            }
        }

        const passwordHash = hashPassword(params.password);
        const resolvedUserType = params.userType || institutionalData.userType || "INDIVIDUAL";
        const platformPrefix = resolvedUserType === "STUDENT" ? "AF-STU" : resolvedUserType === "FACULTY" ? "AF-FAC" : "AF-USR";
        const platformCode = `${platformPrefix}-${Math.floor(10000 + Math.random() * 90000)}`;

        const studentIdentityMetadata = (params.school || params.designation || params.department)
            ? {
                school: params.school || null,
                department: params.department || null,
                designation: params.designation || (resolvedUserType === "FACULTY" ? "Faculty Educator" : null),
            }
            : undefined;

        const user = await (prisma.user as any).create({
            data: {
                email: cleanEmail,
                username: uniqueUsername,
                passwordHash,
                primaryEmail: cleanEmail,
                userType: resolvedUserType,
                institutionName: params.institutionName || institutionalData.institutionName || (resolvedUserType === "FACULTY" ? "Madhav Institute of Technology & Science" : null),
                department: params.department || params.school || institutionalData.department || null,
                batchYear: institutionalData.batchYear || null,
                platformCode,
                studentIdentityMetadata,
            },
        });

        const isAdmin = isAdminEmail(user.email);
        const session = await userSessionStore.createSession({
            userId: user.id,
            email: user.email,
            username: user.username,
            role: isAdmin ? "ADMIN" : "USER",
            platformCode: user.platformCode || undefined,
            institutionName: user.institutionName || undefined,
            ip: params.ip,
            userAgent: params.userAgent,
        });

        const signupMeta = (user.studentIdentityMetadata as any) || {};
        return {
            success: true,
            token: session.sessionId,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                role: isAdmin ? "ADMIN" : "USER",
                userType: user.userType,
                platformCode: user.platformCode,
                institutionName: user.institutionName,
                department: user.department,
                school: signupMeta.school || null,
                designation: signupMeta.designation || (user.userType === "FACULTY" ? "Faculty Educator" : null),
                batchYear: user.batchYear,
                rating: user.rating,
                highestRank: user.highestRank,
            },
        };
    }

    public async logout(sessionId: string) {
        if (sessionId) {
            await userSessionStore.invalidateSession(sessionId);
        }
        return { success: true };
    }
}
