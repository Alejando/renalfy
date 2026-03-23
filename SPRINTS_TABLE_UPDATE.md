# Updated Sprints Table for CLAUDE.md

Copy-paste this table to replace the existing "## Sprints" section in CLAUDE.md (around line 250+).

---

## Sprints (Replanned 2026-03-22 based on SUTR → Renalfy Migration Analysis)

| Sprint | Nombre | Tipo | Descripción | Estado | Dependencias |
|---|---|---|---|---|---|
| 1 | Setup monorepo, Docker, CI/CD, ESLint/Prettier | Infra | Infraestructura inicial: Turborepo, Docker Compose, linters | ✅ Listo | — |
| 2 | Auth JWT + refresh, modelo base de tenants | Back | Autenticación JWT (access/refresh), multi-tenant foundation, User/Tenant models | ✅ Listo | Sprint 1 |
| 3 | Locations, Users, Roles, guardias de acceso | Back | Organización: Location, User roles (SUPER_ADMIN/OWNER/ADMIN/MANAGER/STAFF), JwtAuthGuard | ✅ Listo | Sprint 2 |
| 4 | Landing page dinámica por tenant (branding) | Front | UX pública de registro: landing page dinámica por tenant, TenantSettings (branding) | ✅ Listo | Sprint 3 |
| 5 | Módulo 1 — Pacientes + Tipos de servicio (backend) | Back | Modelos clínicos: Patient, ServiceType; CRUD endpoints; RLS tests | ✅ Listo | Sprint 3 |
| 6 | Módulo 1 — Citas/Sesiones con formulario dinámico (backend) | Back | Appointment model, ClinicalTemplate configurable, dynamic form submission, Measurement storage | ✅ Listo | Sprint 5 |
| 7 | Módulo 1 — Recibos (folio + flujo de estados) (backend) | Back | Receipt model, ReceiptFolioCounter (atomic folio generation), status transitions (ACTIVE→FINISHED→SETTLED), payment types | ✅ Listo | Sprint 6 |
| 8 | UI — Auth (login, logout, cambio de contraseña) | Front | Autenticación en web: login form, logout, password reset, auth persistence | ✅ Listo | Sprint 2 |
| 9 | UI — Settings: Locations + Users | Front | Administración: Locations CRUD, Users CRUD, role assignment, location-based filtering | ✅ Listo | Sprint 3 |
| 10 | UI — Módulo 1: Pacientes + Tipos de servicio | Front | UX clínica: Patients listing/detail/form, ServiceTypes CRUD | ✅ Listo | Sprint 5 |
| 11 | UI — Módulo 1: Recibos | Front | UX facturación: Receipts listing/detail, create with folio preview, status transitions | ✅ Listo | Sprint 7 |
| 12 | UI — Módulo 1: Citas + formulario clínico dinámico | Full | Appointments UI: listing, create/edit with dynamic form fields (from ClinicalTemplate), detail view | En progreso | Sprint 6, Sprint 10 |
| 13 | Módulo 2 — Empresas + Planes (backend) | Back | Company CRUD, Plan CRUD (with plannedSessions/usedSessions tracking), plan exhaustion logic (status→EXHAUSTED) | Pendiente | Sprint 12 |
| 14 | UI — Módulo 2: Empresas + Planes | Front | Companies listing/CRUD, Plans listing with session usage visualization, plan detail with payment history | Pendiente | Sprint 13 |
| 15 | Módulo 3 — Productos + Stock por sucursal (backend) | Back | Product CRUD (with new status enum: ACTIVE\|INACTIVE\|DISCONTINUED), LocationStock CRUD; stock per location queries | Pendiente | Sprint 12 |
| 16 | UI — Módulo 3: Productos + Stock | Front | Products listing (with location stock columns), create/edit form, stock adjustment per location | Pendiente | Sprint 15 |
| 17 | Módulo 3 — Proveedores + Órdenes de compra (backend) | Back | Supplier CRUD, SupplierProduct (M:M with pricing), PurchaseOrder CRUD (status: DRAFT→ORDERED→RECEIVED→CANCELLED), PurchaseOrderItem | Pendiente | Sprint 15 |
| 18 | UI — Módulo 3: Proveedores + Órdenes de compra | Front | Suppliers listing/CRUD, supplier-product linking, PO listing by status, create PO form (multi-item entry), PO detail with status change | Pendiente | Sprint 17 |
| 19 | Módulo 3 — Compras + Movimientos de inventario (backend) | Back | Purchase CRUD (from PO or standalone), PurchaseItem (quantities received), InventoryMovement CRUD, auto-update LocationStock on receipt/movement, transactional integrity | Pendiente | Sprint 17 |
| 20 | UI — Módulo 3: Compras + Movimientos | Front | Purchases listing, create from PO (pre-filled), standalone purchase form, detail with received vs. ordered, inventory movements listing/create (with reason), audit trail visible | Pendiente | Sprint 19 |
| 21 | Módulo 4 — Ventas (backend) | Back | Sale CRUD (status: ACTIVE→FINISHED→SETTLED\|CANCELLED), SaleItem (product+qty+price), auto-update LocationStock on FINISHED, payment types (CASH/CREDIT/CHECK/TRANSFER/DEBIT) | Pendiente | Sprint 15 |
| 22 | UI — Módulo 4: Ventas | Front | Sales listing (filter by date/status/payment), create sale form (multi-item), sale detail (read-only once FINISHED), daily sales report by payment method | Pendiente | Sprint 21 |
| 23 | Módulo 4 — Ingresos, Egresos, Cortes de caja (backend) | Back | Income CRUD (misc. money in), Expense CRUD (misc. money out), CashClose (OPEN→CLOSED, immutable), calculate total (sales+income-expense), handle location assignment for SUTR migration data | Pendiente | Sprint 21 |
| 24 | UI — Módulo 4: Ingresos, Egresos, Cortes de caja | Front | Income listing/create, Expense listing/create, CashClose listing, CashClose wizard (select date range, review totals, confirm), CashClose detail (read-only, with linked transactions) | Pendiente | Sprint 23 |
| 25 | QA + Estabilización — Pruebas de sistema completo | QA | E2E scenario testing (patient→appointment→receipt→plan→inventory→sales→cashclose), load testing, RLS enforcement validation, security testing, performance tuning, bug fixes, known issues documentation | Pendiente | Sprint 24 |
| 26 | Preparación pre-migración — Schema + Script skeleton | Back | Update Prisma schema (Patient: add optional ssn/insuranceNumber/email; Product: add status enum), initialize migration script project (TypeScript), define enum mappings (SUTR tipo/estatus→Renalfy), create ID mapping table schema, document 4 critical decisions (consent/location/folio/go-live) | Pendiente | Sprint 25 |
| 27 | Migración — Desarrollo de script + validación de muestra | Back | Implement full migration logic (users, locations, patients, appointments, receipts, companies, plans, products, stock, suppliers, POs, purchases, movements, sales, income, expense, cashclose, compliance records), test on sample SUTR data (100–200 rows per table), validate referential integrity, verify folio format, ID mapping completeness | Pendiente | Sprint 26 |
| 28 | Migración — Validación completa + Cutover producción | Back + Ops | Run migration on full SUTR production backup (25,000+ rows), comprehensive validation (row counts, referential integrity, business logic: folios/plans/stock/cash reconciliation), user access testing (password reset), performance validation, rollback test, stakeholder sign-off, production cutover (1–2h maintenance window), parallel operation begin | Pendiente | Sprint 27 |
| 29 | Post-Launch — Estabilización + Bug fixes | Full | Monitor production for errors/performance, fix bugs from migration testing, capture user feedback, update documentation, performance optimization (query tuning, caching), support parallel operation (SUTR↔Renalfy sync if applicable) | Pendiente | Sprint 28 |
| 30+ | Enhancements + Roadmap | TBD | Reportes (PDF/Excel), Notificaciones in-app, Analytics dashboard, Mobile app, Third-party integrations (accounting, banks), Workflow automation, Advanced search/filtering, Data import/export UI | Pendiente | Sprint 29 |

