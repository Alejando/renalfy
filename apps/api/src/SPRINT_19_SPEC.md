# Spec: Sprint 19 — Módulo 3 — Compras + Movimientos de Inventario (Backend)

**Fecha:** 2026-04-27  
**Sprint:** 19  
**Módulo:** Inventario (compras y movimientos)  
**Status:** Propuesto

---

## Resumen ejecutivo

Sprint 19 implementa el ciclo de **recepción de mercancía** (`Purchase` + `PurchaseItem`) y el registro de **movimientos de inventario** (`InventoryMovement` + `InventoryMovementItem`). Cuando una orden de compra en estado `CONFIRMED` se recibe, se crea un `Purchase` que actualiza el stock en `LocationStock` de forma atómica. Los movimientos de inventario registran todo cambio de stock para auditoría y trazabilidad.

---

## Alcance

### Incluido
1. **Recepción de mercancía** — transición `PurchaseOrder.CONFIRMED → RECEIVED`
   - Creación de `Purchase` + `PurchaseItem` con cantidades recibidas (parciales permitidas)
   - Conversión de empaque a unidades de stock (usando `unitsPerPackage`)
   - Actualización atómica de `LocationStock.quantity` en unidades individuales
   - Validación de cantidades (no puede recibirse más que lo ordenado)
   - Cálculo de monto total de la compra

2. **Movimientos de inventario** — historial de cambios
   - Modelo `InventoryMovement` + `InventoryMovementItem`
   - Tipos de movimiento: `IN` (entrada por compra, entrada manual), `OUT` (salida por venta futura, ajuste)
   - Creación automática de movimiento `IN` al recibir compra
   - Endpoints de lectura: listar y filtrar movimientos por sucursal/producto

3. **Endpoints API**
   - `POST /api/purchases` — recibir una orden de compra (crear `Purchase`)
   - `GET /api/purchases` — listar compras con filtros
   - `GET /api/purchases/:id` — detalle de compra con ítems
   - `GET /api/inventory-movements` — listar movimientos con filtros
   - `GET /api/inventory-movements/:id` — detalle de movimiento

4. **Roles y acceso**
   - `OWNER` / `ADMIN` — crear/ver compras (tenant-wide)
   - `MANAGER` — crear/ver compras de su sucursal
   - `STAFF` — solo lectura de compras (sin acceso)

5. **Cumplimiento regulatorio**
   - RLS en todas las tablas (`tenantId` + `locationId` para MANAGER/STAFF)
   - Audit logs para CREATE de `Purchase` e `InventoryMovement`
   - Transacciones atómicas para garantizar consistencia stock

### Explícitamente fuera de alcance
- Devoluciones de compra (generaría movimiento `OUT` — será en Sprint posterior)
- Ajustes de stock manuales (fuera de compra/venta — será en Sprint posterior)
- Reportes de movimientos (será en Sprint 30+)
- Integración con facturación/CFDI (será en Sprint posterior)
- Alertas de stock bajo (será integrado en Sprint posterior)

---

## Modelo de datos

### Tablas afectadas

Todas las tablas ya existen en el schema actual. Se validarán campos y relaciones:

#### `Purchase` (recepción de mercancía)
```prisma
model Purchase {
  id         String         @id @default(uuid())
  tenantId   String         // RLS: filtro by tenantId
  locationId String         // opcional — se deduce de PurchaseOrder (agregar)
  userId     String         // quién registró la recepción
  supplierId String         // de dónde proviene
  date       DateTime       // fecha de recepción
  amount     Decimal(10,2)  // monto total (suma de ítems con tax)
  notes      String?
  createdAt  DateTime

  items      PurchaseItem[]
  
  @@index([tenantId, createdAt])
  @@index([locationId])
}
```

**Cambios necesarios:**
- Agregar `locationId` explícitamente (actualmente falta)
- Agregar `@@index([tenantId, createdAt])` para queries rápidas
- Asegurar que `supplierId` tiene foreign key

#### `PurchaseItem` (líneas de la recepción)
```prisma
model PurchaseItem {
  id               String   @id @default(uuid())
  purchaseId       String
  productId        String
  quantity         Int      // cantidad ordenada en empaque (de PurchaseOrderItem)
  quantityReceived Int      // cantidad efectivamente recibida en empaque (parciales)
  unitsPerPackage  Int      @default(1) // unidades por empaque — convierte a stock individual
  unitPrice        Decimal  @db.Decimal(10, 2) // precio unitario (por empaque)
  tax              Decimal  @db.Decimal(10, 2) @default(0)
  subtotal         Decimal  @db.Decimal(10, 2) // quantityReceived * unitPrice (excluye tax)
  createdAt        DateTime

  purchase         Purchase @relation(fields: [purchaseId], references: [id], onDelete: Cascade)
  // productId sin FK porque es histórico — se registra el ID aunque el producto se borre
  
  @@index([purchaseId])
}
```

**Cambios necesarios:**
- Agregar `quantityReceived` para soportar recepciones parciales
- Cambiar `quantity` a "cantidad ordenada en empaque"
- Agregar `subtotal` (calculado = `quantityReceived * unitPrice`)
- **Agregar `unitsPerPackage`** — factor de conversión de empaque a unidad de stock (editable por línea de orden)
- Renombrar `price` a `unitPrice` para claridad

