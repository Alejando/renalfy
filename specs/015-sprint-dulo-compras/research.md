# Research: Sprint 19 — Compras + Movimientos de Inventario

**Feature**: 015-sprint-dulo-compras  
**Date**: 2026-04-28

---

## 1. Estado actual del schema Prisma

### Decision
Todos los modelos objetivo ya existen en el schema. Se requieren **únicamente cambios aditivos** (nuevos campos, nuevos valores de enum). No se elimina ni renombra ningún campo existente para preservar backward compatibility con migraciones previas — excepto `PurchaseItem.price` que se renombra a `unitPrice` para consistencia con el resto del codebase.

### Campos actuales vs. campos requeridos

| Modelo | Campo actual | Estado |
|---|---|---|
| `PurchaseOrder` | `status: PurchaseOrderStatus` | Necesita nuevos valores en enum |
| `PurchaseOrderItem` | Sin `unitsPerPackage` | **Agregar** `unitsPerPackage Int @default(1)` |
| `Purchase` | Sin `locationId` | **Agregar** `locationId String` |
| `Purchase` | Sin `purchaseOrderId` | **Agregar** `purchaseOrderId String` |
| `PurchaseItem` | `price Decimal` | **Renombrar** a `unitPrice` |
| `PurchaseItem` | Sin `quantityReceived` | **Agregar** `quantityReceived Int` |
| `PurchaseItem` | Sin `unitsPerPackage` | **Agregar** `unitsPerPackage Int @default(1)` |
| `PurchaseItem` | Sin `subtotal` | **Agregar** `subtotal Decimal @db.Decimal(10,2)` |
| `PurchaseItem` | `packageQty Int?` | **Eliminar** (campo legado no usado) |
| `InventoryMovement` | Sin `reference` | **Agregar** `reference String?` |

### Rationale
- `PurchaseOrderItem.unitsPerPackage` es el factor de conversión empaque→unidad definido por línea de orden. Se define aquí (en la orden) para que el UI lo pueda pre-rellenar y el servicio de recepción lo pueda leer sin depender del body del request.
- `Purchase.purchaseOrderId` vincula cada recepción a su orden de origen para poder calcular totales acumulados y detectar cuando se alcanzó el 100%.
- `PurchaseItem.price` → `unitPrice`: el nombre `price` era ambiguo. Todo el módulo de purchase-orders usa `unitPrice`.

---

## 2. Nuevo enum PurchaseOrderStatus

### Decision
Agregar `COMPLETED` y `CLOSED` al enum en Prisma schema y en `@repo/types/src/enums.ts`.

```prisma
enum PurchaseOrderStatus {
  DRAFT
  SENT
  CONFIRMED
  RECEIVED
  COMPLETED  // NEW — 100% recibido automáticamente
  CLOSED     // NEW — cierre manual con saldo pendiente
  CANCELLED
}
```

```ts
// packages/types/src/enums.ts
export const PurchaseOrderStatusSchema = z.enum([
  'DRAFT', 'SENT', 'CONFIRMED', 'RECEIVED', 'COMPLETED', 'CLOSED', 'CANCELLED',
]);
```

### Rationale
Los estados finales claros evitan órdenes "zombie" en RECEIVED indefinidamente. COMPLETED (auto) y CLOSED (manual) tienen semántica diferente: COMPLETED significa "todo llegó", CLOSED significa "se aceptó el faltante".

---

## 3. ALLOWED_TRANSITIONS en purchase-orders.service.ts

### Decision

```ts
const ALLOWED_TRANSITIONS: TransitionMap = {
  DRAFT:     ['SENT', 'CANCELLED'],
  SENT:      ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['CANCELLED'],          // RECEIVED lo hace purchases service internamente
  RECEIVED:  ['CLOSED'],             // cierre manual con saldo pendiente
  COMPLETED: [],                     // estado final
  CLOSED:    [],                     // estado final
  CANCELLED: [],                     // estado final
};
```

La transición `CONFIRMED → RECEIVED` y `RECEIVED → COMPLETED` son **internas** al servicio de purchases — no expuestas vía `updateStatus`. El endpoint `POST /purchase-orders/:id/close` usa directamente `tx.purchaseOrder.update({ data: { status: 'CLOSED' } })` sin pasar por `ALLOWED_TRANSITIONS`, ya que es una acción específica con sus propias pre-condiciones.

### Rationale
Separar transiciones internas (disparadas por compras) de transiciones externas (disparadas por el usuario) simplifica el flujo y previene que un usuario llame `/purchase-orders/:id/status` para marcar RECEIVED manualmente, saltándose la lógica de stock.

---

## 4. Lógica de auto-transición a COMPLETED

