# API Contract — Inventory Movements Endpoints

**Feature**: Sprint 20 — Frontend UI for Purchases & Inventory Movements  
**Date**: 2026-04-28  
**Endpoints**: 2 (list, detail)

---

## GET /api/inventory-movements — List Inventory Movements

**Purpose**: Fetch paginated list of inventory movements (IN/OUT) with optional filters.

**Access**: `@UseGuards(JwtAuthGuard)` — any authenticated user  
**RLS Scope**: Backend filters by `tenantId` from JWT; `MANAGER`/`STAFF` see only their location

### Request

```
GET /api/inventory-movements?page=1&limit=20&type=IN&productId=uuid&dateFrom=2026-04-01&dateTo=2026-04-30&reference=PURCHASE
Authorization: Bearer {accessToken}
```

**Query Parameters**:

| Parameter | Type | Required | Example | Notes |
|-----------|------|----------|---------|-------|
| `page` | integer | No | 1 | 1-based page number, default 1 |
| `limit` | integer | No | 20 | Items per page, default 20, max 100 |
| `type` | enum | No | `IN` | Filter: IN or OUT |
| `productId` | string (UUID) | No | `550e8400-...` | Filter by product |
| `dateFrom` | ISO 8601 | No | `2026-04-01` | Filter: movements on or after this date |
| `dateTo` | ISO 8601 | No | `2026-04-30` | Filter: movements on or before this date |
| `reference` | string | No | `PURCHASE` | Substring search in reference field |

**Validation**:
- `page`: integer > 0
- `limit`: 1 ≤ limit ≤ 100
- `type`: enum value (IN or OUT) if provided
- `productId`: valid UUID if provided
- `dateFrom`, `dateTo`: valid ISO 8601; if both provided, dateFrom ≤ dateTo
- `reference`: non-empty string, case-insensitive substring match

### Response

**Status: 200 OK**

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440100",
      "type": "IN",
      "date": "2026-04-30T14:30:00Z",
      "reference": "PURCHASE-550e8400-e29b-41d4-a716-446655440000",
      "locationId": "550e8400-e29b-41d4-a716-446655440002",
      "locationName": "Central Clinic",
      "createdBy": {
        "id": "550e8400-e29b-41d4-a716-446655440021",
        "name": "María García"
      },
      "notes": "Partial receipt - 60 of 100 units",
      "itemCount": 3,
      "createdAt": "2026-04-30T14:30:00Z"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440101",
      "type": "OUT",
      "date": "2026-04-29T09:15:00Z",
      "reference": "SALE-550e8400-e29b-41d4-a716-446655440200",
      "locationId": "550e8400-e29b-41d4-a716-446655440002",
      "locationName": "Central Clinic",
      "createdBy": {
        "id": "550e8400-e29b-41d4-a716-446655440020",
        "name": "Juan Pérez"
      },
      "notes": null,
      "itemCount": 2,
      "createdAt": "2026-04-29T09:15:00Z"
    }
  ],
  "pagination": {
    "total": 156,
    "page": 1,
    "limit": 20,
    "hasNextPage": true
  }
}
```

**Status: 400 Bad Request** (invalid query params)

```json
{
  "statusCode": 400,
  "message": "Invalid query parameters",
  "errors": [
    { "field": "type", "message": "type must be 'IN' or 'OUT'" },
    { "field": "dateFrom", "message": "dateFrom must be before dateTo" }
  ]
}
```

**Status: 401 Unauthorized** (missing/invalid token)

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**Status: 403 Forbidden** (insufficient permissions)

```json
{
  "statusCode": 403,
  "message": "Forbidden"
}
```

---

## GET /api/inventory-movements/:id — Movement Details

**Purpose**: Fetch complete details of a single inventory movement including line items with before/after stock levels for audit trail.

**Access**: `@UseGuards(JwtAuthGuard)` — any authenticated user  
**RLS Scope**: Backend checks if user's tenant/location matches movement's tenant/location

### Request

```
GET /api/inventory-movements/550e8400-e29b-41d4-a716-446655440100
Authorization: Bearer {accessToken}
```

**Path Parameters**:

| Parameter | Type | Required | Notes |
|-----------|------|----------|-------|
| `id` | string (UUID) | Yes | Inventory movement ID |

### Response

**Status: 200 OK**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440100",
  "type": "IN",
  "date": "2026-04-30T14:30:00Z",
  "reference": "PURCHASE-550e8400-e29b-41d4-a716-446655440000",
  "locationId": "550e8400-e29b-41d4-a716-446655440002",
  "locationName": "Central Clinic",
  "createdBy": {
    "id": "550e8400-e29b-41d4-a716-446655440021",
    "name": "María García"
  },
  "notes": "Partial receipt - 60 of 100 units",
  "createdAt": "2026-04-30T14:30:00Z",
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440102",
      "inventoryMovementId": "550e8400-e29b-41d4-a716-446655440100",
      "productId": "550e8400-e29b-41d4-a716-446655440010",
      "productName": "Dialysis Solution 2L",
      "brand": "Baxter",
      "quantity": 60,
      "unitPrice": "125.50",
      "totalValue": "7530.00",
      "beforeStock": 300,
      "afterStock": 360
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440103",
      "inventoryMovementId": "550e8400-e29b-41d4-a716-446655440100",
      "productId": "550e8400-e29b-41d4-a716-446655440011",
      "productName": "Saline Solution 0.9%",
      "brand": "Grifols",
      "quantity": 80,
      "unitPrice": "45.25",
      "totalValue": "3620.00",
      "beforeStock": 500,
      "afterStock": 580
    }
  ]
}
```

