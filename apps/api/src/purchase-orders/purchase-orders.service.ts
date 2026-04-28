import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type {
  AddPurchaseOrderItemDto,
  CreatePurchaseOrderDto,
  PaginatedPurchaseOrdersResponse,
  PurchaseOrderDetailResponse,
  PurchaseOrderItemResponse,
  PurchaseOrderQuery,
  PurchaseOrderResponse,
  UpdatePurchaseOrderDto,
  UpdatePurchaseOrderItemDto,
} from '@repo/types';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  Prisma,
  PurchaseOrderStatus,
} from '../../generated/prisma/client.js';

type TransitionMap = Record<PurchaseOrderStatus, PurchaseOrderStatus[]>;

const ALLOWED_TRANSITIONS: TransitionMap = {
  DRAFT: ['SENT', 'CANCELLED'],
  SENT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['CANCELLED'],
  RECEIVED: ['CLOSED'],
  COMPLETED: [],
  CLOSED: [],
  CANCELLED: [],
};

function toString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'toString' in value) {
    // Decimal from Prisma has a proper toString()
    return (value as { toString(): string }).toString();
  }
  return String(value);
}

function buildOrderResponse(order: {
  id: string;
  tenantId: string;
  supplierId: string;
  locationId: string;
  userId: string;
  date: Date;
  status: PurchaseOrderStatus;
  notes: string | null;
  expectedDate: Date | null;
  total: unknown;
  createdAt: Date;
  updatedAt: Date;
  supplier: { id: string; name: string };
  location: { id: string; name: string };
  itemCount: number;
}): PurchaseOrderResponse {
  return {
    id: order.id,
    tenantId: order.tenantId,
    supplierId: order.supplierId,
    locationId: order.locationId,
    userId: order.userId,
    date: order.date,
    status: order.status,
    notes: order.notes,
    expectedDate: order.expectedDate,
    total: toString(order.total),
    supplierName: order.supplier?.name ?? 'Sin proveedor',
    locationName: order.location?.name ?? 'Sin sucursal',
    itemCount: order.itemCount,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

@Injectable()
export class PurchaseOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    tenantId: string,
    role: string,
    userLocationId: string | null,
    query: PurchaseOrderQuery,
  ): Promise<PaginatedPurchaseOrdersResponse> {
    if (role === 'STAFF') {
      throw new BadRequestException(
        'STAFF no tiene acceso a órdenes de compra',
      );
    }

    const { page, limit, supplierId, locationId, status, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.PurchaseOrderWhereInput = {
      tenantId,
      ...(supplierId ? { supplierId } : {}),
      ...(locationId ? { locationId } : {}),
      ...(status ? { status } : {}),
      ...(search
        ? { supplier: { name: { contains: search, mode: 'insensitive' } } }
        : {}),
      ...(role === 'MANAGER' && userLocationId
        ? { locationId: userLocationId }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          supplier: { select: { id: true, name: true } },
          location: { select: { id: true, name: true } },
          items: { select: { id: true } },
        },
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    return {
      data: data.map((order) =>
        buildOrderResponse({
          ...order,
          itemCount: order.items.length,
        }),
      ),
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
  ): Promise<PurchaseOrderDetailResponse> {
    if (role === 'STAFF') {
      throw new BadRequestException(
        'STAFF no tiene acceso a órdenes de compra',
      );
    }

    const locationWhere =
      role === 'MANAGER' && userLocationId
        ? { locationId: userLocationId }
        : {};

    try {
      // Wrap all queries in a single transaction so set_config and every SELECT
      // run on the same pg connection — required for RLS policies to apply correctly
      // when using a connection pool (otherwise set_config executes on connection A
      // while model queries may use connections B/C which lack the tenant context).
      return await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;

        const order = await tx.purchaseOrder.findFirstOrThrow({
          where: { id, tenantId, ...locationWhere },
        });

        const [supplier, location, items] = await Promise.all([
          tx.supplier.findFirstOrThrow({
            where: { id: order.supplierId, tenantId },
          }),
          tx.location.findFirstOrThrow({
            where: { id: order.locationId },
          }),
          tx.purchaseOrderItem.findMany({
            where: { purchaseOrderId: id },
            include: {
              product: { select: { id: true, name: true, brand: true } },
            },
          }),
        ]);

        return {
          id: order.id,
          tenantId: order.tenantId,
          supplierId: order.supplierId,
          locationId: order.locationId,
          userId: order.userId,
          date: order.date,
          status: order.status,
          notes: order.notes,
          expectedDate: order.expectedDate,
          total: toString(order.total),
          supplierName: supplier.name,
          locationName: location.name,
          itemCount: items.length,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          items: items.map((item) => ({
            id: item.id,
            purchaseOrderId: item.purchaseOrderId,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: toString(item.unitPrice),
            subtotal: toString(item.subtotal),
            createdAt: item.createdAt,
            product: item.product,
          })),
          supplier: {
            id: supplier.id,
            name: supplier.name,
            contact: supplier.contact,
            phone: supplier.phone,
            email: supplier.email,
          },
          location: { id: location.id, name: location.name },
        };
      });
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException) {
        throw e;
      }
      throw new NotFoundException(`Orden con ID ${id} no encontrada`);
    }
  }

  async create(
    tenantId: string,
    userId: string,
    dto: CreatePurchaseOrderDto,
  ): Promise<PurchaseOrderResponse> {
    const supplier = await this.prisma.supplier.findUniqueOrThrow({
      where: { id: dto.supplierId },
    });

    if (supplier.status === 'INACTIVE') {
      throw new UnprocessableEntityException(
        'No se puede crear una orden para un proveedor inactivo',
      );
    }

    const order = await this.prisma.purchaseOrder.create({
      data: {
        tenantId,
        userId,
        supplierId: dto.supplierId,
        locationId: dto.locationId,
        expectedDate: dto.expectedDate,
        notes: dto.notes,
        status: 'DRAFT',
        total: '0',
        date: new Date(),
      },
      include: {
        supplier: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
        items: { select: { id: true } },
      },
    });

    return buildOrderResponse({
      ...order,
      itemCount: order.items.length,
    });
  }

  async update(
    tenantId: string,
    role: string,
    id: string,
    dto: UpdatePurchaseOrderDto,
  ): Promise<PurchaseOrderResponse> {
    if (role !== 'OWNER' && role !== 'ADMIN') {
      throw new BadRequestException('Solo OWNER y ADMIN pueden editar órdenes');
    }

    const order = await this.prisma.purchaseOrder.findUnique({
      where: { id, tenantId },
    });
    if (!order) {
      throw new NotFoundException(`Orden con ID ${id} no encontrada`);
    }
    if (order.status !== 'DRAFT') {
      throw new UnprocessableEntityException(
        'Solo se pueden editar órdenes en estado DRAFT',
      );
    }

    const updated = await this.prisma.purchaseOrder.update({
      where: { id, tenantId },
      data: dto,
      include: {
        supplier: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
        items: { select: { id: true } },
      },
    });

    return buildOrderResponse({
      ...updated,
      itemCount: updated.items.length,
    });
  }

  async addItem(
    tenantId: string,
    orderId: string,
    dto: AddPurchaseOrderItemDto,
  ): Promise<PurchaseOrderItemResponse> {
    const order = await this.prisma.purchaseOrder.findUniqueOrThrow({
      where: { id: orderId, tenantId },
    });

    if (order.status !== 'DRAFT') {
      throw new UnprocessableEntityException(
        'Solo se pueden agregar ítems a órdenes en estado DRAFT',
      );
    }

    const existingItem = await this.prisma.purchaseOrderItem.findFirst({
      where: { purchaseOrderId: orderId, productId: dto.productId },
    });
    if (existingItem) {
      throw new BadRequestException(
        'Este producto ya está en la orden. Use la acción de editar.',
      );
    }

    const supplierProduct = await this.prisma.supplierProduct.findFirst({
      where: {
        supplierId: order.supplierId,
        productId: dto.productId,
        tenantId,
      },
    });

    if (!supplierProduct) {
      await this.prisma.supplierProduct.create({
        data: {
          tenantId,
          supplierId: order.supplierId,
          productId: dto.productId,
          price: dto.unitPrice,
        },
      });
    }

    const subtotal = (parseFloat(dto.unitPrice) * dto.quantity).toFixed(2);

    const item = await this.prisma.$transaction(async (tx) => {
      const created = await tx.purchaseOrderItem.create({
        data: {
          purchaseOrderId: orderId,
          productId: dto.productId,
          quantity: dto.quantity,
          unitPrice: dto.unitPrice,
          subtotal,
        },
        include: {
          product: { select: { id: true, name: true, brand: true } },
        },
      });

      const items = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: orderId },
      });
      const total = items
        .reduce((sum, i) => sum + parseFloat(toString(i.subtotal)), 0)
        .toFixed(2);

      await tx.purchaseOrder.update({
        where: { id: orderId },
        data: { total },
      });

      return created;
    });

    return {
      id: item.id,
      purchaseOrderId: item.purchaseOrderId,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: toString(item.unitPrice),
      subtotal: toString(item.subtotal),
      createdAt: item.createdAt,
      product: item.product,
    };
  }

  async updateItem(
    tenantId: string,
    orderId: string,
    itemId: string,
    dto: UpdatePurchaseOrderItemDto,
  ): Promise<PurchaseOrderItemResponse> {
    const order = await this.prisma.purchaseOrder.findUniqueOrThrow({
      where: { id: orderId, tenantId },
    });

    if (order.status !== 'DRAFT') {
      throw new UnprocessableEntityException(
        'Solo se pueden editar ítems de órdenes en estado DRAFT',
      );
    }

    const existing = await this.prisma.purchaseOrderItem.findUniqueOrThrow({
      where: { id: itemId },
    });

    const unitPrice = dto.unitPrice ?? toString(existing.unitPrice);
    const quantity = dto.quantity ?? existing.quantity;
    const subtotal = (parseFloat(unitPrice) * quantity).toFixed(2);

    const item = await this.prisma.$transaction(async (tx) => {
      const updatedItem = await tx.purchaseOrderItem.update({
        where: { id: itemId },
        data: { quantity, unitPrice, subtotal },
        include: {
          product: { select: { id: true, name: true, brand: true } },
        },
      });

      const items = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: orderId },
      });
      const total = items
        .reduce((sum, i) => sum + parseFloat(toString(i.subtotal)), 0)
        .toFixed(2);

      await tx.purchaseOrder.update({
        where: { id: orderId },
        data: { total },
      });

      return updatedItem;
    });

    return {
      id: item.id,
      purchaseOrderId: item.purchaseOrderId,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: toString(item.unitPrice),
      subtotal: toString(item.subtotal),
      createdAt: item.createdAt,
      product: item.product,
    };
  }

  async removeItem(
    tenantId: string,
    orderId: string,
    itemId: string,
  ): Promise<void> {
    const order = await this.prisma.purchaseOrder.findUniqueOrThrow({
      where: { id: orderId, tenantId },
    });

    if (order.status !== 'DRAFT') {
      throw new UnprocessableEntityException(
        'Solo se pueden eliminar ítems de órdenes en estado DRAFT',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.purchaseOrderItem.delete({ where: { id: itemId } });

      const items = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: orderId },
      });
      const total = items
        .reduce((sum, i) => sum + parseFloat(toString(i.subtotal)), 0)
        .toFixed(2);

      await tx.purchaseOrder.update({
        where: { id: orderId },
        data: { total },
      });
    });
  }

  async updateStatus(
    tenantId: string,
    orderId: string,
    status: PurchaseOrderStatus,
  ): Promise<PurchaseOrderResponse> {
    const order = await this.prisma.purchaseOrder.findUniqueOrThrow({
      where: { id: orderId, tenantId },
    });

    if (order.tenantId !== tenantId) {
      throw new NotFoundException(`Orden con ID ${orderId} no encontrada`);
    }

    const allowed = ALLOWED_TRANSITIONS[order.status];
    if (!allowed.includes(status)) {
      throw new UnprocessableEntityException(
        `Transición de ${order.status} a ${status} no permitida`,
      );
    }

    if (status === 'SENT') {
      const itemCount = await this.prisma.purchaseOrderItem.count({
        where: { purchaseOrderId: orderId },
      });
      if (itemCount === 0) {
        throw new UnprocessableEntityException(
          'No se puede enviar una orden sin ítems',
        );
      }
    }

    const updated = await this.prisma.purchaseOrder.update({
      where: { id: orderId },
      data: { status },
      include: {
        supplier: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
        items: { select: { id: true } },
      },
    });

    return buildOrderResponse({
      ...updated,
      itemCount: updated.items.length,
    });
  }

  async closePurchaseOrder(
    tenantId: string,
    role: string,
    orderId: string,
    dto: { notes?: string },
  ): Promise<PurchaseOrderResponse> {
    if (role !== 'OWNER' && role !== 'ADMIN') {
      throw new BadRequestException(
        'Solo OWNER y ADMIN pueden cerrar órdenes con saldo pendiente',
      );
    }

    let order: Awaited<
      ReturnType<typeof this.prisma.purchaseOrder.findFirstOrThrow>
    >;
    try {
      order = await this.prisma.purchaseOrder.findFirstOrThrow({
        where: { id: orderId, tenantId },
      });
    } catch {
      throw new NotFoundException(`Orden con ID ${orderId} no encontrada`);
    }

    if (order.status !== 'RECEIVED') {
      throw new UnprocessableEntityException(
        'Solo se pueden cerrar órdenes en estado RECEIVED',
      );
    }

    const updated = await this.prisma.purchaseOrder.update({
      where: { id: orderId },
      data: {
        status: 'CLOSED',
        ...(dto.notes ? { notes: dto.notes } : {}),
      },
      include: {
        supplier: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
        items: { select: { id: true } },
      },
    });

    return buildOrderResponse({
      ...updated,
      itemCount: updated.items.length,
    });
  }
}
