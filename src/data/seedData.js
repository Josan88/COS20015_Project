export const INITIAL_EQUIPMENT = [
  { id: "EQ-001", name: "DSLR Camera",      category: "Photography", available: true,  icon: "📷" },
  { id: "EQ-002", name: "Tripod Stand",      category: "Photography", available: true,  icon: "🎬" },
  { id: "EQ-003", name: "Laptop (MacBook)",  category: "Computing",   available: false, icon: "💻" },
  { id: "EQ-004", name: "Projector",         category: "A/V",         available: true,  icon: "📽️" },
  { id: "EQ-005", name: "Wireless Mic Set",  category: "Audio",       available: true,  icon: "🎙️" },
  { id: "EQ-006", name: "Drawing Tablet",    category: "Computing",   available: false, icon: "🖊️" },
  { id: "EQ-007", name: "DJI Drone",         category: "Photography", available: true,  icon: "🚁" },
  { id: "EQ-008", name: "Portable Speaker",  category: "Audio",       available: true,  icon: "🔊" },
];

export const INITIAL_LOANS = [
  {
    id:            "LN-0001",
    studentId:     "STU-20240032",
    studentName:   "Amir Hassan",
    equipmentId:   "EQ-003",
    equipmentName: "Laptop (MacBook)",
    startDate:     "2025-06-01",
    returnDate:    null,
    status:        "active",
  },
  {
    id:            "LN-0002",
    studentId:     "STU-20230187",
    studentName:   "Priya Raj",
    equipmentId:   "EQ-006",
    equipmentName: "Drawing Tablet",
    startDate:     "2025-06-03",
    returnDate:    null,
    status:        "active",
  },
];
