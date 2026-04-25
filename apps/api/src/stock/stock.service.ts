import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type {
  UpsertLocationStockDto,
  StockQuery,
  LocationStockResponse,
  PaginatedStockResponse,
  BulkStockRequestDto,
  BulkStockResponse,
  StockSummaryQuery,
  PaginatedStockSummaryResponse,
} from '@repo/types';
import type { UserRole } from '@repo/types';
import { PrismaService } from '../prisma/prisma.service.js';

const OWNER_ADMIN_ROLES: UserRole[] = ['OWNER', 'ADMIN'];

type PrismaLocationStock = {
  id: string;
  tenantId: string;
  locationId: string;
  productId: string;
  quantity: number;
  minStock: number;
  alertLevel: number;
  packageQty: number | null;
};

type PrismaProduct = {
  id: string;
  tenantId: string;
  name: string;
  brand: string | null;
  packageQty: number;
  globalAlert: number;
  category?: { name: string } | null;
};

function buildLocationStockResponse(
  row: PrismaLocationStock,
  product: PrismaProduct,
  locationName: string | null = null,
): LocationStockResponse {
  const effectiveAlertLevel =
    row.alertLevel > 0 ? row.alertLevel : product.globalAlert;
  return {
    id: row.id,
    tenantId: row.tenantId,
    locationId: row.locationId,
    productId: row.productId,
    quantity: row.quantity,
    minStock: row.minStock,
    alertLevel: row.alertLevel,
    packageQty: row.packageQty,
    productName: product.name,
    productBrand: product.brand,
    productCategory: product.category?.name ?? null,
    locationName,
    effectiveAlertLevel,
    isBelowAlert:
      effectiveAlertLevel > 0 && row.quantity <= effectiveAlertLevel,
    effectivePackageQty: row.packageQty ?? product.packageQty,
  };
}

