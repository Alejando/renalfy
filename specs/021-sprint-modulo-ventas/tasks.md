# Phase 2 Tasks: Sprint 21 — Módulo 4: Ventas (Backend)

**Sprint Branch**: `021-sprint-modulo-ventas`  
**Total Tasks**: 72 | **Estimated Duration**: 8-10 days  
**Testing Approach**: TDD (Red → Green → Refactor)

---

## Implementation Strategy

### MVP Scope (Days 1-5)

Complete **User Story 1 (Sale Registration)** end-to-end:
- ✅ Phase 1: Zod schemas + DTOs
- ✅ Phase 2: Prisma migrations + RLS policies
- ✅ Phase 3: Sale CRUD + folio generation + inventory deduction (atomic transaction)
- ✅ Phase 4: Unit tests (40+ tests) + E2E tests (4-5 tests)

**Why this order**: Sales are the core revenue transaction. Once sales work, Income/Expense and CashClose become straightforward CRUD + aggregation. Parallel implementation possible after US1 foundation is solid.

### Phase Structure

| Phase | Focus | Days |
|---|---|---|
| **1. Setup** | Schemas, migrations, RLS | Day 1 |
| **2. Foundational** | Base modules, guards, interceptors | Day 1-2 |
| **3. US1** | Sale CRUD + folio + inventory | Days 2-4 |
| **4. US2** | Income/Expense CRUD | Days 4-5 |
| **5. US3** | CashClose state machine + aggregation | Days 5-6 |
| **6. Polish** | E2E tests, audit logging, performance | Days 6-8 |

### Parallelization Opportunities

After completing Phase 2 (Foundational):
- **[P] Tasks**: T010-T012 (Income schema + migration) can run in parallel with T013-T015 (Expense schema + migration)
- **[P] Tasks**: T020-T022 (SalesService) can run in parallel with T030-T032 (IncomeService) if SalesService complete
- **[P] Tasks**: E2E tests for each service can run independently after that service's unit tests pass

---

## Phase 1: Setup — Schemas, Migrations, RLS

### Zod Schemas in @repo/types

- [ ] T001 Create `packages/types/src/sales.schemas.ts` with `PaymentTypeEnum`, `SaleStatusEnum`, `CreateSaleSchema`, `SaleItemSchema`, `SaleResponseSchema`
- [ ] T002 Create `packages/types/src/income.schemas.ts` with `IncomeTypeEnum`, `IncomeStatusEnum`, `CreateIncomeSchema`, `IncomeResponseSchema`
- [ ] T003 Create `packages/types/src/expense.schemas.ts` with `ExpenseTypeEnum`, `ExpenseStatusEnum`, `CreateExpenseSchema`, `ExpenseResponseSchema`
- [ ] T004 Create `packages/types/src/cash-close.schemas.ts` with `CashCloseStatusEnum`, `CreateCashCloseSchema`, `CashCloseResponseSchema`
- [ ] T005 Update `packages/types/src/index.ts` to re-export all new schemas and enums
- [ ] T006 Run `pnpm --filter types build` to verify schemas compile without errors
- [ ] T007 Run `pnpm generate` to regenerate Prisma client with new types

### Prisma Schema & Migrations

- [ ] T008 Add `Sale`, `SaleItem`, `Income`, `Expense`, `CashClose` entities to `apps/api/prisma/schema.prisma` with all fields from data-model.md
- [ ] T009 Add RLS policies to schema (disable RLS temporarily for migration, re-enable after)
- [ ] T010 Run `npx prisma migrate dev --name add_sales_module` to create and apply migration
- [ ] T011 Verify migration completed: `npx prisma db execute --stdin < apps/api/prisma/migrations/.../migration.sql`
- [ ] T012 Run `npx prisma generate` to regenerate Prisma client

### RLS Policies (PostgreSQL)

