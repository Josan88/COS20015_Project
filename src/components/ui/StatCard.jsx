/**
 * StatCard
 * A single stat tile used in the dashboard summary strip.
 */
export default function StatCard({ label, value, color, borderColor }) {
  return (
    <div
      style={{
        background:   "#fff",
        borderRadius: 12,
        padding:      "16px 20px",
        border:       `2px solid ${borderColor}`,
        boxShadow:    "0 1px 4px rgba(0,0,0,0.05)",
      }}
    >
      <div style={{ fontSize: 26, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, marginTop: 2 }}>
        {label}
      </div>
    </div>
  );
}
