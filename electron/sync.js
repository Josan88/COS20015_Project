/**
 * sync.js
 * CouchDB sync module for syncing loans to remote database
 */

const axios = require('axios');
const db = require('./db');

// CouchDB configuration
const COUCHDB_URL = 'http://admin:admin@192.168.0.15:5984/campus_equipment_loan';

/**
 * Sync unsynced loans to CouchDB
 */
async function syncLoansToCouchDB() {
  console.log('[SYNC] Starting loan sync to CouchDB...');

  try {
    // Get all unsynced loans
    const unsyncedLoans = await db.getUnsyncedLoans();

    if (unsyncedLoans.length === 0) {
      console.log('[SYNC] No unsynced loans found.');
      return {
        success: true,
        synced: 0,
        message: 'No unsynced loans'
      };
    }

    console.log(`[SYNC] Found ${unsyncedLoans.length} unsynced loan(s)`);

    let syncedCount = 0;
    let failedCount = 0;
    const errors = [];

    // Sync each loan
    for (const loan of unsyncedLoans) {
      try {
        const couchDocument = {
          _id: loan.loanID,
          type: 'loan',
          borrowDate: loan.borrowDate,
          returnDate: loan.returnDate,
          status: loan.status,
          student: {
            studentID: loan.studentID,
            firstName: loan.firstName,
            lastName: loan.lastName,
            phone: loan.phone,
            email: loan.email
          },
          equipment: {
            equipmentID: loan.equipmentID,
            name: loan.name,
            category: loan.category
          },
          syncedAt: new Date().toISOString()
        };

        // Try to sync to CouchDB
        await axios.put(
          `${COUCHDB_URL}/${loan.loanID}`,
          couchDocument
        );

        console.log(`[SYNC] Successfully synced Loan ${loan.loanID}`);

        // Mark as synced in local database
        await db.markLoanSynced(loan.loanID);
        syncedCount++;

      } catch (err) {
        failedCount++;
        const errorMsg = `Failed to sync ${loan.loanID}: ${err.message}`;
        console.error(`[SYNC] ${errorMsg}`);
        if (err.response?.data) {
          console.error('[SYNC]', err.response.data);
        }
        errors.push({
          loanID: loan.loanID,
          error: err.message
        });
      }
    }

    console.log('[SYNC] Sync process completed.');
    console.log(`[SYNC] Synced: ${syncedCount}, Failed: ${failedCount}`);

    return {
      success: failedCount === 0,
      synced: syncedCount,
      failed: failedCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `Synced ${syncedCount} loan(s)` + (failedCount > 0 ? `, ${failedCount} failed` : '')
    };

  } catch (err) {
    console.error('[SYNC] Fatal error during sync:', err);
    return {
      success: false,
      synced: 0,
      error: err.message
    };
  }
}

/**
 * Verify connection to CouchDB
 */
async function verifyCouchDBConnection() {
  try {
    const response = await axios.get(COUCHDB_URL);
    console.log('[SYNC] CouchDB connection verified');
    return {
      success: true,
      database: response.data.db_name,
      message: 'Connected to CouchDB'
    };
  } catch (err) {
    console.error('[SYNC] CouchDB connection failed:', err.message);
    return {
      success: false,
      error: err.message,
      message: 'Failed to connect to CouchDB'
    };
  }
}

module.exports = {
  syncLoansToCouchDB,
  verifyCouchDBConnection,
};
