import { ErrorType, StructuredError, CodeContext } from "@algofight/types";

export class JavaScriptDiagnosticParser {
    public static parse(
        rawOutput: string,
        userCode: string,
        lineOffset: number
    ): StructuredError {
        const userLines = userCode.split("\n");
        const totalUserLines = userLines.length;

        // Example Node.js SyntaxError:
        // /app/main.js:12
        // cout << "Hello"
        //      ^^
        // SyntaxError: Unexpected token '<<'

        // Example Stack Trace:
        // ReferenceError: x is not defined
        //     at main (/app/main.js:12:5)

        let line: number | null = null;
        let column: number | null = null;

        // Match filename:line:col or filename:line
        const fileLineMatches = [...rawOutput.matchAll(/(?:main\.js|main\.ts|index\.js|app\.js):(\d+)(?::(\d+))?/g)];
        if (fileLineMatches.length > 0) {
            const firstMatch = fileLineMatches[0];
            const repLine = parseInt(firstMatch[1], 10);
            const adj = repLine - lineOffset;
            if (adj >= 1 && adj <= totalUserLines) {
                line = adj;
                if (firstMatch[2]) column = parseInt(firstMatch[2], 10);
            }
        }

        // Extract Exception line (e.g. ReferenceError: x is not defined)
        const lines = rawOutput.trim().split("\n");
        let excLine = lines.find((l) => l.includes("Error:")) || lines[0] || "Error: JavaScript Exception";

        const colonIndex = excLine.indexOf(":");
        const excName = colonIndex !== -1 ? excLine.substring(0, colonIndex).trim() : "Error";
        const excMsg = colonIndex !== -1 ? excLine.substring(colonIndex + 1).trim() : excLine.trim();

        const isSyntax = excName === "SyntaxError";
        const errorType = isSyntax ? ErrorType.SYNTAX_ERROR : ErrorType.RUNTIME_ERROR;

        const codeLine = line ? userLines[line - 1] : null;

        let codeContext: CodeContext | null = null;
        if (line) {
            const start = Math.max(1, line - 2);
            const end = Math.min(totalUserLines, line + 2);
            const ctxLines = [];
            for (let l = start; l <= end; l++) {
                ctxLines.push({
                    line: l,
                    content: userLines[l - 1],
                    isErrorLine: l === line,
                });
            }
            codeContext = {
                lines: ctxLines,
                highlightColumn: column,
            };
        }

        const { explanation, suggestion } = this.categorizeJsError(excName, excMsg);

        return {
            type: errorType,
            subtype: excName,
            message: excMsg || excName,
            line,
            column,
            codeLine: codeLine || undefined,
            codeContext,
            rawMessage: rawOutput,
            explanation,
            suggestion,
        };
    }

    private static categorizeJsError(
        excName: string,
        excMsg: string
    ): { explanation: string; suggestion: string } {
        switch (excName) {
            case "SyntaxError":
                return {
                    explanation: "JavaScript syntax error encountered during parsing.",
                    suggestion: "Check for missing brackets, parentheses, semicolons, or invalid tokens.",
                };
            case "ReferenceError":
                return {
                    explanation: "An attempt was made to access a variable that is not defined.",
                    suggestion: "Declare the variable using let/const/var or check variable scope.",
                };
            case "TypeError":
                return {
                    explanation: "An operation was performed on a value of incompatible type (e.g. calling undefined as a function).",
                    suggestion: "Verify object properties and function declarations before invoking.",
                };
            case "RangeError":
                return {
                    explanation: "A numeric value is outside its valid range or call stack exceeded limits.",
                    suggestion: "Check array allocation lengths and recursion termination.",
                };
            default:
                return {
                    explanation: `${excName}: ${excMsg || "Runtime error encountered."}`,
                    suggestion: "Review stack trace and offending statement.",
                };
        }
    }
}
