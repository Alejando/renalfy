import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type {
  PaginatedPurchasesResponse,
  PurchaseDetailResponse,
  PurchaseQuery,
  PurchaseResponse,
  ReceivePurchaseOrderDto,
} from '@repo/types';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Prisma } from '../../generated/prisma/client.js';

function toString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'toString' in value) {
    return (value as { toString(): string }).toString();
  }
  return String(value);
}

function buildPurchaseResponse(purchase: {
  id: string;
  tenantId: string;
  supplierId: string;
  locationId: string;
  userId: string;
  date: Date;
  amount: unknown;
  notes: string | null;
  createdAt: Date;
  supplier: { id: string; name: string };
  location: { id: string; name: string };
  itemCount: number;
}): PurchaseResponse {
  return {
    id: purchase.id,
    tenantId: purchase.tenantId,
    supplierId: purchase.supplierId,
    locationId: purchase.locationId,
    userId: purchase.userId,
    date: purchase.date,
    amount: toString(purchase.amount),
    notes: purchase.notes,
    supplierName: purchase.supplier?.name ?? 'Sin proveedor',
    locationName: purchase.location?.name ?? 'Sin sucursal',
    itemCount: purchase.itemCount,
    createdAt: purchase.createdAt,
  };
}

@Injectable()
export class PurchasesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    tenantId: string,
    userId: string,
    role: string,
    locationId: string,
    dto: ReceivePurchaseOrderDto,
  ): Promise<PurchaseResponse> {
    if (role === 'STAFF') {
      throw new BadRequestException('STAFF no tiene acceso a compras');
    }

    // Verify purchase order exists and is in correct state
    const purchaseOrder = await this.prisma.purchaseOrder.findUniqueOrThrow({
      where: { id: dto.purchaseOrderId },
    });

    if (purchaseOrder.tenantId !== tenantId) {
      throw new NotFoundException(`Orden de compra no encontrada en su tenant`);
    }

    if (
      purchaseOrder.status !== 'CONFIRMED' &&
      purchaseOrder.status !== 'RECEIVED'
    ) {
      throw new UnprocessableEntityException(
        `Orden debe estar en estado CONFIRMED o RECEIVED para recibir. Estado actual: ${purchaseOrder.status}`,
      );
    }

    // Verify location ownership
    const location = await this.prisma.location.findUnique({
      where: { id: dto.locationId },
    });
    if (!location || location.tenantId !== tenantId) {
      throw new NotFoundException('Sucursal no encontrada');
    }

    // MANAGER can only receive in their assigned location
    if (role === 'MANAGER' && locationId && dto.locationId !== locationId) {
      throw new ForbiddenException(
        'MANAGER solo puede recibir en su sucursal asignada',
      );
    }

    return await this.prisma.$transaction(async (tx) => {
      // Verify all items exist in purchase order and not duplicated
      const poItems = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: dto.purchaseOrderId },
      });

      const poItemMap = new Map(poItems.map((item) => [item.id, item]));

      // Check for duplicate items in request
      const receivedIds = new Set<string>();
      for (const item of dto.items) {
        if (receivedIds.has(item.purchaseOrderItemId)) {
          throw new BadRequestException(
            `Ítem duplicado en la solicitud: ${item.purchaseOrderItemId}`,
          );
        }
        receivedIds.add(item.purchaseOrderItemId);

        if (!poItemMap.has(item.purchaseOrderItemId)) {
          throw new BadRequestException(
            `Ítem ${item.purchaseOrderItemId} no existe en la orden`,
          );
        }
      }

      // Validate accumulated quantity per item does not exceed ordered quantity
      const previousPurchaseItems = await tx.purchaseItem.findMany({
        where: { purchaseOrderId: dto.purchaseOrderId },
      });

      const previousByPoItemId = new Map(
        previousPurchaseItems.map((item) => [
          item.purchaseOrderItemId,
          item.quantityReceived,
        ]),
      );

      for (const item of dto.items) {
        const poItem = poItemMap.get(item.purchaseOrderItemId)!;
        const previouslyReceived =
          previousByPoItemId.get(item.purchaseOrderItemId) ?? 0;
        const newTotal = previouslyReceived + item.quantityReceived;

        if (newTotal > poItem.quantity) {
          throw new UnprocessableEntityException(
            `Ítem ${item.purchaseOrderItemId}: cantidad acumulada (${newTotal}) excede la ordenada (${poItem.quantity})`,
          );
        }
      }

      // Calculate total amount and collect items to create
      let totalAmount = 0;
      const itemsToCreate: Array<{
        purchaseOrderItemId: string;
        productId: string;
        quantity: number;
        quantityReceived: number;
        unitsPerPackage: number;
        unitPrice: string;
        tax: string;
        subtotal: string;
      }> = [];

      for (const item of dto.items) {
        const subtotal = (
          parseFloat(item.unitPrice) * item.quantityReceived
        ).toFixed(2);
        const tax = item.tax ?? '0';
        const lineAmount = parseFloat(subtotal) + parseFloat(tax);
        totalAmount += lineAmount;

        itemsToCreate.push({
          purchaseOrderItemId: item.purchaseOrderItemId,
          productId: item.productId,
          quantity: item.quantityReceived,
          quantityReceived: item.quantityReceived,
          unitsPerPackage: item.unitsPerPackage,
          unitPrice: item.unitPrice,
          tax,
          subtotal,
        });
      }

      const purchase = await tx.purchase.create({
        data: {
          tenantId,
          userId,
          purchaseOrderId: dto.purchaseOrderId,
          supplierId: purchaseOrder.supplierId,
          locationId: dto.locationId,
          date: new Date(),
          amount: totalAmount.toFixed(2),
          notes: dto.notes,
        },
        include: {
          supplier: { select: { id: true, name: true } },
          location: { select: { id: true, name: true } },
          items: { select: { id: true } },
        },
      });

      // Create purchase items and inventory movement items
      const movementItems: Array<{
        productId: string;
        quantity: number;
      }> = [];

      for (const item of itemsToCreate) {
        await tx.purchaseItem.create({
          data: {
            purchaseId: purchase.id,
            purchaseOrderItemId: item.purchaseOrderItemId,
            productId: item.productId,
            quantity: item.quantity,
            quantityReceived: item.quantityReceived,
            unitsPerPackage: item.unitsPerPackage,
            unitPrice: item.unitPrice,
            tax: item.tax,
            subtotal: item.subtotal,
          },
        });

        // Calculate stock delta: quantityReceived × unitsPerPackage
        const stockDelta = item.quantityReceived * item.unitsPerPackage;

        // Update or create LocationStock
        const existing = await tx.locationStock.findFirst({
          where: { productId: item.productId, locationId: dto.locationId },
        });

        if (existing) {
          await tx.locationStock.update({
            where: { id: existing.id },
            data: { quantity: existing.quantity + stockDelta },
          });
        } else {
          await tx.locationStock.create({
            data: {
              productId: item.productId,
              locationId: dto.locationId,
              quantity: stockDelta,
            },
          });
        }

        movementItems.push({
          productId: item.productId,
          quantity: stockDelta,
        });
      }

      // Create inventory movement with reference
      const movement = await tx.inventoryMovement.create({
        data: {
          tenantId,
          userId,
          locationId: dto.locationId,
          date: new Date(),
          type: 'IN',
          reference: `PURCHASE-${purchase.id}`,
          notes: dto.notes,
        },
      });

      for (const item of movementItems) {
        await tx.inventoryMovementItem.create({
          data: {
            inventoryMovementId: movement.id,
            productId: item.productId,
            quantity: item.quantity,
          },
        });
      }

      // Update purchase order status based on accumulation
      // Get all items in the PO
      const allPoItems = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: dto.purchaseOrderId },
      });

      // Calculate total quantity expected (from all PO items)
      const totalExpected = allPoItems.reduce((sum, i) => sum + i.quantity, 0);

      // Calculate total received so far (including this purchase)
      const totalReceived = await tx.purchaseItem.aggregate({
        where: { purchaseOrderId: dto.purchaseOrderId },
        _sum: { quantityReceived: true },
      });

      const receivedQuantity = totalReceived._sum.quantityReceived ?? 0;

      let newStatus = purchaseOrder.status;
      if (receivedQuantity === totalExpected) {
        // All items received
        newStatus = 'COMPLETED';
      } else if (purchaseOrder.status === 'CONFIRMED') {
        // First partial receipt
        newStatus = 'RECEIVED';
      }

      await tx.purchaseOrder.update({
        where: { id: dto.purchaseOrderId },
        data: { status: newStatus },
      });

      // Return updated purchase with correct item count
      return buildPurchaseResponse({
        ...purchase,
        itemCount: itemsToCreate.length,
      });
    });
  }

  async findAll(
    tenantId: string,
    role: string,
    userLocationId: string | null,
    query: PurchaseQuery,
  ): Promise<PaginatedPurchasesResponse> {
    if (role === 'STAFF') {
      throw new BadRequestException('STAFF no tiene acceso a compras');
    }

    const { page, limit, supplierId, locationId, dateFrom, dateTo, search } =
      query;
    const skip = (page - 1) * limit;

    const where: Prisma.PurchaseWhereInput = {
      tenantId,
      ...(supplierId ? { supplierId } : {}),
      ...(locationId ? { locationId } : {}),
      ...(dateFrom ? { date: { gte: dateFrom } } : {}),
      ...(dateTo ? { date: { lte: dateTo } } : {}),
      ...(search
        ? { supplier: { name: { contains: search, mode: 'insensitive' } } }
        : {}),
      ...(role === 'MANAGER' && userLocationId
        ? { locationId: userLocationId }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.purchase.findMany({
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
      this.prisma.purchase.count({ where }),
    ]);

    return {
      data: data.map((purchase) =>
        buildPurchaseResponse({
          ...purchase,
          itemCount: purchase.items.length,
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
  ): Promise<PurchaseDetailResponse> {
    if (role === 'STAFF') {
      throw new BadRequestException('STAFF no tiene acceso a compras');
    }

    const locationWhere =
      role === 'MANAGER' && userLocationId
        ? { locationId: userLocationId }
        : {};

    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;

        const purchase = await tx.purchase.findFirstOrThrow({
          where: { id, tenantId, ...locationWhere },
        });

        const [supplier, location, items] = await Promise.all([
          tx.supplier.findFirstOrThrow({
            where: { id: purchase.supplierId, tenantId },
          }),
          tx.location.findFirstOrThrow({
            where: { id: purchase.locationId },
          }),
          tx.purchaseItem.findMany({
            where: { purchaseId: id },
            include: {
              product: { select: { id: true, name: true, brand: true } },
            },
          }),
        ]);

        return {
          id: purchase.id,
          tenantId: purchase.tenantId,
          supplierId: purchase.supplierId,
          locationId: purchase.locationId,
          userId: purchase.userId,
          date: purchase.date,
          amount: toString(purchase.amount),
          notes: purchase.notes,
          supplierName: supplier.name,
          locationName: location.name,
          itemCount: items.length,
          createdAt: purchase.createdAt,
          items: items.map((item) => ({
            id: item.id,
            purchaseId: item.purchaseId,
            productId: item.productId,
            quantity: item.quantity,
            quantityReceived: item.quantityReceived,
            unitsPerPackage: item.unitsPerPackage,
            unitPrice: toString(item.unitPrice),
            tax: toString(item.tax),
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
      throw new NotFoundException(`Compra con ID ${id} no encontrada`);
    }
  }
}
