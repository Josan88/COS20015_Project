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

      // ===== ChangeLog Table =====
      db.run(`
        CREATE TABLE IF NOT EXISTS changelog (
          ChangeID INTEGER PRIMARY KEY AUTOINCREMENT,
          TableName TEXT NOT NULL,
          RecordID TEXT NOT NULL,
          Operation TEXT NOT NULL,
          DataJSON TEXT,
          Timestamp TEXT NOT NULL,
          SyncStatus TEXT NOT NULL DEFAULT 'pending'
        )
      `, (err) => {
        if (err) console.error('Error creating changelog table:', err);
      });

      // ===== ConflictLog Table =====
      db.run(`
        CREATE TABLE IF NOT EXISTS conflictlog (
          ConflictID INTEGER PRIMARY KEY AUTOINCREMENT,
          TableName TEXT NOT NULL,
          RecordID TEXT NOT NULL,
          LocalData TEXT,
          RemoteData TEXT,
          LocalTimestamp TEXT,
          RemoteTimestamp TEXT,
          Resolution TEXT DEFAULT 'pending',
          ResolvedAt TEXT,
          CreatedAt TEXT NOT NULL
        )
      `, (err) => {
        if (err) console.error('Error creating conflictlog table:', err);
      });

      // Insert seed data after tables are created
      insertSeedData()
        .then(resolve)
        .catch(reject);
    });
  });
}

/**
 * Log a change to the ChangeLog table
 */
function logChange(tableName, recordID, operation, data) {
  return new Promise((resolve, reject) => {
    const timestamp = new Date().toISOString();
    const dataJSON = data ? JSON.stringify(data) : null;
    db.run(
      `INSERT INTO changelog (TableName, RecordID, Operation, DataJSON, Timestamp, SyncStatus)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [tableName, recordID, operation, dataJSON, timestamp],
      (err) => {
        if (err) {
          console.error('Error logging change:', err);
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
}

/**
 * Get all unsynced changes from ChangeLog
 */
function getUnsyncedChanges() {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM changelog WHERE SyncStatus = 'pending' ORDER BY ChangeID ASC`,
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
}

/**
 * Mark a change as synced
 */
function markChangeSynced(changeID) {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE changelog SET SyncStatus = 'synced' WHERE ChangeID = ?`,
      [changeID],
      (err) => {
        if (err) reject(err);
        else resolve({ success: true });
      }
    );
  });
}

// ── Two-Way Sync Functions ───────────────────────────────────────────────

/**
 * Get a record by ID from a table
 */
function getRecordById(table, id) {
  return new Promise((resolve, reject) => {
    const idColumn = table === 'students' ? 'studentID' : table === 'equipment' ? 'equipmentID' : 'loanID';
    db.get(`SELECT * FROM ${table} WHERE ${idColumn} = ?`, [id], (err, row) => {
      if (err) reject(err);
      else resolve(row || null);
    });
  });
}

/**
 * Upsert a record from remote (CouchDB)
 */
function upsertFromRemote(table, record) {
  return new Promise((resolve, reject) => {
    if (table === 'equipment') {
      const { equipmentID, name, category, available } = record;
      db.run(
        `INSERT OR REPLACE INTO equipment (equipmentID, name, category, available) VALUES (?, ?, ?, ?)`,
        [equipmentID, name, category, available ? 1 : 0],
        (err) => err ? reject(err) : resolve()
      );
    } else if (table === 'loans') {
      const { loanID, studentID, equipmentID, borrowDate, returnDate, status } = record;
      db.run(
        `INSERT OR REPLACE INTO loans (loanID, studentID, equipmentID, borrowDate, returnDate, status, synced) VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [loanID, studentID, equipmentID, borrowDate, returnDate || null, status],
        (err) => err ? reject(err) : resolve()
      );
    } else if (table === 'students') {
      const { studentID, firstName, lastName, phone, email } = record;
      db.run(
        `INSERT OR REPLACE INTO students (studentID, firstName, lastName, phone, email) VALUES (?, ?, ?, ?, ?)`,
        [studentID, firstName, lastName, phone, email],
        (err) => err ? reject(err) : resolve()
      );
    } else {
      reject(new Error(`Unknown table: ${table}`));
    }
  });
}

/**
 * Update equipment availability
 */
function setEquipmentAvailable(equipmentID, available) {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE equipment SET available = ? WHERE equipmentID = ?`,
      [available ? 1 : 0, equipmentID],
      (err) => err ? reject(err) : resolve()
    );
  });
}

/**
 * Log a conflict
 */
function logConflict(tableName, recordID, localData, remoteData, localTimestamp, remoteTimestamp) {
  return new Promise((resolve, reject) => {
    const createdAt = new Date().toISOString();
    db.run(
      `INSERT INTO conflictlog (TableName, RecordID, LocalData, RemoteData, LocalTimestamp, RemoteTimestamp, Resolution, CreatedAt)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [
        tableName,
        recordID,
        JSON.stringify(localData),
        JSON.stringify(remoteData),
        localTimestamp,
        remoteTimestamp,
        createdAt
      ],
      (err) => err ? reject(err) : resolve()
    );
  });
}

/**
 * Get all pending conflicts
 */
