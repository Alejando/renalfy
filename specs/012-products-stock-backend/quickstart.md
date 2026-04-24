# Quickstart: Products + Location Stock Backend

**Feature**: 012-products-stock-backend  
**Date**: 2026-04-24

## Prerequisites

- Docker running with PostgreSQL on port 5432: `docker-compose up -d`
- API running: `pnpm dev` (api on `:3019`)
- A valid JWT for an OWNER user (obtain via `POST /api/auth/login`)
- A `locationId` from an existing Location in the same tenant

## 1. Create a Product

```bash
curl -X POST http://localhost:3019/api/products \
  -H "Authorization: Bearer <OWNER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Eritropoyetina 4000 UI",
    "brand": "Eprex",
    "category": "Medicamentos",
    "purchasePrice": 450.00,
    "salePrice": 520.00,
    "packageQty": 1,
    "globalAlert": 10
  }'
# → 201 with product UUID
```

## 2. List Products

```bash
curl "http://localhost:3019/api/products?search=eritro&limit=10" \
  -H "Authorization: Bearer <TOKEN>"
# → { data: [...], total: 1, page: 1, limit: 10 }
```

## 3. Get Category List

```bash
curl "http://localhost:3019/api/products/categories" \
  -H "Authorization: Bearer <TOKEN>"
# → ["Insumos", "Medicamentos"]
```

## 4. Initialize Stock for a Location

```bash
curl -X PUT http://localhost:3019/api/stock/by-location \
  -H "Authorization: Bearer <OWNER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "locationId": "<LOCATION_UUID>",
    "productId": "<PRODUCT_UUID>",
    "minStock": 5,
    "alertLevel": 8
  }'
# → LocationStockResponse with effectiveAlertLevel, isBelowAlert, effectivePackageQty
```

## 5. Manually Set Stock Quantity

```bash
curl -X PATCH http://localhost:3019/api/stock/<STOCK_UUID>/quantity \
  -H "Authorization: Bearer <OWNER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{ "adjustmentType": "SET", "quantity": 50 }'
# → Updated LocationStockResponse
```

## 6. Bulk Initialize Stock

```bash
curl -X POST http://localhost:3019/api/stock/bulk \
  -H "Authorization: Bearer <OWNER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      { "locationId": "<LOC>", "productId": "<PROD1>", "quantity": 50 },
      { "locationId": "<LOC>", "productId": "<PROD2>", "quantity": 30, "minStock": 5 }
    ]
  }'
# → { created: 2, updated: 0, errors: [] }
```

## 7. View Low Stock (as MANAGER)

```bash
curl "http://localhost:3019/api/stock?onlyLowStock=true" \
  -H "Authorization: Bearer <MANAGER_TOKEN>"
# → Only rows where isBelowAlert = true for the MANAGER's location
```

## 8. View Cross-Location Summary (as OWNER)

```bash
curl "http://localhost:3019/api/stock/summary?isAnyLocationBelowAlert=true" \
  -H "Authorization: Bearer <OWNER_TOKEN>"
# → Per-product totals across all locations
```

## Running Tests

```bash
# Unit tests only
pnpm --filter api test

# E2E tests (requires running DB)
pnpm --filter api test:e2e

# Watch mode during development
pnpm --filter api test:watch

# Full verification before PR
pnpm lint && pnpm check-types && pnpm --filter api test
```

## Source Structure

```
packages/types/src/
└── products.schemas.ts          ← NEW: all Zod schemas + types

apps/api/src/
├── products/
│   ├── products.module.ts       ← NEW
│   ├── products.controller.ts   ← NEW
│   ├── products.service.ts      ← NEW
│   ├── products.service.spec.ts ← NEW
│   └── dto/
│       ├── create-product.dto.ts
│       ├── update-product.dto.ts
│       └── product-query.dto.ts
├── stock/
│   ├── stock.module.ts          ← NEW
│   ├── stock.controller.ts      ← NEW
│   ├── stock.service.ts         ← NEW
│   ├── stock.service.spec.ts    ← NEW
│   └── dto/
│       ├── upsert-location-stock.dto.ts
│       ├── stock-quantity-adjustment.dto.ts
│       ├── stock-query.dto.ts
│       └── bulk-stock.dto.ts
├── locations/
│   └── locations.service.ts     ← MODIFIED: add stock guard in remove()
└── app.module.ts                ← MODIFIED: register ProductsModule, StockModule

apps/api/test/
└── products-stock.e2e-spec.ts   ← NEW
```
