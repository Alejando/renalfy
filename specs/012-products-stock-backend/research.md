# Research: Products + Location Stock Backend

**Feature**: 012-products-stock-backend  
**Phase**: 0 — Outline & Research  
**Date**: 2026-04-24

## Summary

No NEEDS CLARIFICATION markers were found in the spec after the clarification session. All ambiguities were resolved. This document records the key decisions and patterns discovered by examining the existing codebase.

---

## Decision 1 — Module structure follows companies/plans pattern exactly

**Decision**: Two NestJS modules — `ProductsModule` (`apps/api/src/products/`) and `StockModule` (`apps/api/src/stock/`).

**Rationale**: Every prior resource (companies, plans, locations, patients) has its own module with `module.ts`, `controller.ts`, `service.ts`, `service.spec.ts`, and `dto/` folder. Following the same structure keeps the codebase uniform and lets the team navigate without surprises.

**Alternatives considered**: Single `InventoryModule` containing both products and stock. Rejected — it would create an oversized service/controller and blur the boundary between catalog management (tenant-wide) and stock management (per-location).

---

## Decision 2 — Zod schemas in `packages/types/src/products.schemas.ts`

**Decision**: A single new file `packages/types/src/products.schemas.ts` exposes all schemas and inferred types for both `Product` and `LocationStock`. Exported from `packages/types/src/index.ts` following `companies-plans.schemas.ts`.

**Rationale**: The constitution mandates Schema-First: `@repo/types` is the single source of truth. The `companies-plans.schemas.ts` pattern bundles two related resources (Company + Plan) in one file, so `products.schemas.ts` bundles Product + LocationStock similarly.

**Alternatives considered**: Separate `products.schemas.ts` and `location-stock.schemas.ts`. Rejected — unnecessary file proliferation for two tightly coupled resources.

---

## Decision 3 — `StockModule` imports `ProductsModule` for location deletion guard

**Decision**: `StockModule` exports a `StockService` method `hasStockInLocation(locationId, tenantId): Promise<boolean>` that the `LocationsModule` calls during `DELETE /api/locations/:id`. The `StockModule` is imported by `LocationsModule` to enable this cross-module call.

**Rationale**: FR-016 requires blocking Location deletion when `quantity > 0`. The logic lives in `StockService` (owner of `LocationStock` data). The `LocationsService.remove()` calls `StockService.hasStockInLocation()` before executing the delete.

**Alternatives considered**: Implement the check directly in `LocationsService` with a raw `prisma.locationStock.count()` call. Rejected — it would leak stock domain logic into the locations module and duplicate Prisma access patterns that belong to `StockService`.

---

## Decision 4 — Role scoping pattern for stock endpoints

**Decision**: Stock list endpoints receive `user.role` and `user.locationId` from `@CurrentUser()`. The service applies scoping:
- `MANAGER` / `STAFF`: always filter by `locationId = user.locationId`; supplied `locationId` query param is ignored
- `OWNER` / `ADMIN`: use supplied `?locationId=` query param if provided; otherwise return all-locations data

**Rationale**: This mirrors the pattern in `AppointmentsService` and `PatientsService` where `locationId` scoping is a first-class parameter to the service method, enforced server-side.

**Alternatives considered**: Separate controller routes per role. Rejected — the same endpoint can branch on role with a simple conditional, keeping the API surface minimal.

---

## Decision 5 — `effectiveAlertLevel` and `isBelowAlert` computed in service, not stored

**Decision**: These computed fields are calculated in `buildLocationStockResponse()` helper function inside `StockService`, never persisted in the database. Same pattern as `effectivePackageQty`.

**Rationale**: Computed fields do not belong in the database schema. The logic is: `effectiveAlertLevel = alertLevel > 0 ? alertLevel : product.globalAlert` and `isBelowAlert = effectiveAlertLevel > 0 && quantity <= effectiveAlertLevel`. This is pure business logic that belongs in the service.

---

## Decision 6 — Upsert via Prisma `upsert()` for `LocationStock`

