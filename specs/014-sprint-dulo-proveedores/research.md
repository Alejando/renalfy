# Research: Módulo 3 — Proveedores + Órdenes de Compra

**Phase 0 output** | 2026-04-24

## Decisión 1: Alineación del enum `PurchaseOrderStatus`

**Decision**: Actualizar el enum en Prisma y `@repo/types` a `DRAFT | SENT | CONFIRMED | RECEIVED | CANCELLED`. Renombrar `ISSUED → SENT`, agregar `CONFIRMED`. Conservar `RECEIVED` para Sprint 19.

**Rationale**: El enum existente (`DRAFT | ISSUED | RECEIVED | CANCELLED`) no tiene `CONFIRMED` (estado intermedio entre proveedor confirmado y recepción física), y usa `ISSUED` en lugar de `SENT` que es más semántico para el flujo de la UI. No hay registros de producción, por lo que el rename es seguro. `RECEIVED` permanece en el enum para que Sprint 19 pueda usarlo sin otra migración.

**Alternatives considered**:
- Usar `ISSUED` tal cual: descartado — la UI ya usa "Enviar", el término `SENT` es más claro para el usuario final y el código
- No agregar `CONFIRMED`: descartado — el spec clarificado requiere esta transición intermedia que indica que el proveedor aceptó el pedido

---

## Decisión 2: Campos faltantes en `PurchaseOrder`

**Decision**: Agregar via migración: `supplierId String`, `total Decimal @default(0)`, `expectedDate DateTime?`. El `total` se mantiene calculado en el servicio (suma de subtotales de ítems) y se persiste en la BD para consultas eficientes.

**Rationale**: `supplierId` es indispensable — sin él, la orden no está vinculada a ningún proveedor. `total` calculado y persistido evita recalcular en cada query de lista. `expectedDate` es opcional y permite al administrador registrar cuándo espera la mercancía.

**Alternatives considered**:
- `total` calculado al vuelo en cada query: descartado — ineficiente para listados paginados con muchos ítems
- `supplierId` como campo en los ítems en lugar de en la orden: descartado — la orden ya tiene un proveedor único, redundar en cada ítem viola normalización

---

## Decisión 3: Campos faltantes en `Supplier` y `SupplierProduct`

**Decision**: Agregar a `Supplier`: `address String?`, `notes String?`. Agregar a `SupplierProduct`: `leadTimeDays Int?`. Conservar `initials String?` ya existente.

**Rationale**: `address` y `notes` aparecen en el spec como atributos del directorio de proveedores. `leadTimeDays` (días de entrega estimados) es útil al crear órdenes para sugerir una `expectedDate`. Todos son opcionales para no bloquear casos simples.

**Alternatives considered**:
- `leadTimeDays` en `PurchaseOrder` en vez de `SupplierProduct`: descartado — los días de entrega son una característica del proveedor para ese producto, no de la orden específica

---

## Decisión 4: Patrón de módulos NestJS

**Decision**: Seguir el patrón existente en el proyecto: un módulo por recurso principal (`suppliers`, `purchase-orders`). Los sub-recursos (`/suppliers/:id/products`, `/purchase-orders/:id/items`) se implementan como endpoints dentro del módulo padre para evitar módulos demasiado granulares.

**Rationale**: Patrón establecido en `companies/`, `products/`, `stock/`. Mantiene la estructura predecible y evita proliferación de módulos para sub-recursos estrechamente acoplados.

**Alternatives considered**:
- Módulo independiente `supplier-products`: descartado — es un sub-recurso que solo tiene sentido en el contexto de un proveedor
- Módulo independiente `purchase-order-items`: descartado — igual que el anterior

---

## Decisión 5: Cálculo y persistencia del total de la orden

**Decision**: El `total` se recalcula en el servicio cada vez que se agrega, edita o elimina un ítem, y se persiste en `PurchaseOrder.total` en la misma transacción que modifica el ítem. Se usa `prisma.$transaction()` para garantizar consistencia.

**Rationale**: Cumple SC-003 (total siempre consistente). La transacción atómica garantiza que nunca haya un ítem guardado sin su reflejo en el total. Patrón ya usado en `receipts` (folio) y `stock` (ajuste de cantidad).

**Alternatives considered**:
- Campo virtual calculado en cada query con `_sum`: descartado — más complejo de mantener en listas paginadas y sin soporte nativo de Prisma para campos calculados en respuesta
- Trigger de BD: descartado — agrega complejidad de infraestructura innecesaria

---

## Decisión 6: Inline creation de `SupplierProduct` al agregar ítem a la orden

**Decision**: El endpoint `POST /api/purchase-orders/:id/items` acepta en el body tanto `productId` como `unitPrice`. Si el `SupplierProduct` no existe para ese par (supplierId del PurchaseOrder, productId), el servicio lo crea automáticamente con el `unitPrice` provisto, en la misma transacción que crea el ítem.

**Rationale**: Responde directamente al requisito clarificado: el usuario puede agregar un producto a la orden aunque no esté en el catálogo del proveedor, sin navegar. El servicio maneja el upsert de `SupplierProduct` de forma transparente.

**Alternatives considered**:
- Endpoint separado para crear `SupplierProduct` primero: descartado — el usuario tendría que hacer dos llamadas para completar una acción que visualmente es una

---

## Decisión 7: RLS para las entidades nuevas

**Decision**: `Supplier`, `SupplierProduct`, `PurchaseOrder`, `PurchaseOrderItem` requieren RLS con política `tenantId = current_setting('app.current_tenant_id')`. Las migraciones incluyen los `ENABLE ROW LEVEL SECURITY` y las políticas correspondientes.

**Rationale**: Todas las tablas de negocio tienen RLS según la constitución. `PurchaseOrderItem` no tiene `tenantId` directo, por lo que su acceso se restringe vía JOIN al `PurchaseOrder` padre (igual que `SaleItem`, `PurchaseItem`).

**Alternatives considered**:
- RLS en capa de aplicación únicamente: descartado — la constitución exige RLS en BD como defensa en profundidad

---

## Decisión 8: Patrón de UI — Server Components + Client Components

**Decision**: Mismo patrón establecido en el proyecto: `page.tsx` (Server Component, fetch inicial) + `*-page-client.tsx` (Client Component para interactividad). Listas: `Sheet` para crear/editar proveedor. Detalle de proveedor y detalle de orden: páginas dedicadas (`[id]/page.tsx`). Agregar ítem a orden: `Dialog` con picker de productos del proveedor + sub-formulario inline si el producto no existe.

**Rationale**: Patrón ya establecido en `patients/`, `receipts/`, `companies/`, `inventory/products/`. Consistencia total en el dashboard.

**Alternatives considered**:
- Creación de orden desde un drawer (Sheet): descartado — la orden requiere página dedicada para gestionar sus ítems, el Sheet sería demasiado complejo
