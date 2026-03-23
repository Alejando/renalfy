import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateCompanyDto,
  UpdateCompanyDto,
  CompanyQuery,
  CompanyResponse,
  PaginatedCompaniesResponse,
} from '@repo/types';
import type { UserRole } from '@repo/types';
import { PrismaService } from '../prisma/prisma.service.js';

const OWNER_ADMIN_ROLES: UserRole[] = ['OWNER', 'ADMIN'];

type PrismaCompany = {
  id: string;
  tenantId: string;
  name: string;
  taxId: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  contactPerson: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function buildCompanyResponse(company: PrismaCompany): CompanyResponse {
  return {
    id: company.id,
    tenantId: company.tenantId,
    name: company.name,
    taxId: company.taxId,
    phone: company.phone,
    email: company.email,
    address: company.address,
    contactPerson: company.contactPerson,
    createdAt: company.createdAt,
    updatedAt: company.updatedAt,
  };
}

function assertOwnerAdmin(role: UserRole): void {
  if (!OWNER_ADMIN_ROLES.includes(role)) {
    throw new ForbiddenException('Only OWNER or ADMIN can manage companies');
  }
}

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateCompanyDto,
    tenantId: string,
    role: UserRole,
  ): Promise<CompanyResponse> {
    assertOwnerAdmin(role);

    const existing = await this.prisma.company.findFirst({
      where: { tenantId, name: dto.name },
    });
    if (existing) {
      throw new ConflictException(
        `A company named "${dto.name}" already exists in this tenant`,
      );
    }

    const company = await this.prisma.company.create({
      data: { ...dto, tenantId },
    });

    return buildCompanyResponse(company as PrismaCompany);
  }

  async findAll(
    tenantId: string,
    query: Partial<CompanyQuery>,
  ): Promise<PaginatedCompaniesResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where = {
      tenantId,
      ...(query.search !== undefined && {
        OR: [
          {
            name: { contains: query.search, mode: 'insensitive' as const },
          },
          {
            taxId: { contains: query.search, mode: 'insensitive' as const },
          },
        ],
      }),
    };

    const [companies, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.company.count({ where }),
    ]);

    return {
      data: (companies as PrismaCompany[]).map(buildCompanyResponse),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string, tenantId: string): Promise<CompanyResponse> {
    const company = await this.prisma.company.findFirst({
      where: { id, tenantId },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return buildCompanyResponse(company as PrismaCompany);
  }

  async update(
    id: string,
    dto: UpdateCompanyDto,
    tenantId: string,
    role: UserRole,
  ): Promise<CompanyResponse> {
    assertOwnerAdmin(role);

    const existing = await this.prisma.company.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundException('Company not found');
    }

    if (dto.name !== undefined) {
      const nameConflict = await this.prisma.company.findFirst({
        where: {
          tenantId,
          name: dto.name,
          id: { not: id },
        },
      });
      if (nameConflict) {
        throw new ConflictException(
          `A company named "${dto.name}" already exists in this tenant`,
        );
      }
    }

    const updated = await this.prisma.company.update({
      where: { id },
      data: dto,
    });

    return buildCompanyResponse(updated as PrismaCompany);
  }

  async remove(id: string, tenantId: string, role: UserRole): Promise<void> {
    assertOwnerAdmin(role);

    const company = await this.prisma.company.findFirst({
      where: { id, tenantId },
    });
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const planCount = await this.prisma.plan.count({
      where: { companyId: id },
    });
    if (planCount > 0) {
      throw new ConflictException(
        'Cannot delete company with associated plans',
      );
    }

    await this.prisma.company.delete({ where: { id } });
  }
}
