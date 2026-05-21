/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
// NOTE: This test file uses `any` in Jest mock implementations for callback args.
// Prisma delegate mocks require flexible typing for mockImplementation callbacks.

import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ExpenseService } from './expense.service.js';
import type { CreateExpenseDto, ExpenseQuery } from '@repo/types';
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
const EXPENSE_ID = 'expense-uuid-1';

const mockLocation = {
  id: LOCATION_ID,
  tenantId: TENANT_ID,
  code: 'LOC',
  name: 'Sucursal Test',
};

const mockExpense = {
  id: EXPENSE_ID,
  tenantId: TENANT_ID,
  locationId: LOCATION_ID,
  type: 'SUPPLIES' as const,
  customType: null,
  amount: '250.00',
  description: 'Test expense',
  status: 'ACTIVE' as const,
  isClosed: false,
  userId: USER_ID,
  createdAt: new Date('2024-01-15'),
  cancelledAt: null,
  closedAt: null,
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

describe('ExpenseService', () => {
  let service: ExpenseService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      expense: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      cashClose: {
        findFirst: jest.fn(),
      },
      location: {
        findUnique: jest.fn(),
      },
    };

    service = new ExpenseService(prismaMock as PrismaService);
  });

  describe('create', () => {
    it('should create expense record', async () => {
      const dto: CreateExpenseDto = {
        locationId: LOCATION_ID,
        type: 'SUPPLIES',
        amount: '250.00',
        description: 'Test expense',
      };

      prismaMock.location.findUnique.mockResolvedValue(mockLocation);
      prismaMock.cashClose.findFirst.mockResolvedValue(null);
      prismaMock.expense.create.mockResolvedValue(mockExpense);

      const result = await service.create(TENANT_ID, USER_ID, dto);

      expect(result.id).toEqual(mockExpense.id);
      expect(result.tenantId).toEqual(TENANT_ID);
      expect(result.type).toEqual('SUPPLIES');
      expect(prismaMock.expense.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT_ID,
          locationId: LOCATION_ID,
          type: 'SUPPLIES',
          amount: '250.00',
          description: 'Test expense',
          userId: USER_ID,
          status: 'ACTIVE',
        }),
      });
    });

    it('should reject STAFF role', async () => {
      const dto: CreateExpenseDto = {
        locationId: LOCATION_ID,
        type: 'SUPPLIES',
        amount: '250.00',
      };

      await expect(
        service.create(TENANT_ID, USER_ID, dto, 'STAFF'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow MANAGER role', async () => {
      const dto: CreateExpenseDto = {
        locationId: LOCATION_ID,
        type: 'SUPPLIES',
        amount: '250.00',
      };

      prismaMock.location.findUnique.mockResolvedValue(mockLocation);
      prismaMock.cashClose.findFirst.mockResolvedValue(null);
      prismaMock.expense.create.mockResolvedValue(mockExpense);

      const result = await service.create(TENANT_ID, USER_ID, dto, 'MANAGER');

      expect(result).toBeDefined();
      expect(prismaMock.expense.create).toHaveBeenCalled();
    });

    it('should validate locationId belongs to tenant (change 1C)', async () => {
      const dto: CreateExpenseDto = {
        locationId: 'location-other-tenant',
        type: 'SUPPLIES',
        amount: '250.00',
      };

      prismaMock.location.findUnique.mockResolvedValue(null);

      await expect(
        service.create(TENANT_ID, USER_ID, dto, 'MANAGER'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw when locationId belongs to different tenant (change 1C)', async () => {
      const dto: CreateExpenseDto = {
        locationId: 'location-other-tenant',
        type: 'SUPPLIES',
        amount: '250.00',
      };

      const otherTenantLocation = {
        id: 'location-other-tenant',
        tenantId: 'other-tenant-id',
      };

      prismaMock.location.findUnique.mockResolvedValue(otherTenantLocation);

      await expect(
        service.create(TENANT_ID, USER_ID, dto, 'MANAGER'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancel', () => {
    it('should cancel expense by setting status=CANCELLED and cancelledAt=now', async () => {
      const now = new Date();
      const cancelledExpense = deepMerge(mockExpense, {
        status: 'CANCELLED',
        cancelledAt: now,
      });

      prismaMock.expense.findUnique.mockResolvedValue(mockExpense);
      prismaMock.expense.update.mockResolvedValue(cancelledExpense);

      const result = await service.cancel(TENANT_ID, EXPENSE_ID, 'ADMIN', null);

      expect(result.status).toBe('CANCELLED');
      expect(result.cancelledAt).toBeDefined();
      expect(prismaMock.expense.update).toHaveBeenCalledWith({
        where: { id: EXPENSE_ID },
        data: {
          status: 'CANCELLED',
          cancelledAt: expect.any(Date),
        },
      });
    });

    it('should throw if expense not found', async () => {
      prismaMock.expense.findUnique.mockResolvedValue(null);

      await expect(
        service.cancel(TENANT_ID, EXPENSE_ID, 'ADMIN', null),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if expense already cancelled', async () => {
      const cancelledExpense = deepMerge(mockExpense, {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      });

      prismaMock.expense.findUnique.mockResolvedValue(cancelledExpense);

      await expect(
        service.cancel(TENANT_ID, EXPENSE_ID, 'ADMIN', null),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if isClosed=true (change 1D)', async () => {
      const closedExpense = deepMerge(mockExpense, { isClosed: true });

      prismaMock.expense.findUnique.mockResolvedValue(closedExpense);

      await expect(
        service.cancel(TENANT_ID, EXPENSE_ID, 'ADMIN', null),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if MANAGER tries to cancel expense from different location (change 1B)', async () => {
      const otherLocationExpense = deepMerge(mockExpense, {
        locationId: 'other-location-id',
      });

      prismaMock.expense.findUnique.mockResolvedValue(otherLocationExpense);

      await expect(
        service.cancel(TENANT_ID, EXPENSE_ID, 'MANAGER', LOCATION_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow MANAGER to cancel expense from their own location (change 1B)', async () => {
      const now = new Date();
      const cancelledExpense = deepMerge(mockExpense, {
        status: 'CANCELLED',
        cancelledAt: now,
      });

      prismaMock.expense.findUnique.mockResolvedValue(mockExpense);
      prismaMock.expense.update.mockResolvedValue(cancelledExpense);

      const result = await service.cancel(
        TENANT_ID,
        EXPENSE_ID,
        'MANAGER',
        LOCATION_ID,
      );

      expect(result.status).toBe('CANCELLED');
    });
  });

  describe('findAll', () => {
    it('should return paginated expense list with filters', async () => {
      const query: ExpenseQuery = {
        page: 1,
        limit: 50,
        type: 'SUPPLIES',
        status: 'ACTIVE',
      };

      const mockExpenseList = [mockExpense];

      prismaMock.expense.findMany.mockResolvedValue(mockExpenseList);
      prismaMock.expense.count.mockResolvedValue(1);

      const result = await service.findAll(TENANT_ID, 'ADMIN', null, query);

      expect(result.data).toEqual(mockExpenseList);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
    });

    it('should filter by dateFrom and dateTo', async () => {
      const query: ExpenseQuery = {
        page: 1,
        limit: 50,
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31',
      };

      prismaMock.expense.findMany.mockResolvedValue([mockExpense]);
      prismaMock.expense.count.mockResolvedValue(1);

      const result = await service.findAll(TENANT_ID, 'ADMIN', null, query);

      expect(prismaMock.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
          }),
        }),
      );
      expect(result.data).toHaveLength(1);
    });

    it('should filter by type', async () => {
      const query: ExpenseQuery = {
        page: 1,
        limit: 50,
        type: 'PAYROLL',
      };

      prismaMock.expense.findMany.mockResolvedValue([]);
      prismaMock.expense.count.mockResolvedValue(0);

      await service.findAll(TENANT_ID, 'ADMIN', null, query);

      expect(prismaMock.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: 'PAYROLL',
          }),
        }),
      );
    });

    it('should respect pagination', async () => {
      const query: ExpenseQuery = {
        page: 2,
        limit: 25,
      };

      prismaMock.expense.findMany.mockResolvedValue([]);
      prismaMock.expense.count.mockResolvedValue(100);

      await service.findAll(TENANT_ID, 'ADMIN', null, query);

      expect(prismaMock.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 25,
          take: 25,
        }),
      );
    });

    it('should filter by locationId when role=MANAGER (change 1B)', async () => {
      const query: ExpenseQuery = {
        page: 1,
        limit: 50,
      };

      prismaMock.expense.findMany.mockResolvedValue([mockExpense]);
      prismaMock.expense.count.mockResolvedValue(1);

      await service.findAll(TENANT_ID, 'MANAGER', LOCATION_ID, query);

      expect(prismaMock.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
            locationId: LOCATION_ID,
          }),
        }),
      );
    });

    it('should NOT filter by locationId when role=ADMIN (change 1B)', async () => {
      const query: ExpenseQuery = {
        page: 1,
        limit: 50,
      };

      prismaMock.expense.findMany.mockResolvedValue([mockExpense]);
      prismaMock.expense.count.mockResolvedValue(1);

      await service.findAll(TENANT_ID, 'ADMIN', LOCATION_ID, query);

      expect(prismaMock.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            locationId: expect.anything(),
          }),
        }),
      );
    });
  });
});
