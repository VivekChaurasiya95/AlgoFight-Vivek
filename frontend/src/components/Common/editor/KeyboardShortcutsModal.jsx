import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faKeyboard,
  faXmark,
  faRotateLeft,
  faCode,
  faIndent,
  faBolt,
  faMagnifyingGlass,
} from "@fortawesome/free-solid-svg-icons";
import "./KeyboardShortcutsModal.css";

const SHORTCUT_CATEGORIES = [
  {
    id: "history",
    label: "History",
    icon: faRotateLeft,
    shortcuts: [
      { keys: ["Ctrl", "Z"], macKeys: ["⌘", "Z"], desc: "Undo last edit or smart action" },
      { keys: ["Ctrl", "Y"], macKeys: ["⌘", "Y"], desc: "Redo previously undone change" },
      { keys: ["Ctrl", "Shift", "Z"], macKeys: ["⌘", "Shift", "Z"], desc: "Redo alternative shortcut" },
      { keys: ["Ctrl", "L"], macKeys: ["⌘", "L"], desc: "Select current line" },
    ],
  },
  {
    id: "editing",
    label: "Code Editing",
    icon: faCode,
    shortcuts: [
      { keys: ["Ctrl", "/"], macKeys: ["⌘", "/"], desc: "Toggle line or selection comment (// or #)" },
      { keys: ["Shift", "Alt", "F"], macKeys: ["Shift", "Option", "F"], desc: "Format code with Prettier" },
      { keys: ["Alt", "↑ / ↓"], macKeys: ["Option", "↑ / ↓"], desc: "Move current line or selection up/down" },
      { keys: ["Shift", "Alt", "↑ / ↓"], macKeys: ["Shift", "Option", "↑ / ↓"], desc: "Duplicate line or selection up/down" },
      { keys: ["Ctrl", "Shift", "K"], macKeys: ["⌘", "Shift", "K"], desc: "Delete entire line" },
    ],
  },
  {
    id: "indent",
    label: "Indentation & Pairs",
    icon: faIndent,
    shortcuts: [
      { keys: ["Tab"], macKeys: ["Tab"], desc: "Indent line or block (2 spaces)" },
      { keys: ["Shift", "Tab"], macKeys: ["Shift", "Tab"], desc: "Outdent line or block" },
      { keys: ["Ctrl", "]"], macKeys: ["⌘", "]"], desc: "Indent current selection" },
      { keys: ["Ctrl", "["], macKeys: ["⌘", "["], desc: "Outdent current selection" },
      { keys: ["{", "(", "[", "\"", "'"], macKeys: ["{", "(", "[", "\"", "'"], desc: "Auto-close pair (wraps selected text)" },
    ],
  },
  {
    id: "battle",
    label: "Testing & Battle",
    icon: faBolt,
    shortcuts: [
      { keys: ["Ctrl", "Enter"], macKeys: ["⌘", "Enter"], desc: "Run code against sample test cases" },
      { keys: ["Ctrl", "Shift", "Enter"], macKeys: ["⌘", "Shift", "Enter"], desc: "Submit code to full evaluation suite" },
      { keys: ["F1"], macKeys: ["F1"], desc: "Toggle keyboard shortcuts help" },
    ],
  },
];

export const KeyboardShortcutsModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");

  const isMac =
    typeof navigator !== "undefined" &&
    /Mac|iPod|iPhone|iPad/.test(navigator.platform);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredCategories = SHORTCUT_CATEGORIES.map((cat) => {
    if (activeTab !== "all" && cat.id !== activeTab) return null;
    const matchingShortcuts = cat.shortcuts.filter((s) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const descMatch = s.desc.toLowerCase().includes(q);
      const keyMatch = (isMac ? s.macKeys : s.keys).some((k) =>
        k.toLowerCase().includes(q)
      );
      return descMatch || keyMatch;
    });
    if (matchingShortcuts.length === 0) return null;
    return { ...cat, shortcuts: matchingShortcuts };
  }).filter(Boolean);

  return (
    <div className="shortcuts-modal-overlay" onClick={onClose}>
      <div
        className="shortcuts-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="shortcuts-modal-header">
          <div className="shortcuts-modal-title">
            <div className="shortcuts-title-icon">
              <FontAwesomeIcon icon={faKeyboard} />
            </div>
            <div>
              <h3>Keyboard Shortcuts</h3>
              <p>Editor cockpit controls & execution hotkeys</p>
            </div>
          </div>
          <button
            type="button"
            className="shortcuts-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <div className="shortcuts-controls-row">
          <div className="shortcuts-search-wrap">
            <FontAwesomeIcon icon={faMagnifyingGlass} className="search-icon" />
            <input
              type="text"
              placeholder="Search shortcuts or keys..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            {search && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearch("")}
              >
                ✕
              </button>
            )}
          </div>

          <div className="shortcuts-tab-group">
            <button
              type="button"
              className={`shortcuts-tab ${activeTab === "all" ? "active" : ""}`}
              onClick={() => setActiveTab("all")}
            >
              All
            </button>
            {SHORTCUT_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`shortcuts-tab ${activeTab === cat.id ? "active" : ""}`}
                onClick={() => setActiveTab(cat.id)}
              >
                <FontAwesomeIcon icon={cat.icon} />
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="shortcuts-list-container">
          {filteredCategories.length === 0 ? (
            <div className="shortcuts-empty-state">
              <p>No shortcuts found matching "{search}"</p>
            </div>
          ) : (
            filteredCategories.map((cat) => (
              <div key={cat.id} className="shortcuts-category-section">
                <div className="shortcuts-category-title">
                  <FontAwesomeIcon icon={cat.icon} />
                  <span>{cat.label}</span>
                </div>
                <div className="shortcuts-table">
                  {cat.shortcuts.map((s, idx) => {
                    const keyList = isMac ? s.macKeys : s.keys;
                    return (
                      <div key={idx} className="shortcuts-row">
                        <span className="shortcut-desc">{s.desc}</span>
                        <div className="shortcut-keys">
                          {keyList.map((k, kIdx) => (
                            <React.Fragment key={kIdx}>
                              {kIdx > 0 && <span className="key-plus">+</span>}
                              <kbd className="shortcut-kbd">{k}</kbd>
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="shortcuts-modal-footer">
          <span className="shortcuts-tip">
            💡 Press <kbd className="mini-kbd">Esc</kbd> or click outside to dismiss
          </span>
          <span className="shortcuts-platform">
            Platform: {isMac ? "macOS (Command key)" : "Windows / Linux (Ctrl key)"}
          </span>
        </div>
      </div>
    </div>
  );
};
export default KeyboardShortcutsModal;