#### `InventoryMovement` (historial de cambios)
```prisma
model InventoryMovement {
  id         String       @id @default(uuid())
  tenantId   String       // RLS
  locationId String       // sucursal dónde ocurre el movimiento
  userId     String       // quién lo registra
  date       DateTime     // fecha del movimiento
  type       MovementType // IN | OUT
  reference  String?      // "PURCHASE-{purchaseId}" para trazabilidad
  notes      String?
  createdAt  DateTime     @default(now())

  items      InventoryMovementItem[]
  
  @@index([tenantId, locationId, createdAt])
  @@index([tenantId, createdAt])
}
```

**Cambios necesarios:**
- Agregar `reference` para vincular movimiento a la compra/venta que lo causó
- Agregar `@@index` para queries rápidas

#### `InventoryMovementItem` (líneas del movimiento)
```prisma
model InventoryMovementItem {
  id                  String @id @default(uuid())
  inventoryMovementId String
  productId           String
  quantity            Int    // siempre positivo, el tipo (IN/OUT) define dirección
  
  inventoryMovement   InventoryMovement @relation(fields: [inventoryMovementId], references: [id], onDelete: Cascade)
  
  @@index([inventoryMovementId])
}
```

Sin cambios necesarios, estructura correcta.

---

## Zod Schemas (@repo/types)

Crear nuevo archivo: `packages/types/src/purchases.schemas.ts`

```typescript
import { z } from 'zod';
import { MovementTypeSchema } from './enums.js';

// ────────────────────────────────────────────────────────────────────────
// Purchase schemas
// ────────────────────────────────────────────────────────────────────────

export const ReceivePurchaseItemSchema = z.object({
  purchaseOrderItemId: z.string().uuid(),
  productId: z.string().uuid(),
  quantityReceived: z
    .number()
    .int()
    .min(1, 'La cantidad recibida debe ser al menos 1'),
  unitsPerPackage: z
    .number()
    .int()
    .min(1, 'Las unidades por empaque deben ser al menos 1')
    .default(1),
  unitPrice: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Formato de precio inválido'),
  tax: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Formato de impuesto inválido')
    .default('0')
    .optional(),
});

export const ReceivePurchaseOrderSchema = z.object({
  purchaseOrderId: z.string().uuid(),
  locationId: z.string().uuid(),
  items: z
    .array(ReceivePurchaseItemSchema)
    .min(1, 'Debe recibir al menos un ítem'),
  notes: z.string().optional(),
});

export const PurchaseItemResponseSchema = z.object({
  id: z.string().uuid(),
  purchaseId: z.string().uuid(),
  productId: z.string().uuid(),
  quantity: z.number().int(), // ordenada (en empaque)
  quantityReceived: z.number().int(), // recibida (en empaque)
  unitsPerPackage: z.number().int(), // factor de conversión
  unitPrice: z.string(),
  tax: z.string(),
  subtotal: z.string(),
  createdAt: z.coerce.date(),
  product: z.object({
    id: z.string().uuid(),
    name: z.string(),
    brand: z.string().nullable(),
  }),
});

export const PurchaseResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  locationId: z.string().uuid(),
  userId: z.string().uuid(),
  supplierId: z.string().uuid(),
  date: z.coerce.date(),
  amount: z.string(),
  notes: z.string().nullable(),
  supplierName: z.string(),
  locationName: z.string(),
  itemCount: z.number().int(),
  createdAt: z.coerce.date(),
});

export const PurchaseDetailResponseSchema = PurchaseResponseSchema.extend({
  items: z.array(PurchaseItemResponseSchema),
  supplier: z.object({
    id: z.string().uuid(),
    name: z.string(),
    contact: z.string().nullable(),
    phone: z.string().nullable(),
    email: z.string().nullable(),
  }),
  location: z.object({
    id: z.string().uuid(),
    name: z.string(),
  }),
});

export const PurchaseQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  supplierId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  search: z.string().optional(),
});

export const PaginatedPurchasesResponseSchema = z.object({
  data: z.array(PurchaseResponseSchema),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
});

// ────────────────────────────────────────────────────────────────────────
// InventoryMovement schemas
// ────────────────────────────────────────────────────────────────────────

export const InventoryMovementItemResponseSchema = z.object({
  id: z.string().uuid(),
  inventoryMovementId: z.string().uuid(),
  productId: z.string().uuid(),
  quantity: z.number().int(),
  product: z.object({
    id: z.string().uuid(),
    name: z.string(),
    brand: z.string().nullable(),
  }),
});

export const InventoryMovementResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  locationId: z.string().uuid(),
  userId: z.string().uuid(),
  date: z.coerce.date(),
  type: MovementTypeSchema,
  reference: z.string().nullable(),
  notes: z.string().nullable(),
  itemCount: z.number().int(),
  createdAt: z.coerce.date(),
});

export const InventoryMovementDetailResponseSchema =
  InventoryMovementResponseSchema.extend({
    items: z.array(InventoryMovementItemResponseSchema),
  });

export const InventoryMovementQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  locationId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  type: MovementTypeSchema.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

export const PaginatedInventoryMovementsResponseSchema = z.object({
  data: z.array(InventoryMovementResponseSchema),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
});

// ────────────────────────────────────────────────────────────────────────
// Inferred types
// ────────────────────────────────────────────────────────────────────────

export type ReceivePurchaseItemDto = z.infer<
  typeof ReceivePurchaseItemSchema
>;
export type ReceivePurchaseOrderDto = z.infer<typeof ReceivePurchaseOrderSchema>;
export type PurchaseItemResponse = z.infer<typeof PurchaseItemResponseSchema>;
export type PurchaseResponse = z.infer<typeof PurchaseResponseSchema>;
export type PurchaseDetailResponse = z.infer<
  typeof PurchaseDetailResponseSchema
>;
export type PurchaseQuery = z.infer<typeof PurchaseQuerySchema>;
export type PaginatedPurchasesResponse = z.infer<
  typeof PaginatedPurchasesResponseSchema
>;

export type InventoryMovementItemResponse = z.infer<
  typeof InventoryMovementItemResponseSchema
>;
export type InventoryMovementResponse = z.infer<
  typeof InventoryMovementResponseSchema
>;
export type InventoryMovementDetailResponse = z.infer<
  typeof InventoryMovementDetailResponseSchema
>;
export type InventoryMovementQuery = z.infer<
  typeof InventoryMovementQuerySchema
>;
export type PaginatedInventoryMovementsResponse = z.infer<
  typeof PaginatedInventoryMovementsResponseSchema
>;
```

