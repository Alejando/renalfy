# Data Model: Products + Location Stock Backend

**Feature**: 012-products-stock-backend  
**Phase**: 1 — Design  
**Date**: 2026-04-24

## Entities

### Product

Represents an item in the tenant-wide product catalog. Products are shared across all locations; stock levels are tracked per location via `LocationStock`.

| Field | Type | Nullable | Default | Constraints |
|---|---|---|---|---|
| `id` | UUID | No | auto | PK |
| `tenantId` | UUID | No | — | From JWT; RLS enforced |
| `name` | String | No | — | Min 1 char; unique per `tenantId` |
| `brand` | String | Yes | null | Free text |
| `category` | String | Yes | null | Free text; distinct values exposed via `/categories` |
| `description` | String | Yes | null | Free text |
| `purchasePrice` | Decimal(10,2) | No | — | `>= 0` |
| `salePrice` | Decimal(10,2) | No | — | `>= 0` (0 allowed for gifts/internal) |
| `packageQty` | Int | No | 1 | `>= 1`; default package size |
| `globalAlert` | Int | No | 0 | `>= 0`; 0 = no global threshold |
| `createdAt` | DateTime | No | now() | Auto |
| `updatedAt` | DateTime | No | auto | Auto |

**Relations**:
- `locationStocks: LocationStock[]` — one product → many stock records (one per location that stocks it)
- `supplierLinks: SupplierProduct[]` — out of scope for Sprint 15 (Sprint 17)

**Business rules**:
- `name` unique constraint scoped to `tenantId` (not global)
- Hard delete only; no soft-delete field in Sprint 15
- Deletion blocked if any `LocationStock.quantity > 0` OR any reference in `SaleItem`, `PurchaseItem`, `PurchaseOrderItem`, `InventoryMovementItem`
- `salePrice = 0` is valid (gifted/internal items); negative values are rejected

---

### LocationStock

Represents the inventory state of a specific product at a specific location. Absence of a row means the product has never been stocked at that location (not the same as quantity = 0).

| Field | Type | Nullable | Default | Constraints |
|---|---|---|---|---|
| `id` | UUID | No | auto | PK |
| `tenantId` | UUID | No | — | From JWT; RLS enforced |
| `locationId` | UUID | No | — | FK → `Location.id`; must belong to same tenant |
| `productId` | UUID | No | — | FK → `Product.id`; must belong to same tenant |
| `quantity` | Int | No | 0 | `>= 0` enforced by application |
| `minStock` | Int | No | 0 | `>= 0`; reorder suggestion threshold |
| `alertLevel` | Int | No | 0 | `>= 0`; 0 = use `Product.globalAlert` |
| `packageQty` | Int | Yes | null | null = use `Product.packageQty` |

**Unique constraint**: `@@unique([locationId, productId])` — one record per (location, product) pair.

**Relations**:
- `product: Product` — parent product record (joined for `name`, `brand`, `category`, `globalAlert`, `packageQty`)

**Business rules**:
- Created on first `PUT /api/stock/by-location` call (upsert) or via `POST /api/stock/bulk`
- `quantity` managed by: manual adjustment (Sprint 15), `InventoryMovement` (Sprint 19), `Purchase` receipt (Sprint 19), `Sale` (Sprint 21)
- Deletion of a `LocationStock` row is not a standalone operation — rows are removed when the parent `Location` is deleted (only if `quantity = 0`)

---

## Computed Fields (returned in responses, not stored)

These fields are derived in the service layer and included in every `LocationStock` response:

| Field | Formula | Type |
|---|---|---|
| `effectiveAlertLevel` | `alertLevel > 0 ? alertLevel : product.globalAlert` | `number` |
| `isBelowAlert` | `effectiveAlertLevel > 0 && quantity <= effectiveAlertLevel` | `boolean` |
| `effectivePackageQty` | `packageQty ?? product.packageQty` | `number` |
| `productName` | `product.name` | `string` |
| `productBrand` | `product.brand` | `string \| null` |
| `productCategory` | `product.category` | `string \| null` |
| `locationName` | `location.name` (OWNER/ADMIN paths only) | `string \| null` |

---

## State Transitions

### Product lifecycle

```
[Created] → [Updated] → [Deleted]
              ↑               ↑
          (catalog changes) (only when: quantity=0 everywhere AND no historical references)
```

### LocationStock quantity lifecycle (Sprint 15 bridge)

```
[No row] → [Row created via upsert/bulk, quantity=0]
                        ↓
              [Manual SET adjustment] → quantity = N
              [Manual DELTA adjustment] → quantity ± delta (must remain >= 0)
```

In Sprint 19, the quantity transition will be backed by `InventoryMovement` records.

---

## Cross-Entity Constraints

| Constraint | Description |
|---|---|
| Product → LocationStock | Delete blocked if any `LocationStock.quantity > 0` |
| Product → SaleItem | Delete blocked if any reference exists (even with quantity = 0) |
| Product → PurchaseItem | Same as above |
| Product → PurchaseOrderItem | Same as above |
| Product → InventoryMovementItem | Same as above |
| Location → LocationStock | Delete blocked if any `LocationStock.quantity > 0`; rows with `quantity = 0` removed in cascade |
| LocationStock.locationId | Must belong to the same tenant as the caller |
| LocationStock.productId | Must belong to the same tenant as the caller |

---

## Indexes (recommended)

| Table | Index | Purpose |
|---|---|---|
| `Product` | `(tenantId, name)` | Uniqueness check + search by name |
| `Product` | `(tenantId, category)` | Category filter |
| `LocationStock` | `(locationId, productId)` | Unique constraint (already in schema) |
| `LocationStock` | `(tenantId, locationId)` | MANAGER/STAFF scoped queries |

---

## Schema Changes Required

The `Product` and `LocationStock` models already exist in `apps/api/prisma/schema.prisma`. No schema migration is needed for Sprint 15. The existing schema has all required fields.

**Verification**: Confirmed by reading `schema.prisma` — both models are present with all fields listed above.

---

## `@repo/types` Schemas Overview

New file: `packages/types/src/products.schemas.ts`

### Product schemas
- `CreateProductSchema` — name, brand?, category?, description?, purchasePrice, salePrice, packageQty?, globalAlert?
- `UpdateProductSchema` — all fields optional
- `ProductQuerySchema` — page, limit, search?, category?, sortBy?, sortOrder?
- `ProductResponseSchema` — full product fields
- `PaginatedProductsResponseSchema` — `{ data, total, page, limit }`

### LocationStock schemas
- `UpsertLocationStockSchema` — locationId, productId, minStock?, alertLevel?, packageQty?
- `StockQuantityAdjustmentSchema` — adjustmentType ('SET' | 'DELTA'), quantity? (for SET), delta? (for DELTA)
- `StockQuerySchema` — page, limit, locationId?, onlyLowStock?, search?
- `LocationStockResponseSchema` — all stored fields + computed fields
- `PaginatedStockResponseSchema` — `{ data, total, page, limit }`
- `BulkStockItemSchema` — productId, locationId, quantity, minStock?, alertLevel?
- `BulkStockRequestSchema` — `z.array(BulkStockItemSchema).max(50)`
- `BulkStockResponseSchema` — `{ created, updated, errors[] }`
- `StockSummaryItemSchema` — productId, productName, totalQuantity, locationBreakdown[], isAnyLocationBelowAlert
- `PaginatedStockSummaryResponseSchema` — `{ data, total, page, limit }`
