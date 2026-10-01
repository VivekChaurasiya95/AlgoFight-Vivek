// apps/api/src/controllers/user.controller.ts
import { PrismaUserRepository, prisma } from "@algofight/database";
import { defaultStudentIdentityService, parseInstitutionalName } from "@algofight/institutional-identity";

export interface SyncUserPayload {
    id?: string;
    uid?: string;
    email: string;
    username?: string;
    displayName?: string;
    photoURL?: string;
    githubUrl?: string;
    linkedinUrl?: string;
    userType?: "STUDENT" | "FACULTY" | "INDIVIDUAL";
    institutionName?: string;
    institutionId?: string;
    institutionDomain?: string;
    department?: string;
    branch?: string;
    batchYear?: string;
    admissionYear?: number;
    enrollmentNumber?: string;
    studentIdentityMetadata?: any;
    school?: string;
    designation?: string;
}

export class UserController {
    constructor(private readonly userRepository: PrismaUserRepository = new PrismaUserRepository()) { }

    private async enrichUserMetrics(user: any) {
        if (!user || !user.id) return {};
        try {
            const [practiceData, ratingHistories, submissions] = await Promise.all([
                this.userRepository.getPracticeProgress(user.id).catch(() => ({
                    practiceSubmissionCount: 0,
                    practiceSolvedProblemIds: [] as string[],
                })),
                prisma.ratingHistory.findMany({
                    where: { userId: user.id },
                    select: { ratingBefore: true, ratingAfter: true, ratingDelta: true, createdAt: true },
                    orderBy: { createdAt: "asc" },
                    take: 20,
                }).catch(() => []),
                prisma.submission.findMany({
                    where: { userId: user.id },
                    select: { createdAt: true },
                    orderBy: { createdAt: "desc" },
                    take: 60,
                }).catch(() => []),
            ]);

            const practiceSolvedCount = practiceData.practiceSolvedProblemIds.length;
            const practiceSubmissionCount = practiceData.practiceSubmissionCount;
            const totalSubmissions = Math.max(practiceSubmissionCount, user.totalSubmissions || 0);

            // Compute active submission streak
            let currentStreak = 0;
            if (submissions.length > 0) {
                const uniqueDates = Array.from(
                    new Set(
                        submissions.map((s) => new Date(s.createdAt).toISOString().split("T")[0])
                    )
                ).sort().reverse();

                const todayStr = new Date().toISOString().split("T")[0];
                const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split("T")[0];

                if (uniqueDates.includes(todayStr) || uniqueDates.includes(yesterdayStr)) {
                    let checkDate = new Date(uniqueDates[0]);
                    for (const d of uniqueDates) {
                        const expected = checkDate.toISOString().split("T")[0];
                        if (d === expected) {
                            currentStreak++;
                            checkDate = new Date(checkDate.getTime() - 86400000);
                        } else {
                            break;
                        }
                    }
                }
            }

            const latestDelta = ratingHistories.length > 0 ? (ratingHistories[ratingHistories.length - 1] as any).ratingDelta : 0;
            const formattedRatingHistories = ratingHistories.map((r: any) => ({
                ...r,
                ratingBefore: r.ratingBefore,
                ratingAfter: r.ratingAfter,
                ratingDelta: r.ratingDelta,
                oldRating: r.ratingBefore,
                newRating: r.ratingAfter,
                delta: r.ratingDelta,
                createdAt: r.createdAt,
            }));

            return {
                practiceSolvedProblemIds: practiceData.practiceSolvedProblemIds,
                practiceSolvedCount,
                practiceSubmissionCount,
                totalSubmissions,
                ratingHistory: formattedRatingHistories,
                ratingDelta: latestDelta,
                currentStreak: Math.max(currentStreak, (user.wins > 0 ? 1 : 0)),
                longestStreak: Math.max(currentStreak, (user.wins > 0 ? 1 : 0)),
            };
        } catch {
            return {
                practiceSolvedProblemIds: [],
                practiceSolvedCount: 0,
                practiceSubmissionCount: 0,
                totalSubmissions: user.totalSubmissions || 0,
                ratingHistory: [],
                ratingDelta: 0,
                currentStreak: 0,
                longestStreak: 0,
            };
        }
    }

