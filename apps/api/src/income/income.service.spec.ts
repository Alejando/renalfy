/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
// NOTE: This test file uses `any` in Jest mock implementations for callback args.
// Prisma delegate mocks require flexible typing for mockImplementation callbacks.

import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { IncomeService } from './income.service.js';
import type { CreateIncomeDto, IncomeQuery } from '@repo/types';
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
const INCOME_ID = 'income-uuid-1';

const mockIncome = {
  id: INCOME_ID,
  tenantId: TENANT_ID,
  locationId: LOCATION_ID,
  type: 'SERVICE_FEE' as const,
  customType: null,
  amount: '500.00',
  description: 'Test income',
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

describe('IncomeService', () => {
  let service: IncomeService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      income: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      cashClose: {
        findFirst: jest.fn(),
      },
    };

    service = new IncomeService(prismaMock as PrismaService);
  });

  describe('create', () => {
    it('should create income record', async () => {
      const dto: CreateIncomeDto = {
        locationId: LOCATION_ID,
        type: 'SERVICE_FEE',
        amount: '500.00',
        description: 'Test income',
      };

      prismaMock.cashClose.findFirst.mockResolvedValue(null);
      prismaMock.income.create.mockResolvedValue(mockIncome);

      const result = await service.create(TENANT_ID, USER_ID, dto);

      expect(result.id).toEqual(mockIncome.id);
      expect(result.tenantId).toEqual(TENANT_ID);
      expect(result.type).toEqual('SERVICE_FEE');
      expect(prismaMock.income.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT_ID,
          locationId: LOCATION_ID,
          type: 'SERVICE_FEE',
          amount: '500.00',
          description: 'Test income',
          userId: USER_ID,
          status: 'ACTIVE',
        }),
      });
    });

    it('should reject STAFF role', async () => {
      const dto: CreateIncomeDto = {
        locationId: LOCATION_ID,
        type: 'SERVICE_FEE',
        amount: '500.00',
      };

      await expect(
        service.create(TENANT_ID, USER_ID, dto, 'STAFF'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow MANAGER role', async () => {
      const dto: CreateIncomeDto = {
        locationId: LOCATION_ID,
        type: 'SERVICE_FEE',
        amount: '500.00',
      };

      prismaMock.cashClose.findFirst.mockResolvedValue(null);
      prismaMock.income.create.mockResolvedValue(mockIncome);

      const result = await service.create(TENANT_ID, USER_ID, dto, 'MANAGER');

      expect(result).toBeDefined();
      expect(prismaMock.income.create).toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('should cancel income by setting status=CANCELLED and cancelledAt=now', async () => {
      const now = new Date();
      const cancelledIncome = deepMerge(mockIncome, {
        status: 'CANCELLED',
        cancelledAt: now,
      });

      prismaMock.income.findUnique.mockResolvedValue(mockIncome);
      prismaMock.income.update.mockResolvedValue(cancelledIncome);

      const result = await service.cancel(TENANT_ID, INCOME_ID);

      expect(result.status).toBe('CANCELLED');
      expect(result.cancelledAt).toBeDefined();
      expect(prismaMock.income.update).toHaveBeenCalledWith({
        where: { id: INCOME_ID },
        data: {
          status: 'CANCELLED',
          cancelledAt: expect.any(Date),
        },
      });
    });

    it('should throw if income not found', async () => {
      prismaMock.income.findUnique.mockResolvedValue(null);

      await expect(service.cancel(TENANT_ID, INCOME_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw if income already cancelled', async () => {
      const cancelledIncome = deepMerge(mockIncome, {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      });

      prismaMock.income.findUnique.mockResolvedValue(cancelledIncome);

      await expect(service.cancel(TENANT_ID, INCOME_ID)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated income list with filters', async () => {
      const query: IncomeQuery = {
        page: 1,
        limit: 50,
        type: 'SERVICE_FEE',
        status: 'ACTIVE',
      };

      const mockIncomeList = [mockIncome];

      prismaMock.income.findMany.mockResolvedValue(mockIncomeList);
      prismaMock.income.count.mockResolvedValue(1);

      const result = await service.findAll(TENANT_ID, query);

      expect(result.data).toEqual(mockIncomeList);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
    });

    it('should filter by dateFrom and dateTo', async () => {
      const query: IncomeQuery = {
        page: 1,
        limit: 50,
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31',
      };

      prismaMock.income.findMany.mockResolvedValue([mockIncome]);
      prismaMock.income.count.mockResolvedValue(1);

      const result = await service.findAll(TENANT_ID, query);

      expect(prismaMock.income.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
          }),
        }),
      );
      expect(result.data).toHaveLength(1);
    });

    it('should filter by type', async () => {
      const query: IncomeQuery = {
        page: 1,
        limit: 50,
        type: 'DEPOSIT',
      };

      prismaMock.income.findMany.mockResolvedValue([]);
      prismaMock.income.count.mockResolvedValue(0);

      await service.findAll(TENANT_ID, query);

      expect(prismaMock.income.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: 'DEPOSIT',
          }),
        }),
      );
    });

    it('should respect pagination', async () => {
      const query: IncomeQuery = {
        page: 2,
        limit: 25,
      };

      prismaMock.income.findMany.mockResolvedValue([]);
      prismaMock.income.count.mockResolvedValue(100);

      await service.findAll(TENANT_ID, query);

      expect(prismaMock.income.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 25,
          take: 25,
        }),
      );
    });
  });
});
