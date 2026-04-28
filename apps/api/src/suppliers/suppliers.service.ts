import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateSupplierDto,
  CreateSupplierProductDto,
  PaginatedSuppliersResponse,
  SupplierProductResponse,
  SupplierQuery,
  SupplierResponse,
  UpdateSupplierDto,
  UpdateSupplierProductDto,
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

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    tenantId: string,
    query: SupplierQuery,
  ): Promise<PaginatedSuppliersResponse> {
    const { page, limit, search, includeInactive } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.SupplierWhereInput = {
      tenantId,
      ...(includeInactive ? {} : { status: 'ACTIVE' }),
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.supplier.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(tenantId: string, id: string): Promise<SupplierResponse> {
    try {
      return await this.prisma.supplier.findUniqueOrThrow({
        where: { id, tenantId },
      });
    } catch {
      throw new NotFoundException(`Proveedor con ID ${id} no encontrado`);
    }
  }

  async create(
    tenantId: string,
    dto: CreateSupplierDto,
  ): Promise<SupplierResponse> {
    const existing = await this.prisma.supplier.findFirst({
      where: { tenantId, name: dto.name },
    });
    if (existing) {
      throw new ConflictException('Ya existe un proveedor con este nombre');
    }

    return this.prisma.supplier.create({
      data: { ...dto, tenantId },
    });
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateSupplierDto,
  ): Promise<SupplierResponse> {
    if (dto.name) {
      const existing = await this.prisma.supplier.findFirst({
        where: {
          tenantId,
          name: dto.name,
          id: { not: id },
        },
      });
      if (existing) {
        throw new ConflictException('Ya existe un proveedor con este nombre');
      }
    }

    try {
      return await this.prisma.supplier.update({
        where: { id, tenantId },
        data: dto,
      });
    } catch {
      throw new NotFoundException(`Proveedor con ID ${id} no encontrado`);
    }
  }

  async addProduct(
    tenantId: string,
    supplierId: string,
    dto: CreateSupplierProductDto,
  ): Promise<SupplierProductResponse> {
    await this.prisma.product.findUniqueOrThrow({
      where: { id: dto.productId },
    });

    const existing = await this.prisma.supplierProduct.findFirst({
      where: {
        supplierId,
        productId: dto.productId,
        tenantId,
      },
    });
    if (existing) {
      throw new ConflictException(
        'Este producto ya está asociado a este proveedor',
      );
    }

    const created = await this.prisma.supplierProduct.create({
      data: {
        tenantId,
        supplierId,
        productId: dto.productId,
        price: dto.price,
        leadTimeDays: dto.leadTimeDays,
      },
      include: {
        product: { select: { id: true, name: true, brand: true } },
      },
    });

    return {
      id: created.id,
      tenantId: created.tenantId,
      supplierId: created.supplierId,
      productId: created.productId,
      price: toString(created.price),
      leadTimeDays: created.leadTimeDays,
      updatedAt: created.updatedAt,
      product: created.product,
    };
  }

  async updateProduct(
    tenantId: string,
    supplierId: string,
    productId: string,
    dto: UpdateSupplierProductDto,
  ): Promise<SupplierProductResponse> {
    try {
      const updated = await this.prisma.supplierProduct.update({
        where: {
          productId_supplierId: { productId, supplierId },
        },
        data: dto,
        include: {
          product: { select: { id: true, name: true, brand: true } },
        },
      });

      return {
        id: updated.id,
        tenantId: updated.tenantId,
        supplierId: updated.supplierId,
        productId: updated.productId,
        price: toString(updated.price),
        leadTimeDays: updated.leadTimeDays,
        updatedAt: updated.updatedAt,
        product: updated.product,
      };
    } catch {
      throw new NotFoundException('Asociación no encontrada');
    }
  }

  async removeProduct(
    tenantId: string,
    supplierId: string,
    productId: string,
  ): Promise<void> {
    try {
      await this.prisma.supplierProduct.delete({
        where: { productId_supplierId: { productId, supplierId } },
      });
    } catch {
      throw new NotFoundException('Asociación no encontrada');
    }
  }

  async findProductsBySupplier(
    tenantId: string,
    supplierId: string,
  ): Promise<SupplierProductResponse[]> {
    const items = await this.prisma.supplierProduct.findMany({
      where: { supplierId, tenantId },
      include: {
        product: { select: { id: true, name: true, brand: true } },
      },
    });

    return items.map((item) => ({
      id: item.id,
      tenantId: item.tenantId,
      supplierId: item.supplierId,
      productId: item.productId,
      price: toString(item.price),
      leadTimeDays: item.leadTimeDays,
      updatedAt: item.updatedAt,
      product: item.product,
    }));
  }

  async findSuppliersByProduct(
    tenantId: string,
    productId: string,
  ): Promise<SupplierProductResponse[]> {
    const items = await this.prisma.supplierProduct.findMany({
      where: { productId, tenantId },
      include: {
        product: { select: { id: true, name: true, brand: true } },
      },
    });

    return items.map((item) => ({
      id: item.id,
      tenantId: item.tenantId,
      supplierId: item.supplierId,
      productId: item.productId,
      price: toString(item.price),
      leadTimeDays: item.leadTimeDays,
      updatedAt: item.updatedAt,
      product: item.product,
    }));
  }
}
