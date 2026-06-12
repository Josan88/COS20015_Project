/**
 * db.js
 * SQLite database module for managing students, equipment, and loans
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { app } = require('electron');

// Database path: store in user's app data directory
const DB_PATH = path.join(app.getPath('userData'), 'equipment-loan.db');

let db = null;

/**
 * Initialize database and create tables if they don't exist
 */
async function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        reject(err);
      } else {
        console.log('Connected to SQLite database at:', DB_PATH);
        validateAndFixSchema()
          .then(() => createTables())
          .then(resolve)
          .catch(reject);
      }
    });
  });
}

/**
 * Validate all table schemas and recreate if needed
 */
async function validateAndFixSchema() {
  return new Promise((resolve, reject) => {
    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
      if (err) {
        console.error('Error checking tables:', err);
        reject(err);
        return;
      }

      const tableNames = tables.map(t => t.name);
      
      // If any tables exist, validate their schemas
      if (tableNames.length > 0) {
        Promise.all([
          validateTable('students', ['studentID', 'firstName', 'lastName']),
          validateTable('equipment', ['equipmentID', 'name', 'category', 'available']),
          validateTable('loans', ['loanID', 'studentID', 'equipmentID', 'borrowDate', 'status', 'synced'])
        ]).then(([studentsOk, equipmentOk, loansOk]) => {
          if (!studentsOk || !equipmentOk || !loansOk) {
            console.log('Schema mismatch detected - rebuilding database...');
            // Drop all tables and let createTables recreate them fresh
            db.run('DROP TABLE IF EXISTS loans', (err) => {
              if (err) console.error('Error dropping loans:', err);
              db.run('DROP TABLE IF EXISTS equipment', (err) => {
                if (err) console.error('Error dropping equipment:', err);
                db.run('DROP TABLE IF EXISTS students', (err) => {
                  if (err) console.error('Error dropping students:', err);
                  resolve();
                });
              });
            });
          } else {
            resolve();
          }
        }).catch(reject);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Validate a table has required columns
 */
async function validateTable(tableName, requiredColumns) {
  return new Promise((resolve) => {
    db.all(`PRAGMA table_info(${tableName})`, (err, columns) => {
      if (err) {
        resolve(false);
        return;
      }
      
      if (!columns || columns.length === 0) {
        resolve(false);
        return;
      }

      const columnNames = columns.map(c => c.name);
      const hasAllColumns = requiredColumns.every(col => columnNames.includes(col));
      resolve(hasAllColumns);
    });
  });
}

/**
 * Create tables if they don't exist
 */
async function createTables() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('PRAGMA foreign_keys = ON');

      // ===== Students Table =====
      db.run(`
        CREATE TABLE IF NOT EXISTS students (
          studentID TEXT PRIMARY KEY,
          firstName TEXT NOT NULL,
          lastName TEXT NOT NULL,
          phone TEXT,
          email TEXT
        )
      `, (err) => {
        if (err) console.error('Error creating students table:', err);
      });

      // ===== Equipment Table =====
      db.run(`
        CREATE TABLE IF NOT EXISTS equipment (
          equipmentID TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          category TEXT NOT NULL,
          available INTEGER NOT NULL DEFAULT 1
        )
      `, (err) => {
        if (err) console.error('Error creating equipment table:', err);
      });

      // ===== Loans Table =====
      db.run(`
        CREATE TABLE IF NOT EXISTS loans (
          loanID TEXT PRIMARY KEY,
          studentID TEXT NOT NULL,
          equipmentID TEXT NOT NULL,
          borrowDate TEXT NOT NULL,
          returnDate TEXT,
          status TEXT NOT NULL,
          synced INTEGER DEFAULT 0,

          FOREIGN KEY(studentID)
            REFERENCES students(studentID),

          FOREIGN KEY(equipmentID)
            REFERENCES equipment(equipmentID)
        )
      `, (err) => {
        if (err) console.error('Error creating loans table:', err);
      });

      // Insert seed data after tables are created
      insertSeedData()
        .then(resolve)
        .catch(reject);
    });
  });
}

/**
 * Insert seed data if tables are empty
 */
