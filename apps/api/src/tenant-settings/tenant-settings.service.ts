import { Injectable, NotFoundException } from '@nestjs/common';
import type { UpdateTenantSettingsDto } from '@repo/types';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class TenantSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async update(dto: UpdateTenantSettingsDto, tenantId: string) {
    try {
      return await this.prisma.tenantSettings.upsert({
        where: { tenantId },
        update: dto,
        create: { tenantId, ...dto },
      });
    } catch (err: unknown) {
      const prismaError = err as { code?: string };
      if (prismaError.code === 'P2025') {
        throw new NotFoundException('Tenant not found');
      }
      throw err;
    }
  }
}
