/**
 * Smart Editor Typing Handler
 * Provides bracket pairing, auto-indentation, smart tabs, auto-alignment,
 * line movements, line duplication, line deletion, comment toggling, and history tracking.
 */

import {
  toggleComment,
  moveLines,
  duplicateLines,
  deleteLines,
  indentLines,
  selectLine,
} from "./editorHistory.js";

const PAIRS = {
  "{": "}",
  "(": ")",
  "[": "]",
  "\"": "\"",
  "'": "'",
  "`": "`",
};

const CLOSERS = new Set(["}", ")", "]", "\"", "'", "`"]);

export function handleEditorKeyDown(event, code, setCode, language = "javascript", historyManager = null) {
  const textarea = event.target;
  const { selectionStart, selectionEnd, value } = textarea;

  const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const modKey = isMac ? event.metaKey : event.ctrlKey;

  const applyChange = (newCode, newStart, newEnd) => {
    if (historyManager) {
      historyManager.recordTyping(value, selectionStart, selectionEnd, true);
    }
    setCode(newCode);
    if (historyManager) {
      historyManager.recordTyping(newCode, newStart, newEnd, true);
    }
    setTimeout(() => {
      if (textarea) {
        textarea.selectionStart = newStart;
        textarea.selectionEnd = newEnd;
      }
    }, 0);
  };

  // 1. TOGGLE COMMENT: Ctrl+/ or Cmd+/
  if (modKey && (event.key === "/" || event.key === "?")) {
    event.preventDefault();
    const res = toggleComment(value, selectionStart, selectionEnd, language);
    applyChange(res.newCode, res.newSelectionStart, res.newSelectionEnd);
    return;
  }

  // 2. MOVE LINE UP / DOWN: Alt+ArrowUp / Alt+ArrowDown
  if (event.altKey && !event.shiftKey && !modKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
    event.preventDefault();
    const dir = event.key === "ArrowUp" ? "up" : "down";
    const res = moveLines(value, selectionStart, selectionEnd, dir);
    if (res) {
      applyChange(res.newCode, res.newSelectionStart, res.newSelectionEnd);
    }
    return;
  }

  // 3. DUPLICATE LINE DOWN / UP: Shift+Alt+ArrowDown / Shift+Alt+ArrowUp
  if (event.shiftKey && event.altKey && !modKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
    event.preventDefault();
    const dir = event.key === "ArrowDown" ? "down" : "up";
    const res = duplicateLines(value, selectionStart, selectionEnd, dir);
    if (res) {
      applyChange(res.newCode, res.newSelectionStart, res.newSelectionEnd);
    }
    return;
  }

  // 4. DELETE ENTIRE LINE: Ctrl+Shift+K or Cmd+Shift+K
  if (modKey && event.shiftKey && (event.key === "K" || event.key === "k")) {
    event.preventDefault();
    const res = deleteLines(value, selectionStart, selectionEnd);
    applyChange(res.newCode, res.newSelectionStart, res.newSelectionEnd);
    return;
  }

  // 5. INDENT / OUTDENT: Ctrl+] / Ctrl+[
  if (modKey && !event.shiftKey && (event.key === "]" || event.key === "[")) {
    event.preventDefault();
    const isOutdent = event.key === "[";
    const res = indentLines(value, selectionStart, selectionEnd, isOutdent);
    applyChange(res.newCode, res.newSelectionStart, res.newSelectionEnd);
    return;
  }

  // 6. SELECT CURRENT LINE: Ctrl+L or Cmd+L
  if (modKey && !event.shiftKey && !event.altKey && (event.key === "l" || event.key === "L")) {
    event.preventDefault();
    const res = selectLine(value, selectionStart, selectionEnd);
    textarea.selectionStart = res.selectionStart;
    textarea.selectionEnd = res.selectionEnd;
    return;
  }

  // 7. TAB & SHIFT+TAB HANDLING
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
        updatedBlock = lines
          .map((line) => {
            if (line.startsWith("  ")) {
              lengthDiff -= 2;
              return line.substring(2);
            }
            if (line.startsWith(" ")) {
              lengthDiff -= 1;
              return line.substring(1);
            }
            return line;
          })
          .join("\n");
      } else {
        // Indent: add 2 leading spaces to each line
        updatedBlock = lines
          .map((line) => {
            lengthDiff += 2;
            return tabSpaces + line;
          })
          .join("\n");
      }

      const newCode = value.substring(0, startLineIdx) + updatedBlock + value.substring(actualEnd);
      applyChange(newCode, startLineIdx, actualEnd + lengthDiff);
    } else {
      // Single cursor: insert 2 spaces
      const newCode = value.substring(0, selectionStart) + tabSpaces + value.substring(selectionEnd);
      applyChange(newCode, selectionStart + 2, selectionStart + 2);
    }
    return;
  }

  // 8. AUTO-PAIR COMPLETION (Opening brackets & quotes)
  if (PAIRS[event.key]) {
    const openChar = event.key;
    const closeChar = PAIRS[openChar];

    // If text is highlighted, wrap the selection in the pair
    if (selectionStart !== selectionEnd) {
      event.preventDefault();
      const selected = value.substring(selectionStart, selectionEnd);
      const newCode =
        value.substring(0, selectionStart) +
        openChar +
        selected +
        closeChar +
        value.substring(selectionEnd);
      applyChange(newCode, selectionStart + 1, selectionEnd + 1);
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
    const newCode =
      value.substring(0, selectionStart) + openChar + closeChar + value.substring(selectionEnd);
    applyChange(newCode, selectionStart + 1, selectionStart + 1);
    return;
  }

  // 9. STEP-OVER FOR CLOSING CHARACTERS
  if (CLOSERS.has(event.key)) {
    if (selectionStart === selectionEnd && value[selectionStart] === event.key) {
      event.preventDefault();
      textarea.selectionStart = textarea.selectionEnd = selectionStart + 1;
      return;
    }
  }

  // 10. SMART ENTER / INDENTATION
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
      applyChange(
        newCode,
        selectionStart + 1 + innerIndent.length,
        selectionStart + 1 + innerIndent.length
      );
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
    applyChange(newCode, selectionStart + insert.length, selectionStart + insert.length);
    return;
  }

  // 11. PAIR BACKSPACE DELETION
  if (event.key === "Backspace" && selectionStart === selectionEnd && selectionStart > 0) {
    const charBefore = value[selectionStart - 1];
    const charAfter = value[selectionStart];
    if (PAIRS[charBefore] === charAfter) {
      event.preventDefault();
      const newCode = value.substring(0, selectionStart - 1) + value.substring(selectionStart + 1);
      applyChange(newCode, selectionStart - 1, selectionStart - 1);
    }
  }
}
