# Data Model: Módulo 3 — Proveedores + Órdenes de Compra

**Phase 1 output** | 2026-04-24

Los tipos viven en `@repo/types`. Las migraciones actualizan el schema de Prisma.

---

## Cambios al schema existente (migraciones necesarias)

### 1. Enum `PurchaseOrderStatus` — actualizar valores

```prisma
// Antes
enum PurchaseOrderStatus {
  DRAFT
  ISSUED
  RECEIVED
  CANCELLED
}

// Después
enum PurchaseOrderStatus {
  DRAFT
  SENT        // renombrado de ISSUED
  CONFIRMED   // nuevo
  RECEIVED    // conservado para Sprint 19
  CANCELLED
}
```

Migración SQL:
```sql
ALTER TYPE "PurchaseOrderStatus" RENAME VALUE 'ISSUED' TO 'SENT';
ALTER TYPE "PurchaseOrderStatus" ADD VALUE 'CONFIRMED' AFTER 'SENT';
```

### 2. Modelo `Supplier` — agregar campos opcionales

```prisma
model Supplier {
  id        String         @id @default(uuid())
  tenantId  String
  name      String
  initials  String?
  contact   String?
  phone     String?
  email     String?
  address   String?        // NUEVO
  notes     String?        // NUEVO
  status    SupplierStatus @default(ACTIVE)
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt

  products       SupplierProduct[]
  purchaseOrders PurchaseOrder[]    // NUEVA relación

  @@unique([tenantId, name])        // NUEVA — unicidad por tenant
}
```

### 3. Modelo `SupplierProduct` — agregar `leadTimeDays`

```prisma
model SupplierProduct {
  id           String   @id @default(uuid())
  tenantId     String
  productId    String
  supplierId   String
  price        Decimal  @db.Decimal(10, 2)
  leadTimeDays Int?     // NUEVO — días de entrega estimados
  updatedAt    DateTime @updatedAt

  product  Product  @relation(fields: [productId], references: [id])
  supplier Supplier @relation(fields: [supplierId], references: [id])

  @@unique([productId, supplierId])
}
```

### 4. Modelo `PurchaseOrder` — agregar `supplierId`, `total`, `expectedDate`

```prisma
model PurchaseOrder {
  id           String              @id @default(uuid())
  tenantId     String
  locationId   String
  supplierId   String              // NUEVO — FK a Supplier
  userId       String
  date         DateTime
  expectedDate DateTime?           // NUEVO — fecha esperada de entrega
  status       PurchaseOrderStatus @default(DRAFT)
  total        Decimal             @db.Decimal(10, 2) @default(0)  // NUEVO
  notes        String?
  createdAt    DateTime            @default(now())
  updatedAt    DateTime            @updatedAt

  items    PurchaseOrderItem[]
  supplier Supplier @relation(fields: [supplierId], references: [id])  // NUEVA relación
}
```

---

## Entidades del frontend (Response shapes)

### `SupplierResponse`

```ts
// @repo/types — SupplierResponseSchema (nuevo)
{
  id: string
  tenantId: string
  name: string
  initials: string | null
  contact: string | null
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  status: 'ACTIVE' | 'INACTIVE'
  createdAt: Date
  updatedAt: Date
}
```

### `SupplierProductResponse`

```ts
// @repo/types — SupplierProductResponseSchema (nuevo)
{
  id: string
  tenantId: string
  supplierId: string
  productId: string
  price: string          // Decimal como string, ej. "125.50"
  leadTimeDays: number | null
  updatedAt: Date
  // Desnormalizado para display
  productName: string
  productBrand: string | null
  productCategory: string | null
}
```

### `PurchaseOrderResponse`

```ts
// @repo/types — PurchaseOrderResponseSchema (nuevo)
{
  id: string
  tenantId: string
  locationId: string
  locationName: string | null
  supplierId: string
  supplierName: string
  userId: string
  date: Date
  expectedDate: Date | null
  status: 'DRAFT' | 'SENT' | 'CONFIRMED' | 'CANCELLED'
  total: string            // Decimal como string
  notes: string | null
  createdAt: Date
  updatedAt: Date
}
```

