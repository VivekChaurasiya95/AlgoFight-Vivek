import { ExecuteRequest, PipelineProgressEvent } from "../models/execute-request";
import { EvaluationResult, TestCaseResult, Verdict } from "@algofight/types";
import { WorkerPool } from "./worker-pool";
import { PistonAdapter } from "../../services/piston.adapter";
import { normalizeOutput } from "../comparators/exact-comparator";

export type PipelineEventCallback = (event: PipelineProgressEvent) => void;

export class ExecutionPipeline {
    private pistonAdapter = new PistonAdapter();

    private getAvailableRuntimeUrls(targetRuntimeUrl?: string): string[] {
        const urls: string[] = [];
        if (targetRuntimeUrl) urls.push(targetRuntimeUrl);
        
        const primary = process.env.PISTON_URL || (process.env.NODE_ENV === "production" ? "http://piston-1:2000" : "http://127.0.0.1:2000");
        if (!urls.includes(primary)) urls.push(primary);

        const backups = (process.env.PISTON_BACKUP_URLS || (process.env.NODE_ENV === "production" ? "http://piston-2:2000" : "http://127.0.0.1:2001"))
            .split(",")
            .map(u => u.trim())
            .filter(Boolean);

        for (const backup of backups) {
            if (!urls.includes(backup)) urls.push(backup);
        }

        return urls;
    }

