import { formatDate } from "../../utils/helpers";

/**
 * LoanRow
 * Renders a single loan record with borrower info, dates, and a return button.
 *
 * Props:
 *   loan         {object}
 *   equipmentIcon {string}  - emoji icon for the borrowed item
 *   onReturn     {fn}       - called when "✓ Return" is clicked
 */
export default function LoanRow({ loan, equipmentIcon, onReturn }) {
  const isActive = loan.status === "active";

  return (
    <div
      style={{
        background:     "#fff",
        borderRadius:   12,
        border:         `2px solid ${isActive ? "#bfdbfe" : "#e2e8f0"}`,
        padding:        "16px 20px",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        flexWrap:       "wrap",
        gap:            12,
        boxShadow:      "0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      {/* Left: icon + names */}
      <div style={{ display: "flex", gap: 16, alignItems: "center", flex: 1 }}>
        <div style={{ fontSize: 28 }}>{equipmentIcon || "📦"}</div>
        <div>
          <div
            style={{
              fontWeight:   700,
              fontSize:     14,
              color:        "#0f172a",
              marginBottom: 2,
            }}
          >
            {loan.equipmentName}
          </div>
          <div style={{ fontSize: 12, color: "#64748b" }}>
            <span style={{ fontFamily: "monospace" }}>{loan.studentId}</span>
            {" · "}
            {loan.studentName}
          </div>
        </div>
      </div>

      {/* Right: dates + action */}
      <div
        style={{
          display:     "flex",
          alignItems:  "center",
          gap:         20,
          flexWrap:    "wrap",
        }}
      >
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontSize:      11,
              color:         "#94a3b8",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              fontWeight:    600,
            }}
          >
            Loaned
          </div>
          <div
            style={{
              fontSize:   13,
              fontWeight: 600,
              fontFamily: "monospace",
              color:      "#0f172a",
            }}
          >
            {formatDate(loan.startDate)}
          </div>
        </div>

        {loan.returnDate && (
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize:      11,
                color:         "#94a3b8",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                fontWeight:    600,
              }}
            >
              Returned
            </div>
            <div
              style={{
                fontSize:   13,
                fontWeight: 600,
                fontFamily: "monospace",
                color:      "#0f172a",
              }}
            >
              {formatDate(loan.returnDate)}
            </div>
          </div>
        )}

        <div>
          {isActive ? (
            <button
              onClick={() => onReturn(loan)}
              style={{
                padding:      "8px 16px",
                background:   "#f0fdf4",
                border:       "2px solid #86efac",
                borderRadius: 8,
                color:        "#15803d",
                fontWeight:   700,
                fontSize:     12,
                cursor:       "pointer",
              }}
            >
              ✓ Return
            </button>
          ) : (
            <span
              style={{
                padding:      "6px 12px",
                background:   "#f1f5f9",
                borderRadius: 8,
                color:        "#64748b",
                fontSize:     12,
                fontWeight:   600,
              }}
            >
              Returned
            </span>
          )}
        </div>

        <div style={{ fontFamily: "monospace", fontSize: 11, color: "#94a3b8" }}>
          {loan.id}
        </div>
      </div>
    </div>
  );
}
