/**
 * sync.js
 * Two-way CouchDB sync module with conflict detection and resolution
 */

const axios = require('axios');
const db = require('./db');

// CouchDB configuration
const COUCHDB_URL = 'http://admin:admin@192.168.0.18:5984/campus_equipment_loan';

/**
 * Push local changes to CouchDB
 */
async function pushToCouchDB() {
  console.log('[SYNC] Pushing local changes to CouchDB...');

  try {
    const unsyncedChanges = await db.getUnsyncedChanges();

    if (unsyncedChanges.length === 0) {
      console.log('[SYNC] No local changes to push.');
      return { pushed: 0, message: 'No local changes' };
    }

    console.log(`[SYNC] Found ${unsyncedChanges.length} local change(s) to push`);

    let pushedCount = 0;
    let failedCount = 0;
    const errors = [];

    for (const change of unsyncedChanges) {
      try {
        // Use a document ID that encodes table + record for easy lookup
        const docId = `${change.TableName}_${change.RecordID}`;

        // Get existing remote doc to preserve _rev if it exists
        let existingRev = null;
        try {
          const existing = await axios.get(`${COUCHDB_URL}/${docId}`);
          existingRev = existing.data._rev;
        } catch (e) {
          // Doc doesn't exist yet, that's fine
        }

        const couchDocument = {
          _id: docId,
          tableName: change.TableName,
          recordID: change.RecordID,
          operation: change.Operation,
          data: change.DataJSON ? JSON.parse(change.DataJSON) : null,
          localTimestamp: change.Timestamp,
          pushedAt: new Date().toISOString(),
        };

        if (existingRev) {
          couchDocument._rev = existingRev;
        }

        await axios.put(`${COUCHDB_URL}/${docId}`, couchDocument);

        console.log(`[SYNC] Pushed Change #${change.ChangeID} (${change.Operation} on ${change.TableName})`);
        await db.markChangeSynced(change.ChangeID);
        pushedCount++;

      } catch (err) {
        failedCount++;
        console.error(`[SYNC] Failed to push Change #${change.ChangeID}: ${err.message}`);
        errors.push({ changeID: change.ChangeID, error: err.message });
      }
    }

    console.log(`[SYNC] Push completed. Pushed: ${pushedCount}, Failed: ${failedCount}`);
    return {
      success: failedCount === 0,
      pushed: pushedCount,
      failed: failedCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `Pushed ${pushedCount} change(s)` + (failedCount > 0 ? `, ${failedCount} failed` : '')
    };

  } catch (err) {
    console.error('[SYNC] Fatal error during push:', err);
    return { success: false, pushed: 0, error: err.message };
  }
}

/**
 * Pull remote changes from CouchDB and merge into local SQLite
 * Detects conflicts when both local and remote have changes
 */