- [ ] T013 Create RLS policy on `Sale` table: `SELECT/INSERT/UPDATE/DELETE WHERE tenantId = current_setting('app.current_tenant_id')`
- [ ] T014 Create RLS policy on `SaleItem` table: isolate by parent Sale's tenantId (via JOIN)
- [ ] T015 Create RLS policy on `Income` table: `SELECT/INSERT WHERE tenantId = current_setting(...)`
- [ ] T016 Create RLS policy on `Expense` table: `SELECT/INSERT WHERE tenantId = current_setting(...)`
- [ ] T017 Create RLS policy on `CashClose` table: `SELECT/INSERT WHERE tenantId = current_setting(...)` (NO UPDATE/DELETE except by superuser)
- [ ] T018 Verify RLS enabled on all tables: `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('Sale', 'Income', 'Expense', 'CashClose')`
- [ ] T019 Test RLS: Cross-tenant query attempt should return 0 rows or 403 error

---

## Phase 2: Foundational — Base Modules & Infrastructure

### NestJS Module Scaffolding

- [ ] T020 Create `apps/api/src/sales/sales.module.ts` with controller, service imports, and PrismaModule
- [ ] T021 Create `apps/api/src/income/income.module.ts`
- [ ] T022 Create `apps/api/src/expense/expense.module.ts`
- [ ] T023 Create `apps/api/src/cash-close/cash-close.module.ts`
- [ ] T024 Register all 4 modules in `apps/api/src/app.module.ts` imports array
- [ ] T025 Verify no TypeScript errors: `pnpm --filter api check-types`

### DTOs (NestJS wrappers around Zod schemas)

- [ ] T026 Create `apps/api/src/sales/dto/create-sale.dto.ts` extending `createZodDto(CreateSaleSchema)`
- [ ] T027 Create `apps/api/src/sales/dto/sale-response.dto.ts` extending `createZodDto(SaleResponseSchema)`
- [ ] T028 Create `apps/api/src/income/dto/create-income.dto.ts`
- [ ] T029 Create `apps/api/src/income/dto/income-response.dto.ts`
- [ ] T030 Create `apps/api/src/expense/dto/create-expense.dto.ts`
- [ ] T031 Create `apps/api/src/expense/dto/expense-response.dto.ts`
- [ ] T032 Create `apps/api/src/cash-close/dto/create-cash-close.dto.ts`
- [ ] T033 Create `apps/api/src/cash-close/dto/cash-close-response.dto.ts`

### Access Control & Role Checking

- [ ] T034 Create `apps/api/src/common/guards/sales-permission.guard.ts` (MANAGER+ only) with `canActivate()` checking `user.role` and `user.locationId` restrictions
- [ ] T035 Create `apps/api/src/common/guards/financial-permission.guard.ts` (MANAGER+ for create, OWNER/ADMIN for view all) — reuse for Income, Expense, CashClose
- [ ] T036 Add role constants to `apps/api/src/common/constants/roles.ts`: `MANAGER_ROLES = ['MANAGER', 'ADMIN', 'OWNER']`, `FINANCIAL_ROLES = ['OWNER', 'ADMIN']`

---

## Phase 3: User Story 1 — Sale Registration & Inventory Deduction (P1)

**Goal**: Register sales with automatic inventory deduction, folio generation, and plan updates (if BENEFIT).  
**Independent Test**: User can create sale → stock decrements → folio generated → movement created.

### SalesService Unit Tests (TDD Red)

- [ ] T037 [US1] Create `apps/api/src/sales/sales.service.spec.ts` with failing test: `should generate unique folio per location` (verify format LOC-YYYY-NNNNN)
- [ ] T038 [US1] Add failing test: `should create sale with items and calculate totalAmount server-side`
- [ ] T039 [US1] Add failing test: `should reject sale if stock insufficient for any item`
- [ ] T040 [US1] Add failing test: `should decrement LocationStock atomically with Sale creation`
- [ ] T041 [US1] Add failing test: `should create InventoryMovement (OUT) referencing sale`
- [ ] T042 [US1] Add failing test: `should increment Plan.usedSessions if paymentType=BENEFIT`
- [ ] T043 [US1] Add failing test: `should reject STAFF user with 403 Forbidden`
- [ ] T044 [US1] Add failing test: `should reject sale if period already closed (CashClose.status=CLOSED)`

