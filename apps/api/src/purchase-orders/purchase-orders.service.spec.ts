import {
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service.js';
import type {
  CreatePurchaseOrderDto,
  AddPurchaseOrderItemDto,
} from '@repo/types';
import type { PrismaService } from '../prisma/prisma.service.js';

jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('../../generated/prisma/client.js', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({})),
}));

const TENANT_ID = 'tenant-uuid-1';
const SUPPLIER_ID = 'supplier-uuid-1';
const LOCATION_ID = 'location-uuid-1';
const USER_ID = 'user-uuid-1';
const PRODUCT_ID = 'product-uuid-1';
const ORDER_ID = 'order-uuid-1';
const ITEM_ID = 'item-uuid-1';

const mockSupplier = {
  id: SUPPLIER_ID,
  tenantId: TENANT_ID,
  name: 'Distribuidora Médica',
  contact: 'Juan',
  phone: '55-1234-5678',
  email: 'juan@dm.mx',
  status: 'ACTIVE' as const,
};

const mockLocation = {
  id: LOCATION_ID,
  name: 'Sucursal Norte',
};

const mockProduct = {
  id: PRODUCT_ID,
  name: 'Eritropoyetina 4000 UI',
  brand: 'Biotek',
};

const mockOrder = {
  id: ORDER_ID,
  tenantId: TENANT_ID,
  supplierId: SUPPLIER_ID,
  locationId: LOCATION_ID,
  userId: USER_ID,
  date: new Date('2024-01-15'),
  status: 'DRAFT' as const,
  notes: null,
  expectedDate: null,
  total: '0',
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-15'),
  supplier: { id: mockSupplier.id, name: mockSupplier.name },
  location: { id: mockLocation.id, name: mockLocation.name },
  items: [] as Array<{ id: string }>,
};

const mockItem = {
  id: ITEM_ID,
  purchaseOrderId: ORDER_ID,
  productId: PRODUCT_ID,
  quantity: 10,
  unitPrice: '150.00',
  subtotal: '1500.00',
  createdAt: new Date('2024-01-15'),
  product: mockProduct,
};

function makeTx(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  const txItem = {
    ...mockItem,
    quantity: 5,
    unitPrice: '200.00',
    subtotal: '1000.00',
  };
  return {
    $executeRaw: jest.fn().mockResolvedValue(1),
    purchaseOrder: {
      findFirstOrThrow: jest.fn().mockResolvedValue(mockOrder),
      findMany: jest.fn().mockResolvedValue([mockOrder]),
      count: jest.fn().mockResolvedValue(1),
      create: jest.fn().mockResolvedValue(mockOrder),
      update: jest.fn().mockResolvedValue({ ...mockOrder, total: '1000.00' }),
    },
    supplier: {
      findFirstOrThrow: jest.fn().mockResolvedValue(mockSupplier),
      findUniqueOrThrow: jest.fn().mockResolvedValue(mockSupplier),
    },
    location: {
      findFirstOrThrow: jest.fn().mockResolvedValue(mockLocation),
      findUniqueOrThrow: jest.fn().mockResolvedValue(mockLocation),
    },
    purchaseOrderItem: {
      findMany: jest.fn().mockResolvedValue([txItem]),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(txItem),
      update: jest.fn().mockResolvedValue(txItem),
      delete: jest.fn().mockResolvedValue(txItem),
    },
    ...overrides,
  };
}

