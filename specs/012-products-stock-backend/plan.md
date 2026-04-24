# Implementation Plan: Products + Location Stock Backend

**Branch**: `012-products-stock-backend` | **Date**: 2026-04-24 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/012-products-stock-backend/spec.md`

## Summary

Build the NestJS backend for Sprint 15: a tenant-wide **product catalog** (CRUD with role guards) and per-location **stock management** (threshold configuration, manual quantity adjustment, bulk initialization, cross-location summary). No schema migration required — `Product` and `LocationStock` models already exist in Prisma. The implementation follows the established Companies/Plans module pattern, with `@repo/types` schemas created first.

---

## Technical Context

**Language/Version**: TypeScript / Node.js 25  
**Primary Dependencies**: NestJS (latest), Prisma 7, nestjs-zod, `@repo/types` (Zod schemas)  
**Storage**: PostgreSQL 16 with RLS — `Product`, `LocationStock` tables already exist  
**Testing**: Jest (unit), Jest E2E via `apps/api/test/` (integration against real DB)  
**Target Platform**: Linux server (Render) / local Docker  
**Project Type**: REST web service (NestJS monorepo module)  
**Performance Goals**: Paginated list responses; all list endpoints cap at 100 items/page  
**Constraints**: `tenantId` always from JWT; `locationId` auto-scoped for MANAGER/STAFF; no `any` in TypeScript  
**Scale/Scope**: Multi-tenant; MANAGER/STAFF see only their location; OWNER/ADMIN see all locations

---

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| I. Multi-Tenant by Design | PASS | Every query includes `tenantId` from JWT; RLS enforced via `TenantInterceptor`; `locationId` scoped for MANAGER/STAFF in service layer |
| II. Schema-First | PASS | `products.schemas.ts` in `@repo/types` created before any backend code |
| III. Test-First | PASS | Unit `.spec.ts` + E2E tests written before service implementation |
| IV. Regulatory Compliance | PASS | Products/stock are operational data, not clinical PHI — no `@Audit()` required; no `PatientConsent` involved |
| V. Security First | PASS | 404 for cross-tenant resource access; role guards on all write endpoints; MANAGER cannot adjust quantities |
| VI. Simplicity | PASS | Two focused modules (ProductsModule, StockModule); functions ≤10 lines; no premature abstraction |

---

## Project Structure

### Documentation (this feature)

```text
specs/012-products-stock-backend/
├── plan.md              ← This file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   └── api-endpoints.md ← Phase 1 output
└── tasks.md             ← Phase 2 output (/speckit.tasks — not yet created)
```

### Source Code

```text
packages/types/src/
└── products.schemas.ts          NEW — Zod schemas + inferred types for Product & LocationStock

apps/api/src/
├── products/
│   ├── products.module.ts       NEW
│   ├── products.controller.ts   NEW
│   ├── products.service.ts      NEW
│   ├── products.service.spec.ts NEW
│   └── dto/
│       ├── create-product.dto.ts
│       ├── update-product.dto.ts
│       └── product-query.dto.ts
├── stock/
│   ├── stock.module.ts          NEW
│   ├── stock.controller.ts      NEW
│   ├── stock.service.ts         NEW
│   ├── stock.service.spec.ts    NEW
│   └── dto/
│       ├── upsert-location-stock.dto.ts
│       ├── stock-quantity-adjustment.dto.ts
│       ├── stock-query.dto.ts
│       └── bulk-stock.dto.ts
├── locations/
│   └── locations.service.ts     MODIFIED — add stock guard in remove()
└── app.module.ts                MODIFIED — register ProductsModule, StockModule

