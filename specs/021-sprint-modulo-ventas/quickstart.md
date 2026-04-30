# Phase 1 Quick Start: Sprint 21 — Módulo 4: Ventas

**Date**: 2026-04-29

A developer-facing quick reference for implementing the Sales module backend. For detailed data model, see `data-model.md`. For research & clarifications, see `research.md`.

---

## Project Layout

```
apps/api/src/
├── sales/                       # Sale CRUD + folio + inventory deduction
│   ├── sales.controller.ts
│   ├── sales.service.ts         # Core business logic
│   ├── sales.spec.ts            # Unit tests (mocked PrismaService)
│   └── dto/
│       ├── create-sale.dto.ts
│       ├── sale-response.dto.ts
│       └── sale-item.dto.ts
├── income/                      # Income CRUD
│   ├── income.controller.ts
│   ├── income.service.ts
│   ├── income.spec.ts
│   └── dto/
│       ├── create-income.dto.ts
│       └── income-response.dto.ts
├── expense/                     # Expense CRUD
│   ├── expense.controller.ts
│   ├── expense.service.ts
│   ├── expense.spec.ts
│   └── dto/
│       ├── create-expense.dto.ts
│       └── expense-response.dto.ts
├── cash-close/                  # CashClose state machine + aggregation
│   ├── cash-close.controller.ts
│   ├── cash-close.service.ts
│   ├── cash-close.spec.ts
│   └── dto/
│       ├── create-cash-close.dto.ts
│       └── cash-close-response.dto.ts
└── app.module.ts                # Register all modules

apps/api/test/
├── sales.e2e.spec.ts           # E2E: creation, folio, inventory impact
├── income-expense.e2e.spec.ts   # E2E: CRUD, filtering, soft delete
├── cash-close.e2e.spec.ts       # E2E: close, immutability, conflicts

packages/types/src/
├── sales.schemas.ts             # Zod: CreateSaleSchema, SaleResponseSchema
├── income.schemas.ts            # Zod: CreateIncomeSchema, IncomeResponseSchema
├── expense.schemas.ts           # Zod: CreateExpenseSchema, ExpenseResponseSchema
├── cash-close.schemas.ts        # Zod: CreateCashCloseSchema, CashCloseResponseSchema
└── enums.ts                     # PaymentType, IncomeType, ExpenseType, SaleStatus, CashCloseStatus
```

---

## Step-by-Step Implementation

### Phase 1: Schema Definition (in `@repo/types`)

**1. Create `packages/types/src/sales.schemas.ts`**:

```typescript
import { z } from 'zod';
import { PaymentTypeEnum, SaleStatusEnum } from './enums.js';

// Enums
export const PaymentTypeEnum = z.enum([
  'CASH',
  'CREDIT',
  'BENEFIT',
  'INSURANCE',
  'TRANSFER',
]);
export type PaymentType = z.infer<typeof PaymentTypeEnum>;

export const SaleStatusEnum = z.enum([
  'ACTIVE',
  'FINISHED',
  'SETTLED',
  'CANCELLED',
]);
export type SaleStatus = z.infer<typeof SaleStatusEnum>;

// Schemas
export const SaleItemSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  unitPrice: z.string().regex(/^\d+\.\d{2}$/), // Decimal string
  tax: z.string().regex(/^\d+\.\d{2}$/),
  subtotal: z.string().regex(/^\d+\.\d{2}$/),
  createdAt: z.date(),
});

export const CreateSaleSchema = z.object({
  locationId: z.string().uuid(),
  paymentType: PaymentTypeEnum,
  items: z.array(
    z.object({
      productId: z.string().uuid(),
      quantity: z.number().int().positive(),
      unitPrice: z.string().regex(/^\d+\.\d{2}$/),
      tax: z.string().regex(/^\d+\.\d{2}$/),
    })
  ),
  notes: z.string().max(500).optional(),
  linkedPlanId: z.string().uuid().optional(),
});

export type CreateSaleDto = z.infer<typeof CreateSaleSchema>;

export const SaleResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  locationId: z.string().uuid(),
  folio: z.string(),
  totalAmount: z.string().regex(/^\d+\.\d{2}$/),
  paymentType: PaymentTypeEnum,
  status: SaleStatusEnum,
  isClosed: z.boolean(),
  userId: z.string().uuid(),
  items: z.array(SaleItemSchema),
  notes: z.string().optional(),
  createdAt: z.date(),
  finishedAt: z.date().nullable().optional(),
  settledAt: z.date().nullable().optional(),
  closedAt: z.date().nullable().optional(),
});

export type SaleResponse = z.infer<typeof SaleResponseSchema>;
```

