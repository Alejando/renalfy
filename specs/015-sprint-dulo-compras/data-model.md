# Data Model: Sprint 19 — Compras + Movimientos de Inventario

**Feature**: 015-sprint-dulo-compras  
**Date**: 2026-04-28

---

## Cambios al schema Prisma

### 1. Enum PurchaseOrderStatus — agregar COMPLETED y CLOSED

**Archivo**: `apps/api/prisma/schema.prisma`

```prisma
enum PurchaseOrderStatus {
  DRAFT
  SENT
  CONFIRMED
  RECEIVED
  COMPLETED   // ← NUEVO: 100% recibido automáticamente
  CLOSED      // ← NUEVO: cierre manual con saldo pendiente
  CANCELLED
}
```

**Impacto en tipos**: `packages/types/src/enums.ts`
```ts
export const PurchaseOrderStatusSchema = z.enum([
  'DRAFT', 'SENT', 'CONFIRMED', 'RECEIVED', 'COMPLETED', 'CLOSED', 'CANCELLED',
]);
```

---

### 2. PurchaseOrderItem — agregar unitsPerPackage

```prisma
model PurchaseOrderItem {
  id              String   @id @default(uuid())
  purchaseOrderId String
  productId       String
  quantity        Int                          // cantidad ordenada (en empaques)
  unitsPerPackage Int      @default(1)         // ← NUEVO: unidades individuales por empaque
  unitPrice       Decimal  @db.Decimal(10, 2)
  subtotal        Decimal  @db.Decimal(10, 2)
  createdAt       DateTime @default(now())

  purchaseOrder PurchaseOrder @relation(fields: [purchaseOrderId], references: [id])
  product       Product       @relation(fields: [productId], references: [id])
}
```

**Regla de negocio**: `unitsPerPackage >= 1`. Validado en Zod (AddPurchaseOrderItemSchema) y en DB (check constraint implícito vía Int @default(1)).

---

### 3. Purchase — agregar locationId y purchaseOrderId

```prisma
model Purchase {
  id              String   @id @default(uuid())
  tenantId        String
  locationId      String                       // ← NUEVO: sucursal que recibe
  userId          String
  supplierId      String
  purchaseOrderId String                       // ← NUEVO: orden de compra de origen
  date            DateTime
  amount          Decimal  @db.Decimal(10, 2)
  notes           String?
  createdAt       DateTime @default(now())

  items         PurchaseItem[]
  purchaseOrder PurchaseOrder @relation(fields: [purchaseOrderId], references: [id])

  @@index([tenantId, date])
  @@index([locationId])
  @@index([purchaseOrderId])
}
```

---

### 4. PurchaseItem — reestructurar campos

```prisma
model PurchaseItem {
  id               String   @id @default(uuid())
  purchaseId       String
  productId        String
  quantity         Int                          // cantidad ordenada (en empaques, de PurchaseOrderItem)
  quantityReceived Int                          // ← NUEVO: cantidad efectivamente recibida (empaques)
  unitsPerPackage  Int      @default(1)         // ← NUEVO: factor de conversión empaque→unidad
  unitPrice        Decimal  @db.Decimal(10, 2)  // ← RENOMBRADO desde price
  tax              Decimal  @db.Decimal(10, 2)  @default(0)
  subtotal         Decimal  @db.Decimal(10, 2)  // ← NUEVO: quantityReceived × unitPrice
  createdAt        DateTime @default(now())

  purchase Purchase @relation(fields: [purchaseId], references: [id], onDelete: Cascade)

  @@index([purchaseId])
}
```

**Nota**: `packageQty Int?` se elimina (campo legado redundante con `unitsPerPackage`).

**Cálculos**:
- `subtotal = quantityReceived × unitPrice` (en empaques, excluye tax)
- `stockDelta = quantityReceived × unitsPerPackage` (unidades individuales)
- `Purchase.amount = SUM(subtotal + tax)` para todos los ítems

---

### 5. InventoryMovement — agregar reference

```prisma
model InventoryMovement {
  id         String       @id @default(uuid())
  tenantId   String
  locationId String
  userId     String
  date       DateTime
  type       MovementType
  reference  String?                           // ← NUEVO: "PURCHASE-{purchaseId}"
  notes      String?
  createdAt  DateTime     @default(now())

  items InventoryMovementItem[]

  @@index([tenantId, locationId, date])
  @@index([tenantId, date])
}
```

---

### 6. InventoryMovementItem — sin cambios

```prisma
model InventoryMovementItem {
  id                  String @id @default(uuid())
  inventoryMovementId String
  productId           String
  quantity            Int    // siempre en unidades individuales (ya convertido)

  inventoryMovement InventoryMovement @relation(
    fields: [inventoryMovementId], references: [id], onDelete: Cascade
  )

  @@index([inventoryMovementId])
}
```

---

## Estado completo de PurchaseOrder (lifecycle)

