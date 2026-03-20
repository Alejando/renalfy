import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AppointmentStatus,
  CreateAppointmentDto,
  CreateMeasurementDto,
  UpdateAppointmentStatusDto,
  AppointmentQuery,
  AppointmentResponse,
  MeasurementResponse,
  PaginatedAppointmentsResponse,
  TemplateField,
} from '@repo/types';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

const VALID_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  SCHEDULED: ['IN_PROGRESS', 'CANCELLED', 'NO_SHOW'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

type PrismaAppointment = {
  id: string;
  tenantId: string;
  locationId: string;
  patientId: string;
  userId: string;
  serviceTypeId: string | null;
  receiptId: string | null;
  scheduledAt: Date;
  startedAt: Date | null;
  endedAt: Date | null;
  status: AppointmentStatus;
  clinicalData: Record<string, unknown> | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  measurements?: PrismaMeasurement[];
};

type PrismaMeasurement = {
  id: string;
  tenantId: string;
  appointmentId: string;
  recordedAt: Date;
  data: Record<string, unknown>;
  notes: string | null;
};

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateAppointmentDto,
    tenantId: string,
    userId: string,
    userLocationId: string | null,
  ): Promise<AppointmentResponse> {
    // MANAGER/STAFF can only create appointments in their own location
    if (userLocationId !== null && dto.locationId !== userLocationId) {
      throw new NotFoundException(
        'Patient not found or location not accessible',
      );
    }

    // FR-001: verify active consent
    const consent = await this.prisma.patientConsent.findFirst({
      where: { patientId: dto.patientId, tenantId, revokedAt: null },
    });
    if (!consent) {
      throw new ForbiddenException(
        'El paciente no tiene consentimiento activo',
      );
    }

    // Validate serviceType if provided
    if (dto.serviceTypeId !== undefined) {
      const serviceType = await this.prisma.serviceType.findFirst({
        where: { id: dto.serviceTypeId, tenantId },
      });
      if (!serviceType) {
        throw new NotFoundException('ServiceType not found');
      }
      const st = serviceType as { status: string };
      if (st.status !== 'ACTIVE') {
        throw new BadRequestException(
          'No se pueden crear citas con tipos de servicio inactivos',
        );
      }

      // FR-008: validate clinicalData against template
      const template = await this.prisma.clinicalTemplate.findFirst({
        where: { serviceTypeId: dto.serviceTypeId, tenantId },
      });
      if (template) {
        const fields = (template as unknown as { fields: TemplateField[] })
          .fields;
        const missingFields = fields
          .filter(
            (f) =>
              f.required &&
              (dto.clinicalData === undefined ||
                dto.clinicalData[f.key] === undefined ||
                dto.clinicalData[f.key] === null),
          )
          .map((f) => f.key);

        if (missingFields.length > 0) {
          throw new BadRequestException(
            `Campos clínicos requeridos faltantes: ${missingFields.join(', ')}`,
          );
        }
      }
    }

    const appointment = await this.prisma.appointment.create({
      data: {
        tenantId,
        locationId: dto.locationId,
        patientId: dto.patientId,
        userId,
        serviceTypeId: dto.serviceTypeId,
        scheduledAt: dto.scheduledAt,
        clinicalData: dto.clinicalData as unknown as
          | Prisma.InputJsonValue
          | undefined,
        notes: dto.notes,
        status: 'SCHEDULED',
      },
      include: { measurements: true },
    });

    return this.toResponse(appointment as PrismaAppointment);
  }

  async updateStatus(
    id: string,
    dto: UpdateAppointmentStatusDto,
    tenantId: string,
    userLocationId: string | null,
  ): Promise<AppointmentResponse> {
    const current = await this.prisma.appointment.findFirst({
      where: {
        id,
        tenantId,
        ...(userLocationId !== null && { locationId: userLocationId }),
      },
    });

    if (!current) {
      throw new NotFoundException('Appointment not found');
    }

    const appt = current as PrismaAppointment;

    // FR-005: COMPLETED is immutable (NOM-004)
    if (appt.status === 'COMPLETED') {
      throw new ConflictException(
        'Las citas completadas son inmutables (NOM-004)',
      );
    }

    const validNext = VALID_TRANSITIONS[appt.status];
    if (!validNext.includes(dto.status)) {
      throw new BadRequestException(
        `Transición inválida: ${appt.status} → ${dto.status}`,
      );
    }

    // FR-004: auto-set timestamps
    const now = new Date();
    const timestamps: { startedAt?: Date; endedAt?: Date } = {};
    if (dto.status === 'IN_PROGRESS') {
      timestamps.startedAt = now;
    }
    if (dto.status === 'COMPLETED') {
      timestamps.endedAt = now;
    }

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: {
        status: dto.status,
        notes: dto.notes,
        ...timestamps,
      },
      include: { measurements: true },
    });

    return this.toResponse(updated as PrismaAppointment);
  }

  async findAll(
    tenantId: string,
    userLocationId: string | null,
    query: Partial<AppointmentQuery>,
  ): Promise<PaginatedAppointmentsResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const dateFilter =
      query.date !== undefined ? buildDayRange(query.date) : undefined;

    const where = {
      tenantId,
      ...(userLocationId !== null && { locationId: userLocationId }),
      ...(query.status !== undefined && { status: query.status }),
      ...(query.patientId !== undefined && { patientId: query.patientId }),
      ...(dateFilter !== undefined && { scheduledAt: dateFilter }),
    };

    const [appointments, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { scheduledAt: 'asc' },
        include: { measurements: true },
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return {
      data: (appointments as PrismaAppointment[]).map((a) =>
        this.toResponse(a),
      ),
      total,
      page,
      limit,
    };
  }

  async findOne(
    id: string,
    tenantId: string,
    userLocationId: string | null,
  ): Promise<AppointmentResponse> {
    const appointment = await this.prisma.appointment.findFirst({
      where: {
        id,
        tenantId,
        ...(userLocationId !== null && { locationId: userLocationId }),
      },
      include: { measurements: true },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    return this.toResponse(appointment as PrismaAppointment);
  }

  async createMeasurement(
    appointmentId: string,
    dto: CreateMeasurementDto,
    tenantId: string,
    userLocationId: string | null,
  ): Promise<MeasurementResponse> {
    const appointment = await this.prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        tenantId,
        ...(userLocationId !== null && { locationId: userLocationId }),
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    const appt = appointment as PrismaAppointment;

    // FR-007: measurements only for IN_PROGRESS
    if (appt.status !== 'IN_PROGRESS') {
      throw new ConflictException(
        'Solo se pueden registrar mediciones en citas activas (IN_PROGRESS)',
      );
    }

    const measurement = await this.prisma.measurement.create({
      data: {
        tenantId,
        appointmentId,
        recordedAt: dto.recordedAt,
        data: dto.data as unknown as Prisma.InputJsonValue,
        notes: dto.notes,
      },
    });

    return measurement as MeasurementResponse;
  }

  private toResponse(appt: PrismaAppointment): AppointmentResponse {
    return {
      id: appt.id,
      tenantId: appt.tenantId,
      locationId: appt.locationId,
      patientId: appt.patientId,
      userId: appt.userId,
      serviceTypeId: appt.serviceTypeId,
      receiptId: appt.receiptId,
      scheduledAt: appt.scheduledAt,
      startedAt: appt.startedAt,
      endedAt: appt.endedAt,
      status: appt.status,
      clinicalData: appt.clinicalData,
      notes: appt.notes,
      measurements: (appt.measurements ?? []).map((m) => ({
        id: m.id,
        tenantId: m.tenantId,
        appointmentId: m.appointmentId,
        recordedAt: m.recordedAt,
        data: m.data,
        notes: m.notes,
      })),
      createdAt: appt.createdAt,
      updatedAt: appt.updatedAt,
    };
  }
}

function buildDayRange(dateStr: string): { gte: Date; lt: Date } {
  const start = new Date(`${dateStr}T00:00:00.000Z`);
  const end = new Date(`${dateStr}T00:00:00.000Z`);
  end.setUTCDate(end.getUTCDate() + 1);
  return { gte: start, lt: end };
}
