# Data Model — Frontend Entities for Purchases & Inventory Movements

**Feature**: Sprint 20 — Frontend UI for Purchases & Inventory Movements  
**Date**: 2026-04-28  
**Status**: Phase 1 Design

---

## Overview

Frontend data structures represent read-only views of backend entities from the Purchases & Inventory Movements API. All entities are immutable on the client side — mutations flow through server endpoints only.

**Key Principle**: Frontend never filters data. All RLS and role-based filtering happens on the backend. Frontend displays only what the API returns.

---

## Entity Models

### 1. PurchaseOrder

**Source**: Backend `PurchaseOrder` entity  
**Immutability**: Read-only. State changes via `POST /api/purchases` (to receive) or `POST /api/purchase-orders/:id/close` (admin).

```typescript
interface PurchaseOrder {
  id: string;                           // UUID, unique identifier
  supplierId: string;                   // UUID, foreign key to Supplier
  supplierName: string;                 // Supplier name (denormalized for display)
  locationId: string;                   // UUID, foreign key to Location
  locationName: string;                 // Location name (denormalized for display)
  status: 'CONFIRMED' | 'RECEIVED' | 'CLOSED'; // State machine
  orderDate: Date;                      // When PO was created
  totalAmount: string;                  // Decimal as string (handle via Decimal.js in strict math)
  itemCount: number;                    // Count of line items (for list display)
  createdAt: Date;                      // Server timestamp
  updatedAt: Date;                      // Server timestamp
  createdByName?: string;               // Optional: user who created (if audit requested)
}
```

**Validation Rules**:
- `supplierId`: UUID v4, required
- `status`: Enum value only
- `orderDate`: ISO 8601 date, past or present
- `totalAmount`: ≥ 0 (should be sum of line item subtotals)

**Relationships**:
- **1:N** to `PurchaseOrderItem` (line items)
- **M:1** to `Supplier`
- **M:1** to `Location`

**State Machine**:
```
CONFIRMED → RECEIVED → CLOSED
           (via /purchases POST)
```

**Usage in Pages**:
- **PurchaseOrdersListPage**: Display fields: `supplierId`, `supplierName`, `status`, `orderDate`, `itemCount`, `totalAmount`
- **PurchaseOrderDetailPage**: Display all fields + `items` array + audit trail

---

### 2. PurchaseOrderItem

**Source**: Backend `PurchaseOrderItem` entity  
**Immutability**: Read-only. Created at PO creation time. Implicit updates when receipt is registered (accumulated quantity tracked in backend via `quantityReceived` field added post-receive).

```typescript
interface PurchaseOrderItem {
  id: string;                           // UUID, unique identifier
  purchaseOrderId: string;              // UUID, foreign key to PurchaseOrder
  productId: string;                    // UUID, foreign key to Product
  productName: string;                  // Product name (denormalized)
  brand?: string | null;                // Product brand if available
  quantityOrdered: number;              // Original ordered quantity
  quantityReceived?: number;            // Accumulated received across all receipts (optional, post-receive)
  unitsPerPackage: number;              // Units per package for conversion
  unitPrice: string;                    // Decimal as string
  tax: string;                          // Decimal as string (flat tax per item or percentage)
  subtotal?: string;                    // Calculated client-side: quantityOrdered × unitPrice
  currentLocationStock: number;         // Current stock level for product at location (from API at fetch time)
}
```

**Calculation Rules**:
- `subtotal = quantityOrdered × unitPrice` (client-side for display only)
- `remainingToReceive = quantityOrdered - (quantityReceived || 0)`
- Status badge logic: if `remainingToReceive > 0` → "Pending", else "Fully Received"

**Validation Rules**:
- `productId`: UUID v4, required
- `quantityOrdered`: integer > 0
- `unitsPerPackage`: integer > 0
- `unitPrice`: string decimal, ≥ 0
- `tax`: string decimal, ≥ 0

**Usage in Components**:
- **PurchaseOrderDetailPage**: Display as table rows under "Line Items" section
- **ReceiveItemsModal**: Iterate through items, filter by `remainingToReceive > 0`, show `currentLocationStock` for reference

---

### 3. InventoryMovement

**Source**: Backend `InventoryMovement` entity  
**Immutability**: Read-only. Immutable at database level (NOM-004-SSA3 compliance).