---

## Notes on Updated Roadmap

### Key Changes from Original Plan

1. **Clearer dependencies:** Each sprint now explicitly lists what it depends on
2. **Parallelization:** Backend and UI sprints can run concurrently for different modules
3. **Migration is explicit:** Sprints 26–28 dedicated to migration script development, validation, and cutover
4. **QA gets a dedicated sprint:** Sprint 25 is system-wide testing, not afterthought
5. **Module-level sprints:** Planes (13–14), Inventario (15–20), Caja (21–24) broken into manageable chunks with clear scope

### Migration Blocker Path

All of these must be complete BEFORE production migration (Sprint 28):
- ✅ Sprint 12: Clinic module complete
- ✅ Sprint 24: All business modules (Planes, Inventario, Caja) complete
- ✅ Sprint 25: QA validates full system
- ✅ Sprint 26: Migration infrastructure ready (schema, script skeleton)
- ✅ Sprint 27: Full migration tested on sample data

### Timeline Expectations

- **Sequential (1 developer):** ~28 weeks (~7 months)
- **Parallel (2 developers):** ~20 weeks (~5 months)
- **With dedicated teams:** ~18 weeks possible with 3+ developers

### UI Not Required for Migration

The migration script reads SUTR data and writes to Renalfy backend directly. **UI can lag behind backend by several sprints.** This allows:
- Sprints 13 (Plans backend) to run while Sprint 16 (Products UI) is happening
- Migration to start in Sprint 27 even if UI isn't fully polished
- Users to migrate smoothly with "beta" UI post-launch

### Post-Launch (Sprint 29+)

All features not in Sprints 1–28 (Reportes, Notificaciones, Analytics, etc.) are deferred to post-launch roadmap. This is realistic given migration complexity.

---

## How to Use This Table

1. **Copy the table above**
2. **Open CLAUDE.md**
3. **Find the "## Sprints" section** (search for "Sprint | 1 |")
4. **Replace entire table** with the table above
5. **Commit:** `git add CLAUDE.md && git commit -m "docs: update sprint roadmap based on migration analysis"`

The rest of CLAUDE.md stays the same. This is just a table replacement.
