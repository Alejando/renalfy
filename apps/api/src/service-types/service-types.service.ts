import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  CreateServiceTypeDto,
  UpdateServiceTypeDto,
  ServiceTypeResponse,
} from '@repo/types';
import { PrismaService } from '../prisma/prisma.service.js';

type PrismaServiceType = {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  price: { toNumber: () => number } | null;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
};

function mapServiceType(st: PrismaServiceType): ServiceTypeResponse {
  return {
    ...st,
    price: st.price?.toNumber() ?? null,
  };
}

@Injectable()
export class ServiceTypesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateServiceTypeDto,
    tenantId: string,
  ): Promise<ServiceTypeResponse> {
    const serviceType = await this.prisma.serviceType.create({
      data: { ...dto, tenantId },
    });
    return mapServiceType(serviceType as PrismaServiceType);
  }

  async findAll(tenantId: string): Promise<ServiceTypeResponse[]> {
    const results = await this.prisma.serviceType.findMany({
      where: { tenantId, status: 'ACTIVE' },
      orderBy: { name: 'asc' },
    });
    return (results as PrismaServiceType[]).map(mapServiceType);
  }

  async update(
    id: string,
    dto: UpdateServiceTypeDto,
    tenantId: string,
  ): Promise<ServiceTypeResponse> {
    try {
      const serviceType = await this.prisma.serviceType.update({
        where: { id, tenantId },
        data: dto,
      });
      return mapServiceType(serviceType as PrismaServiceType);
    } catch (err: unknown) {
      const prismaError = err as { code?: string };
      if (prismaError.code === 'P2025') {
        throw new NotFoundException('Service type not found');
      }
      throw err;
    }
  }

  async remove(id: string, tenantId: string): Promise<ServiceTypeResponse> {
    try {
      const serviceType = await this.prisma.serviceType.update({
        where: { id, tenantId },
        data: { status: 'INACTIVE' },
      });
      return mapServiceType(serviceType as PrismaServiceType);
    } catch (err: unknown) {
      const prismaError = err as { code?: string };
      if (prismaError.code === 'P2025') {
        throw new NotFoundException('Service type not found');
      }
      throw err;
    }
  }
}