function getPendingConflicts() {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM conflictlog WHERE Resolution = 'pending' ORDER BY CreatedAt DESC`,
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
}

/**
 * Resolve a conflict
 */
function resolveConflict(conflictID, resolution, winnerData) {
  return new Promise((resolve, reject) => {
    const resolvedAt = new Date().toISOString();
    db.run(
      `UPDATE conflictlog SET Resolution = ?, ResolvedAt = ? WHERE ConflictID = ?`,
      [resolution, resolvedAt, conflictID],
      async (err) => {
        if (err) return reject(err);

        // Get the conflict record to know which table/record to update
        db.get(
          `SELECT * FROM conflictlog WHERE ConflictID = ?`,
          [conflictID],
          async (err, conflict) => {
            if (err) return reject(err);
            if (!conflict) return reject(new Error('Conflict not found'));

            // Apply the winning data to the local database
            if (winnerData && resolution !== 'dismissed') {
              try {
                await upsertFromRemote(conflict.TableName, winnerData);
                // Log this as a local change too
                await logChange(conflict.TableName, conflict.RecordID, 'UPDATE', winnerData);
              } catch (e) {
                console.error('Error applying conflict resolution:', e);
              }
            }

            resolve({ success: true });
          }
        );
      }
    );
  });
}

/**
 * Get last sync timestamp
 */
function getLastSyncTimestamp() {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT MAX(Timestamp) as lastSync FROM changelog WHERE SyncStatus = 'synced'`,
      (err, row) => {
        if (err) reject(err);
        else resolve(row?.lastSync || null);
      }
    );
  });
}

/**
 * Mark all pending changes as synced (batch)
 */
function markAllChangesSynced() {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE changelog SET SyncStatus = 'synced' WHERE SyncStatus = 'pending'`,
      (err) => {
        if (err) reject(err);
        else resolve({ success: true });
      }
    );
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
              else {
                // Log changes to ChangeLog
                Promise.all([
                  logChange('loans', loanID, 'INSERT', loanData),
                  logChange('equipment', equipmentID, 'UPDATE', { available: 0 })
                ]).then(() => resolve({ ...loanData, synced: 0 }))
                  .catch(reject);
              }
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
                    else {
                      // Log changes to ChangeLog
                      Promise.all([
                        logChange('loans', loanID, 'UPDATE', { returnDate, status: 'Returned' }),
                        logChange('equipment', row.equipmentID, 'UPDATE', { available: 1 })
                      ]).then(() => resolve({ success: true }))
                        .catch(reject);
                    }
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

/**
 * Create a new equipment item
 */
function createEquipment(equipmentData) {
  return new Promise((resolve, reject) => {
    const { equipmentID, name, category } = equipmentData;
    db.run(
      `INSERT INTO equipment (equipmentID, name, category, available) VALUES (?, ?, ?, 1)`,
      [equipmentID, name, category],
      function(err) {
        if (err) reject(err);
        else {
          logChange('equipment', equipmentID, 'INSERT', { equipmentID, name, category, available: 1 })
            .then(() => resolve({ ...equipmentData, available: 1 }))
            .catch(reject);
        }
      }
    );
  });
}

/**
 * Update equipment details
 */
function updateEquipment(equipmentID, updates) {
  return new Promise((resolve, reject) => {
    const { name, category, available } = updates;
    db.run(
      `UPDATE equipment SET name = ?, category = ?, available = ? WHERE equipmentID = ?`,
      [name, category, available ? 1 : 0, equipmentID],
      function(err) {
        if (err) reject(err);
        else {
          logChange('equipment', equipmentID, 'UPDATE', updates)
            .then(() => resolve({ success: true }))
            .catch(reject);
        }
      }
    );
  });
}

/**
 * Delete an equipment item (only if not currently on loan)
 */
function deleteEquipment(equipmentID) {
  return new Promise((resolve, reject) => {
    // First get the equipment data for logging before deletion
    db.get(
      `SELECT * FROM equipment WHERE equipmentID = ?`,
      [equipmentID],
      (err, equipment) => {
        if (err) return reject(err);
        if (!equipment) return reject(new Error('Equipment not found'));

        db.get(
          `SELECT loanID FROM loans WHERE equipmentID = ? AND status = 'Borrowed'`,
          [equipmentID],
          (err, row) => {
            if (err) return reject(err);
            if (row) return reject(new Error('Cannot delete: item is currently on loan'));
            db.run(
              `DELETE FROM equipment WHERE equipmentID = ?`,
              [equipmentID],
              function(err) {
                if (err) reject(err);
                else {
                  logChange('equipment', equipmentID, 'DELETE', equipment)
                    .then(() => resolve({ success: true }))
                    .catch(reject);
                }
              }
            );
          }
        );
      }
    );
  });
}

module.exports = {
  initializeDatabase,
  getAllEquipment,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  getAllLoans,
  createLoan,
  returnLoan,
  getUnsyncedLoans,
  markLoanSynced,
  getAllStudents,
  logChange,
  getUnsyncedChanges,
  markChangeSynced,
  getRecordById,
  upsertFromRemote,
  setEquipmentAvailable,
  logConflict,
  getPendingConflicts,
  resolveConflict,
  getLastSyncTimestamp,
  markAllChangesSynced,
};
