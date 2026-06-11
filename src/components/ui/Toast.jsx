/**
 * Toast
 * Transient notification that slides up from the bottom-right corner.
 * Renders nothing when message is falsy.
 */
export default function Toast({ message, type }) {
  if (!message) return null;

  const bg = type === "success" ? "#10b981" : "#ef4444";

  return (
    <div
      style={{
        position:   "fixed",
        bottom:     28,
        right:      28,
        background: bg,
        color:      "#fff",
        padding:    "12px 20px",
        borderRadius: 10,
        fontWeight: 600,
        fontSize:   14,
        boxShadow:  "0 4px 20px rgba(0,0,0,0.2)",
        zIndex:     2000,
        animation:  "slideUp 0.3s ease",
      }}
    >
      {message}
    </div>
  );
}