Agregar exportación en `packages/types/src/index.ts`:
```typescript
export * from './purchases.schemas.js';
```

---

## API Contract

### Endpoint 1: Recibir orden de compra (crear Purchase)

**Método:** `POST /api/purchases`

**Roles autorizados:** `OWNER`, `ADMIN`, `MANAGER`

**Guardias:**
- `JwtAuthGuard` — token válido
- `RolesGuard` — validar roles

**Body (DTO: `ReceivePurchaseOrderDto`):**
```json
{
  "purchaseOrderId": "uuid-de-orden",
  "locationId": "uuid-sucursal",
  "items": [
    {
      "purchaseOrderItemId": "uuid-item-orden",
      "productId": "uuid-producto",
      "quantityReceived": 10,
      "unitsPerPackage": 100,
      "unitPrice": "100.00",
      "tax": "5.00"
    }
  ],
  "notes": "Recibido completo"
}
```

**Notas:**
- `quantityReceived`: cajas/empaques recibidos (ej: 10)
- `unitsPerPackage`: unidades por empaque (ej: 100 unidades/caja)
- Stock se incrementa por: `10 × 100 = 1,000 unidades individuales`

**Response (201 Created):**
```json
{
  "id": "uuid-compra",
  "tenantId": "uuid-tenant",
  "locationId": "uuid-sucursal",
  "userId": "uuid-usuario",
  "supplierId": "uuid-proveedor",
  "date": "2026-04-27T15:30:00Z",
  "amount": "5050.00",
  "notes": "Recibido completo",
  "supplierName": "Proveedor XYZ",
  "locationName": "Sucursal Central",
  "itemCount": 1,
  "createdAt": "2026-04-27T15:30:00Z"
}
```

**Errores HTTP:**
- `400 Bad Request` — validación de DTO falla
- `403 Forbidden` — STAFF intenta recibir, o MANAGER intenta otra sucursal
- `404 Not Found` — PurchaseOrder no existe o no es del tenant/sucursal
- `422 Unprocessable Entity` — orden no está en `CONFIRMED`, cantidad recibida > cantidad ordenada
- `500 Internal Server Error` — fallo en transacción

### Endpoint 2: Listar compras

**Método:** `GET /api/purchases`

**Roles autorizados:** `OWNER`, `ADMIN`, `MANAGER`

