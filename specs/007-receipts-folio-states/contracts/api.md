# API Contracts: Receipts — Folio Generation & State Machine

All endpoints are prefixed with `/api`. Auth required (`JwtAuthGuard`). Roles follow the project standard (`OWNER`, `ADMIN`, `MANAGER`, `STAFF`).

---

## POST /api/receipts

Create a new receipt with an atomically generated folio.

**Roles**: OWNER, ADMIN, MANAGER, STAFF

**Request body** (`CreateReceiptDto`):

```json
{
  "patientId":      "uuid (required)",
  "locationId":     "uuid (required)",
  "serviceTypeId":  "uuid (optional)",
  "appointmentId":  "uuid (optional) — must be COMPLETED",
  "planId":         "uuid (conditional — required when paymentType=BENEFIT)",
  "date":           "ISO 8601 datetime (required)",
  "amount":         "decimal string, e.g. \"150.00\" (required)",
  "paymentType":    "CASH | CREDIT | BENEFIT | INSURANCE | TRANSFER (required)",
  "notes":          "string (optional)"
}
```

**Success** `201 Created`:

```json
{
  "id":             "uuid",
  "tenantId":       "uuid",
  "locationId":     "uuid",
  "patientId":      "uuid",
  "userId":         "uuid",
  "serviceTypeId":  "uuid | null",
  "planId":         "uuid | null",
  "folio":          "SUC1-2026-00001",
  "date":           "2026-03-20T10:00:00.000Z",
  "amount":         "150.00",
  "paymentType":    "CASH",
  "status":         "ACTIVE",
  "notes":          "string | null",
  "createdAt":      "ISO 8601",
  "updatedAt":      "ISO 8601"
}
```

**Errors**:
- `400 Bad Request` — paymentType=BENEFIT without planId; invalid body
- `404 Not Found` — patientId not in tenant; locationId not accessible for MANAGER/STAFF; planId not in tenant; appointmentId not found or not in this location
- `409 Conflict` — appointment is not COMPLETED; appointment already linked to a receipt; plan is EXHAUSTED

---

## PATCH /api/receipts/:id/status

Transition a receipt's status.

**Roles**: OWNER, ADMIN, MANAGER, STAFF

**Request body** (`UpdateReceiptStatusDto`):

```json
{
  "status": "FINISHED | SETTLED | CANCELLED (required)",
  "notes":  "string (optional)"
}
```

**Success** `200 OK`: Same shape as `ReceiptResponse` above with updated `status`.

**Errors**:
- `400 Bad Request` — invalid transition (e.g., FINISHED → CANCELLED)
- `404 Not Found` — receipt not found or outside caller's location scope
- `409 Conflict` — receipt is in terminal state (SETTLED or CANCELLED)

---

## GET /api/receipts

List receipts with filters. Paginated.

**Roles**: OWNER, ADMIN, MANAGER, STAFF

**Query parameters**:

| Param | Type | Description |
|---|---|---|
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 20) |
| status | ReceiptStatus | Filter by status |
| patientId | uuid | Filter by patient |
| paymentType | PaymentType | Filter by payment type |
| date | YYYY-MM-DD | Filter by date (full day range, UTC) |

**Success** `200 OK`:

```json
{
  "data":  [ ...ReceiptResponse[] ],
  "total": 45,
  "page":  1,
  "limit": 20
}
```

**Notes**:
- MANAGER/STAFF: automatically scoped to their `locationId`
- OWNER/ADMIN: see all locations in their tenant

---

## GET /api/receipts/:id

Get a single receipt by ID.

**Roles**: OWNER, ADMIN, MANAGER, STAFF

**Success** `200 OK`: `ReceiptResponse`

**Errors**:
- `404 Not Found` — receipt not found or outside caller's location scope

---

## Zod Schemas (`packages/types/src/receipts.schemas.ts`)

```ts
CreateReceiptSchema = z.object({
  patientId:     z.string().uuid(),
  locationId:    z.string().uuid(),
  serviceTypeId: z.string().uuid().optional(),
  appointmentId: z.string().uuid().optional(),
  planId:        z.string().uuid().optional(),
  date:          z.coerce.date(),
  amount:        z.string().regex(/^\d+(\.\d{1,2})?$/),
  paymentType:   PaymentTypeSchema,  // z.enum([...])
  notes:         z.string().optional(),
})

UpdateReceiptStatusSchema = z.object({
  status: ReceiptStatusSchema,
  notes:  z.string().optional(),
})

ReceiptQuerySchema = z.object({
  page:        z.coerce.number().int().positive().optional(),
  limit:       z.coerce.number().int().positive().max(100).optional(),
  status:      ReceiptStatusSchema.optional(),
  patientId:   z.string().uuid().optional(),
  paymentType: PaymentTypeSchema.optional(),
  date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

ReceiptResponseSchema = z.object({
  id:            z.string().uuid(),
  tenantId:      z.string().uuid(),
  locationId:    z.string().uuid(),
  patientId:     z.string().uuid(),
  userId:        z.string().uuid(),
  serviceTypeId: z.string().uuid().nullable(),
  planId:        z.string().uuid().nullable(),
  folio:         z.string(),
  date:          z.coerce.date(),
  amount:        z.string(),
  paymentType:   PaymentTypeSchema,
  status:        ReceiptStatusSchema,
  notes:         z.string().nullable(),
  createdAt:     z.coerce.date(),
  updatedAt:     z.coerce.date(),
})
```
