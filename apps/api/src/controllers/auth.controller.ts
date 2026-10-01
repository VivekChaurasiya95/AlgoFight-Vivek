// apps/api/src/controllers/auth.controller.ts
import { prisma, ensureFacultyPlatformCode } from "@algofight/database";
import { logger } from "@algofight/logger";
import { googleTokenVerifier } from "../utils/google-auth.util";
import { hashPassword, verifyPassword } from "../utils/password.util";
import { userSessionStore } from "../gateway/session/user-session";
import { isAdminEmail } from "../constants/admins";
import { defaultStudentIdentityService, parseInstitutionalName } from "@algofight/institutional-identity";

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
        const parsedName = parseInstitutionalName(googleUser.name, cleanGoogleEmail);
        const isFaculty = cleanGoogleEmail.endsWith("@mitsgwalior.in") ||
                          cleanGoogleEmail.endsWith(".mitsgwalior.in") ||
                          cleanGoogleEmail.includes("mitsgwalior.in");

        let institutionalData: {
            userType?: "STUDENT" | "FACULTY";
            institutionName?: string;
            department?: string;
            batchYear?: string;
            enrollmentNumber?: string;
        } = {};

        if (parsedName.enrollmentNumber) {
            institutionalData.enrollmentNumber = parsedName.enrollmentNumber.toUpperCase();
        }

        if (isFaculty) {
            institutionalData = {
                userType: "FACULTY",
                institutionName: "Madhav Institute of Technology & Science",
                department: "School of Computer Science & Engineering",
                ...(institutionalData.enrollmentNumber ? { enrollmentNumber: institutionalData.enrollmentNumber } : {}),
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
                        enrollmentNumber: institutionalData.enrollmentNumber || (resolution.identity.enrollmentNumber ? resolution.identity.enrollmentNumber.toUpperCase() : undefined),
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
            let nextPlatformCode = user.platformCode;
            if (nextUserType === "FACULTY" && (!nextPlatformCode || !nextPlatformCode.startsWith("AF-FAC-"))) {
                nextPlatformCode = ensureFacultyPlatformCode(nextPlatformCode);
            }
            user = await (prisma.user as any).update({
                where: { id: user.id },
                data: {
                    department: user.department || institutionalData.department,
                    institutionName: user.institutionName || institutionalData.institutionName,
                    batchYear: user.batchYear || institutionalData.batchYear,
                    userType: nextUserType,
                    ...(nextPlatformCode !== user.platformCode ? { platformCode: nextPlatformCode } : {}),
                },
            });
            if (nextPlatformCode) {
                user.platformCode = nextPlatformCode;
            }
        }

        // Link existing account by email if not already linked to googleSub
        if (!user && googleUser.email) {
            user = await (prisma.user as any).findUnique({
                where: { email: googleUser.email },
            });
            if (user) {
                const nextUserType = isFaculty ? "FACULTY" : (user.userType === "INDIVIDUAL" && institutionalData.userType ? institutionalData.userType : user.userType);
                let nextPlatformCode = user.platformCode;
                if (nextUserType === "FACULTY" && (!nextPlatformCode || !nextPlatformCode.startsWith("AF-FAC-"))) {
                    nextPlatformCode = ensureFacultyPlatformCode(nextPlatformCode);
                }
                user = await (prisma.user as any).update({
                    where: { id: user.id },
                    data: {
                        googleSub: googleUser.sub,
                        department: user.department || institutionalData.department || null,
                        institutionName: user.institutionName || institutionalData.institutionName || null,
                        batchYear: user.batchYear || institutionalData.batchYear || null,
                        userType: nextUserType,
                        ...(nextPlatformCode !== user.platformCode ? { platformCode: nextPlatformCode } : {}),
                    },
                });
                if (nextPlatformCode) {
                    user.platformCode = nextPlatformCode;
                }
                logger.info({ userId: user.id, email: user.email, department: user.department, userType: nextUserType, platformCode: nextPlatformCode }, "Linked existing account to Google sub and synced institutional identity");
            }
        }

        // Ensure any existing faculty record has updated AF-FAC platform code
        if (user && (isFaculty || user.userType === "FACULTY") && (!user.platformCode || !user.platformCode.startsWith("AF-FAC-"))) {
            const nextCode = ensureFacultyPlatformCode(user.platformCode);
            user = await (prisma.user as any).update({
                where: { id: user.id },
                data: {
                    userType: "FACULTY",
                    platformCode: nextCode,
                },
            });
        }

        // If existing user, check for enrollmentNumber backfill or contaminated username cleanup
        if (user) {
            const targetEnrollment = institutionalData.enrollmentNumber
                ? institutionalData.enrollmentNumber.toUpperCase()
                : (user.enrollmentNumber ? user.enrollmentNumber.toUpperCase() : null);

            let cleanUsernameToUpdate: string | undefined = undefined;
            const parsedExistingUsername = parseInstitutionalName(user.username);
            if (parsedExistingUsername.hasEnrollmentPrefix) {
                let targetBase = parsedName.actualName
                    ? parseInstitutionalName(parsedName.actualName).cleanUsernameBase
                    : parsedExistingUsername.cleanUsernameBase;
                if (!targetBase || targetBase.length < 3) {
                    targetBase = `player_${Math.floor(1000 + Math.random() * 9000)}`;
                }
                let candidate = targetBase;
                let counter = 1;
                while (await (prisma.user as any).findFirst({ where: { username: candidate, id: { not: user.id } } })) {
                    candidate = `${targetBase}_${Math.floor(100 + Math.random() * 900)}`;
                    counter++;
                    if (counter > 10) break;
                }
                cleanUsernameToUpdate = candidate;
                logger.info({ userId: user.id, oldUsername: user.username, newUsername: cleanUsernameToUpdate }, "Cleaned enrollment prefix from existing user username");
            }

            const needsEnrollmentUpdate = targetEnrollment && user.enrollmentNumber !== targetEnrollment;
            const needsUsernameUpdate = Boolean(cleanUsernameToUpdate);

            if (needsEnrollmentUpdate || needsUsernameUpdate) {
                user = await (prisma.user as any).update({
                    where: { id: user.id },
                    data: {
                        ...(needsEnrollmentUpdate ? { enrollmentNumber: targetEnrollment } : {}),
                        ...(needsUsernameUpdate ? { username: cleanUsernameToUpdate } : {}),
                    },
                });
            }
        }

        // If new user, create account
        if (!user) {
            let baseUsername = parsedName.cleanUsernameBase;
            if (!baseUsername || baseUsername.length < 3) {
                baseUsername = (googleUser.name || googleUser.email.split("@")[0])
                    .toLowerCase()
                    .replace(/[^a-z0-9_]/g, "");
            }
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
            const finalEnrollment = institutionalData.enrollmentNumber || (parsedName.enrollmentNumber ? parsedName.enrollmentNumber.toUpperCase() : null);

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
                    enrollmentNumber: finalEnrollment ? finalEnrollment.toUpperCase() : null,
                    platformCode,
                    studentIdentityMetadata: {
                        ...(googleUser.picture ? { photoURL: googleUser.picture } : {}),
                        ...(isFaculty ? { designation: "Faculty Educator" } : {}),
                    },
                },
            });
            logger.info({ userId: user.id, username: user.username, enrollmentNumber: user.enrollmentNumber, department: user.department, userType }, "Created new user via Google authentication");
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
                enrollmentNumber: user.enrollmentNumber ? user.enrollmentNumber.toUpperCase() : (institutionalData.enrollmentNumber || null),
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

        // Auto-upgrade to FACULTY if email is mitsgwalior.in or user is faculty
        const isFaculty = cleanEmail.endsWith("@mitsgwalior.in") ||
                          cleanEmail.endsWith(".mitsgwalior.in") ||
                          cleanEmail.includes("mitsgwalior.in") ||
                          user.userType === "FACULTY";
        const needsCodeFix = isFaculty && (!user.platformCode || !user.platformCode.startsWith("AF-FAC-"));
        if ((isFaculty && user.userType !== "FACULTY") || needsCodeFix) {
            const nextPlatformCode = needsCodeFix ? ensureFacultyPlatformCode(user.platformCode) : user.platformCode;
            const updated = await prisma.user.update({
                where: { id: user.id },
                data: {
                    userType: "FACULTY",
                    institutionName: user.institutionName || "Madhav Institute of Technology & Science",
                    ...(needsCodeFix ? { platformCode: nextPlatformCode } : {}),
                },
            });
            user.userType = updated.userType;
            user.institutionName = updated.institutionName;
            user.platformCode = updated.platformCode;
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
                enrollmentNumber: user.enrollmentNumber ? user.enrollmentNumber.toUpperCase() : null,
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

        const parsedManual = parseInstitutionalName(params.displayName || params.username, cleanEmail);

        let baseUsername = (params.username && !parseInstitutionalName(params.username).hasEnrollmentPrefix)
            ? params.username.toLowerCase().replace(/[^a-z0-9_]/g, "")
            : parsedManual.cleanUsernameBase;

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
                          cleanEmail.includes("mitsgwalior.in") ||
                          params.userType === "FACULTY";

        let institutionalData: {
            userType?: "STUDENT" | "FACULTY";
            institutionName?: string;
            department?: string;
            batchYear?: string;
            enrollmentNumber?: string;
        } = {};

        if (parsedManual.enrollmentNumber) {
            institutionalData.enrollmentNumber = parsedManual.enrollmentNumber.toUpperCase();
        }

        if (isFaculty) {
            institutionalData = {
                userType: "FACULTY",
                institutionName: params.institutionName || "Madhav Institute of Technology & Science",
                department: params.department || "School of Computer Science & Engineering",
                ...(institutionalData.enrollmentNumber ? { enrollmentNumber: institutionalData.enrollmentNumber } : {}),
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
                        enrollmentNumber: institutionalData.enrollmentNumber || (resolution.identity.enrollmentNumber ? resolution.identity.enrollmentNumber.toUpperCase() : undefined),
                    };
                }
            } catch {
                // Ignore parsing errors for non-institutional emails
            }
        }

        const passwordHash = hashPassword(params.password);
        const resolvedUserType = isFaculty ? "FACULTY" : (params.userType || institutionalData.userType || "INDIVIDUAL");
        const platformPrefix = resolvedUserType === "FACULTY" ? "AF-FAC" : (resolvedUserType === "STUDENT" ? "AF-STU" : "AF-USR");
        const platformCode = `${platformPrefix}-${Math.floor(10000 + Math.random() * 90000)}`;

        const studentIdentityMetadata = (params.school || params.designation || params.department)
            ? {
                school: params.school || null,
                department: params.department || null,
                designation: params.designation || (resolvedUserType === "FACULTY" ? "Faculty Educator" : null),
            }
            : undefined;

        const finalManualEnrollment = institutionalData.enrollmentNumber || (parsedManual.enrollmentNumber ? parsedManual.enrollmentNumber.toUpperCase() : null);

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
                enrollmentNumber: finalManualEnrollment ? finalManualEnrollment.toUpperCase() : null,
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
                enrollmentNumber: user.enrollmentNumber ? user.enrollmentNumber.toUpperCase() : null,
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
