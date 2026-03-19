import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import type { Request } from 'express';
import {
  AUDIT_KEY,
  type AuditMetadata,
} from '../decorators/audit.decorator.js';
import { AuditService } from '../../audit/audit.service.js';
import type { CurrentUserPayload } from '../decorators/current-user.decorator.js';

/**
 * Interceptor global que registra en AuditLog los endpoints marcados con @Audit().
 * Solo registra tras una respuesta exitosa (no registra errores de validación).
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const metadata = this.reflector.get<AuditMetadata | undefined>(
      AUDIT_KEY,
      context.getHandler(),
    );

    if (!metadata) {
      return next.handle();
    }

    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: CurrentUserPayload }>();

    const user = req.user;
    const resourceId = (req.params as Record<string, string>)['id'];
    const ipAddress = req.ip ?? req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    return next.handle().pipe(
      tap(() => {
        this.auditService.log({
          tenantId: user?.tenantId,
          userId: user?.userId,
          action: metadata.action,
          resource: metadata.resource,
          resourceId,
          ipAddress,
          userAgent,
        });
      }),
    );
  }
}
