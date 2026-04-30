import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CashCloseQuery,
  CashCloseResponse,
  CreateCashCloseDto,
} from '@repo/types';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CashClose } from '../../generated/prisma/client.js';

function toString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'toString' in value) {
    return (value as { toString(): string }).toString();
  }
  return String(value);
}

function buildCashCloseResponse(cashClose: {
  id: string;
  tenantId: string;
  locationId: string;
  date: Date;
  status: string;
  calculatedTotal: unknown;
  salesTotal: unknown;
  incomesTotal: unknown;
  expensesTotal: unknown;
  userId: string;
  createdAt: Date;
  closedAt: Date;
}): CashCloseResponse {
  return {
    id: cashClose.id,
    tenantId: cashClose.tenantId,
    locationId: cashClose.locationId,
    date: cashClose.date,
    status: cashClose.status as 'OPEN' | 'CLOSED',
    calculatedTotal: toString(cashClose.calculatedTotal),
    salesTotal: toString(cashClose.salesTotal),
    incomesTotal: toString(cashClose.incomesTotal),
    expensesTotal: toString(cashClose.expensesTotal),
    userId: cashClose.userId,
    createdAt: cashClose.createdAt,
    closedAt: cashClose.closedAt,
  };
}

@Injectable()
export class CashCloseService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    tenantId: string,
    userId: string,
    dto: CreateCashCloseDto,
  ): Promise<CashCloseResponse> {
    const dateOnly = new Date(dto.date);
    dateOnly.setUTCHours(0, 0, 0, 0);

    // Check if period is already closed
    const existingClose = await this.prisma.cashClose.findFirst({
      where: {
        tenantId,
        locationId: dto.locationId,
        date: dateOnly,
      },
    });

    if (existingClose) {
      throw new ConflictException(
        `Period already closed for location on ${dateOnly.toISOString().split('T')[0]}`,
      );
    }

    // Query all records for the day
    const [sales, incomes, expenses] = await Promise.all([
      this.prisma.sale.findMany({
        where: {
          tenantId,
          locationId: dto.locationId,
          createdAt: {
            gte: dateOnly,
            lt: new Date(dateOnly.getTime() + 24 * 60 * 60 * 1000),
          },
          status: { in: ['ACTIVE', 'FINISHED', 'SETTLED'] },
        },
      }),
      this.prisma.income.findMany({
        where: {
          tenantId,
          locationId: dto.locationId,
          createdAt: {
            gte: dateOnly,
            lt: new Date(dateOnly.getTime() + 24 * 60 * 60 * 1000),
          },
          status: 'ACTIVE',
        },
      }),
      this.prisma.expense.findMany({
        where: {
          tenantId,
          locationId: dto.locationId,
          createdAt: {
            gte: dateOnly,
            lt: new Date(dateOnly.getTime() + 24 * 60 * 60 * 1000),
          },
          status: 'ACTIVE',
        },
      }),
    ]);

    // Calculate totals
    const salesTotal = sales.reduce(
      (sum, s) => sum + parseFloat(toString(s.totalAmount)),
      0,
    );
    const incomesTotal = incomes.reduce(
      (sum, i) => sum + parseFloat(toString(i.amount)),
      0,
    );
    const expensesTotal = expenses.reduce(
      (sum, e) => sum + parseFloat(toString(e.amount)),
      0,
    );
    const calculatedTotal = salesTotal + incomesTotal - expensesTotal;

    // Create CashClose and mark records as closed in atomic transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const cashClose = await tx.cashClose.create({
        data: {
          tenantId,
          locationId: dto.locationId,
          date: dateOnly,
          status: 'CLOSED',
          calculatedTotal: calculatedTotal.toString(),
          salesTotal: salesTotal.toString(),
          incomesTotal: incomesTotal.toString(),
          expensesTotal: expensesTotal.toString(),
          userId,
        },
      });

      // Mark all sales as closed
      if (sales.length > 0) {
        await tx.sale.updateMany({
          where: {
            id: { in: sales.map((s) => s.id) },
          },
          data: {
            isClosed: true,
            closedAt: new Date(),
          },
        });
      }

      // Mark all incomes as closed
      if (incomes.length > 0) {
        await tx.income.updateMany({
          where: {
            id: { in: incomes.map((i) => i.id) },
          },
          data: {
            isClosed: true,
            closedAt: new Date(),
          },
        });
      }

      // Mark all expenses as closed
      if (expenses.length > 0) {
        await tx.expense.updateMany({
          where: {
            id: { in: expenses.map((e) => e.id) },
          },
          data: {
            isClosed: true,
            closedAt: new Date(),
          },
        });
      }

      return cashClose;
    });

    return buildCashCloseResponse(result as unknown as CashClose);
  }

  async findOne(tenantId: string, id: string): Promise<CashCloseResponse> {
    const cashClose = await this.prisma.cashClose.findUnique({
      where: { id },
    });

    if (!cashClose) {
      throw new NotFoundException(`Corte de caja no encontrado`);
    }

    if (cashClose.tenantId !== tenantId) {
      throw new NotFoundException(`Corte de caja no encontrado en su tenant`);
    }

    return buildCashCloseResponse(cashClose as unknown as CashClose);
  }

  async findByPeriod(
    tenantId: string,
    query: CashCloseQuery & { page?: number; limit?: number },
  ): Promise<{
    data: CashCloseResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { tenantId };

    if (query.locationId) {
      where.locationId = query.locationId;
    }

    if (query.date) {
      const dateOnly = new Date(query.date);
      dateOnly.setUTCHours(0, 0, 0, 0);
      where.date = dateOnly;
    }

    if (query.dateFrom || query.dateTo) {
      where.date = {};
      if (query.dateFrom) {
        const dateFrom = new Date(query.dateFrom);
        dateFrom.setUTCHours(0, 0, 0, 0);
        (where.date as Record<string, unknown>).gte = dateFrom;
      }
      if (query.dateTo) {
        const dateTo = new Date(query.dateTo);
        dateTo.setUTCHours(23, 59, 59, 999);
        (where.date as Record<string, unknown>).lte = dateTo;
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.cashClose.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
      }),
      this.prisma.cashClose.count({ where }),
    ]);

    return {
      data: (data as unknown as CashClose[]).map((cc) =>
        buildCashCloseResponse(cc as unknown as CashClose),
      ),
      total,
      page,
      limit,
    };
  }
}
