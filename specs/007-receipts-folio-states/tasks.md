# Tasks: Receipts — Folio Generation & State Machine

**Input**: Design documents from `/specs/007-receipts-folio-states/`
**Prerequisites**: plan.md ✓ spec.md ✓ research.md ✓ data-model.md ✓ contracts/api.md ✓ quickstart.md ✓

**Tests**: Included (TDD — Red → Green → Refactor, per project constitution and CLAUDE.md).

**Organization**: Tasks grouped by user story. Phase 2 (Foundational) blocks all user stories — complete it before any story work begins.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup (Schema & Types)

**Purpose**: Apply Prisma schema changes and publish Zod schemas — shared foundation for all stories.

- [ ] T001 Add `planId String?` field and `@relation` to `Receipt` model, add `receipts Receipt[]` back-relation to `Plan` model in `apps/api/prisma/schema.prisma`
- [ ] T002 Add `ReceiptFolioCounter` model with `(tenantId, locationId, year, lastSequence)` and `@@unique([tenantId, locationId, year])` to `apps/api/prisma/schema.prisma`
- [ ] T003 Run `npx prisma migrate dev --name add-receipt-folio-counter-and-plan-id` and `npx prisma generate` from `apps/api/`
- [ ] T004 Create `packages/types/src/receipts.schemas.ts` with `CreateReceiptSchema`, `UpdateReceiptStatusSchema`, `ReceiptQuerySchema`, `ReceiptResponseSchema`, `PaginatedReceiptsResponseSchema`, and inferred TS types — include `PaymentTypeSchema` and `ReceiptStatusSchema` as `z.enum()`
- [ ] T005 Add re-exports of all receipts schemas to `packages/types/src/index.ts`
- [ ] T006 Run `pnpm --filter @repo/types build` to compile the package

---

## Phase 2: Foundational (Module Scaffold)

**Purpose**: Create the NestJS module skeleton so each user story can add to it independently.

**⚠️ CRITICAL**: Must be complete before any user story implementation begins.

- [ ] T007 Create `apps/api/src/receipts/receipts.module.ts` with `ReceiptsModule` declaring `ReceiptsController` and `ReceiptsService`
- [ ] T008 Create `apps/api/src/receipts/dto/create-receipt.dto.ts` extending `createZodDto(CreateReceiptSchema)` from `nestjs-zod` and `@repo/types`
- [ ] T009 [P] Create `apps/api/src/receipts/dto/update-receipt-status.dto.ts` extending `createZodDto(UpdateReceiptStatusSchema)`
- [ ] T010 [P] Create `apps/api/src/receipts/dto/receipt-query.dto.ts` extending `createZodDto(ReceiptQuerySchema)`
- [ ] T011 Create `apps/api/src/receipts/receipts.service.ts` with `ReceiptsService` class (constructor injecting `PrismaService`, empty method stubs: `create`, `updateStatus`, `findAll`, `findOne`)
- [ ] T012 Create `apps/api/src/receipts/receipts.controller.ts` with `ReceiptsController` class (empty — endpoints added per story)

**Checkpoint**: Module compiles — `pnpm check-types --filter api` passes on empty stubs.

---

## Phase 3: User Story 1 — Create Receipt with Atomic Folio (Priority: P1) 🎯 MVP

**Goal**: Staff can create a receipt that gets a unique, sequentially generated folio. Includes appointment guard (COMPLETED only) and MANAGER/STAFF location scope for creation.

**Independent Test**: `POST /api/receipts` with valid CASH payload returns a receipt with folio `{LOC}-{YYYY}-{NNNNN}` and status `ACTIVE`. MANAGER cannot create for another location.

### Tests for User Story 1 ⚠️ Write FIRST — ensure they FAIL before implementation

- [ ] T013 [US1] Write unit tests for `ReceiptsService.create()` in `apps/api/src/receipts/receipts.service.spec.ts` covering: (a) CASH happy path — folio format correct, (b) second receipt gets incremented folio, (c) MANAGER blocked from other location (NotFoundException), (d) appointment not COMPLETED → ConflictException, (e) appointment already has receipt → ConflictException, (f) appointmentId not found → NotFoundException

### Implementation for User Story 1

- [ ] T014 [US1] Implement folio generation helper `buildFolio(locationName: string, year: number, seq: number): string` as module-level function in `apps/api/src/receipts/receipts.service.ts`
- [ ] T015 [US1] Implement `ReceiptsService.create()` in `apps/api/src/receipts/receipts.service.ts`: validate MANAGER location scope, fetch location for name, validate appointmentId (if provided) is COMPLETED and has no receipt, run `prisma.$transaction` to upsert `ReceiptFolioCounter` + create Receipt + optionally update Appointment.receiptId
- [ ] T016 [US1] Add `POST /receipts` endpoint to `apps/api/src/receipts/receipts.controller.ts` with `@Roles('OWNER','ADMIN','MANAGER','STAFF')`, `@Audit({ action: 'CREATE', resource: 'Receipt' })`, `@HttpCode(HttpStatus.CREATED)`

