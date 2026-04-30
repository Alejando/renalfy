import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateExpenseDto,
  ExpenseQuery,
  ExpenseResponse,
  PaginatedExpenseResponse,
  UserRole,
} from '@repo/types';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Expense, Prisma } from '../../generated/prisma/client.js';

function toString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'toString' in value) {
    return (value as { toString(): string }).toString();
  }
  return String(value);
}

function buildExpenseResponse(expense: Expense): ExpenseResponse {
  return {
    id: expense.id,
    tenantId: expense.tenantId,
    locationId: expense.locationId,
    type: expense.type,
    customType: expense.customType,
    amount: toString(expense.amount),
    description: expense.description,
    status: expense.status,
    isClosed: expense.isClosed,
    userId: expense.userId,
    createdAt: expense.createdAt,
    cancelledAt: expense.cancelledAt,
    closedAt: expense.closedAt,
  };
}

@Injectable()
export class ExpenseService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    tenantId: string,
    userId: string,
    dto: CreateExpenseDto,
    role?: UserRole,
  ): Promise<ExpenseResponse> {
    if (role === 'STAFF') {
      throw new ForbiddenException('STAFF cannot create expense records');
    }

    // Check if period is closed
    const now = new Date();
    const dateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const closedPeriod = await this.prisma.cashClose.findFirst({
      where: {
        tenantId,
        locationId: dto.locationId,
        status: 'CLOSED',
        date: {
          gte: dateOnly,
          lt: new Date(dateOnly.getTime() + 86400000),
        },
      },
    });
    if (closedPeriod) {
      throw new BadRequestException(
        'El período de caja ya está cerrado para hoy',
      );
    }

    const expense = await this.prisma.expense.create({
      data: {
        tenantId,
        locationId: dto.locationId,
        type: dto.type,
        customType: dto.customType ?? null,
        amount: dto.amount,
        description: dto.description ?? null,
        userId,
        status: 'ACTIVE',
      },
    });

    return buildExpenseResponse(expense);
  }

  async cancel(tenantId: string, id: string): Promise<ExpenseResponse> {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
    });

    if (!expense) {
      throw new NotFoundException(`Expense record not found: ${id}`);
    }

    if (expense.tenantId !== tenantId) {
      throw new ForbiddenException('Cannot access expense from another tenant');
    }

    if (expense.status === 'CANCELLED') {
      throw new BadRequestException('Expense record is already cancelled');
    }

    const updatedExpense = await this.prisma.expense.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    });

    return buildExpenseResponse(updatedExpense);
  }

  async findAll(
    tenantId: string,
    query: ExpenseQuery,
  ): Promise<PaginatedExpenseResponse> {
    const { page = 1, limit = 50, type, status, dateFrom, dateTo } = query;

    const where: Prisma.ExpenseWhereInput = {
      tenantId,
      ...(type ? { type } : {}),
      ...(status ? { status } : {}),
      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom ? { gte: new Date(`${dateFrom}T00:00:00Z`) } : {}),
              ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59Z`) } : {}),
            },
          }
        : {}),
    };

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.expense.count({ where }),
    ]);

    return {
      data: data.map(buildExpenseResponse),
      total,
      page,
      limit,
    };
  }
}
