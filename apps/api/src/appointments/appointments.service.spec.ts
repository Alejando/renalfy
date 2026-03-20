import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

// Prevent Prisma from loading native binaries / connecting to DB during unit tests
jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('../../generated/prisma/client.js', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({})),
}));

const TENANT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const LOCATION_A = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const LOCATION_B = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const PATIENT_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const USER_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const SERVICE_TYPE_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
const APPOINTMENT_ID = '11111111-1111-1111-1111-111111111111';

const mockAppointment = {
  id: APPOINTMENT_ID,
  tenantId: TENANT_ID,
  locationId: LOCATION_A,
  patientId: PATIENT_ID,
  userId: USER_ID,
  serviceTypeId: null,
  receiptId: null,
  scheduledAt: new Date('2026-03-25T10:00:00.000Z'),
  startedAt: null,
  endedAt: null,
  status: 'SCHEDULED' as const,
  clinicalData: null,
  notes: null,
  measurements: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makePrisma(overrides: Record<string, unknown> = {}): PrismaService {
  return {
    appointment: {
      create: jest.fn().mockResolvedValue(mockAppointment),
      findFirst: jest.fn().mockResolvedValue(mockAppointment),
      findMany: jest.fn().mockResolvedValue([mockAppointment]),
      count: jest.fn().mockResolvedValue(1),
      update: jest.fn().mockResolvedValue(mockAppointment),
    },
    measurement: {
      create: jest.fn().mockResolvedValue({
        id: '22222222-2222-2222-2222-222222222222',
        tenantId: TENANT_ID,
        appointmentId: APPOINTMENT_ID,
        recordedAt: new Date(),
        data: { weight: 68 },
        notes: null,
      }),
    },
    patientConsent: {
      findFirst: jest.fn().mockResolvedValue({ id: 'consent-1' }),
    },
    serviceType: {
      findFirst: jest.fn().mockResolvedValue({
        id: SERVICE_TYPE_ID,
        status: 'ACTIVE',
      }),
    },
    clinicalTemplate: {
      findFirst: jest.fn().mockResolvedValue(null),
      upsert: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
    ...overrides,
  } as unknown as PrismaService;
}

describe('AppointmentsService', () => {
  describe('create', () => {
    it('should create appointment with SCHEDULED status', async () => {
      const prisma = makePrisma();
      const service = new AppointmentsService(prisma);

      const result = await service.create(
        {
          patientId: PATIENT_ID,
          locationId: LOCATION_A,
          scheduledAt: new Date('2026-03-25T10:00:00.000Z'),
        },
        TENANT_ID,
        USER_ID,
        null,
      );

      expect(result.status).toBe('SCHEDULED');
      expect(prisma.appointment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_ID,
            userId: USER_ID,
            status: 'SCHEDULED',
          }),
        }),
      );
    });

    it('should throw ForbiddenException if patient has no active consent', async () => {
      const prisma = makePrisma({
        patientConsent: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
      });
      const service = new AppointmentsService(prisma);

      await expect(
        service.create(
          {
            patientId: PATIENT_ID,
            locationId: LOCATION_A,
            scheduledAt: new Date(),
          },
          TENANT_ID,
          USER_ID,
          null,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if patient not in MANAGER location', async () => {
      const prisma = makePrisma({
        appointment: {
          create: jest.fn(),
          findFirst: jest.fn().mockResolvedValue(null),
          findMany: jest.fn().mockResolvedValue([]),
          count: jest.fn().mockResolvedValue(0),
          update: jest.fn(),
        },
      });
      const service = new AppointmentsService(prisma);

      await expect(
        service.create(
          {
            patientId: PATIENT_ID,
            locationId: LOCATION_B,
            scheduledAt: new Date(),
          },
          TENANT_ID,
          USER_ID,
          LOCATION_A,
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
      const service = new AppointmentsService(prisma);

      await expect(
        service.create(
          {
            patientId: PATIENT_ID,
            locationId: LOCATION_A,
            serviceTypeId: SERVICE_TYPE_ID,
            scheduledAt: new Date(),
          },
          TENANT_ID,
          USER_ID,
          null,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if clinicalData is missing required fields', async () => {
      const prisma = makePrisma({
        clinicalTemplate: {
          findFirst: jest.fn().mockResolvedValue({
            fields: [
              { key: 'weight', label: 'Peso', type: 'number', required: true },
              {
                key: 'bloodPressure',
                label: 'Tensión',
                type: 'text',
                required: true,
              },
            ],
          }),
          upsert: jest.fn(),
          findMany: jest.fn().mockResolvedValue([]),
        },
      });
      const service = new AppointmentsService(prisma);

      await expect(
        service.create(
          {
            patientId: PATIENT_ID,
            locationId: LOCATION_A,
            serviceTypeId: SERVICE_TYPE_ID,
            scheduledAt: new Date(),
            clinicalData: { weight: 68 }, // missing bloodPressure
          },
          TENANT_ID,
          USER_ID,
          null,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create appointment with clinicalData null if no template', async () => {
      const prisma = makePrisma();
      const service = new AppointmentsService(prisma);

      await service.create(
        {
          patientId: PATIENT_ID,
          locationId: LOCATION_A,
          scheduledAt: new Date(),
        },
        TENANT_ID,
        USER_ID,
        null,
      );

      expect(prisma.appointment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ clinicalData: undefined }),
        }),
      );
    });
  });

  describe('updateStatus', () => {
    it('should transition SCHEDULED to IN_PROGRESS and set startedAt', async () => {
      const prisma = makePrisma({
        appointment: {
          create: jest.fn(),
          findFirst: jest.fn().mockResolvedValue({
            ...mockAppointment,
            status: 'SCHEDULED',
          }),
          findMany: jest.fn().mockResolvedValue([mockAppointment]),
          count: jest.fn().mockResolvedValue(1),
          update: jest.fn().mockResolvedValue({
            ...mockAppointment,
            status: 'IN_PROGRESS',
            startedAt: new Date(),
          }),
        },
      });
      const service = new AppointmentsService(prisma);

      const result = await service.updateStatus(
        APPOINTMENT_ID,
        { status: 'IN_PROGRESS' },
        TENANT_ID,
        null,
      );

      expect(result.status).toBe('IN_PROGRESS');
      expect(prisma.appointment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'IN_PROGRESS',
            startedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should transition IN_PROGRESS to COMPLETED and set endedAt', async () => {
      const prisma = makePrisma({
        appointment: {
          create: jest.fn(),
          findFirst: jest.fn().mockResolvedValue({
            ...mockAppointment,
            status: 'IN_PROGRESS',
            startedAt: new Date(),
          }),
          findMany: jest.fn().mockResolvedValue([]),
          count: jest.fn().mockResolvedValue(0),
          update: jest.fn().mockResolvedValue({
            ...mockAppointment,
            status: 'COMPLETED',
            startedAt: new Date(),
            endedAt: new Date(),
          }),
        },
      });
      const service = new AppointmentsService(prisma);

      const result = await service.updateStatus(
        APPOINTMENT_ID,
        { status: 'COMPLETED' },
        TENANT_ID,
        null,
      );

      expect(result.status).toBe('COMPLETED');
      expect(prisma.appointment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'COMPLETED',
            endedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should transition SCHEDULED to CANCELLED with notes', async () => {
      const prisma = makePrisma({
        appointment: {
          create: jest.fn(),
          findFirst: jest.fn().mockResolvedValue({
            ...mockAppointment,
            status: 'SCHEDULED',
          }),
          findMany: jest.fn().mockResolvedValue([]),
          count: jest.fn().mockResolvedValue(0),
          update: jest.fn().mockResolvedValue({
            ...mockAppointment,
            status: 'CANCELLED',
            notes: 'Paciente canceló',
          }),
        },
      });
      const service = new AppointmentsService(prisma);

      const result = await service.updateStatus(
        APPOINTMENT_ID,
        { status: 'CANCELLED', notes: 'Paciente canceló' },
        TENANT_ID,
        null,
      );

      expect(result.status).toBe('CANCELLED');
    });

    it('should throw ConflictException if appointment is COMPLETED', async () => {
      const prisma = makePrisma({
        appointment: {
          create: jest.fn(),
          findFirst: jest.fn().mockResolvedValue({
            ...mockAppointment,
            status: 'COMPLETED',
          }),
          findMany: jest.fn().mockResolvedValue([]),
          count: jest.fn().mockResolvedValue(0),
          update: jest.fn(),
        },
      });
      const service = new AppointmentsService(prisma);

      await expect(
        service.updateStatus(
          APPOINTMENT_ID,
          { status: 'CANCELLED' },
          TENANT_ID,
          null,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException for invalid transition SCHEDULED -> COMPLETED', async () => {
      const prisma = makePrisma({
        appointment: {
          create: jest.fn(),
          findFirst: jest.fn().mockResolvedValue({
            ...mockAppointment,
            status: 'SCHEDULED',
          }),
          findMany: jest.fn().mockResolvedValue([]),
          count: jest.fn().mockResolvedValue(0),
          update: jest.fn(),
        },
      });
      const service = new AppointmentsService(prisma);

      await expect(
        service.updateStatus(
          APPOINTMENT_ID,
          { status: 'COMPLETED' },
          TENANT_ID,
          null,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for appointment in different location', async () => {
      const prisma = makePrisma({
        appointment: {
          create: jest.fn(),
          findFirst: jest.fn().mockResolvedValue(null),
          findMany: jest.fn().mockResolvedValue([]),
          count: jest.fn().mockResolvedValue(0),
          update: jest.fn(),
        },
      });
      const service = new AppointmentsService(prisma);

      await expect(
        service.updateStatus(
          APPOINTMENT_ID,
          { status: 'IN_PROGRESS' },
          TENANT_ID,
          LOCATION_B,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return all tenant appointments for OWNER', async () => {
      const prisma = makePrisma();
      const service = new AppointmentsService(prisma);

      const result = await service.findAll(TENANT_ID, null, {});

      expect(prisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({ locationId: expect.anything() }),
        }),
      );
      expect(result.data).toHaveLength(1);
    });

    it('should filter by locationId for MANAGER', async () => {
      const prisma = makePrisma();
      const service = new AppointmentsService(prisma);

      await service.findAll(TENANT_ID, LOCATION_A, {});

      expect(prisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ locationId: LOCATION_A }),
        }),
      );
    });

    it('should filter by date (day range)', async () => {
      const prisma = makePrisma();
      const service = new AppointmentsService(prisma);

      await service.findAll(TENANT_ID, null, { date: '2026-03-20' });

      expect(prisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            scheduledAt: expect.objectContaining({
              gte: expect.any(Date),
              lt: expect.any(Date),
            }),
          }),
        }),
      );
    });

    it('should filter by status', async () => {
      const prisma = makePrisma();
      const service = new AppointmentsService(prisma);

      await service.findAll(TENANT_ID, null, { status: 'SCHEDULED' });

      expect(prisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'SCHEDULED' }),
        }),
      );
    });

    it('should filter by patientId respecting location scope', async () => {
      const prisma = makePrisma();
      const service = new AppointmentsService(prisma);

      await service.findAll(TENANT_ID, LOCATION_A, { patientId: PATIENT_ID });

      expect(prisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            patientId: PATIENT_ID,
            locationId: LOCATION_A,
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return appointment with measurements', async () => {
      const prisma = makePrisma({
        appointment: {
          create: jest.fn(),
          findFirst: jest.fn().mockResolvedValue({
            ...mockAppointment,
            measurements: [
              {
                id: '22222222-2222-2222-2222-222222222222',
                tenantId: TENANT_ID,
                appointmentId: APPOINTMENT_ID,
                recordedAt: new Date(),
                data: { weight: 68 },
                notes: null,
              },
            ],
          }),
          findMany: jest.fn().mockResolvedValue([]),
          count: jest.fn().mockResolvedValue(0),
          update: jest.fn(),
        },
      });
      const service = new AppointmentsService(prisma);

      const result = await service.findOne(APPOINTMENT_ID, TENANT_ID, null);

      expect(result.measurements).toHaveLength(1);
      expect(prisma.appointment.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          include: { measurements: true },
        }),
      );
    });

    it('should throw NotFoundException for appointment of another tenant', async () => {
      const prisma = makePrisma({
        appointment: {
          create: jest.fn(),
          findFirst: jest.fn().mockResolvedValue(null),
          findMany: jest.fn().mockResolvedValue([]),
          count: jest.fn().mockResolvedValue(0),
          update: jest.fn(),
        },
      });
      const service = new AppointmentsService(prisma);

      await expect(
        service.findOne(APPOINTMENT_ID, TENANT_ID, null),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createMeasurement', () => {
    it('should create measurement for IN_PROGRESS appointment', async () => {
      const prisma = makePrisma({
        appointment: {
          create: jest.fn(),
          findFirst: jest.fn().mockResolvedValue({
            ...mockAppointment,
            status: 'IN_PROGRESS',
          }),
          findMany: jest.fn().mockResolvedValue([]),
          count: jest.fn().mockResolvedValue(0),
          update: jest.fn(),
        },
      });
      const service = new AppointmentsService(prisma);

      const result = await service.createMeasurement(
        APPOINTMENT_ID,
        {
          recordedAt: new Date(),
          data: { weight: 68 },
        },
        TENANT_ID,
        null,
      );

      expect(prisma.measurement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_ID,
            appointmentId: APPOINTMENT_ID,
          }),
        }),
      );
      expect(result.appointmentId).toBe(APPOINTMENT_ID);
    });

    it('should throw ConflictException if appointment is not IN_PROGRESS', async () => {
      const prisma = makePrisma({
        appointment: {
          create: jest.fn(),
          findFirst: jest.fn().mockResolvedValue({
            ...mockAppointment,
            status: 'SCHEDULED',
          }),
          findMany: jest.fn().mockResolvedValue([]),
          count: jest.fn().mockResolvedValue(0),
          update: jest.fn(),
        },
      });
      const service = new AppointmentsService(prisma);

      await expect(
        service.createMeasurement(
          APPOINTMENT_ID,
          { recordedAt: new Date(), data: { weight: 68 } },
          TENANT_ID,
          null,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException for appointment in different location', async () => {
      const prisma = makePrisma({
        appointment: {
          create: jest.fn(),
          findFirst: jest.fn().mockResolvedValue(null),
          findMany: jest.fn().mockResolvedValue([]),
          count: jest.fn().mockResolvedValue(0),
          update: jest.fn(),
        },
      });
      const service = new AppointmentsService(prisma);

      await expect(
        service.createMeasurement(
          APPOINTMENT_ID,
          { recordedAt: new Date(), data: { weight: 68 } },
          TENANT_ID,
          LOCATION_B,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
