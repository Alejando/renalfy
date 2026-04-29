# Feature Specification: Sprint 21 — Module 4: Sales Backend

**Feature Branch**: `017-sprint-dulo-ventas`  
**Created**: 2026-04-29  
**Status**: Draft  
**Input**: Sprint 21 — Módulo 4: Ventas (backend). Implementar backend para módulo de ventas: registrar transacciones de venta, ingresos/egresos, cortes de caja con control de acceso por rol y location

---

## Overview

Complete backend implementation of the Sales module (Módulo 4, Part 1). Provides hospital administrators, inventory managers, and staff with the ability to:
- Register and track sales transactions (items sold to patients/customers)
- Record cash inflows (income from services, product sales)
- Record cash outflows (expenses, payroll, supplies)
- Close daily/periodic cash registers with state machine enforcement
- Track audit trail of all transactions with user, timestamp, and location attribution
- Enforce role-based and location-based access controls via RLS

---

## Clarifications

### Session 2026-04-29

- Q: Should Income/Expense types be predefined enums or allow custom user-created types? → A: Hybrid approach — predefined enums (SERVICE_FEE, DEPOSIT, TRANSFER, REFUND, OTHER for Income; PAYROLL, SUPPLIES, UTILITIES, MAINTENANCE, OTHER for Expense) with optional custom_type field for advanced users
- Q: Should CashClose.status ever change after CLOSED, or is it immutable? → A: Completely immutable — CashClose.status = CLOSED never changes; corrections handled via new Income/Expense records, preserving audit trail
- Q: How should refunds (CANCELLED sale + refund sale) appear in CashClose — as two separate transactions or single net refund line? → A: Two separate transactions — CANCELLED sale shows as deduction; refund sale shows as separate credit line; algebraic sum visible in calculatedTotal for full audit visibility

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Sale Registration & Inventory Deduction (Priority: P1)

**Actor**: MANAGER, OWNER, ADMIN  
**Goal**: Record a sale when a patient/customer buys services or products, automatically deduct inventory from stock

**Why this priority**: Core business workflow. Every revenue transaction starts here. Without sale registration, the system cannot track income or generate reports.

**Independent Test**: A MANAGER navigates to create a sale, selects products/services and quantities, verifies calculated total with tax, submits, and sees: (1) Sale record created with unique folio, (2) LocationStock decremented for each product, (3) InventoryMovement (OUT) records created for each item

**Acceptance Scenarios**:

1. **Given** user is MANAGER/OWNER, **When** accessing sale creation endpoint, **Then** can create sale with line items (product, qty, price, optional tax)
2. **Given** sale with 2 products (qty 5 @ $100, qty 3 @ $50), **When** submitting, **Then** Sale record has folio "LOC-YYYY-NNNNN", total = 500 + 150 + taxes, items linked
3. **Given** sale submitted successfully, **When** checking LocationStock, **Then** stock decremented by qty for each product
4. **Given** sale submitted, **When** checking InventoryMovement, **Then** one OUT movement created per location with reference "SALE-{saleId}", quantity matches sold qty
5. **Given** sale with paymentType "BENEFIT" (medical plan), **When** submitting, **Then** linked Plan.usedSessions incremented; if usedSessions >= plannedSessions, Plan.status → EXHAUSTED
6. **Given** stock insufficient for ordered qty, **When** submitting, **Then** 400 Bad Request with "Insufficient stock for product X"
7. **Given** STAFF user, **When** attempting to create sale, **Then** 403 Forbidden (STAFF can register, but cannot finalize/close)

---

### User Story 2 — Income & Expense Recording (Priority: P1)

**Actor**: MANAGER, OWNER, ADMIN  
**Goal**: Record ancillary cash inflows (service fees, deposits, transfers) and outflows (payroll, supplies, utilities) separate from sales

**Why this priority**: Essential for cash management. Sales alone don't capture all financial movements. Income/Expense records feed into daily cash close.

**Independent Test**: A MANAGER records an income (e.g., +$500 service fee) and an expense (e.g., -$100 supplies). Both appear in the CashClose period summary with proper categorization. Can be tested independently without sales functionality.

**Acceptance Scenarios**:

