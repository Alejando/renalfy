# Tasks: UI — Módulo 3: Productos y Stock

**Input**: Design documents from `/specs/013-sprint-modulo-productos-stock/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓

**Legend**:
- `[X]` — Completado en sprint anterior (Sprint 15 backend / frontend base)
- `[ ]` — Pendiente — nuevo requisito de este sprint
- `[P]` — Puede ejecutarse en paralelo (archivos distintos, sin dependencias)

---

## Phase 1: Schema-first — @repo/types

**Purpose**: Actualizar los contratos de tipos antes de tocar backend o frontend. Bloquea todas las fases siguientes.

**⚠️ CRÍTICO**: Ningún trabajo de backend ni frontend puede comenzar hasta que esta fase esté completa.

- [ ] T001 Agregar `ProductType` como `z.enum(['SALE', 'CONSUMABLE'])` en `packages/types/src/enums.ts`
- [ ] T002 Crear `ProductCategorySchema` y `CreateProductCategorySchema` en `packages/types/src/products.schemas.ts`
- [ ] T003 Actualizar `CreateProductSchema`: reemplazar `category: z.string().optional()` por `categoryId: z.string().uuid().nullable()` y agregar `productType: ProductTypeSchema`
- [ ] T004 Actualizar `ProductResponseSchema`: agregar `productType`, `categoryId`, `categoryName`; eliminar `category: string`
- [ ] T005 Agregar `ProductCategoryResponseSchema` al index de `@repo/types`
- [ ] T006 Actualizar `ProductQuerySchema`: reemplazar `category` por `categoryId`, agregar `productType` como filtro opcional
- [ ] T007 Ejecutar `pnpm check-types` — sin errores antes de avanzar

**Checkpoint**: Tipos actualizados y sin errores de TypeScript.

---

## Phase 2: Backend — Migraciones y módulo ProductCategory

**Purpose**: Infraestructura de BD y módulo NestJS para categorías. Bloquea la actualización del módulo de productos.

**⚠️ CRÍTICO**: Las migraciones deben ejecutarse antes de que el backend pueda compilar con los nuevos campos.

### Migraciones Prisma

- [ ] T008 Agregar enum `ProductType { SALE CONSUMABLE }` al `schema.prisma` y columna `productType ProductType @default(SALE)` en modelo `Product`
- [ ] T009 Agregar modelo `ProductCategory` en `schema.prisma`: `id`, `tenantId`, `name`, `createdAt`, `updatedAt`; índice único `(tenantId, name)`
- [ ] T010 Reemplazar `category String?` por `categoryId String?` + relación `category ProductCategory?` en modelo `Product`
- [ ] T011 Ejecutar `npx prisma migrate dev --name add_product_type_and_categories`
- [ ] T012 Agregar política RLS para `ProductCategory` en la migración SQL: `ENABLE ROW LEVEL SECURITY`, política `SELECT/INSERT/UPDATE/DELETE WHERE "tenantId" = current_setting('app.current_tenant_id')`
- [ ] T013 Ejecutar `npx prisma generate` y verificar que el cliente refleja los nuevos modelos

### Módulo product-categories (NestJS)

- [ ] T014 [P] Crear `apps/api/src/product-categories/dto/create-category.dto.ts` — wrapper de `CreateProductCategorySchema`
- [ ] T015 [P] Crear `apps/api/src/product-categories/dto/category-query.dto.ts` — paginación y búsqueda
- [ ] T016 Crear `apps/api/src/product-categories/product-categories.service.spec.ts` — tests unitarios (RED primero): `findAll`, `create` (duplicado rechazado), `remove` (con productos asignados rechazado)
- [ ] T017 Crear `apps/api/src/product-categories/product-categories.service.ts` — implementación: `findAll(tenantId)`, `create(tenantId, dto)`, `remove(tenantId, id)` con validación de productos asignados
- [ ] T018 Crear `apps/api/src/product-categories/product-categories.controller.ts` — `GET /api/product-categories`, `POST /api/product-categories`, `DELETE /api/product-categories/:id`; guards `@Roles('OWNER','ADMIN')` en escritura
- [ ] T019 Crear `apps/api/src/product-categories/product-categories.module.ts` y registrar en `app.module.ts`
- [ ] T020 Crear `apps/api/test/product-categories.e2e-spec.ts` — E2E: CRUD completo, rechazo de duplicado, rechazo de eliminación con productos asignados, aislamiento de tenant

### Actualizar módulo products

- [ ] T021 Actualizar `apps/api/src/products/products.service.ts`: reemplazar `category` por `categoryId`, agregar `productType` en queries y filtros; incluir `categoryName` en el `select` vía JOIN
- [ ] T022 Actualizar `apps/api/src/products/products.controller.ts`: aceptar `productType` y `categoryId` como query params
- [ ] T023 Actualizar `apps/api/src/products/dto/create-product.dto.ts`: usar `CreateProductSchema` actualizado de `@repo/types`
- [ ] T024 Actualizar `apps/api/src/products/products.service.spec.ts`: agregar casos para `productType`, `categoryId`, filtro por `productType`
- [ ] T025 Ejecutar `pnpm --filter api test` y `NODE_OPTIONS="--experimental-vm-modules" pnpm --filter api test:e2e` — todos en verde

**Checkpoint**: Backend listo — `GET/POST/DELETE /api/product-categories` + `Product` con `productType` y `categoryId` funcionales.

---

## Phase 3: US1 — Catálogo de productos (P1) 🎯 MVP

**Goal**: OWNER/ADMIN pueden gestionar el catálogo: lista paginada con filtros, crear/editar vía Sheet, eliminar con confirmación. MANAGER/STAFF ven en solo lectura.

**Independent Test**: Abrir `/inventory/products`, crear un producto con nueva categoría inline, editarlo y eliminarlo.

### Tests US1 (RED primero)

- [ ] T026 [P] Crear `apps/web/app/tenants/[slug]/(dashboard)/inventory/products/products-page-client.test.tsx` — tabla renderiza, filtros de búsqueda/categoría/tipo funcionan, botones CRUD visibles para ADMIN, ocultos para MANAGER
- [ ] T027 [P] Crear `apps/web/app/tenants/[slug]/(dashboard)/inventory/products/product-drawer.test.tsx` — Sheet se abre en modo crear y editar, cierra al éxito
- [ ] T028 [P] Crear `apps/web/app/tenants/[slug]/(dashboard)/inventory/products/product-form.test.tsx` — campos obligatorios validados, `productType` RadioGroup funciona, `CategoryCombobox` muestra "+ Crear categoría 'X'" cuando no hay coincidencia, llama `onCreateCategory` y selecciona la nueva

### Implementación US1

- [X] T029 `apps/web/app/tenants/[slug]/(dashboard)/inventory/products/page.tsx` — Server Component: fetch inicial de productos y categorías, pasa `userRole`
- [X] T030 `apps/web/app/tenants/[slug]/(dashboard)/inventory/products/products-page-client.tsx` — tabla paginada, filtros, apertura de drawers, confirmación de eliminación
- [ ] T031 Actualizar `products-page-client.tsx`: agregar filtro por `productType` (dropdown Venta / Insumo / Todos), pasar `categories` al `ProductDrawer`
- [X] T032 `apps/web/app/tenants/[slug]/(dashboard)/inventory/products/product-drawer.tsx` — Sheet con `ProductForm`, modo crear y editar
- [X] T033 `apps/web/app/tenants/[slug]/(dashboard)/inventory/products/product-form.tsx` — formulario base con campos existentes
- [ ] T034 Actualizar `product-form.tsx`: agregar `productType` RadioGroup ("Venta" | "Insumo"), reemplazar campo `category` por `CategoryCombobox` con inline creation, `salePrice` prominente solo si `productType === 'SALE'`
- [ ] T035 Crear `apps/web/app/tenants/[slug]/(dashboard)/inventory/products/category-combobox.tsx` — Combobox con lista de categorías existentes y opción "+ Crear categoría 'X'"; llama `onCreateCategory(name)` y selecciona el nuevo id automáticamente
- [ ] T036 Crear Server Action `apps/web/app/actions/product-categories.ts`: `createCategory`, `deleteCategory` con `revalidatePath`
- [ ] T037 Actualizar Server Actions de productos (`apps/web/app/actions/products.ts`) para incluir `productType` y `categoryId` en create/update

**Checkpoint**: US1 completamente funcional — tabla con filtros, CRUD de productos, categorías inline.

---

## Phase 4: US2 — Detalle de producto con stock por sucursal (P2)

**Goal**: Al hacer clic en un producto se navega a su página de detalle con todos los campos y el desglose de stock por sucursal, con indicadores de alerta.

**Independent Test**: Navegar a `/inventory/products/:id`, ver todos los campos del producto y el stock por sucursal con badges de alerta.

### Tests US2 (RED primero)

- [ ] T038 [P] Crear `apps/web/app/tenants/[slug]/(dashboard)/inventory/products/[id]/page.test.tsx` — renderiza datos del producto, muestra tabla de stock por sucursal, badge de alerta visible donde `isBelowAlert`, MANAGER solo ve su sucursal

### Implementación US2

- [X] T039 `apps/web/app/tenants/[slug]/(dashboard)/inventory/products/[id]/page.tsx` — Server Component con fetch de `ProductDetailResponse`
- [X] T040 `apps/web/app/tenants/[slug]/(dashboard)/inventory/products/[id]/product-detail-client.tsx` — renderiza detalle del producto + `StockByLocationTable`
- [X] T041 `apps/web/app/tenants/[slug]/(dashboard)/inventory/products/[id]/stock-config-drawer.tsx` — formulario upsert de stock por sucursal (minStock, alertLevel, packageQty)
- [ ] T042 Actualizar `product-detail-client.tsx`: mostrar campos `productType` (badge "Venta"/"Insumo") y `categoryName`; `salePrice` prominente solo para tipo SALE

**Checkpoint**: US2 funcional — detalle de producto con stock por sucursal y alertas visuales.

---

## Phase 5: US3 — Lista y ajuste de stock por sucursal (P3)

**Goal**: OWNER/ADMIN ven stock de todas las sucursales, filtran por stock bajo, ajustan cantidades. MANAGER/STAFF ven solo su sucursal en modo lectura.

**Independent Test**: Acceder a `/inventory/stock`, filtrar por "Stock bajo", ajustar cantidad de un producto (SET y DELTA).

### Tests US3 (RED primero)

- [ ] T043 [P] Crear `apps/web/app/tenants/[slug]/(dashboard)/inventory/stock/stock-page-client.test.tsx` — tabla renderiza, filtro por sucursal visible solo para ADMIN, badge de alerta en filas bajas, botón ajuste solo para ADMIN
- [ ] T044 [P] Crear `apps/web/app/tenants/[slug]/(dashboard)/inventory/stock/adjust-quantity-drawer.test.tsx` — modos SET y DELTA funcionan, error de cantidad negativa se muestra, éxito cierra el drawer

### Implementación US3

- [X] T045 `apps/web/app/tenants/[slug]/(dashboard)/inventory/stock/page.tsx` — Server Component con fetch inicial de stock
- [X] T046 `apps/web/app/tenants/[slug]/(dashboard)/inventory/stock/stock-page-client.tsx` — tabla paginada con filtros (sucursal, búsqueda, solo stock bajo), botón ajuste
- [X] T047 `apps/web/app/tenants/[slug]/(dashboard)/inventory/stock/adjust-quantity-drawer.tsx` — Sheet con modos SET/DELTA

**Checkpoint**: US3 funcional — lista de stock con filtros y ajuste de cantidades.

---

## Phase 6: US4 — Configurar stock por sucursal (P4)

**Goal**: OWNER/ADMIN pueden configurar minStock, alertLevel y packageQty por producto+sucursal desde el detalle del producto.

**Independent Test**: Desde `/inventory/products/:id`, abrir "Configurar stock para sucursal", guardar y ver el registro en la tabla.

### Tests US4 (RED primero)

- [ ] T048 Crear `apps/web/app/tenants/[slug]/(dashboard)/inventory/products/[id]/stock-config-drawer.test.tsx` — formulario con campos correctos, upsert funciona, botón oculto para MANAGER

### Implementación US4

- [X] T049 `stock-config-drawer.tsx` ya existe con formulario upsert básico
- [ ] T050 Verificar que `stock-config-drawer.tsx` usa la Server Action correcta para `PUT /api/stock/by-location` con `revalidatePath`

**Checkpoint**: US4 funcional — configuración de stock por sucursal desde el detalle del producto.

---

## Phase 7: US5 — Resumen ejecutivo de stock (P5)

**Goal**: OWNER/ADMIN ven panel resumen con cantidad total por producto en todas las sucursales. MANAGER/STAFF son redirigidos.

**Independent Test**: Acceder a `/inventory/summary` como ADMIN, filtrar "Solo con alerta", ver desglose por sucursal.

### Tests US5 (RED primero)

- [ ] T051 Crear `apps/web/app/tenants/[slug]/(dashboard)/inventory/summary/summary-page-client.test.tsx` — tabla con totales, filtro "Solo con alerta" funciona, badge de alerta visible, MANAGER es redirigido

### Implementación US5

- [X] T052 `apps/web/app/tenants/[slug]/(dashboard)/inventory/summary/page.tsx` — Server Component con redirección para MANAGER/STAFF
- [X] T053 `apps/web/app/tenants/[slug]/(dashboard)/inventory/summary/summary-page-client.tsx` — tabla con `StockSummaryItem`, filtro de alerta, desglose expandible

**Checkpoint**: US5 funcional — panel de resumen ejecutivo con filtros.

---

## Phase 8: Settings > Categorías

**Purpose**: Pantalla de gestión de categorías en la sección de configuración del tenant.

- [ ] T054 Crear `apps/web/app/tenants/[slug]/(dashboard)/settings/categories/page.tsx` — Server Component: fetch de categorías del tenant, pasa `userRole`
- [ ] T055 Crear `apps/web/app/tenants/[slug]/(dashboard)/settings/categories/categories-page-client.test.tsx` — lista renderiza, "Nueva categoría" abre Dialog, eliminación con confirmación, error si tiene productos asignados
- [ ] T056 Crear `apps/web/app/tenants/[slug]/(dashboard)/settings/categories/categories-page-client.tsx` — lista de categorías, Dialog "Nueva categoría" (input de nombre + submit), eliminación con confirmación (Dialog), error si backend rechaza
- [ ] T057 Agregar enlace a "Categorías" en el menú de Settings (sidebar/nav)

**Checkpoint**: Pantalla de categorías funcional y enlazada desde el menú de configuración.

---

## Phase 9: Polish & Verificación final

**Purpose**: Asegurar que lint, tipos y tests pasan antes de marcar el sprint como completo.

- [ ] T058 [P] Ejecutar `pnpm lint` en el monorepo — sin errores ni warnings
- [ ] T059 [P] Ejecutar `pnpm check-types` — sin errores de TypeScript
- [ ] T060 [P] Ejecutar `pnpm --filter api test` — todos los unit tests del backend en verde
- [ ] T061 [P] Ejecutar `NODE_OPTIONS="--experimental-vm-modules" pnpm --filter api test:e2e` — todos los E2E en verde
- [ ] T062 [P] Ejecutar tests de frontend (Vitest) — todos los `.test.tsx` del módulo en verde
- [ ] T063 Validar flujo end-to-end: crear producto con nueva categoría inline, configurar stock en sucursal, verificar badge de alerta, revisar resumen ejecutivo

---

## Dependencies & Execution Order

### Orden obligatorio de fases

1. **Phase 1** (Schema-first) — sin dependencias, bloquea todo lo demás
2. **Phase 2** (Backend) — depende de Phase 1
3. **Phase 3–8** (Frontend) — pueden iniciar en paralelo una vez Phase 1 y Phase 2 estén completas
4. **Phase 9** (Polish) — después de todas las fases anteriores

### Dependencias entre fases de frontend

- **Phase 3** (US1) — bloquea parcialmente Phase 4 (el drawer de configuración de stock se abre desde el detalle)
- **Phases 5–8** — independientes entre sí, pueden ir en paralelo con Phase 3 y 4

### Notas

- `[P]` = archivos distintos, sin dependencias — pueden ejecutarse en paralelo
- Tests marcados con `[P]` pueden escribirse en paralelo con otros tests de la misma fase
- Ciclo Red→Green→Refactor obligatorio: cada test debe fallar antes de escribir implementación
- Commit después de cada fase completada
