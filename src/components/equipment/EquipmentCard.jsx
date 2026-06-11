import Badge from "../ui/Badge";

/**
 * EquipmentCard
 * Grid tile representing a single piece of equipment.
 * Clicking selects it (if available); unavailable items are dimmed.
 */
export default function EquipmentCard({ item, onSelect, selected }) {
  return (
    <div
      onClick={() => item.available && onSelect(item)}
      style={{
        background:   selected ? "#1e3a5f" : item.available ? "#fff" : "#f9fafb",
        border:       selected
          ? "2px solid #f59e0b"
          : `2px solid ${item.available ? "#e2e8f0" : "#e5e7eb"}`,
        borderRadius: 12,
        padding:      "16px 18px",
        cursor:       item.available ? "pointer" : "not-allowed",
        transition:   "all 0.2s",
        opacity:      item.available ? 1 : 0.65,
        boxShadow:    selected
          ? "0 0 0 3px rgba(245,158,11,0.2)"
          : item.available
          ? "0 1px 4px rgba(0,0,0,0.06)"
          : "none",
      }}
    >
      <div
        style={{
          display:        "flex",
          justifyContent: "space-between",
          alignItems:     "flex-start",
          marginBottom:   10,
        }}
      >
        <span style={{ fontSize: 28 }}>{item.icon}</span>
        <Badge available={item.available} />
      </div>

      <div
        style={{
          fontWeight: 700,
          fontSize:   14,
          color:      selected ? "#f8fafc" : "#0f172a",
          marginBottom: 2,
        }}
      >
        {item.name}
      </div>

      <div
        style={{
          fontSize:      11,
          color:         selected ? "#94a3b8" : "#64748b",
          fontFamily:    "monospace",
          letterSpacing: "0.04em",
        }}
      >
        {item.id} · {item.category}
      </div>
    </div>
  );
}
