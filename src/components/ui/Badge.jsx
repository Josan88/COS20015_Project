/**
 * Badge
 * Displays an "Available" or "On Loan" pill with a coloured dot.
 */
export default function Badge({ available }) {
  return (
    <span
      style={{
        display:       "inline-flex",
        alignItems:    "center",
        gap:           5,
        padding:       "3px 10px",
        borderRadius:  99,
        fontSize:      11,
        fontWeight:    700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        background:    available ? "#d1fae5" : "#fee2e2",
        color:         available ? "#065f46" : "#991b1b",
        border:        `1px solid ${available ? "#a7f3d0" : "#fca5a5"}`,
        transition:    "all 0.3s ease",
      }}
    >
      <span
        style={{
          width:        6,
          height:       6,
          borderRadius: "50%",
          background:   available ? "#10b981" : "#ef4444",
          display:      "inline-block",
        }}
      />
      {available ? "Available" : "On Loan"}
    </span>
  );
}