function makePrisma(overrides: Record<string, unknown> = {}): PrismaService {
  return {
    supplier: {
      findUniqueOrThrow: jest.fn().mockResolvedValue(mockSupplier),
    },
    supplierProduct: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'sp-new' }),
    },
    purchaseOrder: {
      findMany: jest.fn().mockResolvedValue([mockOrder]),
      findUniqueOrThrow: jest.fn().mockResolvedValue(mockOrder),
      findUnique: jest.fn().mockResolvedValue(mockOrder),
      count: jest.fn().mockResolvedValue(1),
      create: jest.fn().mockResolvedValue(mockOrder),
      update: jest.fn().mockResolvedValue(mockOrder),
    },
    purchaseOrderItem: {
      findMany: jest.fn().mockResolvedValue([mockItem]),
      findFirst: jest.fn().mockResolvedValue(null),
      findUniqueOrThrow: jest.fn().mockResolvedValue(mockItem),
      create: jest.fn().mockResolvedValue(mockItem),
      update: jest.fn().mockResolvedValue(mockItem),
      delete: jest.fn().mockResolvedValue(mockItem),
      count: jest.fn().mockResolvedValue(1),
    },
    product: {
      findUniqueOrThrow: jest.fn().mockResolvedValue(mockProduct),
    },
    $transaction: jest
      .fn()
      .mockImplementation(
        (fn: (tx: Record<string, unknown>) => Promise<unknown>) => fn(makeTx()),
      ),
    ...overrides,
  } as unknown as PrismaService;
}

