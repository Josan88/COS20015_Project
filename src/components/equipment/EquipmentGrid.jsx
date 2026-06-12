import { useState, useMemo } from "react";
import EquipmentCard from "./EquipmentCard";

const getCategories = (equipment) => [
  "All",
  ...Array.from(new Set(equipment.map((e) => e.category))),
];

/**
 * EquipmentGrid
 * Filter bar, card grid, and selection confirmation banner.
 *
 * Props:
 *   equipment    {array}    - current equipment list (with live availability)
 *   selectedItem {object|null}
 *   onSelect     {fn}       - called with the clicked item
 *   onLoan       {fn}       - called when "Loan This Item →" is clicked
 */
export default function EquipmentGrid({
  equipment,
  selectedItem,
  onSelect,
  onLoan,
}) {
  const [search, setSearch]               = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterStatus, setFilterStatus]   = useState("All");

  const ALL_CATEGORIES = useMemo(() => getCategories(equipment), [equipment]);

  const filtered = useMemo(
    () =>
      equipment.filter((e) => {
        const matchSearch =
          e.name.toLowerCase().includes(search.toLowerCase()) ||
          e.id.toLowerCase().includes(search.toLowerCase());
        const matchCat =
          filterCategory === "All" || e.category === filterCategory;
        const matchStatus =
          filterStatus === "All" ||
          (filterStatus === "Available" ? e.available : !e.available);
        return matchSearch && matchCat && matchStatus;
      }),
    [equipment, search, filterCategory, filterStatus]
  );

  return (
    <div>
      {/* ── Filter bar ── */}
      <div
        style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or ID…"
          style={{
            flex:         "1 1 200px",
            padding:      "9px 13px",
            borderRadius: 8,
            border:       "2px solid #e2e8f0",
            fontSize:     13,
            outline:      "none",
            background:   "#fff",
          }}
        />
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          style={{
            padding:      "9px 13px",
            borderRadius: 8,
            border:       "2px solid #e2e8f0",
            fontSize:     13,
            background:   "#fff",
            cursor:       "pointer",
          }}
        >
          {ALL_CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{
            padding:      "9px 13px",
            borderRadius: 8,
            border:       "2px solid #e2e8f0",
            fontSize:     13,
            background:   "#fff",
            cursor:       "pointer",
          }}
        >
          {["All", "Available", "On Loan"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* ── Card grid ── */}
      {filtered.length === 0 ? (
        <div
          style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8" }}
        >
          <div style={{ fontSize: 40, marginBottom: 10 }}>🔍</div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>
            No items match your filters.
          </div>
        </div>
      ) : (
        <div
          style={{
            display:             "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap:                 14,
          }}
        >
          {filtered.map((item) => (
            <EquipmentCard
              key={item.id}
              item={item}
              onSelect={onSelect}
              selected={selectedItem?.id === item.id}
            />
          ))}
        </div>
      )}

      {/* ── Selection banner ── */}
      {selectedItem && (
        <div
          style={{
            marginTop:      20,
            padding:        "14px 20px",
            background:     "#fff7ed",
            border:         "2px solid #fed7aa",
            borderRadius:   10,
            display:        "flex",
            alignItems:     "center",
            justifyContent: "space-between",
            flexWrap:       "wrap",
            gap:            10,
          }}
        >
          <span style={{ fontSize: 14, color: "#92400e", fontWeight: 600 }}>
            {selectedItem.icon}{" "}
            <strong>{selectedItem.name}</strong> selected — fill in borrower
            details to proceed.
          </span>
          <button
            onClick={onLoan}
            style={{
              padding:      "9px 20px",
              background:   "#1e3a5f",
              color:        "#fff",
              border:       "none",
              borderRadius: 8,
              fontWeight:   700,
              fontSize:     13,
              cursor:       "pointer",
            }}
          >
            Loan This Item →
          </button>
        </div>
      )}
    </div>
  );
}
