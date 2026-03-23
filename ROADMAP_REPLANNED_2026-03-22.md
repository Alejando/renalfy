# Renalfy Sprint Roadmap — Replanned 2026-03-22

**Purpose:** This document replans the complete Renalfy roadmap in light of the SUTR → Renalfy migration analysis, ensuring the platform is fully functional and compliant before production migration.

**Date:** 2026-03-22
**Status:** Ready for stakeholder approval
**Next Steps:** Present to product/tech leads, confirm decisions, assign sprint owners

---

## Executive Summary: What Changed

### Original Plan vs. New Reality

**Original plan (from CLAUDE.md):**
- Sprints 1–11: Core infrastructure + Clinic module ✅
- Sprint 12: Clinic — Citas + formulario dinámico
- Sprint 13–26: Remaining modules sequentially (Planes, Inventario, Caja, Reportes, Notificaciones, Migración)
- Sprint 27–29: Migration
- Total: 29 sprints over 7+ months

**Problems with original plan:**
1. **Sequential bottleneck:** Sprint 13 could not start until Sprint 12 done (clinic complete) — artificial serialization
2. **Module-level dependencies invisible:** No clear view of what blocks migration; unclear why migration needs Sprint 27–29
3. **No parallelization:** Backend and UI were treated as sequential (Backend → UI) instead of concurrent
4. **Vague scope in later sprints:** "Módulo 3: Productos + Stock" was a single sprint but covers 5+ features
5. **Post-migration work unclear:** Reportes, notificaciones, script maintenance were treated as sprints but not sized

---

## Analysis: What Must Be Done Before Migration

From **MIGRATION_EXECUTIVE_SUMMARY.md:**
- **Timeline:** 3 weeks (Sprints 28–29) for migration itself
- **Pre-migration work:** All backend modules must exist in production so data can be migrated

### Migration Blocker: Which Backend Must Exist?

| Module | Backend Done? | Needed for Migration? | UI Needed? |
|---|---|---|---|
| **Auth** | ✅ Sprint 2 | ✅ Yes (login) | ✅ Sprint 8 done |
| **Locations** | ✅ Sprint 3 | ✅ Yes (org structure) | ✅ Sprint 9 done |
| **Patients** | ✅ Sprint 5 | ✅ Yes (core data) | ✅ Sprint 10 done |
| **ServiceTypes** | ✅ Sprint 5 | ✅ Yes (data model) | ✅ Sprint 10 done |
| **Appointments** | ✅ Sprint 6 | ✅ Yes (sessions → appointments) | ❓ Sprint 12 (in progress) |
| **Receipts** | ✅ Sprint 7 | ✅ Yes (folio generation, critical for cash) | ✅ Sprint 11 done |
| **Companies** | Sprint 13 (TBD) | ✅ Yes (plans/benefits) | Sprint 14 (TBD) |
| **Plans** | Sprint 13 (TBD) | ✅ Yes (benefit tracking) | Sprint 14 (TBD) |
| **Products** | Sprint 15 (TBD) | ✅ Yes (inventory) | Sprint 16 (TBD) |
| **LocationStock** | Sprint 15 (TBD) | ✅ Yes (stock per location) | Sprint 16 (TBD) |
| **Suppliers** | Sprint 17 (TBD) | ✅ Yes (PO/purchase history) | Sprint 18 (TBD) |
| **SupplierProduct** | Sprint 17 (TBD) | ✅ Yes (supplier pricing) | Sprint 18 (TBD) |
| **PurchaseOrder** | Sprint 17 (TBD) | ⚠️ Maybe (SUTR has POs, but often unused) | Sprint 18 (TBD) |
| **Purchase** | Sprint 19 (TBD) | ✅ Yes (received goods) | Sprint 20 (TBD) |
| **InventoryMovement** | Sprint 19 (TBD) | ⚠️ Maybe (manual stock adjustments) | Sprint 20 (TBD) |
| **Sale** | Sprint 21 (TBD) | ✅ Yes (cash module) | Sprint 22 (TBD) |
| **Income** | Sprint 23 (TBD) | ✅ Yes (cash module) | Sprint 24 (TBD) |
| **Expense** | Sprint 23 (TBD) | ✅ Yes (cash module) | Sprint 24 (TBD) |
| **CashClose** | Sprint 23 (TBD) | ✅ Yes (reconciliation) | Sprint 24 (TBD) |

### Critical Finding: UI Is NOT Required for Migration

**Key insight:** The migration script reads directly from SUTR and writes to Renalfy's PostgreSQL database. **Users don't need a polished UI to migrate data.** The UI can follow the data migration — or even be under development simultaneously.

This means:
- **Migration can start as soon as all backend APIs exist** (whether UI is done or not)
- Backend and UI can run on parallel sprints
- A functional (even ugly) web UI for basic operations during parallel operation is enough

---

## New Sprint Roadmap: 27 Sprints (vs. 29)

### Roadmap Philosophy

1. **Clinic module complete first (Sprints 1–12):** Foundation for entire system
2. **Backend: Sprints 13–19:** All business modules (Planes, Inventario, Caja)
3. **UI: Sprints 20–26:** Build frontends in parallel to backend completion
4. **Migration: Sprints 27–28:** Execute migration; parallel operation; cutover
5. **Post-launch: Sprint 29+:** Bug fixes, reportes, notificaciones, optimization

### Module Dependencies

