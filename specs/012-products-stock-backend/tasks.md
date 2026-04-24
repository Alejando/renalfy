# Tasks: Products + Location Stock Backend

**Input**: Design documents from `/specs/012-products-stock-backend/`  
**Branch**: `012-products-stock-backend`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**TDD**: Tests are written FIRST and must FAIL before any implementation task begins (Red → Green → Refactor per project constitution).

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no shared state)
- **[US#]**: User story from spec.md
- All paths are absolute from repo root

---

## Phase 1: Setup — Schemas in @repo/types

**Purpose**: Schema-first foundation. Nothing else can start until `products.schemas.ts` is complete and exported.

- [ ] T001 Add all Product Zod schemas to `packages/types/src/products.schemas.ts`: `CreateProductSchema`, `UpdateProductSchema`, `ProductQuerySchema`, `ProductResponseSchema`, `PaginatedProductsResponseSchema` with inferred types
- [ ] T002 Add all LocationStock Zod schemas to `packages/types/src/products.schemas.ts`: `UpsertLocationStockSchema`, `StockQuantityAdjustmentSchema` (discriminated union SET/DELTA), `StockQuerySchema`, `LocationStockResponseSchema` (with computed fields), `PaginatedStockResponseSchema`, `BulkStockItemSchema`, `BulkStockRequestSchema` (max 50), `BulkStockResponseSchema`, `StockSummaryItemSchema`, `PaginatedStockSummaryResponseSchema`
- [ ] T003 Export all products schemas and types from `packages/types/src/index.ts`

**Checkpoint**: `pnpm --filter @repo/types build` passes — schemas compile without errors

---

## Phase 2: Foundational — DTOs, Module Skeletons, AppModule

**Purpose**: Thin DTO wrappers and empty module shells that all user story phases depend on.

**⚠️ CRITICAL**: Must complete before any user story implementation.

- [ ] T004 [P] Create `apps/api/src/products/dto/create-product.dto.ts` — `export class CreateProductDto extends createZodDto(CreateProductSchema) {}`
- [ ] T005 [P] Create `apps/api/src/products/dto/update-product.dto.ts` — `export class UpdateProductDto extends createZodDto(UpdateProductSchema) {}`
- [ ] T006 [P] Create `apps/api/src/products/dto/product-query.dto.ts` — `export class ProductQueryDto extends createZodDto(ProductQuerySchema) {}`
- [ ] T007 [P] Create `apps/api/src/stock/dto/upsert-location-stock.dto.ts` — `export class UpsertLocationStockDto extends createZodDto(UpsertLocationStockSchema) {}`
- [ ] T008 [P] Create `apps/api/src/stock/dto/stock-quantity-adjustment.dto.ts` — `export class StockQuantityAdjustmentDto extends createZodDto(StockQuantityAdjustmentSchema) {}`
- [ ] T009 [P] Create `apps/api/src/stock/dto/stock-query.dto.ts` — `export class StockQueryDto extends createZodDto(StockQuerySchema) {}`
- [ ] T010 [P] Create `apps/api/src/stock/dto/bulk-stock.dto.ts` — `export class BulkStockRequestDto extends createZodDto(BulkStockRequestSchema) {}`
- [ ] T011 Create `apps/api/src/products/products.service.ts` (empty class with constructor injecting `PrismaService`), `apps/api/src/products/products.controller.ts` (empty `@Controller('products')` class), and `apps/api/src/products/products.module.ts` (registers controller + service, exports service)
- [ ] T012 Create `apps/api/src/stock/stock.service.ts` (empty class with `PrismaService`), `apps/api/src/stock/stock.controller.ts` (empty `@Controller('stock')` class), and `apps/api/src/stock/stock.module.ts` (registers controller + service, exports service)
- [ ] T013 Register `ProductsModule` and `StockModule` in `apps/api/src/app.module.ts` imports array

**Checkpoint**: `pnpm --filter api build` succeeds — empty modules wire up without errors

---

## Phase 3: US1 — Manage Product Catalog (Priority: P1) 🎯 MVP

**Goal**: OWNER and ADMIN can create, update, and delete products with full validation and role enforcement.

**Independent Test**: `POST /api/products` creates a product; duplicate name returns 409; MANAGER token returns 403; `DELETE` with stock returns 409 listing locations; `DELETE` with no stock succeeds.

### Tests — Write FIRST, verify FAIL before implementing

- [ ] T014 [US1] Write failing unit tests for `ProductsService.create()` in `apps/api/src/products/products.service.spec.ts`: happy path creates product; duplicate name → 409; MANAGER role → 403; tenantId always from parameter never from body
- [ ] T015 [US1] Write failing unit tests for `ProductsService.update()` in `apps/api/src/products/products.service.spec.ts`: happy path updates; name conflict (excluding self) → 409; not found → 404; MANAGER role → 403
- [ ] T016 [US1] Write failing unit tests for `ProductsService.remove()` in `apps/api/src/products/products.service.spec.ts`: happy path deletes; stock in location → 409 with location names array; historical reference in SaleItem → 409; MANAGER role → 403

### Implementation

- [ ] T017 [US1] Add `buildProductResponse()` helper and `PrismaProduct` local type in `apps/api/src/products/products.service.ts`; implement `assertOwnerAdmin()` guard function
- [ ] T018 [US1] Implement `ProductsService.create()` in `apps/api/src/products/products.service.ts`: check name uniqueness with `findFirst({ where: { tenantId, name } })`, throw 409 if found, then `product.create()`
- [ ] T019 [US1] Implement `ProductsService.update()` in `apps/api/src/products/products.service.ts`: verify product exists (404), check name uniqueness excluding self (`id: { not: id }`), then `product.update()`
- [ ] T020 [US1] Implement `ProductsService.remove()` in `apps/api/src/products/products.service.ts`: verify product (404), query `locationStock` for `quantity > 0` → 409 with location names, query counts in `saleItem` / `purchaseItem` / `purchaseOrderItem` / `inventoryMovementItem` → 409, then `product.delete()`
- [ ] T021 [US1] Wire `@Post()`, `@Patch(':id')`, `@Delete(':id')` with `@Roles('OWNER', 'ADMIN')` in `apps/api/src/products/products.controller.ts`; inject `@CurrentUser()` and pass `user.tenantId` and `user.role` to service

**Checkpoint**: Unit tests for US1 all GREEN. `POST`, `PATCH`, `DELETE /api/products` enforces roles and business rules.

---

## Phase 4: US2 — Browse and Search Products + US8 Category List (Priority: P1)

**Goal**: All authenticated users can list products with pagination, search, and category filter; distinct categories endpoint feeds UI dropdowns.

**Independent Test**: `GET /api/products?search=eritro` returns matching products for the caller's tenant only; `GET /api/products/categories` returns sorted distinct values; pagination params work correctly.

### Tests — Write FIRST, verify FAIL before implementing

- [ ] T022 [US2] Write failing unit tests for `ProductsService.findAll()` in `apps/api/src/products/products.service.spec.ts`: returns paginated response; search filters by name/brand/category (case-insensitive); category param filters exactly; sort params applied; tenant isolation (different tenantId returns empty)
- [ ] T023 [US2] Write failing unit tests for `ProductsService.findOne()` in `apps/api/src/products/products.service.spec.ts`: found returns product; not found → 404; with locationId enriches `stock` field; without locationId returns `stock: null`
- [ ] T024 [US8] Write failing unit tests for `ProductsService.findCategories()` in `apps/api/src/products/products.service.spec.ts`: returns sorted distinct non-null values; empty tenant → `[]`

### Implementation

- [ ] T025 [US2] Implement `ProductsService.findAll()` in `apps/api/src/products/products.service.ts`: build `where` with `tenantId` + optional search (`contains` on name/brand/category with `mode: 'insensitive'`) + optional category (`equals`); `orderBy` from query; `skip/take` pagination; return `{ data, total, page, limit }`
- [ ] T026 [US2] Implement `ProductsService.findOne()` in `apps/api/src/products/products.service.ts`: find product (404 if not found), optionally fetch matching `locationStock` row if `locationId` provided, return enriched response
- [ ] T027 [US8] Implement `ProductsService.findCategories()` in `apps/api/src/products/products.service.ts`: `prisma.product.findMany({ where: { tenantId, category: { not: null } }, select: { category: true }, distinct: ['category'], orderBy: { category: 'asc' } })`, map to `string[]`
- [ ] T028 [US2] Wire `@Get()`, `@Get('categories')`, `@Get(':id')` in `apps/api/src/products/products.controller.ts` — `@Get('categories')` MUST be declared before `@Get(':id')`; `findOne` passes `user.locationId` for MANAGER/STAFF or `query.locationId` for OWNER/ADMIN

**Checkpoint**: Unit tests for US2+US8 all GREEN. Full `ProductsService` test suite passes. `GET /api/products` and `GET /api/products/categories` work correctly.

---

## Phase 5: US3 — View Stock at My Location (Priority: P1)

**Goal**: MANAGER and STAFF see only their location's stock with correctly computed alert flags.

**Independent Test**: MANAGER token on `GET /api/stock` returns only rows for their `locationId`; rows include `effectiveAlertLevel`, `isBelowAlert`, `effectivePackageQty`; `onlyLowStock=true` filters correctly.

### Tests — Write FIRST, verify FAIL before implementing

- [ ] T029 [US3] Write failing unit tests for `StockService.findAll()` (MANAGER/STAFF scope) in `apps/api/src/stock/stock.service.spec.ts`: MANAGER gets only their locationId rows; locationId query param ignored for MANAGER; `onlyLowStock=true` returns only `isBelowAlert=true` rows; search filter applies to product name/brand/category; pagination works
- [ ] T030 [US3] Write failing unit tests for `StockService.findOne()` in `apps/api/src/stock/stock.service.spec.ts`: found → full response with computed fields; not found → 404; MANAGER requesting row from different location → 404 (not 403, to avoid leakage)
- [ ] T031 [US3] Write failing unit tests for `buildLocationStockResponse()` helper: `alertLevel=5, quantity=3` → `isBelowAlert=true, effectiveAlertLevel=5`; `alertLevel=0, globalAlert=10, quantity=7` → `isBelowAlert=true, effectiveAlertLevel=10`; both zero → `isBelowAlert=false`; `packageQty=null` → `effectivePackageQty=product.packageQty`

### Implementation

- [ ] T032 [US3] Add `PrismaLocationStock`, `PrismaProduct` local types and implement `buildLocationStockResponse()` helper in `apps/api/src/stock/stock.service.ts` with all computed fields
- [ ] T033 [US3] Implement `StockService.findAll()` in `apps/api/src/stock/stock.service.ts`: scope `locationId` to `user.locationId` for MANAGER/STAFF (ignore query param); build `where` with tenantId + locationId + optional search; fetch with product join; apply `onlyLowStock` post-fetch filter; paginate
- [ ] T034 [US3] Implement `StockService.findOne()` in `apps/api/src/stock/stock.service.ts`: find row with `tenantId`; for MANAGER/STAFF verify `row.locationId === user.locationId` (throw 404 if mismatch); return enriched response
- [ ] T035 [US3] Wire `@Get()` and `@Get(':id')` in `apps/api/src/stock/stock.controller.ts`; pass `user.role` and `user.locationId` from `@CurrentUser()`

**Checkpoint**: Unit tests for US3 all GREEN. `GET /api/stock` correctly scopes to location for MANAGER/STAFF.

---

## Phase 6: US4 — View Stock Across All Locations (Priority: P2)

**Goal**: OWNER and ADMIN see stock for all locations in one paginated view, with optional location filter and cross-location product summary.

**Independent Test**: OWNER `GET /api/stock` returns rows from all locations each with `locationName`; `GET /api/stock/summary` returns per-product totals; `?isAnyLocationBelowAlert=true` filters to critical products.

### Tests — Write FIRST, verify FAIL before implementing

- [ ] T036 [US4] Write failing unit tests for `StockService.findAll()` (OWNER/ADMIN scope) in `apps/api/src/stock/stock.service.spec.ts`: returns all-location rows with `locationName`; `?locationId=` filter scopes to single location; `onlyLowStock` filter across all locations
- [ ] T037 [US4] Write failing unit tests for `StockService.getSummary()` in `apps/api/src/stock/stock.service.spec.ts`: aggregates `totalQuantity` per product; `locationBreakdown[]` lists each location; `isAnyLocationBelowAlert` computed correctly; `?isAnyLocationBelowAlert=true` filters; pagination applied

### Implementation

- [ ] T038 [US4] Update `StockService.findAll()` in `apps/api/src/stock/stock.service.ts` to handle OWNER/ADMIN path: no `locationId` filter by default, optional `?locationId=` applied, fetch and include `locationName` via Location lookup
- [ ] T039 [US4] Implement `StockService.getSummary()` in `apps/api/src/stock/stock.service.ts`: group `LocationStock` rows by `productId`, sum quantities, compute `isAnyLocationBelowAlert` per product, build `locationBreakdown[]`, paginate result
- [ ] T040 [US4] Wire `@Get('summary')` with `@Roles('OWNER', 'ADMIN')` in `apps/api/src/stock/stock.controller.ts` — MUST be declared before `@Get(':id')`

**Checkpoint**: Unit tests for US4 all GREEN. Cross-location stock visibility works for OWNER/ADMIN.

---

## Phase 7: US5 — Configure Stock Thresholds (Priority: P2)

**Goal**: Threshold configuration (minStock, alertLevel, packageQty) upserted per (locationId, productId) pair; MANAGER restricted to own location.

**Independent Test**: `PUT /api/stock/by-location` creates a new row when none exists; subsequent call updates it; MANAGER with foreign locationId returns 403; result includes correct computed fields.

### Tests — Write FIRST, verify FAIL before implementing

- [ ] T041 [US5] Write failing unit tests for `StockService.upsertByLocation()` in `apps/api/src/stock/stock.service.spec.ts`: creates row when absent; updates row when present; MANAGER own location succeeds; MANAGER foreign location → 403; unknown productId → 404; unknown locationId → 404; `effectivePackageQty` computed correctly in response

### Implementation

- [ ] T042 [US5] Implement `StockService.upsertByLocation()` in `apps/api/src/stock/stock.service.ts`: for MANAGER/STAFF verify `dto.locationId === user.locationId` (403 if mismatch); verify `locationId` belongs to tenant (404); verify `productId` belongs to tenant (404); `prisma.locationStock.upsert({ where: { locationId_productId: { locationId, productId } }, create: { tenantId, ...fields }, update: { ...fields } })`; return enriched response
- [ ] T043 [US5] Wire `@Put('by-location')` in `apps/api/src/stock/stock.controller.ts`; pass `user.role` and `user.locationId`

**Checkpoint**: Unit tests for US5 all GREEN. Upsert behavior and MANAGER location guard verified.

---

## Phase 8: US6 — Manual Stock Adjustment (Priority: P2)

**Goal**: OWNER/ADMIN can correct stock quantities via SET (absolute) or DELTA (relative) adjustment; negative results rejected with 422 including current quantity.

**Independent Test**: `PATCH /api/stock/:id/quantity` with `SET/50` sets quantity to 50; `DELTA/-40` on quantity=30 returns 422 with `currentQuantity: 30`; MANAGER token returns 403.

### Tests — Write FIRST, verify FAIL before implementing

- [ ] T044 [US6] Write failing unit tests for `StockService.adjustQuantity()` in `apps/api/src/stock/stock.service.spec.ts`: SET sets absolute value; DELTA adds/subtracts; DELTA that produces negative → 422 with `currentQuantity`; MANAGER/STAFF → 403; not found → 404

### Implementation

- [ ] T045 [US6] Implement `StockService.adjustQuantity()` in `apps/api/src/stock/stock.service.ts`: assert OWNER/ADMIN (403); find row by `{ id, tenantId }` (404); compute `newQuantity = dto.adjustmentType === 'SET' ? dto.quantity : row.quantity + dto.delta`; throw `UnprocessableEntityException({ message: '...', currentQuantity: row.quantity })` if `newQuantity < 0`; `prisma.locationStock.update({ where: { id }, data: { quantity: newQuantity } })`; return enriched response
- [ ] T046 [US6] Wire `@Patch(':id/quantity')` with `@Roles('OWNER', 'ADMIN')` in `apps/api/src/stock/stock.controller.ts`

**Checkpoint**: Unit tests for US6 all GREEN. Quantity adjustments enforced with role and negativity guards.

---

## Phase 9: US7 — Bulk Initialize Stock (Priority: P2)

**Goal**: OWNER/ADMIN can initialize stock for up to 50 (locationId, productId) pairs in one request; invalid items collected in errors[] without blocking valid ones.

**Independent Test**: `POST /api/stock/bulk` with 5 valid items returns `{ created: 5, updated: 0, errors: [] }`; one unknown productId appears in `errors[]` while others succeed; 51 items returns 422.

### Tests — Write FIRST, verify FAIL before implementing

- [ ] T047 [US7] Write failing unit tests for `StockService.bulkInit()` in `apps/api/src/stock/stock.service.spec.ts`: all valid → `{ created: N, updated: 0, errors: [] }`; unknown productId → appears in `errors[]`, valid items still processed; negative quantity → appears in `errors[]`; MANAGER/STAFF → 403 (Zod validates max-50 at DTO layer)

### Implementation

- [ ] T048 [US7] Implement `StockService.bulkInit()` in `apps/api/src/stock/stock.service.ts`: assert OWNER/ADMIN (403); iterate items independently; for each item validate productId belongs to tenant and quantity ≥ 0 (collect errors if not); for valid items call `prisma.locationStock.upsert()`; track `created`/`updated` counts; return `{ created, updated, errors }`
- [ ] T049 [US7] Wire `@Post('bulk')` with `@Roles('OWNER', 'ADMIN')` in `apps/api/src/stock/stock.controller.ts`

**Checkpoint**: Unit tests for US7 all GREEN. Partial-success bulk behavior verified.

---

## Phase 10: Location Deletion Guard (FR-016 — cross-cutting)

**Purpose**: Block `DELETE /api/locations/:id` when any `LocationStock.quantity > 0`; cascade-delete zero-quantity rows.

- [ ] T050 Write failing unit tests for `StockService.hasStockInLocation()` in `apps/api/src/stock/stock.service.spec.ts`: returns `{ hasStock: true, products: [...] }` when quantity > 0 exists; returns `{ hasStock: false, products: [] }` when all zero; returns `{ hasStock: false, products: [] }` when no rows
- [ ] T051 Implement `StockService.hasStockInLocation()` in `apps/api/src/stock/stock.service.ts`: query `locationStock.findMany({ where: { locationId, tenantId, quantity: { gt: 0 } }, include: { product: { select: { name: true } } } })`; return `{ hasStock: rows.length > 0, products: rows.map(...) }`
- [ ] T052 Add `StockModule` to `LocationsModule` imports in `apps/api/src/locations/locations.module.ts`; inject `StockService` into `LocationsService` constructor
- [ ] T053 Write failing unit test for location deletion guard in `apps/api/src/locations/locations.service.spec.ts`: location with stock > 0 → 409 with products list; location with quantity = 0 only → delete succeeds and zero rows removed
- [ ] T054 Update `LocationsService.remove()` in `apps/api/src/locations/locations.service.ts`: call `this.stockService.hasStockInLocation(id, tenantId)`; if `hasStock` throw `ConflictException({ message: '...', products })`; otherwise `prisma.locationStock.deleteMany({ where: { locationId: id, tenantId, quantity: 0 } })` then `prisma.location.delete({ where: { id } })`

**Checkpoint**: Unit tests for guard all GREEN. Location with stock cannot be deleted; location with zero stock deletes cleanly.

---

## Phase 11: E2E Tests + Final Validation

**Purpose**: Integration tests against real database; verify tenant isolation, role boundaries, and end-to-end flows.

- [ ] T055 Create `apps/api/test/products-stock.e2e-spec.ts` with test setup (two tenants, users per role) following the pattern in `apps/api/test/companies-plans.e2e-spec.ts`
- [ ] T056 Write E2E tests for Products in `apps/api/test/products-stock.e2e-spec.ts`: OWNER creates product; MANAGER gets 403 on create; duplicate name gets 409; list with search/category filter/pagination; `GET /categories`; update with name conflict; delete blocked by stock (with location names in response); delete blocked by historical reference; tenant isolation (Tenant A product invisible to Tenant B)
- [ ] T057 Write E2E tests for Stock in `apps/api/test/products-stock.e2e-spec.ts`: `PUT /by-location` creates then updates; MANAGER scoped to own location on GET; OWNER sees all locations; `?onlyLowStock=true` filter; `PATCH /:id/quantity` SET and DELTA; DELTA negative → 422; MANAGER → 403 on quantity; `POST /bulk` with mixed valid/invalid; `GET /summary` with pagination and filter
- [ ] T058 Write E2E test for location deletion guard in `apps/api/test/products-stock.e2e-spec.ts`: `DELETE /api/locations/:id` blocked with stock > 0 (response includes products list); succeeds when stock = 0
- [ ] T059 Run full verification: `pnpm lint && pnpm check-types && pnpm --filter api test && pnpm --filter api test:e2e` — fix any issues until all pass

**Checkpoint**: All 4 commands exit 0. Sprint 15 is DONE.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Schemas)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — blocks all user story phases
- **Phases 3–9 (User Stories)**: All depend on Phase 2; can proceed in the priority order shown
- **Phase 10 (Location Guard)**: Depends on Phase 9 (StockService must be fully functional); can be parallelized with Phases 6–9 if StockService.hasStockInLocation() is implemented early
- **Phase 11 (E2E)**: Depends on Phases 3–10 complete

