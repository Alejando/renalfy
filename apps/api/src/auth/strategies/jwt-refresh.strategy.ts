import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(config: ConfigService) {
    const secret = config.get<string>('JWT_REFRESH_SECRET');
    if (!secret) {
      throw new Error(
        'JWT_REFRESH_SECRET is not configured. This is a critical security requirement.',
      );
    }
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      secretOrKey: secret,
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: { sub: string }) {
    const body = req.body as Record<string, unknown>;
    const refreshToken =
      typeof body['refreshToken'] === 'string' ? body['refreshToken'] : '';
    return { userId: payload.sub, refreshToken };
  }
}