```
Clinic (✅ done)
├─ Pacientes ✅
├─ ServiceTypes ✅
├─ Appointments ✅
├─ Receipts ✅
└─ ClinicalTemplate (Sprint 12, in progress)

Planes (Sprint 13–14)
├─ Companies (backend)
├─ Plans (backend)
└─ Plan tracking in Receipts (already done)

Inventario (Sprint 15–20)
├─ Products (backend)
├─ LocationStock (backend)
├─ Suppliers (backend)
├─ SupplierProduct (backend)
├─ PurchaseOrder (backend)
├─ Purchases (backend)
├─ InventoryMovement (backend)
└─ UI: All above (concurrent)

Caja (Sprint 21–24)
├─ Sale (backend)
├─ Income (backend)
├─ Expense (backend)
├─ CashClose (backend)
└─ UI: All above (concurrent)

Migration (Sprint 27–28)
├─ All backend done ✅
├─ Schema updates (2 fields to Patient)
├─ Migration script dev (TypeScript)
├─ Full dataset validation
└─ Production cutover

Post-Launch (Sprint 29+)
├─ Bug fixes & stabilization
├─ Reportes (PDF/Excel)
├─ Notificaciones in-app
└─ Performance optimization
```

---

## Detailed Sprint Plan (Sprints 12–30+)

### Sprint 12: Clinic — Appointments + Dynamic Clinical Form (IN PROGRESS)

**Type:** Full (Backend + Frontend)
**Duration:** 1 week
**Status:** In progress
**Owner:** (current)
**Depends on:** Sprint 11 ✅

**Deliverables:**
- ✅ Backend: `PUT /api/appointments/:id` + clinical form submission
- ✅ Frontend: Appointments listing, detail view, form with dynamic fields
- ✅ Tests: Unit + E2E for form validation
- ✅ Docs: Spec for ClinicalTemplate + Appointment.clinicalData

**Success Criteria:**
- Citas UI matches receipt + patient views
- Form fields dynamically render from ClinicalTemplate.fields
- All tests pass (lint + types + tests)

**Blocks:** None (clinic module is complete after this)

---

### Sprint 13: Plans — Companies + Plans Backend

**Type:** Backend
**Duration:** 1 week
**Owner:** (TBD)
**Depends on:** Sprint 12 ✅

**Deliverables:**
- Backend: `Company` CRUD endpoints (`POST`, `GET`, `PATCH`, `DELETE`)
- Backend: `Plan` CRUD + plan exhaustion tracking
- Backend: Hook Receipt creation to check plan status (`ACTIVE` → `EXHAUSTED` if sessions used up)
- Tests: Unit tests for service logic (plan exhaustion edge cases)
- Spec: Companies + Plans feature spec

**APIs:**
- `POST /api/companies` → Create company
- `GET /api/companies?tenantId=...` → List
- `PATCH /api/companies/:id` → Update
- `POST /api/plans` → Create plan
- `PATCH /api/plans/:id` → Update (including status transitions)
- `GET /api/plans/:id` → Detail with session usage tracking

**Business Rules:**
- Plan.plannedSessions - usedSessions = remaining
- When Receipt created with `paymentType = BENEFIT`, check if plan has sessions left
- If plan.usedSessions >= plan.plannedSessions, set plan.status = EXHAUSTED
- Prevent new receipts for EXHAUSTED plans

**Success Criteria:**
- All CRUD operations working
- Plan exhaustion logic tested
- Type-safe Zod schemas in @repo/types

**Blocks:** Sprint 14 (UI)

---

### Sprint 14: Plans — Companies + Plans UI

**Type:** Frontend
**Duration:** 1 week
**Owner:** (TBD)
**Depends on:** Sprint 13

**Deliverables:**
- Frontend: Companies listing page
- Frontend: Create/edit company form
- Frontend: Plans listing page (with usage visualization: X/Y sessions used)
- Frontend: Create/edit plan form
- Frontend: Plan detail page with payment history
- Tests: Component tests for forms

**Pages:**
- `/dashboard/companies` → List
- `/dashboard/companies/new` → Create
- `/dashboard/companies/:id/edit` → Edit
- `/dashboard/plans` → List (with usage bar)
- `/dashboard/plans/new` → Create
- `/dashboard/plans/:id` → Detail + payment history

**Success Criteria:**
- Forms submit cleanly
- Plan usage visualization correct
- Responsive layout (mobile-friendly)

---

### Sprint 15: Inventory — Products + Stock Backend

**Type:** Backend
**Duration:** 1 week
**Owner:** (TBD)
**Depends on:** Sprint 13 ✅ (no dependency on Plans for basic inventory)

**Deliverables:**
- Backend: `Product` CRUD (with new `status` field: ACTIVE | INACTIVE | DISCONTINUED)
- Backend: `LocationStock` CRUD
- Backend: Get product with stock per location
- Tests: Unit tests for stock queries
- Spec: Product + LocationStock feature spec

**APIs:**
- `POST /api/products` → Create product
- `GET /api/products?tenantId=...&status=ACTIVE` → List
- `PATCH /api/products/:id` → Update
- `POST /api/locations/:locationId/stock` → Set stock (or via LocationStock CRUD)
- `GET /api/locations/:locationId/stock` → Get all stock

**Data Model Updates:**
```prisma
enum ProductStatus { ACTIVE, INACTIVE, DISCONTINUED }
model Product {
  status ProductStatus @default(ACTIVE)
}
```

