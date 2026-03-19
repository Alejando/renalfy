import { SetMetadata } from '@nestjs/common';
import type { AuditActionValue } from '../../audit/audit.service.js';

export interface AuditMetadata {
  action: AuditActionValue;
  resource: string;
}

export const AUDIT_KEY = 'audit';

/**
 * Marca un endpoint para que el AuditInterceptor registre automáticamente
 * la acción en la bitácora.
 *
 * @example
 * @Audit({ action: 'UPDATE', resource: 'Patient' })
 * @Patch(':id')
 * update(@Param('id') id: string, @Body() dto: UpdatePatientDto) { ... }
 */
export const Audit = (metadata: AuditMetadata) =>
  SetMetadata(AUDIT_KEY, metadata);
