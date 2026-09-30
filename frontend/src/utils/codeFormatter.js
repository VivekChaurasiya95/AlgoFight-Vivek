import * as prettier from "prettier/standalone";
import parserBabel from "prettier/plugins/babel";
import parserEstree from "prettier/plugins/estree";
import parserTypescript from "prettier/plugins/typescript";

/**
 * Intelligent self-formatting for multi-language competitive coding
 */
export async function autoFormatCode(rawCode, language = "javascript") {
  if (!rawCode || typeof rawCode !== "string") return rawCode;

  const lang = (language || "").toLowerCase().trim();

  // 1. JavaScript / TypeScript Formatting via Prettier Standalone
  if (lang === "javascript" || lang === "js" || lang === "node" || lang === "typescript" || lang === "ts") {
    try {
      const isTs = lang === "typescript" || lang === "ts";
      const formatted = await prettier.format(rawCode, {
        parser: isTs ? "typescript" : "babel",
        plugins: [parserBabel, parserEstree, parserTypescript],
        tabWidth: 2,
        useTabs: false,
        semi: true,
        singleQuote: false,
        bracketSpacing: true,
        arrowParens: "always",
        trailingComma: "es5",
      });
      return formatted.trimEnd();
    } catch {
      // If code is temporarily syntactically incomplete during user typing, keep as is
      return rawCode;
    }
  }

  // 2. Syntax-aware structural alignment for C++, C, Java, Python
  return autoAlignCode(rawCode, lang);
}

/**
 * Clean structural self-alignment and indentation for C++, C, Java, Python
 */
export function autoAlignCode(code, lang = "") {
  if (!code) return code;

  const lines = code.split(/\r?\n/);
  const isPython = lang === "python" || lang === "py" || lang === "python3";
  const indentStep = 4;
  let currentIndent = 0;
  const aligned = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      aligned.push("");
      continue;
    }

    if (isPython) {
      // In Python, leading indent depends on colons
      aligned.push(rawLine.trimEnd());
      continue;
    }

    // For C/C++/Java: adjust indent for closing braces on the current line
    let startsWithClosing = /^[\}\]\)]/.test(trimmed);
    if (startsWithClosing) {
      currentIndent = Math.max(0, currentIndent - 1);
    }

    const pad = " ".repeat(currentIndent * indentStep);
    aligned.push(pad + trimmed);

    // Count net brace change in the line
    const openCount = (trimmed.match(/[\{\[\(]/g) || []).length;
    const closeCount = (trimmed.match(/[\}\]\)]/g) || []).length;
    const net = openCount - closeCount;

    if (!startsWithClosing) {
      currentIndent = Math.max(0, currentIndent + net);
    } else {
      currentIndent = Math.max(0, currentIndent + openCount);
    }
  }

  return aligned.join("\n");
}
