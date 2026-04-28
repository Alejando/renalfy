import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  InventoryMovementDetailResponse,
  InventoryMovementQuery,
  PaginatedInventoryMovementsResponse,
} from '@repo/types';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Prisma } from '../../generated/prisma/client.js';

function buildMovementResponse(movement: {
  id: string;
  tenantId: string;
  locationId: string;
  userId: string;
  date: Date;
  type: string;
  reference: string | null;
  notes: string | null;
  createdAt: Date;
  items: Array<{ id: string }>;
}): {
  id: string;
  tenantId: string;
  locationId: string;
  userId: string;
  date: Date;
  type: string;
  reference: string | null;
  notes: string | null;
  itemCount: number;
  createdAt: Date;
} {
  return {
    id: movement.id,
    tenantId: movement.tenantId,
    locationId: movement.locationId,
    userId: movement.userId,
    date: movement.date,
    type: movement.type,
    reference: movement.reference,
    notes: movement.notes,
    itemCount: movement.items.length,
    createdAt: movement.createdAt,
  };
}

@Injectable()
export class InventoryMovementsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    tenantId: string,
    role: string,
    userLocationId: string | null,
    query: InventoryMovementQuery,
  ): Promise<PaginatedInventoryMovementsResponse> {
    if (role === 'STAFF') {
      throw new BadRequestException(
        'STAFF no tiene acceso a movimientos de inventario',
      );
    }

    const { page, limit, locationId, productId, type, dateFrom, dateTo } =
      query;
    const skip = (page - 1) * limit;

    const dateFilter: Prisma.DateTimeFilter | undefined = (() => {
      if (dateFrom && dateTo) {
        return { gte: dateFrom, lte: dateTo };
      }
      if (dateFrom) {
        return { gte: dateFrom };
      }
      if (dateTo) {
        return { lte: dateTo };
      }
      return undefined;
    })();

    const where: Prisma.InventoryMovementWhereInput = {
      tenantId,
      ...(locationId ? { locationId } : {}),
      ...(type ? { type } : {}),
      ...(dateFilter ? { date: dateFilter } : {}),
      ...(productId ? { items: { some: { productId } } } : {}),
      ...(role === 'MANAGER' && userLocationId
        ? { locationId: userLocationId }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.inventoryMovement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          items: { select: { id: true } },
        },
      }),
      this.prisma.inventoryMovement.count({ where }),
    ]);

    return {
      data: data.map((movement) => buildMovementResponse(movement)),
      total,
      page,
      limit,
    };
  }

  async findOne(
    tenantId: string,
    role: string,
    userLocationId: string | null,
    id: string,
  ): Promise<InventoryMovementDetailResponse> {
    if (role === 'STAFF') {
      throw new BadRequestException(
        'STAFF no tiene acceso a movimientos de inventario',
      );
    }

    const locationWhere =
      role === 'MANAGER' && userLocationId
        ? { locationId: userLocationId }
        : {};

    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;

        const movement = await tx.inventoryMovement.findFirstOrThrow({
          where: { id, tenantId, ...locationWhere },
        });

        const items = await tx.inventoryMovementItem.findMany({
          where: { inventoryMovementId: id },
          include: {
            product: { select: { id: true, name: true, brand: true } },
          },
        });

        return {
          id: movement.id,
          tenantId: movement.tenantId,
          locationId: movement.locationId,
          userId: movement.userId,
          date: movement.date,
          type: movement.type,
          reference: movement.reference,
          notes: movement.notes,
          itemCount: items.length,
          createdAt: movement.createdAt,
          items: items.map((item) => ({
            id: item.id,
            inventoryMovementId: item.inventoryMovementId,
            productId: item.productId,
            quantity: item.quantity,
            product: item.product,
          })),
        };
      });
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException) {
        throw e;
      }
      throw new NotFoundException(`Movimiento con ID ${id} no encontrado`);
    }
  }
}
