import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CreateLocationDto, UpdateLocationDto } from '@repo/types';
import { PrismaService } from '../prisma/prisma.service.js';
import { StockService } from '../stock/stock.service.js';

@Injectable()
export class LocationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stockService: StockService,
  ) {}

  async create(dto: CreateLocationDto, tenantId: string) {
    return this.prisma.location.create({
      data: { ...dto, tenantId },
    });
  }

  async findAll(tenantId: string, locationId: string | null) {
    return this.prisma.location.findMany({
      where: {
        tenantId,
        ...(locationId !== null && { id: locationId }),
      },
    });
  }

  async findOne(id: string, tenantId: string, locationId: string | null) {
    const location = await this.prisma.location.findFirst({
      where: {
        id,
        tenantId,
        ...(locationId !== null && { id: locationId }),
      },
    });

    if (!location) {
      throw new NotFoundException('Location not found');
    }

    return location;
  }

  async update(id: string, dto: UpdateLocationDto, tenantId: string) {
    try {
      return await this.prisma.location.update({
        where: { id, tenantId },
        data: dto,
      });
    } catch (err: unknown) {
      const prismaError = err as { code?: string };
      if (prismaError.code === 'P2025') {
        throw new NotFoundException('Location not found');
      }
      throw err;
    }
  }

  async remove(id: string, tenantId: string) {
    const stockCheck = await this.stockService.hasStockInLocation(id, tenantId);
    if (stockCheck.hasStock) {
      throw new ConflictException({
        message:
          'Cannot delete location: products with stock must be relocated first',
        products: stockCheck.products,
      });
    }

    await this.prisma.locationStock.deleteMany({
      where: { locationId: id, tenantId, quantity: 0 },
    });

    try {
      return await this.prisma.location.update({
        where: { id, tenantId },
        data: { status: 'inactive' },
      });
    } catch (err: unknown) {
      const prismaError = err as { code?: string };
      if (prismaError.code === 'P2025') {
        throw new NotFoundException('Location not found');
      }
      throw err;
    }
  }
}
