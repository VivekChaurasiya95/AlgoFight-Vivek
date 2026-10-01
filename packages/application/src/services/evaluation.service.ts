import { EvaluationResult, EvaluationServiceContract, SubmissionPayload } from "@algofight/types";
import { ExecutionPipeline, PipelineEventCallback } from "../judge/pipeline/execution-pipeline";
import { ExecuteRequest } from "../judge/models/execute-request";

export class EvaluationService implements EvaluationServiceContract {
    private pipeline = new ExecutionPipeline();

    async evaluateSubmission(
        payload: SubmissionPayload, 
        onProgress?: PipelineEventCallback, 
        mode: "SAMPLE" | "SUBMIT" = "SUBMIT"
    ): Promise<EvaluationResult> {
        
        const rawMem = payload.memoryLimitBytes || 256 * 1024 * 1024;
        const memoryLimitBytes = rawMem > 0 && rawMem < 10000 ? rawMem * 1024 * 1024 : rawMem;

        const request: ExecuteRequest = {
            submissionId: payload.submissionId,
            language: payload.language,
            code: payload.code,
            testCases: payload.testCases,
            timeLimitMs: payload.timeLimitMs || 2000,
            memoryLimitBytes,
            mode,
            targetRuntimeUrl: (payload as any).targetRuntimeUrl,
        };

        return await this.pipeline.execute(request, onProgress);
    }
}

