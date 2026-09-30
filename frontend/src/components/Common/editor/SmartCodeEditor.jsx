import React, { useRef, useEffect } from "react";
import { handleEditorKeyDown } from "../../../utils/editorSmartTyping";
import { autoFormatCode } from "../../../utils/codeFormatter";

export const SmartCodeEditor = ({
  value = "",
  onChange,
  language = "javascript",
  disabled = false,
  isBlurred = false,
  className = "livebattle-code-editor",
  style = {},
  textareaRef,
}) => {
  const localRef = useRef(null);
  const ref = textareaRef || localRef;

  // Background Idle Self-Alignment via Prettier (zero user intervention)
  useEffect(() => {
    if (!value || disabled) return;

    const timer = setTimeout(async () => {
      try {
        const formatted = await autoFormatCode(value, language);
        if (formatted && formatted !== value) {
          const textarea = ref.current;
          const cursorStart = textarea ? textarea.selectionStart : undefined;
          const cursorEnd = textarea ? textarea.selectionEnd : undefined;

          onChange(formatted);

          if (textarea && cursorStart !== undefined) {
            requestAnimationFrame(() => {
              textarea.selectionStart = Math.min(cursorStart, formatted.length);
              textarea.selectionEnd = Math.min(cursorEnd, formatted.length);
            });
          }
        }
      } catch {
        // Syntax incomplete while user is typing - wait without interrupting
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [value, language, disabled, onChange, ref]);

  const handleKeyDown = (e) => {
    handleEditorKeyDown(e, value, onChange, language);
  };

  const handlePaste = (e) => {
    const pastedText = e.clipboardData?.getData("text");
    if (!pastedText) return;

    // Normalize Windows CRLF to Unix LF on paste
    const clean = pastedText.replace(/\r\n/g, "\n");
    const textarea = ref.current;
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
    <textarea
      ref={ref}
      className={className}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      spellCheck="false"
      disabled={disabled}
      style={{
        filter: isBlurred ? "blur(8px)" : "none",
        transition: "filter 0.3s ease",
        ...style,
      }}
    />
  );
};

export default SmartCodeEditor;
