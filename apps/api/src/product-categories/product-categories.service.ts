import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  ProductCategoryResponse,
  CreateProductCategoryDto,
} from '@repo/types';
import { PrismaService } from '../prisma/prisma.service.js';

type PrismaCategory = {
  id: string;
  tenantId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

function buildCategoryResponse(
  category: PrismaCategory,
): ProductCategoryResponse {
  return {
    id: category.id,
    tenantId: category.tenantId,
    name: category.name,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}

@Injectable()
export class ProductCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    tenantId: string,
    query: { page?: number; limit?: number; search?: string },
  ): Promise<{
    data: ProductCategoryResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Record<string, unknown> = { tenantId };
    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    const [categories, total] = await Promise.all([
      this.prisma.productCategory.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.productCategory.count({ where }),
    ]);

    return {
      data: (categories as unknown as PrismaCategory[]).map(
        buildCategoryResponse,
      ),
      total,
      page,
      limit,
    };
  }

  async create(
    dto: CreateProductCategoryDto,
    tenantId: string,
  ): Promise<ProductCategoryResponse> {
    const existing = await this.prisma.productCategory.findFirst({
      where: { tenantId, name: dto.name },
    });
    if (existing) {
      throw new ConflictException(
        `A category named "${dto.name}" already exists in this tenant`,
      );
    }

    const category = await this.prisma.productCategory.create({
      data: { tenantId, name: dto.name },
    });

    return buildCategoryResponse(category as unknown as PrismaCategory);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const category = await this.prisma.productCategory.findFirst({
      where: { id, tenantId },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const productCount = await this.prisma.product.count({
      where: { categoryId: id, tenantId },
    });
    if (productCount > 0) {
      throw new ConflictException(
        'Cannot delete category: it has products assigned',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
      await tx.productCategory.delete({ where: { id } });
    });
  }
}
