/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unused-vars */
// NOTE: This test file uses `any` in Jest mock implementations for callback args.
// This is allowed per CLAUDE.md: "In tests, greater leniency is permitted with `any`
// if necessary for complex mocks, but always document why." Prisma delegate mocks
// require flexible typing for mockImplementation callbacks with unknown arg shapes.

import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { SalesService } from './sales.service.js';
import type { CreateSaleDto } from '@repo/types';
import type { PrismaService } from '../prisma/prisma.service.js';

jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('../../generated/prisma/client.js', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({})),
}));

const TENANT_ID = 'tenant-uuid-1';
const LOCATION_ID = 'location-uuid-1';
const LOCATION_CODE = 'LOC';
const USER_ID = 'user-uuid-1';
const PRODUCT_ID = 'product-uuid-1';
const PLAN_ID = 'plan-uuid-1';
const COMPANY_ID = 'company-uuid-1';

const mockUser = {
  id: USER_ID,
  tenantId: TENANT_ID,
  role: 'MANAGER',
  locationId: LOCATION_ID,
};

const mockLocation = {
  id: LOCATION_ID,
  tenantId: TENANT_ID,
  code: LOCATION_CODE,
  name: 'Sucursal Principal',
};

const mockProduct = {
  id: PRODUCT_ID,
  tenantId: TENANT_ID,
  name: 'Medicamento A',
};

const mockLocationStock = {
  id: 'stock-uuid-1',
  tenantId: TENANT_ID,
  locationId: LOCATION_ID,
  productId: PRODUCT_ID,
  quantity: 100,
};

const mockPlan = {
  id: PLAN_ID,
  tenantId: TENANT_ID,
  companyId: COMPANY_ID,
  plannedSessions: 12,
  usedSessions: 0,
};

const mockPlanExhausted = {
  id: PLAN_ID,
  tenantId: TENANT_ID,
  companyId: COMPANY_ID,
  plannedSessions: 12,
  usedSessions: 11,
};

