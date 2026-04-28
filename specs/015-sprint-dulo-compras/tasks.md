# Tasks: Módulo de Compras y Movimientos de Inventario

**Input**: Design documents from `/specs/015-sprint-dulo-compras/`  
**Branch**: `015-sprint-dulo-compras`  
**TDD**: Red → Green → Refactor obligatorio (constitución del proyecto)  
**Gates de done**: `pnpm test` + `pnpm check-types` + `pnpm lint` (los tres en 0 errores)

## Format: `[ID] [P?] [Story] Descripción con ruta exacta`

- **[P]**: Se puede ejecutar en paralelo con otras tareas del mismo nivel (archivos distintos, sin dependencias pendientes)
- **[US#]**: User Story de origen (spec.md)
- Rutas relativas a la raíz del monorepo `/Users/alejandroprado/pratum/renalfy/`

---

## Phase 1: Setup — Tipos y Schemas (@repo/types)

**Purpose**: Establecer el contrato de datos compartido antes de tocar el backend. Ninguna tarea de fases posteriores puede comenzar hasta que T004 esté completo (el backend importa de `@repo/types`).

**Dependencia de salida**: T001–T004 deben estar completos antes de iniciar Phase 2.

- [ ] T001 En `packages/types/src/enums.ts`, localizar `PurchaseOrderStatusSchema` (línea ~51) y agregar los valores `'COMPLETED'` y `'CLOSED'` al array del `z.enum([...])`, entre `'RECEIVED'` y `'CANCELLED'`. El array resultante debe ser `['DRAFT','SENT','CONFIRMED','RECEIVED','COMPLETED','CLOSED','CANCELLED']`. El tipo inferido `PurchaseOrderStatus` se actualiza automáticamente.

- [ ] T002 En `packages/types/src/purchase-orders.schemas.ts` (archivo existente), localizar `AddPurchaseOrderItemSchema` y agregar el campo `unitsPerPackage: z.number().int().min(1, 'Unidades por empaque debe ser al menos 1').default(1)`. Este campo es opcional en el formulario (tiene default) pero debe estar en el schema para que el backend lo reciba y el frontend pueda enviarlo.

- [ ] T003 Crear el archivo `packages/types/src/purchases.schemas.ts` con el contenido exacto definido en el plan.md (sección A.2). El archivo debe contener en orden: `ReceivePurchaseItemSchema`, `ReceivePurchaseOrderSchema`, `ClosePurchaseOrderSchema`, los 5 schemas de response para Purchase, los 3 schemas de query/pagination para Purchase, los 4 schemas para InventoryMovement, y todos los tipos inferidos con `z.infer<typeof ...>`. Verificar que todos los imports usen extensión `.js` para ESM: `import { MovementTypeSchema } from './enums.js'`.

- [ ] T004 [P] En `packages/types/src/index.ts`, agregar la línea `export * from './purchases.schemas.js';` después de la última exportación existente. Ejecutar `pnpm check-types` en el workspace `types` para confirmar que no hay errores de TypeScript antes de continuar.

---

## Phase 2: Foundational — Prisma Schema y Migración

**Purpose**: Actualizar el schema de base de datos y regenerar el cliente Prisma. Todas las fases de implementación del backend dependen de que el cliente Prisma esté generado con los nuevos campos.

**Regla**: Todos los cambios de schema en T005–T010 se hacen en el mismo archivo `apps/api/prisma/schema.prisma` antes de ejecutar la migración. Modificar el archivo en el orden especificado para evitar errores de referencia.

**Dependencia de salida**: T011 y T012 deben estar completos antes de iniciar Phase 3.

- [ ] T005 En `apps/api/prisma/schema.prisma`, localizar el bloque `enum PurchaseOrderStatus` (actualmente contiene DRAFT, SENT, CONFIRMED, RECEIVED, CANCELLED). Agregar `COMPLETED` y `CLOSED` entre `RECEIVED` y `CANCELLED`. El orden final debe ser: `DRAFT`, `SENT`, `CONFIRMED`, `RECEIVED`, `COMPLETED`, `CLOSED`, `CANCELLED`. Nota: este cambio en el enum de Prisma debe coincidir exactamente con el cambio hecho en T001 en `@repo/types`.

- [ ] T006 En `apps/api/prisma/schema.prisma`, localizar el modelo `PurchaseOrderItem` (línea ~412). Agregar el campo `unitsPerPackage Int @default(1)` después del campo `quantity`. El campo debe quedar entre `quantity` y `unitPrice`. Esto permite que cada línea de orden declare cuántas unidades individuales tiene el empaque.

- [ ] T007 En `apps/api/prisma/schema.prisma`, localizar el modelo `Purchase` (línea ~425). Aplicar estos cambios en orden: (1) agregar `locationId String` después de `tenantId`, (2) agregar `purchaseOrderId String` después de `supplierId`, (3) agregar la relación `purchaseOrder PurchaseOrder @relation(fields: [purchaseOrderId], references: [id])` en el bloque de relaciones (donde ya existe `items PurchaseItem[]`), (4) agregar al final del modelo los índices: `@@index([tenantId, date])`, `@@index([locationId])`, `@@index([purchaseOrderId])`. También agregar la relación inversa en el modelo `PurchaseOrder`: `purchases Purchase[]`.

- [ ] T008 En `apps/api/prisma/schema.prisma`, localizar el modelo `PurchaseItem` (línea ~438). Aplicar estos cambios: (1) renombrar el campo `price Decimal @db.Decimal(10, 2)` a `unitPrice Decimal @db.Decimal(10, 2)`, (2) agregar `quantityReceived Int` después de `quantity`, (3) agregar `unitsPerPackage Int @default(1)` después de `quantityReceived`, (4) agregar `subtotal Decimal @db.Decimal(10, 2)` después del campo `tax`, (5) eliminar la línea `packageQty Int?` (campo legado), (6) agregar `createdAt DateTime @default(now())` antes de la relación (si no existe), (7) agregar al final `@@index([purchaseId])`. Verificar que la relación con `Purchase` siga usando `onDelete: Cascade`.

- [ ] T009 En `apps/api/prisma/schema.prisma`, localizar el modelo `InventoryMovement` (línea ~450). Agregar el campo `reference String?` después del campo `type`. Agregar al final del modelo los índices: `@@index([tenantId, locationId, date])`, `@@index([tenantId, date])`.

- [ ] T010 [P] En `apps/api/prisma/schema.prisma`, localizar el modelo `InventoryMovementItem` (línea ~468). Agregar al final del modelo el índice `@@index([inventoryMovementId])`. Este es el único cambio en este modelo.

- [ ] T011 Ejecutar la migración de base de datos desde `apps/api/`: `npx prisma migrate dev --name sprint19_purchases_inventory_movements`. Este comando detectará todos los cambios de T005–T010 y generará el SQL correspondiente. Si el comando pide confirmación, escribir `y`. El comando crea la carpeta `apps/api/prisma/migrations/20260428.../` con el archivo `migration.sql`. Verificar que el SQL generado incluya: ALTER TYPE para COMPLETED/CLOSED, ALTER TABLE para los nuevos campos, índices nuevos, y el RENAME de `price` a `unitPrice` en PurchaseItem.

- [ ] T012 Ejecutar `npx prisma generate` desde `apps/api/`. Este comando regenera el cliente TypeScript en `apps/api/generated/prisma/`. Verificar que el cliente regenerado incluya los nuevos campos: `PurchaseOrderStatus.COMPLETED`, `PurchaseOrderStatus.CLOSED`, `PurchaseOrderItem.unitsPerPackage`, `Purchase.locationId`, `Purchase.purchaseOrderId`, `PurchaseItem.unitPrice`, `PurchaseItem.quantityReceived`, `PurchaseItem.unitsPerPackage`, `PurchaseItem.subtotal`, `InventoryMovement.reference`.

- [ ] T013 [P] En `apps/api/src/prisma/prisma.service.ts`, verificar que los siguientes modelos estén expuestos como propiedades `readonly` del servicio: `purchase`, `purchaseItem`, `inventoryMovement`, `inventoryMovementItem`, `purchaseOrderItem`. Si alguno falta, agregarlo siguiendo el patrón de composición existente. Revisar también que `locationStock` esté expuesto (necesario para el upsert de stock en Phase 3).

---

## Phase 3: US1 + US2 + US3 — Recepción de mercancía (P1)

**Stories cubiertas**:
- **US1**: Registrar recepción de orden completa (CONFIRMED → RECEIVED, stock actualizado)
- **US2**: Recepción parcial (quantityReceived < quantity, validación acumulada)
- **US3**: Conversión empaque→unidades (stockDelta = quantityReceived × unitsPerPackage)
- **Bonus (clarificación)**: Cierre manual con saldo pendiente (RECEIVED → CLOSED)

**Independent Test Criteria**: Se puede ejecutar `POST /api/purchases` con una orden confirmada, recibir mercancía especificando `unitsPerPackage`, y verificar que `LocationStock.quantity` aumentó en `quantityReceived × unitsPerPackage` (no solo `quantityReceived`).

**Dependencia de entrada**: Phase 1 y Phase 2 completas.

### Sub-fase C: Purchase Orders — cambios al módulo existente

- [ ] T014 En `apps/api/src/purchase-orders/purchase-orders.service.spec.ts`, agregar los siguientes tests al bloque `describe` existente (NO reemplazar los tests actuales, solo agregar):
  ```
  describe('ALLOWED_TRANSITIONS actualizados', () => {
    it('CONFIRMED no debe transicionar a RECEIVED via updateStatus (solo via purchases service)')
    it('RECEIVED debe permitir transición a CLOSED')
    it('COMPLETED no debe tener transiciones permitidas')
    it('CLOSED no debe tener transiciones permitidas')
  })
  describe('closePurchaseOrder', () => {
    it('debe transicionar orden RECEIVED a CLOSED')
    it('debe lanzar UnprocessableEntityException si la orden no está en RECEIVED')
    it('debe lanzar BadRequestException si el rol es MANAGER')
    it('debe actualizar las notas si se proveen en el DTO')
    it('debe lanzar NotFoundException si la orden no pertenece al tenant')
  })
  ```
  Ejecutar `pnpm --filter api test purchase-orders.service.spec.ts` y confirmar que los nuevos tests **fallan** (RED). Los tests existentes deben seguir pasando.

- [ ] T015 En `apps/api/src/purchase-orders/purchase-orders.service.ts`, actualizar el objeto `ALLOWED_TRANSITIONS` (línea ~26). Cambiar de:
  ```ts
  CONFIRMED: [],
  RECEIVED: [],
  ```
  A:
  ```ts
  CONFIRMED: ['CANCELLED'],
  RECEIVED: ['CLOSED'],
  COMPLETED: [],
  CLOSED: [],
  ```
  También actualizar el tipo `TransitionMap` si usa `PurchaseOrderStatus` como key para incluir `COMPLETED` y `CLOSED`. Ejecutar `pnpm --filter api test purchase-orders.service.spec.ts` y confirmar que los tests de ALLOWED_TRANSITIONS pasan (GREEN).

- [ ] T016 Crear `apps/api/src/purchase-orders/dto/close-purchase-order.dto.ts` con el contenido:
  ```ts
  import { createZodDto } from 'nestjs-zod';
  import { ClosePurchaseOrderSchema } from '@repo/types';
  export class ClosePurchaseOrderDto extends createZodDto(ClosePurchaseOrderSchema) {}
  ```

- [ ] T017 En `apps/api/src/purchase-orders/purchase-orders.service.ts`, agregar el método `closePurchaseOrder(tenantId, role, orderId, dto)` al final de la clase `PurchaseOrdersService`. El método debe: (1) lanzar `BadRequestException` si `role` no es `'OWNER'` ni `'ADMIN'`, (2) buscar la orden con `findUniqueOrThrow({ where: { id: orderId, tenantId } })`, (3) lanzar `NotFoundException` si el `findUniqueOrThrow` falla (capturar en try/catch), (4) lanzar `UnprocessableEntityException` si `order.status !== 'RECEIVED'`, (5) hacer `update({ where: { id: orderId }, data: { status: 'CLOSED', ...(dto.notes ? { notes: dto.notes } : {}) }, include: { supplier, location, items } })`, (6) retornar `buildOrderResponse({ ...updated, itemCount: updated.items.length })`. Ejecutar `pnpm --filter api test purchase-orders.service.spec.ts` — todos los tests incluidos los de `closePurchaseOrder` deben pasar (GREEN).

- [ ] T018 En `apps/api/src/purchase-orders/purchase-orders.controller.ts`, agregar el endpoint `@Post(':id/close')` al final del controller. El método debe llamar `this.purchaseOrdersService.closePurchaseOrder(user.tenantId, user.role, id, dto)` donde `user` viene del decorator `@CurrentUser()`, `id` del `@Param('id')`, y `dto` del `@Body()` tipado como `ClosePurchaseOrderDto`. Agregar el import de `ClosePurchaseOrderDto` con extensión `.js`.

### Sub-fase D: Módulo Purchases — lógica de recepción

- [ ] T019 Crear `apps/api/src/purchases/purchases.service.spec.ts`. Este archivo contiene **todos** los tests unitarios del servicio (create + findAll + findOne). Estructura:
  
  Sección de mocks — definir las funciones `makeTx()` y `makePrisma()` tal como está en el plan.md (sección D.1). Los mocks deben cubrir todos los modelos: `purchaseOrder`, `purchaseOrderItem`, `purchaseItem`, `purchase`, `locationStock`, `inventoryMovement`, `inventoryMovementItem`, `supplier`, `location`. La función `makeTx()` debe simular `$executeRaw` (mock de set_config) y todos los modelos dentro de la transacción.

  Tests del método `create()`:
  ```
  'debe crear Purchase con amount calculado como SUM(subtotal + tax)'
  'debe incrementar LocationStock con quantityReceived × unitsPerPackage (no solo quantityReceived)'
    → Verificar que locationStock.update o create fue llamado con quantity += quantityReceived * unitsPerPackage
  'debe crear LocationStock si no existe para ese locationId + productId'
    → makeTx().locationStock.findFirst retorna null
  'debe incrementar LocationStock existente correctamente'
    → makeTx().locationStock.findFirst retorna { quantity: 500 }
    → Verificar que update se llamó con quantity: 500 + stockDelta
  'debe crear InventoryMovement de tipo IN'
  'debe crear InventoryMovement con reference = "PURCHASE-{purchaseId}"'
  'debe crear InventoryMovementItem con quantity en unidades individuales (quantityReceived × unitsPerPackage)'
    → 10 empaques × 100 unidades/empaque = 1000 en InventoryMovementItem
  'debe transicionar PurchaseOrder a RECEIVED en la primera recepción'
    → Cuando purchaseItem.findMany retorna [] (sin recepciones previas)
  'debe transicionar PurchaseOrder a COMPLETED cuando suma acumulada = 100% de todos los ítems'
    → Configurar mock para que totalYaRecibido + quantityReceived = PurchaseOrderItem.quantity
  'debe mantener PurchaseOrder en RECEIVED cuando la recepción es parcial'
  'debe lanzar BadRequestException si role es STAFF'
  'debe lanzar ForbiddenException si MANAGER intenta sucursal diferente a su locationId'
  'debe lanzar UnprocessableEntityException si PurchaseOrder no está en CONFIRMED o RECEIVED'
  'debe lanzar UnprocessableEntityException si quantityReceived supera el límite acumulado'
    → totalYaRecibido = 7, quantityOrdered = 10, quantityReceived = 4 → 7+4=11 > 10 → Error
  'debe calcular subtotal como quantityReceived × unitPrice'
  'debe usar unitsPerPackage=1 cuando no se provee (stockDelta = quantityReceived × 1)'
  ```

  Tests del método `findAll()`:
  ```
  'debe retornar lista paginada de compras del tenant'
  'debe filtrar por supplierId si se provee'
  'debe filtrar por locationId si se provee'
  'debe restringir MANAGER a su locationId automáticamente'
  'debe lanzar BadRequestException si role es STAFF'
  ```

  Tests del método `findOne()`:
  ```
  'debe retornar detalle de compra con items, supplier y location'
  'debe lanzar NotFoundException si la compra no pertenece al tenant'
  'debe restringir MANAGER a su locationId'
  ```

  Ejecutar `pnpm --filter api test -- --testPathPattern purchases.service` — debe fallar con "Cannot find module" (RED correcto, el archivo de implementación no existe aún).

- [ ] T020 Crear `apps/api/src/purchases/dto/receive-purchase-order.dto.ts`:
  ```ts
  import { createZodDto } from 'nestjs-zod';
  import { ReceivePurchaseOrderSchema } from '@repo/types';
  export class ReceivePurchaseOrderDto extends createZodDto(ReceivePurchaseOrderSchema) {}
  ```

- [ ] T021 [P] Crear `apps/api/src/purchases/dto/purchase-query.dto.ts`:
  ```ts
  import { createZodDto } from 'nestjs-zod';
  import { PurchaseQuerySchema } from '@repo/types';
  export class PurchaseQueryDto extends createZodDto(PurchaseQuerySchema) {}
  ```

- [ ] T022 Crear `apps/api/src/purchases/purchases.service.ts`. El archivo debe exportar la clase `PurchasesService` con constructor que inyecta `PrismaService`. Implementar el método `create(tenantId, userId, role, userLocationId, dto)` siguiendo **exactamente** el flujo transaccional del plan.md (sección D.2 y plan general sección "Paso a paso"). Puntos críticos:

  **Validaciones ANTES de la transacción** (más eficiente, para errores rápidos):
  - Si `role === 'STAFF'` → throw `BadRequestException('STAFF no tiene acceso a compras')`
  - Si `role === 'MANAGER' && userLocationId && dto.locationId !== userLocationId` → throw `ForbiddenException('No tienes acceso a esta sucursal')`

  **Dentro de `$transaction(async (tx) => { ... })`**:
  1. `await tx.$executeRaw\`SELECT set_config('app.current_tenant_id', ${tenantId}, true)\``
  2. `const order = await tx.purchaseOrder.findFirstOrThrow({ where: { id: dto.purchaseOrderId, tenantId } })` — envolver en try/catch para convertir PrismaClientKnownRequestError en NotFoundException
  3. Si `order.status !== 'CONFIRMED' && order.status !== 'RECEIVED'` → throw `UnprocessableEntityException('La orden debe estar en estado CONFIRMED o RECEIVED')`
  4. Si `order.locationId !== dto.locationId` → throw `ForbiddenException('La sucursal no coincide con la orden')`
  5. Para cada ítem en `dto.items`:
     - `const poItem = await tx.purchaseOrderItem.findFirstOrThrow({ where: { id: item.purchaseOrderItemId, purchaseOrderId: dto.purchaseOrderId } })`
     - `const prevReceived = await tx.purchaseItem.findMany({ where: { purchase: { purchaseOrderId: dto.purchaseOrderId }, productId: item.productId } })`
     - `const totalPrevReceived = prevReceived.reduce((sum, pi) => sum + pi.quantityReceived, 0)`
     - Si `totalPrevReceived + item.quantityReceived > poItem.quantity` → throw `UnprocessableEntityException(\`No se puede recibir ${item.quantityReceived}, quedan ${poItem.quantity - totalPrevReceived} por recibir\`)`
  6. `const purchase = await tx.purchase.create({ data: { tenantId, locationId: dto.locationId, userId, supplierId: order.supplierId, purchaseOrderId: dto.purchaseOrderId, date: new Date(), amount: '0', notes: dto.notes ?? null } })`
  7. `let totalAmount = 0; const purchaseItems = [];`
  8. Para cada ítem en `dto.items`:
     - `const subtotal = (parseFloat(item.unitPrice) * item.quantityReceived).toFixed(2)`
     - `const taxNum = parseFloat(item.tax ?? '0')`
     - `totalAmount += parseFloat(subtotal) + taxNum`
     - `const pi = await tx.purchaseItem.create({ data: { purchaseId: purchase.id, productId: item.productId, quantity: poItem.quantity, quantityReceived: item.quantityReceived, unitsPerPackage: item.unitsPerPackage ?? 1, unitPrice: item.unitPrice, tax: item.tax ?? '0', subtotal } })`
     - `purchaseItems.push(pi)`
  9. `await tx.purchase.update({ where: { id: purchase.id }, data: { amount: totalAmount.toFixed(2) } })`
  10. Para cada `purchaseItem`:
      - `const stockDelta = purchaseItem.quantityReceived * purchaseItem.unitsPerPackage`
      - `const existingStock = await tx.locationStock.findFirst({ where: { locationId: dto.locationId, productId: purchaseItem.productId } })`
      - Si existe: `await tx.locationStock.update({ where: { id: existingStock.id }, data: { quantity: existingStock.quantity + stockDelta } })`
      - Si no existe: `await tx.locationStock.create({ data: { tenantId, locationId: dto.locationId, productId: purchaseItem.productId, quantity: stockDelta, minStock: 0, alertLevel: 0 } })`
  11. `const movement = await tx.inventoryMovement.create({ data: { tenantId, locationId: dto.locationId, userId, date: new Date(), type: 'IN', reference: \`PURCHASE-${purchase.id}\`, notes: dto.notes ?? null } })`
  12. Para cada `purchaseItem`:
      - `const stockDelta = purchaseItem.quantityReceived * purchaseItem.unitsPerPackage`
      - `await tx.inventoryMovementItem.create({ data: { inventoryMovementId: movement.id, productId: purchaseItem.productId, quantity: stockDelta } })`
  13. Calcular si la orden está completa:
      - `const allOrderItems = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: dto.purchaseOrderId } })`
      - Para cada `orderItem`: `const allReceived = await tx.purchaseItem.findMany({ where: { purchase: { purchaseOrderId: dto.purchaseOrderId }, productId: orderItem.productId } })`; `const total = allReceived.reduce((s, pi) => s + pi.quantityReceived, 0)`; si `total < orderItem.quantity` → `isComplete = false`
      - `const newStatus = isComplete ? 'COMPLETED' : 'RECEIVED'`
  14. `await tx.purchaseOrder.update({ where: { id: dto.purchaseOrderId }, data: { status: newStatus } })`
  15. Obtener supplier y location para el response: `const [supplier, location] = await Promise.all([tx.supplier.findFirstOrThrow({ where: { id: order.supplierId, tenantId } }), tx.location.findFirstOrThrow({ where: { id: dto.locationId } })])`
  16. Retornar `buildPurchaseResponse(purchase, purchaseItems, supplier, location)`

  Agregar función auxiliar `buildPurchaseResponse()` y `toString()` helper (mismo patrón que purchase-orders.service.ts).

  Ejecutar `pnpm --filter api test -- --testPathPattern purchases.service` — los tests de `create()` del paso T019 deben pasar (GREEN). Los tests de `findAll` y `findOne` seguirán fallando (RED) hasta T023.

- [ ] T023 En `apps/api/src/purchases/purchases.service.ts`, agregar el método `findAll(tenantId, role, userLocationId, query)`. Si `role === 'STAFF'` → throw `BadRequestException`. Construir `where: Prisma.PurchaseWhereInput` con: `tenantId`, más filtros opcionales de `query.supplierId`, `query.locationId`, `query.dateFrom`/`dateTo` (usando `date: { gte, lte }`), filtro de búsqueda `query.search` (busca en `supplier.name`). Si `role === 'MANAGER' && userLocationId` → agregar `locationId: userLocationId` al where (sobreescribe cualquier otro locationId filter). Hacer `Promise.all([findMany con includes de supplier, location, _count de items], count)`. Retornar `{ data: data.map(buildPurchaseResponse), total, page, limit }`. Ejecutar `pnpm --filter api test -- --testPathPattern purchases.service` — tests de `findAll` deben pasar.

- [ ] T024 En `apps/api/src/purchases/purchases.service.ts`, agregar el método `findOne(tenantId, role, userLocationId, id)`. Si `role === 'STAFF'` → throw `BadRequestException`. Usar `$transaction` con `set_config` (mismo patrón que `PurchaseOrdersService.findOne`): (1) set_config, (2) `purchase.findFirstOrThrow({ where: { id, tenantId, ...(role==='MANAGER' && userLocationId ? { locationId: userLocationId } : {}) } })`, (3) `Promise.all([supplier, location, purchaseItems con product])`. Construir y retornar `PurchaseDetailResponse`. Si cualquier error no es `NotFoundException` o `BadRequestException`, envolver en `NotFoundException('Compra con ID {id} no encontrada')`. Ejecutar `pnpm --filter api test -- --testPathPattern purchases.service` — TODOS los tests deben pasar (GREEN completo).

- [ ] T025 Crear `apps/api/src/purchases/purchases.controller.ts` con los tres endpoints. El controller lleva `@UseGuards(JwtAuthGuard)` a nivel de clase. Endpoints:
  - `@Post() create(@CurrentUser() user, @Body() dto: ReceivePurchaseOrderDto)` → llama `purchasesService.create(user.tenantId, user.userId, user.role, user.locationId ?? null, dto)`
  - `@Get() findAll(@CurrentUser() user, @Query() query: PurchaseQueryDto)` → llama `purchasesService.findAll(user.tenantId, user.role, user.locationId ?? null, query)`
  - `@Get(':id') findOne(@CurrentUser() user, @Param('id') id: string)` → llama `purchasesService.findOne(user.tenantId, user.role, user.locationId ?? null, id)`
  
  Todos los imports con extensión `.js`. El tipo de `user` es `{ userId: string; tenantId: string; role: string; locationId?: string | null }`.

- [ ] T026 Crear `apps/api/src/purchases/purchases.module.ts`:
  ```ts
  import { Module } from '@nestjs/common';
  import { PurchasesController } from './purchases.controller.js';
  import { PurchasesService } from './purchases.service.js';

  @Module({
    controllers: [PurchasesController],
    providers: [PurchasesService],
  })
  export class PurchasesModule {}
  ```

- [ ] T027 En `apps/api/src/app.module.ts`, importar `PurchasesModule` desde `'./purchases/purchases.module.js'` y agregarlo al array `imports`. Ejecutar `pnpm --filter api test -- --testPathPattern purchases.service` para confirmar que nada se rompió.

---

## Phase 4: US4 — Consultar historial de compras (P2)

**Stories cubiertas**: US4 (GET /purchases y GET /purchases/:id)

**Independent Test Criteria**: Con 3 compras registradas en la BD de test, `GET /api/purchases` retorna paginación correcta y `GET /api/purchases/:id` retorna el detalle con ítems y datos de producto.

**Nota**: Los tests unitarios de `findAll` y `findOne` ya fueron escritos en T019 (misma spec file). Las implementaciones van en T023 y T024 (Phase 3). En esta fase solo van los tests de integración E2E.

**Dependencia de entrada**: Phase 3 completa (T019–T027).

- [ ] T028 Crear `apps/api/test/purchases.e2e-spec.ts`. Seguir el patrón de `apps/api/test/purchase-orders.e2e-spec.ts` para el setup/teardown (crear tenant, OWNER user, supplier, location, product). Los tests E2E deben cubrir:

  **Setup compartido** (beforeEach o beforeAll según aplique):
  - Crear tenant con slug único
  - Crear usuario OWNER con token JWT válido
  - Crear supplier activo vinculado al tenant
  - Crear location vinculada al tenant
  - Crear product vinculado al tenant
  - Crear PurchaseOrder en estado CONFIRMED (pasar por DRAFT→SENT→CONFIRMED via endpoints existentes) con un PurchaseOrderItem de `quantity: 10, unitsPerPackage: 100`

  **Tests de POST /api/purchases**:
  ```
  'flujo completo: debe crear compra y transicionar PO a RECEIVED'
    → POST /purchases con quantityReceived: 5, unitsPerPackage: 100
    → Verificar status 201, response tiene id, amount, supplierId, locationId
    → GET /purchase-orders/:id → status debe ser RECEIVED

  'stock en unidades individuales: 10 empaques × 100 = 1000 unidades'
    → POST /purchases con quantityReceived: 10, unitsPerPackage: 100
    → Verificar via endpoint de products/stock que LocationStock.quantity es 1000 (no 10)

  'recepción parcial: 7 de 10 → stock +700, PO sigue en RECEIVED'
    → POST /purchases con quantityReceived: 7
    → Verificar stock = 700, PO.status = RECEIVED

  'segunda recepción del saldo: 3 restantes → PO pasa a COMPLETED'
    → POST /purchases (primera) con quantityReceived: 7
    → POST /purchases (segunda) con quantityReceived: 3
    → GET /purchase-orders/:id → status debe ser COMPLETED

  'error 422 si quantityReceived supera el límite acumulado'
    → POST /purchases con quantityReceived: 11 (> 10 ordenados)
    → Verificar status 422, body.message contiene 'No se puede recibir'

  'error 422 si PO está en DRAFT'
    → Crear PO nueva (no confirmar)
    → POST /purchases → Verificar status 422

  'error 403 si STAFF intenta recibir'
    → Crear usuario STAFF, obtener token
    → POST /purchases → Verificar status 403

  'múltiples ítems en una recepción: stock correcto por cada ítem'
    → PO con 2 PurchaseOrderItems (productA, productB)
    → POST /purchases con 2 ítems, cada uno con unitsPerPackage distinto
    → Verificar stock de cada producto actualizado correctamente
  ```

  **Tests de GET /api/purchases**:
  ```
  'debe retornar lista paginada con total correcto'
  'debe filtrar por supplierId'
  'MANAGER solo ve compras de su sucursal'
  'error 403 para STAFF'
  ```

  **Tests de GET /api/purchases/:id**:
  ```
  'debe retornar detalle con items (quantity, quantityReceived, unitsPerPackage, unitPrice, tax, subtotal)'
  'debe incluir datos de supplier y location'
  'error 404 si no pertenece al tenant'
  ```

  **Tests de POST /api/purchase-orders/:id/close**:
  ```
  'debe cerrar orden RECEIVED con saldo pendiente → status CLOSED'
    → POST /purchases (parcial, 7 de 10)
    → POST /purchase-orders/:id/close
    → GET /purchase-orders/:id → status = CLOSED

  'error 422 si orden no está en RECEIVED'
    → Intentar cerrar PO en CONFIRMED
    → Verificar 422

  'error 400 si MANAGER intenta cerrar'
    → Crear MANAGER user
    → POST /purchase-orders/:id/close → Verificar 400
  ```

  Ejecutar: `NODE_OPTIONS="--experimental-vm-modules" pnpm --filter api test:e2e -- --testPathPattern purchases` — todos deben pasar.

---

## Phase 5: US5 — Consultar movimientos de inventario (P2)

**Stories cubiertas**: US5 (GET /inventory-movements y GET /inventory-movements/:id)

**Independent Test Criteria**: Después de registrar una compra, `GET /api/inventory-movements` muestra el movimiento IN creado automáticamente con `reference = "PURCHASE-{id}"` y los ítems en unidades individuales.

**Dependencia de entrada**: Phase 3 completa (el módulo de purchases debe existir para que se creen movimientos automáticos en los E2E).

- [ ] T029 Crear `apps/api/src/inventory-movements/inventory-movements.service.spec.ts`. Definir mock de PrismaService con los modelos necesarios (`inventoryMovement`, `inventoryMovementItem`). Tests a incluir:

  **Tests de `findAll()`**:
  ```
  'debe retornar lista paginada de movimientos del tenant'
  'debe filtrar por locationId cuando se provee'
  'debe filtrar por type=IN'
  'debe filtrar por type=OUT'
  'debe filtrar por dateFrom y dateTo (rango de fechas)'
  'debe filtrar por productId (movimientos que contengan ese producto en sus ítems)'
  'debe restringir MANAGER a su locationId automáticamente'
  'debe lanzar BadRequestException si role es STAFF'
  ```

  **Tests de `findOne()`**:
  ```
  'debe retornar movimiento con items y datos de producto'
  'debe lanzar NotFoundException si movimiento no pertenece al tenant'
  'debe restringir MANAGER a su locationId'
  ```

  Ejecutar `pnpm --filter api test -- --testPathPattern inventory-movements.service` — debe fallar (RED).

- [ ] T030 Crear `apps/api/src/inventory-movements/dto/inventory-movement-query.dto.ts`:
  ```ts
  import { createZodDto } from 'nestjs-zod';
  import { InventoryMovementQuerySchema } from '@repo/types';
  export class InventoryMovementQueryDto extends createZodDto(InventoryMovementQuerySchema) {}
  ```

- [ ] T031 Crear `apps/api/src/inventory-movements/inventory-movements.service.ts`. Exportar clase `InventoryMovementsService` con constructor que inyecta `PrismaService`. Implementar dos métodos:

  **`findAll(tenantId, role, userLocationId, query)`**:
  - Si `role === 'STAFF'` → throw `BadRequestException('STAFF no tiene acceso a movimientos de inventario')`
  - Construir `where: Prisma.InventoryMovementWhereInput`:
    - Siempre: `tenantId`
    - Si `role === 'MANAGER' && userLocationId`: `locationId: userLocationId` (tiene precedencia sobre query.locationId)
    - Si `query.locationId` y no es MANAGER: `locationId: query.locationId`
    - Si `query.type`: `type: query.type`
    - Si `query.dateFrom || query.dateTo`: `date: { gte: query.dateFrom, lte: query.dateTo }` (omitir clave si no hay valor)
    - Si `query.productId`: `items: { some: { productId: query.productId } }`
  - `skip = (page - 1) * limit`
  - `Promise.all([findMany({ where, skip, take: limit, orderBy: { date: 'desc' }, include: { _count: { select: { items: true } } } }), count({ where })])`
  - Retornar `{ data: data.map(m => buildMovementResponse(m, m._count.items)), total, page, limit }`

  **`findOne(tenantId, role, userLocationId, id)`**:
  - Si `role === 'STAFF'` → throw `BadRequestException`
  - Usar `$transaction` con `set_config`:
    ```ts
    return await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
      const movement = await tx.inventoryMovement.findFirstOrThrow({
        where: { id, tenantId, ...(role === 'MANAGER' && userLocationId ? { locationId: userLocationId } : {}) },
      });
      const items = await tx.inventoryMovementItem.findMany({
        where: { inventoryMovementId: id },
        include: { product: { select: { id: true, name: true, brand: true } } },  // NOTA: si no hay FK en schema, ajustar
      });
      return buildMovementDetailResponse(movement, items);
    });
    ```
  - Si falla: throw `NotFoundException('Movimiento con ID {id} no encontrado')`

  Agregar helpers `buildMovementResponse()` y `buildMovementDetailResponse()`.

  Ejecutar `pnpm --filter api test -- --testPathPattern inventory-movements.service` — todos los tests deben pasar (GREEN).

- [ ] T032 [P] Crear `apps/api/src/inventory-movements/inventory-movements.controller.ts`:
  ```ts
  @UseGuards(JwtAuthGuard)
  @Controller('inventory-movements')
  export class InventoryMovementsController {
    constructor(private readonly service: InventoryMovementsService) {}

    @Get()
    findAll(@CurrentUser() user: JwtUser, @Query() query: InventoryMovementQueryDto) {
      return this.service.findAll(user.tenantId, user.role, user.locationId ?? null, query);
    }

    @Get(':id')
    findOne(@CurrentUser() user: JwtUser, @Param('id') id: string) {
      return this.service.findOne(user.tenantId, user.role, user.locationId ?? null, id);
    }
  }
  ```

- [ ] T033 [P] Crear `apps/api/src/inventory-movements/inventory-movements.module.ts`:
  ```ts
  @Module({
    controllers: [InventoryMovementsController],
    providers: [InventoryMovementsService],
  })
  export class InventoryMovementsModule {}
  ```

- [ ] T034 En `apps/api/src/app.module.ts`, importar `InventoryMovementsModule` desde `'./inventory-movements/inventory-movements.module.js'` y agregarlo al array `imports`. Confirmar que ya está `PurchasesModule` del T027.

- [ ] T035 Crear `apps/api/test/inventory-movements.e2e-spec.ts`. Setup: registrar una compra (POST /purchases) usando el flujo completo (PO en CONFIRMED). Tests:
  ```
  'debe crear automáticamente movimiento IN al registrar una compra'
    → GET /inventory-movements → debe haber exactamente 1 movimiento con type=IN

  'el movimiento debe tener reference = "PURCHASE-{purchaseId}"'
    → GET /inventory-movements → verificar campo reference

  'los ítems del movimiento deben estar en unidades individuales'
    → Compra: 10 empaques × 100 unidades/empaque
    → GET /inventory-movements/:id → items[0].quantity debe ser 1000 (no 10)

  'debe filtrar por locationId'
    → 2 compras en distintas sucursales
    → GET /inventory-movements?locationId={id1} → solo devuelve los de id1

  'debe filtrar por type=IN'
    → GET /inventory-movements?type=IN → todos los resultados tienen type IN

  'debe filtrar por productId'
    → GET /inventory-movements?productId={productId} → solo movimientos con ese producto

  'GET /inventory-movements/:id debe incluir items con datos de producto'
    → Verificar que cada item tiene product.id, product.name, product.brand

  'error 403 para STAFF'
    → GET /inventory-movements con token STAFF → status 403

  'MANAGER solo ve movimientos de su sucursal'
    → 2 movimientos en sucursales distintas
    → MANAGER de sucursal A → solo ve 1 movimiento
  ```

  Ejecutar: `NODE_OPTIONS="--experimental-vm-modules" pnpm --filter api test:e2e -- --testPathPattern inventory-movements` — todos deben pasar.

---

## Phase 6: Polish — Gates de Done

**Purpose**: Verificar que todos los tests, tipos y linting pasan sin errores antes de hacer commit.

- [ ] T036 Ejecutar todos los tests unitarios del backend: `pnpm --filter api test`. Verificar que la salida muestre 0 failures. Si hay failures, investigar la causa raíz antes de continuar (no suprimir errores).

- [ ] T037 [P] Ejecutar todos los E2E tests: `NODE_OPTIONS="--experimental-vm-modules" pnpm --filter api test:e2e`. Verificar que la salida muestre 0 failures. Los E2E requieren que la BD de test esté corriendo (docker-compose up -d).

- [ ] T038 [P] Ejecutar typecheck en todo el monorepo: `pnpm check-types`. Verificar 0 errores de TypeScript. Los errores más comunes a revisar: (1) campos del schema Prisma que no coinciden con los types de `@repo/types`, (2) imports de `@repo/types` que usan tipos renombrados, (3) propiedades del `PrismaService` no expuestas.

- [ ] T039 [P] Ejecutar linting: `pnpm lint`. Verificar 0 errores y 0 warnings. Atención especial a: imports sin extensión `.js` en archivos NestJS, uso de `any` (está configurado como error), variables no utilizadas.

- [ ] T040 Crear commit con todos los archivos del sprint. Verificar con `git status` que no se incluyan archivos `.env` o credenciales. El mensaje de commit debe seguir el formato: `feat(sprint-19): purchases and inventory-movements modules with package-to-unit conversion`.

---

## Dependency Graph

```
T001 ─┐
T002 ─┤
T003 ─┼──► T004 ──► T005 ─┐
                           T006 ─┐
                           T007 ─┤
                           T008 ─┼──► T011 ──► T012 ──► T013
                           T009 ─┤
                           T010 ─┘

T012 (prisma generate) ──► T014 ──► T015 ──► T016 ──► T017 ──► T018 ──► T019 ──► T020
                                                                                   T021 ─┐
                                                                                   T022 ─┼──► T023 ──► T024 ──► T025 ──► T026 ──► T027
T027 ──► T028 (E2E purchases)

T027 ──► T029 ──► T030
                  T031 ──► T032 ─┐
                           T033 ─┼──► T034 ──► T035 (E2E inventory-movements)

T028 + T035 ──► T036 ──► T037 + T038 + T039 ──► T040
```

---

## Parallel Execution Opportunities

| Grupo | Tasks | Condición |
|---|---|---|
| Schemas @repo/types | T001, T002 | Archivos independientes en packages/types |
| Schema Prisma | T009, T010 | Misma sesión de edición, mismo archivo — editar secuencialmente |
| DTOs purchases | T020, T021 | Archivos independientes, sin dependencias entre sí |
| Módulo inventory | T032, T033 | Archivos independientes del mismo módulo |
| Gates finales | T037, T038, T039 | Comandos independientes tras T036 |

---

## Implementation Strategy

**MVP (mínimo viable para demostrar valor)**: T001–T027 — permite registrar recepciones con conversión empaque→unidades, cierre manual de órdenes, y lista/detalle de compras.

**Incremento 1**: T028 — E2E de purchases (valida el flujo completo en BD real).

**Incremento 2**: T029–T035 — módulo inventory-movements completo con E2E.

**Entrega final**: T036–T040 — gates de done y commit.

---

## Resumen

| Métrica | Valor |
|---|---|
| Total de tareas | 40 |
| Phase 1 (Setup) | 4 tareas (T001–T004) |
| Phase 2 (Foundational) | 9 tareas (T005–T013) |
| Phase 3 (US1/US2/US3 — P1) | 14 tareas (T014–T027) |
| Phase 4 (US4 — P2) | 1 tarea (T028) |
| Phase 5 (US5 — P2) | 7 tareas (T029–T035) |
| Phase 6 (Polish) | 5 tareas (T036–T040) |
| Tareas paralelizables [P] | 10 |
| Archivos a crear | 14 |
| Archivos a modificar | 9 |
| Migraciones Prisma | 1 |