**2. Create `packages/types/src/income.schemas.ts`**:

```typescript
export const IncomeTypeEnum = z.enum([
  'SERVICE_FEE',
  'DEPOSIT',
  'TRANSFER',
  'REFUND',
  'OTHER',
]);
export type IncomeType = z.infer<typeof IncomeTypeEnum>;

export const IncomeStatusEnum = z.enum(['ACTIVE', 'CANCELLED']);

export const CreateIncomeSchema = z.object({
  locationId: z.string().uuid(),
  type: IncomeTypeEnum,
  amount: z.string().regex(/^\d+\.\d{2}$/),
  description: z.string().max(500).optional(),
  customType: z.string().max(100).optional(),
});

export type CreateIncomeDto = z.infer<typeof CreateIncomeSchema>;

export const IncomeResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  locationId: z.string().uuid(),
  type: IncomeTypeEnum,
  amount: z.string().regex(/^\d+\.\d{2}$/),
  status: IncomeStatusEnum,
  isClosed: z.boolean(),
  userId: z.string().uuid(),
  createdAt: z.date(),
  cancelledAt: z.date().nullable().optional(),
  closedAt: z.date().nullable().optional(),
});

export type IncomeResponse = z.infer<typeof IncomeResponseSchema>;
```

**3. Create `packages/types/src/expense.schemas.ts`** (similar to Income but ExpenseType):

```typescript
export const ExpenseTypeEnum = z.enum([
  'PAYROLL',
  'SUPPLIES',
  'UTILITIES',
  'MAINTENANCE',
  'OTHER',
]);
```

**4. Create `packages/types/src/cash-close.schemas.ts`**:

```typescript
export const CashCloseStatusEnum = z.enum(['OPEN', 'CLOSED']);

export const CreateCashCloseSchema = z.object({
  locationId: z.string().uuid(),
  date: z.string().date(), // ISO 8601 date
});

export type CreateCashCloseDto = z.infer<typeof CreateCashCloseSchema>;

export const CashCloseResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  locationId: z.string().uuid(),
  date: z.string().date(),
  status: CashCloseStatusEnum,
  calculatedTotal: z.string().regex(/^\d+\.\d{2}$/),
  salesTotal: z.string().regex(/^\d+\.\d{2}$/),
  incomesTotal: z.string().regex(/^\d+\.\d{2}$/),
  expensesTotal: z.string().regex(/^\d+\.\d{2}$/),
  userId: z.string().uuid(),
  createdAt: z.date(),
  closedAt: z.date(),
});

export type CashCloseResponse = z.infer<typeof CashCloseResponseSchema>;
```

---

### Phase 2: NestJS Modules

**1. Update Prisma Schema** (`apps/api/prisma/schema.prisma`):

