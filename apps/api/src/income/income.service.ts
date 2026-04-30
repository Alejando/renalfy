import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateIncomeDto,
  IncomeQuery,
  IncomeResponse,
  PaginatedIncomeResponse,
  UserRole,
} from '@repo/types';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Income, Prisma } from '../../generated/prisma/client.js';

function toString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'toString' in value) {
    return (value as { toString(): string }).toString();
  }
  return String(value);
}

function buildIncomeResponse(income: Income): IncomeResponse {
  return {
    id: income.id,
    tenantId: income.tenantId,
    locationId: income.locationId,
    type: income.type,
    customType: income.customType,
    amount: toString(income.amount),
    description: income.description,
    status: income.status,
    isClosed: income.isClosed,
    userId: income.userId,
    createdAt: income.createdAt,
    cancelledAt: income.cancelledAt,
    closedAt: income.closedAt,
  };
}

@Injectable()
export class IncomeService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    tenantId: string,
    userId: string,
    dto: CreateIncomeDto,
    role?: UserRole,
  ): Promise<IncomeResponse> {
    if (role === 'STAFF') {
      throw new ForbiddenException('STAFF cannot create income records');
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

    const income = await this.prisma.income.create({
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

    return buildIncomeResponse(income);
  }

  async cancel(tenantId: string, id: string): Promise<IncomeResponse> {
    const income = await this.prisma.income.findUnique({
      where: { id },
    });

    if (!income) {
      throw new NotFoundException(`Income record not found: ${id}`);
    }

    if (income.tenantId !== tenantId) {
      throw new ForbiddenException('Cannot access income from another tenant');
    }

    if (income.status === 'CANCELLED') {
      throw new BadRequestException('Income record is already cancelled');
    }

    const updatedIncome = await this.prisma.income.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    });

    return buildIncomeResponse(updatedIncome);
  }

  async findAll(
    tenantId: string,
    query: IncomeQuery,
  ): Promise<PaginatedIncomeResponse> {
    const { page = 1, limit = 50, type, status, dateFrom, dateTo } = query;

    const where: Prisma.IncomeWhereInput = {
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
      this.prisma.income.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.income.count({ where }),
    ]);

    return {
      data: data.map(buildIncomeResponse),
      total,
      page,
      limit,
    };
  }
}
