# Feature Specification: Products + Location Stock Backend

**Feature Branch**: `012-products-stock-backend`  
**Created**: 2026-04-24  
**Status**: Draft  
**Sprint**: 15 — Módulo 3: Productos + Stock por sucursal (backend)

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Manage the Product Catalog (Priority: P1)

As an OWNER or ADMIN, I want to create, update, and delete products in a shared tenant-wide catalog so that all locations can reference the same item definitions.

**Why this priority**: Without a product catalog there is no inventory. This is the foundation every other story depends on.

**Independent Test**: Can be tested by creating a product with valid fields, verifying it appears in the list, updating its price, and confirming deletion is rejected when the product has stock.

**Acceptance Scenarios**:

1. **Given** an OWNER token and valid product fields (name, purchasePrice, salePrice), **When** `POST /api/products` is called, **Then** a new product is returned with a UUID and the tenantId matches the token's tenantId.
2. **Given** a product name that already exists for the same tenant, **When** a create or update is attempted with that name, **Then** the system returns 409 Conflict.
3. **Given** a MANAGER or STAFF token, **When** `POST /api/products` is called, **Then** the system returns 403 Forbidden and no product is created.
4. **Given** an existing product with no stock and no historical transaction references, **When** `DELETE /api/products/:id` is called by an OWNER, **Then** the product is removed.
5. **Given** a product with quantity > 0 in at least one location, **When** `DELETE /api/products/:id` is called, **Then** the system returns 409 Conflict listing which locations have stock.

---

### User Story 2 — Browse and Search Products (Priority: P1)

As any authenticated user, I want to browse the product catalog with search and filter options so I can quickly find the items I need.

**Why this priority**: Read access is needed by all roles (MANAGER/STAFF need to look up products when registering sales and purchases).

**Independent Test**: Can be tested by querying the product list with various search terms, category filters, and pagination parameters, verifying only results scoped to the caller's tenant are returned.

**Acceptance Scenarios**:

1. **Given** a valid JWT for any role, **When** `GET /api/products` is called, **Then** a paginated list of products scoped to that tenant is returned with shape `{ data, total, page, limit }`.
2. **Given** a `search=erythropoietin` query param, **When** `GET /api/products` is called, **Then** only products whose name, brand, or category contains that string (case-insensitive) are returned.
3. **Given** a `category=Medicamentos` query param, **When** `GET /api/products` is called, **Then** only products with that exact category are returned.
4. **Given** a `limit=5&page=2` query, **When** `GET /api/products` is called, **Then** the second page of 5 results is returned.
5. **Given** two tenants each with products, **When** Tenant A's user queries the list, **Then** only Tenant A's products are returned.

---

### User Story 3 — View Stock Levels at My Location (Priority: P1)

As a MANAGER or STAFF, I want to see the stock level of every product at my location so I can monitor supply and identify shortfalls before they affect patient care.

**Why this priority**: Operational visibility is critical for clinic managers to prevent stockouts of medical supplies.

**Independent Test**: Can be tested by creating stock records for a location and confirming that a MANAGER token for that location returns exactly those records, with correct alert flags computed.

**Acceptance Scenarios**:

1. **Given** a MANAGER token for location A, **When** `GET /api/stock` is called, **Then** only `LocationStock` rows for location A are returned.
2. **Given** a product with `alertLevel = 5` and `quantity = 3`, **When** the stock is listed, **Then** `isBelowAlert = true` and `effectiveAlertLevel = 5` appear in the row.
3. **Given** a product with `alertLevel = 0` and `product.globalAlert = 10` and `quantity = 7`, **When** the stock is listed, **Then** `effectiveAlertLevel = 10` and `isBelowAlert = true`.
4. **Given** `onlyLowStock=true` query param, **When** `GET /api/stock` is called, **Then** only rows where `isBelowAlert = true` are returned.
5. **Given** a product that exists in the catalog but has no `LocationStock` row for the location, **When** the stock list is retrieved, **Then** that product does NOT appear (it has not been stocked there).

---

### User Story 4 — View Stock Across All Locations (Priority: P2)

As an OWNER or ADMIN, I want to see stock levels across all locations in one view so I can spot shortfalls and redistribute inventory where needed.

**Why this priority**: Multi-location oversight is essential for OWNER/ADMIN to make purchasing decisions, but MANAGER/STAFF don't need this view.

**Independent Test**: Can be tested by creating stock for two different locations under the same tenant, then verifying OWNER's response includes both with `locationName` populated.

**Acceptance Scenarios**:

