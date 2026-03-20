import {
  Injectable,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type {
  CreateUserDto,
  UpdateUserDto,
  UserRole,
  UserStatus,
} from '@repo/types';
import { PrismaService } from '../prisma/prisma.service.js';

const BCRYPT_ROUNDS = 10;

const USER_SELECT = {
  id: true,
  tenantId: true,
  locationId: true,
  name: true,
  email: true,
  role: true,
  status: true,
  phone: true,
  avatarUrl: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto, tenantId: string, callerRole: UserRole) {
    if (dto.role === 'OWNER' && callerRole !== 'OWNER') {
      throw new ForbiddenException('Only OWNER can create OWNER users');
    }

    const requiresLocation = dto.role === 'MANAGER' || dto.role === 'STAFF';

    if (requiresLocation && !dto.locationId) {
      throw new ForbiddenException(
        'locationId is required for MANAGER and STAFF roles',
      );
    }

    if (dto.locationId) {
      const location = await this.prisma.location.findFirst({
        where: { id: dto.locationId, tenantId },
      });
      if (!location) {
        throw new ForbiddenException(
          'locationId does not belong to this tenant',
        );
      }
    }

    const password = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    try {
      return await this.prisma.user.create({
        data: { ...dto, password, tenantId },
        select: USER_SELECT,
      });
    } catch (err: unknown) {
      const prismaError = err as { code?: string };
      if (prismaError.code === 'P2002') {
        throw new ConflictException('Email already exists in this tenant');
      }
      throw err;
    }
  }

  async findAll(tenantId: string, locationId: string | null) {
    return this.prisma.user.findMany({
      where: {
        tenantId,
        ...(locationId !== null && { locationId }),
      },
      select: USER_SELECT,
    });
  }

  async findOne(id: string, tenantId: string, locationId: string | null) {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        tenantId,
        ...(locationId !== null && { locationId }),
      },
      select: USER_SELECT,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async update(id: string, dto: UpdateUserDto, tenantId: string) {
    try {
      return await this.prisma.user.update({
        where: { id, tenantId },
        data: dto,
        select: USER_SELECT,
      });
    } catch (err: unknown) {
      const prismaError = err as { code?: string };
      if (prismaError.code === 'P2025') {
        throw new NotFoundException('User not found');
      }
      throw err;
    }
  }

  async updateStatus(
    id: string,
    status: UserStatus,
    tenantId: string,
    callerRole: UserRole,
  ) {
    const target = await this.prisma.user.findFirst({
      where: { id, tenantId },
      select: { role: true },
    });

    if (!target) {
      throw new NotFoundException('User not found');
    }

    if (target.role === 'OWNER' && callerRole !== 'OWNER') {
      throw new ForbiddenException(
        'Only OWNER can change the status of another OWNER',
      );
    }

    return this.prisma.user.update({
      where: { id, tenantId },
      data: { status },
      select: USER_SELECT,
    });
  }
}
