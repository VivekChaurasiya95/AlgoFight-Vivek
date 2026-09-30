/**
 * Universal Code Harness
 * 
 * Provides dual-mode code wrapping and normalizations:
 * 1. Function-style code (function solution / def solution) automatically receives stdin/stdout wrapping.
 * 2. Competitive programming code (cin/cout, Scanner, sys.stdin, process.stdin) executes untouched.
 * 3. Java case-sensitivity normalizer: strips top-level 'public class' or aligns filename to prevent Linux compilation errors.
 */

export interface PreparedCodeResult {
    code: string;
    fileName: string;
}

export class CodeHarness {
    /**
     * Prepares user code and determines the correct filename for Piston execution.
     */
    public static prepare(language: string, rawCode: string, defaultExt: string): PreparedCodeResult {
        const lang = language.toLowerCase().trim();

        switch (lang) {
            case "java":
                return this.prepareJava(rawCode, defaultExt);
            case "javascript":
            case "js":
            case "typescript":
            case "ts":
                return {
                    code: this.prepareJavaScript(rawCode),
                    fileName: `main.${defaultExt}`,
                };
            case "python":
            case "py":
            case "python3":
                return {
                    code: this.preparePython(rawCode),
                    fileName: `main.${defaultExt}`,
                };
            default:
                // C++, C, and others execute as-is
                return {
                    code: rawCode,
                    fileName: `main.${defaultExt}`,
                };
        }
    }

    /**
     * Java case-sensitivity normalizer:
     * If user writes `public class Main` or `public class Solution`, strip `public`
     * so javac compiles cleanly regardless of whether the file is named main.java or Solution.java.
     * Also extract the class name if present to set the file name accurately.
     */
    private static prepareJava(rawCode: string, defaultExt: string): PreparedCodeResult {
        let code = rawCode;
        let fileName = `Main.${defaultExt}`;

        // Find public class or top-level class name
        const match = code.match(/public\s+class\s+([A-Za-z0-9_$]+)/);
        if (match && match[1]) {
            const className = match[1];
            fileName = `${className}.${defaultExt}`;
            // Also relax 'public class' to 'class' to guarantee compilation on any runner
            code = code.replace(/public\s+class\s+([A-Za-z0-9_$]+)/, "class $1");
        }

        return { code, fileName };
    }

    /**
     * JavaScript / TypeScript wrapping:
     * If the code defines a `solution` function and doesn't already read from stdin,
     * inject stdin reading and console.log output harness.
     */
    private static prepareJavaScript(rawCode: string): string {
        const hasStdin = rawCode.includes("process.stdin") || rawCode.includes("fs.readFileSync");
        const hasSolutionFn = /(?:function\s+solution\b|const\s+solution\s*=|let\s+solution\s*=|var\s+solution\s*=)/.test(rawCode);

        if (!hasSolutionFn || hasStdin) {
            return rawCode;
        }

        return `
const fs = require("fs");
const __af_input = fs.readFileSync(0, "utf-8");

${rawCode}

if (typeof solution === "function") {
    const raw = __af_input.trim();
    const lines = raw.split(/\\r?\\n/).map(l => l.trim()).filter(Boolean);
    let res;
    if (lines.length > 1) {
        const args = lines.map(l => {
            try { return JSON.parse(l); } catch { return l.includes(" ") ? l.split(" ").map(n => isNaN(Number(n)) ? n : Number(n)) : l; }
        });
        res = solution(...args);
    } else if (raw.includes(" ")) {
        const nums = raw.split(" ").map(n => isNaN(Number(n)) ? n : Number(n));
        res = solution(...nums);
    } else {
        let single = raw;
        try { single = JSON.parse(raw); } catch {}
        res = solution(single);
    }
    if (res !== undefined) {
        console.log(typeof res === "object" ? JSON.stringify(res) : res);
    }
}
`;
    }

    /**
     * Python wrapping:
     * If the code defines `def solution(` and doesn't already read from stdin,
     * inject stdin reading and print output harness.
     */
    private static preparePython(rawCode: string): string {
        const hasStdin = rawCode.includes("sys.stdin") || rawCode.includes("input(");
        const hasSolutionFn = /def\s+solution\s*\(/.test(rawCode);

        if (!hasSolutionFn || hasStdin) {
            return rawCode;
        }

        return `
import sys, json

${rawCode}

if __name__ == '__main__':
    raw_input = sys.stdin.read().strip()
    if 'solution' in globals() and callable(globals()['solution']):
        lines = [l.strip() for l in raw_input.split('\\n') if l.strip()]
        if len(lines) > 1:
            parsed_args = []
            for l in lines:
                try: 
                    parsed_args.append(json.loads(l))
                except: 
                    parsed_args.append([int(x) if x.lstrip('-').isdigit() else x for x in l.split()] if ' ' in l else l)
            res = solution(*parsed_args)
        elif ' ' in raw_input:
            nums = [int(x) if x.lstrip('-').isdigit() else x for x in raw_input.split()]
            res = solution(*nums)
        else:
            try: single = json.loads(raw_input)
            except: single = raw_input
            res = solution(single)
        if res is not None:
            print(json.dumps(res) if isinstance(res, (list, dict)) else res)
`;
    }
}
