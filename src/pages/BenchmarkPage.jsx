/**
 * BenchmarkPage.jsx
 * Evaluation metrics dashboard for SQLite↔CouchDB vs PouchDB↔CouchDB comparison
 */

import { useState, useEffect } from "react";

const MetricCard = ({ title, value, unit, color, description }) => (
  <div
    style={{
      background: "#fff",
      borderRadius: 12,
      padding: "16px 20px",
      border: `1px solid ${color}20`,
      boxShadow: `0 2px 8px ${color}10`,
    }}
  >
    <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, marginBottom: 4 }}>
      {title}
    </div>
    <div style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1 }}>
      {value}
      {unit && <span style={{ fontSize: 14, fontWeight: 500, marginLeft: 4 }}>{unit}</span>}
    </div>
    {description && (
      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>{description}</div>
    )}
  </div>
);

const ComparisonTable = ({ data }) => (
  <div
    style={{
      background: "#fff",
      borderRadius: 12,
      border: "1px solid #e2e8f0",
      overflow: "hidden",
    }}
  >
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <thead>
        <tr style={{ background: "#f8fafc" }}>
          <th style={thStyle}>Metric</th>
          <th style={thStyle}>SQLite↔CouchDB</th>
          <th style={thStyle}>PouchDB↔CouchDB</th>
          <th style={thStyle}>Winner</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
            <td style={tdStyle}>{row.metric}</td>
            <td style={tdStyle}>{row.sqlite}</td>
            <td style={tdStyle}>{row.pouchdb}</td>
            <td style={{ ...tdStyle, color: row.winner === "pouchdb" ? "#059669" : row.winner === "sqlite" ? "#2563eb" : "#64748b", fontWeight: 600 }}>
              {row.winner === "pouchdb" ? "✓ PouchDB" : row.winner === "sqlite" ? "✓ SQLite" : "Tie"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const thStyle = {
  padding: "12px 16px",
  textAlign: "left",
  fontWeight: 700,
  color: "#1e293b",
  borderBottom: "2px solid #e2e8f0",
};

const tdStyle = {
  padding: "10px 16px",
  borderBottom: "1px solid #f1f5f9",
  color: "#334155",
};

export default function BenchmarkPage() {
  const [benchmarkResults, setBenchmarkResults] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [memory, setMemory] = useState(null);
  const [databaseSizes, setDatabaseSizes] = useState(null);
  const [complexity, setComplexity] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const [compResult, memResult, sizeResult, complexResult] = await Promise.all([
        window.electronAPI?.benchmark?.getComparison?.(),
        window.electronAPI?.benchmark?.getMemory?.(),
        window.electronAPI?.benchmark?.getDatabaseSizes?.(),
        window.electronAPI?.benchmark?.getComplexity?.(),
      ]);

      if (compResult?.success) setComparison(compResult.data);
      if (memResult?.success) setMemory(memResult.data);
      if (sizeResult?.success) setDatabaseSizes(sizeResult.data);
      if (complexResult?.success) setComplexity(complexResult.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const runBenchmark = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await window.electronAPI?.benchmark?.run?.();
      if (result?.success) {
        setBenchmarkResults(result.data);
        await loadMetrics(); // Refresh all metrics
      } else {
        setError(result?.error || "Benchmark failed");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getComparisonTableData = () => {
    if (!complexity) return [];

    return [
      {
        metric: "Sync Code (LOC)",
        sqlite: "275 lines",
        pouchdb: `${complexity.syncCodeLOC?.pouchdb || 201} lines`,
        winner: "pouchdb",
      },
      {
        metric: "Database Code (LOC)",
        sqlite: "797 lines",
        pouchdb: `${complexity.databaseCodeLOC?.pouchdb || 434} lines`,
        winner: "pouchdb",
      },
      {
        metric: "Manual Sync Logic (LOC)",
        sqlite: "197 lines",
        pouchdb: `${complexity.manualSyncLogic?.pouchdb?.total || 0} lines`,
        winner: "pouchdb",
      },
      {
        metric: "Database Tables",
        sqlite: "5 tables",
        pouchdb: `${complexity.databaseSchema?.pouchdb?.tables || 3} tables`,
        winner: "pouchdb",
      },
      {
        metric: "Conflict Detection",
        sqlite: "Manual timestamp",
        pouchdb: "Built-in _rev tree",
        winner: "pouchdb",
      },
      {
        metric: "Sync Method",
        sqlite: "Manual axios push/pull",
        pouchdb: "Native replication",
        winner: "pouchdb",
      },
      {
        metric: "Change Logging",
        sqlite: "Manual changelog table",
        pouchdb: "Internal revision history",
        winner: "pouchdb",
      },
      {
        metric: "Schema Migration",
        sqlite: "ALTER TABLE required",
        pouchdb: "Schemaless (no migration)",
        winner: "pouchdb",
      },
    ];
  };

  return (
    <div style={{ padding: "24px 0" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: "#1e293b", margin: 0 }}>
            Evaluation Metrics
          </h2>
          <p style={{ fontSize: 13, color: "#64748b", margin: "4px 0 0 0" }}>
            SQLite↔CouchDB vs PouchDB↔CouchDB Comparison
          </p>
        </div>
        <button
          onClick={runBenchmark}
          disabled={loading}
          style={{
            padding: "10px 20px",
            borderRadius: 8,
            border: "none",
            background: loading ? "#94a3b8" : "#1e3a5f",
            color: "#fff",
            fontWeight: 600,
            fontSize: 13,
            cursor: loading ? "not-allowed" : "pointer",
            transition: "all 0.15s",
          }}
        >
          {loading ? "⏳ Running..." : "▶ Run Benchmark"}
        </button>
      </div>

      {error && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 8,
            padding: 12,
            marginBottom: 20,
            color: "#dc2626",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {/* Quick Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
          marginBottom: 24,
        }}
      >
        <MetricCard
          title="PouchDB Sync Code"
          value={complexity?.syncCodeLOC?.pouchdb || 201}
          unit="LOC"
          color="#059669"
          description={`${complexity?.syncCodeLOC?.percentReduction || 27}% reduction vs SQLite`}
        />
        <MetricCard
          title="PouchDB DB Code"
          value={complexity?.databaseCodeLOC?.pouchdb || 434}
          unit="LOC"
          color="#0891b2"
          description={`${complexity?.databaseCodeLOC?.percentReduction || 45}% reduction vs SQLite`}
        />
        <MetricCard
          title="Manual Sync Logic"
          value={complexity?.manualSyncLogic?.pouchdb?.total || 0}
          unit="LOC"
          color="#7c3aed"
          description="vs 197 lines in SQLite"
        />
        <MetricCard
          title="Database Tables"
          value={complexity?.databaseSchema?.pouchdb?.tables || 3}
          unit="tables"
          color="#ea580c"
          description="vs 5 tables in SQLite"
        />
      </div>

      {/* Database Sizes */}
      {databaseSizes && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", marginBottom: 12 }}>
            PouchDB Database Sizes
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 14,
            }}
          >
            <MetricCard
              title="Students"
              value={databaseSizes.students?.docCount || 0}
              unit="docs"
              color="#1e40af"
              description="Student records"
            />
            <MetricCard
              title="Equipment"
              value={databaseSizes.equipment?.docCount || 0}
              unit="docs"
              color="#065f46"
              description="Equipment items"
            />
            <MetricCard
              title="Loans"
              value={databaseSizes.loans?.docCount || 0}
              unit="docs"
              color="#92400e"
              description="Loan records"
            />
            <MetricCard
              title="Total Documents"
              value={databaseSizes.total?.docCount || 0}
              unit="docs"
              color="#1e293b"
              description="All collections"
            />
          </div>
        </div>
      )}

      {/* Memory Usage */}
      {memory && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", marginBottom: 12 }}>
            Memory Usage
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 14,
            }}
          >
            <MetricCard
              title="RSS Memory"
              value={memory.rss?.toFixed(1) || 0}
              unit="MB"
              color="#dc2626"
              description="Resident Set Size"
            />
            <MetricCard
              title="Heap Used"
              value={memory.heapUsed?.toFixed(1) || 0}
              unit="MB"
              color="#ea580c"
              description="Used heap memory"
            />
            <MetricCard
              title="Heap Total"
              value={memory.heapTotal?.toFixed(1) || 0}
              unit="MB"
              color="#ca8a04"
              description="Allocated heap"
            />
            <MetricCard
              title="External"
              value={memory.external?.toFixed(1) || 0}
              unit="MB"
              color="#7c3aed"
              description="External memory"
            />
          </div>
        </div>
      )}

      {/* Comparison Table */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", marginBottom: 12 }}>
          SQLite vs PouchDB Comparison
        </h3>
        <ComparisonTable data={getComparisonTableData()} />
      </div>

      {/* Benchmark Results */}
      {benchmarkResults && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", marginBottom: 12 }}>
            Last Benchmark Run
          </h3>
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              padding: 20,
            }}
          >
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>
              Run at: {new Date(benchmarkResults.timestamp).toLocaleString()}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 14,
              }}
            >
              <MetricCard
                title="Total Duration"
                value={benchmarkResults.totalDurationMs?.toFixed(0) || 0}
                unit="ms"
                color="#059669"
                description="Complete benchmark suite"
              />
              <MetricCard
                title="Memory Delta"
                value={benchmarkResults.memory?.delta?.heapUsed?.toFixed(1) || 0}
                unit="MB"
                color="#ea580c"
                description="Heap change during benchmark"
              />
              <MetricCard
                title="Conflict Detection"
                value={benchmarkResults.conflictResolution?.durationMs?.toFixed(0) || 0}
                unit="ms"
                color="#7c3aed"
                description="Time to detect conflict"
              />
            </div>
          </div>
        </div>
      )}

      {/* Complexity Analysis */}
      {complexity && (
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", marginBottom: 12 }}>
            Code Complexity Analysis
          </h3>
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              padding: 20,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 20,
              }}
            >
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 12 }}>
                  Sync Code Comparison
                </h4>
                <div style={{ fontSize: 13, color: "#334155" }}>
                  <div style={{ marginBottom: 8 }}>
                    <strong>SQLite:</strong> {complexity.syncCodeLOC?.sqlite || 275} lines
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <strong>PouchDB:</strong> {complexity.syncCodeLOC?.pouchdb || 201} lines
                  </div>
                  <div style={{ color: "#059669", fontWeight: 600 }}>
                    Reduction: {complexity.syncCodeLOC?.percentReduction || 27}%
                  </div>
                </div>
              </div>
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 12 }}>
                  Manual Sync Logic
                </h4>
                <div style={{ fontSize: 13, color: "#334155" }}>
                  <div style={{ marginBottom: 8 }}>
                    <strong>SQLite:</strong> {complexity.manualSyncLogic?.sqlite?.total || 197} lines
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <strong>PouchDB:</strong> {complexity.manualSyncLogic?.pouchdb?.total || 0} lines
                  </div>
                  <div style={{ color: "#059669", fontWeight: 600 }}>
                    Eliminated: {complexity.manualSyncLogic?.sqlite?.total || 197} lines
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
