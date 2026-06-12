import { useState } from "react";
import Modal from "../ui/Modal";

const CATEGORIES = ["Laptop", "Camera", "Microcontroller", "Projector", "Headphones", "Tablet", "Accessory"];

export default function AddEquipmentModal({ onClose, onSubmit }) {
  const [form, setForm] = useState({ equipmentID: "", name: "", category: CATEGORIES[0] });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.equipmentID.trim()) e.equipmentID = "ID is required.";
    if (!form.name.trim()) e.name = "Name is required.";
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    onSubmit({ equipmentID: form.equipmentID.trim(), name: form.name.trim(), category: form.category });
  };

  const inputStyle = (hasError) => ({
    width: "100%",
    padding: "10px 13px",
    borderRadius: 8,
    fontSize: 14,
    border: hasError ? "2px solid #ef4444" : "2px solid #e2e8f0",
    outline: "none",
    boxSizing: "border-box",
    color: "#0f172a",
    background: "#f8fafc",
  });

  return (
    <Modal onClose={onClose}>
      <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
        <div style={{ background: "#1e3a5f", padding: "22px 28px" }}>
          <div style={{ color: "#f59e0b", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
            New Equipment
          </div>
          <div style={{ color: "#f8fafc", fontSize: 18, fontWeight: 700 }}>Add Equipment Item</div>
        </div>

        <div style={{ padding: "24px 28px" }}>
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Equipment ID
            </label>
            <input
              value={form.equipmentID}
              onChange={(e) => { setForm({ ...form, equipmentID: e.target.value }); setErrors({ ...errors, equipmentID: null }); }}
              placeholder="e.g. E009"
              style={inputStyle(errors.equipmentID)}
            />
            {errors.equipmentID && <p style={{ margin: "4px 0 0", fontSize: 11, color: "#ef4444" }}>{errors.equipmentID}</p>}
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Name
            </label>
            <input
              value={form.name}
              onChange={(e) => { setForm({ ...form, name: e.target.value }); setErrors({ ...errors, name: null }); }}
              placeholder="e.g. Dell Monitor 27&quot;"
              style={inputStyle(errors.name)}
            />
            {errors.name && <p style={{ margin: "4px 0 0", fontSize: 11, color: "#ef4444" }}>{errors.name}</p>}
          </div>

          <div style={{ marginBottom: 22 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Category
            </label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              style={{ ...inputStyle(false), cursor: "pointer" }}
            >
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: "11px", borderRadius: 8, border: "2px solid #e2e8f0", background: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer", color: "#475569" }}>
              Cancel
            </button>
            <button onClick={handleSubmit} style={{ flex: 2, padding: "11px", borderRadius: 8, border: "none", background: "#10b981", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
              Add Equipment
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