**Decision**: `PUT /api/stock/by-location` uses `prisma.locationStock.upsert({ where: { locationId_productId: ... }, create: ..., update: ... })` — Prisma's built-in upsert with the `@@unique([locationId, productId])` constraint.

**Rationale**: Prisma 7 `upsert()` handles the race condition at the database level using the unique index. This is safer than a manual "find then create" pattern. The `locationId_productId` compound unique name matches the Prisma-generated identifier for `@@unique([locationId, productId])`.

---

## Decision 7 — Manual quantity adjustment stores no history in Sprint 15

**Decision**: `PATCH /api/stock/:id/quantity` directly updates `LocationStock.quantity` with no `InventoryMovement` record created. In Sprint 19, this internal implementation will be upgraded to create an `InventoryMovement` record while keeping the same external contract.

**Rationale**: Sprint 15 is a bridge. The external API contract (request/response shape) is designed to be stable; only the internal implementation changes in Sprint 19. The Zod schema for the endpoint body (`StockQuantityAdjustmentSchema`) is defined now in `@repo/types` so it doesn't change later.

---

## Decision 8 — `GET /api/products/categories` route registered before `GET /api/products/:id`

**Decision**: In `ProductsController`, the `@Get('categories')` handler must appear before `@Get(':id')` to prevent NestJS from treating `'categories'` as a route parameter value.

**Rationale**: NestJS resolves routes in order of declaration. A static segment (`categories`) must be registered before a parameterized segment (`:id`) to avoid mis-routing. This is a known NestJS gotcha documented in their official docs.

---

## Decision 9 — `Location` deletion guard added to `LocationsService`

**Decision**: `LocationsService.remove()` is updated to call `StockService.hasStockInLocation(locationId, tenantId)` before deleting. If stock exists, it throws `ConflictException` with the list of products. `LocationStock` rows with `quantity = 0` are deleted via Prisma `deleteMany` before the Location delete (or handled via cascade if configured).

**Rationale**: FR-016 is in scope for Sprint 15. The existing `LocationsService` already has a `remove()` method that can be extended with the guard call. The `StockModule` exports `StockService`, and `LocationsModule` imports `StockModule`.

**Alternatives considered**: Prisma cascade delete on the `Location → LocationStock` relation. Rejected — cascade deletes bypass the application-layer stock check (quantity > 0 guard), making it possible to silently delete non-zero stock records.

---

## Decision 10 — Bulk endpoint uses independent item processing, not a single transaction

**Decision**: `POST /api/stock/bulk` processes each item independently via individual Prisma `upsert()` calls. Invalid items (unknown productId, negative quantity) are collected into `errors[]` without rolling back valid items.

**Rationale**: The spec explicitly states: "Invalid items do not roll back valid ones." A single transaction would roll back everything on the first error. Independent processing with error collection gives the operator a useful partial-success response.

**Alternatives considered**: Full transaction with abort on first error. Rejected per spec (FR-014 and US-07 acceptance scenario 2).

---

## Existing patterns to reuse

| Pattern | File | Reuse in Sprint 15 |
|---|---|---|
| Role guard assertion | `companies.service.ts:assertOwnerAdmin()` | `assertOwnerAdmin()` in `products.service.ts` |
| Prisma mock structure | `companies.service.spec.ts:makePrisma()` | `makePrisma()` in `products.service.spec.ts` and `stock.service.spec.ts` |
| Paginated response | `CompanyQuerySchema`, `PaginatedCompaniesResponseSchema` | Same pattern for Product and LocationStock |
| DTO wrapper | `dto/create-company.dto.ts` → `createZodDto(CreateCompanySchema)` | Same for all new DTOs |
| `@CurrentUser()` decorator | All controllers | Both `ProductsController` and `StockController` |
| `JwtAuthGuard` + `@Roles()` | All controllers | Both controllers |
| `buildXxxResponse()` function | `companies.service.ts` | `buildProductResponse()`, `buildLocationStockResponse()` |
| E2E test setup | `companies-plans.e2e-spec.ts` | `products-stock.e2e-spec.ts` |
