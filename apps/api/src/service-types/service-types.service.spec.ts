import { NotFoundException } from '@nestjs/common';
import { ServiceTypesService } from './service-types.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

// Prevent Prisma from loading native binaries / connecting to DB during unit tests
jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('../../generated/prisma/client.js', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({})),
}));

const TENANT_ID = 'tenant-uuid-1';
const OTHER_TENANT_ID = 'tenant-uuid-2';
const SERVICE_TYPE_ID = 'service-type-uuid-1';

const mockServiceType = {
  id: SERVICE_TYPE_ID,
  tenantId: TENANT_ID,
  name: 'Hemodiálisis estándar',
  description: 'Sesión de 4 horas',
  price: { toNumber: () => 1500 },
  status: 'ACTIVE' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makePrisma(overrides: Record<string, unknown> = {}): PrismaService {
  return {
    serviceType: {
      create: jest.fn().mockResolvedValue(mockServiceType),
      findMany: jest.fn().mockResolvedValue([mockServiceType]),
      update: jest.fn().mockResolvedValue(mockServiceType),
    },
    ...overrides,
  } as unknown as PrismaService;
}

describe('ServiceTypesService', () => {
  describe('create', () => {
    it('should create a service type with the tenantId from the caller', async () => {
      const prisma = makePrisma();
      const service = new ServiceTypesService(prisma);

      await service.create(
        {
          name: 'Hemodiálisis estándar',
          description: 'Sesión de 4 horas',
          price: 1500,
        },
        TENANT_ID,
      );

      expect(prisma.serviceType.create).toHaveBeenCalledWith({
        data: {
          name: 'Hemodiálisis estándar',
          description: 'Sesión de 4 horas',
          price: 1500,
          tenantId: TENANT_ID,
        },
      });
    });

    it('should return the created service type with price as number', async () => {
      const prisma = makePrisma();
      const service = new ServiceTypesService(prisma);

      const result = await service.create(
        { name: 'Hemodiálisis estándar' },
        TENANT_ID,
      );

      expect(result).toMatchObject({
        id: SERVICE_TYPE_ID,
        tenantId: TENANT_ID,
        name: 'Hemodiálisis estándar',
        price: 1500,
      });
    });
  });

  describe('findAll', () => {
    it('should return only ACTIVE service types of the tenant', async () => {
      const prisma = makePrisma();
      const service = new ServiceTypesService(prisma);

      await service.findAll(TENANT_ID);

      expect(prisma.serviceType.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, status: 'ACTIVE' },
        orderBy: { name: 'asc' },
      });
    });

    it('should map Decimal price to number', async () => {
      const prisma = makePrisma();
      const service = new ServiceTypesService(prisma);

      const results = await service.findAll(TENANT_ID);

      expect(results[0]).toMatchObject({ price: 1500 });
    });
  });

  describe('update', () => {
    it('should update the service type when it belongs to the tenant', async () => {
      const prisma = makePrisma();
      const service = new ServiceTypesService(prisma);

      await service.update(
        SERVICE_TYPE_ID,
        { name: 'Nuevo nombre' },
        TENANT_ID,
      );

      expect(prisma.serviceType.update).toHaveBeenCalledWith({
        where: { id: SERVICE_TYPE_ID, tenantId: TENANT_ID },
        data: { name: 'Nuevo nombre' },
      });
    });

    it('should throw NotFoundException when service type does not belong to tenant', async () => {
      const prisma = makePrisma({
        serviceType: {
          create: jest.fn(),
          findMany: jest.fn(),
          update: jest.fn().mockRejectedValue({ code: 'P2025' }),
        },
      });
      const service = new ServiceTypesService(prisma);

      await expect(
        service.update(SERVICE_TYPE_ID, { name: 'X' }, OTHER_TENANT_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete by setting status to INACTIVE', async () => {
      const prisma = makePrisma();
      const service = new ServiceTypesService(prisma);

      await service.remove(SERVICE_TYPE_ID, TENANT_ID);

      expect(prisma.serviceType.update).toHaveBeenCalledWith({
        where: { id: SERVICE_TYPE_ID, tenantId: TENANT_ID },
        data: { status: 'INACTIVE' },
      });
    });

    it('should throw NotFoundException when service type does not belong to tenant', async () => {
      const prisma = makePrisma({
        serviceType: {
          create: jest.fn(),
          findMany: jest.fn(),
          update: jest.fn().mockRejectedValue({ code: 'P2025' }),
        },
      });
      const service = new ServiceTypesService(prisma);

      await expect(
        service.remove(SERVICE_TYPE_ID, OTHER_TENANT_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
