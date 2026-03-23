import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PlansService } from './plans.service.js';
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
const COMPANY_ID = 'company-uuid-1';
const SERVICE_TYPE_ID = 'service-type-uuid-1';
const PLAN_ID = 'plan-uuid-1';
const USER_ID = 'user-uuid-1';

const mockPatient = {
  id: PATIENT_ID,
  tenantId: TENANT_ID,
  locationId: LOCATION_A,
  name: 'María García López',
};

const mockCompany = {
  id: COMPANY_ID,
  tenantId: TENANT_ID,
  name: 'Empresa Prueba SA',
};

const mockServiceType = {
  id: SERVICE_TYPE_ID,
  tenantId: TENANT_ID,
  name: 'Hemodiálisis',
};

const mockPlan = {
  id: PLAN_ID,
  tenantId: TENANT_ID,
  locationId: LOCATION_A,
  patientId: PATIENT_ID,
  companyId: COMPANY_ID,
  serviceTypeId: SERVICE_TYPE_ID,
  userId: USER_ID,
  startDate: new Date('2024-01-01'),
  plannedSessions: 12,
  usedSessions: 0,
  amount: '5000.00',
  status: 'ACTIVE' as const,
  notes: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  patient: mockPatient,
  company: mockCompany,
  serviceType: mockServiceType,
};

function makeTxMock(planResult = mockPlan) {
  return {
    plan: {
      findFirst: jest.fn().mockResolvedValue(null), // no duplicate ACTIVE plan
      create: jest.fn().mockResolvedValue(planResult),
    },
  };
}

function makePrisma(overrides: Record<string, unknown> = {}): PrismaService {
  const txMock = makeTxMock();
  return {
    patient: {
      findFirst: jest.fn().mockResolvedValue(mockPatient),
    },
    company: {
      findFirst: jest.fn().mockResolvedValue(mockCompany),
    },
    serviceType: {
      findFirst: jest.fn().mockResolvedValue(mockServiceType),
    },
    plan: {
      create: jest.fn().mockResolvedValue(mockPlan),
      findMany: jest.fn().mockResolvedValue([mockPlan]),
      findFirst: jest.fn().mockResolvedValue(mockPlan),
      count: jest.fn().mockResolvedValue(1),
      update: jest.fn().mockResolvedValue(mockPlan),
      delete: jest.fn().mockResolvedValue(mockPlan),
    },
    $transaction: jest
      .fn()
      .mockImplementation((fn: (tx: typeof txMock) => Promise<unknown>) =>
        fn(txMock),
      ),
    ...overrides,
  } as unknown as PrismaService;
}

