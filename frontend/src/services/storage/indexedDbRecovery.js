/**
 * Client-Side Crash-Proof Recovery Layer (IndexedDB)
 * Ensures user code and progress during Battles, Quizzes, and Exams
 * is never lost even during unexpected browser crashes, tab reloads,
 * or temporary Redis/WebSocket outages.
 */

const DB_NAME = "algofight_recovery_db";
const DB_VERSION = 1;
const DRAFTS_STORE = "drafts";

let dbPromise = null;

function getDraftKey(activityType, activityId, problemId, userId) {
  return `${activityType || "battle"}_${activityId || "default"}_${problemId || "p0"}_${userId || "anon"}`;
}

function openDatabase() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB is not available in this environment."));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(DRAFTS_STORE)) {
        const store = db.createObjectStore(DRAFTS_STORE, { keyPath: "draftKey" });
        store.createIndex("activityId", "activityId", { unique: false });
        store.createIndex("updatedAt", "updatedAt", { unique: false });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      console.error("Failed to open IndexedDB:", event.target.error);
      reject(event.target.error);
    };
  });

  return dbPromise;
}

/**
 * Save draft locally with optimistic monotonic revision tracking.
 */
export async function saveLocalDraft({
  activityType = "battle",
  activityId,
  problemId,
  userId,
  code,
  language = "javascript",
}) {
  const draftKey = getDraftKey(activityType, activityId, problemId, userId);
  const now = Date.now();

  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([DRAFTS_STORE], "readwrite");
      const store = tx.objectStore(DRAFTS_STORE);
      const getReq = store.get(draftKey);

      getReq.onsuccess = () => {
        const existing = getReq.result;
        const localRevision = (existing?.localRevision || 0) + 1;
        const lastAckedRevision = existing?.lastAckedRevision || 0;

        const record = {
          draftKey,
          activityType,
          activityId,
          problemId,
          userId,
          code,
          language,
          localRevision,
          lastAckedRevision,
          syncStatus: "pending_sync",
          updatedAt: now,
        };

        const putReq = store.put(record);
        putReq.onsuccess = () => resolve(record);
        putReq.onerror = () => reject(putReq.error);
      };

      getReq.onerror = () => reject(getReq.error);
    });
  } catch (err) {
    // Graceful fallback to localStorage
    try {
      const key = `af_draft_${draftKey}`;
      const existing = JSON.parse(localStorage.getItem(key) || "{}");
      const localRevision = (existing.localRevision || 0) + 1;
      const record = {
        draftKey,
        activityType,
        activityId,
        problemId,
        userId,
        code,
        language,
        localRevision,
        lastAckedRevision: existing.lastAckedRevision || 0,
        syncStatus: "pending_sync",
        updatedAt: now,
      };
      localStorage.setItem(key, JSON.stringify(record));
      return record;
    } catch {
      return null;
    }
  }
}

/**
 * Marks server acknowledgment of a sync revision.
 */
export async function markDraftAcked({ draftKey, revision }) {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction([DRAFTS_STORE], "readwrite");
      const store = tx.objectStore(DRAFTS_STORE);
      const getReq = store.get(draftKey);

      getReq.onsuccess = () => {
        const record = getReq.result;
        if (record) {
          record.lastAckedRevision = Math.max(record.lastAckedRevision || 0, revision);
          if (record.lastAckedRevision >= record.localRevision) {
            record.syncStatus = "synced";
          }
          store.put(record);
        }
        resolve(true);
      };

      getReq.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

/**
 * Updates sync status (e.g. 'degraded', 'pending_sync', 'synced').
 */
export async function setDraftSyncStatus(draftKey, status) {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction([DRAFTS_STORE], "readwrite");
      const store = tx.objectStore(DRAFTS_STORE);
      const getReq = store.get(draftKey);

      getReq.onsuccess = () => {
        const record = getReq.result;
        if (record) {
          record.syncStatus = status;
          store.put(record);
        }
        resolve(true);
      };

      getReq.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

/**
 * Retrieves the local draft for quick recovery on mount or tab reconnect.
 */
export async function getLocalDraft(activityType, activityId, problemId, userId) {
  const draftKey = getDraftKey(activityType, activityId, problemId, userId);

  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction([DRAFTS_STORE], "readonly");
      const store = tx.objectStore(DRAFTS_STORE);
      const req = store.get(draftKey);

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    try {
      const key = `af_draft_${draftKey}`;
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}

/**
 * Retrieves all local drafts for a given activity/battle room across all problems.
 * Returns an object keyed by problemId: { [problemId]: draftRecord }
 */
export async function getAllLocalDrafts(activityType, activityId, userId) {
  const result = {};
  if (!activityId || !userId) return result;

  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction([DRAFTS_STORE], "readonly");
      const store = tx.objectStore(DRAFTS_STORE);
      const index = store.index("activityId");
      const req = index.getAll(activityId);

      req.onsuccess = () => {
        const records = req.result || [];
        for (const rec of records) {
          if (rec.userId === userId && (!activityType || rec.activityType === activityType)) {
            result[rec.problemId] = rec;
          }
        }
        resolve(result);
      };

      req.onerror = () => {
        // Fallback to localStorage scan
        resolve(getAllLocalStorageDrafts(activityType, activityId, userId));
      };
    });
  } catch {
    return getAllLocalStorageDrafts(activityType, activityId, userId);
  }
}

