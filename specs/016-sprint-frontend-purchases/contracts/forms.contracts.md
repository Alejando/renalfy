# API Contract — Form Submissions & Schemas

**Feature**: Sprint 20 — Frontend UI for Purchases & Inventory Movements  
**Date**: 2026-04-28  
**Form Endpoints**: 1 (POST /api/purchases)

---

## POST /api/purchases — Register Purchase Receipt

**Purpose**: User submits form to register receipt of items for a CONFIRMED purchase order. Creates a `Purchase` record and updates `LocationStock`.

**Access**: `@UseGuards(JwtAuthGuard)` + role check (`MANAGER | OWNER | ADMIN`; `STAFF` denied)  
**RLS Scope**: User's location must match purchase order's location

### Request

```
POST /api/purchases
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "purchaseOrderId": "550e8400-e29b-41d4-a716-446655440000",
  "locationId": "550e8400-e29b-41d4-a716-446655440002",
  "items": [
    {
      "purchaseOrderItemId": "550e8400-e29b-41d4-a716-446655440003",
      "productId": "550e8400-e29b-41d4-a716-446655440010",
      "quantityReceived": 60,
      "unitsPerPackage": 12,
      "unitPrice": "125.50",
      "tax": "0.00"
    }
  ],
  "notes": "Partial receipt - 60 of 100 units"
}
```

**Request Body Schema**:

| Field | Type | Required | Validation | Notes |
|-------|------|----------|-----------|-------|
| `purchaseOrderId` | UUID | Yes | Valid UUID v4 | Must match PO in CONFIRMED status |
| `locationId` | UUID | Yes | Valid UUID v4 | User's assigned location |
| `items` | Array | Yes | Min 1 item, each item valid | Line items received |
| `items[].purchaseOrderItemId` | UUID | Yes | Valid UUID v4 | Reference to PO line item |
| `items[].productId` | UUID | Yes | Valid UUID v4 | Product being received |
| `items[].quantityReceived` | number | Yes | Int > 0, ≤ remainingQty | Qty of packages received |
| `items[].unitsPerPackage` | number | Yes | Int > 0 | Units per package (for stock conversion) |
| `items[].unitPrice` | string (decimal) | Yes | ≥ 0 | Unit price (should match PO) |
| `items[].tax` | string (decimal) | Yes | ≥ 0 | Tax amount per unit |
| `notes` | string | No | Max 500 chars | Optional receipt notes |

**Client-Side Validation** (Zod schema in `@repo/types`):

```typescript
// packages/types/src/purchases-forms.schemas.ts
import { z } from 'zod';

export const ReceiveItemsItemSchema = z.object({
  purchaseOrderItemId: z.string().uuid('Invalid item ID'),
  productId: z.string().uuid('Invalid product ID'),
  quantityReceived: z.number().int().positive('Must be greater than 0'),
  unitsPerPackage: z.number().int().positive('Must be greater than 0'),
  unitPrice: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid price format'),
  tax: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid tax format'),
});

export const ReceiveItemsFormSchema = z.object({
  purchaseOrderId: z.string().uuid('Invalid purchase order ID'),
  locationId: z.string().uuid('Invalid location ID'),
  items: z.array(ReceiveItemsItemSchema).min(1, 'At least one item required'),
  notes: z.string().max(500, 'Notes must be 500 characters or less').optional(),
}).strict();

export type ReceiveItemsFormInput = z.infer<typeof ReceiveItemsFormSchema>;
```

**Frontend Validation Rules**:
- `quantityReceived ≤ (quantityOrdered - quantityReceived)` — cannot exceed remaining qty
- `unitsPerPackage > 0` — positive integer
- `unitPrice, tax ≥ 0` — non-negative decimals
- Calculate `stockDelta = quantityReceived × unitsPerPackage` for display/confirmation
- Date validation: N/A (no user-entered dates)

### Response

**Status: 201 Created**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440300",
  "purchaseOrderId": "550e8400-e29b-41d4-a716-446655440000",
  "locationId": "550e8400-e29b-41d4-a716-446655440002",
  "status": "RECEIVED",
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440301",
      "purchaseId": "550e8400-e29b-41d4-a716-446655440300",
      "productId": "550e8400-e29b-41d4-a716-446655440010",
      "quantityReceived": 60,
      "unitsPerPackage": 12,
      "unitPrice": "125.50",
      "tax": "0.00",
      "stockDelta": 720
    }
  ],
  "createdAt": "2026-04-30T14:30:00Z",
  "createdBy": {
    "id": "550e8400-e29b-41d4-a716-446655440021",
    "name": "María García"
  }
}
```

**Status: 400 Bad Request** (validation failed)

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    { "field": "items[0].quantityReceived", "message": "Cannot exceed remaining quantity (40)" }
  ]
}
```

