# Campus Equipment Loan — Electron App

A desktop application built with **Electron + React + Vite**.

## Project Structure

```
equipment-loan-app/
├── electron/
│   ├── main.js          # Main process — window creation, IPC handlers
│   └── preload.js       # Context bridge — exposes safe API to renderer
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Badge.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── StatCard.jsx
│   │   │   ├── TitleBar.jsx   ← Electron-specific draggable title bar
│   │   │   └── Toast.jsx
│   │   ├── equipment/
│   │   │   ├── EquipmentCard.jsx
│   │   │   └── EquipmentGrid.jsx
│   │   └── loans/
│   │       ├── LoanFormModal.jsx
│   │       ├── LoanRow.jsx
│   │       └── ReturnModal.jsx
│   ├── data/
│   │   └── seedData.js
│   ├── hooks/
│   │   └── useLoans.js    ← swap useState with PouchDB here
│   ├── pages/
│   │   ├── EquipmentPage.jsx
│   │   └── LoansPage.jsx
│   └── utils/
│       └── helpers.js
├── index.html
├── package.json
└── vite.config.js
```

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Run in development mode

Starts the Vite dev server and Electron together, with hot-reload.

```bash
npm run dev
```

### 3. Build a distributable

```bash
npm run dist
```

Outputs a platform installer to `dist-electron/`.

---

## Adding PouchDB

### Install

```bash
npm install pouchdb pouchdb-find
```

### Wire up in `src/hooks/useLoans.js`

Replace the two `useState` initialisers with PouchDB calls.
The IPC channel is already set up in `electron/main.js` (`db:ping`).

**Option A — PouchDB in the renderer** (simplest for local-only data):

```js
import PouchDB from "pouchdb";
import PouchDBFind from "pouchdb-find";
PouchDB.plugin(PouchDBFind);

const db = new PouchDB("equipment-loan");

export function useLoans() {
  const [equipment, setEquipment] = useState([]);
  const [loans, setLoans]         = useState([]);

  useEffect(() => {
    db.allDocs({ include_docs: true }).then(({ rows }) => {
      const docs = rows.map((r) => r.doc);
      setEquipment(docs.filter((d) => d.type === "equipment"));
      setLoans(docs.filter((d) => d.type === "loan"));
    });
  }, []);

  const createLoan = async (item, borrower) => {
    const loan = { _id: nextLoanId(loans), type: "loan", ...borrower, equipmentId: item.id, ... };
    await db.put(loan);
    await db.put({ ...item, available: false });
    // then update local state
  };

  // ... etc
}
```

**Option B — PouchDB in the main process** (better for sync / multi-window):

Add IPC handlers in `electron/main.js` and call them via
`window.electronAPI.*` from the renderer. The preload bridge is already in
place in `electron/preload.js`.

---

## Security Notes

- `contextIsolation: true` and `nodeIntegration: false` are set by default.
- The Content-Security-Policy in `index.html` restricts script/style sources.
- All Node access from the renderer goes through the narrow `contextBridge` in `preload.js`.