async function pullFromCouchDB() {
  console.log('[SYNC] Pulling remote changes from CouchDB...');

  try {
    // Get all docs from CouchDB
    const response = await axios.get(`${COUCHDB_URL}/_all_docs?include_docs=true`);
    const remoteDocs = response.data.rows.filter(r => !r.id.startsWith('_design/'));

    if (remoteDocs.length === 0) {
      console.log('[SYNC] No remote documents found.');
      return { pulled: 0, conflicts: 0, message: 'No remote data' };
    }

    console.log(`[SYNC] Found ${remoteDocs.length} remote document(s)`);

    let pulledCount = 0;
    let conflictCount = 0;
    let skippedCount = 0;
    const conflicts = [];

    // Get last sync timestamp to detect what's new
    const lastSync = await db.getLastSyncTimestamp();

    // BUGFIX (was called inside the for loop): fetch unsynced changes ONCE
    // before the loop. Calling it per-iteration re-ran the query and meant
    // a change logged mid-loop would silently shift the conflict picture.
    const localChanges = await db.getUnsyncedChanges();

    for (const row of remoteDocs) {
      const remoteDoc = row.doc;
      const { tableName, recordID, operation, data, localTimestamp } = remoteDoc;

      if (!tableName || !recordID || !data) {
        console.log(`[SYNC] Skipping invalid document: ${row.id}`);
        skippedCount++;
        continue;
      }

      try {
        // Skip DELETE operations from remote (we don't delete locally from sync)
        if (operation === 'DELETE') {
          console.log(`[SYNC] Skipping DELETE operation for ${tableName}:${recordID}`);
          skippedCount++;
          continue;
        }

        // Check if record exists locally
        const localRecord = await db.getRecordById(tableName, recordID);

        // Check if we have local unsynced changes for this record
        const hasLocalPendingChange = localChanges.some(
          c => c.TableName === tableName && c.RecordID === recordID
        );

        if (localRecord && hasLocalPendingChange) {
          // CONFLICT: Both local and remote have changes
          console.log(`[SYNC] CONFLICT detected for ${tableName}:${recordID}`);

          // Get local change timestamp
          const localChange = localChanges.find(
            c => c.TableName === tableName && c.RecordID === recordID
          );

          // Last-write-wins based on timestamp
          const localTime = new Date(localChange.Timestamp).getTime();
          const remoteTime = new Date(localTimestamp || remoteDoc.pushedAt).getTime();

          if (remoteTime > localTime) {
            // Remote wins - apply remote data
            console.log(`[SYNC] Remote wins for ${tableName}:${recordID} (remote newer)`);
            await db.upsertFromRemote(tableName, data);
            // BUGFIX: was db.markAllChangesSynced() which wiped EVERY pending
            // change, not just this one. Scope the mark to the resolved record
            // so other pending edits on unrelated records still get pushed.
            await db.markChangeSynced(localChange.ChangeID);
          } else if (localTime > remoteTime) {
            // Local wins - keep local, push later
            console.log(`[SYNC] Local wins for ${tableName}:${recordID} (local newer)`);
            // Local data stays, will be pushed on next sync
          } else {
            // Same timestamp - log as conflict for manual resolution
            console.log(`[SYNC] Timestamps equal for ${tableName}:${recordID} - logging conflict`);
            await db.logConflict(
              tableName,
              recordID,
              localRecord,
              data,
              localChange.Timestamp,
              localTimestamp || remoteDoc.pushedAt
            );
            conflictCount++;
            conflicts.push({ tableName, recordID });
          }
        } else if (!localRecord) {
          // New record from remote - insert locally
          console.log(`[SYNC] New remote record: ${tableName}:${recordID}`);
          await db.upsertFromRemote(tableName, data);
          pulledCount++;
        } else {
          // Record exists locally but no local pending changes - update from remote
          console.log(`[SYNC] Updating local record from remote: ${tableName}:${recordID}`);
          await db.upsertFromRemote(tableName, data);
          pulledCount++;
        }

      } catch (err) {
        console.error(`[SYNC] Error processing ${tableName}:${recordID}:`, err.message);
        skippedCount++;
      }
    }

    console.log(`[SYNC] Pull completed. Pulled: ${pulledCount}, Conflicts: ${conflictCount}, Skipped: ${skippedCount}`);

    return {
      success: true,
      pulled: pulledCount,
      conflicts: conflictCount,
      skipped: skippedCount,
      conflictList: conflicts,
      message: `Pulled ${pulledCount} record(s)` + (conflictCount > 0 ? `, ${conflictCount} conflict(s)` : '')
    };

  } catch (err) {
    console.error('[SYNC] Fatal error during pull:', err);
    return { success: false, pulled: 0, error: err.message };
  }
}

/**
 * Full two-way sync: push local changes, then pull remote changes
 */
async function twoWaySync() {
  console.log('[SYNC] Starting two-way sync...');

  const pushResult = await pushToCouchDB();
  const pullResult = await pullFromCouchDB();

  return {
    success: pushResult.success && pullResult.success,
    push: pushResult,
    pull: pullResult,
    message: `Push: ${pushResult.message}. Pull: ${pullResult.message}`
  };
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
  twoWaySync,
  pushToCouchDB,
  pullFromCouchDB,
  verifyCouchDBConnection,
};
