# Implementation Plan: Módulo de Compras y Movimientos de Inventario

**Branch**: `015-sprint-dulo-compras` | **Date**: 2026-04-28 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/015-sprint-dulo-compras/spec.md`

---

## Summary

Implementar el ciclo completo de recepción de mercancía: los módulos `purchases` e `inventory-movements` en el backend NestJS. Cuando una orden de compra confirmada se recibe, se crea un `Purchase` que actualiza el stock en unidades individuales (`quantityReceived × unitsPerPackage`), genera un `InventoryMovement` automático para auditoría, y transiciona la orden a `RECEIVED` (primera recepción) o `COMPLETED` (100% recibido). Se agrega también un endpoint de cierre manual (`RECEIVED → CLOSED`). Todas las operaciones son atómicas vía `$transaction`.

---

## Technical Context

**Language/Version**: TypeScript 5 / Node.js 25  
**Primary Dependencies**: NestJS, Prisma 7, nestjs-zod, `@repo/types`  
**Storage**: PostgreSQL 16 con RLS — tablas `Purchase`, `PurchaseItem`, `InventoryMovement`, `InventoryMovementItem`, `LocationStock`, `PurchaseOrderItem`  
**Testing**: Jest (unit `.spec.ts` + E2E en `apps/api/test/`)  
**Target Platform**: Linux server (Docker / Render)  
**Project Type**: REST web service — módulo backend en NestJS monorepo  
**Performance Goals**: Listado de 10,000 registros en < 3s (cubierto por índices en research.md)  
**Constraints**: Multi-tenant RLS obligatorio, atomicidad total en recepción, sin `any`, ESM imports con `.js`  
**Scale/Scope**: 2 nuevos módulos NestJS, 1 nuevo endpoint en módulo existente, 1 migración Prisma

---

## Constitution Check

| Principio | Status | Notas |
|---|---|---|
| I. Multi-Tenant | ✅ PASS | `Purchase` e `InventoryMovement` tienen `tenantId`. MANAGER filtrado por `locationId` en servicio. |
| II. Schema-First | ✅ PASS | Zod schemas en `@repo/types` se crean antes del backend. DTOs via `createZodDto`. |
| III. Test-First | ✅ PASS | Red → Green → Refactor. Cada servicio tiene `.spec.ts` antes de implementación. |
| IV. Regulatory | ✅ PASS | Datos de inventario (no clínicos) — NOM-004 no aplica. `AuditLog` para CREATE de Purchase e InventoryMovement via `@Audit()`. |
| V. Security First | ✅ PASS | JwtAuthGuard en todos los endpoints. `$transaction` con `set_config` garantiza RLS bajo connection pooling. |
| VI. Simplicity | ✅ PASS | Un módulo por recurso. Funciones < 10 líneas. Sin `any`. Sin abstracciones prematuras. |

**Veredicto**: Todos los gates pasan. Se puede proceder a la implementación.

---

## Project Structure

### Documentation (this feature)

```text
specs/015-sprint-dulo-compras/
├── plan.md              ← este archivo
├── spec.md
├── research.md
├── data-model.md
├── contracts/
│   └── api.md
└── tasks.md             (generado por /speckit.tasks)
```

### Source Code — archivos a crear o modificar

```text
packages/types/src/
├── enums.ts                         MODIFY — agregar COMPLETED, CLOSED a PurchaseOrderStatusSchema
├── purchases.schemas.ts             CREATE  — todos los Zod schemas del sprint
└── index.ts                         MODIFY — export * from './purchases.schemas.js'

apps/api/prisma/
├── schema.prisma                    MODIFY — ver data-model.md
└── migrations/
    └── 20260428_sprint19_.../       CREATE  — migración única para todos los cambios

