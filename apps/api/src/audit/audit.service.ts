import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export interface AuditEntry {
  tenantId?: string;
  userId?: string;
  action: AuditActionValue;
  resource: string;
  resourceId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

// Mirror del enum de Prisma para evitar importar el cliente generado aquí
export type AuditActionValue =
  | 'CREATE'
  | 'READ'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'LOGIN_FAILED'
  | 'EXPORT'
  | 'CONSENT_GRANTED'
  | 'CONSENT_REVOKED';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra una entrada en la bitácora de auditoría.
   * El registro es asíncrono y no lanzable — un fallo de auditoría nunca
   * debe interrumpir la operación principal del usuario.
   */
  log(entry: AuditEntry): void {
    if (!entry.tenantId) return;

    const tenantId = entry.tenantId;

    // AuditLog is RLS-protected. The TenantInterceptor already cleared the
    // session context by the time this fire-and-forget runs, so we must
    // re-establish it inside an explicit transaction on its own connection.
    this.prisma
      .$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, false)`;
        await tx.auditLog.create({
          data: {
            tenantId,
            userId: entry.userId ?? null,
            action: entry.action,
            resource: entry.resource,
            resourceId: entry.resourceId ?? null,
            oldValues: (entry.oldValues as object) ?? undefined,
            newValues: (entry.newValues as object) ?? undefined,
            ipAddress: entry.ipAddress ?? null,
            userAgent: entry.userAgent ?? null,
          },
        });
      })
      .catch((err: unknown) => {
        console.error('[AuditService] Failed to write audit log:', err);
      });
  }
}