1. **Given** user is MANAGER/OWNER, **When** creating Income record (type, amount, description), **Then** stored with date, locationId, userId, status "ACTIVE"
2. **Given** user creates Expense record, **When** submitting, **Then** stored with date, locationId, userId, status "ACTIVE"
3. **Given** Income or Expense with status "ACTIVE", **When** user marks as "CANCELLED", **Then** status → "CANCELLED", isVisible = false (soft delete), not included in CashClose totals
4. **Given** multiple Incomes/Expenses in a period, **When** querying by date range and locationId, **Then** returns paginated list with filters applied server-side
5. **Given** STAFF user, **When** attempting to create Income/Expense, **Then** 403 Forbidden

---

### User Story 3 — Daily/Periodic Cash Close (Priority: P1)

**Actor**: MANAGER, OWNER, ADMIN  
**Goal**: Close a cash register for a period (day/shift), reconcile sales + income + expenses, lock the records to prevent modification

**Why this priority**: Critical for financial control. Cash close enforces state machine and prevents tampering with historical records.

**Independent Test**: After recording sales, income, expenses for a day, a MANAGER initiates cash close. System calculates totals, prevents modification of records for that period, and generates a CashClose record with "CLOSED" status. Once closed, attempting to create a new Sale/Income/Expense for that period fails.

**Acceptance Scenarios**:

1. **Given** period "2026-04-29" with Sales (total: $500), Incomes (total: $200), Expenses (total: $100), **When** MANAGER submits CashClose, **Then** CashClose record created with calculatedTotal = 500 + 200 - 100 = $600
2. **Given** CashClose created for period, **When** querying Sales for same date, **Then** all records have closedAt timestamp and isClosed = true
3. **Given** period already has CLOSED CashClose, **When** MANAGER attempts to create new Sale for that period, **Then** 400 Bad Request "Cannot modify closed cash period"
4. **Given** CashClose for location X, **When** user in location Y attempts to close, **Then** 403 Forbidden (RLS enforces location isolation)
5. **Given** CashClose created, **When** OWNER attempts to modify calculatedTotal, **Then** 403 Forbidden (CashClose immutable once closed; OWNER can only view)
6. **Given** STAFF user, **When** attempting to initiate CashClose, **Then** 403 Forbidden (MANAGER+ only)
7. **Given** multiple locations opening simultaneously, **When** two CashClose requests for same period/location, **Then** second receives 409 Conflict "Period already closed"

---

### Edge Cases

- What happens if a sale is created for a closed period? → Reject with 400, "Cannot create sale for closed cash period"
- What if user creates sale but network fails before receiving folio? → Ensure idempotency: retry returns same folio (detect duplicate by user+timestamp+items hash)
- What if MANAGER tries to close a period before confirming all sales? → Allow close; unsold items remain in stock; no validation
- What if plan has usedSessions counter and user pays with BENEFIT? → Increment atomically in same transaction as sale creation
- What if two managers try to close same period concurrently? → First wins (folio generation via transaction); second gets 409 Conflict
- What if stock goes negative momentarily due to concurrent operations? → Backend validates accumulated qty per transaction; frontend shows conflict warning

---

## Requirements *(mandatory)*

### Functional Requirements

#### Sale Registration
- **FR-001**: Users with MANAGER/OWNER/ADMIN role can create Sale records via POST /api/sales
- **FR-002**: Sale record includes: folio (unique by tenantId + locationId + sequence), items (productId, quantity, unitPrice, tax), paymentType (CASH/CREDIT/BENEFIT/INSURANCE/TRANSFER), status (ACTIVE/FINISHED/SETTLED/CANCELLED), dates (createdAt, finishedAt, settledAt), user attribution (userId)
- **FR-003**: Folio generation: format "{LOCATION_CODE}-{YYYY}-{NNNNN}" (e.g., LOC-2026-00001), sequence resets monthly per location, generated atomically in transaction to prevent duplicates
- **FR-004**: Sale items must reference existing Products; if product deleted, sale item remains but is marked "unavailable" (soft reference)
- **FR-005**: Sale.totalAmount calculated as SUM(item.qty * item.unitPrice + item.tax) server-side, not trusted from client
- **FR-006**: If paymentType = BENEFIT, system increments linked Plan.usedSessions; if usedSessions >= plannedSessions, mark Plan.status = EXHAUSTED
- **FR-007**: System MUST validate: quantityOrdered ≤ currentLocationStock (real-time check); reject with 400 if insufficient
- **FR-008**: On Sale creation, system automatically creates InventoryMovement (type=OUT, reference="SALE-{saleId}") with SaleItems as items, decrementing LocationStock atomically
- **FR-009**: Sale state transitions: ACTIVE → FINISHED (when paid) → SETTLED (when reconciled); ACTIVE → CANCELLED (if voided)
- **FR-010**: STAFF users can view sales but NOT create them (403 Forbidden on POST /api/sales); only MANAGER+ can create