### `PurchaseOrderDetailResponse`

Extiende `PurchaseOrderResponse` con:

```ts
{
  items: PurchaseOrderItemResponse[]
}
```

### `PurchaseOrderItemResponse`

```ts
// @repo/types — PurchaseOrderItemResponseSchema (nuevo)
{
  id: string
  purchaseOrderId: string
  productId: string
  productName: string
  productBrand: string | null
  quantity: number
  unitPrice: string        // Decimal como string
  subtotal: string         // quantity * unitPrice, calculado y persistido
}
```

---

## DTOs de escritura (schemas en `@repo/types`)

### `CreateSupplierSchema`

```ts
z.object({
  name: z.string().min(1).max(200),
  initials: z.string().max(10).optional(),
  contact: z.string().max(200).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email().optional(),
  address: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
})
```

### `UpdateSupplierSchema`

```ts
CreateSupplierSchema.partial().extend({
  status: SupplierStatusSchema.optional(),
})
```

### `CreateSupplierProductSchema`

```ts
z.object({
  productId: z.string().uuid(),
  price: z.number().positive(),
  leadTimeDays: z.number().int().min(0).optional(),
})
```

### `UpdateSupplierProductSchema`

```ts
z.object({
  price: z.number().positive().optional(),
  leadTimeDays: z.number().int().min(0).nullable().optional(),
})
```

### `CreatePurchaseOrderSchema`

```ts
z.object({
  supplierId: z.string().uuid(),
  locationId: z.string().uuid(),
  expectedDate: z.coerce.date().optional(),
  notes: z.string().max(1000).optional(),
})
```

### `AddPurchaseOrderItemSchema`

```ts
z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1),
  unitPrice: z.number().positive(),
})
```

### `UpdatePurchaseOrderItemSchema`

```ts
z.object({
  quantity: z.number().int().min(1).optional(),
  unitPrice: z.number().positive().optional(),
})
```

### `UpdatePurchaseOrderStatusSchema`

```ts
z.object({
  status: z.enum(['SENT', 'CONFIRMED', 'CANCELLED']),
})
```

---

## Flujo de estados `PurchaseOrder`

```
DRAFT ──► SENT ──► CONFIRMED
  │         │
  └─────────┴──► CANCELLED
```

- `DRAFT → SENT`: requiere al menos un ítem; bloquea edición de ítems
- `SENT → CONFIRMED`: proveedor aceptó el pedido
- `DRAFT | SENT → CANCELLED`: cancelación permitida
- `CONFIRMED → *`: no hay transición disponible en Sprint 17/18 (RECEIVED es Sprint 19)

---

## Listas paginadas

Todos los endpoints de lista retornan:

```ts
{
  data: T[]
  total: number
  page: number
  limit: number
}
```

---

## Parámetros de query

### Suppliers (`SupplierQuerySchema`)
- `page`, `limit` (default 20)
- `search` — búsqueda por nombre
- `includeInactive` — boolean, default false

### Purchase Orders (`PurchaseOrderQuerySchema`)
- `page`, `limit` (default 20)
- `supplierId` — filtro por proveedor
- `locationId` — filtro por sucursal
- `status` — filtro por estado
- `search` — búsqueda por notas o nombre de proveedor

---

## RLS — tablas que necesitan políticas

| Tabla | `tenantId` directo | Política |
|---|---|---|
| `Supplier` | ✓ | SELECT/INSERT/UPDATE WHERE tenantId = current_tenant |
| `SupplierProduct` | ✓ | SELECT/INSERT/UPDATE/DELETE WHERE tenantId = current_tenant |
| `PurchaseOrder` | ✓ | SELECT/INSERT/UPDATE WHERE tenantId = current_tenant |
| `PurchaseOrderItem` | ✗ (via JOIN) | Sin RLS propio — acceso controlado vía PurchaseOrder |