function assertOwnerAdmin(role: UserRole): void {
  if (!OWNER_ADMIN_ROLES.includes(role)) {
    throw new ForbiddenException('Only OWNER or ADMIN can perform this action');
  }
}

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    tenantId: string,
    role: UserRole,
    userLocationId: string | null,
    query: StockQuery,
  ): Promise<PaginatedStockResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    if (['MANAGER', 'STAFF'].includes(role) && !userLocationId) {
      throw new BadRequestException('MANAGER/STAFF must have a locationId');
    }

    const scopedLocationId = OWNER_ADMIN_ROLES.includes(role)
      ? query.locationId
      : userLocationId;

    const where: Record<string, unknown> = { tenantId };
    if (scopedLocationId) {
      where.locationId = scopedLocationId;
    }
    if (query.search) {
      where.product = {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { brand: { contains: query.search, mode: 'insensitive' } },
          {
            category: { name: { contains: query.search, mode: 'insensitive' } },
          },
        ],
      };
    }

    const [rows, total] = await Promise.all([
      this.prisma.locationStock.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              brand: true,
              category: { select: { name: true } },
              packageQty: true,
              globalAlert: true,
              tenantId: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { product: { name: 'asc' } },
      }),
      this.prisma.locationStock.count({ where }),
    ]);

    const locationIds = [
      ...new Set(rows.map((r: { locationId: string }) => r.locationId)),
    ];
    const locations = await this.prisma.location.findMany({
      where: { id: { in: locationIds } },
      select: { id: true, name: true },
    });
    const locationMap = new Map(
      locations.map((l: { id: string; name: string }) => [l.id, l.name]),
    );

    let data: LocationStockResponse[] = rows.map(
      (row: PrismaLocationStock & { product: PrismaProduct }) =>
        buildLocationStockResponse(
          row,
          row.product,
          locationMap.get(row.locationId) ?? null,
        ),
    );

    if (query.onlyLowStock) {
      data = data.filter((item) => item.isBelowAlert);
    }

    return { data, total, page, limit };
  }

  async findOne(
    id: string,
    tenantId: string,
    role: UserRole,
    userLocationId: string | null,
  ): Promise<LocationStockResponse> {
    const row = await this.prisma.locationStock.findFirst({
      where: { id, tenantId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            brand: true,
            category: true,
            packageQty: true,
            globalAlert: true,
            tenantId: true,
          },
        },
      },
    });

    if (!row) {
      throw new NotFoundException('Stock record not found');
    }

    if (
      ['MANAGER', 'STAFF'].includes(role) &&
      row.locationId !== userLocationId
    ) {
      throw new NotFoundException('Stock record not found');
    }

    const location = row.locationId
      ? await this.prisma.location.findFirst({
          where: { id: row.locationId },
          select: { name: true },
        })
      : null;

    return buildLocationStockResponse(
      row as unknown as PrismaLocationStock,
      (row as unknown as { product: PrismaProduct }).product,
      location?.name ?? null,
    );
  }

  async upsertByLocation(
    dto: UpsertLocationStockDto,
    tenantId: string,
    role: UserRole,
    userLocationId: string | null,
  ): Promise<LocationStockResponse> {
    if (
      ['MANAGER', 'STAFF'].includes(role) &&
      dto.locationId !== userLocationId
    ) {
      throw new ForbiddenException(
        'MANAGER can only configure thresholds for their own location',
      );
    }

    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, tenantId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const location = await this.prisma.location.findFirst({
      where: { id: dto.locationId, tenantId },
    });
    if (!location) {
      throw new NotFoundException('Location not found');
    }

    const row = await this.prisma.locationStock.upsert({
      where: {
        locationId_productId: {
          locationId: dto.locationId,
          productId: dto.productId,
        },
      },
      create: {
        tenantId,
        locationId: dto.locationId,
        productId: dto.productId,
        minStock: dto.minStock ?? 0,
        alertLevel: dto.alertLevel ?? 0,
        packageQty: dto.packageQty ?? null,
      },
      update: {
        minStock: dto.minStock ?? 0,
        alertLevel: dto.alertLevel ?? 0,
        packageQty: dto.packageQty ?? null,
      },
    });

    return buildLocationStockResponse(
      row as unknown as PrismaLocationStock,
      product as unknown as PrismaProduct,
      location.name,
    );
  }

  async adjustQuantity(
    id: string,
    adjustmentType: 'SET' | 'DELTA',
    value: number,
    tenantId: string,
    role: UserRole,
  ): Promise<LocationStockResponse> {
    assertOwnerAdmin(role);

    const row = await this.prisma.locationStock.findFirst({
      where: { id, tenantId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            brand: true,
            category: true,
            packageQty: true,
            globalAlert: true,
            tenantId: true,
          },
        },
      },
    });

    if (!row) {
      throw new NotFoundException('Stock record not found');
    }

    let newQuantity: number;
    if (adjustmentType === 'SET') {
      newQuantity = value;
    } else {
      newQuantity = row.quantity + value;
    }

    if (newQuantity < 0) {
      throw new UnprocessableEntityException({
        message: 'Adjustment would result in negative quantity',
        currentQuantity: row.quantity,
      });
    }

    const updated = await this.prisma.locationStock.update({
      where: { id },
      data: { quantity: newQuantity },
    });

    const location = await this.prisma.location.findFirst({
      where: { id: row.locationId },
      select: { name: true },
    });

    return buildLocationStockResponse(
      updated as unknown as PrismaLocationStock,
      (row as unknown as { product: PrismaProduct }).product,
      location?.name ?? null,
    );
  }

  async bulkInit(
    dto: BulkStockRequestDto,
    tenantId: string,
    role: UserRole,
  ): Promise<BulkStockResponse> {
    assertOwnerAdmin(role);

    let created = 0;
    let updated = 0;
    const errors: BulkStockResponse['errors'] = [];

    for (let i = 0; i < dto.items.length; i++) {
      const item = dto.items[i];

      if (item.quantity < 0) {
        errors.push({
          index: i,
          productId: item.productId,
          message: 'Quantity must be >= 0',
        });
        continue;
      }

      const product = await this.prisma.product.findFirst({
        where: { id: item.productId, tenantId },
      });
      if (!product) {
        errors.push({
          index: i,
          productId: item.productId,
          message: 'Product not found',
        });
        continue;
      }

      const existing = await this.prisma.locationStock.findFirst({
        where: {
          locationId: item.locationId,
          productId: item.productId,
          tenantId,
        },
      });

      if (existing) {
        await this.prisma.locationStock.update({
          where: { id: existing.id },
          data: { quantity: item.quantity },
        });
        updated++;
      } else {
        await this.prisma.locationStock.create({
          data: {
            tenantId,
            locationId: item.locationId,
            productId: item.productId,
            quantity: item.quantity,
            minStock: item.minStock ?? 0,
            alertLevel: item.alertLevel ?? 0,
          },
        });
        created++;
      }
    }

    return { created, updated, errors };
  }

  async getSummary(
    tenantId: string,
    query: StockSummaryQuery,
  ): Promise<PaginatedStockSummaryResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Record<string, unknown> = { tenantId };

    const rows = await this.prisma.locationStock.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            brand: true,
            category: true,
            packageQty: true,
            globalAlert: true,
            tenantId: true,
          },
        },
      },
    });

    const locationIds = [
      ...new Set(rows.map((r: { locationId: string }) => r.locationId)),
    ];
    const locations = await this.prisma.location.findMany({
      where: { id: { in: locationIds } },
      select: { id: true, name: true },
    });
    const locationMap = new Map(
      locations.map((l: { id: string; name: string }) => [l.id, l.name]),
    );

    const grouped = new Map<
      string,
      {
        productId: string;
        productName: string;
        totalQuantity: number;
        locations: Array<{
          locationId: string;
          locationName: string;
          quantity: number;
          alertLevel: number;
          effectiveAlertLevel: number;
          isBelowAlert: boolean;
        }>;
      }
    >();

    for (const row of rows as Array<
      PrismaLocationStock & { product: PrismaProduct }
    >) {
      const effectiveAlertLevel =
        row.alertLevel > 0 ? row.alertLevel : row.product.globalAlert;
      const isBelowAlert =
        effectiveAlertLevel > 0 && row.quantity <= effectiveAlertLevel;

      if (!grouped.has(row.productId)) {
        grouped.set(row.productId, {
          productId: row.productId,
          productName: row.product.name,
          totalQuantity: 0,
          locations: [],
        });
      }

      const entry = grouped.get(row.productId)!;
      entry.totalQuantity += row.quantity;
      entry.locations.push({
        locationId: row.locationId,
        locationName: locationMap.get(row.locationId) ?? 'Unknown',
        quantity: row.quantity,
        alertLevel: row.alertLevel,
        effectiveAlertLevel,
        isBelowAlert,
      });
    }

    let data = Array.from(grouped.values()).map((entry) => ({
      productId: entry.productId,
      productName: entry.productName,
      totalQuantity: entry.totalQuantity,
      isAnyLocationBelowAlert: entry.locations.some((l) => l.isBelowAlert),
      locationBreakdown: entry.locations,
    }));

    if (query.isAnyLocationBelowAlert) {
      data = data.filter((item) => item.isAnyLocationBelowAlert);
    }

    const total = data.length;
    const pagedData = data.slice((page - 1) * limit, page * limit);

    return { data: pagedData, total, page, limit };
  }

  async hasStockInLocation(
    locationId: string,
    tenantId: string,
  ): Promise<{
    hasStock: boolean;
    products: Array<{
      productId: string;
      productName: string;
      quantity: number;
    }>;
  }> {
    const rows = await this.prisma.locationStock.findMany({
      where: { locationId, tenantId, quantity: { gt: 0 } },
      include: { product: { select: { name: true } } },
    });

    return {
      hasStock: rows.length > 0,
      products: rows.map(
        (r: {
          productId: string;
          product: { name: string };
          quantity: number;
        }) => ({
          productId: r.productId,
          productName: r.product.name,
          quantity: r.quantity,
        }),
      ),
    };
  }
}
