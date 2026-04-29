# Phase 1: Data Model & Component Structure — Sprint 20

## Frontend Data Model

### 1. Purchase Detail View

**Data Source**: `GET /api/purchases/{id}` → `PurchaseDetailResponse`

```typescript
interface PurchaseDetailResponse {
  id: UUID;                     // Purchase ID
  tenantId: UUID;               // Tenant isolation
  locationId: UUID;             // Branch where purchased
  userId: UUID;                 // User who registered purchase
  supplierId: UUID;             // Supplier ID
  purchaseOrderId: UUID;        // Link to order
  date: Date;                   // When purchased
  amount: string;               // Total amount (Decimal string)
  notes: string | null;         // Optional notes
  supplierName: string;         // Cached supplier name
  locationName: string;         // Cached location name
  itemCount: number;            // How many line items
  createdAt: Date;              // Timestamp
  
  // Nested relations
  items: PurchaseItemResponse[];
  supplier: {
    id: UUID;
    name: string;
    contact: string | null;
    phone: string | null;
    email: string | null;
  };
  location: {
    id: UUID;
    name: string;
  };
}

interface PurchaseItemResponse {
  id: UUID;
  purchaseId: UUID;
  productId: UUID;
  quantity: number;             // Quantity ordered (in packages)
  quantityReceived: number;     // Quantity actually received (in packages)
  unitsPerPackage: number;      // Conversion factor
  unitPrice: string;            // Price per unit (Decimal)
  tax: string;                  // Tax amount (Decimal)
  subtotal: string;             // Item total = (quantityReceived × unitPrice) + tax
  createdAt: Date;
  
  // Nested relation
  product: {
    id: UUID;
    name: string;
    brand: string | null;
  };
}
```

**Page Layout**:
```
┌─────────────────────────────────────────────────┐
│ ← Back   Detalle de Compra                      │
├─────────────────────────────────────────────────┤
│ ORDEN: PO-001    PROVEEDOR: Supplier Co        │
│ SUCURSAL: Clinic A   FECHA: 2026-04-29         │
│ MONTO TOTAL: $5,000.00                         │
├─────────────────────────────────────────────────┤
│  PRODUCTO  │ORDENADO│RECIBIDO│UNIDADES│PRECIO │
├─────────────────────────────────────────────────┤
│  Solución  │  10    │  10    │  100   │ $500  │
│  Agujas    │  100   │  100   │  1     │ $10   │
└─────────────────────────────────────────────────┘
```

**Read-Only**: No edit buttons. Display all details. Link from movements page works here.

---

### 2. Inventory Movements List View

**Data Source**: `GET /api/inventory-movements?page=X&limit=20&filters` → `PaginatedInventoryMovementsResponse`

```typescript
interface InventoryMovementResponse {
  id: UUID;                   // Movement ID
  tenantId: UUID;             // Tenant isolation
  locationId: UUID;           // Branch where movement occurred
  userId: UUID;               // User who created movement
  date: Date;                 // When movement happened
  type: 'IN' | 'OUT';         // Entrada or Salida
  reference: string | null;   // Format: "PURCHASE-{purchaseId}" or "SALE-{saleId}"
  notes: string | null;       // Optional notes
  itemCount: number;          // How many products affected
  createdAt: Date;            // Timestamp
  createdBy?: {               // Optional
    id: UUID;
    name: string;
  };
}

interface PaginatedInventoryMovementsResponse {
  data: InventoryMovementResponse[];
  total: number;              // Total records matching filters
  page: number;               // Current page (1-based)
  limit: number;              // Records per page (20)
}
```

**Query Parameters**:
```typescript
interface InventoryMovementQuery {
  page?: number;              // Default 1
  limit?: number;             // Default 20, max 100
  locationId?: UUID;          // Filter by branch
  productId?: UUID;           // Filter by product (optional)
  type?: 'IN' | 'OUT';        // Filter by movement type
  dateFrom?: Date;            // Filter by date range start
  dateTo?: Date;              // Filter by date range end
}
```

**Page Layout**:
```
┌──────────────────────────────────────────────────────────┐
│ Movimientos de Inventario                                │
├──────────────────────────────────────────────────────────┤
│ Sucursal: [All ▼] Tipo: [All ▼] Desde: [ ] Hasta: [ ]   │
├──────────────────────────────────────────────────────────┤
│ PRODUCTO │ CANTIDAD │ TIPO    │ FECHA  │ DOCUMENTO      │
├──────────────────────────────────────────────────────────┤
│ Solución │ 1000 u   │ Entrada │ 04/29  │ PURCHASE-123   │
│ Agujas   │ 100 u    │ Entrada │ 04/29  │ PURCHASE-123   │
│ Solución │ 50 u     │ Salida  │ 04/28  │ SALE-456       │
├──────────────────────────────────────────────────────────┤
│ Página 1 de 3   [Anterior] [Siguiente]                  │
└──────────────────────────────────────────────────────────┘
```

**Interaction**:
- Click on DOCUMENT link → Navigate to `/inventory/purchases/{id}` or `/inventory/sales/{id}`
- Filters → Refetch with updated query params
- Pagination → Load next page

---

### 3. Component Structure