async function insertSeedData() {
  return new Promise((resolve, reject) => {
    // Check if data already exists
    db.get('SELECT COUNT(*) as count FROM equipment', (err, row) => {
      if (err) {
        console.error('Error checking equipment count:', err);
        reject(err);
        return;
      }

      console.log('Equipment count:', row.count);

      if (row.count === 0) {
        console.log('Inserting seed data...');
        
        // Insert students first
        db.run(`
          INSERT INTO students (studentID, firstName, lastName, phone, email)
          VALUES
          ('S001','William','Yong','0123456789','william@swinburne.edu.my'),
          ('S002','John','Tan','0112345678','john@swinburne.edu.my'),
          ('S003','Sarah','Lee','0198765432','sarah@swinburne.edu.my'),
          ('S004','Emily','Chen','0167890123','emily@swinburne.edu.my'),
          ('S005','Raj','Kumar','0189012345','raj@swinburne.edu.my')
        `, (err) => {
          if (err) {
            console.error('Error inserting students:', err);
            reject(err);
            return;
          }
          
          console.log('Students inserted');

          // After students, insert equipment
          db.run(`
            INSERT INTO equipment (equipmentID, name, category, available)
            VALUES
            ('E001','Dell Latitude 5430','Laptop', 1),
            ('E002','Canon EOS R50','Camera', 1),
            ('E003','Arduino Uno R3','Microcontroller', 1),
            ('E004','Epson Projector X500','Projector', 1),
            ('E005','Sony WH-1000XM5','Headphones', 1),
            ('E006','iPad Air M2','Tablet', 1),
            ('E007','Logitech C920 Webcam','Camera', 1),
            ('E008','USB-C Hub Adapter','Accessory', 1)
          `, (err) => {
            if (err) {
              console.error('Error inserting equipment:', err);
              reject(err);
              return;
            }

            console.log('Equipment inserted');
            resolve();
          });
        });
      } else {
        console.log('Seed data already exists, skipping insert');
        resolve();
      }
    });
  });
}

/**
 * Get all equipment
 */
function getAllEquipment() {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM equipment ORDER BY name`,
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
}

/**
 * Get all loans with related student and equipment info
 */
function getAllLoans() {
  return new Promise((resolve, reject) => {
    db.all(
      `
      SELECT
        l.loanID as id,
        l.studentID as studentId,
        s.firstName,
        s.lastName,
        (s.firstName || ' ' || s.lastName) as studentName,
        l.equipmentID as equipmentId,
        e.name as equipmentName,
        l.borrowDate as startDate,
        l.returnDate,
        l.status,
        l.synced
      FROM loans l
      INNER JOIN students s ON l.studentID = s.studentID
      INNER JOIN equipment e ON l.equipmentID = e.equipmentID
      ORDER BY l.borrowDate DESC
      `,
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
}

/**
 * Create a new loan
 */
function createLoan(loanData) {
  return new Promise((resolve, reject) => {
    const {
      loanID,
      studentID,
      equipmentID,
      borrowDate,
      status
    } = loanData;

    db.run(
      `
      INSERT INTO loans (loanID, studentID, equipmentID, borrowDate, status, synced)
      VALUES (?, ?, ?, ?, ?, 0)
      `,
      [loanID, studentID, equipmentID, borrowDate, status],
      function(err) {
        if (err) {
          reject(err);
        } else {
          // Update equipment availability
          db.run(
            `UPDATE equipment SET available = 0 WHERE equipmentID = ?`,
            [equipmentID],
            (err) => {
              if (err) reject(err);
              else resolve({ ...loanData, synced: 0 });
            }
          );
        }
      }
    );
  });
}

/**
 * Return a loan (mark as returned)
 */
function returnLoan(loanID, returnDate) {
  return new Promise((resolve, reject) => {
    db.run(
      `
      UPDATE loans
      SET returnDate = ?, status = 'Returned', synced = 0
      WHERE loanID = ?
      `,
      [returnDate, loanID],
      function(err) {
        if (err) {
          reject(err);
        } else {
          // Get the loan to update equipment
          db.get(
            `SELECT equipmentID FROM loans WHERE loanID = ?`,
            [loanID],
            (err, row) => {
              if (err) {
                reject(err);
              } else if (row) {
                // Update equipment availability
                db.run(
                  `UPDATE equipment SET available = 1 WHERE equipmentID = ?`,
                  [row.equipmentID],
                  (err) => {
                    if (err) reject(err);
                    else resolve({ success: true });
                  }
                );
              }
            }
          );
        }
      }
    );
  });
}

/**
 * Get unsynced loans
 */
function getUnsyncedLoans() {
  return new Promise((resolve, reject) => {
    db.all(
      `
      SELECT
        l.loanID,
        l.borrowDate,
        l.returnDate,
        l.status,

        s.studentID,
        s.firstName,
        s.lastName,
        s.phone,
        s.email,

        e.equipmentID,
        e.name,
        e.category

      FROM loans l
      INNER JOIN students s ON l.studentID = s.studentID
      INNER JOIN equipment e ON l.equipmentID = e.equipmentID
      WHERE l.synced = 0
      `,
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
}

/**
 * Mark loan as synced
 */
function markLoanSynced(loanID) {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE loans SET synced = 1 WHERE loanID = ?`,
      [loanID],
      (err) => {
        if (err) reject(err);
        else resolve({ success: true });
      }
    );
  });
}

/**
 * Get all students
 */
function getAllStudents() {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM students ORDER BY lastName, firstName`,
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
}

module.exports = {
  initializeDatabase,
  getAllEquipment,
  getAllLoans,
  createLoan,
  returnLoan,
  getUnsyncedLoans,
  markLoanSynced,
  getAllStudents,
};