**Query params (DTO: `PurchaseQueryDto`):**
```
?page=1&limit=20&supplierId=uuid&locationId=uuid&dateFrom=2026-01-01&dateTo=2026-12-31&search=texto
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid-compra",
      "tenantId": "uuid-tenant",
      "locationId": "uuid-sucursal",
      "userId": "uuid-usuario",
      "supplierId": "uuid-proveedor",
      "date": "2026-04-27T15:30:00Z",
      "amount": "5050.00",
      "notes": "Recibido completo",
      "supplierName": "Proveedor XYZ",
      "locationName": "Sucursal Central",
      "itemCount": 1,
      "createdAt": "2026-04-27T15:30:00Z"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

**RLS:**
- `OWNER`/`ADMIN` — ven todas las compras del tenant
- `MANAGER` — ven solo compras de su `locationId` (aplicado en servicio)
- `STAFF` — `403 Forbidden`

### Endpoint 3: Detalle de compra

**Método:** `GET /api/purchases/:id`

**Roles autorizados:** `OWNER`, `ADMIN`, `MANAGER`

**Response (200 OK):**
```json
{
  "id": "uuid-compra",
  "tenantId": "uuid-tenant",
  "locationId": "uuid-sucursal",
  "userId": "uuid-usuario",
  "supplierId": "uuid-proveedor",
  "date": "2026-04-27T15:30:00Z",
  "amount": "5050.00",
  "notes": "Recibido completo",
  "supplierName": "Proveedor XYZ",
  "locationName": "Sucursal Central",
  "itemCount": 1,
  "createdAt": "2026-04-27T15:30:00Z",
  "items": [
    {
      "id": "uuid-item-compra",
      "purchaseId": "uuid-compra",
      "productId": "uuid-producto",
      "quantity": 10,
      "quantityReceived": 10,
      "unitsPerPackage": 100,
      "unitPrice": "100.00",
      "tax": "5.00",
      "subtotal": "1000.00",
      "createdAt": "2026-04-27T15:30:00Z",
      "product": {
        "id": "uuid-producto",
        "name": "Solución de diálisis",
        "brand": "Marca XYZ"
      }
    }
  ],
  "supplier": {
    "id": "uuid-proveedor",
    "name": "Proveedor XYZ",
    "contact": "Juan",
    "phone": "555-1234",
    "email": "contacto@prov.com"
  },
  "location": {
    "id": "uuid-sucursal",
    "name": "Sucursal Central"
  }
}
```

### Endpoint 4: Listar movimientos de inventario

**Método:** `GET /api/inventory-movements`

**Roles autorizados:** `OWNER`, `ADMIN`, `MANAGER`

**Query params (DTO: `InventoryMovementQueryDto`):**
```
?page=1&limit=20&locationId=uuid&productId=uuid&type=IN&dateFrom=2026-01-01&dateTo=2026-12-31
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid-movimiento",
      "tenantId": "uuid-tenant",
      "locationId": "uuid-sucursal",
      "userId": "uuid-usuario",
      "date": "2026-04-27T15:30:00Z",
      "type": "IN",
      "reference": "PURCHASE-uuid-compra",
      "notes": null,
      "itemCount": 1,
      "createdAt": "2026-04-27T15:30:00Z"
    }
  ],
  "total": 15,
  "page": 1,
  "limit": 20
}
```

### Endpoint 5: Detalle de movimiento

**Método:** `GET /api/inventory-movements/:id`

**Roles autorizados:** `OWNER`, `ADMIN`, `MANAGER`

**Response (200 OK):**
```json
{
  "id": "uuid-movimiento",
  "tenantId": "uuid-tenant",
  "locationId": "uuid-sucursal",
  "userId": "uuid-usuario",
  "date": "2026-04-27T15:30:00Z",
  "type": "IN",
  "reference": "PURCHASE-uuid-compra",
  "notes": null,
  "itemCount": 1,
  "createdAt": "2026-04-27T15:30:00Z",
  "items": [
    {
      "id": "uuid-item-movimiento",
      "inventoryMovementId": "uuid-movimiento",
      "productId": "uuid-producto",
      "quantity": 50,
      "product": {
        "id": "uuid-producto",
        "name": "Solución de diálisis",
        "brand": "Marca XYZ"
      }
    }
  ]
}
```

---

## Reglas de negocio

1. **Recepción parcial permitida:** Un `PurchaseOrderItem` puede recibirse en múltiples `Purchase` o con `quantityReceived < quantity`. No hay restricción de "todo o nada".

2. **Stock siempre en unidades individuales:** El stock en `LocationStock` se registra **únicamente en unidades individuales** (no en empaques). La conversión de empaque a unidad ocurre en el momento de la recepción.

3. **Conversión empaque → unidades:** `stock_delta = quantityReceived × unitsPerPackage`
   - Ejemplo: se compran 10 cajas de 100 productos, se reciben 10 → `stock_delta = 10 × 100 = 1,000 unidades`
   - Recepción parcial: se compran 10 cajas, llegan 7 → `stock_delta = 7 × 100 = 700 unidades`

4. **Variación por línea de orden:** El factor `unitsPerPackage` se especifica **por línea** (`PurchaseOrderItem`), no por producto ni por proveedor. Permite flexibilidad si la presentación varía.

5. **unitsPerPackage editable en el UI:** Cuando el usuario agrega un ítem a una orden de compra, especifica `unitsPerPackage`. Se puede pre-rellenar desde `SupplierProduct.unitsPerPackage` pero es siempre editable.

6. **Transición de estado automática:** Al crear un `Purchase`, la `PurchaseOrder` asociada cambia a `RECEIVED` automáticamente. Esto ocurre en la transacción atómica.

7. **Monto de compra = suma de ítems:** `Purchase.amount = SUM(PurchaseItem.subtotal + PurchaseItem.tax)`

8. **Stock se actualiza por ítem:** Cada `PurchaseItem.quantityReceived × unitsPerPackage` se suma a `LocationStock.quantity`. Si `LocationStock` no existe, se crea con `quantity = (quantityReceived × unitsPerPackage)`.

9. **Movimiento de inventario automático:** Al crear `Purchase`, se genera automáticamente un `InventoryMovement` de tipo `IN` con `reference = "PURCHASE-{purchaseId}"`. Los ítems del movimiento registran la cantidad **en unidades individuales** (ya convertida).

10. **Validación de cantidades:** `quantityReceived` no puede ser > `PurchaseOrderItem.quantity` (prevenir recibir más de lo pedido).

11. **Atomicidad:** Todas las operaciones (crear `Purchase`, actualizar `LocationStock`, crear `InventoryMovement`, cambiar `PurchaseOrder.status`) ocurren en una sola transacción. Si falla cualquiera, rollback total.

12. **Auditoría:** Se crean `AuditLog` para:
    - Acción `CREATE` en `Purchase` (resource = "Purchase")
    - Acción `CREATE` en `InventoryMovement` (resource = "InventoryMovement")

13. **RLS en lectura:** Todos los endpoints respetan el `tenantId` del usuario. Los MANAGERs solo ven compras/movimientos de su `locationId`.

14. **Usuario creador:** El `userId` en `Purchase` e `InventoryMovement` es el del JWT (`@CurrentUser()`).

15. **Nota sobre `Product.packageQty`:** El campo `packageQty` en el modelo `Product` no se usa en este cálculo. Es un campo legado que define una presentación fija por producto. El campo autoritativo para conversión de empaque a unidad es **`PurchaseOrderItem.unitsPerPackage`**, que varía por línea de orden.

---

## Flujo detallado de recepción

### Precondiciones
- `PurchaseOrder` existe con `id = purchaseOrderId`
- `PurchaseOrder.status == 'CONFIRMED'`
- `PurchaseOrder.locationId == locationId` en el request
- Para cada item en el request:
  - `PurchaseOrderItem` existe
  - `quantityReceived > 0`
  - `quantityReceived <= PurchaseOrderItem.quantity`
  - `unitPrice` es un decimal válido

### Paso 1: Validar precondiciones
```
Si PurchaseOrder no existe → 404 Not Found
Si PurchaseOrder.status != 'CONFIRMED' → 422 "La orden debe estar en estado CONFIRMED"
Si PurchaseOrder.locationId != locationId → 403 "No tienes acceso a esta sucursal"
Si hay ítem sin PurchaseOrderItem → 404 "Ítem de orden no encontrado"
Si quantityReceived > PurchaseOrderItem.quantity → 422 "No se puede recibir más de lo ordenado"
```

### Paso 2: Iniciar transacción

```typescript
await prisma.$transaction(async (tx) => {
  // Paso 3-7 aquí dentro
});
```

### Paso 3: Crear Purchase

```typescript
const purchase = await tx.purchase.create({
  data: {
    tenantId,
    locationId,
    userId,
    supplierId: purchaseOrder.supplierId,
    date: new Date(),
    amount: "0", // se actualiza en paso 5
    notes: dto.notes,
  },
});
```

### Paso 4: Crear PurchaseItems y calcular monto

```typescript
let totalAmount = 0;
const purchaseItems = [];