### SalesService Implementation (TDD Green)

- [ ] T045 [US1] Create `apps/api/src/sales/sales.service.ts` with `create()` method: validate stock, generate folio, create sale+items+movement in atomic transaction
- [ ] T046 [US1] Implement `generateFolio()` private method using SERIAL/sequence query to create LOC-YYYY-NNNNN format
- [ ] T047 [US1] Implement `calculateTotal()` private method: SUM(qty * unitPrice + tax) server-side
- [ ] T048 [US1] Implement stock validation: `SELECT quantity FROM LocationStock WHERE (tenantId, locationId, productId) = (...) AND quantity >= order.qty`
- [ ] T049 [US1] Implement atomic transaction: `prisma.$transaction(async (tx) => { create Sale; create SaleItems; decrement LocationStock; create InventoryMovement; update Plan if BENEFIT })`
- [ ] T050 [US1] Implement `findOne(id, user)` method with location filtering for MANAGER
- [ ] T051 [US1] Implement `findAll(locationId?, filters?)` with pagination (50/page), filtering by status/date
- [ ] T052 [US1] Add `@Audit()` decorator to all methods for logging (fire-and-forget)

### SalesService Refactor & Tests Pass

- [ ] T053 [US1] Run `pnpm --filter api test -- sales.service.spec.ts` — all 8+ tests should now pass (TDD Green)
- [ ] T054 [US1] Refactor SalesService: extract constants, improve type safety, clean up comments
- [ ] T055 [US1] Re-run tests — still all passing (TDD Refactor verification)

### SalesController & Endpoints

- [ ] T056 [US1] Create `apps/api/src/sales/sales.controller.ts` with:
  - `POST /api/sales` — `create(dto, user)` with `@UseGuards(SalesPermissionGuard)`
  - `GET /api/sales/:id` — `findOne(id, user)`
  - `GET /api/sales` — `findAll(query, user)` with filters
- [ ] T057 [US1] Add role check in controller: `if (user.role === 'STAFF') throw 403`
- [ ] T058 [US1] Add error handling: 400 for insufficient stock, 409 for concurrent close conflicts, 400 for closed period

### SalesService E2E Tests

- [ ] T059 [US1] Create `apps/api/test/sales.e2e.spec.ts` with real DB setup
- [ ] T060 [US1] Add E2E test: `POST /api/sales → 201, verify folio format, verify stock decremented, verify movement created`
- [ ] T061 [US1] Add E2E test: `POST /api/sales with BENEFIT → 201, verify Plan.usedSessions incremented`
- [ ] T062 [US1] Add E2E test: `POST /api/sales with insufficient stock → 400, stock NOT decremented`
- [ ] T063 [US1] Add E2E test: `GET /api/sales/:id with MANAGER from different location → 403 (RLS enforces)`
- [ ] T064 [US1] Run E2E tests: `NODE_OPTIONS="..." pnpm --filter api test:e2e -- sales.e2e.spec.ts`

---

## Phase 4: User Story 2 — Income & Expense Recording (P1)

**Goal**: Record income and expense transactions, support cancellation (soft delete), aggregate in CashClose.  
**Independent Test**: User can create income/expense → appear in list → can cancel → excluded from closed periods.

### [P] Income & Expense Schemas (Parallel with US1 E2E)

