import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

const TENANT_PUBLIC_SELECT = {
  name: true,
  slug: true,
  settings: {
    select: {
      logoUrl: true,
      coverUrl: true,
      primaryColor: true,
      secondaryColor: true,
      tagline: true,
      description: true,
      phone: true,
      email: true,
      address: true,
    },
  },
} as const;

@Injectable()
export class PublicTenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async findBySlug(slug: string) {
    // First find the tenant (Tenant table has no RLS — accessible without context)
    const tenantBase = await this.prisma.tenant.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!tenantBase) {
      throw new NotFoundException('Tenant not found');
    }

    // Use a transaction so set_config (is_local=true) and the settings query
    // run on the same connection. is_local=true clears the context when the
    // transaction ends, avoiding connection pool contamination.
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantBase.id}, true)`;

      const tenant = await tx.tenant.findUnique({
        where: { slug },
        select: TENANT_PUBLIC_SELECT,
      });

      // tenant always exists here — we just found it above

      return tenant!;
    });
  }
}