for (const dtoItem of dto.items) {
  const poItem = await tx.purchaseOrderItem.findUniqueOrThrow({
    where: { id: dtoItem.purchaseOrderItemId },
  });

  if (dtoItem.quantityReceived > poItem.quantity) {
    throw new UnprocessableEntityException(
      `Ítem ${dtoItem.productId}: no se puede recibir ${dtoItem.quantityReceived}, ordenado ${poItem.quantity}`,
    );
  }

  const subtotal = (
    parseFloat(dtoItem.unitPrice) * dtoItem.quantityReceived
  ).toFixed(2);
  const tax = parseFloat(dtoItem.tax || "0");
  const subtotalNum = parseFloat(subtotal);
  const itemTotal = subtotalNum + tax;
  totalAmount += itemTotal;

  const item = await tx.purchaseItem.create({
    data: {
      purchaseId: purchase.id,
      productId: dtoItem.productId,
      quantity: poItem.quantity, // cantidad ordenada (en empaque)
      quantityReceived: dtoItem.quantityReceived, // recibida (en empaque)
      unitsPerPackage: dtoItem.unitsPerPackage, // factor de conversión
      unitPrice: dtoItem.unitPrice,
      tax: dtoItem.tax || "0",
      subtotal,
    },
  });
  purchaseItems.push(item);
}

// Actualizar monto de Purchase
await tx.purchase.update({
  where: { id: purchase.id },
  data: { amount: totalAmount.toFixed(2) },
});
```

### Paso 5: Actualizar LocationStock

```typescript
for (const item of purchaseItems) {
  // Convertir empaque a unidades individuales
  const stockDelta = item.quantityReceived * item.unitsPerPackage;
  
  const existingStock = await tx.locationStock.findFirst({
    where: {
      locationId,
      productId: item.productId,
    },
  });

  if (existingStock) {
    await tx.locationStock.update({
      where: { id: existingStock.id },
      data: {
        quantity: existingStock.quantity + stockDelta,
      },
    });
  } else {
    await tx.locationStock.create({
      data: {
        tenantId,
        locationId,
        productId: item.productId,
        quantity: stockDelta,
        minStock: 0,
        alertLevel: 0,
      },
    });
  }
}
```

### Paso 6: Crear InventoryMovement automático

```typescript
const movement = await tx.inventoryMovement.create({
  data: {
    tenantId,
    locationId,
    userId,
    date: new Date(),
    type: 'IN',
    reference: `PURCHASE-${purchase.id}`,
    notes: dto.notes,
  },
});