function getAllLocalStorageDrafts(activityType, activityId, userId) {
  const result = {};
  try {
    const prefix = `af_draft_${activityType || "battle"}_${activityId}_`;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix) && k.endsWith(`_${userId}`)) {
        const parts = k.slice(prefix.length).split(`_${userId}`);
        const pId = parts[0];
        const raw = localStorage.getItem(k);
        if (raw) {
          try {
            result[pId] = JSON.parse(raw);
          } catch (_) {}
        }
      }
    }
  } catch (_) {}
  return result;
}

/**
 * Saves multiple problem drafts in a single transaction.
 */
export async function saveAllLocalDrafts({ activityType = "battle", activityId, userId, checkpoints = {} }) {
  if (!activityId || !userId || !checkpoints) return;
  const now = Date.now();

  try {
    const db = await openDatabase();
    const tx = db.transaction([DRAFTS_STORE], "readwrite");
    const store = tx.objectStore(DRAFTS_STORE);

    for (const [probId, cp] of Object.entries(checkpoints)) {
      if (!cp) continue;
      const draftKey = getDraftKey(activityType, activityId, probId, userId);
      const record = {
        draftKey,
        activityType,
        activityId,
        problemId: probId,
        userId,
        code: cp.code || "",
        language: cp.language || "javascript",
        localRevision: cp.revision || 1,
        lastAckedRevision: cp.lastAckedRevision || 0,
        syncStatus: cp.syncStatus || "synced",
        updatedAt: cp.updatedAt || now,
      };
      store.put(record);
      // Backup to localStorage
      try {
        localStorage.setItem(`af_draft_${draftKey}`, JSON.stringify(record));
      } catch (_) {}
    }
  } catch (err) {
    for (const [probId, cp] of Object.entries(checkpoints)) {
      if (!cp) continue;
      const draftKey = getDraftKey(activityType, activityId, probId, userId);
      try {
        localStorage.setItem(`af_draft_${draftKey}`, JSON.stringify({
          draftKey,
          activityType,
          activityId,
          problemId: probId,
          userId,
          code: cp.code || "",
          language: cp.language || "javascript",
          localRevision: cp.revision || 1,
          updatedAt: cp.updatedAt || now,
        }));
      } catch (_) {}
    }
  }
}

/**
 * Deterministically reconciles a local draft with a server checkpoint.
 * Higher revision wins. If equal, higher updatedAt wins. If equal, server wins.
 */
export function reconcileCheckpoints(local, server) {
  if (!local && !server) return null;
  if (!local) return server;
  if (!server) return local;

  const localRev = Number(local.revision ?? local.localRevision ?? 0);
  const serverRev = Number(server.revision ?? 0);

  if (localRev > serverRev) return local;
  if (serverRev > localRev) return server;

  const localUpdated = Number(local.updatedAt ?? 0);
  const serverUpdated = Number(server.updatedAt ?? 0);

  if (localUpdated > serverUpdated) return local;
  return server;
}

/**
 * Clears local draft when a problem draft is explicitly reset.
 */
export async function clearDraft(activityType, activityId, problemId, userId) {
  const draftKey = getDraftKey(activityType, activityId, problemId, userId);

  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction([DRAFTS_STORE], "readwrite");
      const store = tx.objectStore(DRAFTS_STORE);
      const req = store.delete(draftKey);

      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch {
    try {
      localStorage.removeItem(`af_draft_${draftKey}`);
      return true;
    } catch {
      return false;
    }
  }
}