1. **Given** an ADMIN token and stock records across three locations, **When** `GET /api/stock` is called without `locationId`, **Then** all records from all three locations are returned, each including `locationName`.
2. **Given** `?locationId=<id>` query param, **When** `GET /api/stock` is called by an OWNER, **Then** only records for that location are returned.
3. **Given** `onlyLowStock=true`, **When** `GET /api/stock` is called by OWNER, **Then** only rows where `isBelowAlert = true` across all locations are returned.

---

### User Story 5 — Configure Stock Thresholds per Location (Priority: P2)

As a MANAGER (for their location) or ADMIN/OWNER (any location), I want to set minimum stock and alert thresholds for each product at a location so that the system correctly flags when supplies are running low.

**Why this priority**: Without configurable thresholds, the alert system has no basis. Thresholds vary by location depending on patient volume.

**Independent Test**: Can be tested by upserting a threshold record and then confirming that the `isBelowAlert` flag reflects the new threshold immediately.

**Acceptance Scenarios**:

1. **Given** no existing `LocationStock` row for `(locationId, productId)`, **When** `PUT /api/stock/by-location` is called with valid data, **Then** a new row is created (upsert behavior).
2. **Given** an existing row, **When** `PUT /api/stock/by-location` is called again, **Then** the row is updated, not duplicated.
3. **Given** a MANAGER token for location A, **When** `PUT /api/stock/by-location` is called with `locationId = B`, **Then** the system returns 403 Forbidden.
4. **Given** a `packageQty` override in the payload, **When** the stock row is retrieved, **Then** `effectivePackageQty` equals the override value, not the product's default.

---

### User Story 6 — Manually Adjust Stock Quantity (Priority: P2)

As an OWNER or ADMIN, I want to manually set or adjust the quantity of a product at a location so I can correct counting errors and record initial stock before the full inventory movement system is available.

**Why this priority**: A bridge mechanism is needed so clinics can operate with real stock data before Sprint 19 introduces the full `InventoryMovement` audit trail.

**Independent Test**: Can be tested by setting initial quantity via `PATCH /api/stock/:id/quantity` and verifying the stored quantity matches, including a rejection test when the adjustment would produce a negative result.

**Acceptance Scenarios**:

1. **Given** `adjustmentType: 'SET'` and `quantity: 50`, **When** `PATCH /api/stock/:id/quantity` is called, **Then** the stock quantity is set to exactly 50.
2. **Given** `adjustmentType: 'DELTA'` and `delta: -10` with current quantity 30, **When** the call is made, **Then** quantity becomes 20.
3. **Given** `adjustmentType: 'DELTA'` and `delta: -40` with current quantity 30, **When** the call is made, **Then** the system returns 422 Unprocessable Entity and quantity remains 30.
4. **Given** a MANAGER or STAFF token, **When** `PATCH /api/stock/:id/quantity` is called, **Then** the system returns 403 Forbidden.

---

### User Story 7 — Bulk Initialize Stock for a New Location (Priority: P2)

As an OWNER or ADMIN, I want to initialize stock for many products at a location in a single request so I can onboard a new clinic location quickly without making dozens of individual calls.

**Why this priority**: A new location may need to stock 50-200 products on day one. A bulk endpoint makes this practical.

**Independent Test**: Can be tested by sending a batch of 5 items, verifying created/updated counts, and confirming that one invalid productId in the batch appears in `errors[]` without blocking the valid ones.

**Acceptance Scenarios**:

1. **Given** a batch of 5 valid items, **When** `POST /api/stock/bulk` is called, **Then** the response returns `{ created: 5, updated: 0, errors: [] }`.
2. **Given** a batch containing one item with an unknown `productId`, **When** the batch is processed, **Then** the valid items are upserted and the invalid one appears in `errors[]` with a descriptive message.
3. **Given** a batch of 51 items, **When** the call is made, **Then** the system returns 422 with a validation error (exceeds max 50).

---

### User Story 8 — Get Distinct Category List (Priority: P3)

As any authenticated user, I want to retrieve a list of all distinct product categories for the tenant so that the UI can populate filter dropdowns without needing a separate Category model.

**Why this priority**: This is a convenience endpoint for the frontend that avoids embedding business logic in the UI.

**Independent Test**: Can be tested by creating products with various categories and confirming the endpoint returns all unique, non-null values sorted alphabetically.

**Acceptance Scenarios**:

1. **Given** products with categories `["Medicamentos", "Insumos", "Medicamentos", null]`, **When** `GET /api/products/categories` is called, **Then** the response is `["Insumos", "Medicamentos"]`.

---

### Edge Cases

