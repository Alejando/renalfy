import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateProductDto,
  UpdateProductDto,
  ProductQuery,
  ProductResponse,
  ProductDetailResponse,
  PaginatedProductsResponse,
} from '@repo/types';
import type { UserRole } from '@repo/types';
import { PrismaService } from '../prisma/prisma.service.js';

const OWNER_ADMIN_ROLES: UserRole[] = ['OWNER', 'ADMIN'];

type PrismaProduct = {
  id: string;
  tenantId: string;
  name: string;
  brand: string | null;
  category: string | null;
  description: string | null;
  purchasePrice: { toString(): string };
  salePrice: { toString(): string };
  packageQty: number;
  globalAlert: number;
  createdAt: Date;
  updatedAt: Date;
};

function buildProductResponse(product: PrismaProduct): ProductResponse {
  return {
    id: product.id,
    tenantId: product.tenantId,
    name: product.name,
    brand: product.brand,
    category: product.category,
    description: product.description,
    purchasePrice: product.purchasePrice.toString(),
    salePrice: product.salePrice.toString(),
    packageQty: product.packageQty,
    globalAlert: product.globalAlert,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

function assertOwnerAdmin(role: UserRole): void {
  if (!OWNER_ADMIN_ROLES.includes(role)) {
    throw new ForbiddenException('Only OWNER or ADMIN can manage products');
  }
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateProductDto,
    tenantId: string,
    role: UserRole,
  ): Promise<ProductResponse> {
    assertOwnerAdmin(role);

    const existing = await this.prisma.product.findFirst({
      where: { tenantId, name: dto.name },
    });
    if (existing) {
      throw new ConflictException(
        `A product named "${dto.name}" already exists in this tenant`,
      );
    }

    const product = await this.prisma.product.create({
      data: {
        tenantId,
        name: dto.name,
        brand: dto.brand ?? null,
        category: dto.category ?? null,
        description: dto.description ?? null,
        purchasePrice: dto.purchasePrice,
        salePrice: dto.salePrice,
        packageQty: dto.packageQty ?? 1,
        globalAlert: dto.globalAlert ?? 0,
      },
    });

    return buildProductResponse(product as unknown as PrismaProduct);
  }

  async findAll(
    tenantId: string,
    query: Partial<ProductQuery> & { page?: number; limit?: number },
  ): Promise<PaginatedProductsResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? 'name';
    const sortOrder = query.sortOrder ?? 'asc';

    const where: Record<string, unknown> = { tenantId };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { brand: { contains: query.search, mode: 'insensitive' } },
        { category: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.category) {
      where.category = query.category;
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: (products as unknown as PrismaProduct[]).map(buildProductResponse),
      total,
      page,
      limit,
    };
  }

  async findOne(
    id: string,
    tenantId: string,
    locationId?: string,
  ): Promise<ProductDetailResponse> {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    let stock: ProductDetailResponse['stock'] = null;

    if (locationId) {
      const stockRow = await this.prisma.locationStock.findFirst({
        where: { productId: id, locationId, tenantId },
      });

      if (stockRow) {
        const effectiveAlertLevel =
          stockRow.alertLevel > 0 ? stockRow.alertLevel : product.globalAlert;
        stock = {
          id: stockRow.id,
          quantity: stockRow.quantity,
          minStock: stockRow.minStock,
          alertLevel: stockRow.alertLevel,
          effectiveAlertLevel,
          isBelowAlert:
            effectiveAlertLevel > 0 && stockRow.quantity <= effectiveAlertLevel,
          packageQty: stockRow.packageQty,
          effectivePackageQty: stockRow.packageQty ?? product.packageQty,
        };
      }
    }

    const response = buildProductResponse(product as unknown as PrismaProduct);
    return { ...response, stock };
  }

  async findCategories(tenantId: string): Promise<string[]> {
    const rows = await this.prisma.product.findMany({
      where: { tenantId, category: { not: null } },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });

    return rows.map((r: { category: string | null }) => r.category as string);
  }

  async update(
    id: string,
    dto: UpdateProductDto,
    tenantId: string,
    role: UserRole,
  ): Promise<ProductResponse> {
    assertOwnerAdmin(role);

    const existing = await this.prisma.product.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundException('Product not found');
    }

    if (dto.name !== undefined) {
      const nameConflict = await this.prisma.product.findFirst({
        where: { tenantId, name: dto.name, id: { not: id } },
      });
      if (nameConflict) {
        throw new ConflictException(
          `A product named "${dto.name}" already exists in this tenant`,
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.brand !== undefined) updateData.brand = dto.brand;
    if (dto.category !== undefined) updateData.category = dto.category;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.purchasePrice !== undefined)
      updateData.purchasePrice = dto.purchasePrice;
    if (dto.salePrice !== undefined) updateData.salePrice = dto.salePrice;
    if (dto.packageQty !== undefined) updateData.packageQty = dto.packageQty;
    if (dto.globalAlert !== undefined) updateData.globalAlert = dto.globalAlert;

    const updated = await this.prisma.product.update({
      where: { id },
      data: updateData,
    });

    return buildProductResponse(updated as unknown as PrismaProduct);
  }

  async remove(id: string, tenantId: string, role: UserRole): Promise<void> {
    assertOwnerAdmin(role);

    const product = await this.prisma.product.findFirst({
      where: { id, tenantId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const stockRows = await this.prisma.locationStock.findMany({
      where: { productId: id, tenantId, quantity: { gt: 0 } },
    });
    if (stockRows.length > 0) {
      const locationIds = stockRows.map(
        (r: { locationId: string }) => r.locationId,
      );
      const locations = await this.prisma.location.findMany({
        where: { id: { in: locationIds } },
        select: { name: true },
      });
      const locationNames = locations.map((l: { name: string }) => l.name);
      throw new ConflictException({
        message: 'Cannot delete product: stock exists in locations',
        locations: locationNames,
      });
    }

    const [
      saleItemCount,
      purchaseItemCount,
      purchaseOrderItemCount,
      inventoryMovementItemCount,
    ] = await Promise.all([
      this.prisma.saleItem.count({ where: { productId: id } }),
      this.prisma.purchaseItem.count({ where: { productId: id } }),
      this.prisma.purchaseOrderItem.count({ where: { productId: id } }),
      this.prisma.inventoryMovementItem.count({ where: { productId: id } }),
    ]);

    if (
      saleItemCount > 0 ||
      purchaseItemCount > 0 ||
      purchaseOrderItemCount > 0 ||
      inventoryMovementItemCount > 0
    ) {
      throw new ConflictException(
        'Cannot delete product: it has historical transaction references',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
      await tx.product.delete({ where: { id } });
    });
  }
}
