# Tasks: Módulo 3 — Proveedores + Órdenes de Compra (Backend + UI)

**Input**: Design documents from `/specs/014-sprint-dulo-proveedores/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓

**Legend**:
- `[ ]` — Pendiente
- `[P]` — Puede ejecutarse en paralelo (archivos distintos, sin dependencias)
- Sprints: **17 = Backend**, **18 = UI**

---

## Phase 1: Schema-first — @repo/types

**Purpose**: Actualizar los contratos de tipos antes de tocar backend o frontend. Bloquea todas las fases siguientes.

**⚠️ CRÍTICO**: Ningún código de aplicación puede comenzar hasta que esta fase esté completa.

- [ ] T001 Actualizar `PurchaseOrderStatusSchema` en `packages/types/src/enums.ts`: renombrar `ISSUED → SENT`, agregar `CONFIRMED` entre `SENT` y `RECEIVED`
- [ ] T002 Crear `packages/types/src/suppliers.schemas.ts` con: `CreateSupplierSchema`, `UpdateSupplierSchema`, `SupplierResponseSchema`, `CreateSupplierProductSchema`, `UpdateSupplierProductSchema`, `SupplierProductResponseSchema`, `SupplierQuerySchema`
- [ ] T003 Agregar a `packages/types/src/suppliers.schemas.ts`: `CreatePurchaseOrderSchema`, `AddPurchaseOrderItemSchema`, `UpdatePurchaseOrderItemSchema`, `UpdatePurchaseOrderStatusSchema`, `PurchaseOrderResponseSchema`, `PurchaseOrderDetailResponseSchema`, `PurchaseOrderItemResponseSchema`, `PurchaseOrderQuerySchema`
- [ ] T004 Re-exportar todos los schemas nuevos desde `packages/types/src/index.ts`
- [ ] T005 Ejecutar `pnpm check-types` — sin errores antes de avanzar

**Checkpoint**: Tipos actualizados y compilando.

---

## Phase 2: Foundational — Migración de Prisma

**Purpose**: Alinear el schema de BD con el data-model. Bloquea el backend.

**⚠️ CRÍTICO**: Las migraciones deben aplicarse antes de que el backend compile.

- [ ] T006 Actualizar `apps/api/prisma/schema.prisma`: actualizar enum `PurchaseOrderStatus` (ISSUED→SENT, +CONFIRMED)
- [ ] T007 Actualizar `apps/api/prisma/schema.prisma` modelo `Supplier`: agregar `address String?`, `notes String?`, índice `@@unique([tenantId, name])`
- [ ] T008 Actualizar `apps/api/prisma/schema.prisma` modelo `SupplierProduct`: agregar `leadTimeDays Int?`
- [ ] T009 Actualizar `apps/api/prisma/schema.prisma` modelo `PurchaseOrder`: agregar `supplierId String`, `total Decimal @db.Decimal(10,2) @default(0)`, `expectedDate DateTime?`, relación `supplier Supplier`
- [ ] T010 Ejecutar `npx prisma migrate dev --name suppliers_and_purchase_orders_schema` en `apps/api/`
- [ ] T011 Agregar políticas RLS a la migración SQL generada: `ENABLE ROW LEVEL SECURITY` + políticas `SELECT/INSERT/UPDATE` para `Supplier`, `SupplierProduct`, `PurchaseOrder` con `WHERE "tenantId" = current_setting('app.current_tenant_id')`
- [ ] T012 Ejecutar `npx prisma generate` y verificar que el cliente generado refleja todos los cambios

**Checkpoint**: `npx prisma studio` muestra los modelos actualizados con los nuevos campos.

---

## Phase 3: US1 — Gestión de proveedores — Backend (P1) 🎯 Sprint 17 MVP

**Goal**: OWNER/ADMIN pueden crear, editar y desactivar proveedores. MANAGER/STAFF tienen acceso de solo lectura.

**Independent Test**: `GET /api/suppliers`, `POST /api/suppliers`, `PATCH /api/suppliers/:id` funcionan con autenticación y aislamiento de tenant.

### Tests US1 (RED primero)

- [ ] T013 [P] Crear `apps/api/src/suppliers/suppliers.service.spec.ts` — tests unitarios: `findAll` (filtro activos, includeInactive), `create` (éxito, duplicado), `findOne` (propio tenant), `update` (datos, status INACTIVE), nombre duplicado rechazado

### Implementación US1

- [ ] T014 [P] Crear `apps/api/src/suppliers/dto/create-supplier.dto.ts` — wrapper de `CreateSupplierSchema`
- [ ] T015 [P] Crear `apps/api/src/suppliers/dto/update-supplier.dto.ts` — wrapper de `UpdateSupplierSchema`
- [ ] T016 [P] Crear `apps/api/src/suppliers/dto/supplier-query.dto.ts` — wrapper de `SupplierQuerySchema`
- [ ] T017 Implementar `apps/api/src/suppliers/suppliers.service.ts`: `findAll(tenantId, query)`, `findOne(tenantId, id)`, `create(tenantId, dto)`, `update(tenantId, id, dto)` — validar unicidad de nombre por tenant, lanzar 409 si duplicado
- [ ] T018 Crear `apps/api/src/suppliers/suppliers.controller.ts`: `GET /api/suppliers`, `POST /api/suppliers`, `GET /api/suppliers/:id`, `PATCH /api/suppliers/:id` — guards `JwtAuthGuard`, `@Roles('OWNER','ADMIN')` en escritura
- [ ] T019 Crear `apps/api/src/suppliers/suppliers.module.ts` y registrar en `apps/api/src/app.module.ts`
- [ ] T020 Crear `apps/api/test/suppliers.e2e-spec.ts` — CRUD completo, rechazo duplicado, 403 para MANAGER/STAFF en escritura, aislamiento de tenant

**Checkpoint**: US1 funcional — CRUD de proveedores con autenticación y roles.

---

## Phase 4: US2 — Catálogo de productos por proveedor — Backend (P2)

**Goal**: OWNER/ADMIN asocian y gestionan productos por proveedor. Se puede consultar qué proveedores tiene un producto.

**Independent Test**: `POST /api/suppliers/:id/products`, `GET /api/suppliers/:id/products`, `GET /api/products/:id/suppliers` funcionan correctamente.

### Tests US2 (RED primero)

- [ ] T021 Ampliar `suppliers.service.spec.ts` — tests para: `addProduct` (éxito, duplicado rechazado, producto otro tenant rechazado), `updateProduct` (precio y leadTimeDays), `removeProduct`, `findProductsBySupplier`, `findSuppliersByProduct`

### Implementación US2

- [ ] T022 [P] Crear `apps/api/src/suppliers/dto/create-supplier-product.dto.ts` — wrapper de `CreateSupplierProductSchema`
- [ ] T023 [P] Crear `apps/api/src/suppliers/dto/update-supplier-product.dto.ts` — wrapper de `UpdateSupplierProductSchema`
- [ ] T024 Agregar métodos a `suppliers.service.ts`: `addProduct(tenantId, supplierId, dto)`, `updateProduct(tenantId, supplierId, productId, dto)`, `removeProduct(tenantId, supplierId, productId)`, `findProductsBySupplier(tenantId, supplierId)`, `findSuppliersByProduct(tenantId, productId)`
- [ ] T025 Agregar endpoints a `suppliers.controller.ts`: `GET /api/suppliers/:id/products`, `POST /api/suppliers/:id/products`, `PATCH /api/suppliers/:id/products/:productId`, `DELETE /api/suppliers/:id/products/:productId`, `GET /api/products/:id/suppliers`
- [ ] T026 Ampliar `suppliers.e2e-spec.ts` — casos E2E para endpoints de productos por proveedor

**Checkpoint**: US2 funcional — relación proveedor-producto con CRUD.

---

## Phase 5: US3 — Órdenes de compra — Backend (P3)

**Goal**: OWNER/ADMIN crean y gestionan órdenes de compra con ítems. Flujo de estados `DRAFT → SENT → CONFIRMED / CANCELLED`. Total siempre consistente. Inline creation de SupplierProduct al agregar ítem.

**Independent Test**: Crear orden, agregar ítems (con y sin SupplierProduct previo), avanzar estados, cancelar. Validaciones de estado inválido retornan 422.

### Tests US3 (RED primero)

- [ ] T027 Crear `apps/api/src/purchase-orders/purchase-orders.service.spec.ts` — tests: `create` (éxito, proveedor inactivo rechazado), `addItem` (total recalculado, inline SupplierProduct, orden no DRAFT rechazada), `updateItem`, `removeItem` (total recalculado), `updateStatus` (DRAFT→SENT sin ítems rechazado, SENT→CONFIRMED, DRAFT→CANCELLED, CONFIRMED→CANCELLED rechazado), `findAll` (filtro MANAGER por locationId, STAFF→403)

### Implementación US3

- [ ] T028 [P] Crear `apps/api/src/purchase-orders/dto/create-purchase-order.dto.ts`
- [ ] T029 [P] Crear `apps/api/src/purchase-orders/dto/add-purchase-order-item.dto.ts`
- [ ] T030 [P] Crear `apps/api/src/purchase-orders/dto/update-purchase-order-item.dto.ts`
- [ ] T031 [P] Crear `apps/api/src/purchase-orders/dto/update-purchase-order-status.dto.ts`
- [ ] T032 [P] Crear `apps/api/src/purchase-orders/dto/purchase-order-query.dto.ts`
- [ ] T033 Implementar `apps/api/src/purchase-orders/purchase-orders.service.ts`:
  - `findAll(tenantId, role, userLocationId, query)` — MANAGER filtra por locationId
  - `findOne(tenantId, role, userLocationId, id)` — MANAGER solo su locationId
  - `create(tenantId, userId, dto)` — valida proveedor ACTIVE
  - `addItem(tenantId, orderId, dto)` — valida DRAFT, upsert SupplierProduct, recalcula total en `$transaction`
  - `updateItem(tenantId, orderId, itemId, dto)` — valida DRAFT, recalcula total en `$transaction`
  - `removeItem(tenantId, orderId, itemId)` — valida DRAFT, recalcula total en `$transaction`
  - `updateStatus(tenantId, orderId, status)` — valida transición, SENT requiere ítems
- [ ] T034 Crear `apps/api/src/purchase-orders/purchase-orders.controller.ts`: todos los endpoints de `contracts/api.md` — roles correctos en cada endpoint
- [ ] T035 Crear `apps/api/src/purchase-orders/purchase-orders.module.ts` y registrar en `app.module.ts`
- [ ] T036 Crear `apps/api/test/purchase-orders.e2e-spec.ts` — flujo completo: crear, agregar ítems, avanzar estados, cancelar; validar errores 422; aislamiento de tenant; acceso MANAGER/STAFF

**Checkpoint**: US3 funcional — CRUD de órdenes con flujo de estados y cálculo de total consistente.

---

## Phase 6: US4 — UI: Lista y gestión de proveedores (P4) 🎯 Sprint 18 MVP

**Goal**: Lista paginada de proveedores con filtros, Sheet para crear/editar, confirmación de desactivación.

**Independent Test**: OWNER/ADMIN acceden a `/inventory/suppliers`, crean proveedor desde Sheet, lo editan y desactivan.

### Tests US4 (RED primero)

- [ ] T037 [P] Crear `apps/web/app/tenants/[slug]/(dashboard)/inventory/suppliers/suppliers-page-client.test.tsx` — tabla renderiza, filtro activo/inactivo funciona, Sheet crear/editar abre, botones ocultos para MANAGER
- [ ] T038 [P] Crear `apps/web/app/tenants/[slug]/(dashboard)/inventory/suppliers/supplier-form.test.tsx` — campos obligatorios validados, submit llama onSubmit con datos correctos

### Implementación US4

- [ ] T039 [US4] Crear `apps/web/app/actions/suppliers.ts` — Server Actions: `createSupplierAction`, `updateSupplierAction` con `revalidatePath('/inventory/suppliers')`
- [ ] T040 [US4] Crear `apps/web/app/tenants/[slug]/(dashboard)/inventory/suppliers/page.tsx` — Server Component: fetch de proveedores, pasa `userRole`
- [ ] T041 [US4] Crear `apps/web/app/tenants/[slug]/(dashboard)/inventory/suppliers/supplier-form.tsx` — campos: `name` (required), `initials`, `contact`, `phone`, `email`, `address`, `notes`
- [ ] T042 [US4] Crear `apps/web/app/tenants/[slug]/(dashboard)/inventory/suppliers/supplier-drawer.tsx` — Sheet modo crear y editar, renderiza `SupplierForm`
- [ ] T043 [US4] Crear `apps/web/app/tenants/[slug]/(dashboard)/inventory/suppliers/suppliers-page-client.tsx` — tabla paginada, búsqueda, filtro activo/inactivo, apertura de Sheet, Dialog de confirmación de desactivación

**Checkpoint**: US4 funcional — lista de proveedores con CRUD desde Sheet.

---

## Phase 7: US5 — UI: Productos por proveedor (P5)

**Goal**: Detalle del proveedor con lista de productos asociados, agregar producto desde Dialog, eliminar asociación.

**Independent Test**: Desde `/inventory/suppliers/:id`, OWNER/ADMIN agregan un producto con precio y lo eliminan.

### Tests US5 (RED primero)

- [ ] T044 [P] Crear `apps/web/app/tenants/[slug]/(dashboard)/inventory/suppliers/[id]/supplier-detail-client.test.tsx` — datos del proveedor visibles, lista de productos, Dialog agregar producto abre, eliminar con confirmación

### Implementación US5

- [ ] T045 [US5] Agregar a `apps/web/app/actions/suppliers.ts`: `addSupplierProductAction`, `updateSupplierProductAction`, `removeSupplierProductAction` con `revalidatePath`
- [ ] T046 [US5] Crear `apps/web/app/tenants/[slug]/(dashboard)/inventory/suppliers/[id]/page.tsx` — Server Component: fetch de proveedor + productos + catálogo completo
- [ ] T047 [US5] Crear `apps/web/app/tenants/[slug]/(dashboard)/inventory/suppliers/[id]/add-supplier-product-dialog.tsx` — Combobox de productos (excluye ya asociados), campos `price` (required) y `leadTimeDays`
- [ ] T048 [US5] Crear `apps/web/app/tenants/[slug]/(dashboard)/inventory/suppliers/[id]/supplier-detail-client.tsx` — header del proveedor, tabla de productos con precio, botón "Agregar producto", eliminar con Dialog de confirmación

**Checkpoint**: US5 funcional — detalle del proveedor con gestión de productos.

---

## Phase 8: US6 — UI: Lista y creación de órdenes de compra (P6)

**Goal**: Lista paginada de órdenes con filtros por estado/proveedor, crear nueva orden (navega al detalle), agregar ítems con picker del proveedor + inline creation.

**Independent Test**: OWNER/ADMIN acceden a `/inventory/purchase-orders`, crean una orden, agregan ítems (incluyendo uno que no estaba en el catálogo del proveedor), ven total actualizado.

### Tests US6 (RED primero)

- [ ] T049 [P] Crear `apps/web/app/tenants/[slug]/(dashboard)/inventory/purchase-orders/purchase-orders-page-client.test.tsx` — tabla renderiza, filtros funcionan, botón "Nueva orden" visible solo para ADMIN
- [ ] T050 [P] Crear `apps/web/app/tenants/[slug]/(dashboard)/inventory/purchase-orders/[id]/add-order-item-dialog.test.tsx` — paso 1 muestra productos del proveedor, precio pre-llenado, inline creation muestra sub-formulario, paso 2 captura cantidad, éxito actualiza lista

### Implementación US6

- [ ] T051 [US6] Crear `apps/web/app/actions/purchase-orders.ts` — Server Actions: `createPurchaseOrderAction`, `addOrderItemAction`, `updateOrderItemAction`, `removeOrderItemAction`, `updateOrderStatusAction` con `revalidatePath`
- [ ] T052 [US6] Crear `apps/web/app/tenants/[slug]/(dashboard)/inventory/purchase-orders/page.tsx` — Server Component: fetch de órdenes y proveedores para filtros, pasa `userRole` y `userLocationId`
- [ ] T053 [US6] Crear `apps/web/app/tenants/[slug]/(dashboard)/inventory/purchase-orders/purchase-orders-page-client.tsx` — tabla paginada, filtros por estado/proveedor, botón "Nueva orden" (Dialog: selecciona proveedor+sucursal y redirige al detalle)
- [ ] T054 [US6] Crear `apps/web/app/tenants/[slug]/(dashboard)/inventory/purchase-orders/[id]/add-order-item-dialog.tsx` — paso 1: picker de productos del proveedor con precio pre-llenado + opción inline creation; paso 2: cantidad y precio editables; on success: actualiza lista de ítems y total

**Checkpoint**: US6 funcional — lista de órdenes y creación con ítems.

---

## Phase 9: US7 — UI: Detalle y flujo de estado de una orden (P7)

**Goal**: Página de detalle con cabecera, ítems, total y botones de acción correctos según estado. MANAGER ve solo sus órdenes en lectura.

**Independent Test**: Desde `/inventory/purchase-orders/:id`, OWNER/ADMIN envían la orden, la confirman. Los botones correctos aparecen en cada estado.

### Tests US7 (RED primero)

- [ ] T055 [P] Crear `apps/web/app/tenants/[slug]/(dashboard)/inventory/purchase-orders/[id]/purchase-order-detail-client.test.tsx` — cabecera visible, ítems en tabla, badge de estado correcto, botón "Enviar" visible en DRAFT, "Confirmar" en SENT, "Cancelar" ausente en CONFIRMED, aviso de Sprint 19 en CONFIRMED

### Implementación US7

- [ ] T056 [US7] Crear `apps/web/app/tenants/[slug]/(dashboard)/inventory/purchase-orders/[id]/page.tsx` — Server Component: fetch de orden completa con ítems + productos del proveedor + catálogo
- [ ] T057 [US7] Crear `apps/web/app/tenants/[slug]/(dashboard)/inventory/purchase-orders/[id]/purchase-order-detail-client.tsx`:
  - Cabecera: proveedor, sucursal, estado (badge), fechas, notas, total
  - Tabla de ítems con subtotales (editar/eliminar solo en DRAFT)
  - Botón "Agregar producto" (`AddOrderItemDialog`) — solo DRAFT + OWNER/ADMIN
  - Botones de transición: "Enviar al proveedor" (DRAFT), "Confirmar orden" (SENT), "Cancelar" (DRAFT|SENT) con Dialog de confirmación
  - Aviso informativo en CONFIRMED: "La recepción de mercancía se registra en el módulo de Compras"
- [ ] T058 [US7] Crear `apps/web/app/tenants/[slug]/(dashboard)/inventory/purchase-orders/purchase-order-status-badge.tsx` — Badge con variantes por estado: DRAFT=outline, SENT=status-pending, CONFIRMED=status-active, CANCELLED=destructive

**Checkpoint**: US7 funcional — detalle de orden con flujo de estados completo.

---

## Phase 10: Polish & Verificación final

- [ ] T059 [P] Ejecutar `pnpm lint` — sin errores ni warnings
- [ ] T060 [P] Ejecutar `pnpm check-types` — sin errores de TypeScript
- [ ] T061 [P] Ejecutar `pnpm --filter api test` — todos los unit tests en verde
- [ ] T062 [P] Ejecutar `NODE_OPTIONS="--experimental-vm-modules" pnpm --filter api test:e2e` — todos los E2E en verde
- [ ] T063 [P] Ejecutar tests de frontend (Vitest) — todos los `.test.tsx` del módulo en verde
- [ ] T064 Verificar flujo end-to-end: crear proveedor → asociar productos → crear orden → agregar ítems (con inline creation) → enviar → confirmar
- [ ] T065 Agregar enlaces de navegación a "Proveedores" y "Órdenes de Compra" en el sidebar del dashboard si no existen

---

## Dependencies & Execution Order

### Orden obligatorio de fases

1. **Phase 1** (Schema-first @repo/types) — bloquea todo
2. **Phase 2** (Migraciones Prisma) — bloquea backend
3. **Phase 3** (US1 Backend) — MVP de Sprint 17
4. **Phase 4** (US2 Backend) — depende de Phase 3 (mismo módulo `suppliers`)
5. **Phase 5** (US3 Backend) — puede iniciar en paralelo con Phase 4
6. **Phase 6** (US4 UI) — puede iniciar en paralelo con Phases 3-5 una vez Phase 1 lista
7. **Phases 7-9** (US5, US6, US7 UI) — pueden ir en paralelo entre sí tras Phase 6

### Dependencias internas por fase

- T017 (`suppliers.service`) depende de T013 (tests primero)
- T033 (`purchase-orders.service`) depende de T027 (tests primero)
- T043, T048, T053, T057 (client components) dependen de sus respectivos tests y server actions

### Oportunidades paralelas

```
# Una vez Phase 1 y 2 completas:
[Hilo A] T013 → T017 → T018 → T019 → T020  (US1 Suppliers CRUD)
[Hilo B] T028-T032 (DTOs purchase-orders)   (preparación US3)

# Una vez US1 completo:
[Hilo A] T021 → T024 → T025 (US2 SupplierProducts)
[Hilo B] T027 → T033 → T034 → T035 → T036 (US3 PurchaseOrders)

# UI (Sprint 18) — después de Phase 1:
[Hilo C] T037 → T039-T043 (US4 Suppliers UI)
[Hilo D] T044 → T045-T048 (US5 Supplier Detail)
```