    async execute(request: ExecuteRequest, onProgress?: PipelineEventCallback): Promise<EvaluationResult> {
        const { submissionId, language, code, testCases, timeLimitMs, memoryLimitBytes, mode, targetRuntimeUrl } = request;
        
        onProgress?.({ submissionId, stage: "PREPARE" });

        if (!testCases || testCases.length === 0) {
            return {
                submissionId,
                verdict: Verdict.SYSTEM_ERROR,
                resourceUsage: { maxMemory: 0, totalTime: 0 }
            };
        }

        const runtimes = this.getAvailableRuntimeUrls(targetRuntimeUrl);
        const isCompiled = ["cpp", "c++", "c", "java", "rust"].includes(language.toLowerCase().trim());
        // Bounded concurrency: 2 for heavy compiled languages to protect CPU, 4 for interpreted scripts
        const concurrency = isCompiled ? 2 : 4;
        const workerPool = new WorkerPool(concurrency);

        // Phase 1: Compile/Canary Run with Test Case 0
        onProgress?.({ submissionId, stage: "COMPILE" });
        
        const firstTestCase = testCases[0];
        const primaryRuntime = runtimes[0];
        let firstExecution;
        try {
            firstExecution = await this.pistonAdapter.executeCode(
                language,
                code,
                firstTestCase.input,
                timeLimitMs,
                memoryLimitBytes,
                primaryRuntime
            );
        } catch (err: any) {
            const errorResult: EvaluationResult = {
                submissionId,
                verdict: Verdict.SYSTEM_ERROR,
                compilation: {
                    success: false,
                    output: "",
                    error: err?.message || "Execution engine failure",
                },
                testCases: [],
                resourceUsage: { maxMemory: 0, totalTime: 0 }
            };
            onProgress?.({ 
                submissionId, 
                stage: "FINISHED", 
                metrics: { passed: 0, total: testCases.length } 
            });
            return errorResult;
        }

        const compilationResult = {
            success: firstExecution.compile.success,
            output: firstExecution.compile.output,
            error: firstExecution.compile.error,
        };

        if (!compilationResult.success) {
            const errorResult: EvaluationResult = {
                submissionId,
                verdict: Verdict.COMPILATION_ERROR,
                compilation: compilationResult,
                testCases: [],
                resourceUsage: { maxMemory: 0, totalTime: 0 }
            };
            onProgress?.({ 
                submissionId, 
                stage: "FINISHED", 
                compilationResult 
            });
            return errorResult;
        }

        onProgress?.({ submissionId, stage: "TEST_STARTED" });

        // Phase 2: Fan-out test cases with multi-node round-robin distribution
        let maxMemory = 0;
        let totalTime = 0;
        let passedCount = 0;
        
        const testCaseResults: TestCaseResult[] = [];
        const executionPromises = testCases.map(async (testCase, index) => {
            return workerPool.add(async () => {
                let execution = firstExecution;
                // Don't re-run the first test case unless it was just compilation
                if (index !== 0) {
                    const assignedRuntime = runtimes[index % runtimes.length];
                    try {
                        execution = await this.pistonAdapter.executeCode(
                            language,
                            code,
                            testCase.input,
                            timeLimitMs,
                            memoryLimitBytes,
                            assignedRuntime
                        );
                    } catch (err: any) {
                        const failedResult: TestCaseResult = {
                            testCaseId: testCase.id,
                            status: Verdict.SYSTEM_ERROR,
                            passed: false,
                            expectedOutput: testCase.expectedOutput,
                            actualOutput: undefined,
                            error: err?.message || "Runtime node unreachable",
                            metrics: {
                                executionTime: 0,
                                memoryUsage: 0,
                                exitCode: -1,
                                signal: null,
                                stdout: undefined,
                                stderr: err?.message,
                            }
                        };
                        return { index, result: failedResult };
                    }
                }

                const { run } = execution;
                let status = Verdict.ACCEPTED;
                let currentError = undefined;
                let passed = false;

                if (run.isTimeout) {
                    status = Verdict.TIME_LIMIT_EXCEEDED;
                    currentError = "Time Limit Exceeded";
                } else if (run.isMemoryLimit) {
                    status = Verdict.MEMORY_LIMIT_EXCEEDED;
                    currentError = "Memory Limit Exceeded";
                } else if (run.isRuntimeError || !run.success) {
                    status = Verdict.RUNTIME_ERROR;
                    currentError = run.stderr || "Runtime Error";
                } else {
                    const actualNorm = normalizeOutput(run.stdout);
                    const expectedNorm = normalizeOutput(testCase.expectedOutput);
                    if (actualNorm === expectedNorm) {
                        passed = true;
                        status = Verdict.ACCEPTED;
                    } else {
                        passed = false;
                        status = Verdict.WRONG_ANSWER;
                        currentError = "Wrong Answer";
                    }
                }

                const result: TestCaseResult = {
                    testCaseId: testCase.id,
                    status,
                    passed,
                    expectedOutput: testCase.expectedOutput,
                    actualOutput: run.stdout,
                    error: currentError,
                    metrics: { 
                        executionTime: run.timeMs || 0, 
                        memoryUsage: run.memoryBytes || 0, 
                        exitCode: run.code, 
                        signal: run.signal, 
                        stdout: run.stdout, 
                        stderr: run.stderr 
                    }
                };

                return { index, result };
            });
        });

        // Fan-in: wait for all to complete but process results as they come in via the Promise map
        const resolvedResults = await Promise.all(executionPromises.map(async p => {
            const res = await p;
            
            // Streaming event per test case completion
            maxMemory = Math.max(maxMemory, res.result.metrics?.memoryUsage || 0);
            totalTime += (res.result.metrics?.executionTime || 0);
            if (res.result.passed) passedCount++;

            onProgress?.({ 
                submissionId, 
                stage: "TEST_COMPLETED", 
                testCaseIndex: res.index,
                testCaseResult: res.result,
                metrics: {
                    passed: passedCount,
                    total: testCases.length
                }
            });

            return res;
        }));

        resolvedResults.sort((a, b) => a.index - b.index);
        resolvedResults.forEach(r => testCaseResults.push(r.result));

        // Deterministic verdict: first failing test case determines the overall verdict
        const firstFailed = testCaseResults.find(r => !r.passed);
        const overallVerdict = firstFailed ? firstFailed.status : Verdict.ACCEPTED;

        const finalResult: EvaluationResult = {
            submissionId,
            verdict: overallVerdict,
            compilation: compilationResult,
            testCases: testCaseResults,
            resourceUsage: { maxMemory, totalTime }
        };

        onProgress?.({ submissionId, stage: "FINISHED", metrics: { passed: passedCount, total: testCases.length } });

        return finalResult;
    }
}
