import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { JwtService } from '@nestjs/jwt';
import type { ConfigService } from '@nestjs/config';
import type { AuditService } from '../audit/audit.service.js';
import type { Request } from 'express';

// Prevent Prisma from loading native binaries / connecting to DB during unit tests
jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('../../generated/prisma/client.js', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({})),
}));

const USER_ID = 'user-uuid-1';
const TENANT_ID = 'tenant-uuid-1';
const LOCATION_ID = 'location-uuid-1';
const HASHED_PASSWORD = bcrypt.hashSync('correct-password', 1);

const mockUser = {
  id: USER_ID,
  tenantId: TENANT_ID,
  locationId: LOCATION_ID,
  name: 'Test User',
  email: 'test@example.com',
  password: HASHED_PASSWORD,
  role: 'STAFF',
  phone: null,
  avatarUrl: null,
  status: 'ACTIVE',
};

function makePrisma(overrides: Record<string, unknown> = {}): PrismaService {
  return {
    user: {
      findFirst: jest.fn().mockResolvedValue(mockUser),
      findUnique: jest.fn().mockResolvedValue(mockUser),
      update: jest.fn().mockResolvedValue(mockUser),
    },
    ...overrides,
  } as unknown as PrismaService;
}

function makeJwt(): JwtService {
  return {
    sign: jest.fn().mockReturnValue('mock-token'),
  } as unknown as JwtService;
}

function makeConfig(): ConfigService {
  return {
    get: jest.fn().mockImplementation((key: string) => {
      const values: Record<string, string> = {
        JWT_SECRET: 'test-secret',
        JWT_EXPIRES_IN: '15m',
        JWT_REFRESH_SECRET: 'test-refresh-secret',
        JWT_REFRESH_EXPIRES_IN: '7d',
      };
      return values[key];
    }),
  } as unknown as ConfigService;
}

function makeAudit(): AuditService {
  return {
    log: jest.fn(),
  } as unknown as AuditService;
}

function makeRequest(): Request {
  return {
    ip: '127.0.0.1',
    get: jest.fn().mockReturnValue('Mozilla/5.0'),
  } as unknown as Request;
}

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwt: JwtService;
  let config: ConfigService;
  let audit: AuditService;
  let request: Request;

  beforeEach(() => {
    prisma = makePrisma();
    jwt = makeJwt();
    config = makeConfig();
    audit = makeAudit();
    request = makeRequest();
    service = new AuthService(prisma, jwt, config, audit, request);
  });

  describe('login()', () => {
    it('should return accessToken and refreshToken with valid credentials', async () => {
      const result = await service.login({
        email: 'test@example.com',
        password: 'correct-password',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException when user does not exist', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@example.com', password: 'any' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password is incorrect', async () => {
      await expect(
        service.login({
          email: 'test@example.com',
          password: 'wrong-password',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException when user is SUSPENDED', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        ...mockUser,
        status: 'SUSPENDED',
      });

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'correct-password',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('me()', () => {
    it('should return user profile without password field', async () => {
      const userWithoutPassword = {
        id: USER_ID,
        tenantId: TENANT_ID,
        locationId: LOCATION_ID,
        name: 'Test User',
        email: 'test@example.com',
        role: 'STAFF',
        phone: null,
        avatarUrl: null,
        status: 'ACTIVE',
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(
        userWithoutPassword,
      );

      const result = await service.me(USER_ID);

      expect(result).not.toHaveProperty('password');
      expect(result).toHaveProperty('id', USER_ID);
      expect(result).toHaveProperty('email', 'test@example.com');
    });

    it('should throw UnauthorizedException when userId does not exist', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.me('nonexistent-id')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('changePassword()', () => {
    it('should update password when currentPassword is correct', async () => {
      await service.changePassword(
        USER_ID,
        'correct-password',
        'new-password-123',
      );

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: USER_ID },
          data: expect.objectContaining({ password: expect.any(String) }),
        }),
      );
    });

    it('should throw UnauthorizedException when currentPassword is incorrect', async () => {
      await expect(
        service.changePassword(USER_ID, 'wrong-password', 'new-password-123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should hash the new password before saving', async () => {
      const newPassword = 'new-secure-password';
      await service.changePassword(USER_ID, 'correct-password', newPassword);

      const updateMock = prisma.user.update as jest.Mock;
      const updateCall = (
        updateMock.mock.calls as [{ data: { password: string } }][]
      )[0][0];
      const savedHash = updateCall.data.password;

      // The saved value must be a valid bcrypt hash of the new password
      const isValidHash = await bcrypt.compare(newPassword, savedHash);
      expect(isValidHash).toBe(true);
    });
  });

  describe('refresh()', () => {
    it('should return new tokens when userId is valid', async () => {
      const result = await service.refresh(USER_ID, 'old-refresh-token');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException when user does not exist', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.refresh('nonexistent-id', 'token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
