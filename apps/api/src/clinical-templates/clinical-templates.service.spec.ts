import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ClinicalTemplatesService } from './clinical-templates.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

// Prevent Prisma from loading native binaries / connecting to DB during unit tests
jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('../../generated/prisma/client.js', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({})),
}));

const TENANT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const SERVICE_TYPE_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
const TEMPLATE_ID = '33333333-3333-3333-3333-333333333333';

const mockTemplate = {
  id: TEMPLATE_ID,
  tenantId: TENANT_ID,
  serviceTypeId: SERVICE_TYPE_ID,
  fields: [
    { key: 'weight', label: 'Peso (kg)', type: 'number', required: true },
  ],
  updatedAt: new Date(),
};

function makePrisma(overrides: Record<string, unknown> = {}): PrismaService {
  return {
    clinicalTemplate: {
      upsert: jest.fn().mockResolvedValue(mockTemplate),
      findFirst: jest.fn().mockResolvedValue(mockTemplate),
      findMany: jest.fn().mockResolvedValue([mockTemplate]),
    },
    serviceType: {
      findFirst: jest.fn().mockResolvedValue({
        id: SERVICE_TYPE_ID,
        status: 'ACTIVE',
      }),
    },
    ...overrides,
  } as unknown as PrismaService;
}

describe('ClinicalTemplatesService', () => {
  describe('upsert', () => {
    it('should create template if none exists', async () => {
      const prisma = makePrisma();
      const service = new ClinicalTemplatesService(prisma);

      const result = await service.upsert(
        {
          serviceTypeId: SERVICE_TYPE_ID,
          fields: [
            { key: 'weight', label: 'Peso', type: 'number', required: true },
          ],
        },
        TENANT_ID,
      );

      expect(prisma.clinicalTemplate.upsert).toHaveBeenCalled();
      expect(result.serviceTypeId).toBe(SERVICE_TYPE_ID);
    });

    it('should update existing template (upsert)', async () => {
      const updatedTemplate = {
        ...mockTemplate,
        fields: [
          { key: 'bloodPressure', label: 'TA', type: 'text', required: true },
        ],
      };
      const prisma = makePrisma({
        clinicalTemplate: {
          upsert: jest.fn().mockResolvedValue(updatedTemplate),
          findFirst: jest.fn().mockResolvedValue(mockTemplate),
          findMany: jest.fn().mockResolvedValue([mockTemplate]),
        },
      });
      const service = new ClinicalTemplatesService(prisma);

      const result = await service.upsert(
        {
          serviceTypeId: SERVICE_TYPE_ID,
          fields: [
            { key: 'bloodPressure', label: 'TA', type: 'text', required: true },
          ],
        },
        TENANT_ID,
      );

      expect(prisma.clinicalTemplate.upsert).toHaveBeenCalled();
      expect((result.fields as { key: string }[])[0].key).toBe('bloodPressure');
    });

    it('should throw NotFoundException if serviceType does not exist in tenant', async () => {
      const prisma = makePrisma({
        serviceType: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
      });
      const service = new ClinicalTemplatesService(prisma);

      await expect(
        service.upsert(
          {
            serviceTypeId: SERVICE_TYPE_ID,
            fields: [
              { key: 'weight', label: 'Peso', type: 'number', required: true },
            ],
          },
          TENANT_ID,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if serviceType is INACTIVE', async () => {
      const prisma = makePrisma({
        serviceType: {
          findFirst: jest.fn().mockResolvedValue({
            id: SERVICE_TYPE_ID,
            status: 'INACTIVE',
          }),
        },
      });
      const service = new ClinicalTemplatesService(prisma);

      await expect(
        service.upsert(
          {
            serviceTypeId: SERVICE_TYPE_ID,
            fields: [
              { key: 'weight', label: 'Peso', type: 'number', required: true },
            ],
          },
          TENANT_ID,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return all templates for tenant', async () => {
      const prisma = makePrisma();
      const service = new ClinicalTemplatesService(prisma);

      const result = await service.findAll(TENANT_ID, undefined);

      expect(prisma.clinicalTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT_ID }),
        }),
      );
      expect(result).toHaveLength(1);
    });

    it('should filter by serviceTypeId when provided', async () => {
      const prisma = makePrisma();
      const service = new ClinicalTemplatesService(prisma);

      await service.findAll(TENANT_ID, SERVICE_TYPE_ID);

      expect(prisma.clinicalTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
            serviceTypeId: SERVICE_TYPE_ID,
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return template by id', async () => {
      const prisma = makePrisma();
      const service = new ClinicalTemplatesService(prisma);

      const result = await service.findOne(TEMPLATE_ID, TENANT_ID);

      expect(prisma.clinicalTemplate.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: TEMPLATE_ID,
            tenantId: TENANT_ID,
          }),
        }),
      );
      expect(result.id).toBe(TEMPLATE_ID);
    });

    it('should throw NotFoundException if template not found', async () => {
      const prisma = makePrisma({
        clinicalTemplate: {
          upsert: jest.fn(),
          findFirst: jest.fn().mockResolvedValue(null),
          findMany: jest.fn().mockResolvedValue([]),
        },
      });
      const service = new ClinicalTemplatesService(prisma);

      await expect(service.findOne(TEMPLATE_ID, TENANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