**Checkpoint**: `pnpm test --filter api` — all US1 tests green. `POST /api/receipts` returns 201 with correct folio.

---

## Phase 4: User Story 2 — Receipt State Transitions (Priority: P2)

**Goal**: Staff can advance a receipt through `ACTIVE → FINISHED → SETTLED` or cancel it with `ACTIVE → CANCELLED`. Invalid transitions are rejected with clear error messages.

**Independent Test**: `PATCH /api/receipts/:id/status` with `{ status: 'FINISHED' }` on an ACTIVE receipt returns 200. Attempting `FINISHED → CANCELLED` returns 400. Attempting any transition on a SETTLED receipt returns 409.

### Tests for User Story 2 ⚠️ Write FIRST — ensure they FAIL before implementation

- [ ] T017 [US2] Write unit tests for `ReceiptsService.updateStatus()` in `apps/api/src/receipts/receipts.service.spec.ts` covering: (a) ACTIVE → FINISHED succeeds, (b) FINISHED → SETTLED succeeds, (c) ACTIVE → CANCELLED succeeds, (d) FINISHED → CANCELLED → BadRequestException, (e) SETTLED → any → ConflictException, (f) CANCELLED → any → ConflictException, (g) receipt not found → NotFoundException, (h) MANAGER cannot update receipt in other location → NotFoundException

### Implementation for User Story 2

- [ ] T018 [US2] Add `VALID_RECEIPT_TRANSITIONS` constant and implement `ReceiptsService.updateStatus()` in `apps/api/src/receipts/receipts.service.ts`: validate location scope, check terminal states (ConflictException), check valid transitions (BadRequestException), update receipt
- [ ] T019 [US2] Add `PATCH /receipts/:id/status` endpoint to `apps/api/src/receipts/receipts.controller.ts` with `@Roles('OWNER','ADMIN','MANAGER','STAFF')`, `@Audit({ action: 'UPDATE', resource: 'Receipt' })`

**Checkpoint**: `pnpm test --filter api` — all US1 and US2 tests green. State transitions work correctly.

---

## Phase 5: User Story 3 — BENEFIT Payment: Plan Session Tracking (Priority: P3)

**Goal**: Creating a receipt with `paymentType = BENEFIT` atomically increments `plan.usedSessions`. When `usedSessions >= plannedSessions`, the plan is set to `EXHAUSTED`. Attempting BENEFIT without a `planId`, or against an EXHAUSTED plan, is rejected.

**Independent Test**: `POST /api/receipts` with `paymentType=BENEFIT` and `planId` increments `plan.usedSessions` by 1. A ninth receipt on a 10-session plan causes `plan.status = EXHAUSTED`. BENEFIT without `planId` returns 400.

### Tests for User Story 3 ⚠️ Write FIRST — ensure they FAIL before implementation

- [ ] T020 [US3] Write unit tests for BENEFIT logic in `ReceiptsService.create()` in `apps/api/src/receipts/receipts.service.spec.ts` covering: (a) BENEFIT without planId → BadRequestException, (b) planId not in tenant → NotFoundException, (c) plan status EXHAUSTED → ConflictException, (d) BENEFIT with valid plan increments usedSessions, (e) BENEFIT on last session → usedSessions incremented AND plan.status = EXHAUSTED, (f) non-BENEFIT paymentType with planId → plan NOT modified

### Implementation for User Story 3

- [ ] T021 [US3] Extend `ReceiptsService.create()` in `apps/api/src/receipts/receipts.service.ts` to handle BENEFIT: validate planId required (BadRequestException), fetch plan (NotFoundException if missing), check plan not EXHAUSTED (ConflictException), add plan session update inside the existing `$transaction` — `usedSessions: { increment: 1 }` + conditionally set `status: 'EXHAUSTED'` when `updatedSessions >= plannedSessions`

**Checkpoint**: `pnpm test --filter api` — all US1, US2, and US3 tests green. BENEFIT flow is atomic.

---

## Phase 6: User Story 4 — Query Receipts with Filters & Location Scope (Priority: P4)

**Goal**: Staff can list receipts with optional filters (status, patientId, date, paymentType), paginated. MANAGER/STAFF are automatically scoped to their location. A single receipt can be fetched by ID.

**Independent Test**: `GET /api/receipts` returns paginated results for the caller's scope. `GET /api/receipts/:id` returns a single receipt or 404 if out of scope.

### Tests for User Story 4 ⚠️ Write FIRST — ensure they FAIL before implementation

- [ ] T022 [P] [US4] Write unit tests for `ReceiptsService.findAll()` in `apps/api/src/receipts/receipts.service.spec.ts` covering: (a) MANAGER gets only their location's receipts, (b) OWNER gets all receipts, (c) filter by status, (d) filter by patientId, (e) filter by date builds correct day range, (f) pagination metadata correct
- [ ] T023 [P] [US4] Write unit tests for `ReceiptsService.findOne()` in `apps/api/src/receipts/receipts.service.spec.ts` covering: (a) returns receipt by ID, (b) MANAGER cannot get receipt from other location → NotFoundException, (c) not found → NotFoundException

