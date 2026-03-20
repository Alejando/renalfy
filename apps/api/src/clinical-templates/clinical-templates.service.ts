import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  UpsertClinicalTemplateDto,
  ClinicalTemplateResponse,
  TemplateField,
} from '@repo/types';
import { PrismaService } from '../prisma/prisma.service.js';

type PrismaClinicalTemplate = {
  id: string;
  tenantId: string;
  serviceTypeId: string;
  fields: TemplateField[];
  updatedAt: Date;
};

@Injectable()
export class ClinicalTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(
    dto: UpsertClinicalTemplateDto,
    tenantId: string,
  ): Promise<ClinicalTemplateResponse> {
    const serviceType = await this.prisma.serviceType.findFirst({
      where: { id: dto.serviceTypeId, tenantId },
    });

    if (!serviceType) {
      throw new NotFoundException('ServiceType not found');
    }

    const st = serviceType as { status: string };
    if (st.status !== 'ACTIVE') {
      throw new BadRequestException(
        'No se puede asignar una plantilla a un tipo de servicio inactivo',
      );
    }

    const template = await this.prisma.clinicalTemplate.upsert({
      where: { serviceTypeId: dto.serviceTypeId },
      create: {
        tenantId,
        serviceTypeId: dto.serviceTypeId,
        fields: dto.fields,
      },
      update: {
        fields: dto.fields,
      },
    });

    return template as unknown as ClinicalTemplateResponse;
  }

  async findAll(
    tenantId: string,
    serviceTypeId: string | undefined,
  ): Promise<ClinicalTemplateResponse[]> {
    const templates = await this.prisma.clinicalTemplate.findMany({
      where: {
        tenantId,
        ...(serviceTypeId !== undefined && { serviceTypeId }),
      },
    });

    return (templates as PrismaClinicalTemplate[]).map((t) => ({
      id: t.id,
      tenantId: t.tenantId,
      serviceTypeId: t.serviceTypeId,
      fields: t.fields,
      updatedAt: t.updatedAt,
    }));
  }

  async findOne(
    id: string,
    tenantId: string,
  ): Promise<ClinicalTemplateResponse> {
    const template = await this.prisma.clinicalTemplate.findFirst({
      where: { id, tenantId },
    });

    if (!template) {
      throw new NotFoundException('ClinicalTemplate not found');
    }

    const t = template as PrismaClinicalTemplate;
    return {
      id: t.id,
      tenantId: t.tenantId,
      serviceTypeId: t.serviceTypeId,
      fields: t.fields,
      updatedAt: t.updatedAt,
    };
  }
}
