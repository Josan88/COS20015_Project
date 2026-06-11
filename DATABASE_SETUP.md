# SQLite & CouchDB Integration Setup Guide

## Overview

Your Electron app now has:
- **SQLite database** for local data persistence (equipment, students, loans)
- **CouchDB sync** for syncing unsynced loans to a remote server
- **IPC bridge** for secure communication between React frontend and Electron main process

## Installation

### 1. Install Dependencies

```bash
npm install
```

This installs `sqlite3` and `axios` needed for database and sync operations.

### 2. CouchDB Configuration

The sync module is configured to connect to:
```
http://admin:admin@192.168.0.15:5984/campus_equipment_loan
```

**To modify the CouchDB URL**, edit [electron/sync.js](electron/sync.js#L7):

```javascript
const COUCHDB_URL = 'http://your-user:your-password@your-host:5984/your-database';
```

## Database Schema

### Tables

#### `students`
- `studentID` (TEXT, PRIMARY KEY)
- `firstName`, `lastName` (TEXT)
- `phone`, `email` (TEXT)

#### `equipment`
- `equipmentID` (TEXT, PRIMARY KEY)
- `name` (TEXT)
- `category` (TEXT)
- `available` (INTEGER: 0=borrowed, 1=available)

#### `loans`
- `loanID` (TEXT, PRIMARY KEY)
- `studentID`, `equipmentID` (TEXT with FOREIGN KEY)
- `borrowDate`, `returnDate` (TEXT, ISO 8601 format)
- `status` (TEXT: 'Borrowed' or 'Returned')
- `synced` (INTEGER: 0=unsynced, 1=synced)

## Running the App

### Development

```bash
npm run dev
```

This starts:
- Vite dev server on `http://localhost:5173`
- Electron app with dev tools open
- Database initialization on app startup

### Production Build

```bash
npm run build    # Build React app
npm run dist     # Create Electron installer
```

## Using the Database

### From React Components

All database operations go through `window.electronAPI`:

```javascript
// Get all equipment
const result = await window.electronAPI.db.equipment.getAll();
// Returns: { success: true, data: [...] }

// Get all loans
const result = await window.electronAPI.db.loans.getAll();

// Create a loan
const result = await window.electronAPI.db.loans.create({
  loanID: 'L001',
  studentID: 'S001',
  equipmentID: 'E001',
  borrowDate: '2026-06-12 09:00:00',
  status: 'Borrowed'
});

// Return a loan
const result = await window.electronAPI.db.loans.return('L001', '2026-06-12 17:00:00');

// Get unsynced loans
const result = await window.electronAPI.db.loans.getUnsynced();

// Get all students
const result = await window.electronAPI.db.students.getAll();
```

### Syncing to CouchDB

Manual sync is available via the "☁️ Sync" button in the app header, or programmatically:

```javascript
const result = await window.electronAPI.sync.syncLoans();
// Returns: { success: true, synced: 2, message: '...' }
```

Verify CouchDB connection:

```javascript
const result = await window.electronAPI.sync.verify();
// Returns: { success: true, database: '...', message: '...' }
```

## The `useLoans` Hook

Updated to use SQLite instead of seed data:

```javascript
const { equipment, loans, stats, loading, error, createLoan, returnLoan, reloadData } = useLoans();

// Create a loan (async)
await createLoan(item, { studentId: 'S001', studentName: 'John', startDate: '2026-06-12' });

// Return a loan (async)
await returnLoan('L001');

// Reload data from database
await reloadData();

// States
// - loading: boolean (true while loading from DB)
// - error: string | null (error message if load failed)
```

## Data Flow

```
┌─────────────────────────────────┐
│    React Frontend (App.jsx)     │
│  - Equipment Page               │
│  - Loans Page                   │
│  - Sync Button                  │
└────────────┬────────────────────┘
             │ IPC (contextBridge)
             ↓
┌─────────────────────────────────┐
│    Electron Main Process        │
│  - IPC Handlers (main.js)       │
│  - Database Module (db.js)      │
│  - Sync Module (sync.js)        │
└─────────────┬────────────┬──────┘
              │            │
         SQLite         CouchDB
       (equipment.db)   (remote)
```

## Common Tasks

### Adding Seed Data

Edit [electron/db.js](electron/db.js#L78-L100) `insertSeedData()` function.

### Changing Sync Interval

Currently set to **manual only**. To enable periodic sync, add to [electron/main.js](electron/main.js):

```javascript
// Auto-sync every 15 minutes
setInterval(() => {
  sync.syncLoansToCouchDB().catch(console.error);
}, 15 * 60 * 1000);
```

### Debugging

Check Electron console for logs prefixed with `[SYNC]`:
```
[SYNC] Starting loan sync to CouchDB...
[SYNC] Found 2 unsynced loan(s)
[SYNC] Successfully synced Loan L001
```

### Database File Location

SQLite database is stored in:
- **Windows**: `%APPDATA%\equipment-loan-app\equipment-loan.db`
- **macOS**: `~/Library/Application Support/equipment-loan-app/equipment-loan.db`
- **Linux**: `~/.config/equipment-loan-app/equipment-loan.db`

## Troubleshooting

### CouchDB Connection Failed

1. Verify CouchDB server is running at the configured URL
2. Check credentials in [electron/sync.js](electron/sync.js)
3. Ensure firewall allows connection to CouchDB port (default 5984)
4. Test connection: Run `await window.electronAPI.sync.verify()` in dev console

### Loans Not Syncing

1. Create a new loan and wait for it to be recorded
2. Click "☁️ Sync" button to manually sync
3. Check browser dev tools console (F12) for errors
4. Verify `synced` flag in database (0 = unsynced)

### Database Errors

1. Close all instances of the app
2. Delete `equipment-loan.db` from the data directory (caution: loses all data)
3. Restart app to recreate fresh database

## Files Modified/Created

- ✅ `electron/db.js` - NEW: SQLite database module
- ✅ `electron/sync.js` - NEW: CouchDB sync module  
- ✅ `electron/main.js` - MODIFIED: Added DB initialization & IPC handlers
- ✅ `electron/preload.js` - MODIFIED: Exposed DB & sync API to renderer
- ✅ `src/hooks/useLoans.js` - MODIFIED: Uses DB instead of seed data
- ✅ `src/App.jsx` - MODIFIED: Added sync button & async handlers
- ✅ `package.json` - MODIFIED: Added sqlite3 & axios dependencies

## Next Steps

1. **Run the app**: `npm run dev`
2. **Test database**: Create a loan, refresh app - data persists
3. **Test sync**: Click "☁️ Sync" button
4. **Monitor**: Check CouchDB for synced documents
