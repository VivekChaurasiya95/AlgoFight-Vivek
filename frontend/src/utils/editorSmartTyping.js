/**
 * Smart Editor Typing Handler
 * Provides bracket pairing, auto-indentation, smart tabs, and auto-alignment
 */

const PAIRS = {
  "{": "}",
  "(": ")",
  "[": "]",
  "\"": "\"",
  "'": "'",
  "`": "`",
};

const CLOSERS = new Set(["}", ")", "]", "\"", "'", "`"]);

export function handleEditorKeyDown(event, code, setCode, language = "javascript") {
  const textarea = event.target;
  const { selectionStart, selectionEnd, value } = textarea;

  // 1. TAB & SHIFT+TAB HANDLING
  if (event.key === "Tab") {
    event.preventDefault();
    const tabSpaces = "  "; // 2 soft spaces

    if (selectionStart !== selectionEnd) {
      // Multi-line selection: indent or outdent block
      const startLineIdx = value.lastIndexOf("\n", selectionStart - 1) + 1;
      const endLineIdx = value.indexOf("\n", selectionEnd);
      const actualEnd = endLineIdx === -1 ? value.length : endLineIdx;

      const selectedBlock = value.substring(startLineIdx, actualEnd);
      const lines = selectedBlock.split("\n");

      let updatedBlock;
      let lengthDiff = 0;

      if (event.shiftKey) {
        // Outdent: remove up to 2 leading spaces from each line
        updatedBlock = lines.map(line => {
          if (line.startsWith("  ")) {
            lengthDiff -= 2;
            return line.substring(2);
          }
          if (line.startsWith(" ")) {
            lengthDiff -= 1;
            return line.substring(1);
          }
          return line;
        }).join("\n");
      } else {
        // Indent: add 2 leading spaces to each line
        updatedBlock = lines.map(line => {
          lengthDiff += 2;
          return tabSpaces + line;
        }).join("\n");
      }

      const newCode = value.substring(0, startLineIdx) + updatedBlock + value.substring(actualEnd);
      setCode(newCode);

      setTimeout(() => {
        textarea.selectionStart = startLineIdx;
        textarea.selectionEnd = actualEnd + lengthDiff;
      }, 0);
    } else {
      // Single cursor: insert 2 spaces
      const newCode = value.substring(0, selectionStart) + tabSpaces + value.substring(selectionEnd);
      setCode(newCode);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = selectionStart + 2;
      }, 0);
    }
    return;
  }

  // 2. AUTO-PAIR COMPLETION (Opening brackets & quotes)
  if (PAIRS[event.key]) {
    const openChar = event.key;
    const closeChar = PAIRS[openChar];

    // If text is highlighted, wrap the selection in the pair
    if (selectionStart !== selectionEnd) {
      event.preventDefault();
      const selected = value.substring(selectionStart, selectionEnd);
      const newCode = value.substring(0, selectionStart) + openChar + selected + closeChar + value.substring(selectionEnd);
      setCode(newCode);
      setTimeout(() => {
        textarea.selectionStart = selectionStart + 1;
        textarea.selectionEnd = selectionEnd + 1;
      }, 0);
      return;
    }

    // Single cursor quote handling: don't auto-close if preceded by an alphanumeric character
    if ((openChar === "'" || openChar === "\"") && selectionStart > 0) {
      const prevChar = value[selectionStart - 1];
      if (/[A-Za-z0-9]/.test(prevChar)) {
        return; // Normal apostrophe in word
      }
    }

    event.preventDefault();
    const newCode = value.substring(0, selectionStart) + openChar + closeChar + value.substring(selectionEnd);
    setCode(newCode);
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = selectionStart + 1;
    }, 0);
    return;
  }

  // 3. STEP-OVER FOR CLOSING CHARACTERS
  if (CLOSERS.has(event.key)) {
    if (selectionStart === selectionEnd && value[selectionStart] === event.key) {
      event.preventDefault();
      textarea.selectionStart = textarea.selectionEnd = selectionStart + 1;
      return;
    }
  }

  // 4. SMART ENTER / INDENTATION
  if (event.key === "Enter") {
    const curLineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
    const curLine = value.substring(curLineStart, selectionStart);
    const leadingWhitespaceMatch = curLine.match(/^(\s*)/);
    const currentIndent = leadingWhitespaceMatch ? leadingWhitespaceMatch[1] : "";

    // Expanding between braces: {|} -> creates indented line in between
    const charBefore = value[selectionStart - 1];
    const charAfter = value[selectionStart];

    if (charBefore === "{" && charAfter === "}") {
      event.preventDefault();
      const innerIndent = currentIndent + "  ";
      const insert = `\n${innerIndent}\n${currentIndent}`;
      const newCode = value.substring(0, selectionStart) + insert + value.substring(selectionEnd);
      setCode(newCode);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = selectionStart + 1 + innerIndent.length;
      }, 0);
      return;
    }

    // Auto-indenting next line
    let extraIndent = "";
    if (curLine.trimEnd().endsWith("{") || curLine.trimEnd().endsWith(":")) {
      extraIndent = "  ";
    }

    event.preventDefault();
    const insert = `\n${currentIndent}${extraIndent}`;
    const newCode = value.substring(0, selectionStart) + insert + value.substring(selectionEnd);
    setCode(newCode);
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = selectionStart + insert.length;
    }, 0);
    return;
  }

  // 5. PAIR BACKSPACE DELETION
  if (event.key === "Backspace" && selectionStart === selectionEnd && selectionStart > 0) {
    const charBefore = value[selectionStart - 1];
    const charAfter = value[selectionStart];
    if (PAIRS[charBefore] === charAfter) {
      event.preventDefault();
      const newCode = value.substring(0, selectionStart - 1) + value.substring(selectionStart + 1);
      setCode(newCode);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = selectionStart - 1;
      }, 0);
    }
  }
}