apps/api/src/
├── purchases/
│   ├── purchases.module.ts          CREATE
│   ├── purchases.controller.ts      CREATE
│   ├── purchases.service.ts         CREATE
│   ├── purchases.service.spec.ts    CREATE (primero — TDD)
│   └── dto/
│       ├── receive-purchase-order.dto.ts  CREATE
│       └── purchase-query.dto.ts          CREATE
├── inventory-movements/
│   ├── inventory-movements.module.ts          CREATE
│   ├── inventory-movements.controller.ts      CREATE
│   ├── inventory-movements.service.ts         CREATE
│   ├── inventory-movements.service.spec.ts    CREATE (primero — TDD)
│   └── dto/
│       └── inventory-movement-query.dto.ts    CREATE
├── purchase-orders/
│   ├── purchase-orders.service.ts   MODIFY — ALLOWED_TRANSITIONS + closePurchaseOrder()
│   ├── purchase-orders.controller.ts MODIFY — POST /:id/close
│   ├── purchase-orders.service.spec.ts MODIFY — tests para close + nuevos ALLOWED_TRANSITIONS
│   └── dto/
│       └── close-purchase-order.dto.ts  CREATE
├── prisma/
│   └── prisma.service.ts            MODIFY — exponer nuevos modelos (purchase, purchaseItem, etc.)
└── app.module.ts                    MODIFY — importar PurchasesModule, InventoryMovementsModule

apps/api/test/
├── purchases.e2e-spec.ts            CREATE
└── inventory-movements.e2e-spec.ts  CREATE
```

---

## Complexity Tracking

Sin violaciones a la constitución. No se requiere justificación adicional.

---

## Implementation Phases

### Phase A — Schema y Tipos (prerrequisito de todo lo demás)

**Objetivo**: Tener los contratos de datos listos antes de escribir cualquier código de servicio.

#### A.1 — Actualizar enum en @repo/types

Archivo: `packages/types/src/enums.ts`

```ts
export const PurchaseOrderStatusSchema = z.enum([
  'DRAFT',
  'SENT',
  'CONFIRMED',
  'RECEIVED',
  'COMPLETED',   // ← AGREGAR
  'CLOSED',      // ← AGREGAR
  'CANCELLED',
]);
```

#### A.2 — Crear packages/types/src/purchases.schemas.ts

Schema completo (ver contracts/api.md para shapes):

```ts
import { z } from 'zod';
import { MovementTypeSchema } from './enums.js';

// ── Recepción ──────────────────────────────────────────────────────────────

export const ReceivePurchaseItemSchema = z.object({
  purchaseOrderItemId: z.string().uuid(),
  productId: z.string().uuid(),
  quantityReceived: z.number().int().min(1, 'Cantidad recibida debe ser al menos 1'),
  unitsPerPackage: z.number().int().min(1, 'Unidades por empaque debe ser al menos 1').default(1),
  unitPrice: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Formato de precio inválido'),
  tax: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Formato de impuesto inválido').default('0').optional(),
});

export const ReceivePurchaseOrderSchema = z.object({
  purchaseOrderId: z.string().uuid(),
  locationId: z.string().uuid(),
  items: z.array(ReceivePurchaseItemSchema).min(1, 'Debe recibir al menos un ítem'),
  notes: z.string().optional(),
});

export const ClosePurchaseOrderSchema = z.object({
  notes: z.string().optional(),
});

// ── Responses ──────────────────────────────────────────────────────────────

