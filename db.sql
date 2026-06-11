CREATE TABLE students (
  studentID TEXT PRIMARY KEY,
  firstName, lastName TEXT,
  phone, email TEXT
)

-- Equipment
CREATE TABLE equipment (
  equipmentID TEXT PRIMARY KEY,
  name, category TEXT,
  available INTEGER (1=yes, 0=no)
)

-- Loans
CREATE TABLE loans (
  loanID TEXT PRIMARY KEY,
  studentID, equipmentID TEXT (FK),
  borrowDate, returnDate TEXT (ISO 8601),
  status TEXT ('Borrowed' or 'Returned'),
  synced INTEGER (0=unsync, 1=synced)
)