- What happens when a product has `LocationStock.quantity = 0`? It is a tracked-but-empty state, distinct from "no row exists." A row with quantity 0 appears in stock lists; a missing row does not.
- What happens when both `alertLevel` and `globalAlert` are 0? `isBelowAlert` must be `false` — no threshold has been configured, so there is no alert to trigger.
- What happens when a product is referenced in a closed Sale but has zero current stock? The delete is blocked (historical FK reference), not allowed.
- What happens when two concurrent requests try to create a `LocationStock` row for the same `(locationId, productId)` pair? The unique constraint is enforced by the database; the losing request receives an appropriate error (upsert via Prisma handles this transparently).
- What happens when a `DELTA` adjustment would bring quantity below zero? The system rejects with 422 and returns the current quantity in the error body.
- What happens when `LocationStock.packageQty` is null? The `effectivePackageQty` falls back to `Product.packageQty`.
- What happens when an OWNER/ADMIN calls `GET /api/products/:id` without a `?locationId=` param? The product fields are returned without a `stock` object (no implicit stock lookup).
- What happens when `GET /api/products/categories` is called on a tenant with no products? An empty array is returned, not a 404.
- What happens when the `search` param is an empty string? It is treated as "no filter" and the full list is returned.
- What happens when a MANAGER calls `GET /api/stock` and they have no `locationId` in their JWT? The system returns 400 Bad Request; a MANAGER without a locationId is an invalid user state.
- What happens when bulk-init receives a negative `quantity`? That item is rejected and appears in `errors[]`; valid items are still processed.
- What happens when updating a product's name to its current name? The uniqueness check must exclude the record being updated to avoid a false 409.
- What happens when a product's `salePrice` is 0? It is allowed (gifted or internal items). Only negative values are rejected.
- What happens when deleting a Location that has `LocationStock` rows with `quantity > 0`? The deletion is blocked and the system returns 409 Conflict with a list of products that still have stock and must be relocated or fully consumed before the location can be removed.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST restrict product creation, update, and deletion to OWNER and ADMIN roles; MANAGER and STAFF receive 403 Forbidden.
- **FR-002**: System MUST enforce product name uniqueness per tenant; creating or updating to a duplicate name returns 409 Conflict.
- **FR-003**: System MUST derive `tenantId` from the JWT payload on every request; any `tenantId` field in the request body is rejected by schema validation.
- **FR-004**: System MUST support paginated product listing with `page`, `limit` (max 100), `search` (case-insensitive match on name/brand/category), and `category` (exact match) query params; response shape is `{ data, total, page, limit }`.
- **FR-005**: System MUST block product deletion when any `LocationStock.quantity > 0` exists for the product, returning 409 with a list of affected locations.
- **FR-006**: System MUST block product deletion when any row references the product in `SaleItem`, `PurchaseItem`, `PurchaseOrderItem`, or `InventoryMovementItem`, returning 409 to preserve historical data integrity.
- **FR-007**: System MUST support upsert behavior on `PUT /api/stock/by-location`: create the `LocationStock` row if it does not exist, update it if it does.
- **FR-008**: System MUST automatically scope all stock reads to `user.locationId` for MANAGER and STAFF roles, ignoring any `locationId` query param they supply.
- **FR-009**: System MUST compute and return `effectiveAlertLevel` and `isBelowAlert` in every `LocationStock` response; `effectiveAlertLevel = locationStock.alertLevel > 0 ? locationStock.alertLevel : product.globalAlert`; `isBelowAlert = effectiveAlertLevel > 0 && quantity <= effectiveAlertLevel`.
- **FR-010**: System MUST compute and return `effectivePackageQty` in every `LocationStock` response; `effectivePackageQty = locationStock.packageQty ?? product.packageQty`.
- **FR-011**: System MUST reject manual quantity adjustments that would produce a negative `quantity`, returning 422 with the current quantity in the error body.
- **FR-012**: System MUST restrict manual quantity adjustment (`PATCH /api/stock/:id/quantity`) to OWNER and ADMIN; MANAGER and STAFF receive 403.
- **FR-013**: System MUST provide `GET /api/products/categories` returning a sorted array of distinct, non-null category values for the tenant.
- **FR-014**: System MUST support `POST /api/stock/bulk` accepting up to 50 items; valid items are upserted and invalid items are collected in `errors[]`; the response is `{ created, updated, errors[] }`.
- **FR-015**: System MUST include `tenantId` in every Prisma query for Products and LocationStock as the first line of application-level tenant isolation.
- **FR-017**: Every list endpoint (products, stock, categories excluded) MUST return a paginated response with shape `{ data, total, page, limit }`; `limit` is capped at 100 per request. This applies to all roles and all location scopes to protect against unbounded response sizes.
- **FR-016**: System MUST block deletion of a Location if any of its `LocationStock` rows have `quantity > 0`; the 409 Conflict response MUST list the affected products so the operator knows what must be relocated or consumed first. `LocationStock` rows with `quantity = 0` are removed in cascade when the Location is deleted.
- **FR-018**: System MUST return 404 Not Found when a `locationId` or `productId` supplied in any request does not belong to the caller's tenant, avoiding information leakage about cross-tenant resources.

