import pino from "pino";
import pinoPretty from "pino-pretty";
import { Writable } from "node:stream";

const TELEMETRY_URL =
    process.env.TELEMETRY_URL || "http://localhost:8000";

export type LogListener = (logObj: any) => void;
const listeners = new Set<LogListener>();

export function registerLogListener(listener: LogListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

// In-memory stream dispatching to registered listeners
const memoryDispatchStream = new Writable({
    write(chunk, _encoding, callback) {
        try {
            const raw = chunk.toString();
            const logObj = JSON.parse(raw);
            for (const listener of listeners) {
                try {
                    listener(logObj);
                } catch {
                    // Safe isolation
                }
            }
        } catch {
            // Non-JSON or parse error
        }
        callback();
    },
});

// Standard Node.js Writable Stream that dispatches logs to the Linux server
const telemetryStream = new Writable({
    write(chunk, _encoding, callback) {
        try {
            const logJsonString = chunk.toString();
            fetch(`${TELEMETRY_URL}/api/v1/telemetry/logs`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: logJsonString,
            }).catch(() => {
                // Silently ignore if telemetry server is restarting
            });
        } catch {
            // Ignore parse/fetch errors
        }
        callback();
    },
});

const prettyStream = pinoPretty({
    colorize: true,
    translateTime: "yyyy-mm-dd HH:MM:ss",
    ignore: "pid,hostname",
    singleLine: false,
    messageFormat: "[{service}] {msg}",
});

export const logger = pino(
    {
        level: process.env.LOG_LEVEL || "info",
        base: {
            service: "algofight",
        },
        redact: [
            "password",
            "token",
            "authorization",
        ],
        timestamp: pino.stdTimeFunctions.isoTime,
    },
    pino.multistream([
        { stream: prettyStream },
        { stream: telemetryStream },
        { stream: memoryDispatchStream },
    ])
);

export * from "./logger-factory";
export * from "./constants/logger.constants";
export type * from "./types/log-metadata.type";