```
DRAFT ──────────────────────────────────────────┐
  │                                             │
  ▼                                             │
SENT ──────────────────────────────────────────►│
  │                                             │
  ▼                                             │
CONFIRMED ─────────────────────────────────────►│ CANCELLED
  │ (primera recepción via POST /purchases)     │
  ▼                                             │
RECEIVED ───────────────────────────────────────┘
  │                              │
  │ [auto: 100% recibido]        │ [manual: POST /purchase-orders/:id/close]
  ▼                              ▼
COMPLETED                      CLOSED
(estado final)               (estado final)
```

**Reglas de transición**:
| Desde | Hacia | Disparador |
|---|---|---|
| CONFIRMED | RECEIVED | Primera recepción (purchases service interno) |
| RECEIVED | COMPLETED | Suma acumulada = 100% (purchases service interno) |
| RECEIVED | CLOSED | Acción manual OWNER/ADMIN |
| CONFIRMED | CANCELLED | Endpoint updateStatus (sin recepciones) |
| DRAFT | SENT | Endpoint updateStatus |
| SENT | CONFIRMED | Endpoint updateStatus |
| SENT | CANCELLED | Endpoint updateStatus |

---

## Migrations

### Migración 1: Sprint 19 schema changes

**Nombre**: `20260428_sprint19_purchases_inventory`

```sql
-- Agregar valores al enum PurchaseOrderStatus
ALTER TYPE "PurchaseOrderStatus" ADD VALUE 'COMPLETED';
ALTER TYPE "PurchaseOrderStatus" ADD VALUE 'CLOSED';

-- PurchaseOrderItem: agregar unitsPerPackage
ALTER TABLE "PurchaseOrderItem" ADD COLUMN "unitsPerPackage" INTEGER NOT NULL DEFAULT 1;

-- Purchase: agregar locationId y purchaseOrderId
ALTER TABLE "Purchase" ADD COLUMN "locationId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Purchase" ADD COLUMN "purchaseOrderId" TEXT NOT NULL DEFAULT '';
CREATE INDEX "Purchase_tenantId_date_idx" ON "Purchase"("tenantId", "date");
CREATE INDEX "Purchase_locationId_idx" ON "Purchase"("locationId");
CREATE INDEX "Purchase_purchaseOrderId_idx" ON "Purchase"("purchaseOrderId");

-- PurchaseItem: reestructurar campos
ALTER TABLE "PurchaseItem" RENAME COLUMN "price" TO "unitPrice";
ALTER TABLE "PurchaseItem" ADD COLUMN "quantityReceived" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PurchaseItem" ADD COLUMN "unitsPerPackage" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "PurchaseItem" ADD COLUMN "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "PurchaseItem" DROP COLUMN "packageQty";
CREATE INDEX "PurchaseItem_purchaseId_idx" ON "PurchaseItem"("purchaseId");

-- InventoryMovement: agregar reference e índices
ALTER TABLE "InventoryMovement" ADD COLUMN "reference" TEXT;
CREATE INDEX "InventoryMovement_tenantId_locationId_date_idx" ON "InventoryMovement"("tenantId", "locationId", "date");
CREATE INDEX "InventoryMovement_tenantId_date_idx" ON "InventoryMovement"("tenantId", "date");

-- InventoryMovementItem: agregar índice
CREATE INDEX "InventoryMovementItem_inventoryMovementId_idx" ON "InventoryMovementItem"("inventoryMovementId");
```

**Nota**: Los defaults vacíos en `locationId` y `purchaseOrderId` son solo para la migración (no hay registros existentes en prod). Se limpian con una segunda migración si fuera necesario.

---

## RLS Policies

Las tablas `Purchase` e `InventoryMovement` ya tienen `tenantId` y quedan cubiertas por las políticas RLS genéricas que aplican `current_tenant_id()`. No se requieren políticas RLS adicionales para este sprint.

Las tablas `PurchaseItem` e `InventoryMovementItem` no tienen `tenantId` directo — RLS se garantiza vía la transacción con `set_config` que filtra los registros padre antes de hacer joins.

---

## Zod Schemas a crear

**Archivo**: `packages/types/src/purchases.schemas.ts` (nuevo)

Schemas a definir:
- `ReceivePurchaseItemSchema` — línea de recepción
- `ReceivePurchaseOrderSchema` — body de POST /purchases
- `ClosePurchaseOrderSchema` — body de POST /purchase-orders/:id/close
- `PurchaseItemResponseSchema` — respuesta de ítem
- `PurchaseResponseSchema` — respuesta de compra (lista)
- `PurchaseDetailResponseSchema` — respuesta de compra (detalle con ítems)
- `PurchaseQuerySchema` — query params de GET /purchases
- `PaginatedPurchasesResponseSchema`
- `InventoryMovementItemResponseSchema`
- `InventoryMovementResponseSchema`
- `InventoryMovementDetailResponseSchema`
- `InventoryMovementQuerySchema`
- `PaginatedInventoryMovementsResponseSchema`

También actualizar `AddPurchaseOrderItemSchema` en `packages/types/src/purchase-orders.schemas.ts` para incluir `unitsPerPackage`.
