import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import {
  Observable,
  from,
  switchMap,
  EMPTY,
  concatWith,
  ignoreElements,
  catchError,
} from 'rxjs';
import type { Request } from 'express';
import type { CurrentUserPayload } from '../decorators/current-user.decorator.js';
import { PrismaService } from '../../prisma/prisma.service.js';

/**
 * Interceptor global que establece el contexto de tenant en PostgreSQL
 * antes de ejecutar cualquier query del request.
 *
 * Fuentes de tenantId (en orden de prioridad):
 *   1. req.user.tenantId  — rutas autenticadas (JWT ya validado por JwtAuthGuard)
 *   2. X-Tenant-ID header — rutas pre-auth (login), seteado por el middleware
 *                           de Next.js al resolver el subdominio
 *
 * PostgreSQL aplica las políticas RLS usando current_tenant_id() que lee
 * el valor seteado aquí con set_config().
 */
@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: CurrentUserPayload }>();

    const tenantId =
      req.user?.tenantId ?? (req.headers['x-tenant-id'] as string | undefined);

    if (!tenantId) {
      return next.handle();
    }

    // clear$ completes synchronously within the Observable before it closes,
    // ensuring cleanup happens before NestJS sends the HTTP response and before
    // the next request can start (eliminates the async finalize race).
    const clear$ = from(this.prisma.clearTenantContext()).pipe(
      ignoreElements(),
      catchError(() => EMPTY),
    );

    return from(this.prisma.setTenantContext(tenantId)).pipe(
      switchMap(() => next.handle().pipe(concatWith(clear$))),
    );
  }
}
