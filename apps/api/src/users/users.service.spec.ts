import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('../../generated/prisma/client.js', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true),
}));

const TENANT_ID = 'tenant-uuid-1';
const LOCATION_ID = 'location-uuid-1';
const OTHER_LOCATION_ID = 'location-uuid-2';
const USER_ID = 'user-uuid-1';

const mockUser = {
  id: USER_ID,
  tenantId: TENANT_ID,
  locationId: LOCATION_ID,
  name: 'Ana García',
  email: 'ana@clinica.com',
  password: 'hashed-password',
  role: 'MANAGER',
  status: 'ACTIVE',
  phone: null,
  avatarUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockLocation = { id: LOCATION_ID, tenantId: TENANT_ID };

function makePrisma(overrides: Record<string, unknown> = {}): PrismaService {
  return {
    user: {
      create: jest.fn().mockResolvedValue(mockUser),
      findMany: jest.fn().mockResolvedValue([mockUser]),
      findFirst: jest.fn().mockResolvedValue(mockUser),
      findUnique: jest.fn().mockResolvedValue(mockUser),
      update: jest.fn().mockResolvedValue({ ...mockUser, status: 'SUSPENDED' }),
    },
    location: {
      findFirst: jest.fn().mockResolvedValue(mockLocation),
    },
    ...overrides,
  } as unknown as PrismaService;
}

describe('UsersService', () => {
  describe('create', () => {
    it('should hash the password before persisting', async () => {
      const prisma = makePrisma();
      const service = new UsersService(prisma);

      await service.create(
        {
          name: 'Ana',
          email: 'ana@test.com',
          password: 'plainpass',
          role: 'ADMIN',
        },
        TENANT_ID,
        'OWNER',
      );

      expect(bcrypt.hash).toHaveBeenCalledWith('plainpass', expect.any(Number));
    });

    it('should create the user with tenantId from the caller', async () => {
      const prisma = makePrisma();
      const service = new UsersService(prisma);

      await service.create(
        {
          name: 'Ana',
          email: 'ana@test.com',
          password: 'plainpass',
          role: 'ADMIN',
        },
        TENANT_ID,
        'OWNER',
      );

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tenantId: TENANT_ID }),
        }),
      );
    });

    it('should throw ForbiddenException when ADMIN tries to create an OWNER', async () => {
      const prisma = makePrisma();
      const service = new UsersService(prisma);

      await expect(
        service.create(
          {
            name: 'Boss',
            email: 'boss@test.com',
            password: 'pass',
            role: 'OWNER',
          },
          TENANT_ID,
          'ADMIN',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException when email already exists in the tenant', async () => {
      const prisma = makePrisma({
        user: {
          create: jest.fn().mockRejectedValue({ code: 'P2002' }),
          findMany: jest.fn(),
          findFirst: jest.fn(),
          findUnique: jest.fn(),
          update: jest.fn(),
        },
      });
      const service = new UsersService(prisma);

      await expect(
        service.create(
          {
            name: 'Ana',
            email: 'ana@test.com',
            password: 'pass',
            role: 'ADMIN',
          },
          TENANT_ID,
          'OWNER',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should require locationId for MANAGER role', async () => {
      const prisma = makePrisma();
      const service = new UsersService(prisma);

      await expect(
        service.create(
          {
            name: 'Mgr',
            email: 'mgr@test.com',
            password: 'pass',
            role: 'MANAGER',
          },
          TENANT_ID,
          'OWNER',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when locationId belongs to a different tenant', async () => {
      const prisma = makePrisma({
        location: { findFirst: jest.fn().mockResolvedValue(null) },
        user: {
          create: jest.fn(),
          findMany: jest.fn(),
          findFirst: jest.fn(),
          findUnique: jest.fn(),
          update: jest.fn(),
        },
      });
      const service = new UsersService(prisma);

      await expect(
        service.create(
          {
            name: 'Mgr',
            email: 'mgr@test.com',
            password: 'pass',
            role: 'MANAGER',
            locationId: OTHER_LOCATION_ID,
          },
          TENANT_ID,
          'OWNER',
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findAll', () => {
    it('should return only users of the tenant', async () => {
      const prisma = makePrisma();
      const service = new UsersService(prisma);

      await service.findAll(TENANT_ID, null);

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID },
        select: expect.any(Object),
      });
    });

    it('should filter by locationId for MANAGER', async () => {
      const prisma = makePrisma();
      const service = new UsersService(prisma);

      await service.findAll(TENANT_ID, LOCATION_ID);

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, locationId: LOCATION_ID },
        select: expect.any(Object),
      });
    });
  });

  describe('findOne', () => {
    it('should return the user when found', async () => {
      const prisma = makePrisma();
      const service = new UsersService(prisma);

      const result = await service.findOne(USER_ID, TENANT_ID, null);

      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when user not found', async () => {
      const prisma = makePrisma({
        user: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn(),
          findMany: jest.fn(),
          findUnique: jest.fn(),
          update: jest.fn(),
        },
      });
      const service = new UsersService(prisma);

      await expect(service.findOne(USER_ID, TENANT_ID, null)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateStatus', () => {
    it('should suspend a user when called by OWNER', async () => {
      const prisma = makePrisma();
      const service = new UsersService(prisma);

      await service.updateStatus(USER_ID, 'SUSPENDED', TENANT_ID, 'OWNER');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: USER_ID, tenantId: TENANT_ID },
        data: { status: 'SUSPENDED' },
        select: expect.any(Object),
      });
    });

    it('should throw ForbiddenException when ADMIN tries to suspend an OWNER', async () => {
      const prisma = makePrisma({
        user: {
          findFirst: jest
            .fn()
            .mockResolvedValue({ ...mockUser, role: 'OWNER' }),
          create: jest.fn(),
          findMany: jest.fn(),
          findUnique: jest.fn(),
          update: jest.fn(),
        },
      });
      const service = new UsersService(prisma);

      await expect(
        service.updateStatus(USER_ID, 'SUSPENDED', TENANT_ID, 'ADMIN'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