apps/api/test/
└── products-stock.e2e-spec.ts   NEW
```

---

## Implementation Phases

### Phase A — Schemas in @repo/types (prerequisite for everything else)

Create `packages/types/src/products.schemas.ts` with all Zod schemas and inferred types. Export from `packages/types/src/index.ts`.

**Product schemas**:
- `CreateProductSchema` — name (min 1), purchasePrice (≥0), salePrice (≥0), packageQty (≥1, default 1), globalAlert (≥0, default 0), brand?, category?, description?
- `UpdateProductSchema` — all fields optional
- `ProductQuerySchema` — page (coerce, default 1), limit (coerce, max 100, default 20), search?, category?, sortBy (enum: name|purchasePrice|salePrice, default name), sortOrder (enum: asc|desc, default asc)
- `ProductResponseSchema` — all fields including Decimal as string (Prisma returns Decimal as string)
- `PaginatedProductsResponseSchema` — `{ data: ProductResponse[], total, page, limit }`

**LocationStock schemas**:
- `UpsertLocationStockSchema` — locationId (uuid), productId (uuid), minStock (≥0, default 0)?, alertLevel (≥0, default 0)?, packageQty (≥1, nullable)?
- `StockQuantityAdjustmentSchema` — discriminated union: `{ adjustmentType: 'SET', quantity: number (≥0) }` | `{ adjustmentType: 'DELTA', delta: number (non-zero) }`
- `StockQuerySchema` — page, limit (max 100), locationId (uuid)?, onlyLowStock (boolean, default false)?, search?
- `LocationStockResponseSchema` — stored fields + computed: effectiveAlertLevel, isBelowAlert, effectivePackageQty, productName, productBrand, productCategory, locationName (nullable)
- `PaginatedStockResponseSchema`
- `BulkStockItemSchema` — locationId (uuid), productId (uuid), quantity (≥0), minStock?, alertLevel?
- `BulkStockRequestSchema` — `{ items: z.array(BulkStockItemSchema).min(1).max(50) }`
- `BulkStockResponseSchema` — `{ created: number, updated: number, errors: Array<{ index, productId, message }> }`
- `StockSummaryItemSchema` — productId, productName, totalQuantity, isAnyLocationBelowAlert, locationBreakdown[]
- `PaginatedStockSummaryResponseSchema`

---

### Phase B — ProductsModule (TDD: Red → Green → Refactor)

#### B1 — DTOs

Thin wrapper files in `apps/api/src/products/dto/`:
```ts
// create-product.dto.ts
import { createZodDto } from 'nestjs-zod';
import { CreateProductSchema } from '@repo/types';
export class CreateProductDto extends createZodDto(CreateProductSchema) {}
```
Same pattern for `UpdateProductDto`, `ProductQueryDto`.

#### B2 — ProductsService (test-first)

Write `products.service.spec.ts` first with failing tests covering:

| Method | Tests |
|---|---|
| `create()` | happy path; duplicate name → 409; MANAGER/STAFF → 403 |
| `findAll()` | returns paginated; search filters; category filter; tenant isolation |
| `findOne()` | found; not found → 404; with locationId enrichment; without enrichment |
| `findCategories()` | distinct non-null values sorted; empty tenant → [] |
| `update()` | happy path; name conflict (excluding self) → 409; not found → 404; 403 |
| `remove()` | happy path; has stock → 409 with locations; has historical ref → 409; 403 |

Then implement `ProductsService`:

```ts
type PrismaProduct = { id: string; tenantId: string; name: string; ... };

