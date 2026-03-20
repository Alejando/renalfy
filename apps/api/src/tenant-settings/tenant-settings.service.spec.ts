import { NotFoundException } from '@nestjs/common';
import { TenantSettingsService } from './tenant-settings.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('../../generated/prisma/client.js', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({})),
}));

const TENANT_ID = 'tenant-uuid-1';

const mockSettings = {
  tenantId: TENANT_ID,
  logoUrl: null,
  coverUrl: null,
  primaryColor: '#1a73e8',
  secondaryColor: null,
  tagline: 'Tu salud, nuestra prioridad',
  description: null,
  phone: null,
  email: null,
  address: null,
  customDomain: null,
};

function makePrisma(overrides: Record<string, unknown> = {}): PrismaService {
  return {
    tenantSettings: {
      upsert: jest.fn().mockResolvedValue(mockSettings),
    },
    ...overrides,
  } as unknown as PrismaService;
}

describe('TenantSettingsService', () => {
  describe('update', () => {
    it('should upsert settings for the caller tenant', async () => {
      const prisma = makePrisma();
      const service = new TenantSettingsService(prisma);

      await service.update({ primaryColor: '#1a73e8' }, TENANT_ID);

      expect(prisma.tenantSettings.upsert).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID },
        update: { primaryColor: '#1a73e8' },
        create: { tenantId: TENANT_ID, primaryColor: '#1a73e8' },
      });
    });

    it('should return the updated settings', async () => {
      const prisma = makePrisma();
      const service = new TenantSettingsService(prisma);

      const result = await service.update(
        { tagline: 'Nueva tagline' },
        TENANT_ID,
      );

      expect(result).toEqual(mockSettings);
    });

    it('should throw NotFoundException when upsert fails with P2025', async () => {
      const prisma = makePrisma({
        tenantSettings: {
          upsert: jest.fn().mockRejectedValue({ code: 'P2025' }),
        },
      });
      const service = new TenantSettingsService(prisma);

      await expect(service.update({ tagline: 'x' }, TENANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