```prisma
// Add to schema
model Sale {
  id String @id @default(cuid())
  tenantId String
  locationId String
  folio String @unique
  totalAmount Decimal @db.Decimal(10, 2)
  paymentType String // CASH | CREDIT | BENEFIT | INSURANCE | TRANSFER
  status String @default("ACTIVE") // ACTIVE | FINISHED | SETTLED | CANCELLED
  isClosed Boolean @default(false)
  userId String
  notes String?
  createdAt DateTime @default(now())
  finishedAt DateTime?
  settledAt DateTime?
  closedAt DateTime?
  
  items SaleItem[]
  
  @@index([tenantId, locationId, createdAt])
  @@index([folio])
}

model SaleItem {
  id String @id @default(cuid())
  saleId String
  productId String
  quantity Int
  unitPrice Decimal @db.Decimal(10, 2)
  tax Decimal @db.Decimal(10, 2)
  subtotal Decimal @db.Decimal(10, 2)
  createdAt DateTime @default(now())
  
  sale Sale @relation(fields: [saleId], references: [id])
  
  @@index([saleId])
}

model Income {
  id String @id @default(cuid())
  tenantId String
  locationId String
  type String // SERVICE_FEE | DEPOSIT | TRANSFER | REFUND | OTHER
  customType String?
  amount Decimal @db.Decimal(10, 2)
  description String?
  status String @default("ACTIVE") // ACTIVE | CANCELLED
  isClosed Boolean @default(false)
  userId String
  createdAt DateTime @default(now())
  cancelledAt DateTime?
  closedAt DateTime?
  
  @@index([tenantId, locationId, createdAt])
  @@index([tenantId, status])
}

model Expense {
  id String @id @default(cuid())
  tenantId String
  locationId String
  type String // PAYROLL | SUPPLIES | UTILITIES | MAINTENANCE | OTHER
  customType String?
  amount Decimal @db.Decimal(10, 2)
  description String?
  status String @default("ACTIVE")
  isClosed Boolean @default(false)
  userId String
  createdAt DateTime @default(now())
  cancelledAt DateTime?
  closedAt DateTime?
  
  @@index([tenantId, locationId, createdAt])
  @@index([tenantId, status])
}

model CashClose {
  id String @id @default(cuid())
  tenantId String
  locationId String
  date DateTime @db.Date
  status String @default("OPEN") // OPEN | CLOSED
  calculatedTotal Decimal @db.Decimal(10, 2)
  salesTotal Decimal @db.Decimal(10, 2)
  incomesTotal Decimal @db.Decimal(10, 2)
  expensesTotal Decimal @db.Decimal(10, 2)
  userId String
  createdAt DateTime @default(now())
  closedAt DateTime @default(now())
  
  @@unique([tenantId, locationId, date])
}
```

Run `npx prisma migrate dev --name add_sales_module` to generate migration.