- [ ] [P] T065 Create `apps/api/src/income/income.service.spec.ts` with tests: `should create income`, `should cancel income (soft delete)`, `should filter by type/date`, `should reject STAFF`
- [ ] [P] T066 Create `apps/api/src/income/income.service.ts` with `create()`, `cancel()`, `findAll(filters)` methods
- [ ] [P] T067 Create `apps/api/src/income/income.controller.ts` with `POST /api/income`, `GET /api/income`, `PATCH /api/income/:id/cancel`
- [ ] [P] T068 Run `pnpm --filter api test -- income.service.spec.ts` — all tests pass

### [P] Expense Service (Parallel)

- [ ] [P] T069 Create `apps/api/src/expense/expense.service.spec.ts` (similar to Income tests)
- [ ] [P] T070 Create `apps/api/src/expense/expense.service.ts` with `create()`, `cancel()`, `findAll(filters)`
- [ ] [P] T071 Create `apps/api/src/expense/expense.controller.ts` with endpoints
- [ ] [P] T072 Run `pnpm --filter api test -- expense.service.spec.ts` — all tests pass

### Income & Expense E2E Tests

- [ ] T073 [US2] Create `apps/api/test/income-expense.e2e.spec.ts`
- [ ] T074 [US2] Add E2E test: `POST /api/income → 201, stored with date/userId`
- [ ] T075 [US2] Add E2E test: `PATCH /api/income/:id/cancel → 200, status=CANCELLED, cancelledAt set`
- [ ] T076 [US2] Add E2E test: `GET /api/income?type=SERVICE_FEE&dateFrom=...&dateTo=... → 200, filtered server-side`
- [ ] T077 [US2] Add E2E test: `POST /api/expense → 201, stored with date/userId`
- [ ] T078 [US2] Run `NODE_OPTIONS="..." pnpm --filter api test:e2e -- income-expense.e2e.spec.ts`

---

## Phase 5: User Story 3 — Cash Close State Machine & Immutability (P1)

**Goal**: Close daily cash register, calculate totals, lock records, prevent modifications to closed periods.  
**Independent Test**: CashClose created → Sales/Income/Expense marked isClosed → duplicate close fails (409) → CashClose immutable.

### CashCloseService Unit Tests

- [ ] T079 [US3] Create `apps/api/src/cash-close/cash-close.service.spec.ts` with failing tests:
  - `should calculate total: SUM(Sales) + SUM(Incomes) - SUM(Expenses)`
  - `should mark all sales/income/expense as isClosed = true`
  - `should reject duplicate close (period already CLOSED) with 409`
  - `should prevent new sales for closed period (400)`
  - `should reject UPDATE/DELETE on CashClose after CLOSED (via RLS)`

### CashCloseService Implementation

- [ ] T080 [US3] Create `apps/api/src/cash-close/cash-close.service.ts` with `create(date, locationId, user)`:
  - Query sales for period WHERE createdAt::date = date AND status IN ('ACTIVE', 'FINISHED', 'SETTLED') AND status != 'CANCELLED'
  - Query incomes WHERE createdAt::date = date AND status = 'ACTIVE'
  - Query expenses WHERE createdAt::date = date AND status = 'ACTIVE'
  - Calculate totals
  - Create CashClose record with status = 'CLOSED'
  - Mark all related records: `UPDATE Sale SET isClosed=true, closedAt=now() WHERE ... AND date matches`
- [ ] T081 [US3] Implement conflict detection: UNIQUE constraint on (tenantId, locationId, date) prevents duplicates
- [ ] T082 [US3] Implement immutability check: RLS policy forbids UPDATE/DELETE after CLOSED
- [ ] T083 [US3] Implement closed period validation in SalesService: before creating sale, check if CashClose.status='CLOSED' for that date
- [ ] T084 [US3] Implement `findOne()` and `findByPeriod()` query methods (read-only)

### CashCloseService Tests Pass

- [ ] T085 [US3] Run `pnpm --filter api test -- cash-close.service.spec.ts` — all tests pass (TDD Green + Refactor)