describe('PurchaseOrdersService', () => {
  describe('create', () => {
    const dto: CreatePurchaseOrderDto = {
      supplierId: SUPPLIER_ID,
      locationId: LOCATION_ID,
      notes: 'Primera orden de prueba',
    };

    it('should create order in DRAFT status', async () => {
      const prisma = makePrisma();
      const service = new PurchaseOrdersService(prisma);

      const result = await service.create(TENANT_ID, USER_ID, dto);

      expect(prisma.purchaseOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_ID,
            userId: USER_ID,
            supplierId: SUPPLIER_ID,
            locationId: LOCATION_ID,
            status: 'DRAFT',
            total: '0',
          }),
        }),
      );
      expect(result.status).toBe('DRAFT');
    });

    it('should throw NotFoundException if supplier not found', async () => {
      const prisma = makePrisma({
        supplier: {
          findUniqueOrThrow: jest
            .fn()
            .mockRejectedValue(new NotFoundException()),
        },
      });
      const service = new PurchaseOrdersService(prisma);

      await expect(service.create(TENANT_ID, USER_ID, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw UnprocessableEntityException if supplier is INACTIVE', async () => {
      const prisma = makePrisma({
        supplier: {
          findUniqueOrThrow: jest
            .fn()
            .mockResolvedValue({ ...mockSupplier, status: 'INACTIVE' }),
        },
      });
      const service = new PurchaseOrdersService(prisma);

      await expect(service.create(TENANT_ID, USER_ID, dto)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });
  });

  describe('addItem', () => {
    const dto: AddPurchaseOrderItemDto = {
      productId: PRODUCT_ID,
      quantity: 5,
      unitPrice: '200.00',
      unitsPerPackage: 1,
    };

    it('should add item and recalculate total in transaction', async () => {
      const prisma = makePrisma();
      const service = new PurchaseOrdersService(prisma);

      const result = await service.addItem(TENANT_ID, ORDER_ID, dto);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result.productId).toBe(PRODUCT_ID);
      expect(result.quantity).toBe(5);
    });

    it('should throw UnprocessableEntityException if order not in DRAFT', async () => {
      const prisma = makePrisma({
        purchaseOrder: {
          findUniqueOrThrow: jest
            .fn()
            .mockResolvedValue({ ...mockOrder, status: 'CONFIRMED' }),
          update: jest.fn().mockResolvedValue(mockOrder),
        },
      });
      const service = new PurchaseOrdersService(prisma);

      await expect(service.addItem(TENANT_ID, ORDER_ID, dto)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('should throw BadRequestException if product already in order', async () => {
      const prisma = makePrisma({
        purchaseOrderItem: {
          findMany: jest.fn().mockResolvedValue([mockItem]),
          findFirst: jest.fn().mockResolvedValue(mockItem),
          create: jest.fn().mockResolvedValue(mockItem),
          update: jest.fn().mockResolvedValue(mockItem),
          delete: jest.fn().mockResolvedValue(mockItem),
          count: jest.fn().mockResolvedValue(1),
        },
      });
      const service = new PurchaseOrdersService(prisma);

      await expect(service.addItem(TENANT_ID, ORDER_ID, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create SupplierProduct inline if product not in supplier catalog', async () => {
      const prisma = makePrisma({
        supplierProduct: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: 'sp-new' }),
        },
        $transaction: jest
          .fn()
          .mockImplementation(
            (fn: (tx: Record<string, unknown>) => Promise<unknown>) => {
              const txItem = {
                ...mockItem,
                quantity: 5,
                unitPrice: '200.00',
                subtotal: '1000.00',
              };
              return fn({
                purchaseOrderItem: {
                  findMany: jest.fn().mockResolvedValue([txItem]),
                  create: jest.fn().mockResolvedValue(txItem),
                  update: jest.fn().mockResolvedValue(txItem),
                  delete: jest.fn().mockResolvedValue(txItem),
                },
                purchaseOrder: {
                  update: jest
                    .fn()
                    .mockResolvedValue({ ...mockOrder, total: '1000.00' }),
                },
              });
            },
          ),
      });
      const service = new PurchaseOrdersService(prisma);

      await service.addItem(TENANT_ID, ORDER_ID, dto);

      expect(prisma.supplierProduct.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_ID,
            supplierId: SUPPLIER_ID,
            productId: PRODUCT_ID,
            price: dto.unitPrice,
          }),
        }),
      );
    });
  });

  describe('removeItem', () => {
    it('should remove item and recalculate total', async () => {
      const prisma = makePrisma();
      const service = new PurchaseOrdersService(prisma);

      await service.removeItem(TENANT_ID, ORDER_ID, ITEM_ID);

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should throw UnprocessableEntityException if order not in DRAFT', async () => {
      const prisma = makePrisma({
        purchaseOrder: {
          findUniqueOrThrow: jest
            .fn()
            .mockResolvedValue({ ...mockOrder, status: 'CONFIRMED' }),
          update: jest.fn().mockResolvedValue(mockOrder),
        },
      });
      const service = new PurchaseOrdersService(prisma);

      await expect(
        service.removeItem(TENANT_ID, ORDER_ID, ITEM_ID),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('updateStatus', () => {
    it('should transition DRAFT to SENT', async () => {
      const prisma = makePrisma({
        purchaseOrder: {
          findUniqueOrThrow: jest.fn().mockResolvedValue({
            ...mockOrder,
            status: 'DRAFT',
            items: [mockItem],
          }),
          update: jest.fn().mockResolvedValue(mockOrder),
        },
        purchaseOrderItem: {
          count: jest.fn().mockResolvedValue(1),
        },
      });
      const service = new PurchaseOrdersService(prisma);

      await service.updateStatus(TENANT_ID, ORDER_ID, 'SENT');

      expect(prisma.purchaseOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'SENT' }),
        }),
      );
    });

    it('should throw UnprocessableEntityException when SENT has no items', async () => {
      const prisma = makePrisma({
        purchaseOrder: {
          findUniqueOrThrow: jest
            .fn()
            .mockResolvedValue({ ...mockOrder, status: 'DRAFT', items: [] }),
          update: jest.fn().mockResolvedValue(mockOrder),
        },
        purchaseOrderItem: {
          findMany: jest.fn().mockResolvedValue([mockItem]),
          findFirst: jest.fn().mockResolvedValue(mockItem),
          create: jest.fn().mockResolvedValue(mockItem),
          update: jest.fn().mockResolvedValue(mockItem),
          delete: jest.fn().mockResolvedValue(mockItem),
          count: jest.fn().mockResolvedValue(0),
        },
      });
      const service = new PurchaseOrdersService(prisma);

      await expect(
        service.updateStatus(TENANT_ID, ORDER_ID, 'SENT'),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('should transition SENT to CONFIRMED', async () => {
      const prisma = makePrisma({
        purchaseOrder: {
          findUniqueOrThrow: jest.fn().mockResolvedValue({
            ...mockOrder,
            status: 'SENT',
            items: [mockItem],
          }),
          update: jest.fn().mockResolvedValue(mockOrder),
        },
      });
      const service = new PurchaseOrdersService(prisma);

      await service.updateStatus(TENANT_ID, ORDER_ID, 'CONFIRMED');

      expect(prisma.purchaseOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'CONFIRMED' }),
        }),
      );
    });

    it('should allow CANCELLED from DRAFT', async () => {
      const prisma = makePrisma();
      const service = new PurchaseOrdersService(prisma);

      await service.updateStatus(TENANT_ID, ORDER_ID, 'CANCELLED');

      expect(prisma.purchaseOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'CANCELLED' }),
        }),
      );
    });

    it('should allow CANCELLED from SENT', async () => {
      const prisma = makePrisma({
        purchaseOrder: {
          findUniqueOrThrow: jest.fn().mockResolvedValue({
            ...mockOrder,
            status: 'SENT',
            items: [mockItem],
          }),
          update: jest.fn().mockResolvedValue(mockOrder),
        },
      });
      const service = new PurchaseOrdersService(prisma);

      await service.updateStatus(TENANT_ID, ORDER_ID, 'CANCELLED');

      expect(prisma.purchaseOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'CANCELLED' }),
        }),
      );
    });

    it('should allow CANCELLED from CONFIRMED', async () => {
      const confirmedOrder = { ...mockOrder, status: 'CONFIRMED' as const };
      const prisma = makePrisma({
        purchaseOrder: {
          findUniqueOrThrow: jest.fn().mockResolvedValue(confirmedOrder),
          update: jest.fn().mockResolvedValue({
            ...confirmedOrder,
            status: 'CANCELLED',
            supplier: mockSupplier,
            location: mockLocation,
            items: [],
          }),
        },
      });
      const service = new PurchaseOrdersService(prisma);

      const result = await service.updateStatus(
        TENANT_ID,
        ORDER_ID,
        'CANCELLED',
      );
      expect(result.status).toBe('CANCELLED');
    });

    it('should throw UnprocessableEntityException for invalid transition', async () => {
      const prisma = makePrisma({
        purchaseOrder: {
          findUniqueOrThrow: jest.fn().mockResolvedValue({
            ...mockOrder,
            status: 'DRAFT',
            items: [mockItem],
          }),
          update: jest.fn().mockResolvedValue(mockOrder),
        },
        purchaseOrderItem: {
          count: jest.fn().mockResolvedValue(1),
        },
      });
      const service = new PurchaseOrdersService(prisma);

      await expect(
        service.updateStatus(TENANT_ID, ORDER_ID, 'CONFIRMED'),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('findAll', () => {
    it('should return all orders for OWNER/ADMIN', async () => {
      const prisma = makePrisma();
      const service = new PurchaseOrdersService(prisma);

      await service.findAll(TENANT_ID, 'OWNER', null, { page: 1, limit: 20 });

      expect(prisma.purchaseOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT_ID }),
        }),
      );
    });

    it('should filter by locationId for MANAGER', async () => {
      const prisma = makePrisma();
      const service = new PurchaseOrdersService(prisma);

      await service.findAll(TENANT_ID, 'MANAGER', LOCATION_ID, {
        page: 1,
        limit: 20,
      });

      expect(prisma.purchaseOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
            locationId: LOCATION_ID,
          }),
        }),
      );
    });

    it('should throw BadRequestException for STAFF', async () => {
      const prisma = makePrisma();
      const service = new PurchaseOrdersService(prisma);

      await expect(
        service.findAll(TENANT_ID, 'STAFF', null, { page: 1, limit: 20 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should return order detail for OWNER using a transaction', async () => {
      const prisma = makePrisma();
      const service = new PurchaseOrdersService(prisma);

      const result = await service.findOne(TENANT_ID, 'OWNER', null, ORDER_ID);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result.id).toBe(ORDER_ID);
      expect(result.supplier.name).toBe(mockSupplier.name);
      expect(result.location.name).toBe(mockLocation.name);
    });

    it('should return order items in the response', async () => {
      const prisma = makePrisma();
      const service = new PurchaseOrdersService(prisma);

      const result = await service.findOne(TENANT_ID, 'OWNER', null, ORDER_ID);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].productId).toBe(PRODUCT_ID);
    });

    it('should throw BadRequestException for STAFF without touching the DB', async () => {
      const prisma = makePrisma();
      const service = new PurchaseOrdersService(prisma);

      await expect(
        service.findOne(TENANT_ID, 'STAFF', null, ORDER_ID),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when order does not exist', async () => {
      const tx = makeTx({
        purchaseOrder: {
          findFirstOrThrow: jest.fn().mockRejectedValue(new Error('not found')),
        },
      });
      const prisma = makePrisma({
        $transaction: jest
          .fn()
          .mockImplementation(
            (fn: (tx: Record<string, unknown>) => Promise<unknown>) => fn(tx),
          ),
      });
      const service = new PurchaseOrdersService(prisma);

      await expect(
        service.findOne(TENANT_ID, 'OWNER', null, 'non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should filter by locationId for MANAGER', async () => {
      let capturedWhere: Record<string, unknown> = {};
      const tx = makeTx({
        purchaseOrder: {
          findFirstOrThrow: jest
            .fn()
            .mockImplementation(
              ({ where }: { where: Record<string, unknown> }) => {
                capturedWhere = where;
                return Promise.resolve(mockOrder);
              },
            ),
        },
      });
      const prisma = makePrisma({
        $transaction: jest
          .fn()
          .mockImplementation(
            (fn: (tx: Record<string, unknown>) => Promise<unknown>) => fn(tx),
          ),
      });
      const service = new PurchaseOrdersService(prisma);

      await service.findOne(TENANT_ID, 'MANAGER', LOCATION_ID, ORDER_ID);

      expect(capturedWhere).toMatchObject({
        id: ORDER_ID,
        tenantId: TENANT_ID,
        locationId: LOCATION_ID,
      });
    });
  });

  describe('ALLOWED_TRANSITIONS actualizados', () => {
    it('CONFIRMED no debe transicionar a RECEIVED via updateStatus (solo via purchases service)', async () => {
      const prisma = makePrisma({
        purchaseOrder: {
          findUniqueOrThrow: jest.fn().mockResolvedValue({
            ...mockOrder,
            status: 'CONFIRMED',
            items: [mockItem],
          }),
        },
      });
      const service = new PurchaseOrdersService(prisma);

      await expect(
        service.updateStatus(TENANT_ID, ORDER_ID, 'RECEIVED'),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('RECEIVED debe permitir transición a CLOSED', async () => {
      const receivedOrder = { ...mockOrder, status: 'RECEIVED' as const };
      const prisma = makePrisma({
        purchaseOrder: {
          findUniqueOrThrow: jest.fn().mockResolvedValue(receivedOrder),
          update: jest.fn().mockResolvedValue({
            ...receivedOrder,
            status: 'CLOSED',
            supplier: mockSupplier,
            location: mockLocation,
            items: [],
          }),
        },
      });
      const service = new PurchaseOrdersService(prisma);

      const result = await service.updateStatus(TENANT_ID, ORDER_ID, 'CLOSED');
      expect(result.status).toBe('CLOSED');
    });

    it('COMPLETED no debe tener transiciones permitidas', async () => {
      const completedOrder = { ...mockOrder, status: 'COMPLETED' as const };
      const prisma = makePrisma({
        purchaseOrder: {
          findUniqueOrThrow: jest.fn().mockResolvedValue(completedOrder),
        },
      });
      const service = new PurchaseOrdersService(prisma);

      await expect(
        service.updateStatus(TENANT_ID, ORDER_ID, 'CANCELLED'),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('CLOSED no debe tener transiciones permitidas', async () => {
      const closedOrder = { ...mockOrder, status: 'CLOSED' as const };
      const prisma = makePrisma({
        purchaseOrder: {
          findUniqueOrThrow: jest.fn().mockResolvedValue(closedOrder),
        },
      });
      const service = new PurchaseOrdersService(prisma);

      await expect(
        service.updateStatus(TENANT_ID, ORDER_ID, 'DRAFT'),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('closePurchaseOrder', () => {
    it('debe transicionar orden RECEIVED a CLOSED', async () => {
      const receivedOrder = { ...mockOrder, status: 'RECEIVED' as const };
      const closedOrder = { ...receivedOrder, status: 'CLOSED' as const };
      const prisma = makePrisma({
        purchaseOrder: {
          findFirstOrThrow: jest.fn().mockResolvedValue(receivedOrder),
          update: jest.fn().mockResolvedValue({
            ...closedOrder,
            supplier: mockSupplier,
            location: mockLocation,
            items: [],
          }),
        },
      });
      const service = new PurchaseOrdersService(prisma);

      const result = await service.closePurchaseOrder(
        TENANT_ID,
        'OWNER',
        ORDER_ID,
        {},
      );
      expect(result.status).toBe('CLOSED');
    });

    it('debe lanzar UnprocessableEntityException si la orden no está en RECEIVED', async () => {
      const draftOrder = { ...mockOrder, status: 'DRAFT' as const };
      const prisma = makePrisma({
        purchaseOrder: {
          findFirstOrThrow: jest.fn().mockResolvedValue(draftOrder),
        },
      });
      const service = new PurchaseOrdersService(prisma);

      await expect(
        service.closePurchaseOrder(TENANT_ID, 'OWNER', ORDER_ID, {}),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('debe lanzar BadRequestException si el rol es MANAGER', async () => {
      const service = new PurchaseOrdersService(makePrisma());

      await expect(
        service.closePurchaseOrder(TENANT_ID, 'MANAGER', ORDER_ID, {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe actualizar las notas si se proveen en el DTO', async () => {
      const receivedOrder = { ...mockOrder, status: 'RECEIVED' as const };
      const closedOrder = {
        ...receivedOrder,
        status: 'CLOSED' as const,
        notes: 'Proveedor no puede completar',
      };
      let capturedData: Record<string, unknown> = {};
      const prisma = makePrisma({
        purchaseOrder: {
          findFirstOrThrow: jest.fn().mockResolvedValue(receivedOrder),
          update: jest
            .fn()
            .mockImplementation(
              ({ data }: { data: Record<string, unknown> }) => {
                capturedData = data;
                return Promise.resolve({
                  ...closedOrder,
                  supplier: mockSupplier,
                  location: mockLocation,
                  items: [],
                });
              },
            ),
        },
      });
      const service = new PurchaseOrdersService(prisma);

      await service.closePurchaseOrder(TENANT_ID, 'OWNER', ORDER_ID, {
        notes: 'Proveedor no puede completar',
      });
      expect(capturedData.notes).toBe('Proveedor no puede completar');
    });

    it('debe lanzar NotFoundException si la orden no pertenece al tenant', async () => {
      const prisma = makePrisma({
        purchaseOrder: {
          findFirstOrThrow: jest.fn().mockRejectedValue(new Error('not found')),
        },
      });
      const service = new PurchaseOrdersService(prisma);

      await expect(
        service.closePurchaseOrder(TENANT_ID, 'OWNER', 'non-existent-id', {}),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