**2. Create SalesService** (`apps/api/src/sales/sales.service.ts`):

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateSaleDto } from '@repo/types';
import { currentUser } from '../common/decorators/current-user.js';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateSaleDto, user: CurrentUser): Promise<SaleResponse> {
    // 1. Validate stock for all items
    for (const item of dto.items) {
      const stock = await this.prisma.locationStock.findUnique({
        where: { tenantId_locationId_productId: { 
          tenantId: user.tenantId, 
          locationId: dto.locationId, 
          productId: item.productId 
        }},
      });
      
      if (!stock || stock.quantity < item.quantity) {
        throw new BadRequestException(`Insufficient stock for product ${item.productId}`);
      }
    }

    // 2. Check if period is closed (if applicable)
    const period = new Date(new Date().toISOString().split('T')[0]);
    const cashClose = await this.prisma.cashClose.findUnique({
      where: { tenantId_locationId_date: {
        tenantId: user.tenantId,
        locationId: dto.locationId,
        date: period,
      }},
    });
    
    if (cashClose?.status === 'CLOSED') {
      throw new BadRequestException('Cannot create sale for closed cash period');
    }

    // 3. Generate folio atomically
    const folio = await this.generateFolio(user.tenantId, dto.locationId);

    // 4. Create Sale + SaleItems + InventoryMovement in transaction
    const sale = await this.prisma.$transaction(async (tx) => {
      // 4a. Create Sale
      const sale = await tx.sale.create({
        data: {
          tenantId: user.tenantId,
          locationId: dto.locationId,
          folio,
          totalAmount: this.calculateTotal(dto.items),
          paymentType: dto.paymentType,
          status: 'ACTIVE',
          userId: user.userId,
          notes: dto.notes,
        },
      });

      // 4b. Create SaleItems
      const items = await Promise.all(
        dto.items.map((item) =>
          tx.saleItem.create({
            data: {
              saleId: sale.id,
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              tax: item.tax,
              subtotal: this.calculateSubtotal(item),
            },
          })
        )
      );

      // 4c. Decrement stock for each item
      for (const item of dto.items) {
        await tx.locationStock.update({
          where: {
            tenantId_locationId_productId: {
              tenantId: user.tenantId,
              locationId: dto.locationId,
              productId: item.productId,
            },
          },
          data: { quantity: { decrement: item.quantity } },
        });
      }

      // 4d. Create InventoryMovement (OUT)
      await tx.inventoryMovement.create({
        data: {
          tenantId: user.tenantId,
          locationId: dto.locationId,
          type: 'OUT',
          reference: `SALE-${sale.id}`,
          date: new Date(),
          userId: user.userId,
          items: {
            create: dto.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
          },
        },
      });

      // 4e. If BENEFIT payment, increment Plan.usedSessions
      if (dto.paymentType === 'BENEFIT' && dto.linkedPlanId) {
        const plan = await tx.plan.findUnique({
          where: { id: dto.linkedPlanId },
        });
        if (plan) {
          const newUsedSessions = plan.usedSessions + 1;
          await tx.plan.update({
            where: { id: dto.linkedPlanId },
            data: {
              usedSessions: newUsedSessions,
              status: newUsedSessions >= plan.plannedSessions ? 'EXHAUSTED' : undefined,
            },
          });
        }
      }

      return { ...sale, items };
    });

    // 5. Log to AuditLog (async, fire-and-forget)
    this.auditLog.logCreate('Sale', sale.id, user.tenantId, user.userId);

    return SaleResponseSchema.parse(sale);
  }

  private async generateFolio(tenantId: string, locationId: string): Promise<string> {
    // Query location code, current date, next sequence
    const location = await this.prisma.location.findUnique({ where: { id: locationId } });
    const now = new Date();
    const year = now.getFullYear();

    // Get current sequence (could use a dedicated Sequence table or SERIAL column)
    const lastSale = await this.prisma.sale.findFirst({
      where: {
        tenantId,
        locationId,
        createdAt: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year}-12-31`),
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const sequence = (lastSale ? parseInt(lastSale.folio.split('-')[2]) + 1 : 1)
      .toString()
      .padStart(5, '0');

    return `${location.code}-${year}-${sequence}`;
  }

  private calculateTotal(items: any[]): string {
    return items
      .reduce((sum, item) => {
        const itemTotal = parseFloat(item.unitPrice) * item.quantity + parseFloat(item.tax);
        return sum + itemTotal;
      }, 0)
      .toFixed(2);
  }

  private calculateSubtotal(item: any): string {
    return (parseFloat(item.unitPrice) * item.quantity + parseFloat(item.tax)).toFixed(2);
  }
}
```

**3. Create SalesController** (`apps/api/src/sales/sales.controller.ts`):

```typescript
import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.js';
import { SalesService } from './sales.service.js';
import { CreateSaleDto } from '@repo/types';

@Controller('api/sales')
@UseGuards(JwtAuthGuard)
export class SalesController {
  constructor(private sales: SalesService) {}

  @Post()
  async create(@Body() dto: CreateSaleDto, @CurrentUser() user: CurrentUser) {
    // Role check: STAFF cannot create sales
    if (user.role === 'STAFF') {
      throw new ForbiddenException('STAFF users cannot create sales');
    }
    
    return this.sales.create(dto, user);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUser) {
    return this.sales.findOne(id, user);
  }
}
```

**4. Create SalesModule** and add to `AppModule`:

```typescript
import { Module } from '@nestjs/common';
import { SalesController } from './sales.controller.js';
import { SalesService } from './sales.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [SalesController],
  providers: [SalesService],
})
export class SalesModule {}
```

Repeat for Income, Expense, CashClose modules.

---

### Phase 3: Testing (TDD Cycle)

**Unit Test Pattern** (using mocked PrismaService):

```typescript
// sales.service.spec.ts
describe('SalesService', () => {
  let service: SalesService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockPrisma = {
      sale: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
      saleItem: {
        create: jest.fn(),
      },
      locationStock: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((fn) => fn(mockPrisma)), // Mock transaction
    };

    const module = await Test.createTestingModule({
      providers: [
        SalesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SalesService>(SalesService);
    prisma = module.get(PrismaService);
  });

  it('should create a sale with valid items and generate folio', async () => {
    const dto: CreateSaleDto = {
      locationId: 'loc-123',
      paymentType: 'CASH',
      items: [{ productId: 'prod-1', quantity: 5, unitPrice: '100.00', tax: '0.00' }],
    };

    const user = { userId: 'user-1', tenantId: 'tenant-1', role: 'MANAGER', locationId: 'loc-123' };

    // Mock stock availability
    prisma.locationStock.findUnique.mockResolvedValue({
      id: 'stock-1',
      quantity: 10, // Enough
      productId: 'prod-1',
      locationId: 'loc-123',
    });

    prisma.sale.create.mockResolvedValue({
      id: 'sale-1',
      folio: 'LOC-2026-00001',
      totalAmount: '500.00',
      // ...rest of sale
    });

    const result = await service.create(dto, user);

    expect(result.folio).toBe('LOC-2026-00001');
    expect(prisma.locationStock.update).toHaveBeenCalled();
  });

  it('should reject sale if stock insufficient', async () => {
    // ...
  });
});
```

**E2E Test Pattern** (real DB):

```typescript
// sales.e2e.spec.ts
describe('/api/sales (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule], // Real app
    }).compile();
    app = module.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  it('should create sale, decrement stock, create movement', async () => {
    // Setup: create tenant, location, product, stock
    const tenant = await prisma.tenant.create({ data: { slug: 'test' } });
    const location = await prisma.location.create({
      data: { tenantId: tenant.id, name: 'Clinic A', code: 'CLI' },
    });
    const product = await prisma.product.create({
      data: { tenantId: tenant.id, name: 'Product X', sku: 'X1' },
    });
    const stock = await prisma.locationStock.create({
      data: {
        tenantId: tenant.id,
        locationId: location.id,
        productId: product.id,
        quantity: 100,
      },
    });

    // Act: POST /api/sales
    const res = await request(app.getHttpServer())
      .post('/api/sales')
      .set('Authorization', `Bearer ${token}`)
      .send({
        locationId: location.id,
        paymentType: 'CASH',
        items: [{ productId: product.id, quantity: 5, unitPrice: '100.00', tax: '0.00' }],
      });

    // Assert
    expect(res.status).toBe(201);
    expect(res.body.folio).toMatch(/CLI-\d{4}-\d{5}/);

    // Verify stock decremented
    const updatedStock = await prisma.locationStock.findUnique({
      where: { tenantId_locationId_productId: { tenantId: tenant.id, locationId: location.id, productId: product.id } },
    });
    expect(updatedStock.quantity).toBe(95);

    // Verify movement created
    const movement = await prisma.inventoryMovement.findFirst({
      where: { reference: `SALE-${res.body.id}` },
    });
    expect(movement).toBeDefined();
  });
});
```

---

## Running Tests

```bash
# Unit tests (mocked Prisma)
pnpm --filter api test

# Watch mode
pnpm --filter api test:watch

# E2E tests (real DB)
NODE_OPTIONS="--experimental-vm-modules" pnpm --filter api test:e2e

# Coverage
pnpm --filter api test:cov
```

All tests must pass before opening PR:

```bash
pnpm lint           # eslint + prettier
pnpm check-types    # TypeScript
pnpm test           # Jest (unit + E2E)
```

---

## Key Patterns Used

| Pattern | Usage | Example |
|---|---|---|
| **Atomic Transactions** | Stock deduction + sale creation | `prisma.$transaction(async (tx) => { ... })` |
| **Folio Generation** | Unique sequence per location | `{LOCATION_CODE}-{YYYY}-{NNNNN}` |
| **Soft Delete** | Income/Expense cancellation | `status = CANCELLED, cancelledAt = now()` |
| **RLS Multi-Tenant** | Extract tenantId from JWT, set PostgreSQL context | `TenantInterceptor` + RLS policies |
| **Fire-and-Forget Logging** | Async audit trail without blocking | `this.auditService.log()` (no await) |
| **Role-Based Guards** | MANAGER+, STAFF restrictions | `@UseGuards(JwtAuthGuard)` + role check in service |

---

## Common Mistakes to Avoid

❌ **Don't**: Trust totalAmount from client  
✅ **Do**: Calculate server-side

❌ **Don't**: Create sale without checking stock  
✅ **Do**: Validate stock before transaction

❌ **Don't**: Update CashClose after CLOSED  
✅ **Do**: Create new Income/Expense for corrections

❌ **Don't**: Forget to set tenantId from JWT  
✅ **Do**: Extract from `user.tenantId` in service

❌ **Don't**: Create inventory movement separately  
✅ **Do**: Create in same transaction as sale

❌ **Don't**: Skip RLS policy creation  
✅ **Do**: Add RLS to all 5 new tables

---

## Deployment Checklist

- [ ] Prisma migration created and tested locally
- [ ] All 5 modules registered in AppModule
- [ ] RLS policies applied to Sale, SaleItem, Income, Expense, CashClose
- [ ] Unit tests passing (`pnpm test`)
- [ ] E2E tests passing (`NODE_OPTIONS="..." pnpm test:e2e`)
- [ ] Lint passing (`pnpm lint`)
- [ ] Type check passing (`pnpm check-types`)
- [ ] Audit log integration verified
- [ ] Role-based access tested for all endpoints
- [ ] Multi-tenant isolation verified
- [ ] Performance targets met (<500ms per endpoint, <1s cash close)
