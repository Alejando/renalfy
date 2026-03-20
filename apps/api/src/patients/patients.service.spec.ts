import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PatientsService } from './patients.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

// Prevent Prisma from loading native binaries / connecting to DB during unit tests
jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('../../generated/prisma/client.js', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({})),
}));

const TENANT_ID = 'tenant-uuid-1';
const LOCATION_A = 'location-uuid-a';
const LOCATION_B = 'location-uuid-b';
const PATIENT_ID = 'patient-uuid-1';

const mockPatient = {
  id: PATIENT_ID,
  tenantId: TENANT_ID,
  locationId: LOCATION_A,
  name: 'María García López',
  birthDate: new Date('1980-05-15'),
  phone: '3312345678',
  mobile: null,
  address: 'Calle Reforma 100',
  notes: null,
  status: 'ACTIVE' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeTxMock(patientResult = mockPatient) {
  return {
    patient: { create: jest.fn().mockResolvedValue(patientResult) },
    patientConsent: {
      create: jest.fn().mockResolvedValue({ id: 'consent-1' }),
    },
  };
}

function makePrisma(
  overrides: Record<string, unknown> = {},
  txMockOverride?: ReturnType<typeof makeTxMock>,
): PrismaService {
  const txMock = txMockOverride ?? makeTxMock();
  return {
    patient: {
      create: jest.fn().mockResolvedValue(mockPatient),
      findMany: jest.fn().mockResolvedValue([mockPatient]),
      findFirst: jest.fn().mockResolvedValue(mockPatient),
      count: jest.fn().mockResolvedValue(1),
      update: jest.fn().mockResolvedValue(mockPatient),
    },
    patientConsent: {
      findMany: jest.fn().mockResolvedValue([{ patientId: PATIENT_ID }]),
      count: jest.fn().mockResolvedValue(1),
    },
    $transaction: jest
      .fn()
      .mockImplementation((fn: (tx: typeof txMock) => Promise<unknown>) =>
        fn(txMock),
      ),
    ...overrides,
  } as unknown as PrismaService;
}

describe('PatientsService', () => {
  describe('create', () => {
    it('should create patient and consent in a single transaction', async () => {
      const txMock = makeTxMock();
      const prisma = makePrisma({}, txMock);
      const service = new PatientsService(prisma);

      await service.create(
        {
          name: 'María García López',
          locationId: LOCATION_A,
          consent: { type: 'PRIVACY_NOTICE', version: 'v1.0' },
        },
        TENANT_ID,
        null,
      );

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(txMock.patient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_ID,
            locationId: LOCATION_A,
          }),
        }),
      );
      expect(txMock.patientConsent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_ID,
            patientId: PATIENT_ID,
            type: 'PRIVACY_NOTICE',
            version: 'v1.0',
          }),
        }),
      );
    });

    it('should return the created patient with hasConsent: true', async () => {
      const prisma = makePrisma();
      const service = new PatientsService(prisma);

      const result = await service.create(
        {
          name: 'María García López',
          locationId: LOCATION_A,
          consent: { type: 'PRIVACY_NOTICE', version: 'v1.0' },
        },
        TENANT_ID,
        null,
      );

      expect(result.hasConsent).toBe(true);
    });

    it('should throw ForbiddenException when MANAGER tries to create patient in another location', async () => {
      const prisma = makePrisma();
      const service = new PatientsService(prisma);

      await expect(
        service.create(
          {
            name: 'Otro Paciente',
            locationId: LOCATION_B,
            consent: { type: 'PRIVACY_NOTICE', version: 'v1.0' },
          },
          TENANT_ID,
          LOCATION_A, // user is from LOCATION_A
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow OWNER (null locationId) to create patient in any location', async () => {
      const prisma = makePrisma();
      const service = new PatientsService(prisma);

      await expect(
        service.create(
          {
            name: 'María García López',
            locationId: LOCATION_B,
            consent: { type: 'PRIVACY_NOTICE', version: 'v1.0' },
          },
          TENANT_ID,
          null, // OWNER has no locationId restriction
        ),
      ).resolves.not.toThrow();
    });
  });

  describe('findAll', () => {
    it('should return paginated ACTIVE patients for OWNER', async () => {
      const prisma = makePrisma();
      const service = new PatientsService(prisma);

      await service.findAll(TENANT_ID, null, { page: 1, limit: 20 });

      expect(prisma.patient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
            status: 'ACTIVE',
          }),
          skip: 0,
          take: 20,
        }),
      );
    });

    it('should filter by locationId for MANAGER/STAFF', async () => {
      const prisma = makePrisma();
      const service = new PatientsService(prisma);

      await service.findAll(TENANT_ID, LOCATION_A, { page: 1, limit: 20 });

      expect(prisma.patient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ locationId: LOCATION_A }),
        }),
      );
    });

    it('should apply name search filter case-insensitively', async () => {
      const prisma = makePrisma();
      const service = new PatientsService(prisma);

      await service.findAll(TENANT_ID, null, {
        page: 1,
        limit: 20,
        search: 'García',
      });

      expect(prisma.patient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: { contains: 'García', mode: 'insensitive' },
          }),
        }),
      );
    });

    it('should include deleted patients when include=deleted is set', async () => {
      const prisma = makePrisma();
      const service = new PatientsService(prisma);

      await service.findAll(TENANT_ID, null, {
        page: 1,
        limit: 20,
        include: 'deleted',
      });

      expect(prisma.patient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({ status: 'ACTIVE' }),
        }),
      );
    });

    it('should return paginated response shape', async () => {
      const prisma = makePrisma();
      const service = new PatientsService(prisma);

      const result = await service.findAll(TENANT_ID, null, {
        page: 2,
        limit: 10,
      });

      expect(result).toMatchObject({
        data: expect.any(Array),
        total: 1,
        page: 2,
        limit: 10,
      });
    });

    it('should include hasConsent in each patient', async () => {
      const prisma = makePrisma();
      const service = new PatientsService(prisma);

      const result = await service.findAll(TENANT_ID, null, {
        page: 1,
        limit: 20,
      });

      expect(result.data[0]).toHaveProperty('hasConsent');
    });
  });

  describe('findOne', () => {
    it('should return patient with hasConsent when it belongs to the tenant', async () => {
      const prisma = makePrisma();
      const service = new PatientsService(prisma);

      const result = await service.findOne(PATIENT_ID, TENANT_ID, null);

      expect(result).toMatchObject({ id: PATIENT_ID, hasConsent: true });
    });

    it('should filter by locationId for MANAGER/STAFF', async () => {
      const prisma = makePrisma();
      const service = new PatientsService(prisma);

      await service.findOne(PATIENT_ID, TENANT_ID, LOCATION_A);

      expect(prisma.patient.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ locationId: LOCATION_A }),
        }),
      );
    });

    it('should throw NotFoundException when patient does not belong to tenant/location', async () => {
      const prisma = makePrisma({
        patient: {
          findFirst: jest.fn().mockResolvedValue(null),
          findMany: jest.fn(),
          count: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
        },
        patientConsent: { findMany: jest.fn(), count: jest.fn() },
      });
      const service = new PatientsService(prisma);

      await expect(
        service.findOne(PATIENT_ID, TENANT_ID, LOCATION_B),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return patient even when status is DELETED (for audit)', async () => {
      const deletedPatient = { ...mockPatient, status: 'DELETED' as const };
      const prisma = makePrisma({
        patient: {
          findFirst: jest.fn().mockResolvedValue(deletedPatient),
          findMany: jest.fn(),
          count: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
        },
        patientConsent: {
          findMany: jest.fn(),
          count: jest.fn().mockResolvedValue(0),
        },
      });
      const service = new PatientsService(prisma);

      const result = await service.findOne(PATIENT_ID, TENANT_ID, null);

      expect(result.status).toBe('DELETED');
    });
  });

  describe('update', () => {
    it('should update only the allowed contact fields', async () => {
      const prisma = makePrisma();
      const service = new PatientsService(prisma);

      await service.update(
        PATIENT_ID,
        { phone: '3398765432', address: 'Nueva dirección' },
        TENANT_ID,
        null,
      );

      expect(prisma.patient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: PATIENT_ID,
            tenantId: TENANT_ID,
          }),
          data: { phone: '3398765432', address: 'Nueva dirección' },
        }),
      );
    });

    it('should filter by locationId for MANAGER/STAFF', async () => {
      const prisma = makePrisma();
      const service = new PatientsService(prisma);

      await service.update(
        PATIENT_ID,
        { phone: '3398765432' },
        TENANT_ID,
        LOCATION_A,
      );

      expect(prisma.patient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ locationId: LOCATION_A }),
        }),
      );
    });

    it('should throw NotFoundException when patient does not belong to tenant', async () => {
      const prisma = makePrisma({
        patient: {
          findFirst: jest.fn(),
          findMany: jest.fn(),
          count: jest.fn(),
          create: jest.fn(),
          update: jest.fn().mockRejectedValue({ code: 'P2025' }),
        },
        patientConsent: { findMany: jest.fn(), count: jest.fn() },
      });
      const service = new PatientsService(prisma);

      await expect(
        service.update(PATIENT_ID, { phone: 'X' }, TENANT_ID, null),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete by setting status to DELETED', async () => {
      const prisma = makePrisma();
      const service = new PatientsService(prisma);

      await service.remove(PATIENT_ID, TENANT_ID);

      expect(prisma.patient.update).toHaveBeenCalledWith({
        where: { id: PATIENT_ID, tenantId: TENANT_ID },
        data: { status: 'DELETED' },
      });
    });

    it('should throw NotFoundException when patient does not belong to tenant', async () => {
      const prisma = makePrisma({
        patient: {
          findFirst: jest.fn(),
          findMany: jest.fn(),
          count: jest.fn(),
          create: jest.fn(),
          update: jest.fn().mockRejectedValue({ code: 'P2025' }),
        },
        patientConsent: { findMany: jest.fn(), count: jest.fn() },
      });
      const service = new PatientsService(prisma);

      await expect(service.remove(PATIENT_ID, TENANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