**Status: 409 Conflict** (concurrent modification — PO already received by another user)

```json
{
  "statusCode": 409,
  "message": "Purchase order was modified by another user. Refresh and try again.",
  "details": {
    "purchaseOrderId": "550e8400-e29b-41d4-a716-446655440000",
    "currentStatus": "RECEIVED",
    "expectedStatus": "CONFIRMED"
  }
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
  "message": "Forbidden. Only MANAGER, OWNER, or ADMIN can register receipts."
}
```

**Status: 404 Not Found** (purchase order doesn't exist or user has no access)

```json
{
  "statusCode": 404,
  "message": "Purchase order not found"
}
```

---

## Form — ReceiveItemsModal

**Context**: Modal/drawer that opens when user clicks "Receive Items" on a CONFIRMED purchase order detail page.

**Behavior**:
1. Load purchase order detail (includes items with `quantityOrdered` and `currentLocationStock`)
2. Filter items with `remainingToReceive > 0`
3. Pre-populate form with item IDs and default values
4. On submit: Call POST /api/purchases with form data
5. On success: Close modal, refresh PO detail, show toast "Receipt registered"
6. On error: Show error message, allow retry or cancel

**Form Fields**:

| Field | Type | Required | Behavior |
|-------|------|----------|----------|
| **Item rows** | - | Yes | One row per line item with remaining qty > 0 |
| **  → Product Name** | text | — | Read-only, filled from API |
| **  → Remaining Qty** | text | — | Read-only, calculated `quantityOrdered - quantityReceived` |
| **  → Quantity Received** | number | Yes | User enters how many of this item received |
| **  → Units Per Package** | number | Yes | User enters units per package (dropdown or text) |
| **  → Stock Delta** | text | — | Read-only, calculated `quantityReceived × unitsPerPackage` |
| **  → After Receipt Stock** | text | — | Read-only, calculated `currentLocationStock + stockDelta` |
| **Notes** | textarea | No | Optional field for receipt notes |
| **Submit Button** | — | — | Disabled during submission, shows spinner |
| **Cancel Button** | — | — | Closes modal without submission |

**Submission Behavior**:
- Validate all items client-side using Zod schema
- Show inline validation errors next to fields (not modal-level alert)
- Disable inputs during submission
- Show loading spinner on submit button
- On success (201): Toast "Receipt registered for {itemCount} items", close modal, refresh parent PO list
- On 409 (concurrent): Toast "Order was modified. Refreshing...", fetch fresh PO state, show modal again with updated data
- On 403 (permission): Toast "You don't have permission to register receipts"
- On 400 (validation): Show field-level errors inline

---

## Error Scenarios & Messages

| Scenario | Status | User Message | Action |
|----------|--------|--------------|--------|
| Network timeout | — | "Connection timeout. Check your internet and try again." | Retry button |
| Server error (500) | 500 | "Server error. Please try again later." | Retry button |
| PO not found | 404 | "Purchase order not found. It may have been deleted." | Close modal, return to list |
| PO already closed | 400 | "This order is already closed." | Refresh list, close modal |
| User not MANAGER/ADMIN | 403 | "You don't have permission to register receipts." | Disable button, show message |
| Quantity exceeds remaining | 400 | "You can only receive {remaining} more units." | Clear field, suggest max value |
| Concurrent modification | 409 | "Order was modified by another user. Refreshing..." | Auto-refresh, re-show form |
| Decimal validation failed | 400 | "Invalid price format. Use format: 0.00" | Mark field as error |

---

## Notes for Frontend Implementation

1. **Decimal Handling**: Use `Decimal` or `Big.js` library for accurate math on prices/quantities. Avoid floating-point arithmetic.
2. **Stock Delta Display**: Show prominently: "After receipt: {currentStock} + {stockDelta} = {newStock} units"
3. **Form Defaults**: Pre-fill `quantityReceived = 0`, `unitsPerPackage = PO item's units per package`
4. **Readonly Fields**: Make read-only fields look disabled (gray background, no focus border)
5. **Inline Validation**: Show validation errors below each field, not in a modal alert
6. **Submission State**: During submission, disable all inputs and show spinner on button. Do not allow modal to close via Escape key.
7. **Accessibility**: Label all inputs with `htmlFor`, use semantic HTML, ARIA live region for async errors
8. **Toast Duration**: Success toasts dismiss after 3-5 seconds; errors stay until user dismisses or retries

---

## Related API Endpoints

- **GET /api/purchase-orders/:id** — Fetch PO details including items before opening modal
- **GET /api/inventory-movements** — Fetch movements to show as new "IN" entries after receipt
- **POST /api/purchase-orders/:id/close** — Admin-only endpoint to close PO (separate feature)
