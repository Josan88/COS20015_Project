/**
 * seed-couchdb.js
 * External script to insert all local SQLite data into CouchDB
 * 
 * Usage: node scripts/seed-couchdb.js
 */

const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const path = require('path');
const os = require('os');

// CouchDB configuration
const COUCHDB_URL = 'http://admin:admin@192.168.0.18:5984/campus_equipment_loan';

// Database path (same as main app)
const DB_PATH = path.join(os.homedir(), 'AppData', 'Roaming', 'equipment-loan-app', 'equipment-loan.db');

const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY);

function getAll(table) {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM ${table}`, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

async function seedTable(tableName, records, idField) {
  console.log(`\nSeeding ${tableName}... (${records.length} records)`);

  let inserted = 0;
  let skipped = 0;

  for (const record of records) {
    const docId = `${tableName}_${record[idField]}`;

    try {
      // Check if doc already exists
      let existingRev = null;
      try {
        const existing = await axios.get(`${COUCHDB_URL}/${docId}`);
        existingRev = existing.data._rev;
        console.log(`  Skipping ${docId} (already exists)`);
        skipped++;
        continue;
      } catch (e) {
        // Doc doesn't exist, proceed to insert
      }

      const doc = {
        _id: docId,
        tableName: tableName,
        recordID: record[idField],
        operation: 'INSERT',
        data: record,
        localTimestamp: new Date().toISOString(),
        pushedAt: new Date().toISOString(),
        source: 'seed-script'
      };

      await axios.put(`${COUCHDB_URL}/${docId}`, doc);
      console.log(`  Inserted ${docId}`);
      inserted++;

    } catch (err) {
      console.error(`  Failed to insert ${docId}:`, err.message);
    }
  }

  console.log(`  ${tableName}: ${inserted} inserted, ${skipped} skipped`);
  return { inserted, skipped };
}

async function main() {
  console.log('=== CouchDB Seed Script ===');
  console.log(`SQLite: ${DB_PATH}`);
  console.log(`CouchDB: ${COUCHDB_URL}`);

  // Verify CouchDB connection
  try {
    await axios.get(COUCHDB_URL);
    console.log('\n✓ CouchDB connection verified');
  } catch (err) {
    console.error('\n✗ Cannot connect to CouchDB:', err.message);
    process.exit(1);
  }

  // Verify SQLite exists
  const fs = require('fs');
  if (!fs.existsSync(DB_PATH)) {
    console.error('\n✗ SQLite database not found at:', DB_PATH);
    process.exit(1);
  }
  console.log('✓ SQLite database found');

  // Read all data
  const students = await getAll('students');
  const equipment = await getAll('equipment');
  const loans = await getAll('loans');

  console.log(`\nData loaded from SQLite:`);
  console.log(`  Students: ${students.length}`);
  console.log(`  Equipment: ${equipment.length}`);
  console.log(`  Loans: ${loans.length}`);

  // Seed each table
  const results = {};
  results.students = await seedTable('students', students, 'studentID');
  results.equipment = await seedTable('equipment', equipment, 'equipmentID');
  results.loans = await seedTable('loans', loans, 'loanID');

  // Summary
  const totalInserted = results.students.inserted + results.equipment.inserted + results.loans.inserted;
  const totalSkipped = results.students.skipped + results.equipment.skipped + results.loans.skipped;

  console.log('\n=== Summary ===');
  console.log(`Total inserted: ${totalInserted}`);
  console.log(`Total skipped: ${totalSkipped}`);
  console.log('\nDone! You can now test two-way sync.');

  db.close();
}

main().catch(err => {
  console.error('Fatal error:', err);
  db.close();
  process.exit(1);
});
