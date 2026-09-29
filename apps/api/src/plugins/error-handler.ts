import { FastifyInstance } from "fastify";

import {
    AppError,
    InfrastructureError,
    ValidationError,
    ErrorCode,
} from "@algofight/error-handling";
import { logger } from "@algofight/logger";
import { auditService } from "../services/audit.service";
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

            const appError =
                error instanceof AppError
                    ? error
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
                auditService.recordEvent({
                    category: appError.statusCode === 429 || appError.statusCode === 401 ? "SECURITY" : "SYSTEM",
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
            } catch {}

            logger.error(
                {
                    err: error,
                    errorMessage: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined,
                    method: request.method,
                    url: request.url,
                },
                "Request failed",
            );
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