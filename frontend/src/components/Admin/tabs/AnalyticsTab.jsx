import React, { useState, useEffect, useRef, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartColumn,
  faChartLine,
  faGlobe,
  faLayerGroup,
  faUser,
  faCheck,
  faMagnifyingGlass,
  faRotate,
  faShieldHalved,
  faTerminal,
  faBolt
} from "@fortawesome/free-solid-svg-icons";

export default function AnalyticsTab({
  analyticsData,
  isAnalyticsLoading,
  fetchAnalytics,
  handleCopyIp,
  handleFilterByIp,
  copiedIp,
  auditLogs = [],
  auditTotal = 0,
  auditCategory = "ALL",
  setAuditCategory,
  auditSeverity = "ALL",
  setAuditSeverity,
  auditMethod = "ALL",
  setAuditMethod,
  auditSearch = "",
  setAuditSearch,
  auditLoading = false,
  fetchAuditLogs,
  expandedAuditId,
  setExpandedAuditId,
}) {
  const logsRef = useRef(null);
  const [localSearch, setLocalSearch] = useState(auditSearch);
  const [isLiveStreaming, setIsLiveStreaming] = useState(true);

  // Sync incoming search state
  useEffect(() => {
    setLocalSearch(auditSearch);
  }, [auditSearch]);

  // Unified logs list: priority to live auditLogs from stream, fallback to analyticsData snapshot logs
  const logsList = useMemo(() => {
    if (auditLogs && auditLogs.length > 0) return auditLogs;
    if (analyticsData?.recentLogs && analyticsData.recentLogs.length > 0) return analyticsData.recentLogs;
    return [];
  }, [auditLogs, analyticsData]);

  // Live Auto-Stream: automatically refresh logs every 4 seconds when live streaming is enabled
  useEffect(() => {
    if (!isLiveStreaming || !fetchAuditLogs) return;

    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      fetchAuditLogs(auditCategory, auditSeverity, auditMethod, auditSearch);
    }, 4000);

    return () => clearInterval(timer);
  }, [isLiveStreaming, fetchAuditLogs, auditCategory, auditSeverity, auditMethod, auditSearch]);

  // Handle local in-page IP filter
  const handleFilterIpInPage = (ip, e) => {
    if (e) e.stopPropagation();
    if (setAuditSearch) setAuditSearch(ip);
    if (fetchAuditLogs) fetchAuditLogs(auditCategory, auditSeverity, auditMethod, ip);
    setTimeout(() => {
      logsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const handleRefreshAll = () => {
    if (fetchAnalytics) fetchAnalytics();
    if (fetchAuditLogs) fetchAuditLogs(auditCategory, auditSeverity, auditMethod, auditSearch);
  };

  const handleClearFilters = () => {
    if (setAuditSearch) setAuditSearch("");
    if (setAuditCategory) setAuditCategory("ALL");
    if (setAuditSeverity) setAuditSeverity("ALL");
    if (setAuditMethod) setAuditMethod("ALL");
    if (fetchAuditLogs) fetchAuditLogs("ALL", "ALL", "ALL", "");
  };

  return (
    <div className="admin-analytics-section">
      {/* Analytics Header Panel */}
      <div className="analytics-header-panel glass-panel">
        <div className="analytics-title-wrap">
          <div className="pre-heading">REAL-TIME TRAFFIC & USER BEHAVIOR INTELLIGENCE</div>
          <h3>
            <FontAwesomeIcon icon={faChartColumn} /> Live Platform Surfing & Traffic Analytics
          </h3>
          <p>Real-time active users, route hit volume, dwell times, origin IP telemetry, and live execution logs.</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            type="button"
            className="refresh-btn"
            onClick={handleRefreshAll}
            disabled={isAnalyticsLoading || auditLoading}
            title="Refresh analytics and platform logs"
          >
            <FontAwesomeIcon icon={faRotate} className={(isAnalyticsLoading || auditLoading) ? "fa-spin" : ""} />{" "}
            Refresh Analytics & Logs
          </button>
        </div>
      </div>

      {/* Summary Scorecards */}
      <div className="analytics-kpi-grid">
        <div className="analytics-kpi-card glass-panel">
          <span className="kpi-tag-label">SURFING NOW</span>
          <div className="kpi-big-num cyan">{analyticsData?.activeUsersNow ?? 0}</div>
          <span className="kpi-footnote">Active clients in rolling 3m window</span>
        </div>
        <div className="analytics-kpi-card glass-panel">
          <span className="kpi-tag-label">TOTAL REQUESTS</span>
          <div className="kpi-big-num green">{analyticsData?.totalPageViews ?? 0}</div>
          <span className="kpi-footnote">Aggregated API & gateway hits</span>
        </div>
        <div className="analytics-kpi-card glass-panel">
          <span className="kpi-tag-label">TOTAL SESSIONS</span>
          <div className="kpi-big-num purple">{analyticsData?.totalSessions ?? 0}</div>
          <span className="kpi-footnote">Total unique sessions recorded</span>
        </div>
        <div className="analytics-kpi-card glass-panel">
          <span className="kpi-tag-label">AVG ROUTE DWELL</span>
          <div className="kpi-big-num gold">{analyticsData?.avgSurfingSeconds ?? 48}s</div>
          <span className="kpi-footnote">Session focus engagement duration</span>
        </div>
      </div>

      {/* 2-Column Deck: Top Routes vs 24h Timeline Chart */}
      <div className="analytics-split-layout">
        {/* Column 1: Top Visited Routes */}
        <div className="telemetry-card glass-panel top-routes-card">
          <div className="card-header">
            <div>
              <h3>Top Platform Routes Visited</h3>
              <span className="telemetry-subtext">Highest traffic endpoints & views</span>
            </div>
            <span className="telemetry-tag tag-cyan">PAGE POPULARITY</span>
          </div>

          <div className="top-routes-list">
            {(!analyticsData?.topPages || analyticsData.topPages.length === 0) ? (
              <div style={{ color: '#8494ad', padding: '20px', textAlign: 'center', fontSize: '0.85rem' }}>
                No routes visited yet. Live traffic will appear here.
              </div>
            ) : (
              (analyticsData?.topPages || []).map((r, i) => (
                <div key={r.path || i} className="route-stat-item">
                  <div className="route-item-head">
                    <span className="route-rank">#{i + 1}</span>
                    <code className="route-path">{r.path}</code>
                    <span className="route-hits">{r.hits} hits</span>
                  </div>
                  <div className="route-progress-track">
                    <div
                      className="route-progress-fill"
                      style={{
                        width: `${Math.min(
                          100,
                          (r.hits / Math.max(1, analyticsData?.totalPageViews || 1)) * 100 * 3
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 2: 24h Traffic Timeline Chart + Method Breakdown */}
        <div className="analytics-right-col">
          {/* SVG Traffic Timeline Chart */}
          <div className="telemetry-card glass-panel timeline-card">
            <div className="card-header">
              <div>
                <h3>
                  <FontAwesomeIcon icon={faChartLine} /> 24-Hour Surfing & Traffic Timeline
                </h3>
                <span className="telemetry-subtext">Hourly distribution of requests</span>
              </div>
              <span className="telemetry-tag tag-cyan">HOURLY TREND</span>
            </div>

            <div className="svg-chart-container">
              <svg className="traffic-svg-chart" viewBox="0 0 520 180" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="cyberAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.45" />
                    <stop offset="65%" stopColor="#0088ff" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="#0088ff" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid lines */}
                <line x1="20" y1="30" x2="500" y2="30" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                <line x1="20" y1="75" x2="500" y2="75" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                <line x1="20" y1="120" x2="500" y2="120" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                <line x1="20" y1="150" x2="500" y2="150" stroke="rgba(255,255,255,0.15)" />

                {(() => {
                  const timeline = analyticsData?.hourlyTimeline || [];
                  if (timeline.length === 0) return null;
                  const maxHits = Math.max(1, ...timeline.map((t) => t.hits));
                  const points = timeline.map((t, i) => {
                    const x = 30 + i * (460 / Math.max(1, timeline.length - 1));
                    const y = 140 - (t.hits / maxHits) * 110;
                    return { x, y, hit: t.hits, hour: t.hour, users: t.activeUsers };
                  });

                  const pathD = points.reduce(
                    (acc, p, i) => `${acc} ${i === 0 ? "M" : "L"} ${p.x} ${p.y}`,
                    ""
                  );
                  const areaD = `${pathD} L ${points[points.length - 1].x} 150 L ${points[0].x} 150 Z`;

                  return (
                    <>
                      <path d={areaD} fill="url(#cyberAreaGrad)" />
                      <path d={pathD} fill="none" stroke="#00e5ff" strokeWidth="2.5" strokeLinecap="round" />
                      {points.map((p, idx) => (
                        <g key={idx} className="chart-point-group">
                          <circle cx={p.x} cy={p.y} r="4" fill="#020912" stroke="#00e5ff" strokeWidth="2" />
                          <title>{`${p.hour} - ${p.hit} hits (${p.users} active surfers)`}</title>
                        </g>
                      ))}
                    </>
                  );
                })()}
              </svg>

              <div className="chart-x-labels">
                {(analyticsData?.hourlyTimeline || [])
                  .filter((_, i) => i % 2 === 0)
                  .map((t) => (
                    <span key={t.hour} className="x-label">
                      {t.hour}
                    </span>
                  ))}
              </div>
            </div>
          </div>

          {/* HTTP Method Breakdown */}
          <div className="telemetry-card glass-panel method-breakdown-card">
            <div className="card-header">
              <div>
                <h3>
                  <FontAwesomeIcon icon={faLayerGroup} /> HTTP Method Breakdown
                </h3>
                <span className="telemetry-subtext">Mutations vs static query distribution</span>
              </div>
              <span className="telemetry-tag tag-cyan">VERB RATIO</span>
            </div>

            {(() => {
              const mb = analyticsData?.methodBreakdown || { GET: 1, POST: 1 };
              const total = Object.values(mb).reduce((a, b) => a + b, 0) || 1;
              const getPct = (((mb.GET || 0) / total) * 100).toFixed(1);
              const postPct = (((mb.POST || 0) / total) * 100).toFixed(1);
              const putPct = (((mb.PUT || 0) / total) * 100).toFixed(1);
              const delPct = (((mb.DELETE || 0) / total) * 100).toFixed(1);

              return (
                <div className="method-bar-deck">
                  <div className="multi-segmented-bar">
                    <div className="segment seg-get" style={{ width: `${getPct}%` }} title={`GET: ${getPct}%`} />
                    <div className="segment seg-post" style={{ width: `${postPct}%` }} title={`POST: ${postPct}%`} />
                    <div className="segment seg-put" style={{ width: `${putPct}%` }} title={`PUT: ${putPct}%`} />
                    <div className="segment seg-delete" style={{ width: `${delPct}%` }} title={`DELETE: ${delPct}%`} />
                  </div>

                  <div className="method-chips-grid">
                    <div className="method-chip-item chip-get">
                      <span className="m-tag">GET</span>
                      <strong>{mb.GET || 0}</strong>
                      <small>({getPct}%)</small>
                    </div>
                    <div className="method-chip-item chip-post">
                      <span className="m-tag">POST</span>
                      <strong>{mb.POST || 0}</strong>
                      <small>({postPct}%)</small>
                    </div>
                    <div className="method-chip-item chip-put">
                      <span className="m-tag">PUT</span>
                      <strong>{mb.PUT || 0}</strong>
                      <small>({putPct}%)</small>
                    </div>
                    <div className="method-chip-item chip-del">
                      <span className="m-tag">DELETE</span>
                      <strong>{mb.DELETE || 0}</strong>
                      <small>({delPct}%)</small>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Middle Deck: Top Origin Client IPs */}
      <div className="admin-section" style={{ marginTop: "24px" }}>
        <div className="telemetry-card glass-panel ip-origins-card">
          <div className="card-header">
            <div>
              <h3>
                <FontAwesomeIcon icon={faGlobe} /> Client Origin IP Distribution
              </h3>
              <span className="telemetry-subtext">
                Active remote IP addresses surfing managed nodes, dominant method & latest route
              </span>
            </div>
            <span className="telemetry-tag tag-cyan">ORIGIN TELEMETRY</span>
          </div>

          <div className="ip-origins-table-wrap">
            <table className="ip-origins-table">
              <thead>
                <tr>
                  <th>Origin IP Address</th>
                  <th>Requests / Hits</th>
                  <th>Dominant Method</th>
                  <th>Top Visited Route</th>
                  <th>Last Seen</th>
                  <th>Combatant Identity</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {(!analyticsData?.topIpOrigins || analyticsData.topIpOrigins.length === 0) ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "28px", color: "#8494ad", fontSize: "0.85rem" }}>
                      No origin client IP activity recorded yet. Live telemetry will populate automatically.
                    </td>
                  </tr>
                ) : (
                  analyticsData?.topIpOrigins?.map((rec) => (
                    <tr key={rec.ip}>
                      <td>
                        <span
                          className={`ip-chip ${rec.ip === "127.0.0.1" ? "ip-local" : "ip-remote"}`}
                          onClick={(e) => handleCopyIp(rec.ip, e)}
                          title="Click to copy IP"
                        >
                          <FontAwesomeIcon icon={faGlobe} /> {rec.ip}
                          {copiedIp === rec.ip && (
                            <span className="copied-tag">
                              <FontAwesomeIcon icon={faCheck} />
                            </span>
                          )}
                        </span>
                      </td>
                      <td>
                        <strong className="cyan-text">{rec.totalRequests}</strong> hits
                      </td>
                      <td>
                        <span className={`method-badge meth-${rec.primaryMethod?.toLowerCase() || 'get'}`}>
                          {rec.primaryMethod || 'GET'}
                        </span>
                      </td>
                      <td>
                        <code>{rec.topPath}</code>
                      </td>
                      <td>{rec.lastSeen}</td>
                      <td>
                        {rec.username ? (
                          <strong className="green-text">
                            <FontAwesomeIcon icon={faUser} /> {rec.username}
                          </strong>
                        ) : (
                          <span style={{ color: "#94a3b8" }}>Guest Visitor</span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="inspect-ip-btn"
                          onClick={(e) => handleFilterIpInPage(rec.ip, e)}
                          title="Filter live platform logs for this IP"
                        >
                          <FontAwesomeIcon icon={faMagnifyingGlass} /> Filter Logs Below
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 🚀 Bottom Deck: Comprehensive Live Platform Event & Execution Logs Stream */}
      <div ref={logsRef} className="admin-section" style={{ marginTop: "28px" }} id="analytics-live-logs">
        {/* Header Panel */}
        <div className="audit-header-panel glass-panel">
          <div className="audit-title-wrap">
            <div className="pre-heading">FULL PLATFORM AUDIT TRAIL & LOG STREAM</div>
            <h3>
              <FontAwesomeIcon icon={faShieldHalved} /> Live Unified Platform Logs Stream
            </h3>
            <p>
              Capturing <strong>every log</strong> in real-time across HTTP traffic, WebSockets, system errors, auth clearances, and code executions.
            </p>
          </div>
          <div className="audit-controls-wrap">
            {/* Live stream toggle */}
            <button
              type="button"
              className={`preset-btn ${isLiveStreaming ? "active" : ""}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                borderColor: isLiveStreaming ? "#00e5ff" : "rgba(255,255,255,0.15)",
                color: isLiveStreaming ? "#00e5ff" : "#94a3b8",
                background: isLiveStreaming ? "rgba(0, 229, 255, 0.12)" : "transparent",
              }}
              onClick={() => setIsLiveStreaming(!isLiveStreaming)}
              title={isLiveStreaming ? "Pause auto-streaming" : "Resume live log streaming"}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: isLiveStreaming ? "#00e5ff" : "#64748b",
                  boxShadow: isLiveStreaming ? "0 0 8px #00e5ff" : "none",
                  display: "inline-block",
                }}
              />
              {isLiveStreaming ? "STREAMING LIVE" : "STREAM PAUSED"}
            </button>

            {/* Search Input */}
            <div className="search-input-wrap">
              <FontAwesomeIcon icon={faMagnifyingGlass} className="search-icon" />
              <input
                type="text"
                className="audit-search-input"
                placeholder="Search actions, IPs, status codes, routes, or errors..."
                value={localSearch}
                onChange={(e) => {
                  setLocalSearch(e.target.value);
                  if (setAuditSearch) setAuditSearch(e.target.value);
                  if (fetchAuditLogs) fetchAuditLogs(auditCategory, auditSeverity, auditMethod, e.target.value);
                }}
              />
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              className="refresh-btn"
              onClick={() => {
                if (fetchAuditLogs) fetchAuditLogs(auditCategory, auditSeverity, auditMethod, localSearch);
              }}
              disabled={auditLoading}
              title="Refresh logs immediately"
            >
              <FontAwesomeIcon icon={faRotate} className={auditLoading ? "fa-spin" : ""} />{" "}
              {auditLoading ? "Syncing..." : "Refresh"}
            </button>
          </div>
        </div>

        {/* Filter Pills Bar */}
        <div className="audit-filters-bar glass-panel">
          <div className="filter-group">
            <span className="filter-group-label">Category:</span>
            {[
              "ALL",
              "HTTP_TRAFFIC",
              "WEBSOCKET",
              "AUTH",
              "SECURITY",
              "SUBMISSION",
              "BATTLE",
              "SYSTEM",
              "ADMIN",
              "FLEET",
              "LINUX_TELEMETRY",
              "PAGE_VIEW",
            ].map((cat) => (
              <button
                key={cat}
                type="button"
                className={`audit-filter-pill ${auditCategory === cat ? "active" : ""}`}
                onClick={() => {
                  if (setAuditCategory) setAuditCategory(cat);
                  if (fetchAuditLogs) fetchAuditLogs(cat, auditSeverity, auditMethod, localSearch);
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="filter-group">
            <span className="filter-group-label">Method:</span>
            {["ALL", "GET", "POST", "PUT", "DELETE", "WS", "EVENT"].map((meth) => (
              <button
                key={meth}
                type="button"
                className={`audit-filter-pill meth-${meth.toLowerCase()} ${
                  auditMethod === meth ? "active" : ""
                }`}
                onClick={() => {
                  if (setAuditMethod) setAuditMethod(meth);
                  if (fetchAuditLogs) fetchAuditLogs(auditCategory, auditSeverity, meth, localSearch);
                }}
              >
                {meth}
              </button>
            ))}
          </div>

          <div className="filter-group" style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "5px", flexWrap: "wrap" }}>
              <span className="filter-group-label">Severity:</span>
              {["ALL", "INFO", "WARN", "ERROR", "CRITICAL"].map((sev) => (
                <button
                  key={sev}
                  type="button"
                  className={`audit-filter-pill sev-${sev.toLowerCase()} ${
                    auditSeverity === sev ? "active" : ""
                  }`}
                  onClick={() => {
                    if (setAuditSeverity) setAuditSeverity(sev);
                    if (fetchAuditLogs) fetchAuditLogs(auditCategory, sev, auditMethod, localSearch);
                  }}
                >
                  {sev}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "0.72rem", color: "#8494ad", fontFamily: "'Space Grotesk', sans-serif" }}>
                Logs Count: <strong style={{ color: "#00e5ff" }}>{logsList.length}</strong> {auditTotal > 0 && `of ${auditTotal}`}
              </span>
              {(auditCategory !== "ALL" || auditSeverity !== "ALL" || auditMethod !== "ALL" || localSearch) && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  style={{
                    background: "rgba(239, 68, 68, 0.12)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    color: "#f87171",
                    fontSize: "0.68rem",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  Reset Filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Audit Stream Table */}
        <div className="audit-table-wrapper glass-panel">
          {logsList.length === 0 ? (
            <div className="no-audit-notice" style={{ padding: "40px 20px", textAlign: "center" }}>
              <FontAwesomeIcon icon={faTerminal} style={{ fontSize: "2rem", color: "#334155", marginBottom: "12px" }} />
              <div style={{ color: "#94a3b8", fontSize: "0.9rem", fontWeight: 600 }}>
                No log records found matching current criteria.
              </div>
              <p style={{ color: "#64748b", fontSize: "0.78rem", marginTop: "4px" }}>
                Live HTTP traffic, WebSocket connections, errors, and system events will stream in automatically.
              </p>
              {(auditCategory !== "ALL" || auditSeverity !== "ALL" || auditMethod !== "ALL" || localSearch) && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="inspect-ip-btn"
                  style={{ marginTop: "12px" }}
                >
                  Clear All Filters
                </button>
              )}
            </div>
          ) : (
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Method</th>
                  <th>Origin IP</th>
                  <th>Category</th>
                  <th>Severity</th>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {logsList.map((entry) => (
                  <React.Fragment key={entry.id || `${entry.timestamp}_${entry.action}`}>
                    <tr
                      className={`audit-row ${expandedAuditId === entry.id ? "is-expanded" : ""}`}
                      onClick={() =>
                        setExpandedAuditId && setExpandedAuditId(expandedAuditId === entry.id ? null : entry.id)
                      }
                      title="Click to expand log metadata & payload"
                    >
                      <td className="audit-time-cell">
                        {new Date(entry.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>
                      <td>
                        <span
                          className={`method-badge meth-${(entry.method || "EVENT").toLowerCase()}`}
                        >
                          {entry.method || "EVENT"}
                        </span>
                      </td>
                      <td className="audit-ip-cell">
                        <span
                          className={`ip-chip ${
                            entry.ip === "127.0.0.1" ? "ip-local" : "ip-remote"
                          }`}
                          title="Click to copy IP"
                          onClick={(e) => handleCopyIp(entry.ip || "127.0.0.1", e)}
                        >
                          <FontAwesomeIcon icon={faGlobe} /> {entry.ip || "127.0.0.1"}
                          {copiedIp === entry.ip && (
                            <span className="copied-tag">
                              <FontAwesomeIcon icon={faCheck} />
                            </span>
                          )}
                        </span>
                      </td>
                      <td>
                        <span className={`cat-chip cat-${(entry.category || "SYSTEM").toLowerCase()}`}>
                          {entry.category}
                        </span>
                      </td>
                      <td>
                        <span className={`sev-badge sev-${(entry.severity || "INFO").toLowerCase()}`}>
                          {entry.severity}
                        </span>
                      </td>
                      <td className="audit-action-cell">
                        <strong>{entry.action}</strong>
                      </td>
                      <td className="audit-actor-cell">{entry.actor}</td>
                      <td className="audit-detail-cell" style={{ maxWidth: "340px", wordBreak: "break-word" }}>
                        {entry.details}
                      </td>
                    </tr>
                    {expandedAuditId === entry.id && (
                      <tr className="audit-meta-row">
                        <td colSpan={8}>
                          <div className="audit-meta-card">
                            <div className="audit-meta-header">
                              <span>
                                Client IP Origin: <strong>{entry.ip || "127.0.0.1"}</strong>
                              </span>
                              <span>
                                Method: <strong>{entry.method || "EVENT"}</strong>
                              </span>
                              <span>
                                Timestamp: <strong>{new Date(entry.timestamp).toLocaleString()}</strong>
                              </span>
                              <button
                                type="button"
                                className="filter-by-ip-btn"
                                onClick={(e) => handleFilterIpInPage(entry.ip || "127.0.0.1", e)}
                              >
                                <FontAwesomeIcon icon={faMagnifyingGlass} /> Filter Logs for this IP
                              </button>
                            </div>
                            {entry.metadata && (
                              <>
                                <strong className="payload-heading">Metadata & Execution Payload:</strong>
                                <pre className="payload-json">
                                  {JSON.stringify(entry.metadata, null, 2)}
                                </pre>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
