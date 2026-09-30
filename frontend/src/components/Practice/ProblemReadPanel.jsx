import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import ReactDOM from "react-dom";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTimes,
  faClock,
  faMemory,
  faTags,
  faVial,
  faCopy,
  faCheck,
  faFileImport,
  faFileExport,
  faShieldHalved,
  faLightbulb,
  faBookOpen,
  faPlay,
  faCode,
} from "@fortawesome/free-solid-svg-icons";
import { fetchProblemById } from "../../services/api";
import { parseProblemStatement } from "../../utils/problemFormatter";
import { useNotification } from "../../contexts/NotificationContext";
import "./ProblemReadPanel.css";

export default function ProblemReadPanel({ problemId, onClose, initialProblem = null }) {
  const navigate = useNavigate();
  const { notify } = useNotification();
  const [problem, setProblem] = useState(initialProblem);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const drawerRef = useRef(null);

  // Load problem details when problemId changes
  useEffect(() => {
    if (!problemId) {
      setProblem(null);
      setError(null);
      return;
    }

    let active = true;

    // If initial problem object with complete statement matches, use it immediately
    if (
      initialProblem &&
      (initialProblem.id === problemId || initialProblem._id === problemId) &&
      (initialProblem.statement || initialProblem.description)
    ) {
      setProblem(initialProblem);
      setLoading(false);
      setError(null);
      return;
    }

    const loadDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchProblemById(problemId);
        if (!active) return;
        setProblem(data);
      } catch (err) {
        if (!active) return;
        setError(err.message || "Failed to load problem details.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadDetails();

    return () => {
      active = false;
    };
  }, [problemId, initialProblem]);

  // Handle ESC key press to close drawer
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (problemId) {
      window.addEventListener("keydown", handleKeyDown);
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [problemId, handleKeyDown]);

  // Parse raw problem statement into structured sections
  const rawStatement = problem?.statement || problem?.description || "";
  const parsed = useMemo(() => {
    return parseProblemStatement(rawStatement);
  }, [rawStatement]);

  // Sample test cases: prefer problem.testCases, fallback to parsed from statement, then example
  const sampleCases = useMemo(() => {
    if (Array.isArray(problem?.testCases) && problem.testCases.length > 0) {
      return problem.testCases.slice(0, 3).map((tc) => ({
        input: tc.input || "",
        expectedOutput: tc.expectedOutput ?? tc.output ?? "N/A",
      }));
    }
    if (Array.isArray(parsed?.sampleCases) && parsed.sampleCases.length > 0) {
      return parsed.sampleCases.slice(0, 3).map((sc) => ({
        input: sc.input || "",
        expectedOutput: sc.output || "N/A",
      }));
    }
    if (problem?.example) {
      return [{ input: problem.example, expectedOutput: "" }];
    }
    return [];
  }, [problem, parsed]);

  // Constraints: use parsed constraints or structured fallback execution limits
  const constraintsList = useMemo(() => {
    if (Array.isArray(parsed?.constraints) && parsed.constraints.length > 0) {
      return parsed.constraints;
    }
    const fallback = [];
    if (problem?.timeLimit) fallback.push(`Execution Time Limit: ${problem.timeLimit} ms`);
    if (problem?.memoryLimit) fallback.push(`Memory Limit: ${problem.memoryLimit} MB`);
    fallback.push("Standard I/O: Read from stdin, print to stdout");
    return fallback;
  }, [parsed?.constraints, problem?.timeLimit, problem?.memoryLimit]);

  const handleCopyInput = (inputStr, index) => {
    navigator.clipboard.writeText(inputStr || "");
    setCopiedIndex(index);
    if (notify) {
      notify({
        type: "success",
        title: "Copied!",
        message: `Sample ${index + 1} input copied to clipboard.`,
        duration: 1500,
      });
    }
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (!problemId) return null;

  const categoryName = problem?.category?.trim();
  const normalizedCategory = categoryName ? categoryName.toLowerCase() : "";

  const extraTags = Array.isArray(problem?.tags)
    ? problem.tags.filter(
        (t) => typeof t === "string" && t.trim() && t.trim().toLowerCase() !== normalizedCategory
      )
    : [];

  const difficultyLabel = (problem?.difficulty || "Medium").toLowerCase();

  const handleSolve = () => {
    onClose();
    navigate(`/practice/${problemId}`);
  };

  const drawerContent = (
    <div
      className="problem-read-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="presentation"
    >
      <div
        className="problem-read-drawer"
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={problem?.title ? `Read Problem: ${problem.title}` : "Read Problem"}
        tabIndex={-1}
      >
        {/* Header */}
        <header className="read-drawer-header">
          <div className="read-drawer-header-left">
            <div className="hero-kicker-tag read-drawer-kicker">
              <span className="kicker-slash">//</span>
              <span className="kicker-word">SPECIFICATION</span>
              <span className="kicker-cross">•</span>
              <span className="kicker-word word-glow-cyan">OFFLINE LAB</span>
              <span className="kicker-slash">//</span>
            </div>

            <h2 className="read-drawer-title">
              {problem?.title || (loading ? "Loading..." : "Problem Statement")}
            </h2>

            {problem && (
              <div className="read-drawer-meta-row">
                <span className={`read-badge read-diff-${difficultyLabel}`}>
                  {difficultyLabel.toUpperCase()}
                </span>

                {categoryName && (
                  <span className="read-meta-pill">
                    <FontAwesomeIcon icon={faTags} /> {categoryName}
                  </span>
                )}

                <span className="read-meta-pill">
                  <FontAwesomeIcon icon={faClock} /> {problem?.timeLimit ?? 2000}ms
                </span>

                <span className="read-meta-pill">
                  <FontAwesomeIcon icon={faMemory} /> {problem?.memoryLimit ?? 256}MB
                </span>

                {extraTags.map((tag) => (
                  <span key={tag} className="read-meta-pill">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="read-drawer-header-actions">
            <button
              type="button"
              className="read-solve-btn"
              onClick={handleSolve}
              title="Solve this problem in the interactive code editor"
            >
              <FontAwesomeIcon icon={faPlay} className="solve-btn-icon" />
              <span>Solve Challenge</span>
            </button>

            <button
              type="button"
              className="read-drawer-close-btn"
              onClick={onClose}
              aria-label="Close problem read panel"
              title="Close (Esc)"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
        </header>

        {/* Body Content */}
        {loading ? (
          <div className="read-drawer-loading">
            <div className="read-spinner" />
            <p>Loading problem specification...</p>
          </div>
        ) : error ? (
          <div className="read-drawer-error">
            <p>{error}</p>
            <button
              type="button"
              className="btn-hud-secondary"
              onClick={() => {
                setLoading(true);
                setError(null);
                fetchProblemById(problemId)
                  .then(setProblem)
                  .catch((err) => setError(err.message || "Failed to load problem details."))
                  .finally(() => setLoading(false));
              }}
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="read-drawer-body">
            {/* Description Section */}
            {parsed.description.length > 0 && (
              <section className="read-section-card">
                <div className="read-section-title">
                  <div className="dash-icon-box icon-cyan">
                    <FontAwesomeIcon icon={faBookOpen} />
                  </div>
                  <span>Problem Statement</span>
                </div>
                <div className="read-section-content">
                  {parsed.description.map((paragraph, idx) => (
                    <p key={idx} className="read-paragraph">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            )}

            {/* Input Format Section */}
            {parsed.inputFormat && parsed.inputFormat.length > 0 && (
              <section className="read-section-card">
                <div className="read-section-title">
                  <div className="dash-icon-box icon-purple">
                    <FontAwesomeIcon icon={faFileImport} />
                  </div>
                  <span>Input Format</span>
                </div>
                <div className="read-box input-format-box">
                  {parsed.inputFormat.map((paragraph, idx) => (
                    <p key={idx} className="read-paragraph">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            )}

            {/* Output Format Section */}
            {parsed.outputFormat && parsed.outputFormat.length > 0 && (
              <section className="read-section-card">
                <div className="read-section-title">
                  <div className="dash-icon-box icon-blue">
                    <FontAwesomeIcon icon={faFileExport} />
                  </div>
                  <span>Output Format</span>
                </div>
                <div className="read-box output-format-box">
                  {parsed.outputFormat.map((paragraph, idx) => (
                    <p key={idx} className="read-paragraph">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            )}

            {/* Sample Test Cases */}
            {(sampleCases.length > 0 || problem?.example) && (
              <section className="read-section-card">
                <div className="read-section-title">
                  <div className="dash-icon-box icon-emerald">
                    <FontAwesomeIcon icon={faVial} />
                  </div>
                  <span>Sample Test Cases</span>
                  {sampleCases.length > 0 && (
                    <span className="read-section-count-badge">
                      {sampleCases.length} {sampleCases.length === 1 ? "Case" : "Cases"}
                    </span>
                  )}
                </div>

                {sampleCases.length > 0 ? (
                  <div className="read-samples-list">
                    {sampleCases.map((sample, idx) => {
                      const inputVal = sample.input || "";
                      const expectedVal = sample.expectedOutput ?? sample.output ?? "N/A";

                      return (
                        <div key={idx} className="read-sample-card">
                          <div className="read-sample-header">
                            <span className="sample-case-label">Case #{idx + 1}</span>
                            <button
                              type="button"
                              className="read-copy-btn"
                              onClick={() => handleCopyInput(inputVal, idx)}
                              title="Copy input to clipboard"
                            >
                              <FontAwesomeIcon icon={copiedIndex === idx ? faCheck : faCopy} />
                              <span>{copiedIndex === idx ? "Copied" : "Copy Input"}</span>
                            </button>
                          </div>
                          <div className="read-sample-body">
                            <div className="read-sample-block">
                              <span className="read-sample-label">Input</span>
                              <pre className="read-code-block">{inputVal}</pre>
                            </div>
                            <div className="read-sample-block">
                              <span className="read-sample-label">Expected Output</span>
                              <pre className="read-code-block output-block">{expectedVal}</pre>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="read-box">
                    <pre className="read-code-block">{problem.example}</pre>
                  </div>
                )}
              </section>
            )}

            {/* Constraints Section */}
            {constraintsList && constraintsList.length > 0 && (
              <section className="read-section-card">
                <div className="read-section-title">
                  <div className="dash-icon-box icon-pink">
                    <FontAwesomeIcon icon={faShieldHalved} />
                  </div>
                  <span>Constraints & Specifications</span>
                </div>
                <div className="read-box constraints-box">
                  <ul className="constraints-list">
                    {constraintsList.map((constraintText, idx) => (
                      <li key={idx} className="constraint-item">
                        <span className="constraint-dot" />
                        <span className="constraint-text">{constraintText}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}

            {/* Note & Explanation */}
            {parsed.note && parsed.note.length > 0 && (
              <section className="read-section-card">
                <div className="read-section-title">
                  <div className="dash-icon-box icon-trophy">
                    <FontAwesomeIcon icon={faLightbulb} />
                  </div>
                  <span>Note & Explanation</span>
                </div>
                <div className="read-box note-box">
                  {parsed.note.map((paragraph, idx) => (
                    <p key={idx} className="read-paragraph">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* Footer */}
        <footer className="read-drawer-footer">
          <div className="read-drawer-footer-hint">
            <span>Press</span>
            <kbd>ESC</kbd>
            <span>or click outside to close</span>
          </div>

          <div className="read-drawer-footer-actions">
            <button
              type="button"
              className="btn-hero-action btn-action-purple"
              onClick={handleSolve}
            >
              <FontAwesomeIcon icon={faCode} />
              <span>Launch Editor</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? ReactDOM.createPortal(drawerContent, document.body)
    : drawerContent;
}