// Crear items del movimiento (en unidades individuales)
for (const item of purchaseItems) {
  const stockDelta = item.quantityReceived * item.unitsPerPackage;
  await tx.inventoryMovementItem.create({
    data: {
      inventoryMovementId: movement.id,
      productId: item.productId,
      quantity: stockDelta,
    },
  });
}
```

### Paso 7: Cambiar PurchaseOrder a RECEIVED

```typescript
await tx.purchaseOrder.update({
  where: { id: purchaseOrderId },
  data: { status: 'RECEIVED' },
});
```

### Paso 8: Retornar respuesta (fuera de transacción)

```typescript
return buildPurchaseResponse(purchase, purchaseItems, supplier, location);
```

---

## Estructura de módulos NestJS

### Crear módulo `purchases`

```
src/purchases/
├── purchases.module.ts
├── purchases.controller.ts
├── purchases.service.ts
├── purchases.service.spec.ts
└── dto/
    ├── receive-purchase-order.dto.ts
    ├── purchase-query.dto.ts
```

### Crear módulo `inventory-movements`

```
src/inventory-movements/
├── inventory-movements.module.ts
├── inventory-movements.controller.ts
├── inventory-movements.service.ts
├── inventory-movements.service.spec.ts
└── dto/
    ├── inventory-movement-query.dto.ts
```

---

## Políticas RLS en PostgreSQL

Las políticas RLS deben aplicarse **automáticamente** por el interceptor `TenantInterceptor` que ya existe (usa `set_config`). No se crean políticas adicionales específicas para Sprint 19.

Sin embargo, asegurar que:

1. **Tabla `Purchase`:** tiene `tenantId`, RLS filtra `WHERE tenantId = current_tenant_id()`
2. **Tabla `InventoryMovement`:** tiene `tenantId`, RLS filtra `WHERE tenantId = current_tenant_id()`
3. **Tablas sin `tenantId` directo** (`PurchaseItem`, `InventoryMovementItem`): RLS mediante JOIN a tabla padre (si es necesario)

---

## Casos de prueba (TDD)

### Unit Tests (purchases.service.spec.ts)

1. **Recepción exitosa de orden completa**
   - Entrada: `PurchaseOrder` en `CONFIRMED`, ítems con `quantityReceived = quantity`
   - Esperado: `Purchase` creado, stock actualizado (en unidades individuales), movimiento creado, `PurchaseOrder` a `RECEIVED`

2. **Recepción con conversión empaque → unidades**
   - Entrada: `quantityReceived = 10`, `unitsPerPackage = 100`
   - Esperado: `LocationStock.quantity += 1000` (no 10)

3. **Recepción parcial con conversión**
   - Entrada: `quantityReceived = 7`, `unitsPerPackage = 100` (de 10 esperados)
   - Esperado: `LocationStock.quantity += 700` (no 7)

4. **Múltiples recepciones con conversión**
   - Entrada: dos llamadas: (5 cajas × 100) + (3 cajas × 100)
   - Esperado: stock final = 800 unidades

5. **Validación: quantityReceived > quantity**
   - Entrada: `quantityReceived > PurchaseOrderItem.quantity`
   - Esperado: `UnprocessableEntityException`

6. **Validación: unitsPerPackage inválido**
   - Entrada: `unitsPerPackage <= 0` o no es número
   - Esperado: Validación Zod falla

7. **Validación: orden no en CONFIRMED**
   - Entrada: `PurchaseOrder.status = 'DRAFT'`
   - Esperado: `UnprocessableEntityException`

8. **Validación: producto no existe en orden**
   - Entrada: `productId` no está en `PurchaseOrderItem`
   - Esperado: `NotFoundException`

9. **Cálculo de monto total**
   - Entrada: 3 ítems con `subtotal` y `tax`
   - Esperado: `Purchase.amount = sum(subtotal + tax)`

10. **LocationStock creada si no existe**
    - Entrada: primer recibo (10 cajas × 100 unidades)
    - Esperado: `LocationStock` creada con `quantity = 1000`

11. **LocationStock actualizada si existe**
    - Entrada: producto que ya tiene stock, recibe 5 cajas × 100 unidades
    - Esperado: `quantity` incrementado por 500

12. **Movimiento refleja unidades individuales**
    - Entrada: Recepción de 10 cajas × 100 unidades
    - Esperado: `InventoryMovementItem.quantity = 1000` (no 10)

13. **RLS: MANAGER solo ve su sucursal**
    - Entrada: MANAGER intenta obtener compra de otra sucursal
    - Esperado: `NotFoundException` o vacío en lista

### Unit Tests (inventory-movements.service.spec.ts)

1. **Listar movimientos del tenant**
   - Entrada: query vacía, 3 movimientos en el tenant
   - Esperado: todos retornados con paginación

2. **Filtrar por locationId**
   - Entrada: `locationId` específico, movimientos en 2 sucursales
   - Esperado: solo movimientos de esa sucursal

3. **Filtrar por type (IN/OUT)**
   - Entrada: `type = 'IN'`, movimientos mixtos
   - Esperado: solo `IN`

4. **Filtrar por rango de fechas**
   - Entrada: `dateFrom` y `dateTo`
   - Esperado: solo movimientos en rango

5. **Movimiento detallado con ítems**
   - Entrada: ID de movimiento existente
   - Esperado: todos los ítems incluidos con datos de producto

6. **RLS: MANAGER solo ve su sucursal**
   - Entrada: MANAGER lista movimientos
   - Esperado: solo movimientos de su `locationId`

### E2E Tests (purchases.e2e-spec.ts)

1. **Flujo completo: crear orden → confirmar → recibir**
   - 3 requests HTTP, transacción atómica
   - Validar stock final en unidades individuales

2. **Recepción con conversión empaque → unidades**
   - POST /purchases con 10 cajas × 100 unidades/caja
   - GET /purchases/:id → valida `unitsPerPackage = 100` en ítem
   - GET /inventory-movements → valida cantidad = 1000 unidades

3. **Recepción parcial múltiple con conversión**
   - 2 recepciones: 5 cajas (500 unidades) + 3 cajas (300 unidades)
   - Stock final = 800 unidades (no 8)

4. **Error: recibir con quantityReceived > quantity**
   - Esperado: 422 Unprocessable Entity

5. **Error: STAFF intenta recibir**
   - Esperado: 403 Forbidden

6. **Pagination en listado**
   - Múltiples compras, validar `page`, `limit`, `total`

### E2E Tests (inventory-movements.e2e-spec.ts)

1. **Movimiento creado automáticamente en recepción**
   - POST /purchases → GET /inventory-movements
   - Esperado: movimiento `IN` con `reference = "PURCHASE-{id}"`

2. **Listar con filtros**
   - Múltiples movimientos, filtrar por `locationId`, `type`, fecha

3. **Detalle de movimiento**
   - GET /inventory-movements/:id → incluye items con producto

---

## Cambios a archivos existentes

### 1. `prisma/schema.prisma`

Actualizar modelos:

```prisma
// Agregar locationId a Purchase
model Purchase {
  id         String   @id @default(uuid())
  tenantId   String
  locationId String   // NUEVO
  userId     String
  supplierId String
  date       DateTime
  amount     Decimal  @db.Decimal(10, 2)
  notes      String?
  createdAt  DateTime @default(now())

  items      PurchaseItem[]

  @@index([tenantId, createdAt])
  @@index([locationId])
}