**Success Criteria:**
- Stock per location retrievable
- Status filtering works
- Inventory transactions don't break stock accuracy

---

### Sprint 16: Inventory — Products + Stock UI

**Type:** Frontend
**Duration:** 1 week
**Owner:** (TBD)
**Depends on:** Sprint 15

**Deliverables:**
- Frontend: Products listing (with stock per location columns)
- Frontend: Create/edit product form
- Frontend: Stock adjustment form (per location)
- Frontend: Product detail with stock history
- Tests: Component tests

**Pages:**
- `/dashboard/inventory/products` → List (sortable by location stock)
- `/dashboard/inventory/products/new` → Create
- `/dashboard/inventory/products/:id` → Detail
- `/dashboard/inventory/products/:id/stock` → Stock by location

**Success Criteria:**
- Stock visible for each location
- Adjustment form submits cleanly

---

### Sprint 17: Inventory — Suppliers + Supplier Products + POs Backend

**Type:** Backend
**Duration:** 1 week
**Owner:** (TBD)
**Depends on:** Sprint 15 ✅

**Deliverables:**
- Backend: `Supplier` CRUD
- Backend: `SupplierProduct` CRUD (product + supplier + pricing link)
- Backend: `PurchaseOrder` CRUD + status transitions (DRAFT → ORDERED → RECEIVED → CANCELLED)
- Backend: `PurchaseOrderItem` creation/retrieval
- Tests: Unit tests for PO state machine
- Spec: Suppliers + Purchase Orders feature spec

**APIs:**
- `POST /api/suppliers` → Create
- `GET /api/suppliers?tenantId=...` → List
- `PATCH /api/suppliers/:id` → Update
- `POST /api/suppliers/:id/products` → Link product to supplier
- `POST /api/purchase-orders` → Create PO
- `PATCH /api/purchase-orders/:id` → Update status
- `POST /api/purchase-orders/:id/items` → Add line items

**Business Rules:**
- PO tracks linked supplier + line items with quantity + price
- Status: DRAFT → ORDERED (when confirmed) → RECEIVED (when purchase made) → CANCELLED (if cancelled)
- PurchaseOrderItem.quantity vs. PurchaseItem.quantity (received) can differ (partial delivery)

**Success Criteria:**
- PO state machine tested
- SupplierProduct pricing retrievable
- Can add/remove PO items

---

### Sprint 18: Inventory — Suppliers + POs UI

**Type:** Frontend
**Duration:** 1 week
**Owner:** (TBD)
**Depends on:** Sprint 17

**Deliverables:**
- Frontend: Suppliers listing
- Frontend: Create/edit supplier form
- Frontend: Link supplier to products (bulk form)
- Frontend: Purchase orders listing (by status)
- Frontend: Create PO form (select supplier → select products → quantities)
- Frontend: PO detail + update status

**Pages:**
- `/dashboard/inventory/suppliers` → List
- `/dashboard/inventory/suppliers/new` → Create
- `/dashboard/inventory/suppliers/:id/edit` → Edit + manage products
- `/dashboard/inventory/purchase-orders` → List (filter by status)
- `/dashboard/inventory/purchase-orders/new` → Create
- `/dashboard/inventory/purchase-orders/:id` → Detail + status change

**Success Criteria:**
- PO form supports multi-item entry
- Status transitions visible and functional

---

### Sprint 19: Inventory — Purchases + Inventory Movements Backend

**Type:** Backend
**Duration:** 1 week
**Owner:** (TBD)
**Depends on:** Sprint 17 ✅

**Deliverables:**
- Backend: `Purchase` CRUD (received goods; links to PO)
- Backend: `PurchaseItem` (line items from received goods)
- Backend: `InventoryMovement` CRUD (manual stock adjustments)
- Backend: `InventoryMovementItem` (line items)
- Backend: Auto-update LocationStock on purchase/movement creation (transactional)
- Tests: Unit tests for stock mutations
- Spec: Purchases + Inventory Movements feature spec

**APIs:**
- `POST /api/purchases` → Create (from PO or standalone)
- `GET /api/purchases?tenantId=...` → List
- `POST /api/inventory-movements` → Create (e.g., stock write-off)
- `GET /api/inventory-movements` → List + audit trail
- Hook: PurchaseItem creation → LocationStock.quantity += item.quantity (in transaction)
- Hook: InventoryMovementItem creation → LocationStock.quantity += item.quantity (transaction)

**Business Rules:**
- Purchase should reference a PurchaseOrder (can be created from DRAFT PO)
- Updating Purchase → updating stock (stock.quantity changes)
- InventoryMovement for non-purchase changes (write-offs, physical count corrections, theft)
- All stock changes MUST be logged in AuditLog (NOM-024 compliance)

**Success Criteria:**
- Stock accurate after purchase/movement
- Audit trail shows all stock changes
- Transactional integrity (partial failure rolls back)

---

### Sprint 20: Inventory — Purchases + Movements UI

**Type:** Frontend
**Duration:** 1 week
**Owner:** (TBD)
**Depends on:** Sprint 19

**Deliverables:**
- Frontend: Purchases listing (by date, supplier)
- Frontend: Create purchase from PO (pre-filled with PO items)
- Frontend: Create manual purchase (select supplier + items)
- Frontend: Purchase detail + received quantities vs. ordered
- Frontend: Inventory movements listing
- Frontend: Create inventory movement form (select products, quantity adjustment, reason)
- Tests: Component tests

