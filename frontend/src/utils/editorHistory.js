/**
 * Editor History & Keyboard Manipulation Engine
 * Provides deterministic Undo/Redo stacks, line movement, duplication,
 * comment toggling, and indentation across all supported languages.
 */

export class EditorHistory {
  constructor(maxDepth = 200) {
    this.maxDepth = maxDepth;
    this.undoStack = [];
    this.redoStack = [];
    this.lastSnapshot = null;
    this.typingTimer = null;
  }

  init(code, selectionStart = 0, selectionEnd = 0) {
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
      this.typingTimer = null;
    }
    this.undoStack = [];
    this.redoStack = [];
    this.lastSnapshot = { code, selectionStart, selectionEnd };
  }

  recordTyping(code, selectionStart, selectionEnd, commitImmediately = false) {
    if (commitImmediately) {
      if (this.typingTimer) {
        clearTimeout(this.typingTimer);
        this.typingTimer = null;
      }
      this.push(code, selectionStart, selectionEnd);
      return;
    }

    if (this.lastSnapshot && this.lastSnapshot.code === code) {
      this.lastSnapshot.selectionStart = selectionStart;
      this.lastSnapshot.selectionEnd = selectionEnd;
      return;
    }

    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
    }

    // Debounce typing entries to avoid single-letter undo spam
    this.typingTimer = setTimeout(() => {
      this.push(code, selectionStart, selectionEnd);
      this.typingTimer = null;
    }, 380);
  }

  push(code, selectionStart, selectionEnd) {
    if (this.lastSnapshot && this.lastSnapshot.code === code) {
      this.lastSnapshot.selectionStart = selectionStart;
      this.lastSnapshot.selectionEnd = selectionEnd;
      return;
    }

    if (this.lastSnapshot) {
      this.undoStack.push(this.lastSnapshot);
      if (this.undoStack.length > this.maxDepth) {
        this.undoStack.shift();
      }
    }

    this.lastSnapshot = { code, selectionStart, selectionEnd };
    this.redoStack = [];
  }

  undo(currentCode, currentStart, currentEnd) {
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
      this.typingTimer = null;
    }

    if (this.undoStack.length === 0) return null;

    // Push active state to redo stack
    this.redoStack.push({
      code: currentCode,
      selectionStart: currentStart,
      selectionEnd: currentEnd,
    });

    const prev = this.undoStack.pop();
    this.lastSnapshot = prev;
    return prev;
  }

  redo(currentCode, currentStart, currentEnd) {
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
      this.typingTimer = null;
    }

    if (this.redoStack.length === 0) return null;

    // Push active state to undo stack
    this.undoStack.push({
      code: currentCode,
      selectionStart: currentStart,
      selectionEnd: currentEnd,
    });

    const next = this.redoStack.pop();
    this.lastSnapshot = next;
    return next;
  }

  canUndo() {
    return this.undoStack.length > 0;
  }

  canRedo() {
    return this.redoStack.length > 0;
  }
}

/**
 * Returns comment prefix based on language
 */
export function getCommentPrefix(language = "javascript") {
  const lang = (language || "").toLowerCase();
  if (lang === "python" || lang === "py" || lang === "python3") return "# ";
  if (lang === "sql") return "-- ";
  return "// ";
}

/**
 * Toggle single-line or multi-line comment
 */
export function toggleComment(code, selectionStart, selectionEnd, language = "javascript") {
  const prefix = getCommentPrefix(language);
  const prefixTrimmed = prefix.trim();

  const startLineIdx = code.lastIndexOf("\n", selectionStart - 1) + 1;
  const endLineIdx = code.indexOf("\n", selectionEnd);
  const actualEnd = endLineIdx === -1 ? code.length : endLineIdx;

  const targetBlock = code.substring(startLineIdx, actualEnd);
  const lines = targetBlock.split("\n");

  const nonEmptyLines = lines.filter((l) => l.trim().length > 0);
  const allCommented =
    nonEmptyLines.length > 0 &&
    nonEmptyLines.every((l) => l.trimStart().startsWith(prefixTrimmed));

  let lengthDiff = 0;
  const newLines = lines.map((line) => {
    if (allCommented) {
      // Uncomment
      const match = line.match(/^(\s*)(.*)$/);
      if (!match) return line;
      const indent = match[1];
      const rest = match[2];
      if (rest.startsWith(prefix)) {
        lengthDiff -= prefix.length;
        return indent + rest.substring(prefix.length);
      } else if (rest.startsWith(prefixTrimmed)) {
        lengthDiff -= prefixTrimmed.length;
        return indent + rest.substring(prefixTrimmed.length);
      }
      return line;
    } else {
      // Comment (skip empty lines if multi-line block)
      if (line.trim().length === 0 && lines.length > 1) return line;
      const match = line.match(/^(\s*)(.*)$/);
      const indent = match ? match[1] : "";
      const rest = match ? match[2] : "";
      lengthDiff += prefix.length;
      return indent + prefix + rest;
    }
  });

  const updatedBlock = newLines.join("\n");
  const newCode = code.substring(0, startLineIdx) + updatedBlock + code.substring(actualEnd);
  const newSelectionStart =
    selectionStart === selectionEnd
      ? selectionStart + (allCommented ? -prefix.length : prefix.length)
      : selectionStart;
  const newSelectionEnd = actualEnd + lengthDiff;

  return {
    newCode,
    newSelectionStart: Math.max(startLineIdx, newSelectionStart),
    newSelectionEnd: Math.max(startLineIdx, newSelectionEnd),
  };
}