### User Story Dependencies

- **US1 (P1)**: After Phase 2 — no story dependencies
- **US2+US8 (P1)**: After Phase 2 — no story dependencies (same service as US1, implement sequentially)
- **US3 (P1)**: After Phase 2 — no story dependencies (separate StockService)
- **US4 (P2)**: After US3 (extends `findAll()` for OWNER/ADMIN path)
- **US5 (P2)**: After Phase 2 — independent of US3/US4
- **US6 (P2)**: After Phase 2 — independent
- **US7 (P2)**: After Phase 2 — independent
- **FR-016 (guard)**: After StockService has `hasStockInLocation()`

### Within Each Phase

1. Write tests → verify they FAIL → implement → verify GREEN → refactor

### Parallel Opportunities

Within Phase 2, T004–T010 (DTOs) are fully parallel — different files with no dependencies.

Within Phase 3, T014–T016 (test writing) can be written in parallel; T017–T020 (implementations) must be sequential after helpers (T017).

Phases 5 (US3) and 7 (US5) can be worked in parallel since they involve different methods on `StockService`.

---

## Parallel Example: Phase 2 DTOs

```
# All 7 DTO files can be created simultaneously (different files):
T004: apps/api/src/products/dto/create-product.dto.ts
T005: apps/api/src/products/dto/update-product.dto.ts
T006: apps/api/src/products/dto/product-query.dto.ts
T007: apps/api/src/stock/dto/upsert-location-stock.dto.ts
T008: apps/api/src/stock/dto/stock-quantity-adjustment.dto.ts
T009: apps/api/src/stock/dto/stock-query.dto.ts
T010: apps/api/src/stock/dto/bulk-stock.dto.ts
```