### Decision
Al final de cada recepción, el servicio de purchases calcula si **todos los ítems de la orden** tienen `sum(quantityReceived) >= PurchaseOrderItem.quantity`. Si es así, transiciona la orden a COMPLETED en la misma transacción.

```ts
// Pseudocódigo
const orderItems = await tx.purchaseOrderItem.findMany({
  where: { purchaseOrderId },
});

const allPurchaseItems = await tx.purchaseItem.findMany({
  where: { purchase: { purchaseOrderId } },
});

const isComplete = orderItems.every(orderItem => {
  const totalReceived = allPurchaseItems
    .filter(pi => pi.productId === orderItem.productId)
    .reduce((sum, pi) => sum + pi.quantityReceived, 0);
  return totalReceived >= orderItem.quantity;
});

const newStatus = isComplete ? 'COMPLETED' : 'RECEIVED';
await tx.purchaseOrder.update({ where: { id: purchaseOrderId }, data: { status: newStatus } });
```

### Alternativas consideradas
- Guardar `totalReceivedByItem` en PurchaseOrderItem como campo desnormalizado → descartado por complejidad innecesaria. La query es simple y se ejecuta dentro de la transacción.
- Evento async post-commit → descartado por inconsistencia potencial si el evento falla.

---

## 5. Validación acumulada de cantidad

### Decision
Antes de crear los `PurchaseItem`, el servicio valida que para cada ítem del request:
```
sum(PurchaseItem.quantityReceived WHERE productId = X AND purchase.purchaseOrderId = orderId) + dto.quantityReceived
  <= PurchaseOrderItem.quantity WHERE productId = X AND purchaseOrderId = orderId
```

La consulta se hace **dentro de la transacción** para evitar race conditions con recepciones concurrentes.

### Rationale
La validación dentro de la transacción garantiza que si dos usuarios registran recepciones simultáneas, el segundo recibirá un error en lugar de inflar el stock. PostgreSQL serializa las transacciones en la misma fila via row-level locking en el UPDATE de LocationStock.

---

## 6. Upsert de LocationStock

### Decision
Usar `findFirst` + `create`/`update` dentro de la transacción (en lugar de `upsert`) porque `LocationStock` tiene `@@unique([locationId, productId])` que permite el pattern. Los valores iniciales al crear son:

```ts
await tx.locationStock.create({
  data: {
    tenantId,
    locationId,
    productId,
    quantity: stockDelta,
    minStock: 0,
    alertLevel: 0,
  },
});
```

`minStock` y `alertLevel` se configuran en otro flujo (settings de producto). La creación automática los inicializa en 0 (sin alerta).

---

## 7. RLS y transacciones en purchases service

### Decision
Todos los métodos del `PurchasesService` que hacen queries múltiples usan `$transaction` con `set_config` al inicio:

```ts
await this.prisma.$transaction(async (tx) => {
  await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
  // todas las queries aquí
});
```

Esto garantiza que RLS se aplique correctamente bajo connection pooling (mismo patrón que `PurchaseOrdersService.findOne`).

---

## 8. Endpoint de cierre manual (closePurchaseOrder)

### Decision
Nuevo endpoint en `PurchaseOrdersController`:
- `POST /api/purchase-orders/:id/close` — transiciona a CLOSED
- Solo válido para órdenes en estado RECEIVED
- Requiere roles OWNER o ADMIN (MANAGER no puede cerrar con saldo pendiente)
- Body opcional: `{ notes?: string }`

### Rationale
Separar el cierre manual como endpoint propio (en lugar de reutilizar el endpoint de status) da claridad semántica y permite validaciones específicas (solo RECEIVED → CLOSED, solo OWNER/ADMIN).

---

## 9. Relaciones en PurchaseItem para validación acumulada

### Decision
`PurchaseItem` necesita poder consultarse por `purchaseOrderId` para la validación acumulada. Se hace via JOIN:

```ts
tx.purchaseItem.findMany({
  where: {
    purchase: { purchaseOrderId: orderId }
  }
})
```

Esto requiere que `Purchase` tenga `purchaseOrderId` (ya confirmado en decisión #1).

---

## 10. Índices de performance

### Decision
Agregar índices para los queries más frecuentes:

```prisma
model Purchase {
  @@index([tenantId, date])
  @@index([locationId])
  @@index([purchaseOrderId])
}

model PurchaseItem {
  @@index([purchaseId])
}

model InventoryMovement {
  @@index([tenantId, locationId, date])
  @@index([tenantId, date])
}
```

Estos índices soportan los filtros de listado (por sucursal, por fecha) que deben responder en <3s para 10,000 registros.
