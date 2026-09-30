import { z } from "zod";

export const submissionSchema = z.object({
    userId: z.string().uuid().optional(),
    problemId: z.string().min(1, "problemId is required."),
    roomId: z.string().optional(),
    language: z.string().min(1, "Language is required."),
    code: z.string().min(1, "Code is required.").max(524288,
        "Code exceeds maximum allowed size of 512KB"),
    targetRuntimeUrl: z.string().optional(),
    runtimePort: z.number().int().min(1000).max(65535).optional(),
});

export type SubmissionInput = z.infer<typeof submissionSchema>;

export const testRunSchema = z.object({
    language: z.string().min(1, "language is required"),
    code: z.string().min(1, "code is required").max(524288, "Code exceeds maximum allowed size of 512KB"),
    testCases: z.array(z.object({
        id: z.string(),
        input: z.string().max(131072, "Input exceeds 128KB"),
        expectedOutput: z.string().max(131072, "Expected output exceeds 128KB").default("")
    })).min(1, "At least 1 testcase is required").max(50, "Maximum 50 testcases allowed per test run"),
    targetRuntimeUrl: z.string().optional(),
    runtimePort: z.number().int().min(1000).max(65535).optional(),
});

export type TestRunInput = z.infer<typeof testRunSchema>;

export const practiceEvaluateSchema = z.object({
    problemId: z.string().min(1, "problemId is required"),
    code: z.string().min(1, "code is required").max(524288, "Code exceeds maximum allowed size of 512KB"),
    language: z.string().min(1, "language is required"),
    mode: z.enum(["test", "submit"]).default("test"),
    targetRuntimeUrl: z.string().optional(),
    runtimePort: z.number().int().min(1000).max(65535).optional(),
});

export type PracticeEvaluateInput = z.infer<typeof practiceEvaluateSchema>;

export const executeDirectSchema = z.object({
    language: z.string().min(1, "Language is required"),
    code: z.string().min(1, "Code is required").max(524288, "Code exceeds maximum allowed size of 512KB"),
    stdin: z.string().max(131072, "Stdin exceeds 128KB").optional().default(""),
    targetRuntimeUrl: z.string().optional(),
    runtimePort: z.number().int().min(1000).max(65535).optional(),
    timeLimitMs: z.number().int().min(200).max(30000).optional().default(3000),
    memoryLimitBytes: z.number().int().optional().default(256 * 1024 * 1024),
});

export type ExecuteDirectInput = z.infer<typeof executeDirectSchema>;

