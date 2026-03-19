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
    this.prisma.auditLog
      .create({
        data: {
          tenantId: entry.tenantId ?? null,
          userId: entry.userId ?? null,
          action: entry.action,
          resource: entry.resource,
          resourceId: entry.resourceId ?? null,
          // Prisma 7 Json requires casting from Record<string,unknown>
          oldValues: (entry.oldValues as object) ?? undefined,
          newValues: (entry.newValues as object) ?? undefined,
          ipAddress: entry.ipAddress ?? null,
          userAgent: entry.userAgent ?? null,
        },
      })
      .catch((err: unknown) => {
        // El fallo de auditoría se registra en consola pero no interrumpe el flujo
        console.error('[AuditService] Failed to write audit log:', err);
      });
  }
}
