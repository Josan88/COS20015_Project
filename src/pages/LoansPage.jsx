import { useState } from "react";
import LoanRow    from "../components/loans/LoanRow";
import ReturnModal from "../components/loans/ReturnModal";

const FILTER_OPTIONS = [
  ["active",   "Active"],
  ["returned", "Returned"],
  ["all",      "All"],
];

/**
 * LoansPage
 * Filterable list of all loan records with return capability.
 *
 * Props:
 *   loans      {array}
 *   equipment  {array}  - used to look up equipment icons
 *   onReturn   {fn(loanId)}
 */
export default function LoansPage({ loans, equipment, onReturn }) {
  const [filter, setFilter]         = useState("active");
  const [returnTarget, setReturnTarget] = useState(null);

  const filtered = loans.filter(
    (l) => filter === "all" || l.status === filter
  );

  const handleConfirmReturn = () => {
    onReturn(returnTarget.id);
    setReturnTarget(null);
  };

  const iconFor = (equipmentId) =>
    equipment.find((e) => e.id === equipmentId)?.icon || "📦";

  return (
    <>
      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {FILTER_OPTIONS.map(([value, label]) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            style={{
              padding:     "8px 18px",
              borderRadius: 8,
              border:       "2px solid",
              cursor:       "pointer",
              fontWeight:   600,
              fontSize:     13,
              transition:   "all 0.15s",
              background:   filter === value ? "#1e3a5f" : "#fff",
              color:        filter === value ? "#fff"    : "#475569",
              borderColor:  filter === value ? "#1e3a5f" : "#e2e8f0",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Loan rows */}
      {filtered.length === 0 ? (
        <div
          style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8" }}
        >
          <div style={{ fontSize: 40, marginBottom: 10 }}>📋</div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>
            No {filter === "all" ? "" : filter} loans to show.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((loan) => (
            <LoanRow
              key={loan.id}
              loan={loan}
              equipmentIcon={iconFor(loan.equipmentId)}
              onReturn={setReturnTarget}
            />
          ))}
        </div>
      )}

      {returnTarget && (
        <ReturnModal
          loan={returnTarget}
          onClose={() => setReturnTarget(null)}
          onConfirm={handleConfirmReturn}
        />
      )}
    </>
  );
}
