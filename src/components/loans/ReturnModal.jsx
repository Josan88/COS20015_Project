import Modal from "../ui/Modal";
import { today, formatDate } from "../../utils/helpers";

/** Small label-value row used inside the loan summary. */
function Row({ label, value, mono }) {
  return (
    <div
      style={{
        display:        "flex",
        justifyContent: "space-between",
        fontSize:       13,
        color:          "#0f172a",
      }}
    >
      <span style={{ color: "#64748b", fontWeight: 500 }}>{label}</span>
      <span style={{ fontFamily: mono ? "monospace" : "inherit", fontWeight: 600 }}>
        {value}
      </span>
    </div>
  );
}

/**
 * ReturnModal
 * Confirmation dialog before marking a loan as returned.
 *
 * Props:
 *   loan       {object}
 *   onClose    {fn}
 *   onConfirm  {fn}
 */
export default function ReturnModal({ loan, onClose, onConfirm }) {
  return (
    <Modal onClose={onClose}>
      <div
        style={{
          background:   "#fff",
          borderRadius: 16,
          overflow:     "hidden",
          boxShadow:    "0 20px 60px rgba(0,0,0,0.25)",
        }}
      >
        {/* Header */}
        <div style={{ background: "#1e3a5f", padding: "22px 28px" }}>
          <div
            style={{
              color:         "#f59e0b",
              fontSize:      11,
              fontWeight:    700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom:  6,
            }}
          >
            Mark as Returned
          </div>
          <div style={{ color: "#f8fafc", fontSize: 18, fontWeight: 700 }}>
            {loan.equipmentName}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "24px 28px" }}>
          <div
            style={{
              background:   "#f8fafc",
              borderRadius: 8,
              padding:      "14px 16px",
              marginBottom: 22,
              lineHeight:   1.8,
            }}
          >
            <Row label="Borrower"    value={loan.studentName} />
            <Row label="Student ID"  value={loan.studentId}   mono />
            <Row label="Loan ID"     value={loan.id}          mono />
            <Row label="Loaned On"   value={formatDate(loan.startDate)} />
            <Row label="Return Date" value={formatDate(today())} />
          </div>

          <p style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>
            This will mark the item as <strong>returned today</strong> and
            restore its availability.
          </p>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={onClose}
              style={{
                flex:         1,
                padding:      "11px",
                borderRadius: 8,
                border:       "2px solid #e2e8f0",
                background:   "#fff",
                fontWeight:   600,
                fontSize:     14,
                cursor:       "pointer",
                color:        "#475569",
              }}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              style={{
                flex:         2,
                padding:      "11px",
                borderRadius: 8,
                border:       "none",
                background:   "#10b981",
                color:        "#fff",
                fontWeight:   700,
                fontSize:     14,
                cursor:       "pointer",
              }}
            >
              Mark Returned
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
