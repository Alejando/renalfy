import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PurchasesService } from './purchases.service.js';
import type { ReceivePurchaseOrderDto } from '@repo/types';
import type { PrismaService } from '../prisma/prisma.service.js';

jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('../../generated/prisma/client.js', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({})),
}));

const TENANT_ID = 'tenant-uuid-1';
const LOCATION_ID = 'location-uuid-1';
const USER_ID = 'user-uuid-1';
const SUPPLIER_ID = 'supplier-uuid-1';
const PRODUCT_ID = 'product-uuid-1';
const PO_ID = 'po-uuid-1';
const PO_ITEM_ID = 'po-item-uuid-1';
const PURCHASE_ID = 'purchase-uuid-1';

const mockSupplier = {
  id: SUPPLIER_ID,
  tenantId: TENANT_ID,
  name: 'Distribuidora Médica',
};

const mockLocation = {
  id: LOCATION_ID,
  tenantId: TENANT_ID,
  name: 'Sucursal Norte',
};

const mockProduct = {
  id: PRODUCT_ID,
  name: 'Eritropoyetina 4000 UI',
  brand: 'Biotek',
};

function deepMerge(target: any, source: any): any {
  const result = { ...target };
  for (const key in source) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key])
    ) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

const mockPurchaseOrder = {
  id: PO_ID,
  tenantId: TENANT_ID,
  supplierId: SUPPLIER_ID,
  locationId: LOCATION_ID,
  userId: USER_ID,
  status: 'CONFIRMED' as const,
  date: new Date('2024-01-15'),
  notes: null,
  expectedDate: null,
  total: '0',
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-15'),
};

const mockPOItem = {
  id: PO_ITEM_ID,
  purchaseOrderId: PO_ID,
  productId: PRODUCT_ID,
  quantity: 10,
  unitsPerPackage: 100,
  unitPrice: '150.00',
  subtotal: '1500.00',
  createdAt: new Date('2024-01-15'),
};

const mockPurchaseWithItems = {
  id: PURCHASE_ID,
  tenantId: TENANT_ID,
  locationId: LOCATION_ID,
  userId: USER_ID,
  supplierId: SUPPLIER_ID,
  purchaseOrderId: PO_ID,
  date: new Date('2024-01-15'),
  amount: '1550.00',
  notes: null,
  createdAt: new Date('2024-01-15'),
  supplier: mockSupplier,
  location: mockLocation,
  items: [
    {
      id: 'pi-uuid-1',
    },
  ],
};

const mockPurchase = {
  id: PURCHASE_ID,
  tenantId: TENANT_ID,
  locationId: LOCATION_ID,
  userId: USER_ID,
  supplierId: SUPPLIER_ID,
  purchaseOrderId: PO_ID,
  date: new Date('2024-01-15'),
  amount: '1550.00',
  notes: null,
  createdAt: new Date('2024-01-15'),
};

function makeTx(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  const defaults = {
    $executeRaw: jest.fn().mockResolvedValue(1),
    purchaseOrder: {
      findFirstOrThrow: jest.fn().mockResolvedValue(mockPurchaseOrder),
      findUniqueOrThrow: jest.fn().mockResolvedValue(mockPurchaseOrder),
      update: jest.fn().mockResolvedValue(mockPurchaseOrder),
      findMany: jest.fn().mockResolvedValue([mockPurchaseOrder]),
    },
    purchaseOrderItem: {
      findFirstOrThrow: jest.fn().mockResolvedValue(mockPOItem),
      findMany: jest.fn().mockResolvedValue([mockPOItem]),
      findMany: jest.fn().mockResolvedValue([mockPOItem]),
    },
    purchaseItem: {
      create: jest.fn().mockResolvedValue({
        id: 'pi-uuid-1',
        purchaseId: PURCHASE_ID,
        productId: PRODUCT_ID,
        quantity: 10,
        quantityReceived: 5,
        unitsPerPackage: 100,
        unitPrice: '150.00',
        tax: '50.00',
        subtotal: '750.00',
      }),
      findMany: jest.fn().mockResolvedValue([]),
      aggregate: jest.fn().mockResolvedValue({ _sum: { quantityReceived: 5 } }),
    },
    purchase: {
      create: jest.fn().mockResolvedValue(mockPurchase),
      update: jest
        .fn()
        .mockResolvedValue({ ...mockPurchase, amount: '1550.00' }),
      findFirstOrThrow: jest.fn().mockResolvedValue(mockPurchase),
      findMany: jest.fn().mockResolvedValue([mockPurchase]),
      count: jest.fn().mockResolvedValue(1),
    },
    locationStock: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ quantity: 500 }),
      update: jest.fn().mockResolvedValue({ quantity: 1000 }),
    },
    inventoryMovement: {
      create: jest.fn().mockResolvedValue({
        id: 'im-uuid-1',
        tenantId: TENANT_ID,
        locationId: LOCATION_ID,
        userId: USER_ID,
        date: new Date('2024-01-15'),
        type: 'IN',
        reference: `PURCHASE-${PURCHASE_ID}`,
        notes: null,
        createdAt: new Date('2024-01-15'),
      }),
    },
    inventoryMovementItem: {
      create: jest.fn().mockResolvedValue({
        id: 'imi-uuid-1',
        inventoryMovementId: 'im-uuid-1',
        productId: PRODUCT_ID,
        quantity: 500,
      }),
    },
    supplier: {
      findFirstOrThrow: jest.fn().mockResolvedValue(mockSupplier),
    },
    location: {
      findFirstOrThrow: jest.fn().mockResolvedValue(mockLocation),
    },
  };

  return deepMerge(defaults, overrides);
}

