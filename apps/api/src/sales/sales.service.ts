import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateSaleDto,
  SaleResponse,
  SaleQuery,
  PaginatedSalesResponse,
} from '@repo/types';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Sale, SaleItem, Prisma } from '../../generated/prisma/client.js';

const MANAGER_ROLES = ['MANAGER', 'ADMIN', 'OWNER'];
const DEFAULT_PAGE_LIMIT = 50;

function toString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'toString' in value) {
    return (value as { toString(): string }).toString();
  }
  return String(value);
}

function buildSaleResponse(sale: {
  id: string;
  tenantId: string;
  locationId: string;
  folio: string;
  totalAmount: unknown;
  paymentType: string;
  status: string;
  isClosed: boolean;
  userId: string;
  notes: string | null;
  createdAt: Date;
  finishedAt: Date | null;
  settledAt: Date | null;
  closedAt: Date | null;
  items?: Array<{
    id: string;
    productId: string;
    quantity: number;
    unitPrice: unknown;
    tax: unknown;
    subtotal?: unknown;
    createdAt: Date;
  }>;
}): SaleResponse {
  return {
    id: sale.id,
    tenantId: sale.tenantId,
    locationId: sale.locationId,
    folio: sale.folio,
    totalAmount: toString(sale.totalAmount),
    paymentType: sale.paymentType as any,
    status: sale.status as any,
    isClosed: sale.isClosed,
    userId: sale.userId,
    notes: sale.notes,
    createdAt: sale.createdAt,
    finishedAt: sale.finishedAt,
    settledAt: sale.settledAt,
    closedAt: sale.closedAt,
    items: (sale.items || []).map((item) => ({
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: toString(item.unitPrice),
      tax: toString(item.tax),
      subtotal: toString(item.subtotal || '0.00'),
      createdAt: item.createdAt,
    })),
  };
}

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    tenantId: string,
    userId: string,
    role: string,
    locationId: string | null,
    dto: CreateSaleDto,
  ): Promise<SaleResponse> {
    // Validate role
    if (role === 'STAFF') {
      throw new ForbiddenException('STAFF no tiene acceso a crear ventas');
    }

    // Verify location exists
    const location = await this.prisma.location.findUniqueOrThrow({
      where: { id: dto.locationId },
    });
    if (location.tenantId !== tenantId) {
      throw new NotFoundException('Sucursal no encontrada en su tenant');
    }

    // Check if period is closed
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1,
    );

    const closedPeriod = await this.prisma.cashClose.findFirst({
      where: {
        tenantId,
        locationId: dto.locationId,
        status: 'CLOSED',
        date: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
    });
    if (closedPeriod) {
      throw new BadRequestException(
        'El período de caja ya está cerrado para hoy',
      );
    }

    // Validate stock before transaction
    for (const item of dto.items) {
      const stock = await this.prisma.locationStock.findUniqueOrThrow({
        where: {
          locationId_productId: {
            locationId: dto.locationId,
            productId: item.productId,
          },
        },
      });
      if (stock.quantity < item.quantity) {
        throw new BadRequestException(
          `Stock insuficiente. Disponible: ${stock.quantity}, solicitado: ${item.quantity}`,
        );
      }
    }

    // Pre-calculate values
    const totalAmount = this.calculateTotal(dto.items);

    // Create sale with atomic transaction
    const sale = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // Generate folio
        const locationCode =
          location.name.substring(0, 3).toUpperCase() || 'LOC';
        const folio = await this.generateFolio(
          tx,
          tenantId,
          dto.locationId,
          locationCode,
        );

        // Create sale
        const createdSale = await tx.sale.create({
          data: {
            tenantId,
            locationId: dto.locationId,
            folio,
            totalAmount,
            paymentType: dto.paymentType,
            status: 'ACTIVE',
            userId,
            notes: dto.notes || null,
          },
        });

        // Create sale items
        await tx.saleItem.createMany({
          data: dto.items.map((item) => {
            const unitPrice = parseFloat(item.unitPrice);
            const tax = parseFloat(item.tax);
            const subtotal = item.quantity * (unitPrice + tax);
            return {
              saleId: createdSale.id,
              productId: item.productId,
              quantity: item.quantity,
              unitPrice,
              tax,
              subtotal,
            };
          }),
        });

        // Decrement LocationStock for each item
        for (const item of dto.items) {
          await tx.locationStock.update({
            where: {
              locationId_productId: {
                locationId: dto.locationId,
                productId: item.productId,
              },
            },
            data: {
              quantity: {
                decrement: item.quantity,
              },
            },
          });
        }

        // Create inventory movement
        await tx.inventoryMovement.create({
          data: {
            tenantId,
            locationId: dto.locationId,
            userId,
            type: 'OUT',
            reference: createdSale.id,
            date: new Date(),
            notes: `Venta ${folio}`,
          },
        });

        // Update plan if BENEFIT payment
        if (dto.paymentType === 'BENEFIT' && dto.linkedPlanId) {
          const plan = await tx.plan.findUniqueOrThrow({
            where: { id: dto.linkedPlanId },
          });
          await tx.plan.update({
            where: { id: dto.linkedPlanId },
            data: {
              usedSessions: plan.usedSessions + 1,
            },
          });
        }

        return createdSale;
      },
    );

    // Fetch and return full sale with items
    const fullSale = await this.prisma.sale.findUniqueOrThrow({
      where: { id: sale.id },
      include: { items: true },
    });

    return buildSaleResponse({
      ...fullSale,
      totalAmount: fullSale.totalAmount,
    });
  }

  private async generateFolio(
    tx: Prisma.TransactionClient,
    tenantId: string,
    locationId: string,
    locationCode: string,
  ): Promise<string> {
    const year = new Date().getFullYear();

    // Get next sequence for this location within the year
    const result = (await tx.$executeRaw`
      SELECT COALESCE(MAX(CAST(SUBSTRING(folio, -5) AS INTEGER)), 0) + 1 as next_seq
      FROM "Sale"
      WHERE "tenantId" = ${tenantId}
      AND "locationId" = ${locationId}
      AND "folio" LIKE ${`${locationCode}-${year}-%`}
    `) as unknown;

    const rows = Array.isArray(result) ? result : [];
    const row = rows[0] as { next_seq: number } | undefined;
    const nextSeq = row?.next_seq || 1;
    const folio = `${locationCode}-${year}-${nextSeq.toString().padStart(5, '0')}`;

    return folio;
  }

  private calculateTotal(
    items: Array<{
      quantity: number;
      unitPrice: string;
      tax: string;
    }>,
  ): number {
    let total = 0;
    for (const item of items) {
      const unitPrice = parseFloat(item.unitPrice);
      const tax = parseFloat(item.tax);
      total += item.quantity * (unitPrice + tax);
    }
    return total;
  }

  async findOne(
    tenantId: string,
    id: string,
    role: string,
    locationId: string | null,
  ): Promise<SaleResponse> {
    const sale = await this.prisma.sale.findUniqueOrThrow({
      where: { id },
      include: { items: true },
    });

    if (sale.tenantId !== tenantId) {
      throw new NotFoundException('Venta no encontrada');
    }

    // MANAGER can only see sales from their location
    if (role === 'MANAGER' && sale.locationId !== locationId) {
      throw new ForbiddenException(
        'No tiene acceso a ventas de otras sucursales',
      );
    }

    return buildSaleResponse(sale);
  }

  async findAll(
    tenantId: string,
    role: string,
    locationId: string | null,
    query: SaleQuery,
  ): Promise<PaginatedSalesResponse> {
    const where: Prisma.SaleWhereInput = { tenantId };

    if (role === 'MANAGER' && locationId) {
      where.locationId = locationId;
    } else if (query.locationId) {
      where.locationId = query.locationId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.paymentType) {
      where.paymentType = query.paymentType;
    }

    if (query.dateFrom && query.dateTo) {
      const from = new Date(`${query.dateFrom}T00:00:00Z`);
      const to = new Date(`${query.dateTo}T23:59:59Z`);
      where.createdAt = {
        gte: from,
        lte: to,
      };
    }

    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.sale.findMany({
        where,
        include: { items: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.sale.count({ where }),
    ]);

    return {
      data: data.map((sale) =>
        buildSaleResponse({
          ...sale,
          totalAmount: sale.totalAmount,
        }),
      ),
      total,
      page,
      limit,
    };
  }
}