### Key Entities

- **Product**: Represents an item in the tenant's shared catalog. Has a name (unique per tenant), optional brand/category/description, purchase and sale prices, a default package quantity, and a global alert threshold. Products are never associated with a single location — they are tenant-wide.
- **LocationStock**: Represents the inventory state of a specific product at a specific location. Tracks current quantity, reorder threshold (`minStock`), alert threshold (`alertLevel`), and an optional package quantity override. One record per `(location, product)` pair. Created on first threshold configuration or bulk initialization; absence means the product has never been stocked at that location.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All unit tests for `ProductsService` and `StockService` pass, covering every logical branch (happy path, 403, 404, 409, 422, edge cases), with `pnpm --filter api test` exiting 0.
- **SC-002**: TypeScript compilation passes with zero errors under strict mode (`pnpm check-types` exits 0); no use of `any`, `@ts-ignore`, or untyped Prisma results.
- **SC-003**: ESLint reports zero errors and zero warnings (`pnpm lint` exits 0); all imports use `.js` extensions, no default exports, no unused locals.
- **SC-004**: Role-based access control is verified in both unit and E2E tests: MANAGER/STAFF cannot modify products or quantities; MANAGER can only configure thresholds for their own location; cross-tenant access is not possible.
- **SC-005**: Tenant isolation is airtight — E2E tests with two tenants confirm that no product or stock record from Tenant A is visible to Tenant B.

## Assumptions

- **A-01**: Products do not have a soft-delete or status field in this sprint. A product is either in the catalog or fully deleted (when safe to do so). Discontinuation can be added in a future sprint.
- **A-02**: The `category` field is free-form text — no normalized `Category` model. Distinct values are derived from product records via the `/categories` endpoint.
- **A-03**: The manual quantity adjustment endpoint (`PATCH /api/stock/:id/quantity`) is a bridge mechanism for Sprint 15. In Sprint 19 it will be upgraded — keeping the same external contract — to internally create an `InventoryMovement` record, providing full audit traceability without breaking existing frontend consumers.
- **A-04**: `salePrice` and `purchasePrice` at the product level are informational in this sprint. Actual transaction prices in Sales and Purchases will be captured at the item level (Sprint 19/21).
- **A-05**: Supplier linkage (`SupplierProduct`) exists in the schema but is not managed in this sprint. Sprint 17 handles suppliers.
- **A-06**: Joining `Location` for `locationName` in stock responses for OWNER/ADMIN is done via a service-level lookup, consistent with patterns established in the Companies and Plans modules.
- **A-07**: A new `products.schemas.ts` file is added to `@repo/types`, following the pattern of `companies-plans.schemas.ts`.
- **A-08**: Two NestJS modules are created: `ProductsModule` and `StockModule`. Both are registered in `AppModule`. `StockModule` may import `ProductsModule` for shared service access on the summary endpoint.
- **A-09**: No audit logging (`@Audit()` decorator) is applied to stock or product endpoints in this sprint. Products and stock data are operational, not clinical PHI. Full audit coverage for inventory movements is Sprint 19's responsibility.
- **A-10**: The `GET /api/products/:id` endpoint enriches the response with stock only when a `locationId` context is available (MANAGER/STAFF: automatic; OWNER/ADMIN: via `?locationId=` query param). Without context, only product fields are returned.

## Clarifications

### Session 2026-04-24

- Q: When deleting a Location that has LocationStock rows, what should happen? → A: Block deletion if any product has `quantity > 0`; notify the operator with a list of products that must be relocated or consumed first. LocationStock rows with quantity = 0 are deleted in cascade.
- Q: Should stock list endpoints be paginated even for OWNER/ADMIN querying all locations? → A: Yes, all list endpoints must always be paginated (`{ data, total, page, limit }`, max 100) regardless of role or scope, because data volumes can be large.
- Q: Should `GET /api/stock/summary` (cross-location aggregate per product) also be paginated? → A: Yes, paginated with the same shape and max-100 limit as all other list endpoints.
- Q: When a locationId belongs to a different tenant, what should the system return? → A: 404 Not Found — the location does not exist from the caller's tenant perspective, avoiding information leakage about cross-tenant resources.
- Q: What happens to `PATCH /api/stock/:id/quantity` when Sprint 19 arrives? → A: The endpoint is kept with the same external contract, but Sprint 19 changes its internal implementation to automatically create an `InventoryMovement` record, giving the adjustment full audit traceability without breaking the frontend.