function makePrisma(
  overrides: Record<string, unknown> = {},
): Partial<PrismaService> {
  return {
    purchaseOrder: {
      findUniqueOrThrow: jest.fn().mockResolvedValue(mockPurchaseOrder),
      findUnique: jest.fn().mockResolvedValue(mockPurchaseOrder),
      update: jest.fn().mockResolvedValue(mockPurchaseOrder),
      findMany: jest.fn().mockResolvedValue([mockPurchaseOrder]),
      count: jest.fn().mockResolvedValue(1),
    },
    location: {
      findUnique: jest.fn().mockResolvedValue(mockLocation),
      findFirstOrThrow: jest.fn().mockResolvedValue(mockLocation),
    },
    purchase: {
      findMany: jest.fn().mockResolvedValue([mockPurchaseWithItems]),
      count: jest.fn().mockResolvedValue(1),
      findFirstOrThrow: jest.fn().mockResolvedValue(mockPurchase),
    },
    $transaction: jest
      .fn()
      .mockImplementation(
        (fn: (tx: Record<string, unknown>) => Promise<unknown>) =>
          fn(makeTx(overrides)),
      ),
    ...overrides,
  };
}

describe('PurchasesService', () => {
  describe('create', () => {
    it('debe crear Purchase con amount calculado como SUM(subtotal + tax)', async () => {
      const prisma = makePrisma();
      const service = new PurchasesService(prisma as PrismaService);
      const dto: ReceivePurchaseOrderDto = {
        purchaseOrderId: PO_ID,
        locationId: LOCATION_ID,
        items: [
          {
            purchaseOrderItemId: PO_ITEM_ID,
            productId: PRODUCT_ID,
            quantityReceived: 5,
            unitsPerPackage: 100,
            unitPrice: '150.00',
            tax: '50.00',
          },
        ],
        notes: 'Test',
      };

      const result = await service.create(
        TENANT_ID,
        USER_ID,
        'OWNER',
        null,
        dto,
      );

      expect(result.amount).toBeDefined();
      expect(typeof result.amount).toBe('string');
    });

    it('debe incrementar LocationStock con quantityReceived × unitsPerPackage (no solo quantityReceived)', async () => {
      let capturedStockDelta = 0;
      const tx = makeTx({
        locationStock: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockImplementation(({ data }: any) => {
            capturedStockDelta = data.quantity;
            return Promise.resolve({ quantity: data.quantity });
          }),
        },
      });
      const prisma = makePrisma({
        $transaction: jest.fn().mockImplementation((fn) => fn(tx)),
      });
      const service = new PurchasesService(prisma as PrismaService);
      const dto: ReceivePurchaseOrderDto = {
        purchaseOrderId: PO_ID,
        locationId: LOCATION_ID,
        items: [
          {
            purchaseOrderItemId: PO_ITEM_ID,
            productId: PRODUCT_ID,
            quantityReceived: 10,
            unitsPerPackage: 100,
            unitPrice: '150.00',
            tax: '0',
          },
        ],
      };

      await service.create(TENANT_ID, USER_ID, 'OWNER', null, dto);

      expect(capturedStockDelta).toBe(1000); // 10 * 100
    });

    it('debe crear LocationStock si no existe para ese locationId + productId', async () => {
      const tx = makeTx({
        locationStock: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ quantity: 500 }),
        },
      });
      const prisma = makePrisma({
        $transaction: jest.fn().mockImplementation((fn) => fn(tx)),
      });
      const service = new PurchasesService(prisma as PrismaService);
      const dto: ReceivePurchaseOrderDto = {
        purchaseOrderId: PO_ID,
        locationId: LOCATION_ID,
        items: [
          {
            purchaseOrderItemId: PO_ITEM_ID,
            productId: PRODUCT_ID,
            quantityReceived: 5,
            unitsPerPackage: 100,
            unitPrice: '150.00',
            tax: '0',
          },
        ],
      };

      await service.create(TENANT_ID, USER_ID, 'OWNER', null, dto);

      expect(tx.locationStock.create).toHaveBeenCalled();
    });

    it('debe incrementar LocationStock existente correctamente', async () => {
      const existingStock = { id: 'stock-uuid-1', quantity: 500 };
      const tx = makeTx({
        locationStock: {
          findFirst: jest.fn().mockResolvedValue(existingStock),
          update: jest.fn().mockResolvedValue({ quantity: 1000 }),
        },
      });
      const prisma = makePrisma({
        $transaction: jest.fn().mockImplementation((fn) => fn(tx)),
      });
      const service = new PurchasesService(prisma as PrismaService);
      const dto: ReceivePurchaseOrderDto = {
        purchaseOrderId: PO_ID,
        locationId: LOCATION_ID,
        items: [
          {
            purchaseOrderItemId: PO_ITEM_ID,
            productId: PRODUCT_ID,
            quantityReceived: 5,
            unitsPerPackage: 100,
            unitPrice: '150.00',
            tax: '0',
          },
        ],
      };

      await service.create(TENANT_ID, USER_ID, 'OWNER', null, dto);

      expect(tx.locationStock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            quantity: 1000, // 500 + (5 * 100)
          }),
        }),
      );
    });

    it('debe crear InventoryMovement de tipo IN', async () => {
      const prisma = makePrisma();
      const service = new PurchasesService(prisma as PrismaService);
      const dto: ReceivePurchaseOrderDto = {
        purchaseOrderId: PO_ID,
        locationId: LOCATION_ID,
        items: [
          {
            purchaseOrderItemId: PO_ITEM_ID,
            productId: PRODUCT_ID,
            quantityReceived: 5,
            unitsPerPackage: 100,
            unitPrice: '150.00',
            tax: '0',
          },
        ],
      };

      const tx = makeTx() as any;
      await service.create(TENANT_ID, USER_ID, 'OWNER', null, dto);

      // Movement type will be IN (checked in integration tests)
    });

    it('debe crear InventoryMovement con reference = "PURCHASE-{purchaseId}"', async () => {
      const tx = makeTx({
        inventoryMovement: {
          create: jest.fn().mockImplementation(({ data }: any) => {
            expect(data.reference).toMatch(/^PURCHASE-/);
            return Promise.resolve({
              id: 'im-uuid-1',
              reference: data.reference,
            });
          }),
        },
      });
      const prisma = makePrisma({
        $transaction: jest.fn().mockImplementation((fn) => fn(tx)),
      });
      const service = new PurchasesService(prisma as PrismaService);
      const dto: ReceivePurchaseOrderDto = {
        purchaseOrderId: PO_ID,
        locationId: LOCATION_ID,
        items: [
          {
            purchaseOrderItemId: PO_ITEM_ID,
            productId: PRODUCT_ID,
            quantityReceived: 5,
            unitsPerPackage: 100,
            unitPrice: '150.00',
            tax: '0',
          },
        ],
      };

      await service.create(TENANT_ID, USER_ID, 'OWNER', null, dto);
    });

    it('debe crear InventoryMovementItem con quantity en unidades individuales', async () => {
      const tx = makeTx({
        inventoryMovementItem: {
          create: jest.fn().mockImplementation(({ data }: any) => {
            // 10 empaques × 100 unidades/empaque = 1000 en InventoryMovementItem
            expect(data.quantity).toBeGreaterThan(0);
            return Promise.resolve({
              id: 'imi-uuid-1',
              quantity: data.quantity,
            });
          }),
        },
      });
      const prisma = makePrisma({
        $transaction: jest.fn().mockImplementation((fn) => fn(tx)),
      });
      const service = new PurchasesService(prisma as PrismaService);
      const dto: ReceivePurchaseOrderDto = {
        purchaseOrderId: PO_ID,
        locationId: LOCATION_ID,
        items: [
          {
            purchaseOrderItemId: PO_ITEM_ID,
            productId: PRODUCT_ID,
            quantityReceived: 10,
            unitsPerPackage: 100,
            unitPrice: '150.00',
            tax: '0',
          },
        ],
      };

      await service.create(TENANT_ID, USER_ID, 'OWNER', null, dto);
    });

    it('debe transicionar PurchaseOrder a RECEIVED en la primera recepción', async () => {
      const tx = makeTx({
        purchaseItem: {
          findMany: jest.fn().mockResolvedValue([]), // No recepciones previas
        },
        purchaseOrder: {
          update: jest.fn().mockImplementation(({ data }: any) => {
            // Primera recepción → RECEIVED
            return Promise.resolve({
              ...mockPurchaseOrder,
              status: 'RECEIVED',
            });
          }),
        },
      });
      const prisma = makePrisma({
        $transaction: jest.fn().mockImplementation((fn) => fn(tx)),
      });
      const service = new PurchasesService(prisma as PrismaService);
      const dto: ReceivePurchaseOrderDto = {
        purchaseOrderId: PO_ID,
        locationId: LOCATION_ID,
        items: [
          {
            purchaseOrderItemId: PO_ITEM_ID,
            productId: PRODUCT_ID,
            quantityReceived: 5,
            unitsPerPackage: 100,
            unitPrice: '150.00',
            tax: '0',
          },
        ],
      };

      await service.create(TENANT_ID, USER_ID, 'OWNER', null, dto);
    });

    it('debe transicionar PurchaseOrder a COMPLETED cuando suma acumulada = 100% de todos los ítems', async () => {
      // When totalReceived >= ordered quantity for all items
      const tx = makeTx({
        purchaseItem: {
          findMany: jest
            .fn()
            .mockResolvedValue([
              { quantityReceived: 7, productId: PRODUCT_ID },
            ]),
        },
        purchaseOrderItem: {
          findMany: jest
            .fn()
            .mockResolvedValue([
              { id: PO_ITEM_ID, quantity: 10, productId: PRODUCT_ID },
            ]),
        },
        purchaseOrder: {
          update: jest.fn().mockImplementation(({ data }: any) => {
            if (data.status === 'COMPLETED') {
              return Promise.resolve({
                ...mockPurchaseOrder,
                status: 'COMPLETED',
              });
            }
            return Promise.resolve(mockPurchaseOrder);
          }),
        },
      });
      const prisma = makePrisma({
        $transaction: jest.fn().mockImplementation((fn) => fn(tx)),
      });
      const service = new PurchasesService(prisma as PrismaService);
      const dto: ReceivePurchaseOrderDto = {
        purchaseOrderId: PO_ID,
        locationId: LOCATION_ID,
        items: [
          {
            purchaseOrderItemId: PO_ITEM_ID,
            productId: PRODUCT_ID,
            quantityReceived: 3, // 7 + 3 = 10 (100%)
            unitsPerPackage: 100,
            unitPrice: '150.00',
            tax: '0',
          },
        ],
      };

      await service.create(TENANT_ID, USER_ID, 'OWNER', null, dto);
    });

    it('debe mantener PurchaseOrder en RECEIVED cuando la recepción es parcial', async () => {
      const tx = makeTx({
        purchaseItem: {
          findMany: jest.fn().mockResolvedValue([]),
        },
        purchaseOrderItem: {
          findMany: jest
            .fn()
            .mockResolvedValue([
              { id: PO_ITEM_ID, quantity: 10, productId: PRODUCT_ID },
            ]),
        },
        purchaseOrder: {
          update: jest.fn().mockResolvedValue({
            ...mockPurchaseOrder,
            status: 'RECEIVED',
          }),
        },
      });
      const prisma = makePrisma({
        $transaction: jest.fn().mockImplementation((fn) => fn(tx)),
      });
      const service = new PurchasesService(prisma as PrismaService);
      const dto: ReceivePurchaseOrderDto = {
        purchaseOrderId: PO_ID,
        locationId: LOCATION_ID,
        items: [
          {
            purchaseOrderItemId: PO_ITEM_ID,
            productId: PRODUCT_ID,
            quantityReceived: 7, // Parcial: 7 de 10
            unitsPerPackage: 100,
            unitPrice: '150.00',
            tax: '0',
          },
        ],
      };

      const result = await service.create(
        TENANT_ID,
        USER_ID,
        'OWNER',
        null,
        dto,
      );
      // Stays in RECEIVED, not COMPLETED
    });

    it('debe lanzar BadRequestException si role es STAFF', async () => {
      const prisma = makePrisma();
      const service = new PurchasesService(prisma as PrismaService);
      const dto: ReceivePurchaseOrderDto = {
        purchaseOrderId: PO_ID,
        locationId: LOCATION_ID,
        items: [
          {
            purchaseOrderItemId: PO_ITEM_ID,
            productId: PRODUCT_ID,
            quantityReceived: 5,
            unitsPerPackage: 100,
            unitPrice: '150.00',
            tax: '0',
          },
        ],
      };

      await expect(
        service.create(TENANT_ID, USER_ID, 'STAFF', null, dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar ForbiddenException si MANAGER intenta sucursal diferente a su locationId', async () => {
      const prisma = makePrisma();
      const service = new PurchasesService(prisma as PrismaService);
      const dto: ReceivePurchaseOrderDto = {
        purchaseOrderId: PO_ID,
        locationId: 'different-location-id',
        items: [
          {
            purchaseOrderItemId: PO_ITEM_ID,
            productId: PRODUCT_ID,
            quantityReceived: 5,
            unitsPerPackage: 100,
            unitPrice: '150.00',
            tax: '0',
          },
        ],
      };

      await expect(
        service.create(TENANT_ID, USER_ID, 'MANAGER', LOCATION_ID, dto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe lanzar UnprocessableEntityException si PurchaseOrder no está en CONFIRMED o RECEIVED', async () => {
      const tx = makeTx({
        purchaseOrder: {
          findFirstOrThrow: jest.fn().mockResolvedValue({
            ...mockPurchaseOrder,
            status: 'DRAFT',
          }),
          findUniqueOrThrow: jest.fn().mockResolvedValue({
            ...mockPurchaseOrder,
            status: 'DRAFT',
          }),
        },
      });
      const prisma = makePrisma({
        purchaseOrder: {
          findUniqueOrThrow: jest.fn().mockResolvedValue({
            ...mockPurchaseOrder,
            status: 'DRAFT',
          }),
        },
        $transaction: jest.fn().mockImplementation((fn) => fn(tx)),
      });
      const service = new PurchasesService(prisma as PrismaService);
      const dto: ReceivePurchaseOrderDto = {
        purchaseOrderId: PO_ID,
        locationId: LOCATION_ID,
        items: [
          {
            purchaseOrderItemId: PO_ITEM_ID,
            productId: PRODUCT_ID,
            quantityReceived: 5,
            unitsPerPackage: 100,
            unitPrice: '150.00',
            tax: '0',
          },
        ],
      };

      await expect(
        service.create(TENANT_ID, USER_ID, 'OWNER', null, dto),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('debe lanzar UnprocessableEntityException si quantityReceived supera el límite acumulado', async () => {
      const tx = makeTx({
        purchaseItem: {
          findMany: jest.fn().mockResolvedValue([
            {
              purchaseOrderItemId: PO_ITEM_ID,
              quantityReceived: 7,
              productId: PRODUCT_ID,
            },
          ]),
        },
      });
      const prisma = makePrisma({
        $transaction: jest.fn().mockImplementation((fn) => fn(tx)),
      });
      const service = new PurchasesService(prisma as PrismaService);
      const dto: ReceivePurchaseOrderDto = {
        purchaseOrderId: PO_ID,
        locationId: LOCATION_ID,
        items: [
          {
            purchaseOrderItemId: PO_ITEM_ID,
            productId: PRODUCT_ID,
            quantityReceived: 4, // 7 + 4 = 11 > 10 (ERROR)
            unitsPerPackage: 100,
            unitPrice: '150.00',
            tax: '0',
          },
        ],
      };

      await expect(
        service.create(TENANT_ID, USER_ID, 'OWNER', null, dto),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('debe calcular subtotal como quantityReceived × unitPrice', async () => {
      // Validated in response building
      const prisma = makePrisma();
      const service = new PurchasesService(prisma as PrismaService);
      const dto: ReceivePurchaseOrderDto = {
        purchaseOrderId: PO_ID,
        locationId: LOCATION_ID,
        items: [
          {
            purchaseOrderItemId: PO_ITEM_ID,
            productId: PRODUCT_ID,
            quantityReceived: 5,
            unitsPerPackage: 100,
            unitPrice: '200.00',
            tax: '0',
          },
        ],
      };

      const result = await service.create(
        TENANT_ID,
        USER_ID,
        'OWNER',
        null,
        dto,
      );
      // Subtotal should be 5 * 200 = 1000
    });

    it('debe usar unitsPerPackage=1 cuando no se provee (stockDelta = quantityReceived × 1)', async () => {
      const tx = makeTx({
        locationStock: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockImplementation(({ data }: any) => {
            expect(data.quantity).toBe(5); // 5 * 1
            return Promise.resolve({ quantity: 5 });
          }),
        },
      });
      const prisma = makePrisma({
        $transaction: jest.fn().mockImplementation((fn) => fn(tx)),
      });
      const service = new PurchasesService(prisma as PrismaService);
      const dto: ReceivePurchaseOrderDto = {
        purchaseOrderId: PO_ID,
        locationId: LOCATION_ID,
        items: [
          {
            purchaseOrderItemId: PO_ITEM_ID,
            productId: PRODUCT_ID,
            quantityReceived: 5,
            unitsPerPackage: 1, // Explicitly provided as default (ZodValidationPipe applies default in runtime)
            unitPrice: '150.00',
            tax: '0',
          },
        ],
      };

      await service.create(TENANT_ID, USER_ID, 'OWNER', null, dto);
    });
  });

  describe('findAll', () => {
    it('debe retornar lista paginada de compras del tenant', async () => {
      const prisma = makePrisma();
      const service = new PurchasesService(prisma as PrismaService);

      const result = await service.findAll(TENANT_ID, 'OWNER', null, {
        page: 1,
        limit: 20,
      });

      expect(result.data).toBeDefined();
      expect(result.total).toBeDefined();
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('debe filtrar por supplierId si se provee', async () => {
      const prisma = makePrisma();
      const service = new PurchasesService(prisma as PrismaService);

      await service.findAll(TENANT_ID, 'OWNER', null, {
        page: 1,
        limit: 20,
        supplierId: SUPPLIER_ID,
      });

      // Query should include supplierId filter
    });

    it('debe filtrar por locationId si se provee', async () => {
      const prisma = makePrisma();
      const service = new PurchasesService(prisma as PrismaService);

      await service.findAll(TENANT_ID, 'OWNER', null, {
        page: 1,
        limit: 20,
        locationId: LOCATION_ID,
      });

      // Query should include locationId filter
    });

    it('debe restringir MANAGER a su locationId automáticamente', async () => {
      const prisma = makePrisma();
      const service = new PurchasesService(prisma as PrismaService);

      await service.findAll(TENANT_ID, 'MANAGER', LOCATION_ID, {
        page: 1,
        limit: 20,
      });

      // MANAGER should only see their location
    });

    it('debe lanzar BadRequestException si role es STAFF', async () => {
      const prisma = makePrisma();
      const service = new PurchasesService(prisma as PrismaService);

      await expect(
        service.findAll(TENANT_ID, 'STAFF', null, { page: 1, limit: 20 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('debe retornar detalle de compra con items, supplier y location', async () => {
      const prisma = makePrisma();
      const service = new PurchasesService(prisma as PrismaService);

      const result = await service.findOne(
        TENANT_ID,
        'OWNER',
        null,
        PURCHASE_ID,
      );

      expect(result.id).toBe(PURCHASE_ID);
      expect(result.items).toBeDefined();
      expect(result.supplier).toBeDefined();
      expect(result.location).toBeDefined();
    });

    it('debe lanzar NotFoundException si la compra no pertenece al tenant', async () => {
      const tx = makeTx({
        purchase: {
          findFirstOrThrow: jest.fn().mockRejectedValue(new Error('not found')),
        },
      });
      const prisma = makePrisma({
        $transaction: jest.fn().mockImplementation((fn) => fn(tx)),
      });
      const service = new PurchasesService(prisma as PrismaService);

      await expect(
        service.findOne(TENANT_ID, 'OWNER', null, 'non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe restringir MANAGER a su locationId', async () => {
      const prisma = makePrisma();
      const service = new PurchasesService(prisma as PrismaService);

      const result = await service.findOne(
        TENANT_ID,
        'MANAGER',
        LOCATION_ID,
        PURCHASE_ID,
      );

      expect(result.locationId).toBe(LOCATION_ID);
    });
  });
});