export const PurchaseItemResponseSchema = z.object({
  id: z.string().uuid(),
  purchaseId: z.string().uuid(),
  productId: z.string().uuid(),
  quantity: z.number().int(),
  quantityReceived: z.number().int(),
  unitsPerPackage: z.number().int(),
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
  purchaseOrderId: z.string().uuid(),
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
  location: z.object({ id: z.string().uuid(), name: z.string() }),
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

// ── Inventory Movements ───────────────────────────────────────────────────

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

export const InventoryMovementDetailResponseSchema = InventoryMovementResponseSchema.extend({
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

// ── Inferred types ──────────────────────────────────────────────────────────

export type ReceivePurchaseItemDto = z.infer<typeof ReceivePurchaseItemSchema>;
export type ReceivePurchaseOrderDto = z.infer<typeof ReceivePurchaseOrderSchema>;
export type ClosePurchaseOrderDto = z.infer<typeof ClosePurchaseOrderSchema>;
export type PurchaseItemResponse = z.infer<typeof PurchaseItemResponseSchema>;
export type PurchaseResponse = z.infer<typeof PurchaseResponseSchema>;
export type PurchaseDetailResponse = z.infer<typeof PurchaseDetailResponseSchema>;
export type PurchaseQuery = z.infer<typeof PurchaseQuerySchema>;
export type PaginatedPurchasesResponse = z.infer<typeof PaginatedPurchasesResponseSchema>;
export type InventoryMovementItemResponse = z.infer<typeof InventoryMovementItemResponseSchema>;
export type InventoryMovementResponse = z.infer<typeof InventoryMovementResponseSchema>;
export type InventoryMovementDetailResponse = z.infer<typeof InventoryMovementDetailResponseSchema>;
export type InventoryMovementQuery = z.infer<typeof InventoryMovementQuerySchema>;
export type PaginatedInventoryMovementsResponse = z.infer<typeof PaginatedInventoryMovementsResponseSchema>;
```

#### A.3 — Actualizar packages/types/src/purchase-orders.schemas.ts

Agregar `unitsPerPackage` a `AddPurchaseOrderItemSchema`:

```ts
export const AddPurchaseOrderItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1),
  unitPrice: z.string().regex(/^\d+(\.\d{1,2})?$/),
  unitsPerPackage: z.number().int().min(1).default(1),  // ← AGREGAR
});
```

#### A.4 — Exportar en packages/types/src/index.ts

```ts
export * from './purchases.schemas.js';
```

---

### Phase B — Prisma Migration

**Objetivo**: Aplicar todos los cambios de schema en una única migración.

#### B.1 — Actualizar apps/api/prisma/schema.prisma

Aplicar todos los cambios documentados en `data-model.md`:
1. Agregar `COMPLETED` y `CLOSED` al enum `PurchaseOrderStatus`
2. Agregar `unitsPerPackage Int @default(1)` a `PurchaseOrderItem`
3. Agregar `locationId` y `purchaseOrderId` a `Purchase` + relación + índices
4. Reestructurar `PurchaseItem`: renombrar `price` → `unitPrice`, agregar `quantityReceived`, `unitsPerPackage`, `subtotal`, eliminar `packageQty`, agregar `createdAt`, agregar índice
5. Agregar `reference String?` a `InventoryMovement` + índices
6. Agregar índice a `InventoryMovementItem`

#### B.2 — Ejecutar migración

```bash
cd apps/api
npx prisma migrate dev --name sprint19_purchases_inventory_movements
npx prisma generate
```

#### B.3 — Actualizar PrismaService

Archivo: `apps/api/src/prisma/prisma.service.ts`

Exponer los nuevos modelos (si no están ya expuestos):
- `purchase`
- `purchaseItem`
- `inventoryMovement`
- `inventoryMovementItem`

Verificar que `purchaseOrderItem` esté expuesto (necesario para validación acumulada).

---

### Phase C — Purchase Orders: nuevos tests y cambios

**TDD primero**: escribir tests que fallen antes de modificar el servicio.

#### C.1 — Actualizar purchase-orders.service.spec.ts (RED primero)

Tests nuevos a agregar:

```ts
describe('ALLOWED_TRANSITIONS', () => {
  it('should NOT allow CONFIRMED to transition to RECEIVED via updateStatus');
  // CONFIRMED solo puede → CANCELLED via updateStatus
  // (RECEIVED lo hace el purchases service internamente)
  
  it('should allow RECEIVED to transition to CLOSED via updateStatus or closePurchaseOrder');
  
  it('COMPLETED and CLOSED should have no allowed transitions');
});

describe('closePurchaseOrder', () => {
  it('should transition RECEIVED order to CLOSED');
  it('should throw UnprocessableEntityException if order is not RECEIVED');
  it('should throw BadRequestException if role is MANAGER');
  it('should preserve existing notes if no new notes provided');
  it('should update notes if new notes provided');
});
```

Ejecutar: `pnpm --filter api test purchase-orders.service.spec.ts`
→ Deben fallar (RED).

#### C.2 — Implementar en purchase-orders.service.ts (GREEN)

**Cambio 1**: Actualizar `ALLOWED_TRANSITIONS`

```ts
const ALLOWED_TRANSITIONS: TransitionMap = {
  DRAFT:     ['SENT', 'CANCELLED'],
  SENT:      ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['CANCELLED'],       // RECEIVED es transición interna del purchases service
  RECEIVED:  ['CLOSED'],          // cierre manual
  COMPLETED: [],
  CLOSED:    [],
  CANCELLED: [],
};
```

**Cambio 2**: Nuevo método `closePurchaseOrder`

```ts
async closePurchaseOrder(
  tenantId: string,
  role: string,
  orderId: string,
  dto: ClosePurchaseOrderDto,
): Promise<PurchaseOrderResponse> {
  if (role !== 'OWNER' && role !== 'ADMIN') {
    throw new BadRequestException(
      'Solo OWNER y ADMIN pueden cerrar órdenes con saldo pendiente',
    );
  }

  const order = await this.prisma.purchaseOrder.findUniqueOrThrow({
    where: { id: orderId, tenantId },
  });

  if (order.status !== 'RECEIVED') {
    throw new UnprocessableEntityException(
      'Solo se pueden cerrar órdenes en estado RECEIVED',
    );
  }

  const updated = await this.prisma.purchaseOrder.update({
    where: { id: orderId },
    data: { status: 'CLOSED', ...(dto.notes ? { notes: dto.notes } : {}) },
    include: {
      supplier: { select: { id: true, name: true } },
      location: { select: { id: true, name: true } },
      items: { select: { id: true } },
    },
  });

  return buildOrderResponse({ ...updated, itemCount: updated.items.length });
}
```

#### C.3 — Actualizar purchase-orders.controller.ts

Agregar nuevo endpoint:

```ts
@Post(':id/close')
@UseGuards(JwtAuthGuard)
closePurchaseOrder(
  @CurrentUser() user: { userId: string; tenantId: string; role: string },
  @Param('id') id: string,
  @Body() dto: ClosePurchaseOrderDto,
) {
  return this.purchaseOrdersService.closePurchaseOrder(
    user.tenantId,
    user.role,
    id,
    dto,
  );
}
```

#### C.4 — Crear dto/close-purchase-order.dto.ts

```ts
import { createZodDto } from 'nestjs-zod';
import { ClosePurchaseOrderSchema } from '@repo/types';
export class ClosePurchaseOrderDto extends createZodDto(ClosePurchaseOrderSchema) {}
```

---

### Phase D — Módulo Purchases (TDD)

#### D.1 — Crear purchases.service.spec.ts (RED primero)

Crear el archivo con todos los tests antes de implementar el servicio. Estructura del mock de Prisma:

```ts
function makePrisma(overrides = {}) {
  return {
    $transaction: jest.fn().mockImplementation(async (fn) => fn(makeTx())),
    purchaseOrder: {
      findFirstOrThrow: jest.fn().mockResolvedValue(mockOrder),
      findMany: jest.fn().mockResolvedValue([mockOrder]),
      update: jest.fn().mockResolvedValue({ ...mockOrder }),
    },
    purchase: {
      findMany: jest.fn().mockResolvedValue([mockPurchase]),
      count: jest.fn().mockResolvedValue(1),
    },
    ...overrides,
  };
}

function makeTx(overrides = {}) {
  return {
    $executeRaw: jest.fn().mockResolvedValue(1),
    purchaseOrder: {
      findFirstOrThrow: jest.fn().mockResolvedValue(mockConfirmedOrder),
      update: jest.fn().mockResolvedValue(mockReceivedOrder),
    },
    purchaseOrderItem: {
      findMany: jest.fn().mockResolvedValue([mockOrderItem]),
      findFirstOrThrow: jest.fn().mockResolvedValue(mockOrderItem),
    },
    purchaseItem: {
      create: jest.fn().mockResolvedValue(mockPurchaseItem),
      findMany: jest.fn().mockResolvedValue([]),  // sin recepciones previas por defecto
    },
    purchase: {
      create: jest.fn().mockResolvedValue(mockPurchase),
      update: jest.fn().mockResolvedValue(mockPurchase),
      findMany: jest.fn().mockResolvedValue([mockPurchase]),
      findFirstOrThrow: jest.fn().mockResolvedValue(mockPurchase),
      count: jest.fn().mockResolvedValue(1),
    },
    locationStock: {
      findFirst: jest.fn().mockResolvedValue(null),  // sin stock previo por defecto
      create: jest.fn().mockResolvedValue(mockStock),
      update: jest.fn().mockResolvedValue(mockStock),
    },
    inventoryMovement: {
      create: jest.fn().mockResolvedValue(mockMovement),
      findMany: jest.fn().mockResolvedValue([mockMovement]),
      count: jest.fn().mockResolvedValue(1),
    },
    inventoryMovementItem: {
      create: jest.fn().mockResolvedValue(mockMovementItem),
    },
    supplier: {
      findFirstOrThrow: jest.fn().mockResolvedValue(mockSupplier),
    },
    location: {
      findFirstOrThrow: jest.fn().mockResolvedValue(mockLocation),
    },
    ...overrides,
  };
}
```

**Tests a escribir** (mínimo, en orden de prioridad):

```
describe('PurchasesService', () => {

  describe('create (receive purchase order)', () => {
    it('should create purchase with correct amount from items');
    it('should update LocationStock with quantityReceived × unitsPerPackage (not quantityReceived)');
    it('should create LocationStock if it does not exist');
    it('should increment existing LocationStock');
    it('should create InventoryMovement IN with reference "PURCHASE-{id}"');
    it('should create InventoryMovementItem with units (not packages)');
    it('should transition PurchaseOrder from CONFIRMED to RECEIVED on first receipt');
    it('should transition PurchaseOrder from RECEIVED to COMPLETED when all items 100% received');
    it('should keep PurchaseOrder in RECEIVED when partially received');
    it('should throw UnprocessableEntityException if order is not CONFIRMED or RECEIVED');
    it('should throw BadRequestException if role is STAFF');
    it('should throw ForbiddenException if MANAGER tries different location');
    it('should throw UnprocessableEntityException if quantityReceived exceeds cumulative limit');
    it('should calculate subtotal as quantityReceived × unitPrice');
    it('should use unitsPerPackage=1 as default when not provided (stockDelta = quantityReceived × 1)');
  });

  describe('findAll', () => {
    it('should return paginated purchases for tenant');
    it('should filter by supplierId');
    it('should filter by locationId');
    it('should restrict MANAGER to their locationId');
    it('should throw BadRequestException if STAFF');
  });

  describe('findOne', () => {
    it('should return purchase detail with items and product info');
    it('should throw NotFoundException if purchase not in tenant');
    it('should restrict MANAGER to their locationId');
  });
});
```

Ejecutar: `pnpm --filter api test purchases.service.spec.ts`
→ Deben fallar con "Cannot find module" (RED correcto).

#### D.2 — Crear la estructura del módulo (GREEN)

**purchases.module.ts**:
```ts
@Module({
  imports: [PrismaModule],
  controllers: [PurchasesController],
  providers: [PurchasesService],
})
export class PurchasesModule {}
```

**purchases.service.ts** — lógica principal:

El método `create` ejecuta todo en una sola `$transaction`:

```
$transaction(async (tx) => {
  1. set_config(tenantId, true)
  2. Validar PurchaseOrder (findFirstOrThrow, status CONFIRMED/RECEIVED)
  3. Validar locationId == PurchaseOrder.locationId
  4. Para cada ítem del request:
     a. findFirstOrThrow PurchaseOrderItem
     b. Calcular totalYaRecibido (findMany PurchaseItem WHERE purchase.purchaseOrderId AND productId)
     c. Validar totalYaRecibido + quantityReceived <= PurchaseOrderItem.quantity
  5. Crear Purchase (amount="0" provisional)
  6. Para cada ítem:
     a. Crear PurchaseItem
     b. stockDelta = quantityReceived × unitsPerPackage
     c. Upsert LocationStock (+= stockDelta)
  7. Actualizar Purchase.amount = SUM(subtotal + tax)
  8. Crear InventoryMovement IN
  9. Crear InventoryMovementItem por cada PurchaseItem (quantity = stockDelta)
  10. Calcular si todos los PurchaseOrderItems están al 100% recibido
  11. Actualizar PurchaseOrder.status = 'RECEIVED' o 'COMPLETED'
  12. Return Purchase con datos de supplier y location
})
```

**Puntos clave de implementación**:
- `toString()` helper para Decimal (mismo que purchase-orders.service.ts)
- Usar `findMany` con `where: { purchase: { purchaseOrderId: orderId } }` para recepciones previas
- `locationStock` upsert: `findFirst({ where: { locationId, productId } })` → `update` o `create`
- Comparación "100% completo": para cada `PurchaseOrderItem`, sumar todos los `PurchaseItem.quantityReceived` donde `purchase.purchaseOrderId = orderId` incluyendo el recién creado

**dto/receive-purchase-order.dto.ts**:
```ts
import { createZodDto } from 'nestjs-zod';
import { ReceivePurchaseOrderSchema } from '@repo/types';
export class ReceivePurchaseOrderDto extends createZodDto(ReceivePurchaseOrderSchema) {}
```

**dto/purchase-query.dto.ts**:
```ts
import { createZodDto } from 'nestjs-zod';
import { PurchaseQuerySchema } from '@repo/types';
export class PurchaseQueryDto extends createZodDto(PurchaseQuerySchema) {}
```

**purchases.controller.ts**:
```ts
@UseGuards(JwtAuthGuard)
@Controller('purchases')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Post()
  create(
    @CurrentUser() user: JwtUser,
    @Body() dto: ReceivePurchaseOrderDto,
  ) {
    return this.purchasesService.create(user.tenantId, user.userId, user.role, user.locationId, dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: JwtUser,
    @Query() query: PurchaseQueryDto,
  ) {
    return this.purchasesService.findAll(user.tenantId, user.role, user.locationId, query);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
  ) {
    return this.purchasesService.findOne(user.tenantId, user.role, user.locationId, id);
  }
}
```

#### D.3 — Ejecutar tests (VERIFY GREEN)

```bash
pnpm --filter api test purchases.service.spec.ts
```

Todos deben pasar. Si falla alguno, debuggear antes de continuar.

---

### Phase E — Módulo Inventory Movements (TDD)

#### E.1 — Crear inventory-movements.service.spec.ts (RED primero)

```
describe('InventoryMovementsService', () => {

  describe('findAll', () => {
    it('should return paginated movements for tenant');
    it('should filter by locationId');
    it('should filter by type IN');
    it('should filter by type OUT');
    it('should filter by dateFrom and dateTo');
    it('should restrict MANAGER to their locationId');
    it('should throw BadRequestException if STAFF');
  });

  describe('findOne', () => {
    it('should return movement detail with items and product info');
    it('should throw NotFoundException if movement not in tenant');
    it('should restrict MANAGER to their locationId');
  });
});
```

#### E.2 — Implementar inventory-movements (GREEN)

**inventory-movements.service.ts** — solo lectura, sin transacciones complejas:

`findAll`:
```ts
const where: Prisma.InventoryMovementWhereInput = {
  tenantId,
  ...(role === 'MANAGER' && userLocationId ? { locationId: userLocationId } : {}),
  ...(query.locationId ? { locationId: query.locationId } : {}),
  ...(query.type ? { type: query.type } : {}),
  ...(query.dateFrom || query.dateTo ? {
    date: {
      ...(query.dateFrom ? { gte: query.dateFrom } : {}),
      ...(query.dateTo ? { lte: query.dateTo } : {}),
    }
  } : {}),
};
```

**Nota sobre filtro por productId**: Cuando `query.productId` está presente, filtrar movimientos que tengan al menos un `InventoryMovementItem` con ese `productId`:
```ts
...(query.productId ? { items: { some: { productId: query.productId } } } : {}),
```

`findOne`: usar `$transaction` con `set_config` (mismo patrón que `PurchaseOrdersService.findOne`) para garantizar RLS bajo connection pooling.

**inventory-movements.controller.ts**:
```ts
@UseGuards(JwtAuthGuard)
@Controller('inventory-movements')
export class InventoryMovementsController {
  @Get()
  findAll(@CurrentUser() user: JwtUser, @Query() query: InventoryMovementQueryDto) { ... }

  @Get(':id')
  findOne(@CurrentUser() user: JwtUser, @Param('id') id: string) { ... }
}
```

---

### Phase F — Registrar módulos en app.module.ts

```ts
import { PurchasesModule } from './purchases/purchases.module.js';
import { InventoryMovementsModule } from './inventory-movements/inventory-movements.module.js';

@Module({
  imports: [
    // ... módulos existentes ...
    PurchasesModule,
    InventoryMovementsModule,
  ],
})
export class AppModule {}
```

---

### Phase G — E2E Tests

#### G.1 — purchases.e2e-spec.ts

Setup: similar a `purchase-orders.e2e-spec.ts` — crear tenant, user, supplier, location, product, locationStock inicial.

**Tests obligatorios**:

```
describe('/api/purchases (E2E)', () => {

  describe('POST /api/purchases — recibir orden', () => {
    it('flujo completo: crear orden → SENT → CONFIRMED → recibir → stock actualizado');
    it('stock en unidades individuales: 10 cajas × 100 = 1000 unidades');
    it('recepción parcial: 7 de 10 cajas → stock +700, PO en RECEIVED');
    it('segunda recepción: 3 restantes → stock +300, PO en COMPLETED');
    it('múltiples ítems en una recepción → stock actualizado por cada ítem');
    it('error 422 si quantityReceived > pendiente acumulado');
    it('error 422 si PO está en DRAFT (no CONFIRMED/RECEIVED)');
    it('error 403 si STAFF intenta recibir');
    it('error 403 si MANAGER intenta sucursal diferente');
  });

  describe('GET /api/purchases', () => {
    it('lista paginada de compras del tenant');
    it('filtro por supplierId');
    it('MANAGER solo ve su sucursal');
    it('error 403 para STAFF');
  });

  describe('GET /api/purchases/:id', () => {
    it('detalle con items, supplier, location');
    it('unitsPerPackage reflejado en cada ítem');
    it('error 404 si no pertenece al tenant');
  });
});
```

#### G.2 — inventory-movements.e2e-spec.ts

```
describe('/api/inventory-movements (E2E)', () => {

  it('movimiento IN creado automáticamente al recibir compra');
  it('reference == "PURCHASE-{purchaseId}"');
  it('items del movimiento en unidades individuales (no empaques)');
  it('filtro por locationId');
  it('filtro por type=IN');
  it('filtro por productId');
  it('detalle con items y datos de producto');
  it('error 403 para STAFF');
});
```

#### G.3 — Agregar test de close a purchase-orders.e2e-spec.ts

En el archivo existente agregar:
```
describe('POST /api/purchase-orders/:id/close', () => {
  it('cierra orden RECEIVED con saldo pendiente → status CLOSED');
  it('error 422 si orden no está en RECEIVED');
  it('error 400 si MANAGER intenta cerrar');
});
```

---

### Phase H — Verificación final

Ejecutar los tres gates obligatorios **en este orden**:

```bash
# 1. Unit tests
pnpm --filter api test

# 2. E2E tests
NODE_OPTIONS="--experimental-vm-modules" pnpm --filter api test:e2e

# 3. TypeScript
pnpm check-types

# 4. Lint
pnpm lint
```

**Criterio de done**: los cuatro comandos deben terminar con 0 errores y 0 warnings.

---

## Decision Log

| Decisión | Elección | Alternativa rechazada | Razón |
|---|---|---|---|
| Estado de PO en primera recepción | RECEIVED (no COMPLETED) | COMPLETED inmediato | Se permiten múltiples recepciones parciales |
| Auto-transición a COMPLETED | Dentro de `$transaction` tras calcular acumulado | Job async post-commit | Consistencia garantizada, sin estados intermedios |
| Cierre manual de orden parcial | CLOSED (estado nuevo) | CANCELLED | CANCELLED implica "nunca se quiso", CLOSED implica "se aceptó el faltante" |
| Transición CONFIRMED→RECEIVED via API externa | Bloqueada (solo interna) | Permitir via updateStatus | Evita saltarse validación de stock |
| Validación acumulada de cantidad | Dentro de transacción | Pre-check sin transacción | Previene race conditions concurrentes |
| unitsPerPackage en PurchaseOrderItem | Sí (además de en PurchaseItem) | Solo en PurchaseItem | Permite al UI pre-rellenar el campo al agregar ítems a la orden |

---

## Quickstart para implementar

```bash
# 1. Asegurar entorno
nvm use
docker-compose up -d

# 2. Actualizar tipos primero
# - Editar packages/types/src/enums.ts (COMPLETED, CLOSED)
# - Crear packages/types/src/purchases.schemas.ts
# - Editar packages/types/src/index.ts

# 3. Migración Prisma
cd apps/api
# - Editar prisma/schema.prisma según data-model.md
npx prisma migrate dev --name sprint19_purchases_inventory_movements
npx prisma generate

# 4. Tests primero (RED)
pnpm --filter api test purchase-orders.service.spec.ts  # debe fallar en nuevos tests
pnpm --filter api test -- --testPathPattern purchases    # debe fallar (archivo no existe)

# 5. Implementar (GREEN) en orden: C → D → E → F

# 6. Verificar
pnpm --filter api test
NODE_OPTIONS="--experimental-vm-modules" pnpm --filter api test:e2e
pnpm check-types
pnpm lint
```
