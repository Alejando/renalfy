import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateReceiptDto,
  UpdateReceiptStatusDto,
  ReceiptQuery,
  ReceiptResponse,
  PaginatedReceiptsResponse,
  ReceiptStatus,
  PlanStatus,
} from '@repo/types';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

const VALID_RECEIPT_TRANSITIONS: Record<ReceiptStatus, ReceiptStatus[]> = {
  ACTIVE: ['FINISHED', 'CANCELLED'],
  FINISHED: ['SETTLED'],
  SETTLED: [],
  CANCELLED: [],
};

const TERMINAL_STATES: ReceiptStatus[] = ['SETTLED', 'CANCELLED'];

type PrismaReceipt = {
  id: string;
  tenantId: string;
  locationId: string;
  patientId: string;
  userId: string;
  serviceTypeId: string | null;
  planId: string | null;
  folio: string;
  date: Date;
  amount: { toString(): string };
  paymentType: string;
  status: ReceiptStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class ReceiptsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateReceiptDto,
    tenantId: string,
    userId: string,
    userLocationId: string | null,
  ): Promise<ReceiptResponse> {
    // MANAGER/STAFF can only create receipts for their own location
    if (userLocationId !== null && dto.locationId !== userLocationId) {
      throw new NotFoundException('Location not found or not accessible');
    }

    // FR-006: BENEFIT requires planId
    if (dto.paymentType === 'BENEFIT' && dto.planId === undefined) {
      throw new BadRequestException(
        'Se requiere planId para pagos de tipo BENEFIT',
      );
    }

    // Fetch location for folio code
    const location = await this.prisma.location.findFirst({
      where: { id: dto.locationId, tenantId },
    });
    if (!location) {
      throw new NotFoundException('Location not found');
    }

    // Validate appointmentId if provided
    if (dto.appointmentId !== undefined) {
      const appointment = await this.prisma.appointment.findFirst({
        where: { id: dto.appointmentId, tenantId, locationId: dto.locationId },
      });
      if (!appointment) {
        throw new NotFoundException('Appointment not found');
      }
      const appt = appointment as { status: string; receiptId: string | null };
      if (appt.status !== 'COMPLETED') {
        throw new ConflictException(
          'Solo se pueden emitir recibos para citas completadas',
        );
      }
      if (appt.receiptId !== null) {
        throw new ConflictException('La cita ya tiene un recibo asociado');
      }
    }

    // FR-007: Validate plan for BENEFIT payments
    let plan: {
      id: string;
      plannedSessions: number;
      usedSessions: number;
      status: string;
    } | null = null;
    if (dto.paymentType === 'BENEFIT' && dto.planId !== undefined) {
      const found = await this.prisma.plan.findFirst({
        where: { id: dto.planId, tenantId },
      });
      if (!found) {
        throw new NotFoundException('Plan not found');
      }
      plan = {
        id: found.id,
        plannedSessions: found.plannedSessions,
        usedSessions: found.usedSessions,
        status: found.status,
      };
      if (plan.status === 'EXHAUSTED') {
        throw new ConflictException('El plan ya está agotado (EXHAUSTED)');
      }
    }

    const year = new Date().getFullYear();

    const receipt = await this.prisma.$transaction(async (tx) => {
      // Atomic folio counter upsert
      const counter = await (
        tx as unknown as {
          receiptFolioCounter: {
            upsert: (args: unknown) => Promise<{ lastSequence: number }>;
          };
        }
      ).receiptFolioCounter.upsert({
        where: {
          tenantId_locationId_year: {
            tenantId,
            locationId: dto.locationId,
            year,
          },
        },
        create: { tenantId, locationId: dto.locationId, year, lastSequence: 1 },
        update: { lastSequence: { increment: 1 } },
      });

      const folio = buildFolio(location.name, year, counter.lastSequence);

      const created = await (
        tx as unknown as {
          receipt: {
            create: (args: unknown) => Promise<PrismaReceipt>;
          };
        }
      ).receipt.create({
        data: {
          tenantId,
          locationId: dto.locationId,
          patientId: dto.patientId,
          userId,
          serviceTypeId: dto.serviceTypeId,
          planId: dto.planId,
          folio,
          date: dto.date,
          amount: dto.amount as unknown as Prisma.Decimal,
          paymentType: dto.paymentType,
          notes: dto.notes,
          status: 'ACTIVE',
        },
      });

      // Link appointment to receipt
      if (dto.appointmentId !== undefined) {
        await (
          tx as unknown as {
            appointment: {
              update: (args: unknown) => Promise<unknown>;
            };
          }
        ).appointment.update({
          where: { id: dto.appointmentId },
          data: { receiptId: created.id },
        });
      }

      // FR-004/FR-005: BENEFIT — increment plan sessions atomically
      if (dto.paymentType === 'BENEFIT' && plan !== null) {
        const newUsedSessions = plan.usedSessions + 1;
        const isExhausted = newUsedSessions >= plan.plannedSessions;
        await (
          tx as unknown as {
            plan: {
              update: (args: unknown) => Promise<unknown>;
            };
          }
        ).plan.update({
          where: { id: plan.id },
          data: {
            usedSessions: { increment: 1 },
            ...(isExhausted && { status: 'EXHAUSTED' as PlanStatus }),
          },
        });
      }

      return created;
    });

    return this.toResponse(receipt);
  }

  async updateStatus(
    id: string,
    dto: UpdateReceiptStatusDto,
    tenantId: string,
    userLocationId: string | null,
  ): Promise<ReceiptResponse> {
    const current = await this.prisma.receipt.findFirst({
      where: {
        id,
        tenantId,
        ...(userLocationId !== null && { locationId: userLocationId }),
      },
    });

    if (!current) {
      throw new NotFoundException('Receipt not found');
    }

    const receipt = current as PrismaReceipt;

    if (TERMINAL_STATES.includes(receipt.status)) {
      throw new ConflictException(
        `Los recibos en estado ${receipt.status} son inmutables`,
      );
    }

    const validNext = VALID_RECEIPT_TRANSITIONS[receipt.status];
    if (!validNext.includes(dto.status)) {
      throw new BadRequestException(
        `Transición inválida: ${receipt.status} → ${dto.status}`,
      );
    }

    const updated = await this.prisma.receipt.update({
      where: { id },
      data: { status: dto.status, notes: dto.notes },
    });

    return this.toResponse(updated as PrismaReceipt);
  }

  async findAll(
    tenantId: string,
    userLocationId: string | null,
    query: Partial<ReceiptQuery>,
  ): Promise<PaginatedReceiptsResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const dateFilter =
      query.date !== undefined ? buildDayRange(query.date) : undefined;

    const where = {
      tenantId,
      ...(userLocationId !== null && { locationId: userLocationId }),
      ...(query.status !== undefined && { status: query.status }),
      ...(query.patientId !== undefined && { patientId: query.patientId }),
      ...(query.paymentType !== undefined && {
        paymentType: query.paymentType,
      }),
      ...(dateFilter !== undefined && { date: dateFilter }),
    };

    const [receipts, total] = await Promise.all([
      this.prisma.receipt.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { date: 'desc' },
      }),
      this.prisma.receipt.count({ where }),
    ]);

    return {
      data: (receipts as PrismaReceipt[]).map((r) => this.toResponse(r)),
      total,
      page,
      limit,
    };
  }

  async findOne(
    id: string,
    tenantId: string,
    userLocationId: string | null,
  ): Promise<ReceiptResponse> {
    const receipt = await this.prisma.receipt.findFirst({
      where: {
        id,
        tenantId,
        ...(userLocationId !== null && { locationId: userLocationId }),
      },
    });

    if (!receipt) {
      throw new NotFoundException('Receipt not found');
    }

    return this.toResponse(receipt as PrismaReceipt);
  }

  private toResponse(receipt: PrismaReceipt): ReceiptResponse {
    return {
      id: receipt.id,
      tenantId: receipt.tenantId,
      locationId: receipt.locationId,
      patientId: receipt.patientId,
      userId: receipt.userId,
      serviceTypeId: receipt.serviceTypeId,
      planId: receipt.planId,
      folio: receipt.folio,
      date: receipt.date,
      amount: receipt.amount.toString(),
      paymentType: receipt.paymentType as ReceiptResponse['paymentType'],
      status: receipt.status,
      notes: receipt.notes,
      createdAt: receipt.createdAt,
      updatedAt: receipt.updatedAt,
    };
  }
}

function buildFolio(locationName: string, year: number, seq: number): string {
  const code = locationName.slice(0, 3).toUpperCase();
  return `${code}-${year}-${String(seq).padStart(5, '0')}`;
}

function buildDayRange(dateStr: string): { gte: Date; lt: Date } {
  const start = new Date(`${dateStr}T00:00:00.000Z`);
  const end = new Date(`${dateStr}T00:00:00.000Z`);
  end.setUTCDate(end.getUTCDate() + 1);
  return { gte: start, lt: end };
}
