import { useState, useEffect } from "react";
import Modal from "../ui/Modal";

/**
 * ConflictModal
 * Shows pending sync conflicts and allows resolution
 */
export default function ConflictModal({ onClose, onResolve }) {
  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConflicts();
  }, []);

  const loadConflicts = async () => {
    try {
      const result = await window.electronAPI?.sync?.getConflicts?.();
      if (result?.success) {
        setConflicts(result.data);
      }
    } catch (err) {
      console.error("Error loading conflicts:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (conflictID, resolution) => {
    let winnerData = null;
    if (resolution === 'keep_local') {
      const conflict = conflicts.find(c => c.ConflictID === conflictID);
      winnerData = JSON.parse(conflict.LocalData);
    } else if (resolution === 'keep_remote') {
      const conflict = conflicts.find(c => c.ConflictID === conflictID);
      winnerData = JSON.parse(conflict.RemoteData);
    }

    try {
      const result = await window.electronAPI?.sync?.resolveConflict?.(conflictID, resolution, winnerData);
      if (result?.success) {
        setConflicts(prev => prev.filter(c => c.ConflictID !== conflictID));
        onResolve();
      }
    } catch (err) {
      console.error("Error resolving conflict:", err);
    }
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleString();
  };

  return (
    <Modal onClose={onClose}>
      <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.25)", maxWidth: 600 }}>
        {/* Header */}
        <div style={{ background: "#92400e", padding: "22px 28px" }}>
          <div style={{ color: "#fcd34d", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
            Sync Conflicts
          </div>
          <div style={{ color: "#f8fafc", fontSize: 18, fontWeight: 700 }}>
            {conflicts.length} conflict(s) found
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "24px 28px", maxHeight: 400, overflowY: "auto" }}>
          {loading ? (
            <div style={{ padding: "20px", textAlign: "center", color: "#94a3b8" }}>Loading conflicts...</div>
          ) : conflicts.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: "#065f46" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
              <div style={{ fontWeight: 600 }}>No pending conflicts</div>
            </div>
          ) : (
            conflicts.map((conflict) => {
              const localData = conflict.LocalData ? JSON.parse(conflict.LocalData) : null;
              const remoteData = conflict.RemoteData ? JSON.parse(conflict.RemoteData) : null;

              return (
                <div
                  key={conflict.ConflictID}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: 10,
                    padding: 16,
                    marginBottom: 14,
                  }}
                >
                  {/* Conflict header */}
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>
                        {conflict.TableName}
                      </span>
                      <span style={{ fontFamily: "monospace", color: "#64748b", fontSize: 12, marginLeft: 8 }}>
                        {conflict.RecordID}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>
                      {formatDate(conflict.CreatedAt)}
                    </span>
                  </div>

                  {/* Side-by-side comparison */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                    <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 6, padding: 10 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#0369a1", textTransform: "uppercase", marginBottom: 6 }}>
                        Local
                      </div>
                      <div style={{ fontSize: 12, fontFamily: "monospace", color: "#0f172a", wordBreak: "break-all" }}>
                        {localData ? JSON.stringify(localData, null, 0).slice(0, 150) : '—'}
                      </div>
                      <div style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>
                        {formatDate(conflict.LocalTimestamp)}
                      </div>
                    </div>
                    <div style={{ background: "#fefce8", border: "1px solid #fde68a", borderRadius: 6, padding: 10 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#92400e", textTransform: "uppercase", marginBottom: 6 }}>
                        Remote
                      </div>
                      <div style={{ fontSize: 12, fontFamily: "monospace", color: "#0f172a", wordBreak: "break-all" }}>
                        {remoteData ? JSON.stringify(remoteData, null, 0).slice(0, 150) : '—'}
                      </div>
                      <div style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>
                        {formatDate(conflict.RemoteTimestamp)}
                      </div>
                    </div>
                  </div>

                  {/* Resolution buttons */}
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={() => handleResolve(conflict.ConflictID, 'keep_local')}
                      style={{ flex: 1, padding: "7px", borderRadius: 6, border: "1px solid #3b82f6", background: "#fff", color: "#3b82f6", fontWeight: 600, fontSize: 12, cursor: "pointer" }}
                    >
                      Keep Local
                    </button>
                    <button
                      onClick={() => handleResolve(conflict.ConflictID, 'keep_remote')}
                      style={{ flex: 1, padding: "7px", borderRadius: 6, border: "1px solid #f59e0b", background: "#fff", color: "#92400e", fontWeight: 600, fontSize: 12, cursor: "pointer" }}
                    >
                      Keep Remote
                    </button>
                    <button
                      onClick={() => handleResolve(conflict.ConflictID, 'dismissed')}
                      style={{ flex: 1, padding: "7px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", fontWeight: 600, fontSize: 12, cursor: "pointer" }}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 28px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{ padding: "9px 20px", borderRadius: 8, border: "2px solid #e2e8f0", background: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer", color: "#475569" }}
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