describe('PlansService', () => {
  describe('create', () => {
    it('should create a plan for the tenant', async () => {
      const prisma = makePrisma();
      const service = new PlansService(prisma);

      await service.create(
        {
          patientId: PATIENT_ID,
          locationId: LOCATION_A,
          startDate: new Date('2024-01-01'),
          plannedSessions: 12,
          amount: '5000.00',
        },
        TENANT_ID,
        USER_ID,
        null,
      );

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should auto-fill locationId from user when MANAGER/STAFF', async () => {
      const prisma = makePrisma();
      const txMock = makeTxMock();
      (prisma.$transaction as jest.Mock).mockImplementation(
        (fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock),
      );
      const service = new PlansService(prisma);

      await service.create(
        {
          patientId: PATIENT_ID,
          startDate: new Date('2024-01-01'),
          plannedSessions: 12,
          amount: '5000.00',
        },
        TENANT_ID,
        USER_ID,
        LOCATION_A, // MANAGER locationId
      );

      expect(txMock.plan.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ locationId: LOCATION_A }),
        }),
      );
    });

    it('should throw NotFoundException if patient does not exist', async () => {
      const prisma = makePrisma({
        patient: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
      });
      const service = new PlansService(prisma);

      await expect(
        service.create(
          {
            patientId: PATIENT_ID,
            locationId: LOCATION_A,
            startDate: new Date('2024-01-01'),
            plannedSessions: 12,
            amount: '5000.00',
          },
          TENANT_ID,
          USER_ID,
          null,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if patient belongs to different location for MANAGER/STAFF', async () => {
      const prisma = makePrisma({
        patient: {
          findFirst: jest.fn().mockResolvedValue({
            ...mockPatient,
            locationId: LOCATION_B, // patient is in different location
          }),
        },
      });
      const service = new PlansService(prisma);

      await expect(
        service.create(
          {
            patientId: PATIENT_ID,
            startDate: new Date('2024-01-01'),
            plannedSessions: 12,
            amount: '5000.00',
          },
          TENANT_ID,
          USER_ID,
          LOCATION_A, // MANAGER is in location A
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if company does not exist', async () => {
      const prisma = makePrisma({
        company: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
      });
      const service = new PlansService(prisma);

      await expect(
        service.create(
          {
            patientId: PATIENT_ID,
            locationId: LOCATION_A,
            companyId: COMPANY_ID,
            startDate: new Date('2024-01-01'),
            plannedSessions: 12,
            amount: '5000.00',
          },
          TENANT_ID,
          USER_ID,
          null,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if serviceType does not exist', async () => {
      const prisma = makePrisma({
        serviceType: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
      });
      const service = new PlansService(prisma);

      await expect(
        service.create(
          {
            patientId: PATIENT_ID,
            locationId: LOCATION_A,
            serviceTypeId: SERVICE_TYPE_ID,
            startDate: new Date('2024-01-01'),
            plannedSessions: 12,
            amount: '5000.00',
          },
          TENANT_ID,
          USER_ID,
          null,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if ACTIVE plan exists for same patientId+serviceTypeId', async () => {
      const txMock = {
        plan: {
          findFirst: jest.fn().mockResolvedValue(mockPlan), // duplicate found
          create: jest.fn(),
        },
      };
      const prisma = makePrisma({
        $transaction: jest
          .fn()
          .mockImplementation((fn: (tx: typeof txMock) => Promise<unknown>) =>
            fn(txMock),
          ),
      });
      const service = new PlansService(prisma);

      await expect(
        service.create(
          {
            patientId: PATIENT_ID,
            locationId: LOCATION_A,
            serviceTypeId: SERVICE_TYPE_ID,
            startDate: new Date('2024-01-01'),
            plannedSessions: 12,
            amount: '5000.00',
          },
          TENANT_ID,
          USER_ID,
          null,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should initialize usedSessions to 0', async () => {
      const txMock = makeTxMock();
      const prisma = makePrisma({
        $transaction: jest
          .fn()
          .mockImplementation((fn: (tx: typeof txMock) => Promise<unknown>) =>
            fn(txMock),
          ),
      });
      const service = new PlansService(prisma);

      await service.create(
        {
          patientId: PATIENT_ID,
          locationId: LOCATION_A,
          startDate: new Date('2024-01-01'),
          plannedSessions: 12,
          amount: '5000.00',
        },
        TENANT_ID,
        USER_ID,
        null,
      );

      expect(txMock.plan.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ usedSessions: 0, status: 'ACTIVE' }),
        }),
      );
    });

    it('should set userId from current user', async () => {
      const txMock = makeTxMock();
      const prisma = makePrisma({
        $transaction: jest
          .fn()
          .mockImplementation((fn: (tx: typeof txMock) => Promise<unknown>) =>
            fn(txMock),
          ),
      });
      const service = new PlansService(prisma);

      await service.create(
        {
          patientId: PATIENT_ID,
          locationId: LOCATION_A,
          startDate: new Date('2024-01-01'),
          plannedSessions: 12,
          amount: '5000.00',
        },
        TENANT_ID,
        USER_ID,
        null,
      );

      expect(txMock.plan.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: USER_ID }),
        }),
      );
    });

    it('should allow multiple ACTIVE plans with no serviceTypeId', async () => {
      // When serviceTypeId is null, the uniqueness check is skipped
      const prisma = makePrisma();
      const service = new PlansService(prisma);

      await expect(
        service.create(
          {
            patientId: PATIENT_ID,
            locationId: LOCATION_A,
            startDate: new Date('2024-01-01'),
            plannedSessions: 12,
            amount: '5000.00',
            // no serviceTypeId
          },
          TENANT_ID,
          USER_ID,
          null,
        ),
      ).resolves.not.toThrow();
    });
  });

  describe('findAll', () => {
    it('should return paginated plans for tenant', async () => {
      const prisma = makePrisma();
      const service = new PlansService(prisma);

      const result = await service.findAll(TENANT_ID, null, {
        page: 1,
        limit: 20,
      });

      expect(prisma.plan.findMany).toHaveBeenCalledWith(
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

    it('should filter by patientId', async () => {
      const prisma = makePrisma();
      const service = new PlansService(prisma);

      await service.findAll(TENANT_ID, null, {
        page: 1,
        limit: 20,
        patientId: PATIENT_ID,
      });

      expect(prisma.plan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ patientId: PATIENT_ID }),
        }),
      );
    });

    it('should filter by companyId', async () => {
      const prisma = makePrisma();
      const service = new PlansService(prisma);

      await service.findAll(TENANT_ID, null, {
        page: 1,
        limit: 20,
        companyId: COMPANY_ID,
      });

      expect(prisma.plan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ companyId: COMPANY_ID }),
        }),
      );
    });

    it('should filter by status', async () => {
      const prisma = makePrisma();
      const service = new PlansService(prisma);

      await service.findAll(TENANT_ID, null, {
        page: 1,
        limit: 20,
        status: 'ACTIVE',
      });

      expect(prisma.plan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'ACTIVE' }),
        }),
      );
    });

    it('should restrict by locationId for MANAGER/STAFF', async () => {
      const prisma = makePrisma();
      const service = new PlansService(prisma);

      await service.findAll(TENANT_ID, LOCATION_A, { page: 1, limit: 20 });

      expect(prisma.plan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ locationId: LOCATION_A }),
        }),
      );
    });

    it('should include enriched data in response', async () => {
      const prisma = makePrisma();
      const service = new PlansService(prisma);

      const result = await service.findAll(TENANT_ID, null, {
        page: 1,
        limit: 20,
      });

      expect(result.data[0]).toHaveProperty('patientName');
      expect(result.data[0]).toHaveProperty('companyName');
      expect(result.data[0]).toHaveProperty('serviceTypeName');
    });
  });

  describe('findOne', () => {
    it('should return plan with enriched data', async () => {
      const prisma = makePrisma();
      const service = new PlansService(prisma);

      const result = await service.findOne(PLAN_ID, TENANT_ID, null);

      expect(result).toMatchObject({ id: PLAN_ID });
      expect(result).toHaveProperty('patientName');
      expect(result).toHaveProperty('companyName');
    });

    it('should throw NotFoundException if plan not found', async () => {
      const prisma = makePrisma({
        plan: {
          findFirst: jest.fn().mockResolvedValue(null),
          findMany: jest.fn(),
          count: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
      });
      const service = new PlansService(prisma);

      await expect(
        service.findOne('non-existent', TENANT_ID, null),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for MANAGER/STAFF from different location', async () => {
      const prisma = makePrisma({
        plan: {
          findFirst: jest.fn().mockResolvedValue(null),
          findMany: jest.fn(),
          count: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
      });
      const service = new PlansService(prisma);

      await expect(
        service.findOne(PLAN_ID, TENANT_ID, LOCATION_B),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update allowed fields', async () => {
      const prisma = makePrisma({
        plan: {
          findFirst: jest.fn().mockResolvedValue(mockPlan),
          findMany: jest.fn(),
          count: jest.fn(),
          create: jest.fn(),
          update: jest.fn().mockResolvedValue({
            ...mockPlan,
            notes: 'Updated notes',
          }),
          delete: jest.fn(),
        },
      });
      const service = new PlansService(prisma);

      const result = await service.update(
        PLAN_ID,
        { notes: 'Updated notes' },
        TENANT_ID,
        null,
      );

      expect(result.notes).toBe('Updated notes');
    });

    it('should allow status transition ACTIVE → INACTIVE', async () => {
      const prisma = makePrisma({
        plan: {
          findFirst: jest.fn().mockResolvedValue(mockPlan), // status ACTIVE
          findMany: jest.fn(),
          count: jest.fn(),
          create: jest.fn(),
          update: jest
            .fn()
            .mockResolvedValue({ ...mockPlan, status: 'INACTIVE' }),
          delete: jest.fn(),
        },
      });
      const service = new PlansService(prisma);

      const result = await service.update(
        PLAN_ID,
        { status: 'INACTIVE' },
        TENANT_ID,
        null,
      );

      expect(result.status).toBe('INACTIVE');
    });

    it('should throw ConflictException when plan is EXHAUSTED', async () => {
      const prisma = makePrisma({
        plan: {
          findFirst: jest.fn().mockResolvedValue({
            ...mockPlan,
            status: 'EXHAUSTED',
          }),
          findMany: jest.fn(),
          count: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
      });
      const service = new PlansService(prisma);

      await expect(
        service.update(PLAN_ID, { notes: 'X' }, TENANT_ID, null),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if plan not found', async () => {
      const prisma = makePrisma({
        plan: {
          findFirst: jest.fn().mockResolvedValue(null),
          findMany: jest.fn(),
          count: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
      });
      const service = new PlansService(prisma);

      await expect(
        service.update(PLAN_ID, { notes: 'X' }, TENANT_ID, null),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for MANAGER/STAFF from different location', async () => {
      const prisma = makePrisma({
        plan: {
          findFirst: jest.fn().mockResolvedValue(null),
          findMany: jest.fn(),
          count: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
      });
      const service = new PlansService(prisma);

      await expect(
        service.update(PLAN_ID, { notes: 'X' }, TENANT_ID, LOCATION_B),
      ).rejects.toThrow(NotFoundException);
    });

    it('should not allow direct usedSessions update (field is ignored)', async () => {
      const prisma = makePrisma({
        plan: {
          findFirst: jest.fn().mockResolvedValue(mockPlan),
          findMany: jest.fn(),
          count: jest.fn(),
          create: jest.fn(),
          update: jest.fn().mockResolvedValue(mockPlan),
          delete: jest.fn(),
        },
      });
      const service = new PlansService(prisma);

      // UpdatePlanDto does not include usedSessions, so this test
      // verifies that even if called with a partial object, usedSessions
      // is never passed to the update query.
      await service.update(PLAN_ID, { notes: 'test' }, TENANT_ID, null);

      expect(prisma.plan.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({
            usedSessions: expect.anything(),
          }),
        }),
      );
    });
  });

  describe('remove', () => {
    it('should delete plan when usedSessions is 0', async () => {
      const prisma = makePrisma({
        plan: {
          findFirst: jest.fn().mockResolvedValue({
            ...mockPlan,
            usedSessions: 0,
          }),
          findMany: jest.fn(),
          count: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
          delete: jest.fn().mockResolvedValue(mockPlan),
        },
      });
      const service = new PlansService(prisma);

      await service.remove(PLAN_ID, TENANT_ID, null);

      expect(prisma.plan.delete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: PLAN_ID } }),
      );
    });

    it('should throw ConflictException when usedSessions > 0', async () => {
      const prisma = makePrisma({
        plan: {
          findFirst: jest.fn().mockResolvedValue({
            ...mockPlan,
            usedSessions: 3,
          }),
          findMany: jest.fn(),
          count: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
      });
      const service = new PlansService(prisma);

      await expect(service.remove(PLAN_ID, TENANT_ID, null)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw NotFoundException if plan not found', async () => {
      const prisma = makePrisma({
        plan: {
          findFirst: jest.fn().mockResolvedValue(null),
          findMany: jest.fn(),
          count: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
      });
      const service = new PlansService(prisma);

      await expect(service.remove(PLAN_ID, TENANT_ID, null)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException for MANAGER/STAFF from different location', async () => {
      const prisma = makePrisma({
        plan: {
          findFirst: jest.fn().mockResolvedValue(null),
          findMany: jest.fn(),
          count: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
      });
      const service = new PlansService(prisma);

      await expect(
        service.remove(PLAN_ID, TENANT_ID, LOCATION_B),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
