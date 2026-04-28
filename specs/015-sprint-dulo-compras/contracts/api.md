# API Contract: Sprint 19 — Compras + Movimientos de Inventario

**Feature**: 015-sprint-dulo-compras  
**Base URL**: `/api`  
**Auth**: Bearer JWT en todos los endpoints  
**Tenant**: `tenantId` extraído del JWT — nunca del body

---

## Módulo: Purchases

### POST /api/purchases — Registrar recepción de mercancía

**Roles**: OWNER, ADMIN, MANAGER  
**Guard**: JwtAuthGuard  
**STAFF**: 403 Forbidden

#### Request Body

```typescript
// ReceivePurchaseOrderDto (extends createZodDto(ReceivePurchaseOrderSchema))
{
  purchaseOrderId: string;  // UUID — orden en estado CONFIRMED o RECEIVED
  locationId: string;       // UUID — sucursal que recibe (debe coincidir con PurchaseOrder.locationId)
  items: Array<{
    purchaseOrderItemId: string;  // UUID — ítem de la orden que se recibe
    productId: string;            // UUID — producto
    quantityReceived: number;     // entero positivo, <= cantidad pendiente acumulada
    unitsPerPackage: number;      // entero >= 1, factor de conversión empaque→unidad
    unitPrice: string;            // decimal "100.00" — precio real pagado por empaque
    tax?: string;                 // decimal "5.00" — impuesto por empaque (default "0")
  }>;
  notes?: string;
}
```

**Validaciones de negocio**:
- `purchaseOrderId` debe existir en el tenant y estar en estado CONFIRMED o RECEIVED
- `locationId` debe coincidir con `PurchaseOrder.locationId`
- Para cada ítem: `quantityReceived + totalYaRecibido <= PurchaseOrderItem.quantity`
- `unitsPerPackage >= 1`
- `items` no puede estar vacío
- MANAGER: `locationId` debe ser su `locationId` asignado

#### Response 201 Created

```typescript
// PurchaseResponse
{
  id: string;             // UUID de la compra creada
  tenantId: string;
  locationId: string;
  userId: string;
  supplierId: string;
  purchaseOrderId: string;
  date: string;           // ISO 8601
  amount: string;         // "5050.00" — SUM(subtotal + tax)
  notes: string | null;
  supplierName: string;
  locationName: string;
  itemCount: number;
  createdAt: string;      // ISO 8601
}
```

#### Errores

| Status | Condición | Mensaje |
|--------|-----------|---------|
| 400 | DTO inválido (Zod) | mensaje de validación |
| 403 | STAFF accede | "STAFF no tiene acceso a compras" |
| 403 | MANAGER intenta otra sucursal | "No tienes acceso a esta sucursal" |
| 403 | locationId no coincide con PO.locationId | "La sucursal no coincide con la orden" |
| 404 | PurchaseOrder no encontrada | "Orden con ID {id} no encontrada" |
| 404 | PurchaseOrderItem no encontrado | "Ítem de orden con ID {id} no encontrado" |
| 422 | PO no está en CONFIRMED o RECEIVED | "La orden debe estar en estado CONFIRMED o RECEIVED" |
| 422 | quantityReceived > pendiente acumulado | "No se puede recibir {n}, quedan {m} por recibir" |
| 500 | Error en transacción | Error genérico |

#### Efecto colateral en PurchaseOrder.status

| Antes | Condición | Después |
|-------|-----------|---------|
| CONFIRMED | Primera recepción (cualquier cantidad) | RECEIVED |
| RECEIVED | Suma acumulada < 100% | RECEIVED |
| RECEIVED | Suma acumulada = 100% (todos los ítems) | COMPLETED |

---

### GET /api/purchases — Listar compras

**Roles**: OWNER, ADMIN, MANAGER  
**STAFF**: 403 Forbidden

#### Query Params

```
page?:       number (default 1)
limit?:      number (default 20, max 100)
supplierId?: UUID
locationId?: UUID
dateFrom?:   date string (ISO)
dateTo?:     date string (ISO)
search?:     string (busca por nombre de proveedor)
```

**Filtro automático**: MANAGER solo ve compras de su `locationId`.

#### Response 200 OK

```typescript
{
  data: PurchaseResponse[];
  total: number;
  page: number;
  limit: number;
}
```

---

### GET /api/purchases/:id — Detalle de compra

**Roles**: OWNER, ADMIN, MANAGER  
**STAFF**: 403 Forbidden

#### Response 200 OK

```typescript
// PurchaseDetailResponse
{
  id: string;
  tenantId: string;
  locationId: string;
  userId: string;
  supplierId: string;
  purchaseOrderId: string;
  date: string;
  amount: string;
  notes: string | null;
  supplierName: string;
  locationName: string;
  itemCount: number;
  createdAt: string;
  items: Array<{
    id: string;
    purchaseId: string;
    productId: string;
    quantity: number;          // ordenado (empaques)
    quantityReceived: number;  // recibido (empaques)
    unitsPerPackage: number;   // factor de conversión
    unitPrice: string;         // precio por empaque
    tax: string;               // impuesto por empaque
    subtotal: string;          // quantityReceived × unitPrice
    createdAt: string;
    product: {
      id: string;
      name: string;
      brand: string | null;
    };
  }>;
  supplier: {
    id: string;
    name: string;
    contact: string | null;
    phone: string | null;
    email: string | null;
  };
  location: {
    id: string;
    name: string;
  };
}
```

#### Errores

| Status | Condición |
|--------|-----------|
| 403 | STAFF accede |
| 403 | MANAGER intenta ver compra de otra sucursal |
| 404 | Compra no encontrada o no pertenece al tenant |