---

## Implementation Strategy

### MVP First (US1 only — functional product catalog)

1. Complete Phase 1: Schemas
2. Complete Phase 2: Foundational
3. Complete Phase 3: US1 (create, update, delete with role guards)
4. **STOP and VALIDATE**: `POST`, `PATCH`, `DELETE /api/products` work correctly
5. Continue with Phase 4 (US2 — read/search) to make the catalog usable

### Incremental Delivery

1. Phases 1–2 → Foundation
2. Phase 3 → Product write operations (MVP)
3. Phase 4 → Product read operations (catalog is usable)
4. Phase 5 → Stock visibility for MANAGER/STAFF (locations operational)
5. Phases 6–9 → Stock management features (OWNER/ADMIN operations)
6. Phase 10 → Location integrity guard
7. Phase 11 → E2E + final verification

---

## Summary

| Phase | Tasks | User Story | Parallelizable |
|---|---|---|---|
| 1 — Schemas | T001–T003 | — | No (sequential) |
| 2 — Foundational | T004–T013 | — | T004–T010 fully parallel |
| 3 — US1 Catalog CRUD | T014–T021 | US1 (P1) | T014–T016 parallel |
| 4 — US2 Browse + US8 Categories | T022–T028 | US2, US8 (P1) | T022–T024 parallel |
| 5 — US3 Stock at Location | T029–T035 | US3 (P1) | T029–T031 parallel |
| 6 — US4 Stock All Locations | T036–T040 | US4 (P2) | T036–T037 parallel |
| 7 — US5 Thresholds | T041–T043 | US5 (P2) | — |
| 8 — US6 Quantity Adjust | T044–T046 | US6 (P2) | — |
| 9 — US7 Bulk Init | T047–T049 | US7 (P2) | — |
| 10 — Location Guard | T050–T054 | FR-016 | — |
| 11 — E2E + Validation | T055–T059 | All | T055–T058 parallel |
| **Total** | **59 tasks** | **8 stories** | |