function buildProductResponse(p: PrismaProduct): ProductResponse { ... }
function assertOwnerAdmin(role: UserRole): void { ... }

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto, tenantId: string, role: UserRole): Promise<ProductResponse> { ... }
  async findAll(tenantId: string, query: ProductQuery): Promise<PaginatedProductsResponse> { ... }
  async findOne(id: string, tenantId: string, locationId?: string): Promise<ProductResponse & { stock: ... }> { ... }
  async findCategories(tenantId: string): Promise<string[]> { ... }
  async update(id: string, dto: UpdateProductDto, tenantId: string, role: UserRole): Promise<ProductResponse> { ... }
  async remove(id: string, tenantId: string, role: UserRole): Promise<void> { ... }
}
```

Key business rules in `remove()`:
1. Check `OWNER/ADMIN` role
2. Verify product exists for tenant (404 if not)
3. Check `locationStock.findMany({ where: { productId, quantity: { gt: 0 } } })` → 409 with location names
4. Check counts in `saleItem`, `purchaseItem`, `purchaseOrderItem`, `inventoryMovementItem` → 409 if any
5. Execute `product.delete()`

#### B3 — ProductsController

```ts
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  @Post()              @Roles('OWNER', 'ADMIN')   create(...)
  @Get()                                           findAll(...)
  @Get('categories')                               findCategories(...)   // BEFORE :id
  @Get(':id')                                      findOne(...)
  @Patch(':id')        @Roles('OWNER', 'ADMIN')   update(...)
  @Delete(':id')       @Roles('OWNER', 'ADMIN')   remove(...)
}
```

#### B4 — ProductsModule

```ts
@Module({
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
```

---

### Phase C — StockModule (TDD: Red → Green → Refactor)

#### C1 — DTOs

```
dto/upsert-location-stock.dto.ts   → createZodDto(UpsertLocationStockSchema)
dto/stock-quantity-adjustment.dto.ts → createZodDto(StockQuantityAdjustmentSchema)
dto/stock-query.dto.ts             → createZodDto(StockQuerySchema)
dto/bulk-stock.dto.ts              → createZodDto(BulkStockRequestSchema)
```

#### C2 — StockService (test-first)

Write `stock.service.spec.ts` first with failing tests covering:

| Method | Tests |
|---|---|
| `findAll()` | MANAGER auto-scoped to locationId; OWNER sees all; locationId filter; onlyLowStock filter; search filter; pagination |
| `findOne()` | found; 404; MANAGER trying other location → 404 |
| `upsertByLocation()` | create new row; update existing; MANAGER own location; MANAGER other location → 403; invalid productId → 404; invalid locationId → 404 |
| `adjustQuantity()` | SET to 50; DELTA +10; DELTA -10; DELTA that produces negative → 422 with currentQuantity; MANAGER/STAFF → 403 |
| `bulkInit()` | all valid → created count; one invalid productId → errors[]; partial success; exceeds 50 → validation catches it |
| `getSummary()` | aggregated totals; isAnyLocationBelowAlert filter; pagination |
| `hasStockInLocation()` | true when quantity > 0; false when all zero; false when no rows |

Then implement `StockService`:

```ts
type PrismaLocationStock = { id: string; tenantId: string; locationId: string; productId: string; quantity: number; ... };

function buildLocationStockResponse(row: PrismaLocationStock, product: PrismaProduct, locationName?: string): LocationStockResponse {
  const effectiveAlertLevel = row.alertLevel > 0 ? row.alertLevel : product.globalAlert;
  return {
    ...row,
    effectiveAlertLevel,
    isBelowAlert: effectiveAlertLevel > 0 && row.quantity <= effectiveAlertLevel,
    effectivePackageQty: row.packageQty ?? product.packageQty,
    productName: product.name,
    productBrand: product.brand,
    productCategory: product.category,
    locationName: locationName ?? null,
  };
}

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, role: UserRole, userLocationId: string | null, query: StockQuery): Promise<PaginatedStockResponse> { ... }
  async findOne(id: string, tenantId: string, role: UserRole, userLocationId: string | null): Promise<LocationStockResponse> { ... }
  async upsertByLocation(dto: UpsertLocationStockDto, tenantId: string, role: UserRole, userLocationId: string | null): Promise<LocationStockResponse> { ... }
  async adjustQuantity(id: string, dto: StockQuantityAdjustmentDto, tenantId: string, role: UserRole): Promise<LocationStockResponse> { ... }
  async bulkInit(dto: BulkStockRequestDto, tenantId: string, role: UserRole): Promise<BulkStockResponse> { ... }
  async getSummary(tenantId: string, query: StockSummaryQuery): Promise<PaginatedStockSummaryResponse> { ... }
  async hasStockInLocation(locationId: string, tenantId: string): Promise<{ hasStock: boolean; products: Array<{ productId: string; productName: string; quantity: number }> }> { ... }
}
```

**Role scoping in `findAll()`**:
```ts
const scopedLocationId = ['MANAGER', 'STAFF'].includes(role) ? userLocationId : query.locationId;
const where = {
  tenantId,
  ...(scopedLocationId ? { locationId: scopedLocationId } : {}),
  // onlyLowStock filter applied post-query (computed field) or via raw query
};
```

**`adjustQuantity()` logic**:
```ts
assertOwnerAdmin(role);
const row = await this.prisma.locationStock.findFirst({ where: { id, tenantId } });
if (!row) throw new NotFoundException(...);
const newQuantity = dto.adjustmentType === 'SET' ? dto.quantity : row.quantity + dto.delta;
if (newQuantity < 0) throw new UnprocessableEntityException({ message: '...', currentQuantity: row.quantity });
await this.prisma.locationStock.update({ where: { id }, data: { quantity: newQuantity } });
```

#### C3 — StockController

```ts
@UseGuards(JwtAuthGuard)
@Controller('stock')
export class StockController {
  @Get('summary')                    @Roles('OWNER', 'ADMIN')   getSummary(...)   // BEFORE :id
  @Get()                                                         findAll(...)
  @Get(':id')                                                    findOne(...)
  @Put('by-location')                                            upsertByLocation(...)
  @Patch(':id/quantity')             @Roles('OWNER', 'ADMIN')   adjustQuantity(...)
  @Post('bulk')                      @Roles('OWNER', 'ADMIN')   bulkInit(...)
}
```

#### C4 — StockModule

```ts
@Module({
  controllers: [StockController],
  providers: [StockService],
  exports: [StockService],
})
export class StockModule {}
```

---

### Phase D — Location Deletion Guard (modification)

Update `apps/api/src/locations/locations.service.ts`:

1. Import `StockService` (injected via constructor — `LocationsModule` imports `StockModule`)
2. In `remove(id, tenantId, role)`:
   ```ts
   const stockCheck = await this.stockService.hasStockInLocation(id, tenantId);
   if (stockCheck.hasStock) {
     throw new ConflictException({
       message: 'Cannot delete location: products with stock must be relocated first',
       products: stockCheck.products,
     });
   }
   // Delete LocationStock rows with quantity = 0 before deleting location
   await this.prisma.locationStock.deleteMany({ where: { locationId: id, tenantId, quantity: 0 } });
   await this.prisma.location.delete({ where: { id } });
   ```
3. Update `LocationsModule` to import `StockModule`

Write unit test for this guard in `locations.service.spec.ts` (add to existing spec):
- Given location has stock > 0 → 409 with products list
- Given location has no stock → delete succeeds
- Given location has only quantity = 0 rows → delete succeeds, rows removed

---

### Phase E — AppModule Registration

Add to `apps/api/src/app.module.ts`:
```ts
import { ProductsModule } from './products/products.module.js';
import { StockModule } from './stock/stock.module.js';

