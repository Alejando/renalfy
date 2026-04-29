# API Contract — Purchase Orders Endpoints

**Feature**: Sprint 20 — Frontend UI for Purchases & Inventory Movements  
**Date**: 2026-04-28  
**Endpoints**: 3 (list, detail, close)

---

## GET /api/purchase-orders — List Purchase Orders

**Purpose**: Fetch paginated list of purchase orders with optional filters.

**Access**: `@UseGuards(JwtAuthGuard)` — any authenticated user  
**RLS Scope**: Backend filters by `tenantId` from JWT; `MANAGER`/`STAFF` see only their location

### Request

```
GET /api/purchase-orders?page=1&limit=20&supplierId=uuid&status=CONFIRMED&dateFrom=2026-04-01&dateTo=2026-04-30
Authorization: Bearer {accessToken}
```

**Query Parameters**:

| Parameter | Type | Required | Example | Notes |
|-----------|------|----------|---------|-------|
| `page` | integer | No | 1 | 1-based page number, default 1 |
| `limit` | integer | No | 20 | Items per page, default 20, max 100 |
| `supplierId` | string (UUID) | No | `550e8400-...` | Filter by supplier |
| `status` | enum | No | `CONFIRMED` | Filter: CONFIRMED, RECEIVED, CLOSED |
| `dateFrom` | ISO 8601 | No | `2026-04-01` | Filter: orders on or after this date |
| `dateTo` | ISO 8601 | No | `2026-04-30` | Filter: orders on or before this date |

**Validation**:
- `page`: integer > 0
- `limit`: 1 ≤ limit ≤ 100
- `supplierId`: valid UUID if provided
- `status`: enum value if provided
- `dateFrom`, `dateTo`: valid ISO 8601; if both provided, dateFrom ≤ dateTo

### Response

**Status: 200 OK**

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "supplierId": "550e8400-e29b-41d4-a716-446655440001",
      "supplierName": "Acme Medical Supplies",
      "locationId": "550e8400-e29b-41d4-a716-446655440002",
      "locationName": "Central Clinic",
      "status": "CONFIRMED",
      "orderDate": "2026-04-28T10:00:00Z",
      "totalAmount": "15500.50",
      "itemCount": 8,
      "createdAt": "2026-04-28T10:00:00Z",
      "updatedAt": "2026-04-28T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 42,
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
    { "field": "limit", "message": "limit must not be greater than 100" },
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

## GET /api/purchase-orders/:id — Purchase Order Details

**Purpose**: Fetch complete details of a single purchase order including line items and audit trail.

**Access**: `@UseGuards(JwtAuthGuard)` — any authenticated user  
**RLS Scope**: Backend checks if user's tenant/location matches order's tenant/location

### Request

```
GET /api/purchase-orders/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer {accessToken}
```

**Path Parameters**:

| Parameter | Type | Required | Notes |
|-----------|------|----------|-------|
| `id` | string (UUID) | Yes | Purchase order ID |

### Response

**Status: 200 OK**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "supplierId": "550e8400-e29b-41d4-a716-446655440001",
  "supplierName": "Acme Medical Supplies",
  "locationId": "550e8400-e29b-41d4-a716-446655440002",
  "locationName": "Central Clinic",
  "status": "RECEIVED",
  "orderDate": "2026-04-28T10:00:00Z",
  "totalAmount": "15500.50",
  "itemCount": 8,
  "createdAt": "2026-04-28T10:00:00Z",
  "updatedAt": "2026-04-30T14:30:00Z",
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440003",
      "purchaseOrderId": "550e8400-e29b-41d4-a716-446655440000",
      "productId": "550e8400-e29b-41d4-a716-446655440010",
      "productName": "Dialysis Solution 2L",
      "brand": "Baxter",
      "quantityOrdered": 100,
      "quantityReceived": 60,
      "unitsPerPackage": 12,
      "unitPrice": "125.50",
      "tax": "0.00",
      "currentLocationStock": 720
    }
  ],
  "auditTrail": [
    {
      "action": "CREATED",
      "status": "CONFIRMED",
      "timestamp": "2026-04-28T10:00:00Z",
      "userId": "550e8400-e29b-41d4-a716-446655440020",
      "userName": "Juan Pérez"
    },
    {
      "action": "RECEIVED",
      "status": "RECEIVED",
      "timestamp": "2026-04-30T14:30:00Z",
      "userId": "550e8400-e29b-41d4-a716-446655440021",
      "userName": "María García",
      "notes": "Partial receipt - 60 of 100 units"
    }
  ]
}
```

**Status: 404 Not Found** (order doesn't exist or user has no access)

```json
{
  "statusCode": 404,
  "message": "Purchase order not found"
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

## POST /api/purchase-orders/:id/close — Close Purchase Order

**Purpose**: Mark a purchase order as CLOSED (admin only). Only OWNER/ADMIN roles allowed.

**Access**: `@UseGuards(JwtAuthGuard)` + role check (`OWNER | ADMIN`)  
**RLS Scope**: User must belong to same tenant as PO

### Request

```
POST /api/purchase-orders/550e8400-e29b-41d4-a716-446655440000/close
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "closedReason": "All items received and verified"
}
```

**Path Parameters**:

| Parameter | Type | Required | Notes |
|-----------|------|----------|-------|
| `id` | string (UUID) | Yes | Purchase order ID |

**Request Body**:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `closedReason` | string | No | Optional reason for closing |

### Response

**Status: 200 OK**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "CLOSED",
  "closedAt": "2026-04-30T15:00:00Z",
  "closedBy": "550e8400-e29b-41d4-a716-446655440021",
  "closedByName": "María García",
  "closedReason": "All items received and verified"
}
```

**Status: 400 Bad Request** (invalid state — already closed or still pending items)

```json
{
  "statusCode": 400,
  "message": "Cannot close order in CONFIRMED status. Must be RECEIVED first."
}
```

**Status: 401 Unauthorized**

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**Status: 403 Forbidden** (not OWNER/ADMIN)

```json
{
  "statusCode": 403,
  "message": "Forbidden. Only OWNER or ADMIN can close orders."
}
```

**Status: 404 Not Found**

```json
{
  "statusCode": 404,
  "message": "Purchase order not found"
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
| Order not found | 404 | "Purchase order not found" |
| Concurrent modification | 409 | "Order was modified by another user. Refresh and try again." |
| Missing authorization header | 401 | "Missing authorization token" |
| Insufficient role permissions | 403 | "Forbidden" |

---

## Notes for Frontend

1. **Pagination**: Implement "Load More" or standard pagination. Default 20 items/page.
2. **Filters**: All optional. Leaving blank returns all records user can access.
3. **Date Filters**: Validate client-side that `dateFrom ≤ dateTo` before submitting.
4. **RLS**: If user sees "404 Not Found" for an order they think exists, they may not have access. Check their role/location.
5. **Audit Trail**: Immutable history shown in detail view. Each action timestamped and attributed to user.
