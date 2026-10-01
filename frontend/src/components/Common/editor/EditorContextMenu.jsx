import React, { useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCopy,
  faPaste,
  faScissors,
  faRotateLeft,
  faRotateRight,
  faCheck,
  faWandMagicSparkles,
  faCode,
} from "@fortawesome/free-solid-svg-icons";
import "./EditorContextMenu.css";

export const EditorContextMenu = ({
  isOpen,
  position = { x: 0, y: 0 },
  onClose,
  onCut,
  onCopy,
  onPaste,
  onUndo,
  onRedo,
  onSelectAll,
  onFormat,
  onToggleComment,
  hasSelection = false,
  canUndo = false,
  canRedo = false,
}) => {
  const menuRef = useRef(null);

  // Close context menu on outside click, window resize, or Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    const handleScroll = () => {
      onClose();
    };

    window.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      window.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Viewport containment: ensure menu does not spill over right or bottom edge
  const menuWidth = 220;
  const menuHeight = 310;
  const adjustedX = Math.min(position.x, window.innerWidth - menuWidth - 10);
  const adjustedY = Math.min(position.y, window.innerHeight - menuHeight - 10);

  const handleAction = (actionFn) => {
    onClose();
    actionFn?.();
  };

  return (
    <div
      ref={menuRef}
      className="editor-context-menu"
      style={{
        left: `${Math.max(10, adjustedX)}px`,
        top: `${Math.max(10, adjustedY)}px`,
      }}
      role="menu"
    >
      <button
        type="button"
        className="context-menu-item"
        onClick={() => handleAction(onCut)}
        disabled={!hasSelection}
      >
        <div className="menu-item-left">
          <FontAwesomeIcon icon={faScissors} className="menu-item-icon" />
          <span>Cut</span>
        </div>
        <span className="menu-item-shortcut">Ctrl+X</span>
      </button>

      <button
        type="button"
        className="context-menu-item"
        onClick={() => handleAction(onCopy)}
      >
        <div className="menu-item-left">
          <FontAwesomeIcon icon={faCopy} className="menu-item-icon" />
          <span>{hasSelection ? "Copy Selection" : "Copy All"}</span>
        </div>
        <span className="menu-item-shortcut">Ctrl+C</span>
      </button>

      <button
        type="button"
        className="context-menu-item"
        onClick={() => handleAction(onPaste)}
      >
        <div className="menu-item-left">
          <FontAwesomeIcon icon={faPaste} className="menu-item-icon" />
          <span>Paste</span>
        </div>
        <span className="menu-item-shortcut">Ctrl+V</span>
      </button>

      <div className="context-menu-divider" />

      <button
        type="button"
        className="context-menu-item"
        onClick={() => handleAction(onUndo)}
        disabled={!canUndo}
      >
        <div className="menu-item-left">
          <FontAwesomeIcon icon={faRotateLeft} className="menu-item-icon" />
          <span>Undo</span>
        </div>
        <span className="menu-item-shortcut">Ctrl+Z</span>
      </button>

      <button
        type="button"
        className="context-menu-item"
        onClick={() => handleAction(onRedo)}
        disabled={!canRedo}
      >
        <div className="menu-item-left">
          <FontAwesomeIcon icon={faRotateRight} className="menu-item-icon" />
          <span>Redo</span>
        </div>
        <span className="menu-item-shortcut">Ctrl+Y</span>
      </button>

      <div className="context-menu-divider" />

      <button
        type="button"
        className="context-menu-item"
        onClick={() => handleAction(onSelectAll)}
      >
        <div className="menu-item-left">
          <FontAwesomeIcon icon={faCheck} className="menu-item-icon" />
          <span>Select All</span>
        </div>
        <span className="menu-item-shortcut">Ctrl+A</span>
      </button>

      <button
        type="button"
        className="context-menu-item"
        onClick={() => handleAction(onToggleComment)}
      >
        <div className="menu-item-left">
          <FontAwesomeIcon icon={faCode} className="menu-item-icon" />
          <span>Toggle Comment</span>
        </div>
        <span className="menu-item-shortcut">Ctrl+/</span>
      </button>

      <button
        type="button"
        className="context-menu-item highlight"
        onClick={() => handleAction(onFormat)}
      >
        <div className="menu-item-left">
          <FontAwesomeIcon icon={faWandMagicSparkles} className="menu-item-icon" />
          <span>Format Code</span>
        </div>
        <span className="menu-item-shortcut">Shift+Alt+F</span>
      </button>
    </div>
  );
};

export default EditorContextMenu;