### CashCloseController & Endpoints

- [ ] T086 [US3] Create `apps/api/src/cash-close/cash-close.controller.ts` with:
  - `POST /api/cash-close` — `create(dto, user)` with `@UseGuards(FinancialPermissionGuard)`
  - `GET /api/cash-close/:id` — `findOne(id, user)`
  - `GET /api/cash-close` — `findByPeriod(date, locationId, user)` (read-only)
- [ ] T087 [US3] Add error handling: 409 Conflict for duplicate close, 400 for invalid period, 403 for insufficient permissions

### CashCloseService E2E Tests

- [ ] T088 [US3] Create `apps/api/test/cash-close.e2e.spec.ts`
- [ ] T089 [US3] Add E2E test: `POST /api/cash-close with 100 sales + 50 income + 25 expense → 201, calculatedTotal = SUM - SUM + SUM, < 1 second`
- [ ] T090 [US3] Add E2E test: `POST /api/cash-close twice for same date/location → second gets 409`
- [ ] T091 [US3] Add E2E test: `After CashClose, POST /api/sales for that date → 400 "Cannot modify closed period"`
- [ ] T092 [US3] Add E2E test: `Verify isClosed=true and closedAt timestamp on all related records`
- [ ] T093 [US3] Add E2E test: `Attempt UPDATE CashClose (should fail via RLS policy)`
- [ ] T094 [US3] Run `NODE_OPTIONS="..." pnpm --filter api test:e2e -- cash-close.e2e.spec.ts`

---

## Phase 6: Polish & Cross-Cutting Concerns

### Comprehensive Testing

- [ ] T095 Run all unit tests: `pnpm --filter api test` — all 60+ tests passing
- [ ] T096 Run all E2E tests: `NODE_OPTIONS="..." pnpm --filter api test:e2e` — all 15+ tests passing
- [ ] T097 Generate coverage report: `pnpm --filter api test:cov` — ensure >80% line coverage for all new files
- [ ] T098 Verify no test warnings or errors: output clean, no skipped tests

### Linting & Type Safety

- [ ] T099 Run linter: `pnpm lint` — zero errors, zero warnings
- [ ] T100 Run type check: `pnpm check-types` — zero TypeScript errors
- [ ] T101 Fix any linting issues: import order, naming conventions, unused variables

### Audit Logging Integration

- [ ] T102 Verify `@Audit()` decorator on all endpoints: `POST /api/sales`, `POST /api/income`, `POST /api/expense`, `POST /api/cash-close`
- [ ] T103 Verify AuditLog entries created within 5 seconds of transaction commit (async, fire-and-forget)
- [ ] T104 Test AuditLog: create sale → check AuditLog table for entry with `action=CREATE, resource=Sale, resourceId=<saleId>`

### Performance & Concurrency Validation

- [ ] T105 Load test: Create 100 concurrent sales → verify no folio duplicates, all succeed or fail consistently
- [ ] T106 Load test: CashClose calculation with 1000+ sales/income/expense → verify < 1 second
- [ ] T107 Concurrency test: Two simultaneous CashClose for same period → first succeeds, second gets 409 Conflict
- [ ] T108 Verify indexes exist: `\d Sale` in psql shows indexes on (tenantId, locationId, createdAt), (folio)

### RLS & Multi-Tenant Verification

- [ ] T109 Cross-tenant isolation test: Create sale in Tenant A, switch to Tenant B → query returns 0 rows (RLS enforces)
- [ ] T110 Location filtering test: MANAGER creates sale for location X, query from location Y → 403 or 0 rows
- [ ] T111 RLS policy test: Try to UPDATE CashClose after CLOSED → RLS policy blocks (403 or silent failure)

### Documentation & Handoff