```
apps/web/app/tenants/[slug]/(dashboard)/inventory/
│
├── purchases/
│   ├── page.tsx                        # Server: list purchases
│   ├── purchases-page-client.tsx       # Client: render list, enable View button
│   ├── [id]/
│   │   ├── page.tsx                    # Server: fetch purchase detail
│   │   └── purchase-detail-client.tsx  # Client: render detail, link to movements
│   └── [...].test.tsx
│
├── movements/
│   ├── page.tsx                        # Server: fetch movements + filters
│   ├── movements-page-client.tsx       # Client: render list, pagination, filters
│   ├── movement-filters.tsx            # Client: filter form UI
│   ├── movement-table.tsx              # Client: table rendering
│   └── [...].test.tsx
│
└── purchase-orders/[id]/
    ├── receive-items-dialog.tsx        # (reuse existing)
    └── [...].test.tsx                  # (complete if missing tests)
```

---

## State Management & Data Flow

### Purchase Detail Page Flow

1. **User navigates**: `/inventory/purchases/{id}`
2. **Server component** (`page.tsx`):
   - Gets `[id]` from params
   - Calls `apiFetch('/purchases/{id}')`
   - Passes `PurchaseDetailResponse` to client component
3. **Client component** (`purchase-detail-client.tsx`):
   - Renders detail view (header + table)
   - Displays supplier info, location, date, total
   - Shows items in table (product, qty, price, subtotal)
   - On error: Display `ErrorState` component

### Movements List Page Flow

1. **User navigates**: `/inventory/movements?page=1&type=IN&locationId=...`
2. **Server component** (`page.tsx`):
   - Parses `searchParams` (page, filters)
   - Validates with `InventoryMovementQuerySchema`
   - Calls `apiFetch('/inventory-movements', queryParams)`
   - Passes `PaginatedInventoryMovementsResponse` to client
3. **Client component** (`movements-page-client.tsx`):
   - Renders filter form (`movement-filters.tsx`)
   - Renders table (`movement-table.tsx`)
   - On filter change: Update URL params → Server refetch
   - On pagination: Update URL params → Server refetch
4. **Interaction**:
   - Click document link → Call server action to navigate (or use Link component)
   - Table row click → Navigate to purchase/sale detail

---

## Validation & Error Handling

### Frontend Validation

**Purchase Detail Page**:
- UUID validation on `id` param
- Zod parsing of API response with `PurchaseDetailResponseSchema.parse()`
- ErrorBoundary for unexpected response shape

**Movements List Page**:
- Query params validated with `InventoryMovementQuerySchema`
- Pagination bounds (page ≥ 1, limit ≤ 100)
- Date range validation (dateFrom ≤ dateTo)
- Optional filters (empty = no filter)

### Error States

| Scenario | Display |
|----------|---------|
| 404 (Purchase not found) | `ErrorState` "Compra no encontrada" |
| 403 (User doesn't own purchase) | `ErrorState` "No tienes permiso" |
| 500 (Server error) | `ErrorState` "Error al cargar compra" |
| Network timeout | `ErrorState` "Conexión perdida" |
| Empty movements list | `EmptyState` "Sin movimientos para los criterios seleccionados" |

---

## Access Control Rules (Frontend Display)

```typescript
// In page.tsx (Server Component) or via getSessionUser()
const sessionUser = await getSessionUser();

// Purchase Detail
if (sessionUser.role === 'STAFF') {
  return <ErrorState message="No tienes permiso" />;
}
if (sessionUser.role === 'MANAGER' && purchase.locationId !== sessionUser.locationId) {
  return <ErrorState message="No tienes permiso para ver compras de otra sucursal" />;
}
// else: OWNER/ADMIN see all

// Movements List
if (sessionUser.role === 'STAFF') {
  return <ErrorState message="No tienes permiso" />;
}
if (sessionUser.role === 'MANAGER') {
  // Only show movements from their location
  filters.locationId = sessionUser.locationId;
}
// else: OWNER/ADMIN see all locations
```

**Backend Guarantees**: RLS ensures tenant isolation. Frontend is defense-in-depth only.

---

## Routing & Navigation

```
/inventory/purchases                    # List purchases (paginated)
  → /inventory/purchases/{id}           # Purchase detail
    → (from movement) /inventory/movements  # Back to movements
    → (Receive action) Open dialog      # Reuse existing ReceiveItemsDialog

/inventory/movements                    # List movements (filtered, paginated)
  → Click PURCHASE-{id} link            # Navigate to /inventory/purchases/{id}
  → Click filters / pagination          # Refetch same page with new params
```

---

## Performance Metrics

| Action | Target | Implementation |
|--------|--------|-----------------|
| Purchase detail load | <2s | Server-side fetch, no client-side processing |
| Movements list load | <2s | Pagination (20 per page) |
| Filter + refetch | <3s | Server action re-renders page |
| Pagination change | <1s | Client-side URL update → Server fetch |
| Link navigation | <500ms | Next.js Link prefetch |

---

## Summary

- **3 new pages/sections**: Purchase detail, movements list, movement filters
- **6 new components**: Detail page, list page, filter form, table, error/empty states
- **Reuses**: ReceiveItemsDialog, EmptyState, shadcn/ui components, apiFetch wrapper
- **Data flow**: Server components fetch → Client components render + interact → Server action on filter/pagination
- **Access control**: Role + location filtering; backend enforces via RLS
- **No database writes**: All views are read-only; writes happen via existing receivePurchaseAction (Sprint 19)
