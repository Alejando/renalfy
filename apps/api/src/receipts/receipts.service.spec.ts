import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ReceiptsService } from './receipts.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('../../generated/prisma/client.js', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({})),
}));

const TENANT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const USER_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const LOC_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const LOC_ID_B = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const PATIENT_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const RECEIPT_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
const APPT_ID = '11111111-1111-1111-1111-111111111111';
const PLAN_ID = '22222222-2222-2222-2222-222222222222';

const mockLocation = {
  id: LOC_ID,
  tenantId: TENANT_ID,
  name: 'Sucursal Norte',
};
const mockCounter = { lastSequence: 1 };

const mockReceipt = {
  id: RECEIPT_ID,
  tenantId: TENANT_ID,
  locationId: LOC_ID,
  patientId: PATIENT_ID,
  userId: USER_ID,
  serviceTypeId: null,
  planId: null,
  folio: 'SUC-2026-00001',
  date: new Date('2026-03-20'),
  amount: { toString: () => '150.00' },
  paymentType: 'CASH',
  status: 'ACTIVE',
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const baseCreateDto = {
  patientId: PATIENT_ID,
  locationId: LOC_ID,
  date: new Date('2026-03-20'),
  amount: '150.00',
  paymentType: 'CASH' as const,
};

function makeTransaction(
  receiptCreate: jest.Mock = jest.fn().mockResolvedValue(mockReceipt),
  appointmentUpdate: jest.Mock = jest.fn().mockResolvedValue({}),
  planUpdate: jest.Mock = jest.fn().mockResolvedValue({}),
) {
  return jest.fn().mockImplementation((fn: (tx: unknown) => Promise<unknown>) =>
    fn({
      receiptFolioCounter: {
        upsert: jest.fn().mockResolvedValue(mockCounter),
      },
      receipt: { create: receiptCreate },
      appointment: { update: appointmentUpdate },
      plan: { update: planUpdate },
    }),
  );
}

function makePrisma(overrides: Record<string, unknown> = {}): PrismaService {
  return {
    location: {
      findFirst: jest.fn().mockResolvedValue(mockLocation),
    },
    appointment: {
      findFirst: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({}),
    },
    plan: {
      findFirst: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({}),
    },
    receipt: {
      findFirst: jest.fn().mockResolvedValue(mockReceipt),
      findMany: jest.fn().mockResolvedValue([mockReceipt]),
      count: jest.fn().mockResolvedValue(1),
      update: jest.fn().mockResolvedValue(mockReceipt),
    },
    $transaction: makeTransaction(),
    ...overrides,
  } as unknown as PrismaService;
}

// ─────────────────────────────────────────────────────────────────────────────
// US1: Create Receipt
// ─────────────────────────────────────────────────────────────────────────────

describe('ReceiptsService', () => {
  describe('create', () => {
    it('should create a CASH receipt with correct folio format', async () => {
      const prisma = makePrisma();
      const service = new ReceiptsService(prisma);

      const result = await service.create(
        baseCreateDto,
        TENANT_ID,
        USER_ID,
        null,
      );

      expect(result.status).toBe('ACTIVE');
      expect(result.folio).toMatch(/^SUC-\d{4}-\d{5}$/);
    });

    it('should use incremented sequence for second receipt', async () => {
      const receipt2 = { ...mockReceipt, folio: 'SUC-2026-00002' };
      const prisma = makePrisma({
        $transaction: jest
          .fn()
          .mockImplementation((fn: (tx: unknown) => Promise<unknown>) =>
            fn({
              receiptFolioCounter: {
                upsert: jest.fn().mockResolvedValue({ lastSequence: 2 }),
              },
              receipt: { create: jest.fn().mockResolvedValue(receipt2) },
              appointment: { update: jest.fn().mockResolvedValue({}) },
              plan: { update: jest.fn().mockResolvedValue({}) },
            }),
          ),
      });
      const service = new ReceiptsService(prisma);

      const result = await service.create(
        baseCreateDto,
        TENANT_ID,
        USER_ID,
        null,
      );

      expect(result.folio).toBe('SUC-2026-00002');
    });

    it('should throw NotFoundException if MANAGER tries to create for another location', async () => {
      const prisma = makePrisma();
      const service = new ReceiptsService(prisma);

      await expect(
        service.create(baseCreateDto, TENANT_ID, USER_ID, LOC_ID_B),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if location not found', async () => {
      const prisma = makePrisma({
        location: { findFirst: jest.fn().mockResolvedValue(null) },
      });
      const service = new ReceiptsService(prisma);

      await expect(
        service.create(baseCreateDto, TENANT_ID, USER_ID, null),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if appointment is not COMPLETED', async () => {
      const prisma = makePrisma({
        appointment: {
          findFirst: jest.fn().mockResolvedValue({
            id: APPT_ID,
            status: 'SCHEDULED',
            receiptId: null,
          }),
        },
      });
      const service = new ReceiptsService(prisma);

      await expect(
        service.create(
          { ...baseCreateDto, appointmentId: APPT_ID },
          TENANT_ID,
          USER_ID,
          null,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if appointment already has a receipt', async () => {
      const prisma = makePrisma({
        appointment: {
          findFirst: jest.fn().mockResolvedValue({
            id: APPT_ID,
            status: 'COMPLETED',
            receiptId: RECEIPT_ID,
          }),
        },
      });
      const service = new ReceiptsService(prisma);

      await expect(
        service.create(
          { ...baseCreateDto, appointmentId: APPT_ID },
          TENANT_ID,
          USER_ID,
          null,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if appointmentId not found', async () => {
      const prisma = makePrisma({
        appointment: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
      });
      const service = new ReceiptsService(prisma);

      await expect(
        service.create(
          { ...baseCreateDto, appointmentId: APPT_ID },
          TENANT_ID,
          USER_ID,
          null,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // US2: updateStatus
  // ─────────────────────────────────────────────────────────────────────────

  describe('updateStatus', () => {
    it('should transition ACTIVE → FINISHED', async () => {
      const prisma = makePrisma({
        receipt: {
          findFirst: jest
            .fn()
            .mockResolvedValue({ ...mockReceipt, status: 'ACTIVE' }),
          update: jest
            .fn()
            .mockResolvedValue({ ...mockReceipt, status: 'FINISHED' }),
        },
      });
      const service = new ReceiptsService(prisma);

      const result = await service.updateStatus(
        RECEIPT_ID,
        { status: 'FINISHED' },
        TENANT_ID,
        null,
      );

      expect(result.status).toBe('FINISHED');
    });

    it('should transition FINISHED → SETTLED', async () => {
      const prisma = makePrisma({
        receipt: {
          findFirst: jest
            .fn()
            .mockResolvedValue({ ...mockReceipt, status: 'FINISHED' }),
          update: jest
            .fn()
            .mockResolvedValue({ ...mockReceipt, status: 'SETTLED' }),
        },
      });
      const service = new ReceiptsService(prisma);

      const result = await service.updateStatus(
        RECEIPT_ID,
        { status: 'SETTLED' },
        TENANT_ID,
        null,
      );

      expect(result.status).toBe('SETTLED');
    });

    it('should transition ACTIVE → CANCELLED', async () => {
      const prisma = makePrisma({
        receipt: {
          findFirst: jest
            .fn()
            .mockResolvedValue({ ...mockReceipt, status: 'ACTIVE' }),
          update: jest
            .fn()
            .mockResolvedValue({ ...mockReceipt, status: 'CANCELLED' }),
        },
      });
      const service = new ReceiptsService(prisma);

      const result = await service.updateStatus(
        RECEIPT_ID,
        { status: 'CANCELLED' },
        TENANT_ID,
        null,
      );

      expect(result.status).toBe('CANCELLED');
    });

    it('should throw BadRequestException for FINISHED → CANCELLED', async () => {
      const prisma = makePrisma({
        receipt: {
          findFirst: jest
            .fn()
            .mockResolvedValue({ ...mockReceipt, status: 'FINISHED' }),
          update: jest.fn(),
        },
      });
      const service = new ReceiptsService(prisma);

      await expect(
        service.updateStatus(
          RECEIPT_ID,
          { status: 'CANCELLED' },
          TENANT_ID,
          null,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when receipt is SETTLED (terminal)', async () => {
      const prisma = makePrisma({
        receipt: {
          findFirst: jest
            .fn()
            .mockResolvedValue({ ...mockReceipt, status: 'SETTLED' }),
          update: jest.fn(),
        },
      });
      const service = new ReceiptsService(prisma);

      await expect(
        service.updateStatus(
          RECEIPT_ID,
          { status: 'FINISHED' },
          TENANT_ID,
          null,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when receipt is CANCELLED (terminal)', async () => {
      const prisma = makePrisma({
        receipt: {
          findFirst: jest
            .fn()
            .mockResolvedValue({ ...mockReceipt, status: 'CANCELLED' }),
          update: jest.fn(),
        },
      });
      const service = new ReceiptsService(prisma);

      await expect(
        service.updateStatus(RECEIPT_ID, { status: 'ACTIVE' }, TENANT_ID, null),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if receipt not found', async () => {
      const prisma = makePrisma({
        receipt: {
          findFirst: jest.fn().mockResolvedValue(null),
          update: jest.fn(),
        },
      });
      const service = new ReceiptsService(prisma);

      await expect(
        service.updateStatus(
          RECEIPT_ID,
          { status: 'FINISHED' },
          TENANT_ID,
          null,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if MANAGER tries to update receipt from another location', async () => {
      const prisma = makePrisma({
        receipt: {
          findFirst: jest.fn().mockResolvedValue(null),
          update: jest.fn(),
        },
      });
      const service = new ReceiptsService(prisma);

      await expect(
        service.updateStatus(
          RECEIPT_ID,
          { status: 'FINISHED' },
          TENANT_ID,
          LOC_ID_B,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // US3: BENEFIT payment — plan session tracking
  // ─────────────────────────────────────────────────────────────────────────

  describe('create — BENEFIT payment', () => {
    it('should throw BadRequestException when BENEFIT has no planId', async () => {
      const prisma = makePrisma();
      const service = new ReceiptsService(prisma);

      await expect(
        service.create(
          { ...baseCreateDto, paymentType: 'BENEFIT' },
          TENANT_ID,
          USER_ID,
          null,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if planId not found in tenant', async () => {
      const prisma = makePrisma({
        plan: { findFirst: jest.fn().mockResolvedValue(null) },
      });
      const service = new ReceiptsService(prisma);

      await expect(
        service.create(
          { ...baseCreateDto, paymentType: 'BENEFIT', planId: PLAN_ID },
          TENANT_ID,
          USER_ID,
          null,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if plan is EXHAUSTED', async () => {
      const prisma = makePrisma({
        plan: {
          findFirst: jest.fn().mockResolvedValue({
            id: PLAN_ID,
            tenantId: TENANT_ID,
            plannedSessions: 10,
            usedSessions: 10,
            status: 'EXHAUSTED',
          }),
        },
      });
      const service = new ReceiptsService(prisma);

      await expect(
        service.create(
          { ...baseCreateDto, paymentType: 'BENEFIT', planId: PLAN_ID },
          TENANT_ID,
          USER_ID,
          null,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should call plan.update with increment when BENEFIT is valid', async () => {
      const planUpdateMock = jest.fn().mockResolvedValue({});
      const benefitReceipt = {
        ...mockReceipt,
        paymentType: 'BENEFIT',
        planId: PLAN_ID,
      };
      const prisma = makePrisma({
        plan: {
          findFirst: jest.fn().mockResolvedValue({
            id: PLAN_ID,
            tenantId: TENANT_ID,
            plannedSessions: 10,
            usedSessions: 3,
            status: 'ACTIVE',
          }),
        },
        $transaction: jest
          .fn()
          .mockImplementation((fn: (tx: unknown) => Promise<unknown>) =>
            fn({
              receiptFolioCounter: {
                upsert: jest.fn().mockResolvedValue(mockCounter),
              },
              receipt: { create: jest.fn().mockResolvedValue(benefitReceipt) },
              appointment: { update: jest.fn().mockResolvedValue({}) },
              plan: { update: planUpdateMock },
            }),
          ),
      });
      const service = new ReceiptsService(prisma);

      await service.create(
        { ...baseCreateDto, paymentType: 'BENEFIT', planId: PLAN_ID },
        TENANT_ID,
        USER_ID,
        null,
      );

      expect(planUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            usedSessions: { increment: 1 },
          }),
        }),
      );
    });

    it('should set plan status EXHAUSTED on last session', async () => {
      const planUpdateMock = jest.fn().mockResolvedValue({});
      const benefitReceipt = {
        ...mockReceipt,
        paymentType: 'BENEFIT',
        planId: PLAN_ID,
      };
      const prisma = makePrisma({
        plan: {
          findFirst: jest.fn().mockResolvedValue({
            id: PLAN_ID,
            tenantId: TENANT_ID,
            plannedSessions: 10,
            usedSessions: 9,
            status: 'ACTIVE',
          }),
        },
        $transaction: jest
          .fn()
          .mockImplementation((fn: (tx: unknown) => Promise<unknown>) =>
            fn({
              receiptFolioCounter: {
                upsert: jest.fn().mockResolvedValue(mockCounter),
              },
              receipt: { create: jest.fn().mockResolvedValue(benefitReceipt) },
              appointment: { update: jest.fn().mockResolvedValue({}) },
              plan: { update: planUpdateMock },
            }),
          ),
      });
      const service = new ReceiptsService(prisma);

      await service.create(
        { ...baseCreateDto, paymentType: 'BENEFIT', planId: PLAN_ID },
        TENANT_ID,
        USER_ID,
        null,
      );

      expect(planUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            usedSessions: { increment: 1 },
            status: 'EXHAUSTED',
          }),
        }),
      );
    });

    it('should NOT call plan.update when paymentType is not BENEFIT', async () => {
      const planUpdateMock = jest.fn().mockResolvedValue({});
      const prisma = makePrisma({
        $transaction: jest
          .fn()
          .mockImplementation((fn: (tx: unknown) => Promise<unknown>) =>
            fn({
              receiptFolioCounter: {
                upsert: jest.fn().mockResolvedValue(mockCounter),
              },
              receipt: { create: jest.fn().mockResolvedValue(mockReceipt) },
              appointment: { update: jest.fn().mockResolvedValue({}) },
              plan: { update: planUpdateMock },
            }),
          ),
      });
      const service = new ReceiptsService(prisma);

      await service.create(
        { ...baseCreateDto, paymentType: 'CASH', planId: PLAN_ID },
        TENANT_ID,
        USER_ID,
        null,
      );

      expect(planUpdateMock).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // US4: findAll + findOne
  // ─────────────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should scope by locationId for MANAGER', async () => {
      const prisma = makePrisma();
      const service = new ReceiptsService(prisma);

      await service.findAll(TENANT_ID, LOC_ID, {});

      expect(prisma.receipt.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ locationId: LOC_ID }),
        }),
      );
    });

    it('should not scope by location for OWNER (null locationId)', async () => {
      const prisma = makePrisma();
      const service = new ReceiptsService(prisma);

      await service.findAll(TENANT_ID, null, {});

      const mockFn = prisma.receipt.findMany as jest.Mock;
      const callArg = (
        mockFn.mock.calls as unknown as Array<
          [{ where: Record<string, unknown> }]
        >
      )[0][0];
      expect(callArg.where).not.toHaveProperty('locationId');
    });

    it('should filter by status when provided', async () => {
      const prisma = makePrisma();
      const service = new ReceiptsService(prisma);

      await service.findAll(TENANT_ID, null, { status: 'ACTIVE' });

      expect(prisma.receipt.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'ACTIVE' }),
        }),
      );
    });

    it('should filter by patientId when provided', async () => {
      const prisma = makePrisma();
      const service = new ReceiptsService(prisma);

      await service.findAll(TENANT_ID, null, { patientId: PATIENT_ID });

      expect(prisma.receipt.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ patientId: PATIENT_ID }),
        }),
      );
    });

    it('should build day range filter for date param', async () => {
      const prisma = makePrisma();
      const service = new ReceiptsService(prisma);

      await service.findAll(TENANT_ID, null, { date: '2026-03-20' });

      expect(prisma.receipt.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: expect.objectContaining({ gte: expect.any(Date) }),
          }),
        }),
      );
    });

    it('should return correct pagination metadata', async () => {
      const prisma = makePrisma({
        receipt: {
          findMany: jest.fn().mockResolvedValue([mockReceipt]),
          count: jest.fn().mockResolvedValue(45),
          findFirst: jest.fn().mockResolvedValue(mockReceipt),
          update: jest.fn().mockResolvedValue(mockReceipt),
        },
      });
      const service = new ReceiptsService(prisma);

      const result = await service.findAll(TENANT_ID, null, {
        page: 2,
        limit: 20,
      });

      expect(result.total).toBe(45);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(20);
    });
  });

  describe('findOne', () => {
    it('should return receipt by id', async () => {
      const prisma = makePrisma();
      const service = new ReceiptsService(prisma);

      const result = await service.findOne(RECEIPT_ID, TENANT_ID, null);

      expect(result.id).toBe(RECEIPT_ID);
    });

    it('should throw NotFoundException if MANAGER tries to get receipt from another location', async () => {
      const prisma = makePrisma({
        receipt: {
          findFirst: jest.fn().mockResolvedValue(null),
          findMany: jest.fn().mockResolvedValue([]),
          count: jest.fn().mockResolvedValue(0),
          update: jest.fn(),
        },
      });
      const service = new ReceiptsService(prisma);

      await expect(
        service.findOne(RECEIPT_ID, TENANT_ID, LOC_ID_B),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if receipt not found', async () => {
      const prisma = makePrisma({
        receipt: {
          findFirst: jest.fn().mockResolvedValue(null),
          findMany: jest.fn().mockResolvedValue([]),
          count: jest.fn().mockResolvedValue(0),
          update: jest.fn(),
        },
      });
      const service = new ReceiptsService(prisma);

      await expect(
        service.findOne(RECEIPT_ID, TENANT_ID, null),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