- [ ] T112 Update `CLAUDE.md` with Sales module endpoints and patterns (already done by update-agent-context.sh)
- [ ] T113 Document folio generation algorithm in code comments (`apps/api/src/sales/sales.service.ts`)
- [ ] T114 Create runbook: "How to close daily cash register" with example curl commands
- [ ] T115 Verify all endpoints documented in OpenAPI/Swagger (if applicable)

### Final Checks Before Merge

- [ ] T116 Verify no `any` types in new code: `grep -r "any" apps/api/src/sales apps/api/src/income apps/api/src/expense apps/api/src/cash-close`
- [ ] T117 Verify all imports use `.js` extension: `grep -r "from.*\.ts'" apps/api/src/sales`
- [ ] T118 Verify no hardcoded secrets: `grep -r "SECRET\|PASSWORD\|KEY" apps/api/src/sales` (only env vars)
- [ ] T119 Verify error handling: all endpoints return proper HTTP status codes (201 for success, 400/403/409 for errors)
- [ ] T120 Test manual end-to-end flow: Login → Create sale → Check stock → Create income → Create cash close → Verify RLS

---

## Task Execution Order

### Critical Path (must complete sequentially)

1. **Setup** (Phase 1, T001-T019): 1 day
   - Schemas → Migrations → RLS policies
   - Blocks everything else

2. **Foundational** (Phase 2, T020-T036): 1 day
   - Module scaffolding → DTOs → Guards
   - Blocks Phase 3-5

3. **User Story 1** (Phase 3, T037-T064): 2-3 days
   - Tests → Service → Controller → E2E
   - Unblocks parallel US2/US3

4. **User Story 2 & 3** (Phases 4-5, T065-T094): 2-3 days
   - Can run in parallel with each other (different tables)
   - Requires Phase 2 complete

5. **Polish** (Phase 6, T095-T120): 1-2 days
   - Testing → Performance → RLS verification
   - Final checks before merge

### Parallelization Window

After T054 (US1 tests passing):
- **[P] T065-T072**: Income/Expense services (parallel with US1 E2E and US3 planning)
- **[P] T079-T085**: CashClose tests/service (parallel with US2 E2E)

---

## Success Criteria

✅ **All tests passing**:
- `pnpm lint` → zero errors
- `pnpm check-types` → zero errors
- `pnpm test` → 60+ tests passing
- `NODE_OPTIONS="..." pnpm test:e2e` → 15+ tests passing

✅ **Functional requirements met**:
- Sales: folio generated, stock decremented, inventory movement created, plan.usedSessions updated
- Income/Expense: created, canceled (soft delete), filtered, excluded from closed periods
- CashClose: calculated, period locked, immutable, prevents closed period modifications
- RLS: cross-tenant, cross-location isolation verified

✅ **Performance targets met**:
- Sale creation: < 500ms
- CashClose with 1000+ records: < 1s
- Folio generation: < 200ms
- Concurrent sales: 100+ without duplicates

✅ **Audit trail**:
- All transactions logged to AuditLog (async)
- User, timestamp, IP address, action recorded

---

## Sprint Kickoff Checklist

Before starting T001:

- [ ] Branch checked out: `git checkout 021-sprint-modulo-ventas`
- [ ] Dependencies installed: `pnpm install`
- [ ] Test DB created: `pnpm test:setup` (renalfy_test)
- [ ] Docker running: `docker-compose up -d`
- [ ] IDE configured: TypeScript intellisense enabled
- [ ] Linter configured: ESLint extension installed
- [ ] Commit hooks: pre-commit hook configured to run lint/test

---

## Notes

- **TDD Strictly Enforced**: Every service has failing test first, then implementation
- **No Partial Completion**: Each phase must be fully complete (lint + types + tests) before moving to next
- **No Premature Optimization**: Implement required features only; optimize if performance targets missed
- **Concurrency Safety**: All atomic operations use Prisma transactions; no manual locking
- **Audit Trail Immutable**: Log failures don't block transactions (fire-and-forget); corrections via new records, not updates
