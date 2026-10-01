import { ErrorType, StructuredError, CodeContext } from "@algofight/types";

export class CppDiagnosticParser {
    public static parseCompilation(
        rawOutput: string,
        userCode: string,
        lineOffset: number
    ): StructuredError {
        const userLines = userCode.split("\n");
        const totalUserLines = userLines.length;

        // Pattern for GCC/Clang: file.cpp:line:col: error/fatal error: message
        const gccRegex = /(?:([a-zA-Z0-9_.\-\\/]+):(\d+):(\d+):\s+(error|fatal error|warning):\s+(.*))/g;

        const matches: Array<{
            file: string;
            reportedLine: number;
            column: number;
            severity: string;
            message: string;
        }> = [];

        let match;
        while ((match = gccRegex.exec(rawOutput)) !== null) {
            matches.push({
                file: match[1],
                reportedLine: parseInt(match[2], 10),
                column: parseInt(match[3], 10),
                severity: match[4],
                message: match[5].trim(),
            });
        }

        if (matches.length === 0) {
            // Fallback if regex did not match standard GCC pattern
            return {
                type: ErrorType.COMPILATION_ERROR,
                message: rawOutput.split("\n")[0] || "Compilation error",
                line: null,
                column: null,
                rawMessage: rawOutput,
                explanation: "The compiler encountered an error while building your code.",
                suggestion: "Review the raw compiler output for details.",
            };
        }

        const primary = matches[0];
        const adjustedLine = primary.reportedLine - lineOffset;
        const isLineValid = adjustedLine >= 1 && adjustedLine <= totalUserLines;
        const errorLineNum = isLineValid ? adjustedLine : null;
        const codeLine = isLineValid ? userLines[errorLineNum! - 1] : null;

        let codeContext: CodeContext | null = null;
        if (isLineValid && errorLineNum) {
            const start = Math.max(1, errorLineNum - 2);
            const end = Math.min(totalUserLines, errorLineNum + 2);
            const lines = [];
            for (let l = start; l <= end; l++) {
                lines.push({
                    line: l,
                    content: userLines[l - 1],
                    isErrorLine: l === errorLineNum,
                });
            }
            codeContext = {
                lines,
                highlightColumn: primary.column,
            };
        }

        const { errorType, explanation, suggestion } = this.categorizeCppError(primary.message, codeLine);

        // Additional errors if multiple exist
        const additionalErrors = matches.slice(1).map((m) => {
            const adj = m.reportedLine - lineOffset;
            const valid = adj >= 1 && adj <= totalUserLines;
            return {
                line: valid ? adj : null,
                message: m.message,
                explanation: "Note: This error may be a cascading consequence of the primary error.",
            };
        });

        return {
            type: errorType,
            message: primary.message,
            line: errorLineNum,
            column: primary.column || null,
            file: primary.file,
            codeLine: codeLine || undefined,
            codeContext,
            rawMessage: rawOutput,
            explanation,
            suggestion,
            additionalErrors: additionalErrors.length > 0 ? additionalErrors : undefined,
        };
    }

    public static parseRuntime(
        stderr: string,
        userCode: string,
        lineOffset: number,
        signal?: string | null
    ): StructuredError {
        const userLines = userCode.split("\n");
        let errorType = ErrorType.RUNTIME_ERROR;
        let subtype = "RUNTIME_EXCEPTION";
        let explanation = "A runtime error occurred during program execution.";
        let suggestion = "Check array bounds, pointer dereferences, and mathematical operations.";

        if (signal === "SIGSEGV" || stderr.includes("Segmentation fault") || stderr.includes("SIGSEGV")) {
            subtype = "SEGMENTATION_FAULT";
            explanation = "The program attempted to access an invalid memory location or unallocated array index.";
            suggestion = "Verify that array indices are strictly within bounds and pointer references are non-null.";
        } else if (signal === "SIGFPE" || stderr.includes("Floating point exception") || stderr.includes("SIGFPE")) {
            subtype = "DIVISION_BY_ZERO";
            explanation = "The program attempted a floating-point or integer division by zero.";
            suggestion = "Ensure divisors are checked and non-zero before performing division or modulo operations.";
        } else if (signal === "SIGABRT" || stderr.includes("Aborted") || stderr.includes("SIGABRT")) {
            subtype = "ABORTED_PROCESS";
            explanation = "The process was aborted due to an internal assertion failure or double memory free.";
            suggestion = "Review dynamic memory allocations and system assertions.";
        }

        // Try extracting line number from GDB / Sanitizer traceback if present
        let line: number | null = null;
        let column: number | null = null;

        const traceMatch = stderr.match(/(?:main\.cpp|main\.c):(\d+)(?::(\d+))?/);
        if (traceMatch) {
            const repLine = parseInt(traceMatch[1], 10);
            const adj = repLine - lineOffset;
            if (adj >= 1 && adj <= userLines.length) {
                line = adj;
                if (traceMatch[2]) column = parseInt(traceMatch[2], 10);
            }
        }

        const codeLine = line ? userLines[line - 1] : null;

        return {
            type: errorType,
            subtype,
            message: stderr.trim() || `Runtime error (${subtype})`,
            line,
            column,
            codeLine: codeLine || undefined,
            rawMessage: stderr,
            explanation: line ? `${explanation} Error reported at line ${line}.` : explanation,
            suggestion,
        };
    }

    private static categorizeCppError(
        msg: string,
        codeLine: string | null
    ): { errorType: ErrorType; explanation: string; suggestion: string } {
        const lower = msg.toLowerCase();

        if (lower.includes("expected ';'") || lower.includes("missing ';'")) {
            return {
                errorType: ErrorType.SYNTAX_ERROR,
                explanation: "A semicolon ';' is missing at the end of a statement.",
                suggestion: "Add a semicolon ';' at the end of the previous statement or highlighted line.",
            };
        }

        if (lower.includes("expected '}'") || lower.includes("expected '{'")) {
            return {
                errorType: ErrorType.SYNTAX_ERROR,
                explanation: "A curly brace balance error was detected.",
                suggestion: "Check that every opening '{' has a matching closing '}'.",
            };
        }

        if (lower.includes("expected ')'") || lower.includes("expected '('")) {
            return {
                errorType: ErrorType.SYNTAX_ERROR,
                explanation: "A parenthesis balance error was detected.",
                suggestion: "Check that all function calls and conditions have matching parentheses.",
            };
        }

        if (lower.includes("was not declared in this scope")) {
            const varMatch = msg.match(/'([^']+)'/);
            const varName = varMatch ? varMatch[1] : "symbol";
            return {
                errorType: ErrorType.COMPILATION_ERROR,
                explanation: `The variable or function '${varName}' is used before declaration or is outside its scope.`,
                suggestion: `Declare '${varName}' before using it or verify spelling and header includes.`,
            };
        }

        if (lower.includes("cannot convert") || lower.includes("conversion from")) {
            return {
                errorType: ErrorType.SEMANTIC_ERROR,
                explanation: "Type mismatch: attempt to convert between incompatible types.",
                suggestion: "Ensure variable types match or perform explicit type casting.",
            };
        }

        if (lower.includes("no such file or directory") || lower.includes("fatal error")) {
            return {
                errorType: ErrorType.COMPILATION_ERROR,
                explanation: "A required header file was not found.",
                suggestion: "Check #include directive names for typos (e.g., <iostream>, <vector>).",
            };
        }

        return {
            errorType: ErrorType.COMPILATION_ERROR,
            explanation: "The compiler reported a syntax or type error.",
            suggestion: "Review the statement on the highlighted line.",
        };
    }
}
