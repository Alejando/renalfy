# API Contracts: Products + Location Stock Backend

**Feature**: 012-products-stock-backend  
**Base prefix**: `/api`  
**Auth**: All endpoints require `Authorization: Bearer <access_token>` (JwtAuthGuard)

---

## Products Module — `/api/products`

### POST /api/products
Create a product in the tenant catalog.

**Roles**: OWNER, ADMIN  
**Status**: 201 Created

**Request body**:
```json
{
  "name": "Eritropoyetina 4000 UI",
  "brand": "Eprex",
  "category": "Medicamentos",
  "description": "Ampolleta subcutánea",
  "purchasePrice": 450.00,
  "salePrice": 520.00,
  "packageQty": 1,
  "globalAlert": 10
}
```

**Response**:
```json
{
  "id": "uuid",
  "tenantId": "uuid",
  "name": "Eritropoyetina 4000 UI",
  "brand": "Eprex",
  "category": "Medicamentos",
  "description": "Ampolleta subcutánea",
  "purchasePrice": "450.00",
  "salePrice": "520.00",
  "packageQty": 1,
  "globalAlert": 10,
  "createdAt": "2026-04-24T00:00:00.000Z",
  "updatedAt": "2026-04-24T00:00:00.000Z"
}
```

**Errors**:
- `403` — caller is MANAGER or STAFF
- `409` — name already exists for this tenant

---

### GET /api/products
List products with pagination, search, and category filter.

**Roles**: All  
**Query params**:

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Max 100 |
| `search` | string | — | Case-insensitive match on name, brand, or category |
| `category` | string | — | Exact match on category |
| `sortBy` | `name\|purchasePrice\|salePrice` | `name` | Sort field |
| `sortOrder` | `asc\|desc` | `asc` | Sort direction |