---

## Módulo: Inventory Movements

### GET /api/inventory-movements — Listar movimientos

**Roles**: OWNER, ADMIN, MANAGER  
**STAFF**: 403 Forbidden

#### Query Params

```
page?:       number (default 1)
limit?:      number (default 20, max 100)
locationId?: UUID
productId?:  UUID (filtra movimientos que contengan ese producto)
type?:       "IN" | "OUT"
dateFrom?:   date string (ISO)
dateTo?:     date string (ISO)
```

**Filtro automático**: MANAGER solo ve movimientos de su `locationId`.

#### Response 200 OK

```typescript
{
  data: Array<{
    id: string;
    tenantId: string;
    locationId: string;
    userId: string;
    date: string;
    type: "IN" | "OUT";
    reference: string | null;  // "PURCHASE-{purchaseId}"
    notes: string | null;
    itemCount: number;
    createdAt: string;
  }>;
  total: number;
  page: number;
  limit: number;
}
```

---

### GET /api/inventory-movements/:id — Detalle de movimiento

**Roles**: OWNER, ADMIN, MANAGER  
**STAFF**: 403 Forbidden

#### Response 200 OK

```typescript
// InventoryMovementDetailResponse
{
  id: string;
  tenantId: string;
  locationId: string;
  userId: string;
  date: string;
  type: "IN" | "OUT";
  reference: string | null;
  notes: string | null;
  itemCount: number;
  createdAt: string;
  items: Array<{
    id: string;
    inventoryMovementId: string;
    productId: string;
    quantity: number;   // siempre en unidades individuales (ya convertido)
    product: {
      id: string;
      name: string;
      brand: string | null;
    };
  }>;
}
```

#### Errores

| Status | Condición |
|--------|-----------|
| 403 | STAFF accede |
| 403 | MANAGER intenta ver movimiento de otra sucursal |
| 404 | Movimiento no encontrado o no pertenece al tenant |

---

## Módulo: Purchase Orders (nuevo endpoint)

### POST /api/purchase-orders/:id/close — Cerrar con saldo pendiente

**Roles**: OWNER, ADMIN (MANAGER no puede cerrar)  
**Guard**: JwtAuthGuard

#### Request Body

```typescript
// ClosePurchaseOrderDto
{
  notes?: string;  // motivo del cierre (ej: "Proveedor no puede completar el pedido")
}
```

#### Pre-condiciones

- La orden debe estar en estado RECEIVED
- El usuario debe ser OWNER o ADMIN
- La orden debe tener al menos una recepción registrada (si status es RECEIVED, esta condición es implícita)

#### Response 200 OK

```typescript
// PurchaseOrderResponse (mismo shape que el existente)
{
  id: string;
  tenantId: string;
  supplierId: string;
  locationId: string;
  userId: string;
  date: string;
  status: "CLOSED";
  notes: string | null;
  expectedDate: string | null;
  total: string;
  supplierName: string;
  locationName: string;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}
```

#### Errores

| Status | Condición | Mensaje |
|--------|-----------|---------|
| 400 | MANAGER intenta cerrar | "Solo OWNER y ADMIN pueden cerrar órdenes con saldo pendiente" |
| 404 | Orden no encontrada | "Orden con ID {id} no encontrada" |
| 422 | Orden no está en RECEIVED | "Solo se pueden cerrar órdenes en estado RECEIVED" |

---

## Purchase Orders (endpoints existentes — cambios)

### PATCH /api/purchase-orders/:id/status (existente)

Los estados permitidos ahora excluyen RECEIVED (esa transición es interna). Desde el cliente solo se puede:

- CONFIRMED → CANCELLED (si no hay recepciones)
- Los estados COMPLETED y CLOSED no son alcanzables via este endpoint

### PATCH /api/purchase-orders/:id (existente)

Sin cambios. Solo permite editar notas y expectedDate en órdenes DRAFT.

---

## Modificación: Add Purchase Order Item (existente)

El endpoint `POST /api/purchase-orders/:id/items` ya existe. Se añade `unitsPerPackage` al schema:

```typescript
// AddPurchaseOrderItemDto (actualizado)
{
  productId: string;     // UUID
  quantity: number;      // entero > 0
  unitPrice: string;     // decimal
  unitsPerPackage?: number;  // entero >= 1, default 1
}
```

---

## Flujo completo de una orden hasta stock

```
1. POST /api/purchase-orders
   → Crea orden DRAFT

2. POST /api/purchase-orders/:id/items  (una o más veces)
   → Agrega ítems (cada uno con unitsPerPackage)

3. PATCH /api/purchase-orders/:id/status { status: "SENT" }
   → DRAFT → SENT

4. PATCH /api/purchase-orders/:id/status { status: "CONFIRMED" }
   → SENT → CONFIRMED

5. POST /api/purchases
   { purchaseOrderId, locationId, items: [{ quantityReceived, unitsPerPackage, unitPrice }] }
   → Crea Purchase + PurchaseItems
   → Actualiza LocationStock (+= quantityReceived × unitsPerPackage por ítem)
   → Crea InventoryMovement IN (ref: "PURCHASE-{id}")
   → Transiciona PO: CONFIRMED → RECEIVED (o COMPLETED si 100%)

6. [Opcional] POST /api/purchases (segunda recepción parcial)
   → Misma lógica, PO sigue RECEIVED hasta alcanzar 100% → COMPLETED

7. [Opcional si falta saldo] POST /api/purchase-orders/:id/close { notes }
   → PO RECEIVED → CLOSED
```