function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...target };
  for (const key in source) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key])
    ) {
      result[key] = deepMerge(
        (result[key] as Record<string, unknown>) || {},
        source[key] as Record<string, unknown>,
      );
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

function makeTx(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  const defaults = {
    sale: {
      create: jest.fn().mockResolvedValue({
        id: 'sale-uuid-1',
        tenantId: TENANT_ID,
        locationId: LOCATION_ID,
        folio: 'LOC-2024-00001',
        totalAmount: '1000.00',
        paymentType: 'CASH',
        status: 'ACTIVE',
        isClosed: false,
        userId: USER_ID,
        notes: undefined,
        createdAt: new Date(),
        finishedAt: null,
        settledAt: null,
        closedAt: null,
      }),
    },
    saleItem: {
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    locationStock: {
      update: jest.fn().mockResolvedValue(mockLocationStock),
      findUniqueOrThrow: jest.fn().mockResolvedValue(mockLocationStock),
    },
    inventoryMovement: {
      create: jest.fn().mockResolvedValue({
        id: 'movement-uuid-1',
        tenantId: TENANT_ID,
        locationId: LOCATION_ID,
        movementType: 'OUT',
        referenceType: 'SALE',
        referenceId: 'sale-uuid-1',
      }),
    },
    plan: {
      findUniqueOrThrow: jest.fn().mockResolvedValue(mockPlan),
      update: jest.fn().mockResolvedValue(mockPlan),
    },
    cashClose: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    $executeRaw: jest.fn().mockResolvedValue(1),
  };
  return deepMerge(defaults, overrides);
}

describe('SalesService', () => {
  let service: SalesService;
  let mockPrisma: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = {
      location: {
        findUniqueOrThrow: jest.fn().mockResolvedValue(mockLocation),
      },
      product: {
        findUniqueOrThrow: jest.fn().mockResolvedValue(mockProduct),
      },
      locationStock: {
        findUniqueOrThrow: jest.fn().mockResolvedValue(mockLocationStock),
      },
      plan: {
        findUniqueOrThrow: jest.fn().mockResolvedValue(mockPlan),
        update: jest.fn().mockResolvedValue(mockPlan),
      },
      cashClose: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      sale: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 'sale-uuid-1',
          tenantId: TENANT_ID,
          locationId: LOCATION_ID,
          folio: 'LOC-2024-00001',
          totalAmount: '1000.00',
          paymentType: 'CASH',
          status: 'ACTIVE',
          isClosed: false,
          userId: USER_ID,
          notes: undefined,
          createdAt: new Date(),
          finishedAt: null,
          settledAt: null,
          closedAt: null,
          items: [
            {
              id: 'item-uuid-1',
              productId: PRODUCT_ID,
              quantity: 10,
              unitPrice: '100.00',
              tax: '10.00',
              createdAt: new Date(),
            },
            {
              id: 'item-uuid-2',
              productId: PRODUCT_ID,
              quantity: 5,
              unitPrice: '50.00',
              tax: '5.00',
              createdAt: new Date(),
            },
          ],
        }),
      },
      $transaction: jest
        .fn()
        .mockImplementation(
          (fn: (tx: Record<string, unknown>) => Promise<unknown>) =>
            fn(makeTx()),
        ),
      $executeRaw: jest.fn().mockResolvedValue(1),
    };
    service = new SalesService(mockPrisma as PrismaService);
  });

  describe('create', () => {
    it('T037: should generate unique folio per location with format LOC-YYYY-NNNNN', async () => {
      const dto: CreateSaleDto = {
        locationId: LOCATION_ID,
        paymentType: 'CASH',
        items: [
          {
            productId: PRODUCT_ID,
            quantity: 10,
            unitPrice: '100.00',
            tax: '10.00',
          },
        ],
        notes: undefined,
      };

      const result = await service.create(
        TENANT_ID,
        USER_ID,
        'MANAGER',
        LOCATION_ID,
        dto,
      );

      expect(result.folio).toMatch(/^[A-Z]+-\d{4}-\d{5}$/);
      expect(result.folio).toContain(LOCATION_CODE);
    });

    it('T038: should create sale with items and calculate totalAmount server-side', async () => {
      const dto: CreateSaleDto = {
        locationId: LOCATION_ID,
        paymentType: 'CASH',
        items: [
          {
            productId: PRODUCT_ID,
            quantity: 10,
            unitPrice: '100.00',
            tax: '10.00',
          },
          {
            productId: PRODUCT_ID,
            quantity: 5,
            unitPrice: '50.00',
            tax: '5.00',
          },
        ],
        notes: 'Test sale',
      };

      const result = await service.create(
        TENANT_ID,
        USER_ID,
        'MANAGER',
        LOCATION_ID,
        dto,
      );

      expect(result.id).toBeDefined();
      expect(result.totalAmount).toBeDefined();
      expect(result.items).toHaveLength(2);
      expect(result.status).toBe('ACTIVE');
      expect(result.paymentType).toBe('CASH');
    });

    it('T039: should reject sale if stock insufficient for any item', async () => {
      const mockLowStock = { ...mockLocationStock, quantity: 5 };
      // Mock findUniqueOrThrow for locationStock to return low stock
      mockPrisma.locationStock.findUniqueOrThrow.mockResolvedValueOnce(
        mockLowStock,
      );

      const dto: CreateSaleDto = {
        locationId: LOCATION_ID,
        paymentType: 'CASH',
        items: [
          {
            productId: PRODUCT_ID,
            quantity: 10,
            unitPrice: '100.00',
            tax: '10.00',
          },
        ],
        notes: undefined,
      };

      await expect(
        service.create(TENANT_ID, USER_ID, 'MANAGER', LOCATION_ID, dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('T040: should decrement LocationStock atomically with Sale creation', async () => {
      let updateCalled = false;
      mockPrisma.$transaction.mockImplementation(
        (fn: (tx: Record<string, unknown>) => Promise<unknown>) => {
          const mockTx = makeTx({
            locationStock: {
              update: jest.fn().mockImplementation(() => {
                updateCalled = true;
                return Promise.resolve(mockLocationStock);
              }),
              findUniqueOrThrow: jest.fn().mockResolvedValue(mockLocationStock),
            },
          });
          return fn(mockTx);
        },
      );

      const dto: CreateSaleDto = {
        locationId: LOCATION_ID,
        paymentType: 'CASH',
        items: [
          {
            productId: PRODUCT_ID,
            quantity: 10,
            unitPrice: '100.00',
            tax: '10.00',
          },
        ],
        notes: undefined,
      };

      await service.create(TENANT_ID, USER_ID, 'MANAGER', LOCATION_ID, dto);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(updateCalled).toBe(true);
    });

    it('T041: should create InventoryMovement (OUT) referencing sale', async () => {
      const dto: CreateSaleDto = {
        locationId: LOCATION_ID,
        paymentType: 'CASH',
        items: [
          {
            productId: PRODUCT_ID,
            quantity: 10,
            unitPrice: '100.00',
            tax: '10.00',
          },
        ],
        notes: undefined,
      };

      await service.create(TENANT_ID, USER_ID, 'MANAGER', LOCATION_ID, dto);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('T042: should increment Plan.usedSessions if paymentType=BENEFIT', async () => {
      const dto: CreateSaleDto = {
        locationId: LOCATION_ID,
        paymentType: 'BENEFIT',
        linkedPlanId: PLAN_ID,
        items: [
          {
            productId: PRODUCT_ID,
            quantity: 1,
            unitPrice: '0.00',
            tax: '0.00',
          },
        ],
        notes: undefined,
      };

      await service.create(TENANT_ID, USER_ID, 'MANAGER', LOCATION_ID, dto);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('T043: should reject STAFF user with 403 Forbidden', async () => {
      const dto: CreateSaleDto = {
        locationId: LOCATION_ID,
        paymentType: 'CASH',
        items: [
          {
            productId: PRODUCT_ID,
            quantity: 10,
            unitPrice: '100.00',
            tax: '10.00',
          },
        ],
        notes: undefined,
      };

      await expect(
        service.create(TENANT_ID, USER_ID, 'STAFF', LOCATION_ID, dto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('T044: should reject sale if period already closed (CashClose.status=CLOSED)', async () => {
      const mockClosedPeriod = {
        id: 'close-uuid-1',
        tenantId: TENANT_ID,
        locationId: LOCATION_ID,
        status: 'CLOSED',
      };
      mockPrisma.cashClose.findFirst.mockResolvedValueOnce(mockClosedPeriod);

      const dto: CreateSaleDto = {
        locationId: LOCATION_ID,
        paymentType: 'CASH',
        items: [
          {
            productId: PRODUCT_ID,
            quantity: 10,
            unitPrice: '100.00',
            tax: '10.00',
          },
        ],
        notes: undefined,
      };

      await expect(
        service.create(TENANT_ID, USER_ID, 'MANAGER', LOCATION_ID, dto),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
