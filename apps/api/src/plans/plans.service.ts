import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreatePlanDto,
  UpdatePlanDto,
  PlanQuery,
  PlanResponse,
  PaginatedPlansResponse,
} from '@repo/types';
import { PrismaService } from '../prisma/prisma.service.js';

type PrismaPatientLookup = {
  id: string;
  name: string;
  locationId: string;
};

type PrismaPlan = {
  id: string;
  tenantId: string;
  locationId: string;
  patientId: string;
  companyId: string | null;
  serviceTypeId: string | null;
  userId: string;
  startDate: Date;
  plannedSessions: number;
  usedSessions: number;
  amount: { toString(): string } | string;
  status: 'ACTIVE' | 'INACTIVE' | 'EXHAUSTED';
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function buildPlanResponse(
  plan: PrismaPlan,
  patientName: string,
  companyName: string | null,
  serviceTypeName: string | null,
): PlanResponse {
  return {
    id: plan.id,
    tenantId: plan.tenantId,
    locationId: plan.locationId,
    patientId: plan.patientId,
    companyId: plan.companyId,
    serviceTypeId: plan.serviceTypeId,
    userId: plan.userId,
    startDate: plan.startDate,
    plannedSessions: plan.plannedSessions,
    usedSessions: plan.usedSessions,
    amount: plan.amount.toString(),
    status: plan.status,
    notes: plan.notes,
    patientName,
    companyName,
    serviceTypeName,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  };
}

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreatePlanDto,
    tenantId: string,
    userId: string,
    userLocationId: string | null,
  ): Promise<PlanResponse> {
    const locationId = userLocationId ?? dto.locationId;
    if (!locationId) {
      throw new ConflictException(
        'locationId is required for OWNER/ADMIN roles',
      );
    }

    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId },
      select: { id: true, name: true, locationId: true },
    });
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    const typedPatient = patient as PrismaPatientLookup;
    if (userLocationId !== null && typedPatient.locationId !== userLocationId) {
      throw new ForbiddenException('Patient does not belong to your location');
    }

    if (dto.companyId !== undefined) {
      const company = await this.prisma.company.findFirst({
        where: { id: dto.companyId, tenantId },
        select: { id: true },
      });
      if (!company) {
        throw new NotFoundException('Company not found');
      }
    }

    if (dto.serviceTypeId !== undefined) {
      const serviceType = await this.prisma.serviceType.findFirst({
        where: { id: dto.serviceTypeId, tenantId },
        select: { id: true },
      });
      if (!serviceType) {
        throw new NotFoundException('ServiceType not found');
      }
    }

    const plan = await this.prisma.$transaction(async (tx) => {
      const txTyped = tx as unknown as PrismaService;

      if (dto.serviceTypeId !== undefined) {
        const duplicate = await txTyped.plan.findFirst({
          where: {
            tenantId,
            patientId: dto.patientId,
            serviceTypeId: dto.serviceTypeId,
            status: 'ACTIVE',
          },
        });
        if (duplicate) {
          throw new ConflictException(
            'Patient already has an ACTIVE plan for this service type',
          );
        }
      }

      return txTyped.plan.create({
        data: {
          tenantId,
          locationId,
          patientId: dto.patientId,
          companyId: dto.companyId,
          serviceTypeId: dto.serviceTypeId,
          userId,
          startDate: dto.startDate,
          plannedSessions: dto.plannedSessions,
          usedSessions: 0,
          amount: dto.amount,
          status: 'ACTIVE',
          notes: dto.notes,
        },
      });
    });

    const enriched = await this.enrichPlan(plan as PrismaPlan);
    return enriched;
  }

  async findAll(
    tenantId: string,
    userLocationId: string | null,
    query: Partial<PlanQuery>,
  ): Promise<PaginatedPlansResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where = {
      tenantId,
      ...(userLocationId !== null && { locationId: userLocationId }),
      ...(query.patientId !== undefined && { patientId: query.patientId }),
      ...(query.companyId !== undefined && { companyId: query.companyId }),
      ...(query.status !== undefined && { status: query.status }),
    };

    const [plans, total] = await Promise.all([
      this.prisma.plan.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.plan.count({ where }),
    ]);

    const enrichedPlans = await Promise.all(
      (plans as PrismaPlan[]).map((p) => this.enrichPlan(p)),
    );

    return { data: enrichedPlans, total, page, limit };
  }

  async findOne(
    id: string,
    tenantId: string,
    userLocationId: string | null,
  ): Promise<PlanResponse> {
    const plan = await this.prisma.plan.findFirst({
      where: {
        id,
        tenantId,
        ...(userLocationId !== null && { locationId: userLocationId }),
      },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    return this.enrichPlan(plan as PrismaPlan);
  }

  async update(
    id: string,
    dto: UpdatePlanDto,
    tenantId: string,
    userLocationId: string | null,
  ): Promise<PlanResponse> {
    const existing = await this.prisma.plan.findFirst({
      where: {
        id,
        tenantId,
        ...(userLocationId !== null && { locationId: userLocationId }),
      },
    });

    if (!existing) {
      throw new NotFoundException('Plan not found');
    }

    const typedExisting = existing as PrismaPlan;
    if (typedExisting.status === 'EXHAUSTED') {
      throw new ConflictException('Cannot modify an EXHAUSTED plan');
    }

    const updated = await this.prisma.plan.update({
      where: { id },
      data: dto,
    });

    return this.enrichPlan(updated as PrismaPlan);
  }

  async remove(
    id: string,
    tenantId: string,
    userLocationId: string | null,
  ): Promise<void> {
    const plan = await this.prisma.plan.findFirst({
      where: {
        id,
        tenantId,
        ...(userLocationId !== null && { locationId: userLocationId }),
      },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    const typedPlan = plan as PrismaPlan;
    if (typedPlan.usedSessions > 0) {
      throw new ConflictException(
        'Cannot delete plan with used sessions. Set status to INACTIVE instead.',
      );
    }

    await this.prisma.plan.delete({ where: { id } });
  }

  private async enrichPlan(plan: PrismaPlan): Promise<PlanResponse> {
    const [patient, company, serviceType] = await Promise.all([
      this.prisma.patient.findFirst({
        where: { id: plan.patientId, tenantId: plan.tenantId },
        select: { name: true },
      }),
      plan.companyId !== null
        ? this.prisma.company.findFirst({
            where: { id: plan.companyId, tenantId: plan.tenantId },
            select: { name: true },
          })
        : Promise.resolve(null),
      plan.serviceTypeId !== null
        ? this.prisma.serviceType.findFirst({
            where: { id: plan.serviceTypeId, tenantId: plan.tenantId },
            select: { name: true },
          })
        : Promise.resolve(null),
    ]);

    const patientLookup = patient as { name: string } | null;
    const companyLookup = company as { name: string } | null;
    const serviceTypeLookup = serviceType as { name: string } | null;

    return buildPlanResponse(
      plan,
      patientLookup?.name ?? '',
      companyLookup?.name ?? null,
      serviceTypeLookup?.name ?? null,
    );
  }
}