/**
 * Move line or selected block of lines up or down
 */
export function moveLines(code, selectionStart, selectionEnd, direction = "up") {
  const startLineIdx = code.lastIndexOf("\n", selectionStart - 1) + 1;
  const endLineIdx = code.indexOf("\n", selectionEnd);
  const actualEnd = endLineIdx === -1 ? code.length : endLineIdx;

  const lines = code.split("\n");
  let lineStart = 0;
  let lineStartIdx = -1;
  let lineEndIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const nextStart = lineStart + lines[i].length + 1;
    if (lineStartIdx === -1 && startLineIdx <= lineStart + lines[i].length) {
      lineStartIdx = i;
    }
    if (lineEndIdx === -1 && actualEnd <= lineStart + lines[i].length) {
      lineEndIdx = i;
      break;
    }
    lineStart = nextStart;
  }

  if (lineStartIdx === -1) lineStartIdx = 0;
  if (lineEndIdx === -1) lineEndIdx = lines.length - 1;

  if (direction === "up") {
    if (lineStartIdx === 0) return null;
    const targetLine = lines[lineStartIdx - 1];
    lines.splice(lineStartIdx - 1, 1);
    lines.splice(lineEndIdx, 0, targetLine);
    const newCode = lines.join("\n");
    const shift = -(targetLine.length + 1);
    return {
      newCode,
      newSelectionStart: Math.max(0, selectionStart + shift),
      newSelectionEnd: Math.max(0, selectionEnd + shift),
    };
  } else {
    if (lineEndIdx >= lines.length - 1) return null;
    const targetLine = lines[lineEndIdx + 1];
    lines.splice(lineEndIdx + 1, 1);
    lines.splice(lineStartIdx, 0, targetLine);
    const newCode = lines.join("\n");
    const shift = targetLine.length + 1;
    return {
      newCode,
      newSelectionStart: selectionStart + shift,
      newSelectionEnd: selectionEnd + shift,
    };
  }
}

/**
 * Duplicate line or selected block of lines up or down
 */
export function duplicateLines(code, selectionStart, selectionEnd, direction = "down") {
  const startLineIdx = code.lastIndexOf("\n", selectionStart - 1) + 1;
  const endLineIdx = code.indexOf("\n", selectionEnd);
  const actualEnd = endLineIdx === -1 ? code.length : endLineIdx;

  const targetBlock = code.substring(startLineIdx, actualEnd);

  if (direction === "down") {
    const newCode = code.substring(0, actualEnd) + "\n" + targetBlock + code.substring(actualEnd);
    const shift = targetBlock.length + 1;
    return {
      newCode,
      newSelectionStart: selectionStart + shift,
      newSelectionEnd: selectionEnd + shift,
    };
  } else {
    const newCode = code.substring(0, startLineIdx) + targetBlock + "\n" + code.substring(startLineIdx);
    return {
      newCode,
      newSelectionStart: selectionStart,
      newSelectionEnd: selectionEnd,
    };
  }
}

/**
 * Delete entire current line or selected block
 */
export function deleteLines(code, selectionStart, selectionEnd) {
  const startLineIdx = code.lastIndexOf("\n", selectionStart - 1) + 1;
  const endLineIdx = code.indexOf("\n", selectionEnd);

  if (endLineIdx === -1) {
    if (startLineIdx > 0) {
      const newCode = code.substring(0, startLineIdx - 1);
      return { newCode, newSelectionStart: startLineIdx - 1, newSelectionEnd: startLineIdx - 1 };
    } else {
      return { newCode: "", newSelectionStart: 0, newSelectionEnd: 0 };
    }
  } else {
    const newCode = code.substring(0, startLineIdx) + code.substring(endLineIdx + 1);
    return { newCode, newSelectionStart: startLineIdx, newSelectionEnd: startLineIdx };
  }
}

/**
 * Indent or outdent line(s) (2 spaces)
 */
export function indentLines(code, selectionStart, selectionEnd, isOutdent = false) {
  const startLineIdx = code.lastIndexOf("\n", selectionStart - 1) + 1;
  const endLineIdx = code.indexOf("\n", selectionEnd);
  const actualEnd = endLineIdx === -1 ? code.length : endLineIdx;

  const targetBlock = code.substring(startLineIdx, actualEnd);
  const lines = targetBlock.split("\n");

  let lengthDiff = 0;
  const updatedBlock = lines
    .map((line) => {
      if (isOutdent) {
        if (line.startsWith("  ")) {
          lengthDiff -= 2;
          return line.substring(2);
        }
        if (line.startsWith(" ")) {
          lengthDiff -= 1;
          return line.substring(1);
        }
        return line;
      } else {
        lengthDiff += 2;
        return "  " + line;
      }
    })
    .join("\n");

  const newCode = code.substring(0, startLineIdx) + updatedBlock + code.substring(actualEnd);
  const newSelectionStart = isOutdent
    ? Math.max(startLineIdx, selectionStart - 2)
    : selectionStart + 2;
  const newSelectionEnd = Math.max(startLineIdx, actualEnd + lengthDiff);

  return {
    newCode,
    newSelectionStart,
    newSelectionEnd,
  };
}

/**
 * Expand selection to entire line
 */
export function selectLine(code, selectionStart, selectionEnd) {
  const startLineIdx = code.lastIndexOf("\n", selectionStart - 1) + 1;
  const endLineIdx = code.indexOf("\n", selectionEnd);
  const actualEnd = endLineIdx === -1 ? code.length : endLineIdx;

  return {
    selectionStart: startLineIdx,
    selectionEnd: actualEnd,
  };
}