@Module({
  imports: [
    // ...existing...
    ProductsModule,
    StockModule,
  ],
})
export class AppModule {}
```

---

### Phase F — E2E Tests

Create `apps/api/test/products-stock.e2e-spec.ts` covering:

**Products E2E**:
- `POST /api/products` — OWNER creates; MANAGER gets 403; duplicate name gets 409
- `GET /api/products` — pagination, search, category filter, tenant isolation (two tenants)
- `GET /api/products/categories` — distinct values
- `PATCH /api/products/:id` — update; name conflict; 404
- `DELETE /api/products/:id` — success; blocked by stock; blocked by historical reference

**Stock E2E**:
- `PUT /api/stock/by-location` — create; update; MANAGER for own location; MANAGER for other location gets 403
- `PATCH /api/stock/:id/quantity` — SET; DELTA; negative DELTA gets 422; MANAGER gets 403
- `GET /api/stock` — MANAGER sees only their location; OWNER sees all; onlyLowStock filter
- `POST /api/stock/bulk` — all valid; partial errors; exceeds 50 items
- `GET /api/stock/summary` — cross-location totals; isAnyLocationBelowAlert filter

**Location deletion guard E2E**:
- `DELETE /api/locations/:id` — blocked when stock > 0; succeeds when stock = 0

---

## Definition of Done

Before closing this sprint, all three must pass:

```bash
pnpm lint          # zero errors, zero warnings
pnpm check-types   # zero TypeScript errors
pnpm --filter api test          # all unit tests green
pnpm --filter api test:e2e      # all E2E tests green
```

---

## Complexity Tracking

No constitution violations. All implementation choices follow established patterns without introducing new abstractions beyond what the feature requires.
