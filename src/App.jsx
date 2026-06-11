import { useState } from "react";
import { useLoans }   from "./hooks/useLoans";
import StatCard        from "./components/ui/StatCard";
import Toast           from "./components/ui/Toast";
import TitleBar        from "./components/ui/TitleBar";
import EquipmentPage   from "./pages/EquipmentPage";
import LoansPage       from "./pages/LoansPage";

const STAT_CONFIG = [
  { key: "total",       label: "Total Items",  color: "#1e3a5f", borderColor: "#e0e7ef" },
  { key: "available",   label: "Available",    color: "#065f46", borderColor: "#d1fae5" },
  { key: "onLoan",      label: "On Loan",      color: "#92400e", borderColor: "#fef3c7" },
  { key: "activeLoans", label: "Active Loans", color: "#1e40af", borderColor: "#dbeafe" },
];

export default function App() {
  const { equipment, loans, stats, createLoan, returnLoan } = useLoans();

  const [tab, setTab]         = useState("equipment");
  const [toast, setToast]     = useState(null);
  const [syncing, setSyncing] = useState(false);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLoan = async (item, borrower) => {
    try {
      await createLoan(item, borrower);
      showToast(`${item.name} loaned to ${borrower.studentName}`);
    } catch (err) {
      showToast(`Error creating loan: ${err.message}`, "error");
    }
  };

  const handleReturn = async (loanId) => {
    try {
      const loan = loans.find((l) => l.id === loanId);
      await returnLoan(loanId);
      if (loan) showToast(`${loan.equipmentName} marked as returned`);
    } catch (err) {
      showToast(`Error returning loan: ${err.message}`, "error");
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await window.electronAPI?.sync?.syncLoans?.();
      if (result?.success) {
        showToast(`Sync successful: ${result.message}`, "success");
      } else {
        showToast(`Sync failed: ${result?.message || 'Unknown error'}`, "error");
      }
    } catch (err) {
      showToast(`Sync error: ${err.message}`, "error");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div
      style={{
        height:        "100vh",
        display:       "flex",
        flexDirection: "column",
        background:    "#f1f5f9",
        fontFamily:    "'Inter', system-ui, sans-serif",
        overflow:      "hidden",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        input[type="date"]::-webkit-calendar-picker-indicator { cursor: pointer; opacity: 0.6; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <TitleBar />

      {/* ── Top bar ── */}
      <header
        style={{
          background: "#1e3a5f",
          padding:    "0 32px",
          display:    "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height:     60,
          boxShadow:  "0 2px 12px rgba(0,0,0,0.2)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width:          34,
              height:         34,
              background:     "#f59e0b",
              borderRadius:   8,
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              fontSize:       18,
            }}
          >
            🎓
          </div>
          <div>
            <div
              style={{
                color:         "#f8fafc",
                fontWeight:    800,
                fontSize:      15,
                letterSpacing: "-0.01em",
              }}
            >
              Campus Equipment Loan
            </div>
            <div style={{ color: "#64748b", fontSize: 11 }}>
              Resource Management System
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {["equipment", "loans"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding:    "7px 18px",
                borderRadius: 7,
                border:     "none",
                cursor:     "pointer",
                fontWeight: 600,
                fontSize:   13,
                background: tab === t ? "#f59e0b" : "transparent",
                color:      tab === t ? "#1e3a5f"  : "#94a3b8",
                transition: "all 0.15s",
              }}
            >
              {t === "equipment" ? "Equipment" : "Loans"}
              {t === "loans" && stats.activeLoans > 0 && (
                <span
                  style={{
                    marginLeft:   6,
                    background:   "#ef4444",
                    color:        "#fff",
                    borderRadius: 99,
                    padding:      "1px 6px",
                    fontSize:     10,
                    fontWeight:   700,
                  }}
                >
                  {stats.activeLoans}
                </span>
              )}
            </button>
          ))}

          {/* Sync button */}
          <button
            onClick={handleSync}
            disabled={syncing}
            style={{
              padding:      "7px 16px",
              borderRadius: 7,
              border:       "1px solid #475569",
              background:   syncing ? "#64748b" : "transparent",
              color:        "#cbd5e1",
              cursor:       syncing ? "not-allowed" : "pointer",
              fontWeight:   600,
              fontSize:     13,
              transition:   "all 0.15s",
              opacity:      syncing ? 0.7 : 1,
              marginLeft:   8,
            }}
            title="Sync loans to CouchDB"
          >
            {syncing ? "⏳ Syncing..." : "☁️ Sync"}
          </button>
        </div>
      </header>

      {/* ── Main content ── */}
      <main style={{ flex: 1, overflowY: "auto", padding: "28px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Stats strip */}
        <div
          style={{
            display:             "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            gap:                 14,
            marginBottom:        28,
          }}
        >
          {STAT_CONFIG.map(({ key, label, color, borderColor }) => (
            <StatCard
              key={key}
              label={label}
              value={stats[key]}
              color={color}
              borderColor={borderColor}
            />
          ))}
        </div>

        {/* Pages */}
        {tab === "equipment" ? (
          <EquipmentPage equipment={equipment} onLoan={handleLoan} />
        ) : (
          <LoansPage loans={loans} equipment={equipment} onReturn={handleReturn} />
        )}
      </div>
      </main>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}
