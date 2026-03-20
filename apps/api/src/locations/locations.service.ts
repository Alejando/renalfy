import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreateLocationDto, UpdateLocationDto } from '@repo/types';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

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