### Implementation for User Story 4

- [ ] T024 [P] [US4] Implement `ReceiptsService.findAll()` in `apps/api/src/receipts/receipts.service.ts`: build `where` clause with `tenantId`, optional `locationId` (MANAGER/STAFF), optional `status`, `patientId`, `paymentType`, date range; paginate with `skip`/`take`; return `{ data, total, page, limit }`
- [ ] T025 [P] [US4] Implement `ReceiptsService.findOne()` in `apps/api/src/receipts/receipts.service.ts`: find by id + tenantId + optional locationId; throw NotFoundException if not found
- [ ] T026 [US4] Add `GET /receipts` endpoint to `apps/api/src/receipts/receipts.controller.ts` with `@Audit({ action: 'READ', resource: 'Receipt' })`, `@Query() query: ReceiptQueryDto`
- [ ] T027 [US4] Add `GET /receipts/:id` endpoint to `apps/api/src/receipts/receipts.controller.ts` with `@Audit({ action: 'READ', resource: 'Receipt' })`

**Checkpoint**: `pnpm test --filter api` — all 4 user story test suites green.

---

## Phase 7: Polish & Module Registration

**Purpose**: Wire up the module and verify the full feature passes all quality gates.

- [ ] T028 Register `ReceiptsModule` in `apps/api/src/app.module.ts` imports array
- [ ] T029 Add `toResponse()` private helper to `ReceiptsService` mapping Prisma result → `ReceiptResponse` (consistent with pattern in `AppointmentsService`)
- [ ] T030 Run `pnpm lint` from repo root — fix any warnings or errors
- [ ] T031 Run `pnpm check-types` from repo root — fix any TypeScript errors
- [ ] T032 Run `pnpm test --filter api` — confirm all tests green with no regressions

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 (T003 must complete before T007+)
- **Phase 3 (US1)**: Depends on Phase 2 — BLOCKS Phase 4, 5 (US2/US3 extend `create()`)
- **Phase 4 (US2)**: Depends on Phase 2 — independent of US1 (`updateStatus` is separate)
- **Phase 5 (US3)**: Depends on Phase 3 (extends `create()` method)
- **Phase 6 (US4)**: Depends on Phase 2 — fully independent of US1/US2/US3
- **Phase 7 (Polish)**: Depends on all prior phases

### User Story Dependencies

- **US1 (P1)**: Requires Phase 2 complete. No story dependencies.
- **US2 (P2)**: Requires Phase 2 complete. Independent of US1.
- **US3 (P3)**: Requires Phase 3 (US1) — BENEFIT logic is added inside `create()`.
- **US4 (P4)**: Requires Phase 2 complete. Independent of US1/US2/US3.

### Parallel Opportunities

- T008, T009, T010 can run in parallel (different DTO files)
- T022 and T023 can run in parallel (different test describe blocks)
- T024 and T025 can run in parallel (different methods)
- T026 and T027 can run in parallel after T024+T025

---

## Parallel Example: Phase 3 (US1)

```
# Sequential (tests must fail before implementation):
T013 → T014 → T015 → T016
```

## Parallel Example: Phase 6 (US4)

```
# Parallel tests:
T022 ─┐
T023 ─┴─► (both green) ─► T024+T025 (parallel) ─► T026+T027 (parallel)
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1 (Setup) — schema + types
2. Complete Phase 2 (Foundational) — module scaffold
3. Complete Phase 3 (US1) — create receipt with folio
4. **STOP and VALIDATE**: Test folio generation independently
5. Staff can now issue CASH/CREDIT/INSURANCE/TRANSFER receipts

### Incremental Delivery

1. Phase 1+2 → Foundation ready
2. Phase 3 → US1 — Receipt creation with folio ✓
3. Phase 4 → US2 — State machine (lifecycle management) ✓
4. Phase 5 → US3 — BENEFIT + plan tracking ✓
5. Phase 6 → US4 — List + filter (read operations) ✓
6. Phase 7 → Polish + all gates green ✓

---

## Notes

- TDD is mandatory: write each test task first, confirm it fails, then implement
- `$transaction` is required for folio generation (T015) and BENEFIT plan update (T021)
- `amount` is stored as `Decimal` in Prisma — cast to string in `toResponse()` to match `ReceiptResponseSchema`
- Location `code` for folio = `location.name.slice(0, 3).toUpperCase()` (no `code` field on Location model)
- Appointment link: Appointment holds FK (`receiptId`) — update Appointment inside the create transaction
- All `.js` extensions required on local imports in NestJS (ESM/nodenext)
- Run `pnpm --filter @repo/types build` after any schema change in T004/T005
