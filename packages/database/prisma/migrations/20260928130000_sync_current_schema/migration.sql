-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('STUDENT', 'FACULTY', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "Verdict" AS ENUM ('ACCEPTED', 'WRONG_ANSWER', 'TIME_LIMIT_EXCEEDED', 'MEMORY_LIMIT_EXCEEDED', 'OUTPUT_LIMIT_EXCEEDED', 'COMPILATION_ERROR', 'RUNTIME_ERROR', 'INTERNAL_ERROR', 'SYSTEM_ERROR');

-- AlterEnum
ALTER TYPE "BattleRoomStatus" ADD VALUE 'CANCELLED';

-- AlterEnum
BEGIN;
CREATE TYPE "SubmissionStatus_new" AS ENUM ('CREATED', 'QUEUED', 'COMPILING', 'RUNNING', 'EVALUATING', 'FINALIZED');
ALTER TABLE "public"."Submission" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Submission" ALTER COLUMN "status" TYPE "SubmissionStatus_new" USING ("status"::text::"SubmissionStatus_new");
ALTER TYPE "SubmissionStatus" RENAME TO "SubmissionStatus_old";
ALTER TYPE "SubmissionStatus_new" RENAME TO "SubmissionStatus";
DROP TYPE "public"."SubmissionStatus_old";
ALTER TABLE "Submission" ALTER COLUMN "status" SET DEFAULT 'CREATED';
COMMIT;

-- AlterTable
ALTER TABLE "BattleParticipant" ADD COLUMN     "rank" INTEGER,
ADD COLUMN     "solvedAt" TIMESTAMP(3),
ADD COLUMN     "solvedProblemIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "BattleRoom" ADD COLUMN     "difficulty" TEXT NOT NULL DEFAULT 'Mix',
ADD COLUMN     "endedAt" TIMESTAMP(3),
ADD COLUMN     "isFriendly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "questionCount" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "roomCode" TEXT NOT NULL,
ADD COLUMN     "startedAt" TIMESTAMP(3),
ADD COLUMN     "timeLimitMinutes" INTEGER NOT NULL DEFAULT 15,
ALTER COLUMN "maxPlayers" SET DEFAULT 2;

-- AlterTable
ALTER TABLE "Problem" ADD COLUMN     "category" TEXT,
ADD COLUMN     "creatorId" TEXT,
ADD COLUMN     "creatorRole" TEXT,
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "source" TEXT,
ADD COLUMN     "sourceUrl" TEXT,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "compileTime" INTEGER,
ADD COLUMN     "cpuUsage" DOUBLE PRECISION,
ADD COLUMN     "memoryUsage" DOUBLE PRECISION,
ADD COLUMN     "roomId" TEXT,
ADD COLUMN     "verdict" "Verdict";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "googleSub" TEXT,
    "passwordHash" TEXT,
    "userType" "UserType" NOT NULL DEFAULT 'INDIVIDUAL',
    "primaryEmail" TEXT,
    "secondaryEmail" TEXT,
    "institutionName" TEXT,
    "department" TEXT,
    "batchYear" TEXT,
    "platformCode" TEXT,
    "rating" INTEGER NOT NULL DEFAULT 0,
    "ewma" DOUBLE PRECISION NOT NULL DEFAULT 0.50,
    "highestRating" INTEGER NOT NULL DEFAULT 0,
    "highestRank" TEXT NOT NULL DEFAULT 'ROOKIE',
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "githubUrl" TEXT,
    "linkedinUrl" TEXT,
    "institutionId" TEXT,
    "institutionDomain" TEXT,
    "admissionYear" INTEGER,
    "branch" TEXT,
    "enrollmentNumber" TEXT,
    "studentIdentityMetadata" JSONB,
    "totalSubmissions" INTEGER NOT NULL DEFAULT 0,
    "totalExecutions" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RatingHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "battleRoomId" TEXT,
    "ratingBefore" INTEGER NOT NULL,
    "ratingAfter" INTEGER NOT NULL,
    "ratingDelta" INTEGER NOT NULL,
    "performanceScore" DOUBLE PRECISION NOT NULL,
    "ewmaBefore" DOUBLE PRECISION NOT NULL,
    "ewmaAfter" DOUBLE PRECISION NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RatingHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemBroadcast" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'INFO',
    "flashBanner" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL DEFAULT 'SuperAdmin',
    "revokedAt" TIMESTAMP(3),
    "content" JSONB,
    "action" JSONB,

    CONSTRAINT "SystemBroadcast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quiz" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "creatorId" TEXT NOT NULL,
    "institutionName" TEXT,
    "department" TEXT,
    "batchYear" TEXT,
    "durationMinutes" INTEGER NOT NULL DEFAULT 30,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "problemIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_BattleRoomToProblem" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_BattleRoomToProblem_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleSub_key" ON "User"("googleSub");

-- CreateIndex
CREATE UNIQUE INDEX "User_platformCode_key" ON "User"("platformCode");

-- CreateIndex
CREATE INDEX "User_institutionDomain_idx" ON "User"("institutionDomain");

-- CreateIndex
CREATE INDEX "User_institutionId_idx" ON "User"("institutionId");

-- CreateIndex
CREATE INDEX "RatingHistory_userId_idx" ON "RatingHistory"("userId");

-- CreateIndex
CREATE INDEX "RatingHistory_battleRoomId_idx" ON "RatingHistory"("battleRoomId");

-- CreateIndex
CREATE INDEX "RatingHistory_createdAt_idx" ON "RatingHistory"("createdAt");

-- CreateIndex
CREATE INDEX "SystemBroadcast_expiresAt_idx" ON "SystemBroadcast"("expiresAt");

-- CreateIndex
CREATE INDEX "SystemBroadcast_revokedAt_idx" ON "SystemBroadcast"("revokedAt");

-- CreateIndex
CREATE INDEX "SystemBroadcast_createdAt_idx" ON "SystemBroadcast"("createdAt");

-- CreateIndex
CREATE INDEX "Quiz_creatorId_idx" ON "Quiz"("creatorId");

-- CreateIndex
CREATE INDEX "Quiz_department_idx" ON "Quiz"("department");

-- CreateIndex
CREATE INDEX "Quiz_status_idx" ON "Quiz"("status");

-- CreateIndex
CREATE INDEX "_BattleRoomToProblem_B_index" ON "_BattleRoomToProblem"("B");

-- CreateIndex
CREATE UNIQUE INDEX "BattleRoom_roomCode_key" ON "BattleRoom"("roomCode");

-- CreateIndex
CREATE INDEX "BattleRoom_roomCode_idx" ON "BattleRoom"("roomCode");

-- CreateIndex
CREATE UNIQUE INDEX "Problem_externalId_key" ON "Problem"("externalId");

-- CreateIndex
CREATE INDEX "Problem_source_idx" ON "Problem"("source");

-- CreateIndex
CREATE INDEX "Submission_userId_idx" ON "Submission"("userId");

-- CreateIndex
CREATE INDEX "Submission_roomId_idx" ON "Submission"("roomId");

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "BattleRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleRoom" ADD CONSTRAINT "BattleRoom_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleParticipant" ADD CONSTRAINT "BattleParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RatingHistory" ADD CONSTRAINT "RatingHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RatingHistory" ADD CONSTRAINT "RatingHistory_battleRoomId_fkey" FOREIGN KEY ("battleRoomId") REFERENCES "BattleRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BattleRoomToProblem" ADD CONSTRAINT "_BattleRoomToProblem_A_fkey" FOREIGN KEY ("A") REFERENCES "BattleRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BattleRoomToProblem" ADD CONSTRAINT "_BattleRoomToProblem_B_fkey" FOREIGN KEY ("B") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

