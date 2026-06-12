import { useState, useEffect, useRef } from "react";
import Modal from "../ui/Modal";
import { today } from "../../utils/helpers";

/**
 * LoanFormModal
 * Collects borrower details for a new loan.
 * Loads available students from database.
 *
 * Props:
 *   equipment  {object} - item being borrowed
 *   onClose    {fn}
 *   onSubmit   {fn(borrower)} - called with validated { studentId, studentName, startDate }
 */
export default function LoanFormModal({ equipment, onClose, onSubmit }) {
  const [form, setForm]        = useState({ studentId: "", studentName: "", startDate: today() });
  const [errors, setErrors]    = useState({});
  const [students, setStudents] = useState([]);
  const [loading, setLoading]  = useState(true);
  const [search, setSearch]    = useState("");
  const [open, setOpen]        = useState(false);
  const wrapRef = useRef(null);

  // Load students on mount
  useEffect(() => {
    loadStudents();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const loadStudents = async () => {
    try {
      if (window.electronAPI?.db?.students?.getAll) {
        const result = await window.electronAPI.db.students.getAll();
        if (result.success) {
          setStudents(result.data);
        } else {
          console.error('Failed to load students:', result.error);
        }
      }
    } catch (err) {
      console.error('Error loading students:', err);
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    const e = {};
    if (!form.studentId.trim())
      e.studentId = "Student is required.";
    if (!form.startDate)
      e.startDate = "Start date is required.";
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    
    const selectedStudent = students.find(s => s.studentID === form.studentId);
    onSubmit({
      studentId:   form.studentId.trim(),
      studentName: selectedStudent ? `${selectedStudent.firstName} ${selectedStudent.lastName}` : form.studentId,
      startDate:   form.startDate,
    });
  };

  const handleStudentChange = (e) => {
    const studentId = e.target.value;
    const student = students.find(s => s.studentID === studentId);
    setForm({
      ...form,
      studentId,
      studentName: student ? `${student.firstName} ${student.lastName}` : ''
    });
    setErrors({ ...errors, studentId: undefined });
  };

  const filtered = students.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.studentID.toLowerCase().includes(q) ||
      s.firstName.toLowerCase().includes(q) ||
      s.lastName.toLowerCase().includes(q)
    );
  });

  const renderField = (label, key, placeholder, hint) => (
    <div style={{ marginBottom: 18 }}>
      <label
        style={{
          display:       "block",
          fontSize:      12,
          fontWeight:    700,
          color:         "#475569",
          marginBottom:  5,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </label>
      <input
        value={form[key]}
        onChange={(e) => {
          setForm({ ...form, [key]: e.target.value });
          setErrors({ ...errors, [key]: null });
        }}
        placeholder={placeholder}
        type={key === "startDate" ? "date" : "text"}
        style={{
          width:        "100%",
          padding:      "10px 13px",
          borderRadius: 8,
          fontSize:     14,
          border:       errors[key] ? "2px solid #ef4444" : "2px solid #e2e8f0",
          fontFamily:   key === "studentId" ? "monospace" : "inherit",
          outline:      "none",
          boxSizing:    "border-box",
          color:        "#0f172a",
          background:   "#f8fafc",
          transition:   "border-color 0.15s",
        }}
        onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
        onBlur={(e) =>
          (e.target.style.borderColor = errors[key] ? "#ef4444" : "#e2e8f0")
        }
      />
      {hint && !errors[key] && (
        <p style={{ margin: "4px 0 0", fontSize: 11, color: "#94a3b8" }}>
          {hint}
        </p>
      )}
      {errors[key] && (
        <p style={{ margin: "4px 0 0", fontSize: 11, color: "#ef4444" }}>
          {errors[key]}
        </p>
      )}
    </div>
  );

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
        <div
          style={{
            background:     "#1e3a5f",
            padding:        "22px 28px",
            display:        "flex",
            justifyContent: "space-between",
            alignItems:     "center",
          }}
        >
          <div>
            <div
              style={{
                color:         "#f59e0b",
                fontSize:      11,
                fontWeight:    700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom:  4,
              }}
            >
              New Loan
            </div>
            <div style={{ color: "#f8fafc", fontSize: 18, fontWeight: 700 }}>
              {equipment.name}
            </div>
            <div
              style={{
                color:      "#94a3b8",
                fontSize:   12,
                fontFamily: "monospace",
                marginTop:  2,
              }}
            >
              {equipment.id}
            </div>
          </div>
          <span style={{ fontSize: 32 }}>{equipment.icon}</span>
        </div>

        {/* Body */}
        <div style={{ padding: "24px 28px" }}>
          {/* Student Selection */}
          <div style={{ marginBottom: 18 }}>
            <label
              style={{
                display:       "block",
                fontSize:      12,
                fontWeight:    700,
                color:         "#475569",
                marginBottom:  5,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              Student
            </label>
            {loading ? (
              <div style={{ padding: "10px", color: "#94a3b8" }}>Loading students...</div>
            ) : students.length === 0 ? (
              <div style={{ padding: "10px", color: "#ef4444" }}>No students available</div>
            ) : (
              <div ref={wrapRef} style={{ position: "relative" }}>
                <input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setOpen(true); setErrors({ ...errors, studentId: null }); }}
                  onFocus={() => setOpen(true)}
                  placeholder={form.studentId ? `${form.studentName} (${form.studentId})` : "Search by ID or name..."}
                  style={{
                    width: "100%",
                    padding: "10px 13px",
                    borderRadius: 8,
                    fontSize: 14,
                    border: errors.studentId ? "2px solid #ef4444" : "2px solid #e2e8f0",
                    outline: "none",
                    boxSizing: "border-box",
                    color: "#0f172a",
                    background: "#f8fafc",
                    transition: "border-color 0.15s",
                  }}
                  onFocusCapture={(e) => (e.target.style.borderColor = "#3b82f6")}
                  onBlur={(e) => (e.target.style.borderColor = errors.studentId ? "#ef4444" : "#e2e8f0")}
                />
                {open && (
                  <div style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    marginTop: 4,
                    background: "#fff",
                    border: "2px solid #e2e8f0",
                    borderRadius: 8,
                    maxHeight: 180,
                    overflowY: "auto",
                    zIndex: 100,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                  }}>
                    {filtered.length === 0 ? (
                      <div style={{ padding: "10px 13px", color: "#94a3b8", fontSize: 13 }}>No matches</div>
                    ) : (
                      filtered.map((s) => (
                        <div
                          key={s.studentID}
                          onMouseDown={() => {
                            setForm({ ...form, studentId: s.studentID, studentName: `${s.firstName} ${s.lastName}` });
                            setSearch("");
                            setOpen(false);
                            setErrors({ ...errors, studentId: null });
                          }}
                          style={{
                            padding: "9px 13px",
                            cursor: "pointer",
                            fontSize: 13,
                            display: "flex",
                            justifyContent: "space-between",
                            background: form.studentId === s.studentID ? "#f0f9ff" : "#fff",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = form.studentId === s.studentID ? "#f0f9ff" : "#fff")}
                        >
                          <span>{s.firstName} {s.lastName}</span>
                          <span style={{ fontFamily: "monospace", color: "#64748b" }}>{s.studentID}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
            {errors.studentId && (
              <p style={{ margin: "4px 0 0", fontSize: 11, color: "#ef4444" }}>
                {errors.studentId}
              </p>
            )}
          </div>

          {renderField("Loan Start Date", "startDate")}

          {/* Equipment summary strip */}
          <div
            style={{
              background:   "#f0f9ff",
              border:       "1px solid #bae6fd",
              borderRadius: 8,
              padding:      "12px 14px",
              marginBottom: 20,
            }}
          >
            <div
              style={{
                fontSize:      11,
                color:         "#0369a1",
                fontWeight:    700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom:  4,
              }}
            >
              Borrowing
            </div>
            <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 14 }}>
              {equipment.name}
            </div>
            <div
              style={{
                fontSize:   12,
                color:      "#64748b",
                fontFamily: "monospace",
              }}
            >
              {equipment.id} · {equipment.category}
            </div>
          </div>

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
              onClick={handleSubmit}
              style={{
                flex:         2,
                padding:      "11px",
                borderRadius: 8,
                border:       "none",
                background:   "#1e3a5f",
                color:        "#fff",
                fontWeight:   700,
                fontSize:     14,
                cursor:       "pointer",
              }}
            >
              Confirm Loan
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
