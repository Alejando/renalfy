import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CompaniesService } from './companies.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

// Prevent Prisma from loading native binaries / connecting to DB during unit tests
jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('../../generated/prisma/client.js', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({})),
}));

const TENANT_ID = 'tenant-uuid-1';
const COMPANY_ID = 'company-uuid-1';
const OTHER_TENANT_ID = 'tenant-uuid-2';

const mockCompany = {
  id: COMPANY_ID,
  tenantId: TENANT_ID,
  name: 'Empresa Prueba SA',
  taxId: 'EPR000101AAA',
  phone: '3312345678',
  email: 'contacto@empresaprueba.com',
  address: 'Av. Principal 100',
  contactPerson: 'Juan Pérez',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

function makePrisma(overrides: Record<string, unknown> = {}): PrismaService {
  return {
    company: {
      create: jest.fn().mockResolvedValue(mockCompany),
      findMany: jest.fn().mockResolvedValue([mockCompany]),
      // Default: null on first call (no duplicate), then mockCompany (found by id)
      findFirst: jest.fn().mockResolvedValue(mockCompany),
      count: jest.fn().mockResolvedValue(1),
      update: jest.fn().mockResolvedValue(mockCompany),
      delete: jest.fn().mockResolvedValue(mockCompany),
    },
    plan: {
      count: jest.fn().mockResolvedValue(0),
    },
    ...overrides,
  } as unknown as PrismaService;
}

// Returns a prisma mock where name-uniqueness check passes (returns null)
// and then returns mockCompany for subsequent lookups.
function makePrismaForCreate(): PrismaService {
  return {
    company: {
      create: jest.fn().mockResolvedValue(mockCompany),
      findMany: jest.fn().mockResolvedValue([mockCompany]),
      findFirst: jest.fn().mockResolvedValue(null), // no duplicate name
      count: jest.fn().mockResolvedValue(1),
      update: jest.fn().mockResolvedValue(mockCompany),
      delete: jest.fn().mockResolvedValue(mockCompany),
    },
    plan: {
      count: jest.fn().mockResolvedValue(0),
    },
  } as unknown as PrismaService;
}

describe('CompaniesService', () => {
  describe('create', () => {
    it('should create a company for the tenant', async () => {
      const prisma = makePrismaForCreate();
      const service = new CompaniesService(prisma);

      await service.create({ name: 'Empresa Prueba SA' }, TENANT_ID, 'OWNER');

      expect(prisma.company.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_ID,
            name: 'Empresa Prueba SA',
          }),
        }),
      );
    });

    it('should throw ForbiddenException for MANAGER role', async () => {
      const prisma = makePrismaForCreate();
      const service = new CompaniesService(prisma);

      await expect(
        service.create({ name: 'Empresa' }, TENANT_ID, 'MANAGER'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for STAFF role', async () => {
      const prisma = makePrismaForCreate();
      const service = new CompaniesService(prisma);

      await expect(
        service.create({ name: 'Empresa' }, TENANT_ID, 'STAFF'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException when name already exists for tenant', async () => {
      const prisma = makePrisma({
        company: {
          create: jest.fn(),
          findMany: jest.fn(),
          findFirst: jest.fn().mockResolvedValue(mockCompany),
          count: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
      });
      const service = new CompaniesService(prisma);

      await expect(
        service.create({ name: 'Empresa Prueba SA' }, TENANT_ID, 'OWNER'),
      ).rejects.toThrow(ConflictException);
    });

    it('should accept optional fields', async () => {
      const prisma = makePrismaForCreate();
      const service = new CompaniesService(prisma);

      await service.create(
        {
          name: 'Nueva Empresa',
          taxId: 'RFC123',
          phone: '3300000000',
          email: 'info@nueva.com',
          address: 'Calle 1',
          contactPerson: 'Ana López',
        },
        TENANT_ID,
        'ADMIN',
      );

      expect(prisma.company.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            taxId: 'RFC123',
            phone: '3300000000',
          }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated companies for the tenant', async () => {
      const prisma = makePrisma();
      const service = new CompaniesService(prisma);

      const result = await service.findAll(TENANT_ID, { page: 1, limit: 20 });

      expect(prisma.company.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT_ID }),
          skip: 0,
          take: 20,
        }),
      );
      expect(result).toMatchObject({
        data: expect.any(Array),
        total: 1,
        page: 1,
        limit: 20,
      });
    });

    it('should filter by search term across name and taxId', async () => {
      const prisma = makePrisma();
      const service = new CompaniesService(prisma);

      await service.findAll(TENANT_ID, { page: 1, limit: 20, search: 'EPR' });

      expect(prisma.company.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                name: expect.objectContaining({ contains: 'EPR' }),
              }),
            ]),
          }),
        }),
      );
    });

    it('should respect pagination (skip and take)', async () => {
      const prisma = makePrisma();
      const service = new CompaniesService(prisma);

      await service.findAll(TENANT_ID, { page: 3, limit: 10 });

      expect(prisma.company.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });

    it('should return total count', async () => {
      const prisma = makePrisma();
      const service = new CompaniesService(prisma);

      const result = await service.findAll(TENANT_ID, { page: 1, limit: 20 });

      expect(result.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return a single company by id', async () => {
      const prisma = makePrisma();
      const service = new CompaniesService(prisma);

      const result = await service.findOne(COMPANY_ID, TENANT_ID);

      expect(result).toMatchObject({ id: COMPANY_ID, tenantId: TENANT_ID });
    });

    it('should throw NotFoundException if id does not exist', async () => {
      const prisma = makePrisma({
        company: {
          create: jest.fn(),
          findMany: jest.fn(),
          findFirst: jest.fn().mockResolvedValue(null),
          count: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
      });
      const service = new CompaniesService(prisma);

      await expect(
        service.findOne('non-existent-id', TENANT_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if company belongs to a different tenant', async () => {
      const prisma = makePrisma({
        company: {
          create: jest.fn(),
          findMany: jest.fn(),
          findFirst: jest.fn().mockResolvedValue(null),
          count: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
      });
      const service = new CompaniesService(prisma);

      await expect(
        service.findOne(COMPANY_ID, OTHER_TENANT_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update allowed fields', async () => {
      const prisma = makePrisma({
        company: {
          create: jest.fn(),
          findMany: jest.fn(),
          // findFirst returns the existing company (existence check), then null for name uniqueness
          findFirst: jest
            .fn()
            .mockResolvedValueOnce(mockCompany) // existence check
            .mockResolvedValueOnce(null), // name uniqueness check
          count: jest.fn(),
          update: jest
            .fn()
            .mockResolvedValue({ ...mockCompany, phone: '3399999999' }),
          delete: jest.fn(),
        },
      });
      const service = new CompaniesService(prisma);

      const result = await service.update(
        COMPANY_ID,
        { phone: '3399999999' },
        TENANT_ID,
        'OWNER',
      );

      expect(result.phone).toBe('3399999999');
    });

    it('should throw NotFoundException if id not found', async () => {
      const prisma = makePrisma({
        company: {
          create: jest.fn(),
          findMany: jest.fn(),
          findFirst: jest.fn().mockResolvedValue(null),
          count: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
      });
      const service = new CompaniesService(prisma);

      await expect(
        service.update(COMPANY_ID, { phone: 'X' }, TENANT_ID, 'OWNER'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for MANAGER role', async () => {
      const prisma = makePrisma();
      const service = new CompaniesService(prisma);

      await expect(
        service.update(COMPANY_ID, { phone: 'X' }, TENANT_ID, 'MANAGER'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException when updating to an existing name in the tenant', async () => {
      const otherCompany = { ...mockCompany, id: 'other-company-id' };
      const prisma = makePrisma({
        company: {
          create: jest.fn(),
          findMany: jest.fn(),
          findFirst: jest
            .fn()
            .mockResolvedValueOnce(mockCompany) // existence check
            .mockResolvedValueOnce(otherCompany), // name uniqueness check finds another company
          count: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
      });
      const service = new CompaniesService(prisma);

      await expect(
        service.update(
          COMPANY_ID,
          { name: 'Empresa Prueba SA' },
          TENANT_ID,
          'ADMIN',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should delete company when no plans reference it', async () => {
      const prisma = makePrisma();
      const service = new CompaniesService(prisma);

      await service.remove(COMPANY_ID, TENANT_ID, 'OWNER');

      expect(prisma.company.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: COMPANY_ID }),
        }),
      );
    });

    it('should throw ConflictException when plans exist for the company', async () => {
      const prisma = makePrisma({
        plan: {
          count: jest.fn().mockResolvedValue(3),
        },
      });
      const service = new CompaniesService(prisma);

      await expect(
        service.remove(COMPANY_ID, TENANT_ID, 'OWNER'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if id not found', async () => {
      const prisma = makePrisma({
        company: {
          create: jest.fn(),
          findMany: jest.fn(),
          findFirst: jest.fn().mockResolvedValue(null),
          count: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
      });
      const service = new CompaniesService(prisma);

      await expect(
        service.remove(COMPANY_ID, TENANT_ID, 'OWNER'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for MANAGER role', async () => {
      const prisma = makePrisma();
      const service = new CompaniesService(prisma);

      await expect(
        service.remove(COMPANY_ID, TENANT_ID, 'MANAGER'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
