import * as prettier from "prettier/standalone";
import parserBabel from "prettier/plugins/babel";
import parserEstree from "prettier/plugins/estree";
import parserTypescript from "prettier/plugins/typescript";

/**
 * Intelligent self-formatting for multi-language competitive coding
 * Supported:
 * - JavaScript / TypeScript via Prettier Standalone (Babel, Estree, TypeScript plugins)
 * - Python via structural alignment & block indent
 * - C++, C, Java via brace-depth and structural alignment
 */
export async function formatCode(rawCode, language = "javascript") {
  if (!rawCode || typeof rawCode !== "string") {
    return {
      success: true,
      formatted: rawCode || "",
      error: null,
      isPrettier: false,
      changed: false,
    };
  }

  const lang = (language || "").toLowerCase().trim();
  const isJsOrTs =
    lang === "javascript" ||
    lang === "js" ||
    lang === "node" ||
    lang === "typescript" ||
    lang === "ts";

  // 1. JavaScript / TypeScript Formatting via Prettier Standalone
  if (isJsOrTs) {
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

      const cleanFormatted = formatted.trimEnd();
      const changed = cleanFormatted !== rawCode.trimEnd();

      return {
        success: true,
        formatted: cleanFormatted,
        error: null,
        isPrettier: true,
        changed,
      };
    } catch (err) {
      // Clean up Prettier error message to be single-line and clear
      const rawMsg = err?.message || "Syntax error";
      const cleanMsg = rawMsg.split("\n")[0].replace(/^.*?: /, "");
      return {
        success: false,
        formatted: rawCode,
        error: cleanMsg || "Syntax error in code",
        isPrettier: true,
        changed: false,
      };
    }
  }

  // 2. Python Structural Alignment
  if (lang === "python" || lang === "py" || lang === "python3") {
    try {
      const aligned = autoAlignPython(rawCode);
      const clean = aligned.trimEnd();
      return {
        success: true,
        formatted: clean,
        error: null,
        isPrettier: false,
        changed: clean !== rawCode.trimEnd(),
      };
    } catch (err) {
      return {
        success: false,
        formatted: rawCode,
        error: err?.message || "Python formatting error",
        isPrettier: false,
        changed: false,
      };
    }
  }

  // 3. C++, C, Java Structural Alignment
  try {
    const aligned = autoAlignCLike(rawCode);
    const clean = aligned.trimEnd();
    return {
      success: true,
      formatted: clean,
      error: null,
      isPrettier: false,
      changed: clean !== rawCode.trimEnd(),
    };
  } catch (err) {
    return {
      success: false,
      formatted: rawCode,
      error: err?.message || "Formatting error",
      isPrettier: false,
      changed: false,
    };
  }
}

/**
 * Backward-compatible helper returning formatted code directly
 */
export async function autoFormatCode(rawCode, language = "javascript") {
  const result = await formatCode(rawCode, language);
  return result.success ? result.formatted : rawCode;
}

/**
 * Python indentation and structural alignment
 * Preserves user's manual block scoping while normalizing tabs, trailing whitespace, and semicolons
 */
export function autoAlignPython(code) {
  if (!code) return code;
  const lines = code.split(/\r?\n/);
  const aligned = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    // Convert tabs to 4 spaces
    const tabExpanded = rawLine.replace(/\t/g, "    ");
    const trimmed = tabExpanded.trim();

    if (!trimmed) {
      aligned.push("");
      continue;
    }

    // Preserve the user's deliberate block indentation level
    const leadingSpacesMatch = tabExpanded.match(/^( *)/);
    const leadingSpaces = leadingSpacesMatch ? leadingSpacesMatch[1].length : 0;
    
    // Normalize to clean 4-space steps
    const indentLevel = Math.round(leadingSpaces / 4);
    const normalizedIndent = "    ".repeat(indentLevel);

    // Clean up accidental trailing semicolons in Python
    let cleanLine = trimmed;
    if (cleanLine.endsWith(";") && !cleanLine.includes('";') && !cleanLine.includes("';")) {
      cleanLine = cleanLine.slice(0, -1).trimEnd();
    }

    aligned.push(normalizedIndent + cleanLine);
  }

  return aligned.join("\n");
}

/**
 * Clean structural self-alignment and indentation for C++, C, Java
 */
export function autoAlignCLike(code) {
  if (!code) return code;

  const lines = code.split(/\r?\n/);
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

    // Adjust for closing braces on the current line
    const startsWithClosing = /^[\}\]\)]/.test(trimmed);
    const isAccessSpecifier = /^(public|private|protected)\s*:/.test(trimmed);
    const isCase = /^(case\s+[^:]+|default)\s*:/.test(trimmed);

    let effectiveIndent = currentIndent;
    if (startsWithClosing) {
      effectiveIndent = Math.max(0, currentIndent - 1);
      currentIndent = effectiveIndent;
    } else if (isAccessSpecifier || isCase) {
      effectiveIndent = Math.max(0, currentIndent - 1);
    }

    const pad = " ".repeat(effectiveIndent * indentStep);
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

/**
 * Backward compatibility alias for autoAlignCode
 */
export const autoAlignCode = (code, lang = "") => {
  const l = (lang || "").toLowerCase();
  if (l === "python" || l === "py" || l === "python3") {
    return autoAlignPython(code);
  }
  return autoAlignCLike(code);
};