**Status: 404 Not Found** (movement doesn't exist or user has no access)

```json
{
  "statusCode": 404,
  "message": "Inventory movement not found"
}
```

**Status: 401 Unauthorized**

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**Status: 403 Forbidden** (user's location/tenant doesn't match)

```json
{
  "statusCode": 403,
  "message": "Forbidden"
}
```

---

## Error Handling

### General Error Format

All errors follow this schema:

```json
{
  "statusCode": 400,
  "message": "Human-readable message",
  "errors": [
    {
      "field": "fieldName",
      "message": "Specific validation error"
    }
  ]
}
```

### Common Scenarios

| Scenario | Status | Message |
|----------|--------|---------|
| Expired access token | 401 | "Token expired" |
| Invalid UUID format | 400 | "Invalid ID format" |
| Movement not found | 404 | "Inventory movement not found" |
| Missing authorization header | 401 | "Missing authorization token" |
| Insufficient role permissions | 403 | "Forbidden" |
| Database/server error | 500 | "Internal server error" |

---

## Notes for Frontend

1. **Pagination**: Implement "Load More" or standard pagination. Default 20 items/page.
2. **Type Badge**: IN → green checkmark, OUT → red X
3. **Reference Linking**: The `reference` field is a hyperlink to the source (e.g., "PURCHASE-xyz" links to that PO detail page)
4. **Audit Trail**: The `beforeStock` and `afterStock` fields document inventory at the time of the movement. Verify that `afterStock - beforeStock = ±quantity` for consistency.
5. **Date Sorting**: Movements are typically returned in descending order by date (most recent first). Frontend can apply client-side sorting.
6. **RLS**: If user sees "404 Not Found" for a movement they think exists, they may not have access. Check their role/location.
7. **Performance**: For 1000+ movements, implement pagination strictly. Do not fetch all records at once.

---

## Real-Time Polling Strategy

Frontend should poll this endpoint every 5-10 seconds when the Inventory Movements page is visible:

```typescript
// Pseudo-code
const [movements, setMovements] = useState<InventoryMovement[]>([]);
const lastFetch = useRef<Date>(new Date());

useEffect(() => {
  const interval = setInterval(async () => {
    const fresh = await fetch(`/api/inventory-movements?page=1&limit=20`);
    setMovements(fresh.data);
    lastFetch.current = new Date();
  }, 5000); // Poll every 5 seconds

  return () => clearInterval(interval);
}, []);
```

**Caching**: API response includes `createdAt` timestamp. Frontend can compare against local `lastFetch` to detect stale data and show a "Data may be outdated. Refresh?" indicator.