#### Income & Expense Recording
- **FR-020**: Users with MANAGER/OWNER/ADMIN role can create Income and Expense records
- **FR-021**: Income record: type (predefined enum: SERVICE_FEE, DEPOSIT, TRANSFER, REFUND, OTHER), optional custom_type field (string, ≤100 chars) for advanced users, amount, description, date, locationId, userId, status (ACTIVE/CANCELLED)
- **FR-022**: Expense record: type (predefined enum: PAYROLL, SUPPLIES, UTILITIES, MAINTENANCE, OTHER), optional custom_type field (string, ≤100 chars) for advanced users, amount, description, date, locationId, userId, status (ACTIVE/CANCELLED)
- **FR-023**: Both Income and Expense marked CANCELLED are excluded from CashClose calculations (soft delete, audit trail preserved)
- **FR-024**: Users can query Incomes/Expenses with filters: dateFrom, dateTo, type, locationId; pagination 50 items/page
- **FR-025**: STAFF users can view Income/Expense but NOT create them (403 Forbidden)

#### Cash Close (Daily/Periodic Register Reconciliation)
- **FR-030**: Users with MANAGER/OWNER/ADMIN role can initiate CashClose for a period (date + locationId)
- **FR-031**: CashClose record: period (date), locationId, userId (who closed), status (OPEN/CLOSED), calculatedTotal (SUM of all Sales.totalAmount + Incomes.amount - Expenses.amount for period)
- **FR-032**: CashClose.calculatedTotal computed server-side by aggregating:
  - Sales with status in (ACTIVE, FINISHED, SETTLED) for period, excluding CANCELLED
  - Incomes with status = ACTIVE for period (exclude CANCELLED)
  - Expenses with status = ACTIVE for period (exclude CANCELLED)
  - Formula: SUM(Sales.totalAmount) + SUM(Income.amount) - SUM(Expense.amount)
- **FR-033**: Upon CashClose creation, all Sales/Incomes/Expenses for that period marked isClosed = true, closedAt = timestamp (read-only audit)
- **FR-034**: Once CashClose.status = CLOSED, new Sales/Incomes/Expenses for that period are rejected (400 Bad Request)
- **FR-035**: CashClose is completely immutable once status = CLOSED; only view operations allowed (no updates, no deletes, no status changes). Corrections handled via new Income/Expense records linked to the closed period, preserving audit trail
- **FR-036**: Concurrent CashClose requests for same period+location: first succeeds, second fails with 409 Conflict "Period already closed"
- **FR-037**: CashClose records visible only to MANAGER+ (OWNER/ADMIN always see all); STAFF cannot create/view CashClose
- **FR-038**: Soft-deleted records (CANCELLED status): stored but not included in CashClose totals or queries (filter in API layer)

#### Multi-Tenant & Location Isolation
- **FR-050**: All Sale/Income/Expense/CashClose records include tenantId; RLS policy enforces: users can only access records where tenantId matches JWT
- **FR-051**: MANAGER and STAFF see only records for their assigned locationId; OWNER/ADMIN see all locations in tenant
- **FR-052**: RLS on PostgreSQL prevents cross-tenant or cross-location data leakage at DB layer (defense in depth)
- **FR-053**: X-Tenant-ID header can override JWT tenantId during login flow (used to set tenant context before issuing JWT)

#### Audit & Logging
- **FR-060**: Every Sale/Income/Expense/CashClose creation logged to AuditLog: action (CREATE/UPDATE/CANCEL/CLOSE), resource, resourceId, old/newValues, userId, ipAddress, userAgent
- **FR-061**: All timestamps (createdAt, updatedAt, closedAt, finishedAt, settledAt) immutable once set (prevent backdating)
- **FR-062**: AuditLog inserted fire-and-forget (failure does NOT block transaction); logged asynchronously post-commit

#### Error Handling
- **FR-070**: Invalid folio sequence → 500 Internal Server Error with log; retry available
- **FR-071**: Duplicate sale detection (idempotency): if same user + same items + same timestamp within 10s, return cached folio
- **FR-072**: Stock depletion mid-transaction → Rollback entire sale (atomic); user sees validation error before commit
- **FR-073**: Role-based denials → 403 Forbidden with "Insufficient permissions"; log attempt
- **FR-074**: Concurrent CashClose → 409 Conflict with "Period already closed"; user can retry or select different period
- **FR-075**: Network timeout during sale creation → Idempotent retry with folio lookup; prevents double-charges

