import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faWandMagicSparkles, faCircleCheck, faTriangleExclamation, faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import { handleEditorKeyDown } from "../../../utils/editorSmartTyping";
import { formatCode } from "../../../utils/codeFormatter";

export const SmartCodeEditor = forwardRef(({
  value = "",
  onChange,
  language = "javascript",
  disabled = false,
  isBlurred = false,
  className = "livebattle-code-editor",
  style = {},
  showToast = true,
  enableAutoFormat = true,
  onFormatResult,
  onKeyDown,
  textareaRef: externalTextareaRef,
}, forwardedRef) => {
  const localRef = useRef(null);
  const textareaRef = externalTextareaRef || localRef;

  const [toast, setToast] = useState(null);
  const [flashClass, setFlashClass] = useState("");
  const [isFormatting, setIsFormatting] = useState(false);
  const toastTimeoutRef = useRef(null);

  const showToastFeedback = useCallback((message, type = "info") => {
    if (!showToast) return;
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 3200);
  }, [showToast]);

  const triggerFlash = useCallback((type) => {
    setFlashClass(`flash-${type}`);
    setTimeout(() => {
      setFlashClass("");
    }, 600);
  }, []);

  // Primary formatting function
  const executeFormat = useCallback(async (isManual = false) => {
    if (!value || disabled) return;

    try {
      if (isManual) setIsFormatting(true);
      const res = await formatCode(value, language);

      if (res.success) {
        if (res.changed) {
          const textarea = textareaRef.current;
          let prevStart = textarea ? textarea.selectionStart : undefined;
          let lineNum = 1;
          let colNum = 0;

          if (textarea && prevStart !== undefined) {
            const before = value.slice(0, prevStart).split("\n");
            lineNum = before.length;
            colNum = before[before.length - 1].length;
          }

          onChange(res.formatted);

          if (textarea && prevStart !== undefined) {
            requestAnimationFrame(() => {
              const newLines = res.formatted.split("\n");
              let newPos = 0;
              for (let i = 0; i < Math.min(lineNum - 1, newLines.length); i++) {
                newPos += newLines[i].length + 1;
              }
              if (lineNum <= newLines.length) {
                newPos += Math.min(colNum, newLines[lineNum - 1].length);
              }
              textarea.selectionStart = textarea.selectionEnd = Math.min(newPos, res.formatted.length);
            });
          }

          if (isManual) {
            showToastFeedback(
              res.isPrettier ? "Formatted with Prettier ✨" : "Code formatted ✨",
              "success"
            );
            triggerFlash("success");
          }
        } else if (isManual) {
          showToastFeedback("Code is already formatted ✓", "info");
          triggerFlash("info");
        }
      } else if (isManual) {
        showToastFeedback(res.error || "Prettier: Syntax error", "error");
        triggerFlash("error");
      }

      onFormatResult?.(res);
      return res;
    } catch (err) {
      if (isManual) {
        showToastFeedback(err?.message || "Formatting failed", "error");
        triggerFlash("error");
      }
    } finally {
      if (isManual) setIsFormatting(false);
    }
  }, [value, language, disabled, onChange, textareaRef, showToastFeedback, triggerFlash, onFormatResult]);

  // Expose imperative handle for external buttons/toolbars
  useImperativeHandle(forwardedRef, () => ({
    formatCode: () => executeFormat(true),
    focus: () => textareaRef.current?.focus(),
    getTextarea: () => textareaRef.current,
    isFormatting,
  }), [executeFormat, isFormatting, textareaRef]);

  // Background Idle Self-Alignment via Prettier (zero user intervention)
  useEffect(() => {
    if (!enableAutoFormat || !value || disabled) return;

    const timer = setTimeout(() => {
      executeFormat(false);
    }, 1800);

    return () => clearTimeout(timer);
  }, [value, language, disabled, enableAutoFormat, executeFormat]);

  // Clean up toast timeout on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  const handleKeyDown = (e) => {
    // 1. Keyboard shortcuts for Format:
    // - Shift + Alt + F (VS Code standard)
    // - Ctrl/Cmd + Alt + F
    // - Ctrl/Cmd + Shift + I
    // - Ctrl/Cmd + S (Save & Format)
    const isFormatKey =
      (e.shiftKey && e.altKey && (e.key === "F" || e.key === "f")) ||
      ((e.ctrlKey || e.metaKey) && e.altKey && (e.key === "F" || e.key === "f")) ||
      ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "I" || e.key === "i"));

    const isSaveKey = (e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S");

    if (isFormatKey || isSaveKey) {
      e.preventDefault();
      e.stopPropagation();
      executeFormat(true);
      return;
    }

    handleEditorKeyDown(e, value, onChange, language);
    onKeyDown?.(e);
  };

  const handlePaste = (e) => {
    const pastedText = e.clipboardData?.getData("text");
    if (!pastedText) return;

    // Normalize Windows CRLF to Unix LF on paste
    const clean = pastedText.replace(/\r\n/g, "\n");
    const textarea = textareaRef.current;
    if (!textarea) return;

    e.preventDefault();
    const { selectionStart, selectionEnd } = textarea;
    const newCode = value.substring(0, selectionStart) + clean + value.substring(selectionEnd);
    onChange(newCode);

    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = selectionStart + clean.length;
    }, 0);
  };

  return (
    <>
      <textarea
        ref={textareaRef}
        className={`${className} ${flashClass}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        spellCheck="false"
        disabled={disabled}
        style={{
          filter: isBlurred ? "blur(8px)" : "none",
          transition: "filter 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease",
          ...style,
        }}
      />
      {toast && (
        <div className={`editor-prettier-toast ${toast.type}`}>
          <FontAwesomeIcon
            icon={
              toast.type === "success"
                ? faWandMagicSparkles
                : toast.type === "error"
                ? faTriangleExclamation
                : faInfoCircle
            }
            className="prettier-toast-icon"
          />
          <span className="prettier-toast-text">{toast.message}</span>
        </div>
      )}
    </>
  );
});

SmartCodeEditor.displayName = "SmartCodeEditor";

export default SmartCodeEditor;
