import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import type ms from 'ms';
import { PrismaService } from '../prisma/prisma.service.js';
import type { LoginDto } from './dto/login.dto.js';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email },
    });

    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (user.status === 'SUSPENDED') {
      throw new ForbiddenException('Cuenta suspendida');
    }

    return this.generateTokens(
      user.id,
      user.tenantId,
      user.role,
      user.locationId,
    );
  }

  async refresh(userId: string, _refreshToken: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    // In a production app store the hashed refresh token in DB and validate here
    return this.generateTokens(
      user.id,
      user.tenantId,
      user.role,
      user.locationId,
    );
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
      data: { password: hashed },
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