### Key Entities *(include if feature involves data)*

- **Sale**: Sales transaction with items, payment type, folio, amounts, state machine (ACTIVE → FINISHED → SETTLED/CANCELLED), linked to Product and Plan (if applicable)
- **SaleItem**: Line item in a sale (productId, quantity, unitPrice, tax, subtotal), immutable once sale finalized
- **Income**: Cash inflow record (type, amount, description, date), can be marked CANCELLED, aggregated in CashClose
- **Expense**: Cash outflow record (type, amount, description, date), can be marked CANCELLED, aggregated in CashClose
- **CashClose**: Daily/periodic register close record (date, locationId, calculatedTotal, status=OPEN|CLOSED), immutable, prevents modification of child records
- **InventoryMovement**: Auto-created OUT movement when sale is recorded, links back to SALE-{id}
- **LocationStock**: Decremented atomically when sale created; validated before creating sale

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Sale registration completes in under 2 seconds (with stock validation, folio generation, inventory movement creation)
- **SC-002**: System supports 100+ concurrent sales registrations without folio duplication or race conditions
- **SC-003**: CashClose calculation for 500+ sales/income/expense records in <1 second (DB query optimized with indexes on date, locationId)
- **SC-004**: 100% of sales properly decrement LocationStock; spot-check 50 random sales → stock delta verified
- **SC-005**: 0% of sales bypass folio generation (every sale has unique folio in format LOC-YYYY-NNNNN)
- **SC-006**: STAFF users cannot create sales (100% rejection rate on POST /api/sales); MANAGER+ can always create
- **SC-007**: Concurrent CashClose attempts → 100% of conflicts detected and reported (no silent overwrites)
- **SC-008**: All user actions logged to AuditLog within 5 seconds of transaction commit
- **SC-009**: Closed periods prevent new sales/income/expense (100% of submissions rejected with 400)
- **SC-010**: RLS tested: users from Tenant A cannot see Tenant B records; users from Location X cannot see Location Y records (0% leaks)

### Business Outcomes

- **SC-011**: Reduce manual cash reconciliation time by 90% (CashClose automated, eliminates manual addition)
- **SC-012**: Zero revenue lost due to system errors (atomic transactions, idempotent folio generation, audit trail)
- **SC-013**: Improve inventory accuracy to 98%+ (automatic stock deduction on sale, no manual adjustments needed except for shrinkage)
- **SC-014**: Enable period-end financial close in <5 minutes (automated CashClose with no manual steps)

---

## Assumptions

1. **Database**: PostgreSQL 16 with RLS enabled, tenantId and locationId columns on all tables
2. **Authentication**: JWT tokens with tenantId, userId, role in payload; extracted by JwtAuthGuard
3. **Inventory Data**: LocationStock table exists (from Sprint 15), Product table exists (from Sprint 15), InventoryMovement table exists (from Sprint 19)
4. **Plans**: Plan table exists (from Sprint 13) with usedSessions, plannedSessions, status fields
5. **Folio Sequence**: Sequence-based folio generation (e.g., SERIAL column on Sales table or atomic counter per location)
6. **Time Zone**: All timestamps in UTC; locale conversion handled in frontend
7. **Pagination**: API default 50 items/page, client can request 10-500
8. **Retry Logic**: Client implements exponential backoff (1s, 2s, 4s) on 409/5xx; backend handles idempotency key for ≤10s window
9. **Audit Logging**: AuditLog table exists; async logging via event bus (not blocking transaction)
10. **Multi-Currency**: Not supported in v1 (all amounts in currency of tenant's location)

---

## Out of Scope (v1)

- Multiple currencies
- Invoice/receipt printing (PDF export)
- Dedicated refund endpoints (refunds handled as CANCELLED sale + new credit sale; two separate CashClose line items for full audit visibility)
- Payment gateway integration (manual entry only)
- Tax calculations beyond flat amount (no compound/progressive tax)
- Batch operations / bulk sales
- Customer account balances or loyalty programs
- Recurring sales or subscriptions
- Sales forecasting or reporting (v1 = transaction recording only, reports in v2)
- Mobile app (backend REST API only, responsive web in v2)