```typescript
interface InventoryMovement {
  id: string;                           // UUID, unique identifier
  type: 'IN' | 'OUT';                   // Direction: inflow or outflow
  date: Date;                           // When movement occurred (can be backdated for corrections)
  reference: string;                    // Audit trail: "PURCHASE-{id}", "SALE-{id}", "ADJUSTMENT-{reason}"
  locationId: string;                   // UUID, location affected
  locationName?: string;                // Location name (denormalized for display)
  createdBy: {                          // User who recorded the movement
    id: string;                         // UUID
    name: string;                       // Full name
  };
  notes?: string | null;                // Optional notes (e.g., "Recount discrepancy", "Damage correction")
  itemCount: number;                    // Count of line items (for list display)
  createdAt: Date;                      // Server timestamp (immutable)
}
```

**Display Rules**:
- Type badge: `IN` → green/✓, `OUT` → red/✗
- Reference hyperlinked to source (e.g., click "PURCHASE-abc123" → navigate to PurchaseOrderDetailPage)

**Validation Rules**:
- `type`: Enum only
- `date`: ISO 8601, past or present
- `reference`: Non-empty string, format enforced by backend

**Usage in Pages**:
- **InventoryMovementsListPage**: Display fields: `type`, `date`, `reference`, `itemCount`, `createdBy.name`
- **MovementDetailPage**: Display all fields + `items` array with before/after stock levels

---

### 4. InventoryMovementItem

**Source**: Backend `InventoryMovementItem` entity  
**Immutability**: Read-only. Immutable at database level.

```typescript
interface InventoryMovementItem {
  id: string;                           // UUID, unique identifier
  inventoryMovementId: string;          // UUID, foreign key to InventoryMovement
  productId: string;                    // UUID, foreign key to Product
  productName: string;                  // Product name (denormalized)
  brand?: string | null;                // Product brand if available
  quantity: number;                     // Quantity moved (positive for IN/OUT)
  unitPrice: string;                    // Decimal as string (cost basis at time of movement)
  totalValue: string;                   // quantity × unitPrice (for audit)
  beforeStock: number;                  // Stock level before this movement (audit trail)
  afterStock: number;                   // Stock level after this movement (audit trail)
}
```

**Calculation Rules**:
- `totalValue = quantity × unitPrice` (display only)
- Stock change shown as: `afterStock - beforeStock` (should equal ±quantity for consistency check)

**Validation Rules**:
- `quantity`: integer > 0
- `unitPrice`: string decimal, ≥ 0
- `beforeStock`, `afterStock`: integer ≥ 0

**Usage in Components**:
- **MovementDetailPage**: Display as table rows under "Items" section with before/after columns for audit

---

### 5. LocalCache (Frontend State)

**Source**: Client-side, populated from API responses  
**Purpose**: Reduce API calls for stock level checks during form interactions

```typescript
interface LocationStockCache {
  [productId: string]: number;          // productId → current stock level
}

interface CacheMetadata {
  locationStocks: LocationStockCache;
  lastUpdated: Date;                    // Timestamp of last API fetch
  expiresAt: Date;                      // Cache invalidation time (lastUpdated + 10 minutes)
  tenantId: string;                     // Scope cache to tenant
  locationId?: string;                  // Optional: scope to location (for MANAGER/STAFF)
}
```

**Cache Invalidation Rules**:
1. **On Receipt Submission Success**: Immediately update cache for affected products
   ```typescript
   items.forEach(item => {
     cache[item.productId] = cache[item.productId] + item.stockDelta;
   });
   ```
2. **On Expiry**: After 10 minutes, fetch fresh data
3. **On Location Switch**: Clear entire cache, fetch new location's stock
4. **On Manual Refresh**: User clicks "Refresh", fetch immediately

**Usage in Hooks**:
- **usePurchaseOrders**: Fetch POs, extract current stock levels from items, populate cache
- **useReceivePurchase**: Read from cache for optimistic UI updates, validate quantityReceived against cache
- **useInventoryMovements**: Fetch movements, cache post-transaction stock levels

---

## Form Models

### ReceiveItemsForm

**Context**: User registers receipt of items for a CONFIRMED purchase order.

