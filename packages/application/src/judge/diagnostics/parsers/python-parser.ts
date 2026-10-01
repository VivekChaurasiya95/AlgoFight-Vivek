import { ErrorType, StructuredError, CodeContext } from "@algofight/types";

export class PythonDiagnosticParser {
    public static parse(
        rawOutput: string,
        userCode: string,
        lineOffset: number
    ): StructuredError {
        const userLines = userCode.split("\n");
        const totalUserLines = userLines.length;

        // Extract Exception name, message, and line from Python Traceback
        // Example:
        // File "main.py", line 8, in <module>
        //   print(arr[10])
        // IndexError: list index out of range

        let line: number | null = null;
        let column: number | null = null;

        const fileLineMatches = [...rawOutput.matchAll(/File\s+"[^"]+",\s+line\s+(\d+)(?:,\s+in\s+([^\n]+))?/g)];
        if (fileLineMatches.length > 0) {
            // Last match in traceback is where the error occurred
            const lastMatch = fileLineMatches[fileLineMatches.length - 1];
            const repLine = parseInt(lastMatch[1], 10);
            const adj = repLine - lineOffset;
            if (adj >= 1 && adj <= totalUserLines) {
                line = adj;
            }
        }

        // SyntaxError column caret parsing
        //   File "main.py", line 4
        //     print("Hello"
        //                 ^
        // SyntaxError: '(' was never closed
        const caretMatch = rawOutput.match(/\n(\s+)\^\s*\n/);
        if (caretMatch && caretMatch[1]) {
            column = caretMatch[1].length;
        }

        // Extract final exception line (e.g., "IndexError: list index out of range")
        const lines = rawOutput.trim().split("\n");
        let excLine = lines[lines.length - 1] || "Error: Execution failed";

        // Check for SyntaxError/IndentationError which might have ^ caret line at end
        for (let i = lines.length - 1; i >= 0; i--) {
            if (lines[i].includes("Error:") || lines[i].includes("Exception:")) {
                excLine = lines[i];
                break;
            }
        }

        const colonIndex = excLine.indexOf(":");
        const excName = colonIndex !== -1 ? excLine.substring(0, colonIndex).trim() : "RuntimeError";
        const excMsg = colonIndex !== -1 ? excLine.substring(colonIndex + 1).trim() : excLine.trim();

        const isSyntax = ["SyntaxError", "IndentationError", "TabError"].includes(excName);
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

        const { explanation, suggestion } = this.categorizePythonError(excName, excMsg, line);

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

    private static categorizePythonError(
        excName: string,
        excMsg: string,
        line: number | null
    ): { explanation: string; suggestion: string } {
        switch (excName) {
            case "SyntaxError":
                return {
                    explanation: "Python encountered invalid syntax that could not be parsed.",
                    suggestion: "Check for unclosed quotes, brackets, parentheses, or missing colons after def/if/for/while.",
                };
            case "IndentationError":
            case "TabError":
                return {
                    explanation: "Inconsistent or incorrect indentation.",
                    suggestion: "Ensure 4 spaces per indentation level and avoid mixing tabs and spaces.",
                };
            case "NameError":
                return {
                    explanation: `A variable or function name is referenced before it has been defined.`,
                    suggestion: "Verify variable name spelling and ensure it is assigned before use.",
                };
            case "TypeError":
                return {
                    explanation: "An operation or function was applied to an object of inappropriate type.",
                    suggestion: "Check argument types and ensure variables support the requested operation.",
                };
            case "ValueError":
                return {
                    explanation: "A function received an argument with the right type but inappropriate value.",
                    suggestion: "Check input values or conversion calls like int('abc').",
                };
            case "IndexError":
                return {
                    explanation: "The program attempted to access an index outside the bounds of a list/tuple.",
                    suggestion: "Check list length with len() before accessing indices or adjust loop ranges.",
                };
            case "KeyError":
                return {
                    explanation: "Attempted to access a dictionary key that does not exist.",
                    suggestion: "Use dict.get(key) or verify key existence with 'key in dict'.",
                };
            case "AttributeError":
                return {
                    explanation: "Attempted to access an attribute or method that does not exist on the object.",
                    suggestion: "Verify object type and method name spelling.",
                };
            case "ZeroDivisionError":
                return {
                    explanation: "Division or modulo by zero encountered.",
                    suggestion: "Check divisor variables to ensure they are non-zero before division.",
                };
            case "RecursionError":
                return {
                    explanation: "Maximum recursion depth exceeded.",
                    suggestion: "Ensure recursive functions have a valid base case to terminate.",
                };
            default:
                return {
                    explanation: `${excName}: ${excMsg || "Runtime error encountered."}`,
                    suggestion: line ? `Review the statement on line ${line}.` : "Review traceback and output.",
                };
        }
    }
}
