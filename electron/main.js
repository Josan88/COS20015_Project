const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const db = require("./db");
const sync = require("./sync");

// ── Dev vs production ──────────────────────────────────────────────────────
const isDev = !app.isPackaged;
const VITE_DEV_URL = "http://localhost:5173";

// ── Window factory ─────────────────────────────────────────────────────────
function createWindow() {
  const win = new BrowserWindow({
    width:          1200,
    height:         760,
    minWidth:       800,
    minHeight:      600,
    titleBarStyle:  "hiddenInset",   // native traffic lights on macOS
    backgroundColor: "#f1f5f9",
    webPreferences: {
      preload:            path.join(__dirname, "preload.js"),
      contextIsolation:   true,      // security: renderer cannot access Node
      nodeIntegration:    false,     // security: no direct Node in renderer
      sandbox:            false,     // needed for preload to use require
    },
    // Icon (place your own in public/ for packaged builds)
    ...(process.platform === "linux" && {
      icon: path.join(__dirname, "../public/icon.png"),
    }),
  });

  // Load app
  if (isDev) {
    win.loadURL(VITE_DEV_URL);
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  // Open external links in the system browser, not in Electron
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

// ── App lifecycle ──────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  try {
    // Initialize database
    await db.initializeDatabase();
    console.log("Database initialized successfully");
  } catch (err) {
    console.error("Failed to initialize database:", err);
    // Continue anyway - app might work with some degradation
  }

  createWindow();

  // macOS: re-create window when dock icon is clicked and no windows are open
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  // Quit on all platforms except macOS (where apps stay in the dock)
  if (process.platform !== "darwin") app.quit();
});

// ── IPC handlers ───────────────────────────────────────────────────────────
// Bridge between renderer (React) and main process (Node.js/SQLite)

ipcMain.handle("app:version", () => app.getVersion());

// ── Database: Equipment ────────────────────────────────────────────────────
ipcMain.handle("db:equipment:getAll", async () => {
  try {
    const equipment = await db.getAllEquipment();
    return { success: true, data: equipment };
  } catch (err) {
    console.error("Error fetching equipment:", err);
    return { success: false, error: err.message };
  }
});

// ── Database: Loans ───────────────────────────────────────────────────────
ipcMain.handle("db:loans:getAll", async () => {
  try {
    const loans = await db.getAllLoans();
    return { success: true, data: loans };
  } catch (err) {
    console.error("Error fetching loans:", err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle("db:loans:create", async (event, loanData) => {
  try {
    const loan = await db.createLoan(loanData);
    return { success: true, data: loan };
  } catch (err) {
    console.error("Error creating loan:", err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle("db:loans:return", async (event, loanID, returnDate) => {
  try {
    const result = await db.returnLoan(loanID, returnDate);
    return { success: true, data: result };
  } catch (err) {
    console.error("Error returning loan:", err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle("db:loans:getUnsynced", async () => {
  try {
    const loans = await db.getUnsyncedLoans();
    return { success: true, data: loans, count: loans.length };
  } catch (err) {
    console.error("Error fetching unsynced loans:", err);
    return { success: false, error: err.message };
  }
});

// ── Database: Students ────────────────────────────────────────────────────
ipcMain.handle("db:students:getAll", async () => {
  try {
    const students = await db.getAllStudents();
    return { success: true, data: students };
  } catch (err) {
    console.error("Error fetching students:", err);
    return { success: false, error: err.message };
  }
});

// ── Sync: CouchDB ─────────────────────────────────────────────────────────
ipcMain.handle("sync:verify", async () => {
  try {
    const result = await sync.verifyCouchDBConnection();
    return result;
  } catch (err) {
    console.error("Error verifying CouchDB connection:", err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle("sync:loans", async () => {
  try {
    const result = await sync.syncLoansToCouchDB();
    return result;
  } catch (err) {
    console.error("Error during sync:", err);
    return { success: false, error: err.message };
  }
});
