# AssetHub — IT Asset Management (Frontend)

A React frontend for an IT Asset Management system, built to sit in front of a
**.NET 8.0 Web API** + **SQL Server** backend deployed on **IIS**. This package is
**frontend only** — all data currently lives in-memory (seeded from
`src/data/mockData.js`) and is persisted to the browser's `localStorage` /
`sessionStorage` purely so the demo survives a page refresh. Swap in real API
calls as described below and it will work unchanged against your backend.

## Quick start

```bash
npm install
npm run dev       # http://localhost:5173
```

To build for production (e.g. to drop into an IIS site or a `wwwroot` folder
served by the API project):

```bash
npm run build      # outputs to /dist
npm run preview    # sanity-check the production build locally
```

### Demo login

| Role | Email | Password |
|---|---|---|
| Administrator | `admin@assethub.io` | `Admin@123` |
| IT Manager | `itmanager@assethub.io` | `Manager@123` |

## What's included

- **Admin login flow** — `src/pages/Login.jsx` + `src/context/AuthContext.jsx`.
  Currently checks against an in-file demo user list; replace `login()` with a
  `POST /api/auth/login` call returning a JWT, store the token instead of the
  session object, and add an axios/fetch interceptor for the `Authorization`
  header.
- **Dashboard** — KPIs, category breakdown, warranty-expiry watchlist, open
  maintenance tickets, live activity feed.
- **Inventory** — record a purchase/GRN once (vendor, category, quantity, unit
  cost, warranty, **mandatory Configuration** fields) and the app **auto-generates
  one tagged Asset record per unit** (`AST-<CAT>-00001`, internal serial,
  computed warranty expiry). No per-unit manual entry.
- **Assets** — master list of every generated asset, with search, category /
  status / location / vendor filters, and an **eye icon** that opens a full
  360° detail drawer: Asset Details, Vendor & Purchase, Warranty, Assignment
  History, Maintenance Records. Row actions: assign to employee, return to
  stock, raise/close maintenance ticket, retire.
- **Doc-aligned Asset Status** — statuses now match the spec exactly:
  Available, Assigned, Under Repair, Lost, Damaged, Retired, Disposed. Use
  "Change status…" on an asset's action menu to move it to any of these
  (auto-returns it first if it was assigned).
- **Transfer** — move an asset directly from one employee to another in a
  single action (separate from Assign/Return), logged as its own history
  entry.
- **Performed By** on history — every Assign / Return / Transfer entry now
  records which admin performed the action, shown in the Assignment History
  tab of the asset detail drawer.
- **Categories** — simple management of the category list (name + tag prefix)
  that drives the Inventory dropdown, the asset-tag prefix, and the
  Dashboard's category-wise breakdown. Categories can be renamed/deactivated
  but not deleted, so historical batches stay consistent.
- **Editing to fix typos** — Inventory batches have an Edit (pencil) action
  that corrects the batch header (vendor, cost, dates, configuration) and
  cascades those shared fields to every asset generated from that batch.
  Individual Assets also have an Edit action for per-unit fields (serial
  number, condition, location, notes) without touching the asset's tag or
  history.
- **Per-unit Serial Number at intake** — when adding Inventory, one Serial
  Number input appears per unit in the quantity, pre-filled with a suggested
  value and editable — overwrite with the real manufacturer serial where
  you have it.
- **Vendors** — directory with categories supplied, contact info, GST, rating,
  assets-supplied count, search/filter, add vendor (ID auto-generated).
- **Employees** — directory with department/designation/location, assets
  currently issued, search/filter, add employee (ID auto-generated).
- **Reports** — Warranty Expiry, Vendor-wise Procurement Spend, Department
  Allocation, Maintenance Cost — each independently exportable, plus a
  category book-value chart.
- **Export to Excel everywhere** — every table/report has an "Export to Excel"
  button (`src/utils/exportExcel.js`, via SheetJS/`xlsx`), producing a real
  `.xlsx` file client-side.
- **Auto-generated identifiers** — asset tags, internal serials, GRN/batch IDs,
  PO numbers, employee IDs, vendor IDs and maintenance ticket IDs are all
  produced by `src/utils/idGenerator.js` so operators never type an ID by hand.

## Design reference & theme

Layout patterns (sidebar + data-grid module structure, asset detail drawer,
inventory→asset generation) were modeled after common patterns in open-source
asset/IT service management tools (Snipe-IT, Ralph, GLPI) — a persistent
left-nav across Assets/Inventory/Vendors/People/Reports, a searchable/filterable
grid per module, and a single "asset of record" view aggregating
procurement, warranty, assignment and maintenance data.

The color system is a faint, VS-2026-icon-inspired purple:

| Token | Hex | Use |
|---|---|---|
| `--primary` | `#6C4FE0` | Primary actions, active nav |
| `--primary-dark` / `--primary-darker` | `#52369F` / `#3B2872` | Sidebar gradient, hover |
| `--accent` | `#9B7EF2` | Chart accents, highlights |
| `--bg` | `#F5F3FB` | App background |
| `--primary-soft` | `#EEE9FC` | Hover surfaces, chips |

Typography: **Manrope** for headings/UI chrome, **Inter** for body/table text,
**Space Mono** for tags/serials/IDs.

## Wiring up the .NET 8 Web API

Everything reads/writes through `src/context/DataContext.jsx`. To connect a
real backend:

1. Create `src/api/client.js` with a `fetch`/axios instance pointed at your
   API base URL (`https://your-iis-host/api`), attaching the JWT from
   `AuthContext`.
2. Replace the seed-and-hold-in-state logic in `DataContext.jsx` with
   `useEffect` calls to `GET /api/assets`, `GET /api/vendors`,
   `GET /api/employees`, `GET /api/inventory-batches`, `GET /api/maintenance`.
3. Replace `addInventoryBatch`, `assignAsset`, `unassignAsset`,
   `raiseMaintenance`, `closeMaintenance`, `retireAsset`, `addVendor`,
   `addEmployee` bodies with `POST`/`PUT` calls to matching endpoints. Keep the
   function signatures the same — no page needs to change.
4. Move ID generation (`src/utils/idGenerator.js`) server-side (SQL Server
   `IDENTITY`/sequence or a stored procedure) so numbering is safe under
   concurrent writes; the API response for "create inventory batch" should
   return the generated batch + the list of generated assets, matching the
   shape `addInventoryBatch` currently returns locally.
5. Remove the `localStorage`/`sessionStorage` fallbacks once the API is the
   source of truth (kept now only so the standalone demo persists on refresh).

## Project structure

```
src/
  components/     DataTable, Modal, AssetDetailDrawer, Layout, Badge, StatCard…
  context/        AuthContext (login/session), DataContext (all domain state)
  data/           categoryConfig.js (mandatory config schema per category),
                  mockData.js (seed vendors/employees/inventory/assets)
  pages/          Login, Dashboard, Assets, Inventory, Vendors, Employees, Reports
  utils/          idGenerator.js, exportExcel.js
  styles.css      full theme + component styles
```