**Response**:
```json
{
  "data": [ /* ProductResponse[] */ ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

---

### GET /api/products/categories
Get distinct category values for the tenant (for filter dropdowns).

**Roles**: All  
**Response**:
```json
["Insumos", "Medicamentos", "Reactivos"]
```

**Note**: This route must be declared before `GET /api/products/:id` in the controller.

---

### GET /api/products/:id
Get a single product. Optionally enriched with location stock.

**Roles**: All  
**Query params**:

| Param | Type | Description |
|---|---|---|
| `locationId` | UUID | OWNER/ADMIN only — include stock for this location |

**Response** (without locationId context):
```json
{
  "id": "uuid",
  "name": "Eritropoyetina 4000 UI",
  /* ...all product fields... */
  "stock": null
}
```

**Response** (with locationId or for MANAGER/STAFF — stock auto-injected):
```json
{
  "id": "uuid",
  "name": "Eritropoyetina 4000 UI",
  /* ...all product fields... */
  "stock": {
    "id": "uuid",
    "quantity": 15,
    "minStock": 5,
    "alertLevel": 8,
    "packageQty": null,
    "effectiveAlertLevel": 8,
    "isBelowAlert": false,
    "effectivePackageQty": 1
  }
}
```

**Errors**:
- `404` — product not found for this tenant

---

### PATCH /api/products/:id
Update product catalog fields.

**Roles**: OWNER, ADMIN  
**Request body**: Any subset of product fields (all optional)

**Errors**:
- `403` — caller is MANAGER or STAFF
- `404` — product not found
- `409` — new name conflicts with existing product

---

### DELETE /api/products/:id
Delete a product from the catalog.

**Roles**: OWNER, ADMIN  
**Status**: 204 No Content

**Errors**:
- `403` — caller is MANAGER or STAFF
- `404` — product not found
- `409` — product has stock or historical references:
  ```json
  {
    "statusCode": 409,
    "message": "Cannot delete product: stock exists in locations",
    "locations": ["Sucursal Norte", "Sucursal Sur"]
  }
  ```

---

## Stock Module — `/api/stock`

### GET /api/stock
List stock records. Auto-scoped by role.

**Roles**: All  
**Query params**:

| Param | Type | Description |
|---|---|---|
| `page` | integer | Default 1 |
| `limit` | integer | Default 20, max 100 |
| `locationId` | UUID | OWNER/ADMIN only — filter by location |
| `onlyLowStock` | boolean | Return only rows where `isBelowAlert = true` |
| `search` | string | Case-insensitive match on product name, brand, category |

**Behavior by role**:
- `MANAGER` / `STAFF`: `locationId` always = `user.locationId` (query param ignored)
- `OWNER` / `ADMIN`: all locations unless `?locationId=` provided

**Response**:
```json
{
  "data": [
    {
      "id": "uuid",
      "tenantId": "uuid",
      "locationId": "uuid",
      "locationName": "Sucursal Norte",
      "productId": "uuid",
      "productName": "Eritropoyetina 4000 UI",
      "productBrand": "Eprex",
      "productCategory": "Medicamentos",
      "quantity": 3,
      "minStock": 5,
      "alertLevel": 8,
      "packageQty": null,
      "effectiveAlertLevel": 8,
      "isBelowAlert": true,
      "effectivePackageQty": 1
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

Note: `locationName` is included for OWNER/ADMIN responses. For MANAGER/STAFF it is omitted (they always know their location).

---

### GET /api/stock/:id
Get a single LocationStock row.

**Roles**: All (MANAGER/STAFF: must belong to their locationId)

**Errors**:
- `404` — row not found or belongs to different tenant/location

---

### PUT /api/stock/by-location
Upsert stock thresholds for a (locationId, productId) pair.

**Roles**: OWNER, ADMIN, MANAGER (own location only)  
**Request body**:
```json
{
  "locationId": "uuid",
  "productId": "uuid",
  "minStock": 5,
  "alertLevel": 8,
  "packageQty": null
}
```

**Response**: Updated `LocationStockResponse`

**Errors**:
- `403` — MANAGER attempts to set thresholds for a different location
- `404` — locationId or productId not found in this tenant

---

### PATCH /api/stock/:id/quantity
Manually adjust quantity (bridge until Sprint 19).

**Roles**: OWNER, ADMIN  
**Request body** (SET):
```json
{ "adjustmentType": "SET", "quantity": 50 }
```

**Request body** (DELTA):
```json
{ "adjustmentType": "DELTA", "delta": -10 }
```

**Response**: Updated `LocationStockResponse`

**Errors**:
- `403` — caller is MANAGER or STAFF
- `404` — row not found
- `422` — resulting quantity would be negative:
  ```json
  {
    "statusCode": 422,
    "message": "Adjustment would result in negative stock",
    "currentQuantity": 30
  }
  ```

---

### POST /api/stock/bulk
Bulk initialize or update stock for multiple (locationId, productId) pairs.

**Roles**: OWNER, ADMIN  
**Request body**:
```json
{
  "items": [
    { "locationId": "uuid", "productId": "uuid", "quantity": 50, "minStock": 5, "alertLevel": 8 },
    { "locationId": "uuid", "productId": "uuid-2", "quantity": 30 }
  ]
}
```

Max 50 items per request.

**Response**:
```json
{
  "created": 1,
  "updated": 1,
  "errors": [
    { "index": 2, "productId": "unknown-uuid", "message": "Product not found for this tenant" }
  ]
}
```

**Errors**:
- `403` — caller is MANAGER or STAFF
- `422` — array exceeds 50 items

---

### GET /api/stock/summary
Per-product stock summary across all locations (paginated).

**Roles**: OWNER, ADMIN  
**Query params**: `page`, `limit` (max 100), `isAnyLocationBelowAlert` (boolean filter)

**Response**:
```json
{
  "data": [
    {
      "productId": "uuid",
      "productName": "Eritropoyetina 4000 UI",
      "totalQuantity": 45,
      "isAnyLocationBelowAlert": true,
      "locationBreakdown": [
        { "locationId": "uuid", "locationName": "Sucursal Norte", "quantity": 3, "isBelowAlert": true },
        { "locationId": "uuid-2", "locationName": "Sucursal Sur", "quantity": 42, "isBelowAlert": false }
      ]
    }
  ],
  "total": 10,
  "page": 1,
  "limit": 20
}
```

---

## Location Module — `/api/locations` (modification)

### DELETE /api/locations/:id (modified)
Existing endpoint. Sprint 15 adds a guard that blocks deletion when `LocationStock.quantity > 0`.

**New error**:
- `409` — location has products with stock:
  ```json
  {
    "statusCode": 409,
    "message": "Cannot delete location: products with stock must be relocated first",
    "products": [
      { "productId": "uuid", "productName": "Eritropoyetina 4000 UI", "quantity": 15 }
    ]
  }
  ```

---

## Error Response Convention

All error responses follow the existing NestJS format:
```json
{
  "statusCode": 4xx,
  "message": "Human-readable description"
}
```

Extended errors (409 with detail) add domain-specific fields (`locations`, `products`) at the top level of the response object.