    async syncUser(payload: SyncUserPayload) {
        const userId = payload.id || payload.uid;
        const email = payload.email || `${userId}@algofight.local`;
        const cleanEmail = email.trim().toLowerCase();
        const parsedName = parseInstitutionalName(payload.displayName || payload.username, cleanEmail);

        let username = payload.username;
        if (!username || parseInstitutionalName(username).hasEnrollmentPrefix) {
            username = parsedName.cleanUsernameBase || payload.displayName || cleanEmail.split("@")[0];
        }

        let userType = payload.userType || "INDIVIDUAL";
        let institutionName = payload.institutionName;
        let institutionId = payload.institutionId;
        let institutionDomain = payload.institutionDomain;
        let department = payload.department;
        let branch = payload.branch;
        let admissionYear = payload.admissionYear;
        let enrollmentNumber = payload.enrollmentNumber ? payload.enrollmentNumber.toUpperCase() : (parsedName.enrollmentNumber ? parsedName.enrollmentNumber.toUpperCase() : undefined);
        let studentIdentityMetadata = payload.studentIdentityMetadata;

        const isFacultyEmail = cleanEmail.endsWith("@mitsgwalior.in") ||
                               cleanEmail.endsWith(".mitsgwalior.in") ||
                               cleanEmail.includes("mitsgwalior.in");

        if (isFacultyEmail) {
            userType = "FACULTY";
            institutionName = institutionName || "Madhav Institute of Technology & Science";
            institutionId = institutionId || "mits-gwalior";
            institutionDomain = institutionDomain || "mitsgwalior.in";
            department = department || payload.department || "School of Computer Science & Engineering";
        }

        // Unified automatic institutional identity pipeline
        // If not already resolved and not a faculty email, check if verified email matches an institutional domain (e.g. mitsgwl.ac.in)
        if (!isFacultyEmail && !institutionId && email.includes("@")) {
            try {
                const resolution = defaultStudentIdentityService.resolveFromEmail(email);
                if (resolution.isInstitutional) {
                    userType = "STUDENT";
                    institutionName = resolution.institute.name;
                    institutionId = resolution.institute.id;
                    institutionDomain = resolution.institute.domain;
                    department = resolution.identity.department || resolution.identity.branchName;
                    branch = resolution.identity.branch;
                    admissionYear = resolution.identity.admissionYear;
                    enrollmentNumber = enrollmentNumber || (resolution.identity.enrollmentNumber ? resolution.identity.enrollmentNumber.toUpperCase() : undefined);
                    studentIdentityMetadata = resolution.identity.instituteSpecificIdentifiers;
                }
            } catch {
                // If institutional email parsing fails, fallback to normal account flow without crashing
            }
        }

        if (payload.school || payload.designation || payload.photoURL) {
            studentIdentityMetadata = {
                ...(typeof studentIdentityMetadata === 'object' && studentIdentityMetadata !== null ? studentIdentityMetadata : {}),
                ...(payload.school ? { school: payload.school.trim() } : {}),
                ...(payload.designation ? { designation: payload.designation.trim() } : {}),
                ...(department ? { department: department.trim() } : {}),
                ...(payload.photoURL ? { photoURL: payload.photoURL } : {}),
            };
        }

        const user = await this.userRepository.upsertUser({
            id: userId,
            email: email,
            username,
            githubUrl: payload.githubUrl,
            linkedinUrl: payload.linkedinUrl,
            userType,
            institutionName: institutionName || null,
            institutionId: institutionId || null,
            institutionDomain: institutionDomain || null,
            department: department || null,
            school: payload.school || null,
            designation: payload.designation || null,
            branch: branch || null,
            admissionYear: admissionYear || null,
            enrollmentNumber: enrollmentNumber || null,
            studentIdentityMetadata: studentIdentityMetadata || null,
        });

        // Compute dynamic academic profile on the fly (never permanently stored)
        let academicProfile = null;
        if (user.admissionYear) {
            academicProfile = defaultStudentIdentityService.calculateDynamicProfile(
                user.institutionId || "mits-gwalior",
                user.admissionYear
            );
        }

        const metrics = await this.enrichUserMetrics(user);
        const syncMeta = (user.studentIdentityMetadata as any) || {};
        return {
            ...user,
            enrollmentNumber: user.enrollmentNumber ? user.enrollmentNumber.toUpperCase() : null,
            school: user.school || syncMeta.school || null,
            designation: user.designation || syncMeta.designation || (user.userType === "FACULTY" ? "Faculty Educator" : null),
            photoURL: (user as any).photoURL || syncMeta.photoURL || payload.photoURL || null,
            academicProfile,
            matchesWon: user.wins,
            matchesPlayed: user.wins + user.losses,
            lossCount: user.losses,
            ...metrics,
        };
    }

    async updateFacultyProfile(userId: string, data: { school: string; department?: string; designation: string; institutionName?: string }) {
        const user = await this.userRepository.getUserById(userId);
        if (!user) {
            throw { statusCode: 404, message: "Faculty user not found." };
        }

        const existingMeta = (user.studentIdentityMetadata as any) || {};
        const cleanSchool = data.school ? data.school.trim() : existingMeta.school || "";
        const cleanDept = data.department !== undefined ? (data.department ? data.department.trim() : null) : (existingMeta.department || user.department || null);
        const cleanDesignation = data.designation ? data.designation.trim() : existingMeta.designation || "Faculty Educator";

        const updatedMeta = {
            ...existingMeta,
            school: cleanSchool,
            department: cleanDept,
            designation: cleanDesignation,
        };

        const updated = await this.userRepository.upsertUser({
            id: user.id,
            email: user.email,
            username: user.username,
            userType: "FACULTY",
            institutionName: data.institutionName || user.institutionName || "Madhav Institute of Technology & Science",
            department: cleanDept || cleanSchool,
            school: cleanSchool,
            designation: cleanDesignation,
            studentIdentityMetadata: updatedMeta,
        });

        return {
            ...updated,
            school: cleanSchool,
            department: cleanDept,
            designation: cleanDesignation,
        };
    }