**Pages:**
- `/dashboard/inventory/purchases` → List
- `/dashboard/inventory/purchases/from-po/:poId` → Create from PO
- `/dashboard/inventory/purchases/new` → Create standalone
- `/dashboard/inventory/purchases/:id` → Detail
- `/dashboard/inventory/movements` → List
- `/dashboard/inventory/movements/new` → Create

**Success Criteria:**
- PO → Purchase flow works
- Stock updated after purchase confirmation
- Movement audit trail visible

---

### Sprint 21: Cash — Sales Backend

**Type:** Backend
**Duration:** 1 week
**Owner:** (TBD)
**Depends on:** Sprint 15 ✅ (Products) + Sprint 12 ✅ (Receipts)

**Deliverables:**
- Backend: `Sale` CRUD (sales transaction with payment method)
- Backend: `SaleItem` (line items: product + quantity + price)
- Backend: Sale status tracking (ACTIVE → FINISHED → SETTLED or CANCELLED)
- Backend: Auto-update LocationStock on sale confirmation
- Tests: Unit tests for sale state machine
- Spec: Sales feature spec

**APIs:**
- `POST /api/sales` → Create sale
- `GET /api/sales?tenantId=...&locationId=...` → List (filter by date range, status)
- `PATCH /api/sales/:id` → Update status (ACTIVE → FINISHED, etc.)
- `POST /api/sales/:id/items` → Add line items
- Hook: Sale status → FINISHED triggers stock update, cash register update

**Business Rules:**
- Sale.paymentType: CASH, CREDIT, CHECK, TRANSFER, DEBIT
- Sale.status: ACTIVE (being built) → FINISHED (ready for settlement) → SETTLED (cash counted)
- Sale can be CANCELLED at any time before SETTLED
- SaleItem.quantity + price immutable once FINISHED (compliance)
- Stock updated only when status → FINISHED (not on ACTIVE creation)

**Success Criteria:**
- Sale CRUD operations working
- Stock accurate after sale
- State transitions tested

---

### Sprint 22: Cash — Sales UI

**Type:** Frontend
**Duration:** 1 week
**Owner:** (TBD)
**Depends on:** Sprint 21

**Deliverables:**
- Frontend: Sales listing (by date, status, payment method)
- Frontend: Create sale form (select product, quantity, price override)
- Frontend: Sale detail (read-only once FINISHED)
- Frontend: Sale status change UI (ACTIVE → FINISHED, FINISHED → SETTLED, etc.)
- Frontend: Sales report (daily summary by payment method)
- Tests: Component tests

**Pages:**
- `/dashboard/sales` → List
- `/dashboard/sales/new` → Create
- `/dashboard/sales/:id` → Detail
- `/dashboard/reports/sales-daily` → Daily summary

**Success Criteria:**
- Sale form supports multi-item entry
- Status transitions smooth
- Report shows totals by payment method

---

### Sprint 23: Cash — Income + Expense + CashClose Backend

**Type:** Backend
**Duration:** 1 week
**Owner:** (TBD)
**Depends on:** Sprint 21 ✅ (Sales)

**Deliverables:**
- Backend: `Income` CRUD (misc. money in: donations, refunds, loans, etc.)
- Backend: `Expense` CRUD (misc. money out: maintenance, supplies, etc.)
- Backend: `CashClose` CRUD (end-of-day reconciliation)
- Backend: CashClose calculates total (Sum sales + incomes - expenses)
- Backend: CashClose status (OPEN → CLOSED, with audit trail)
- Tests: Unit tests for cash reconciliation logic
- Spec: Income + Expense + CashClose feature spec

**APIs:**
- `POST /api/income` → Create income
- `GET /api/income?tenantId=...&locationId=...&dateRange=...` → List
- `POST /api/expense` → Create expense
- `GET /api/expense?tenantId=...&locationId=...&dateRange=...` → List
- `POST /api/cash-closes` → Create close (mark all sales/income/expense from period as closed)
- `PATCH /api/cash-closes/:id` → Update (note: CashClose is immutable once CLOSED)

**Business Rules:**
- Income/Expense don't have status — just created and linked to periods
- **Critical decision (from MIGRATION_QUICK_START):** SUTR Income/Expense don't track location; Renalfy requires it
  - Solution: Assign all migrated income/expense to primary location; post-migration allow reassignment
- CashClose:
  - Date range (start_date, end_date)
  - Calculated fields: totalSales (from Sales in range), totalIncome, totalExpense, balance
  - Status: OPEN → CLOSED (immutable once CLOSED)
  - Must link all Sales/Income/Expense from range (RLS handles multi-tenant)

**Success Criteria:**
- Cash calculation accurate
- CashClose immutable after closure
- Audit trail shows who closed and when

---

### Sprint 24: Cash — Income + Expense + CashClose UI

**Type:** Frontend
**Duration:** 1 week
**Owner:** (TBD)
**Depends on:** Sprint 23

**Deliverables:**
- Frontend: Income listing (by date, concept)
- Frontend: Create income form (amount, concept, notes)
- Frontend: Expense listing
- Frontend: Create expense form
- Frontend: CashClose listing (closed periods)
- Frontend: CashClose wizard (select date range, review totals, confirm close)
- Frontend: CashClose detail (read-only, with linked sales/income/expense)
- Tests: Component tests

