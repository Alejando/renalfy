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
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      select: TENANT_PUBLIC_SELECT,
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }
}