    async getUserById(id: string, authUser?: any) {
        let user = await this.userRepository.getUserById(id);
        if (!user && authUser?.email) {
            user = await this.userRepository.getUserById(authUser.email);
        }
        if (!user && authUser?.id) {
            user = await this.userRepository.getUserById(authUser.id);
        }
        if (!user) return null;

        // Dynamically compute current academic status if institutional identity exists
        let academicProfile = null;
        if (user.admissionYear) {
            academicProfile = defaultStudentIdentityService.calculateDynamicProfile(
                user.institutionId || "mits-gwalior",
                user.admissionYear
            );
        }

        // Enrich institutional identity fields from email if available
        if (user.email && user.email.includes("@")) {
            try {
                const resolution = defaultStudentIdentityService.resolveFromEmail(user.email);
                if (resolution.isInstitutional) {
                    user.institutionName = user.institutionName || resolution.institute.name;
                    user.institutionId = user.institutionId || resolution.institute.id;
                    user.institutionDomain = user.institutionDomain || resolution.institute.domain;
                    user.department = user.department || resolution.identity.department || resolution.identity.branchName;
                    user.branch = user.branch || resolution.identity.branch;
                    user.admissionYear = user.admissionYear || resolution.identity.admissionYear;
                    user.enrollmentNumber = user.enrollmentNumber ? user.enrollmentNumber.toUpperCase() : (resolution.identity.enrollmentNumber ? resolution.identity.enrollmentNumber.toUpperCase() : null);
                    if (!academicProfile) {
                        academicProfile = resolution.academicProfile || defaultStudentIdentityService.calculateDynamicProfile(
                            resolution.institute.id || "mits-gwalior",
                            resolution.identity.admissionYear
                        );
                    }
                }
            } catch {
                // Non-institutional
            }
        }

        const metrics = await this.enrichUserMetrics(user);
        const userMeta = (user.studentIdentityMetadata as any) || {};
        return {
            ...user,
            enrollmentNumber: user.enrollmentNumber ? user.enrollmentNumber.toUpperCase() : null,
            school: user.school || userMeta.school || null,
            designation: user.designation || userMeta.designation || (user.userType === "FACULTY" ? "Faculty Educator" : null),
            photoURL: (user as any).photoURL || userMeta.photoURL || null,
            academicProfile,
            matchesWon: user.wins,
            matchesPlayed: user.wins + user.losses,
            lossCount: user.losses,
            ...metrics,
        };
    }

    async getAvailablePlayers(excludeUserId?: string, limit?: number, search?: string) {
        const users = await this.userRepository.getAvailablePlayers(excludeUserId, limit, search);
        return users.map((u) => {
            const matchesPlayed = u.wins + u.losses;
            const winRate = matchesPlayed > 0 ? Math.round((u.wins / matchesPlayed) * 100) : 0;
            const userMeta = (u.studentIdentityMetadata as any) || {};
            return {
                id: u.id,
                username: u.username,
                email: u.email,
                platformCode: u.platformCode,
                userType: u.userType,
                institutionName: u.institutionName,
                department: u.department,
                enrollmentNumber: u.enrollmentNumber ? u.enrollmentNumber.toUpperCase() : null,
                rating: u.rating,
                wins: u.wins,
                losses: u.losses,
                matchesWon: u.wins,
                matchesPlayed,
                winRate,
                photoURL: (u as any).photoURL || userMeta.photoURL || null,
                status: "OFFLINE",
                createdAt: u.createdAt,
            };
        });
    }

    async getLeaderboard() {
        const users = await this.userRepository.getTopUsers(50);
        return users.map((u, index) => {
            const userMeta = (u.studentIdentityMetadata as any) || {};
            return {
                rank: index + 1,
                user: u.username,
                score: u.rating,
                wins: u.wins,
                losses: u.losses,
                photoURL: (u as any).photoURL || userMeta.photoURL || null,
                trend: "same",
            };
        });
    }

    async getPlatformStats() {
        try {
            const count = await this.userRepository.countUsers();
            return {
                totalCoders: count,
                displayCount: count >= 100 ? `${count}+` : String(count),
            };
        } catch {
            return {
                totalCoders: 100,
                displayCount: "100+",
            };
        }
    }
}
