import { FastifyInstance } from "fastify";

import {
    AppError,
    InfrastructureError,
    ValidationError,
    ErrorCode,
} from "@algofight/error-handling";
import { logger } from "@algofight/logger";
import { auditService, AuditCategory } from "../services/audit.service";
import { extractClientIp } from "../utils/ip.util";

export async function registerErrorHandler(
    app: FastifyInstance,
) {
    app.setErrorHandler(
        async (
            error,
            request,
            reply,
        ) => {

            let validationMsg: string | undefined;
            if ((error as any)?.name === "ZodError" && Array.isArray((error as any)?.issues)) {
                validationMsg = (error as any).issues
                    .map((issue: any) => `${issue.path?.join(".") || "field"}: ${issue.message}`)
                    .join("; ");
            }

            const appError =
                error instanceof AppError
                    ? error
                    : validationMsg
                        ? new ValidationError(validationMsg, ErrorCode.VALIDATION_ERROR)
                        : error instanceof Error && error.message
                            ? new ValidationError(error.message, ErrorCode.VALIDATION_ERROR)
                            : new InfrastructureError(
                                "Unexpected internal error",
                                ErrorCode.UNKNOWN_ERROR,
                            );

            const clientIp = extractClientIp(request);
            const user = (request as any).user || (request as any).trustContext;
            const actor = user?.username || clientIp || "Client";

            try {
                let errCategory: AuditCategory = "SYSTEM";
                if (appError.statusCode === 429 || appError.statusCode === 401 || appError.statusCode === 403) {
                    errCategory = "SECURITY";
                } else if (request.url.includes("/auth") || request.url.includes("/users")) {
                    errCategory = "AUTH";
                } else if (request.url.includes("/battle") || request.url.includes("/rooms")) {
                    errCategory = "BATTLE";
                } else if (request.url.includes("/submission") || request.url.includes("/execute")) {
                    errCategory = "SUBMISSION";
                }

                auditService.recordEvent({
                    category: errCategory,
                    severity: appError.statusCode >= 500 ? "ERROR" : "WARN",
                    action: `API_ERROR_${appError.code || "REQUEST_FAILED"}`,
                    actor,
                    ip: clientIp,
                    method: request.method,
                    details: `[${request.method} ${request.url}] ${appError.message}`,
                    metadata: {
                        code: appError.code,
                        statusCode: appError.statusCode,
                        layer: appError.layer,
                        stack: error instanceof Error ? error.stack : undefined,
                        url: request.url,
                    },
                });
                (request as any)._auditLogged = true;
            } catch {}

            const logMsg = validationMsg || (error instanceof Error ? error.message : String(error));
            if (appError.statusCode < 500) {
                logger.warn(
                    {
                        errorMessage: logMsg,
                        code: appError.code,
                        statusCode: appError.statusCode,
                        method: request.method,
                        url: request.url,
                    },
                    "Client request validation/precondition warning",
                );
            } else {
                logger.error(
                    {
                        err: error,
                        errorMessage: logMsg,
                        stack: error instanceof Error ? error.stack : undefined,
                        method: request.method,
                        url: request.url,
                    },
                    "Request failed",
                );
            }
            return reply
                .status(
                    appError.statusCode,
                )
                .send({
                    success: false,

                    code:
                        appError.code,

                    message:
                        appError.message,

                    layer:
                        appError.layer,
                });
        },
    );
}