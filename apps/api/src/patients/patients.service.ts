import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreatePatientDto,
  UpdatePatientDto,
  PatientQuery,
  PatientResponse,
  PaginatedPatientsResponse,
} from '@repo/types';
import { PrismaService } from '../prisma/prisma.service.js';

type ConsentType = 'PRIVACY_NOTICE' | 'TREATMENT' | 'DATA_SHARING';

type PrismaConsent = {
  type: ConsentType;
  version: string;
  grantedAt: Date;
};

type PrismaPatient = {
  id: string;
  tenantId: string;
  locationId: string;
  name: string;
  birthDate: Date | null;
  phone: string | null;
  mobile: string | null;
  address: string | null;
  notes: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'DELETED';
  createdAt: Date;
  updatedAt: Date;
  location?: { name: string };
  patientConsents?: PrismaConsent[];
};

function mapConsent(consent: PrismaConsent | null): PatientResponse['consent'] {
  if (!consent) return null;
  return {
    type: consent.type,
    version: consent.version,
    signedAt: consent.grantedAt,
  };
}

function buildPatientResponse(
  patient: PrismaPatient,
  hasConsent: boolean,
  consent: PrismaConsent | null,
): PatientResponse {
  return {
    id: patient.id,
    tenantId: patient.tenantId,
    locationId: patient.locationId,
    name: patient.name,
    birthDate: patient.birthDate,
    phone: patient.phone,
    mobile: patient.mobile,
    address: patient.address,
    notes: patient.notes,
    status: patient.status,
    createdAt: patient.createdAt,
    updatedAt: patient.updatedAt,
    hasConsent,
    locationName: patient.location?.name ?? '',
    consent: mapConsent(consent),
  };
}

@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreatePatientDto,
    tenantId: string,
    userLocationId: string | null,
  ): Promise<PatientResponse> {
    if (userLocationId !== null && dto.locationId !== userLocationId) {
      throw new ForbiddenException(
        'No puedes crear pacientes en otra sucursal',
      );
    }

    const { consent, ...patientData } = dto;

    const patient = await this.prisma.$transaction(async (tx) => {
      const created = await (tx as unknown as PrismaService).patient.create({
        data: { ...patientData, tenantId },
      });
      await (tx as unknown as PrismaService).patientConsent.create({
        data: {
          tenantId,
          patientId: created.id,
          type: consent.type,
          version: consent.version,
          ipAddress: consent.ipAddress,
          signatureUrl: consent.signatureUrl,
        },
      });
      return created;
    });

    return buildPatientResponse(patient as PrismaPatient, true, null);
  }

  async findAll(
    tenantId: string,
    userLocationId: string | null,
    query: Partial<PatientQuery>,
  ): Promise<PaginatedPatientsResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { search, include } = query;
    const isIncludeDeleted = include === 'deleted';

    const where = {
      tenantId,
      ...(userLocationId !== null && { locationId: userLocationId }),
      ...(isIncludeDeleted ? {} : { status: 'ACTIVE' as const }),
      ...(search !== undefined && {
        name: { contains: search, mode: 'insensitive' as const },
      }),
    };

    const [patients, total] = await Promise.all([
      this.prisma.patient.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { location: { select: { name: true } } },
      }),
      this.prisma.patient.count({ where }),
    ]);

    const patientIds = (patients as PrismaPatient[]).map((p) => p.id);
    const consents = await this.prisma.patientConsent.findMany({
      where: {
        patientId: { in: patientIds },
        revokedAt: null,
      },
      select: { patientId: true },
    });
    const consentSet = new Set(
      (consents as { patientId: string }[]).map((c) => c.patientId),
    );

    const data = (patients as PrismaPatient[]).map((p) =>
      buildPatientResponse(p, consentSet.has(p.id), null),
    );

    return { data, total, page, limit };
  }

  async findOne(
    id: string,
    tenantId: string,
    userLocationId: string | null,
  ): Promise<PatientResponse> {
    const patient = await this.prisma.patient.findFirst({
      where: {
        id,
        tenantId,
        ...(userLocationId !== null && { locationId: userLocationId }),
      },
      include: {
        location: { select: { name: true } },
        patientConsents: {
          where: { revokedAt: null },
          orderBy: { grantedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    const typed = patient as PrismaPatient;
    const activeConsent = typed.patientConsents?.[0] ?? null;
    return buildPatientResponse(typed, activeConsent !== null, activeConsent);
  }

  async update(
    id: string,
    dto: UpdatePatientDto,
    tenantId: string,
    userLocationId: string | null,
  ): Promise<PatientResponse> {
    try {
      const patient = await this.prisma.patient.update({
        where: {
          id,
          tenantId,
          ...(userLocationId !== null && { locationId: userLocationId }),
        },
        data: dto,
      });

      const activeConsent = await this.prisma.patientConsent.findFirst({
        where: { patientId: id, tenantId, revokedAt: null },
        orderBy: { grantedAt: 'desc' },
      });

      return buildPatientResponse(
        patient as PrismaPatient,
        activeConsent !== null,
        activeConsent as PrismaConsent | null,
      );
    } catch (err: unknown) {
      const prismaError = err as { code?: string };
      if (prismaError.code === 'P2025') {
        throw new NotFoundException('Patient not found');
      }
      throw err;
    }
  }

  async remove(id: string, tenantId: string): Promise<PatientResponse> {
    try {
      const patient = await this.prisma.patient.update({
        where: { id, tenantId },
        data: { status: 'DELETED' },
      });

      const activeConsent = await this.prisma.patientConsent.findFirst({
        where: { patientId: id, tenantId, revokedAt: null },
        orderBy: { grantedAt: 'desc' },
      });

      return buildPatientResponse(
        patient as PrismaPatient,
        activeConsent !== null,
        activeConsent as PrismaConsent | null,
      );
    } catch (err: unknown) {
      const prismaError = err as { code?: string };
      if (prismaError.code === 'P2025') {
        throw new NotFoundException('Patient not found');
      }
      throw err;
    }
  }
}
