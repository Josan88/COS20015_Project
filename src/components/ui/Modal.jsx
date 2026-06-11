/**
 * Modal
 * Full-screen backdrop with a centred content card.
 * Clicking the backdrop calls onClose.
 */
export default function Modal({ children, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position:       "fixed",
        inset:          0,
        background:     "rgba(15,23,42,0.55)",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        zIndex:         1000,
        padding:        20,
        backdropFilter: "blur(3px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 520 }}
      >
        {children}
      </div>
    </div>
  );
}
