import { ErrorType, StructuredError, CodeContext } from "@algofight/types";

export class JavaDiagnosticParser {
    public static parseCompilation(
        rawOutput: string,
        userCode: string,
        lineOffset: number
    ): StructuredError {
        const userLines = userCode.split("\n");
        const totalUserLines = userLines.length;

        // Example javac error:
        // Main.java:12: error: ';' expected
        //         cout << "Hello"
        //                        ^
        const javacRegex = /(?:([a-zA-Z0-9_.\-\\/]+\.java):(\d+):\s+(error|warning):\s+(.*))/g;

        const matches: Array<{
            file: string;
            reportedLine: number;
            severity: string;
            message: string;
        }> = [];

        let match;
        while ((match = javacRegex.exec(rawOutput)) !== null) {
            matches.push({
                file: match[1],
                reportedLine: parseInt(match[2], 10),
                severity: match[3],
                message: match[4].trim(),
            });
        }

        if (matches.length === 0) {
            return {
                type: ErrorType.COMPILATION_ERROR,
                message: rawOutput.split("\n")[0] || "Java Compilation error",
                line: null,
                column: null,
                rawMessage: rawOutput,
                explanation: "Java compiler failed to build the code.",
                suggestion: "Review the raw javac compiler output.",
            };
        }

        const primary = matches[0];
        const adjustedLine = primary.reportedLine - lineOffset;
        const isLineValid = adjustedLine >= 1 && adjustedLine <= totalUserLines;
        const line = isLineValid ? adjustedLine : null;
        const codeLine = line ? userLines[line - 1] : null;

        // Extract column caret if available in next lines
        let column: number | null = null;
        const caretMatch = rawOutput.match(/\n(\s+)\^\s*\n/);
        if (caretMatch && caretMatch[1]) {
            column = caretMatch[1].length;
        }

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

        const { explanation, suggestion } = this.categorizeJavacError(primary.message);

        return {
            type: ErrorType.COMPILATION_ERROR,
            message: primary.message,
            line,
            column,
            file: primary.file,
            codeLine: codeLine || undefined,
            codeContext,
            rawMessage: rawOutput,
            explanation,
            suggestion,
        };
    }

    public static parseRuntime(
        stderr: string,
        userCode: string,
        lineOffset: number
    ): StructuredError {
        const userLines = userCode.split("\n");
        const totalUserLines = userLines.length;

        // Example Java Runtime exception:
        // Exception in thread "main" java.lang.NullPointerException
        //         at Solution.solution(Main.java:12)
        //         at Main.main(Main.java:30)

        const excMatch = stderr.match(/Exception in thread "[^"]+"\s+([a-zA-Z0-9_.$]+)(?::\s+(.*))?/);
        const excClass = excMatch ? excMatch[1] : "java.lang.RuntimeException";
        const excMsg = excMatch && excMatch[2] ? excMatch[2].trim() : excClass;

        const excSimpleName = excClass.split(".").pop() || "RuntimeException";

        let line: number | null = null;
        const traceMatches = [...stderr.matchAll(/\((?:[a-zA-Z0-9_.$]+\.java):(\d+)\)/g)];
        if (traceMatches.length > 0) {
            for (const tm of traceMatches) {
                const repLine = parseInt(tm[1], 10);
                const adj = repLine - lineOffset;
                if (adj >= 1 && adj <= totalUserLines) {
                    line = adj;
                    break;
                }
            }
        }

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
            codeContext = { lines: ctxLines };
        }

        const { explanation, suggestion } = this.categorizeJavaRuntimeException(excSimpleName, excMsg);

        return {
            type: ErrorType.RUNTIME_ERROR,
            subtype: excSimpleName,
            message: excMsg,
            line,
            column: null,
            codeLine: codeLine || undefined,
            codeContext,
            rawMessage: stderr,
            explanation,
            suggestion,
        };
    }

    private static categorizeJavacError(msg: string): { explanation: string; suggestion: string } {
        const lower = msg.toLowerCase();
        if (lower.includes("';' expected")) {
            return {
                explanation: "A semicolon ';' is missing at the end of the statement.",
                suggestion: "Add a semicolon ';' to the end of the highlighted line.",
            };
        }
        if (lower.includes("cannot find symbol")) {
            return {
                explanation: "The Java compiler cannot resolve a variable, class, or method name.",
                suggestion: "Verify spelling, imports, and ensure the symbol is declared.",
            };
        }
        return {
            explanation: "Java compilation error.",
            suggestion: "Review javac diagnostic message.",
        };
    }

    private static categorizeJavaRuntimeException(excName: string, msg: string): { explanation: string; suggestion: string } {
        switch (excName) {
            case "NullPointerException":
                return {
                    explanation: "Attempted to access an object reference that is null.",
                    suggestion: "Initialize variables before accessing methods or fields.",
                };
            case "ArrayIndexOutOfBoundsException":
                return {
                    explanation: "Accessed an array index that is negative or greater than or equal to array size.",
                    suggestion: "Check array bounds before indexing.",
                };
            case "ArithmeticException":
                return {
                    explanation: "Arithmetic condition error, e.g. integer division by zero.",
                    suggestion: "Check divisors to prevent dividing by zero.",
                };
            case "StackOverflowError":
                return {
                    explanation: "Stack overflow caused by deep or un-terminated recursion.",
                    suggestion: "Ensure recursive calls have a valid base case.",
                };
            default:
                return {
                    explanation: `${excName}: ${msg || "Java exception occurred."}`,
                    suggestion: "Check stack trace for details.",
                };
        }
    }
}
