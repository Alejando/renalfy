import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { REQUEST } from '@nestjs/core';
import * as bcrypt from 'bcrypt';
import type ms from 'ms';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { LoginDto } from './dto/login.dto.js';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    @Inject(REQUEST) private readonly request: Request,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email },
    });

    const isPasswordValid =
      user && (await bcrypt.compare(dto.password, user.password));

    if (!user || !isPasswordValid) {
      // Log failed login attempt
      this.audit.log({
        tenantId: undefined, // Login fails before we know tenant
        userId: undefined,
        action: 'LOGIN_FAILED',
        resource: 'Auth',
        resourceId: dto.email,
        oldValues: { reason: user ? 'invalid_password' : 'user_not_found' },
        ipAddress: this.request.ip,
        userAgent: this.request.get('user-agent'),
      });

      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (user.status === 'SUSPENDED') {
      // Log suspended account login attempt
      this.audit.log({
        tenantId: user.tenantId,
        userId: user.id,
        action: 'LOGIN_FAILED',
        resource: 'Auth',
        resourceId: user.id,
        oldValues: { reason: 'account_suspended' },
        ipAddress: this.request.ip,
        userAgent: this.request.get('user-agent'),
      });

      throw new ForbiddenException('Cuenta suspendida');
    }

    // Log successful login
    this.audit.log({
      tenantId: user.tenantId,
      userId: user.id,
      action: 'LOGIN',
      resource: 'Auth',
      resourceId: user.id,
      ipAddress: this.request.ip,
      userAgent: this.request.get('user-agent'),
    });

    const tokens = this.generateTokens(
      user.id,
      user.tenantId,
      user.role,
      user.locationId,
    );

    // Store hashed refresh token for revocation & single-use enforcement
    const refreshTokenHash = await bcrypt.hash(
      tokens.refreshToken,
      BCRYPT_ROUNDS,
    );
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash },
    });

    return tokens;
  }

  async refresh(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    // Validate refresh token against stored hash
    if (!user.refreshTokenHash) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    const isValid = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!isValid) {
      // Revoke all tokens on failed refresh attempt (possible token theft)
      await this.prisma.user.update({
        where: { id: userId },
        data: { refreshTokenHash: null },
      });
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Rotate tokens: issue new pair, store new hash
    const tokens = this.generateTokens(
      user.id,
      user.tenantId,
      user.role,
      user.locationId,
    );

    const newHash = await bcrypt.hash(tokens.refreshToken, BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: newHash },
    });

    return tokens;
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        tenantId: true,
        locationId: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        avatarUrl: true,
        status: true,
      },
    });
    if (!user) throw new UnauthorizedException();
    return user;
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) throw new UnauthorizedException('Contraseña actual incorrecta');

    const hashed = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashed,
        refreshTokenHash: null, // Revoke all existing refresh tokens
      },
    });
  }

  async logout(userId: string) {
    // Revoke all refresh tokens for this user
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
  }

  private generateTokens(
    userId: string,
    tenantId: string,
    role: string,
    locationId: string | null,
  ) {
    const payload = { sub: userId, tenantId, role, locationId };

    const accessToken = this.jwt.sign(payload, {
      secret: this.config.get<string>('JWT_SECRET'),
      expiresIn: (this.config.get('JWT_EXPIRES_IN') ?? '15m') as ms.StringValue,
    });

    const refreshToken = this.jwt.sign(
      { sub: userId },
      {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: (this.config.get('JWT_REFRESH_EXPIRES_IN') ??
          '7d') as ms.StringValue,
      },
    );

    return { accessToken, refreshToken };
  }
}