// Actualizar PurchaseItem
model PurchaseItem {
  id               String   @id @default(uuid())
  purchaseId       String
  productId        String
  quantity         Int      // ordenada (en empaque)
  quantityReceived Int      // recibida (en empaque) — NUEVO
  unitsPerPackage  Int      @default(1) // NUEVO — factor de conversión empaque → unidad
  unitPrice        Decimal  @db.Decimal(10, 2)
  tax              Decimal  @db.Decimal(10, 2) @default(0)
  subtotal         Decimal  @db.Decimal(10, 2) // NUEVO explícitamente
  createdAt        DateTime @default(now())

  purchase         Purchase @relation(fields: [purchaseId], references: [id], onDelete: Cascade)

  @@index([purchaseId])
}

// Actualizar InventoryMovement
model InventoryMovement {
  id         String       @id @default(uuid())
  tenantId   String
  locationId String
  userId     String
  date       DateTime
  type       MovementType
  reference  String?      // NUEVO
  notes      String?
  createdAt  DateTime     @default(now())

  items      InventoryMovementItem[]

  @@index([tenantId, locationId, createdAt])
  @@index([tenantId, createdAt])
}
```

Crear migración:
```bash
npx prisma migrate dev --name add_purchases_unitsperpackage_and_inventory_reference
```

**Nota:** La migración debe agregar:
- `locationId` a `Purchase`
- `quantityReceived` a `PurchaseItem`
- `unitsPerPackage` a `PurchaseItem` (con default 1)
- `subtotal` a `PurchaseItem` (si no existe)
- `reference` a `InventoryMovement`
- Índices necesarios

### 2. `packages/types/src/index.ts`

Agregar línea:
```typescript
export * from './purchases.schemas.js';
```

### 3. `apps/api/src/app.module.ts`

Agregar imports en el método `imports`:
```typescript
PurchasesModule,
InventoryMovementsModule,
```

---

## Validaciones y edge cases

### Validación en DTO (Zod)

1. `quantityReceived` debe ser positivo
2. `unitPrice` y `tax` deben ser decimales válidos (formato `^\d+(\.\d{1,2})?$`)
3. `items` no puede estar vacío
4. `purchaseOrderId`, `productId`, `locationId` deben ser UUIDs válidos

### Manejo de errors

| Escenario | Status | Mensaje |
|---|---|---|
| DTO inválido | 400 | Validación Zod |
| PurchaseOrder no encontrada | 404 | "Orden con ID X no encontrada" |
| PurchaseOrder no está en CONFIRMED | 422 | "La orden debe estar en estado CONFIRMED" |
| locationId no coincide | 403 | "No tienes acceso a esta sucursal" |
| quantityReceived > quantity ordenada | 422 | "No se puede recibir más de lo ordenado" |
| STAFF intenta acceder | 403 | "STAFF no tiene acceso a compras" |
| Producto no existe en orden | 404 | "Ítem de orden no encontrado" |

---

## Definición de "done"

Un feature se considera completado cuando:

1. ✅ **Código:** Todos los servicios, controllers, DTOs creados
2. ✅ **Tests:** 
   - Unit tests en `.spec.ts` con >90% coverage
   - E2E tests en `test/` verificando flujos completos
   - Todos los tests pasan: `npm run test`
3. ✅ **Tipos:** Cero errores de TypeScript: `npm run check-types`
4. ✅ **Lint:** Cero warnings: `npm run lint`
5. ✅ **Migración Prisma:** Versión nueva en `prisma/migrations/`
6. ✅ **Documentación:** spec.md actualizada
7. ✅ **RLS:** Transacciones incluyen `set_config` donde sea necesario
8. ✅ **Auditoría:** `AuditLog` creado para `CREATE` de `Purchase` e `InventoryMovement`

---

## Preguntas abiertas resueltas

1. **¿Dónde se especifica unitsPerPackage — en Product, SupplierProduct o PurchaseOrderItem?**
   - Decisión: **En PurchaseOrderItem** (requerido, editable por línea). Opcionalmente, `SupplierProduct.unitsPerPackage` como referencia para pre-rellenar en UI, pero el valor definitivo es en el ítem.

2. **¿Se permiten múltiples recepciones parciales de la misma orden?**
   - Decisión: **Sí**, sin límite. Cada `Purchase` es independiente. Útil si hay daños en tránsito y hay que reportar parciales.

3. **¿Se habilita transición `CONFIRMED → RECEIVED` en el enum de PurchaseOrderStatus?**
   - Decisión: **Sí**, actualizar `ALLOWED_TRANSITIONS` en `PurchaseOrdersService` para permitir `CONFIRMED: ['RECEIVED', 'CANCELLED']`.

4. **¿Qué ocurre si en la transacción falla la creación del InventoryMovement pero el Purchase ya existe?**
   - Decisión: **Rollback automático** por transacción. Todo o nada.

5. **¿Se debe registrar en AuditLog el cambio de estado de PurchaseOrder a RECEIVED?**
   - Decisión: **Sí**, incluir como parte del CREATE del Purchase (o crear un AuditLog adicional con `action = UPDATE`).

6. **¿Se permite editar/eliminar un Purchase una vez creado?**
   - Decisión: **No en este sprint**. Sprint posterior si es necesario (devoluciones). Por ahora, Purchase es inmutable.

7. **¿Qué sucede si Product.packageQty está definido pero es diferente de PurchaseOrderItem.unitsPerPackage?**
   - Decisión: **No hay conflicto**. Product.packageQty es ignorado completamente. PurchaseOrderItem.unitsPerPackage es autoritativo.

---

## Notas técnicas

### Transacciones Prisma 7

```typescript
await this.prisma.$transaction(async (tx) => {
  // tx es un cliente Prisma dentro de la transacción
  // Todos los queries aquí usan el mismo transaction scope
  // Si lanzas excepción, rollback automático
});
```

### Conversión Decimal en responses

Usar helper `toString()` como lo hace `PurchaseOrdersService`:
```typescript
function toString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'toString' in value) {
    return (value as { toString(): string }).toString();
  }
  return String(value);
}
```

### RLS + transacciones

El interceptor `TenantInterceptor` ejecuta `set_config` **antes** del request. Si la lógica está en una transacción, asegurar que `set_config` haya sido ejecutado en la sesión de BD usada por Prisma (debería ser automático con el interceptor existente).

---

## Referencias

- **CLAUDE.md:** Stack, convenciones, RLS details
- **Sprint 15:** Productos + Stock (modelo reference)
- **Sprint 17:** Proveedores + Órdenes de compra (modelo reference)
- **PurchaseOrdersService:** Patrón transaccional, helpers de conversión
- **Prisma schema actual:** `/apps/api/prisma/schema.prisma`

---

## Changelog

### 2026-04-27 — Incorporar conversión empaque → unidades de stock

**Cambios principales:**

- **Nuevo campo:** `PurchaseOrderItem.unitsPerPackage` (Int, default 1)
  - Especifica cuántas unidades individuales hay por empaque/caja
  - Editable por línea de orden (varía según ocasión/proveedor)
  
- **Lógica de conversión al recibir:**
  - Stock delta = `quantityReceived × unitsPerPackage`
  - Ejemplo: 10 cajas × 100 unidades/caja = 1,000 unidades de stock

- **Impacto en `LocationStock`:**
  - Se incrementa en unidades individuales (no empaques)
  - `LocationStock.quantity` siempre está en la unidad más pequeña (individual)

- **Impacto en `InventoryMovementItem`:**
  - Registra la cantidad en unidades individuales (ya convertida)
  - Un movimiento de 10 cajas × 100 = cantidad 1,000

- **Nota sobre `Product.packageQty`:**
  - Campo legado, no se usa en este cálculo
  - Removido de `PurchaseItem` (duplicación innecesaria)

- **Test cases nuevos:**
  - Validar multiplicación en recepción completa
  - Validar multiplicación en recepción parcial
  - Validar múltiples recepciones de la misma orden
  - Validar stock final = suma de todas las recepciones convertidas

**Razón:** El modelo de negocio real requiere que se compren empaques (cajas de 100) pero que el stock se registre en unidades individuales (100 unidades). Esta conversión varía por ocasión, por lo que debe ser especificable en cada línea de orden.
