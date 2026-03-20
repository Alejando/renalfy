import { NotFoundException } from '@nestjs/common';
import { PublicTenantsService } from './public-tenants.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('../../generated/prisma/client.js', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({})),
}));

const mockTenant = {
  name: 'Clínica Centro',
  slug: 'clinica-centro',
  settings: {
    logoUrl: 'https://cdn.example.com/logo.png',
    coverUrl: null,
    primaryColor: '#1a73e8',
    secondaryColor: null,
    tagline: 'Tu salud, nuestra prioridad',
    description: null,
    phone: '3311223344',
    email: null,
    address: 'Av. Principal 123',
  },
};

function makePrisma(overrides: Record<string, unknown> = {}): PrismaService {
  return {
    tenant: {
      findUnique: jest.fn().mockResolvedValue(mockTenant),
    },
    ...overrides,
  } as unknown as PrismaService;
}

describe('PublicTenantsService', () => {
  describe('findBySlug', () => {
    it('should return tenant data with settings for a valid slug', async () => {
      const prisma = makePrisma();
      const service = new PublicTenantsService(prisma);

      const result = await service.findBySlug('clinica-centro');

      expect(result).toEqual(mockTenant);
      expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
        where: { slug: 'clinica-centro' },
        select: expect.objectContaining({
          name: true,
          slug: true,
          settings: expect.any(Object),
        }),
      });
    });

    it('should throw NotFoundException for an unknown slug', async () => {
      const prisma = makePrisma({
        tenant: { findUnique: jest.fn().mockResolvedValue(null) },
      });
      const service = new PublicTenantsService(prisma);

      await expect(service.findBySlug('no-existe')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return settings as null when tenant has no TenantSettings', async () => {
      const prisma = makePrisma({
        tenant: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ ...mockTenant, settings: null }),
        },
      });
      const service = new PublicTenantsService(prisma);

      const result = await service.findBySlug('clinica-centro');

      expect(result.settings).toBeNull();
    });
  });
});
