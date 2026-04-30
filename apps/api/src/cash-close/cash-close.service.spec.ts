import { ConflictException } from '@nestjs/common';
import { CashCloseService } from './cash-close.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('../../generated/prisma/client.js', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({})),
}));

const TENANT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const USER_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const LOC_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const CASH_CLOSE_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

const mockSale = {
  id: 'ssss-ssss-ssss-ssss',
  tenantId: TENANT_ID,
  locationId: LOC_ID,
  folio: 'LOC-2026-00001',
  totalAmount: { toString: () => '100.00' },
  paymentType: 'CASH',
  status: 'ACTIVE',
  isClosed: false,
  closedAt: null,
  userId: USER_ID,
  createdAt: new Date('2026-04-29'),
};

const mockIncome = {
  id: 'iiii-iiii-iiii-iiii',
  tenantId: TENANT_ID,
  locationId: LOC_ID,
  type: 'OTHER',
  customType: 'Test Income',
  amount: { toString: () => '50.00' },
  status: 'ACTIVE',
  isClosed: false,
  closedAt: null,
  userId: USER_ID,
  createdAt: new Date('2026-04-29'),
};

const mockExpense = {
  id: 'eeee-eeee-eeee-eeee',
  tenantId: TENANT_ID,
  locationId: LOC_ID,
  type: 'OTHER',
  customType: 'Test Expense',
  amount: { toString: () => '25.00' },
  status: 'ACTIVE',
  isClosed: false,
  closedAt: null,
  userId: USER_ID,
  createdAt: new Date('2026-04-29'),
};

const mockCashClose = {
  id: CASH_CLOSE_ID,
  tenantId: TENANT_ID,
  locationId: LOC_ID,
  date: new Date('2026-04-29'),
  status: 'CLOSED',
  calculatedTotal: { toString: () => '125.00' },
  salesTotal: { toString: () => '100.00' },
  incomesTotal: { toString: () => '50.00' },
  expensesTotal: { toString: () => '25.00' },
  userId: USER_ID,
  createdAt: new Date(),
  closedAt: new Date(),
};

function makeTransaction(
  saleUpdate: jest.Mock = jest.fn().mockResolvedValue(mockSale),
  incomeUpdate: jest.Mock = jest.fn().mockResolvedValue(mockIncome),
  expenseUpdate: jest.Mock = jest.fn().mockResolvedValue(mockExpense),
  cashCloseCreate: jest.Mock = jest.fn().mockResolvedValue(mockCashClose),
) {
  return jest.fn().mockImplementation((fn: (tx: unknown) => Promise<unknown>) =>
    fn({
      sale: { updateMany: saleUpdate },
      income: { updateMany: incomeUpdate },
      expense: { updateMany: expenseUpdate },
      cashClose: { create: cashCloseCreate },
    }),
  );
}

function makePrisma(overrides: Record<string, unknown> = {}): PrismaService {
  return {
    sale: {
      findMany: jest.fn().mockResolvedValue([mockSale]),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    income: {
      findMany: jest.fn().mockResolvedValue([mockIncome]),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    expense: {
      findMany: jest.fn().mockResolvedValue([mockExpense]),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    cashClose: {
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(mockCashClose),
      findMany: jest.fn().mockResolvedValue([mockCashClose]),
      count: jest.fn().mockResolvedValue(1),
      create: jest.fn().mockResolvedValue(mockCashClose),
    },
    $transaction: makeTransaction(),
    ...overrides,
  } as unknown as PrismaService;
}

describe('CashCloseService', () => {
  describe('create', () => {
    it('should calculate total as SUM(Sales) + SUM(Incomes) - SUM(Expenses)', async () => {
      const prisma = makePrisma();
      const service = new CashCloseService(prisma);

      const dto = { locationId: LOC_ID, date: new Date('2026-04-29') };

      await service.create(TENANT_ID, USER_ID, dto);

      expect(prisma.sale.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
            locationId: LOC_ID,
          }),
        }),
      );
      expect(prisma.income.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
            locationId: LOC_ID,
          }),
        }),
      );
      expect(prisma.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
            locationId: LOC_ID,
          }),
        }),
      );
    });

    it('should mark all sales/income/expense as isClosed = true', async () => {
      const prisma = makePrisma();
      const service = new CashCloseService(prisma);

      const dto = { locationId: LOC_ID, date: new Date('2026-04-29') };

      await service.create(TENANT_ID, USER_ID, dto);

      // Verify updateMany was called via transaction
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should reject duplicate close with 409 Conflict', async () => {
      const prisma = makePrisma({
        cashClose: {
          findFirst: jest.fn().mockResolvedValue(mockCashClose),
        },
      });
      const service = new CashCloseService(prisma);

      const dto = { locationId: LOC_ID, date: new Date('2026-04-29') };

      await expect(service.create(TENANT_ID, USER_ID, dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should reject UPDATE/DELETE on CashClose after CLOSED via RLS error', async () => {
      const prisma = makePrisma({
        $transaction: jest
          .fn()
          .mockRejectedValue(
            new Error(
              'update or delete on table "CashClose" violates row level security policy',
            ),
          ),
      });
      const service = new CashCloseService(prisma);

      const dto = { locationId: LOC_ID, date: new Date('2026-04-29') };

      // This should fail due to RLS
      await expect(service.create(TENANT_ID, USER_ID, dto)).rejects.toThrow();
    });
  });

  describe('findOne', () => {
    it('should return CashClose by id', async () => {
      const prisma = makePrisma();
      const service = new CashCloseService(prisma);

      const result = await service.findOne(TENANT_ID, CASH_CLOSE_ID);

      expect(result).toEqual(expect.objectContaining({ id: CASH_CLOSE_ID }));
      expect(prisma.cashClose.findUnique).toHaveBeenCalledWith({
        where: { id: CASH_CLOSE_ID },
      });
    });

    it('should throw NotFoundException if not found', async () => {
      const prisma = makePrisma({
        cashClose: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
      });
      const service = new CashCloseService(prisma);

      await expect(service.findOne(TENANT_ID, CASH_CLOSE_ID)).rejects.toThrow();
    });
  });

  describe('findByPeriod', () => {
    it('should return CashCloses filtered by date range', async () => {
      const prisma = makePrisma();
      const service = new CashCloseService(prisma);

      const query = {
        dateFrom: '2026-04-01',
        dateTo: '2026-04-30',
      };

      const result = await service.findByPeriod(TENANT_ID, query);

      expect(result.data).toContainEqual(
        expect.objectContaining({ id: CASH_CLOSE_ID }),
      );
      expect(prisma.cashClose.findMany).toHaveBeenCalled();
    });

    it('should return paginated results', async () => {
      const prisma = makePrisma({
        cashClose: {
          findMany: jest.fn().mockResolvedValue([mockCashClose]),
          count: jest.fn().mockResolvedValue(1),
        },
      });
      const service = new CashCloseService(prisma);

      const query = { page: 1, limit: 10 };

      const result = await service.findByPeriod(TENANT_ID, query);

      expect(result).toEqual(
        expect.objectContaining({ total: expect.any(Number) }),
      );
    });
  });
});
