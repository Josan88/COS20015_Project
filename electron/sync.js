/**
 * sync.js
 * Two-way CouchDB sync using PouchDB's built-in replication
 */

const { studentsDB, equipmentDB, loansDB } = require('./db');

// CouchDB configuration
const COUCHDB_URL = 'http://admin:admin@192.168.0.18:5984/campus_equipment_loan2';

// Track sync state
let activeSyncHandlers = [];
let syncStatus = 'idle';
let lastSyncTime = null;
let syncListener = null;

/**
 * Set a listener for sync events
 */
function setSyncListener(listener) {
  syncListener = listener;
}

/**
 * Emit sync event
 */
function emitSyncEvent(event) {
  if (syncListener) {
    syncListener(event);
  }
}

/**
 * Create a single database sync handler
 */
function createSyncHandler(localDB, remoteURL, dbName) {
  const remoteDB = new (require('pouchdb'))(remoteURL);

  const syncHandler = localDB
    .sync(remoteDB, { live: true, retry: true })
    .on('change', (info) => {
      console.log(`[SYNC] ${dbName} change:`, info.direction, info.change?.docs?.length, 'doc(s)');
      emitSyncEvent({
        type: 'change',
        database: dbName,
        direction: info.direction,
        docsCount: info.change?.docs?.length || 0
      });
    })
    .on('paused', (info) => {
      console.log(`[SYNC] ${dbName} paused (idle)`);
      if (syncStatus !== 'active') {
        syncStatus = 'idle';
        emitSyncEvent({ type: 'idle', database: dbName });
      }
    })
    .on('active', () => {
      console.log(`[SYNC] ${dbName} active (syncing)`);
      syncStatus = 'active';
      emitSyncEvent({ type: 'active', database: dbName });
    })
    .on('error', (err) => {
      console.error(`[SYNC] ${dbName} error:`, err);
      syncStatus = 'error';
      emitSyncEvent({ type: 'error', database: dbName, error: err.message });
    });

  return syncHandler;
}

/**
 * Start live two-way sync with CouchDB
 */
async function startLiveSync() {
  console.log('[SYNC] Starting live two-way sync...');

  // Stop any existing sync
  stopSync();

  const syncURL = `${COUCHDB_URL}`;

  // Start sync for each database
  const studentsSync = createSyncHandler(studentsDB, `${syncURL}_students`, 'students');
  const equipmentSync = createSyncHandler(equipmentDB, `${syncURL}_equipment`, 'equipment');
  const loansSync = createSyncHandler(loansDB, `${syncURL}_loans`, 'loans');

  activeSyncHandlers = [studentsSync, equipmentSync, loansSync];
  syncStatus = 'active';
  lastSyncTime = new Date().toISOString();

  console.log('[SYNC] Live sync started for all databases');
  return { success: true, message: 'Live sync started' };
}

/**
 * Perform a single push-pull sync (non-live)
 */
async function oneTimeSync() {
  console.log('[SYNC] Starting one-time sync...');

  const syncURL = `${COUCHDB_URL}`;
  const results = {};

  const databases = [
    { name: 'students', db: studentsDB },
    { name: 'equipment', db: equipmentDB },
    { name: 'loans', db: loansDB }
  ];

  for (const { name, db } of databases) {
    try {
      const remoteDB = new (require('pouchdb'))(`${syncURL}_${name}`);

      // One-time sync
      const result = await db.sync(remoteDB).on('complete', (info) => {
        console.log(`[SYNC] ${name} sync complete:`, info);
        return info;
      });

      results[name] = {
        success: true,
        pushed: result.push?.docs_written || 0,
        pulled: result.pull?.docs_written || 0
      };
    } catch (err) {
      console.error(`[SYNC] ${name} sync failed:`, err);
      results[name] = { success: false, error: err.message };
    }
  }

  lastSyncTime = new Date().toISOString();
  console.log('[SYNC] One-time sync completed:', results);

  return {
    success: Object.values(results).every(r => r.success),
    results,
    message: 'One-time sync completed'
  };
}

/**
 * Stop all sync operations
 */
function stopSync() {
  activeSyncHandlers.forEach(handler => {
    try {
      handler.cancel();
    } catch (err) {
      console.error('[SYNC] Error stopping sync:', err);
    }
  });
  activeSyncHandlers = [];
  syncStatus = 'idle';
  console.log('[SYNC] Sync stopped');
}

/**
 * Get current sync status
 */
function getSyncStatus() {
  return {
    status: syncStatus,
    lastSyncTime,
    activeSyncs: activeSyncHandlers.length
  };
}

/**
 * Verify connection to CouchDB
 */
async function verifyCouchDBConnection() {
  try {
    const PouchDB = require('pouchdb');
    const testDB = new PouchDB(`${COUCHDB_URL}_test`);
    const info = await testDB.info();
    await testDB.destroy();

    console.log('[SYNC] CouchDB connection verified');
    return {
      success: true,
      database: info.db_name,
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
  startLiveSync,
  oneTimeSync,
  stopSync,
  getSyncStatus,
  verifyCouchDBConnection,
  setSyncListener,
};
