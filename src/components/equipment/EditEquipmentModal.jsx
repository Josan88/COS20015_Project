import { useState } from "react";
import Modal from "../ui/Modal";

const CATEGORIES = ["Laptop", "Camera", "Microcontroller", "Projector", "Headphones", "Tablet", "Accessory"];

export default function EditEquipmentModal({ equipment, onClose, onSubmit }) {
  const [form, setForm] = useState({
    name: equipment.name,
    category: equipment.category,
    available: equipment.available,
  });

  const inputStyle = {
    width: "100%",
    padding: "10px 13px",
    borderRadius: 8,
    fontSize: 14,
    border: "2px solid #e2e8f0",
    outline: "none",
    boxSizing: "border-box",
    color: "#0f172a",
    background: "#f8fafc",
  };

  return (
    <Modal onClose={onClose}>
      <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
        <div style={{ background: "#1e3a5f", padding: "22px 28px" }}>
          <div style={{ color: "#f59e0b", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
            Edit Equipment
          </div>
          <div style={{ color: "#f8fafc", fontSize: 18, fontWeight: 700 }}>{equipment.name}</div>
          <div style={{ color: "#94a3b8", fontSize: 12, fontFamily: "monospace", marginTop: 2 }}>{equipment.id}</div>
        </div>

        <div style={{ padding: "24px 28px" }}>
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Name
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Category
            </label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 22 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Status
            </label>
            <select
              value={form.available ? "available" : "loaned"}
              onChange={(e) => setForm({ ...form, available: e.target.value === "available" })}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              <option value="available">Available</option>
              <option value="loaned">On Loan</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: "11px", borderRadius: 8, border: "2px solid #e2e8f0", background: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer", color: "#475569" }}>
              Cancel
            </button>
            <button
              onClick={() => onSubmit({ name: form.name, category: form.category, available: form.available })}
              style={{ flex: 2, padding: "11px", borderRadius: 8, border: "none", background: "#1e3a5f", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