```typescript
interface ReceiveItemsFormInput {
  purchaseOrderId: string;              // Auto-filled from route param
  items: Array<{
    purchaseOrderItemId: string;        // Which PO line item
    productId: string;                  // Which product
    quantityReceived: number;           // How many ordered items received
    unitsPerPackage: number;            // Units per package (for stock conversion)
    stockDelta?: number;                // Calculated: quantityReceived × unitsPerPackage (display only)
  }>;
  notes?: string;                       // Optional receipt notes
}

// Zod Schema (in @repo/types/src/purchases-forms.schemas.ts)
export const ReceiveItemsFormSchema = z.object({
  purchaseOrderId: z.string().uuid(),
  items: z.array(z.object({
    purchaseOrderItemId: z.string().uuid(),
    productId: z.string().uuid(),
    quantityReceived: z.number().int().positive('Must be > 0'),
    unitsPerPackage: z.number().int().positive('Must be > 0'),
  })).min(1, 'At least one item required'),
  notes: z.string().optional(),
}).strict();

export type ReceiveItemsFormInput = z.infer<typeof ReceiveItemsFormSchema>;
```

**Field Rules**:
- `quantityReceived`: 0 < x ≤ remainingToReceive (validated against PO state)
- `unitsPerPackage`: x > 0, integer
- `stockDelta = quantityReceived × unitsPerPackage`: Calculated, displayed for confirmation, sent to backend

**Validation Scenarios**:
1. **Empty items**: Show "At least one item required"
2. **quantityReceived > remainingToReceive**: Show "Cannot exceed remaining qty ({remainingToReceive})"
3. **unitsPerPackage ≤ 0**: Show "Units per package must be positive"
4. **Concurrent modification**: If PO status changed while user filling form, show "Order modified. Refresh and try again" (409 Conflict from backend)

**Submission Behavior**:
- On submit: POST to `/api/purchases` with this form data
- Success: Navigate to PurchaseOrderDetailPage, show success toast "Receipt registered"
- Error 409: Show "Order modified by another user" + refresh button
- Error 400: Show field-level validation errors
- Error 403: Show "You don't have permission to receive items"

---

## Derived Computed Fields

These are not stored entities but computed on the client for display:

| Field | Formula | Purpose |
|-------|---------|---------|
| `PurchaseOrder.isReceivable` | `status === 'CONFIRMED' && currentUser.canReceive` | Show "Receive Items" button |
| `PurchaseOrder.isClosable` | `status === 'RECEIVED' && currentUser.role in ['OWNER', 'ADMIN']` | Show "Close Order" button |
| `PurchaseOrderItem.remainingToReceive` | `quantityOrdered - (quantityReceived \|\| 0)` | Show in form as "Remaining: {n}" |
| `PurchaseOrderItem.stockAfterReceipt` | `currentLocationStock + (quantityReceived × unitsPerPackage)` | Show in receipt confirmation |
| `InventoryMovement.isInflow` | `type === 'IN'` | Styling (green badge) |
| `CacheMetadata.isStale` | `now() > expiresAt` | Show "data may be outdated" indicator |

---

## Type Inference from Backend

All entities are derived from Prisma `$types`:

```typescript
// In API response, e.g., GET /api/purchase-orders/:id
type PurchaseOrderResponse = {
  id: string;
  supplierId: string;
  // ... fields match PurchaseOrder interface above
};

// Frontend imports the type
import type { PurchaseOrderResponse } from '@repo/types';

const purchaseOrder: PurchaseOrderResponse = await fetchPurchaseOrder(id);
```

**No custom `DTO` classes on frontend.** Types are inferred from API contracts and Zod schemas.

---

## Multi-Tenant & RLS Isolation

**Frontend never filters by `tenantId` or `locationId`.**

- Backend enforces RLS via `set_config('app.current_tenant_id', tenantId, false)`
- Frontend receives only data the user is authorized to see
- If user is `MANAGER`, API returns only their location's data
- If user is `OWNER`, API returns all locations' data

**Verification**: If data is returned by API, user is authorized. No additional checks needed on frontend.

---

## References

- **Specification**: `/specs/016-sprint-frontend-purchases/spec.md` (User Stories, Requirements)
- **API Contracts**: `/specs/016-sprint-frontend-purchases/contracts/` (Endpoint details)
- **Implementation Plan**: `/specs/016-sprint-frontend-purchases/plan.md` (Architecture, decisions)