**Pages:**
- `/dashboard/cash/income` → List
- `/dashboard/cash/income/new` → Create
- `/dashboard/cash/expense` → List
- `/dashboard/cash/expense/new` → Create
- `/dashboard/cash/closes` → List
- `/dashboard/cash/closes/new` → Create close wizard
- `/dashboard/cash/closes/:id` → Detail (read-only)

**Success Criteria:**
- Income/Expense forms submit cleanly
- CashClose wizard works smoothly
- Calculations match backend

---

### Sprint 25: QA + Stabilization — Full System Testing

**Type:** QA
**Duration:** 1 week
**Owner:** (TBD)
**Depends on:** Sprint 24 ✅ (all modules done)

**Deliverables:**
- End-to-end scenario testing (patient → appointment → receipt → plan → inventory → sales → cashclose)
- Load testing (1000+ concurrent users, API response times)
- Security testing (RLS enforcement, multi-tenant isolation, auth edge cases)
- Regression testing (previous sprints' functionality still works)
- Bug fixes + documentation of known issues
- Spec updates (capture any discovered divergences)

**Test Scenarios:**
1. Create patient → Create appointment → Generate receipt → Mark plan session as used → Verify plan status
2. Create product → Create supplier → Create PO → Receive purchase → Verify stock updated
3. Create sale with multiple items → Verify stock decremented → Close period → Verify CashClose totals
4. Test RLS: User in Location A cannot see Location B data
5. Test role-based access: STAFF can't create Company, MANAGER can't access ADMIN settings

**Success Criteria:**
- 0 critical bugs
- RLS verified across all tables
- Performance acceptable (page load < 3s, API < 500ms)

---

### Sprint 26: Pre-Migration Prep — Schema + Documentation

**Type:** Backend + Docs
**Duration:** 1 week
**Owner:** Migration Lead (TBD)
**Depends on:** Sprint 25 ✅

**Deliverables:**
- Schema updates: Add optional fields to `Patient` (ssn, insuranceNumber, email) + `ProductStatus` enum
- Migration script skeleton: TypeScript project that connects to SUTR + Renalfy DBs
- Enum mapping document: SUTR tipo/estatus → Renalfy enums
- ID mapping table schema (stores SUTR ID → Renalfy UUID for referential integrity)
- Decision documentation: Consent strategy, location assignment, folio format (from MIGRATION_QUICK_START)
- Full database backup procedure documented

**Deliverables Checklist:**
- ✅ `patient` table has optional fields (nullable, backward-compatible)
- ✅ `product` table has status enum (default ACTIVE)
- ✅ Migration script repo initialized with skeleton
- ✅ SUTR database export available (read-only copy)
- ✅ Enum mapping document finalized
- ✅ Four critical decisions documented (consent, location, folio, go-live approach)
- ✅ Rollback plan documented

**Success Criteria:**
- Schema changes tested on staging
- Migration script ready to receive logic
- Team understands enum mappings and transformation rules

---

### Sprint 27: Migration — Script Development + Sample Data Testing

**Type:** Backend
**Duration:** 1 week (concurrent with Sprint 26 end)
**Owner:** Migration Lead
**Depends on:** Sprint 26 ✅

**Deliverables:**
- Full migration logic implemented per module:
  - Users → User (with role mapping + location assignment)
  - Locations → Location
  - Patients → Patient (with backdated PatientConsent creation)
  - ServiceTypes → ServiceType
  - Appointments → Appointment (sessions; clinical data dropped)
  - Receipts → Receipt (with new folio generation)
  - Companies → Company
  - Plans → Plan
  - Products → Product (status = ACTIVE)
  - LocationStock → LocationStock (populated from producto_unidads)
  - Suppliers → Supplier
  - SupplierProduct → SupplierProduct
  - PurchaseOrders → PurchaseOrder (status = RECEIVED)
  - Purchases → Purchase
  - InventoryMovements → InventoryMovement
  - Sales → Sale
  - Income → Income (with primary location assigned)
  - Expense → Expense (with primary location assigned)
  - CashCloses → CashClose
  - AuditLog backfill: All migrated records logged with source=MIGRATION
- Test on sample SUTR data (100–200 rows per table)
- Validate data integrity (row counts, referential integrity)
- ID mapping table verified (no duplicates, complete coverage)

**Script Features:**
- Command-line interface: `npx ts-node migrate.ts --source-db postgresql://... --target-db postgresql://... --sample-only`
- Dry-run mode: `--dry-run` (show what would be migrated without committing)
- Logging: All transformations logged to file
- Error handling: Stop on first error, show context
- Resumable: Can restart from last checkpoint if interrupted

**Success Criteria:**
- Sample data migrated cleanly
- Data integrity verified (no missing FKs)
- Script runs in < 30 minutes on sample
- Error logs clear and actionable

---

### Sprint 28: Migration — Full Validation + Production Cutover

**Type:** Backend + Ops
**Duration:** 1 week
**Owner:** Migration Lead + DBA
**Depends on:** Sprint 27 ✅

**Deliverables:**
- Run migration on full SUTR production backup (25,000+ rows)
- Comprehensive validation:
  - Row count reconciliation (SUTR vs. Renalfy per table)
  - Referential integrity check (all FKs valid)
  - Business logic validation: folio format correct, plans correctly exhausted, stock accurate
  - Cash reconciliation: Total sales + income - expense = reported balance
  - Compliance check: All PatientConsent records created, AuditLog populated
- User access testing: All users can log in with reset password
- Performance validation: Queries < 1s under realistic load
- Rollback test: Restore from backup, verify restore time acceptable
- Final stakeholder sign-off: Go/no-go decision

**Cutover Plan:**
1. **T-1 day:** Final backup, announce maintenance window
2. **T-0:** SUTR placed in read-only mode
3. **T+0 to T+1h:** Run full migration script
4. **T+1h to T+2h:** Validation + smoke tests
5. **T+2h:** Enable Renalfy for users (parallel operation begins)
6. **T+30 days:** SUTR decommissioned (users transitioned)

**Success Criteria:**
- ✅ All 25,000+ rows migrated
- ✅ Zero data loss (100% referential integrity)
- ✅ Users can log in and see all data
- ✅ Compliance met (consent, audit logs)
- ✅ Rollback tested
- ✅ Stakeholder sign-off obtained

---

### Sprint 29: Post-Launch Stabilization + Bug Fixes

**Type:** Full
**Duration:** 1 week
**Owner:** (TBD)
**Depends on:** Sprint 28 ✅ (migration live)

**Deliverables:**
- Monitor production for errors, performance issues
- Bug fixes from migration testing
- User feedback capture (training needed?)
- Documentation updates (user guides, troubleshooting)
- Performance optimization (query tuning, caching)
- Parallel operation support (SUTR ↔ Renalfy data sync, if applicable)

**Success Criteria:**
- < 3 critical bugs reported in first week
- Performance stable (page load < 3s)
- Users report workflows working as expected

---

### Sprint 30+: Enhancements + Roadmap

**Type:** TBD
**Owner:** Product team

**Backlog (Post-Launch):**
- Reports: PDF/Excel exports (receipts, sales summaries, inventory reports)
- Notifications: In-app alerts for plan exhaustion, low stock, cash close errors
- Analytics: Dashboard with KPIs (revenue, utilization, inventory turnover)
- Mobile app: Native iOS/Android or React Native
- Third-party integrations: Accounting software (Facturación electrónica), banks
- Workflow automation: Appointment reminders, auto-closing inactive plans
- Advanced search + filtering across all modules
- Data import/export UI (not just scripts)

---

## Dependency Graph

```
Sprints 1–12: Clinic (✅ mostly done)
│
├─→ Sprint 13: Plans Backend
│   └─→ Sprint 14: Plans UI
│
├─→ Sprint 15: Products + Stock Backend
│   ├─→ Sprint 16: Products + Stock UI
│   │
│   ├─→ Sprint 17: Suppliers + POs Backend
│   │   └─→ Sprint 18: Suppliers + POs UI
│   │
│   ├─→ Sprint 19: Purchases + Movements Backend (can start at Sprint 15)
│   │   └─→ Sprint 20: Purchases + Movements UI
│   │
│   └─→ Sprint 21: Sales Backend
│       └─→ Sprint 22: Sales UI
│
├─→ Sprint 23: Income + Expense + CashClose Backend (depends on Sales)
│   └─→ Sprint 24: Income + Expense + CashClose UI
│
├─→ Sprint 25: QA + Stabilization (everything done)
│
├─→ Sprint 26: Pre-Migration Prep (schema + script skeleton)
│
├─→ Sprint 27: Migration Script Dev + Validation (can overlap with 26)
│
├─→ Sprint 28: Full Migration + Cutover
│
└─→ Sprint 29+: Post-Launch Stabilization + Enhancements
```

### Parallelization Opportunities

1. **Backend + UI concurrent:** Sprints 13–24 can run frontend and backend in parallel for different modules
   - Example: Sprint 13 (Plans backend) + Sprint 16 (Products UI) can overlap
2. **Migration prep + QA:** Sprint 25 (QA) and Sprint 26 (prep) can partially overlap
3. **Inventory depth:** Sprints 15–20 cover inventory; can assign multiple developers to parallelize

---

## Effort Estimation

| Phase | Sprints | Effort | Owner |
|---|---|---|---|
| Clinic (existing) | 1–12 | ~84 days | ✅ Done |
| Plans backend + UI | 13–14 | ~14 days | 1 developer |
| Inventory backend + UI | 15–20 | ~42 days | 1–2 developers (parallelizable) |
| Cash backend + UI | 21–24 | ~28 days | 1 developer |
| QA + Stabilization | 25–26 | ~14 days | 1 QA engineer |
| Migration dev + cutover | 27–28 | ~14 days | 1 migration engineer + DBA |
| Post-launch | 29+ | Ongoing | 1–2 developers |
| **TOTAL** | **28 sprints** | **~210 days (1 FTE)** | Scalable with parallel teams |

**Timeline:** ~28 weeks (~7 months) if sequential; ~20 weeks (~5 months) if 2 developers in parallel.

---

## Risk Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Backend finished late; UI blocked | Medium | High | Start UI with mock APIs early; use API contracts from specs |
| Data loss during migration | Low | Critical | Full backup before; test on copy first; ID mapping validation |
| Performance degradation post-migration | Medium | High | Load testing in Sprint 25; query optimization in Sprint 29 |
| User confusion (new UI) | High | Medium | Parallel operation 30–60 days; training + docs; gradual user transition |
| Migration takes longer than 1 week | Medium | Medium | Start migration prep in Sprint 26; have contingency week (Sprint 28.5) |
| Critical bugs found during QA | Medium | Medium | Allocate Sprint 29 for stabilization; keep debugging budget |

---

## Updated Sprints for CLAUDE.md

Below is the complete sprint table ready to replace the existing one in CLAUDE.md:

```markdown
## Sprints (Replanned 2026-03-22)

| Sprint | Nombre | Tipo | Descripción | Estado | Dependencias |
|---|---|---|---|---|---|
| 1 | Setup monorepo, Docker, CI/CD, ESLint/Prettier | Infra | Infraestructura inicial | ✅ Listo | — |
| 2 | Auth JWT + refresh, modelo base de tenants | Back | Autenticación y multi-tenant foundation | ✅ Listo | Sprint 1 |
| 3 | Locations, Users, Roles, guardias de acceso | Back | Organización y control de acceso | ✅ Listo | Sprint 2 |
| 4 | Landing page dinámica por tenant (branding) | Front | UX pública de registro | ✅ Listo | Sprint 3 |
| 5 | Módulo 1 — Pacientes + Tipos de servicio | Back | Modelos de negocio clínico | ✅ Listo | Sprint 3 |
| 6 | Módulo 1 — Citas/Sesiones con formulario dinámico | Back | Appointments dinámicos por ClinicalTemplate | ✅ Listo | Sprint 5 |
| 7 | Módulo 1 — Recibos (folio + flujo de estados) | Back | Sistema de facturación | ✅ Listo | Sprint 6 |
| 8 | UI — Auth (login, logout, cambio de contraseña) | Front | Autenticación en web | ✅ Listo | Sprint 2 |
| 9 | UI — Settings: Locations + Users | Front | Administración de infraestructura | ✅ Listo | Sprint 3 |
| 10 | UI — Módulo 1: Pacientes + Tipos de servicio | Front | UX de clínica | ✅ Listo | Sprint 5 |
| 11 | UI — Módulo 1: Recibos | Front | UX de facturación | ✅ Listo | Sprint 7 |
| 12 | UI — Módulo 1: Citas + formulario clínico dinámico | Full | Appointments UI con formulario configurable | En progreso | Sprint 6, 10 |
| 13 | Módulo 2 — Empresas + Planes (backend) | Back | Gestión de planes y beneficiarios | Pendiente | Sprint 12 |
| 14 | UI — Módulo 2: Empresas + Planes | Front | UX de planes | Pendiente | Sprint 13 |
| 15 | Módulo 3 — Productos + Stock por sucursal (backend) | Back | Inventario: productos y stock | Pendiente | Sprint 12 |
| 16 | UI — Módulo 3: Productos + Stock | Front | UX de productos | Pendiente | Sprint 15 |
| 17 | Módulo 3 — Proveedores + Órdenes de compra (backend) | Back | Gestión de proveedores y POs | Pendiente | Sprint 15 |
| 18 | UI — Módulo 3: Proveedores + Órdenes de compra | Front | UX de proveedores y compras | Pendiente | Sprint 17 |
| 19 | Módulo 3 — Compras + Movimientos de inventario (backend) | Back | Recepción de compras y ajustes de stock | Pendiente | Sprint 17 |
| 20 | UI — Módulo 3: Compras + Movimientos | Front | UX de recepción y movimientos | Pendiente | Sprint 19 |
| 21 | Módulo 4 — Ventas (backend) | Back | Gestión de ventas y pagos | Pendiente | Sprint 15 |
| 22 | UI — Módulo 4: Ventas | Front | UX de ventas | Pendiente | Sprint 21 |
| 23 | Módulo 4 — Ingresos, Egresos, Cortes de caja (backend) | Back | Gestión de efectivo y reconciliación | Pendiente | Sprint 21 |
| 24 | UI — Módulo 4: Ingresos, Egresos, Cortes de caja | Front | UX de caja | Pendiente | Sprint 23 |
| 25 | QA + Estabilización — Pruebas de sistema completo | QA | E2E, carga, RLS, regresión | Pendiente | Sprint 24 |
| 26 | Preparación pre-migración — Schema + Script skeleton | Back | Actualizar schema SUTR fields, inicializar script | Pendiente | Sprint 25 |
| 27 | Migración — Desarrollo de script + validación de muestra | Back | Implementar lógica de migración, test en sample data | Pendiente | Sprint 26 |
| 28 | Migración — Validación completa + Cutover producción | Back + Ops | Migración full, validación, go-live | Pendiente | Sprint 27 |
| 29 | Post-Launch — Estabilización + Bug fixes | Full | Monitoreo producción, fixes, optimización | Pendiente | Sprint 28 |
```

---

## Key Decisions Implemented in New Roadmap

### 1. UI is not a blocker for migration

The original plan implied backend → UI → migration. The new roadmap recognizes that migration can start as soon as all backend APIs are stable (Sprint 26), regardless of UI completion.

**Impact:** Saves 2–3 weeks; can run migration in parallel with UI polish.

### 2. Parallelization via module-level sprints

Instead of "Backend Modules 1–3" followed by "UI Modules 1–3", the new roadmap allows:
- Sprint 13 (Plans backend) to run while Sprint 16 (Products UI) is happening
- Multiple developers to work simultaneously on different modules

**Impact:** Reduces total duration from 7 months (sequential) to 5–6 months (parallel).

### 3. Clear migration blocker path

The new roadmap explicitly identifies when migration can begin:
- ✅ Sprint 12 done → Clinic is complete
- ✅ Sprint 24 done → All modules are complete
- ✅ Sprint 25 done → System is stable and tested
- ✅ Sprint 26 done → Migration infrastructure is ready
- **→ Sprint 27–28:** Migration execution

**Impact:** No ambiguity about when to start migration; product team can plan stakeholder communications 2 sprints in advance.

### 4. QA gets a dedicated sprint

Sprint 25 is entirely QA: end-to-end testing, load testing, RLS enforcement, security review. This replaces the assumption that "testing happens during development."

**Impact:** Higher quality; bugs caught before migration; users get stable system.

### 5. Post-launch is explicit

Sprint 29+ is "stabilization + roadmap". This acknowledges that bugs will be found post-launch and sets expectations for the product team.

**Impact:** Realistic post-launch planning; not all work gets done before migration.

---

## How to Communicate This Roadmap

### For Product Owner / Stakeholders

> **Goal:** Go-live with SUTR migration by end of May 2026 (Sprints 27–28).
>
> **Path:** Complete all backend modules by Sprint 24, QA in Sprint 25, prep in Sprint 26, migrate in Sprints 27–28.
>
> **Timeline:** 28 weeks (~7 months) if one developer, or ~20 weeks (~5 months) with two developers working in parallel.
>
> **Key Decision:** Parallel operation post-migration (users slowly transitioned from SUTR to Renalfy) = low risk, high confidence.
>
> **Go/No-Go:** Stakeholder sign-off in Sprint 28 after successful validation; rollback plan is tested and ready.

### For Engineering Lead

> **Architecture:** Module-level backend sprints (13–24) followed by QA (25) and migration (27–28). UI can start early and run in parallel with later backend work.
>
> **TDD Compliance:** Every sprint includes unit tests + E2E tests. Lint/types/tests must pass before sprint completes.
>
> **Multi-tenant RLS:** All new features must enforce `tenantId` filtering + respect `locationId` for MANAGER/STAFF roles. Tested in Sprint 25.
>
> **Compliance:** PatientConsent created during migration (Sprint 27); AuditLog backfilled; NOM-004 immutability enforced.

### For Migration Lead

> **Timeline:** 3 weeks (Sprints 27–28) for migration script + cutover.
>
> **Pre-work:** Sprint 26 updates schema (2 fields) and builds script skeleton. Sprint 27 develops full migration logic and validates on sample SUTR data. Sprint 28 runs full migration and validates.
>
> **Decisions Needed:** Four critical calls documented in MIGRATION_QUICK_START.md (consent strategy, location assignment, folio format, go-live approach).
>
> **Success Criteria:** 25,000+ rows migrated, zero data loss, all users can log in, compliance met (consent + audit logs).

---

## Risks & Mitigations (Updated)

### High-Risk Items

1. **Frontend UI ready by Sprint 24?**
   - *Mitigation:* UI can launch "beta" for each module as backend completes; users don't need perfect UI for migration
   - *Contingency:* Allocate 1 extra sprint (28.5) if UI falls behind; migration doesn't depend on perfect UI

2. **Migration script runs in time?**
   - *Mitigation:* Sprint 26 builds skeleton, Sprint 27 develops logic, test on sample data
   - *Contingency:* If Sprint 27 finds issues, Sprint 28 is full-week cutover + validation; can extend to 28.5 if needed

3. **Data validation is thorough?**
   - *Mitigation:* Sprint 25 includes reconciliation checklist; Sprint 27 tests sample data; Sprint 28 validates full dataset
   - *Contingency:* Rollback tested; full backup retained; can revert in < 2 hours

### Medium-Risk Items

4. **Users confused by new UI?**
   - *Mitigation:* Run SUTR + Renalfy in parallel for 30–60 days post-migration
   - *Contingency:* Training videos, user guides, dedicated support channel

5. **Performance issues discovered late?**
   - *Mitigation:* Load testing in Sprint 25; query optimization in Sprint 29
   - *Contingency:* Defer advanced features (reports, notifications) to Sprint 30+

---

## Questions for Stakeholders

Before committing to this roadmap, confirm:

1. **Timeline:** Is ~7 months (or 5 months with 2 developers) acceptable?
2. **Resources:** Can we allocate 1 backend developer for Sprints 13–28? Ideally 2 developers for parallelization?
3. **Parallel operation:** Do we run SUTR + Renalfy together for 30–60 days post-migration, or hard cutover?
4. **UI polish:** Is a "functional but minimal" UI acceptable at go-live, with polish happening in Sprint 29+?
5. **Compliance:** Is the backfilled PatientConsent strategy (with clear audit trail) acceptable to legal?

---

## Conclusion

This replanned roadmap:

✅ **Respects completed work** (Sprints 1–11 done, 12 in progress)
✅ **Unblocks migration** (Sprint 28 is the hard target: 3 weeks before cutover)
✅ **Enables parallelization** (multiple developers can work simultaneously)
✅ **Is realistic** (~1 week per sprint, clear dependencies)
✅ **Includes QA as a dedicated phase** (Sprint 25)
✅ **Has clear success criteria** (lint + types + tests pass each sprint)
✅ **Acknowledges post-launch work** (Sprint 29+ is stabilization + enhancements)

**Ready for review.** Next: Stakeholder sign-off, assign sprint owners, kickoff Sprint 13 planning.
