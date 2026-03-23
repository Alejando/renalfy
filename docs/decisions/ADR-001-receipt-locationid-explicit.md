# ADR-001: Mantener `locationId` explícito en Receipt

**Date:** 2026-03-22
**Status:** Accepted
**Author:** Architect

## Context

En el módulo de recibos surge la pregunta: ¿Es necesario guardar `locationId` en `Receipt` si un `Patient` ya tiene una ubicación?

El análisis inicial sugiere que `locationId` podría derivarse del paciente para evitar redundancia. Sin embargo, existen consideraciones arquitectónicas e implementativas que hacen que esta conclusión sea incorrecta.

## Decision

**Mantener `locationId` como campo explícito y obligatorio en `Receipt`.**

### Implementación recomendada

Para roles `MANAGER` y `STAFF`:
- `locationId` **NO** se solicita en el DTO (invisible para el usuario)
- El backend **fija automáticamente** `locationId = user.locationId`
- El backend **valida** que no haya discrepancia

Para roles `OWNER` y `ADMIN`:
- `locationId` **es requerido** en el DTO (dropdown de sucursales)

```ts
export const CreateReceiptSchema = z.object({
  patientId: z.string().uuid(),
  locationId: z.string().uuid().optional(),  // Opcional
  serviceTypeId: z.string().uuid().optional(),
  appointmentId: z.string().uuid().optional(),
  planId: z.string().uuid().optional(),
  date: z.coerce.date(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  paymentType: PaymentTypeSchema,
  notes: z.string().optional(),
});
```

En backend (pseudocódigo):
```ts
async create(
  dto: CreateReceiptDto,
  tenantId: string,
  userId: string,
  userLocationId: string | null,
) {
  // Determinar locationId efectiva
  const locationId = userLocationId ?? dto.locationId;
  if (!locationId) {
    throw new BadRequestException('locationId es requerido para OWNER/ADMIN');
  }

  // Validar que OWNER/ADMIN no intenten crear en ubicación ajena
  if (userLocationId !== null && userLocationId !== locationId) {
    throw new ForbiddenException('No tiene acceso a esta sucursal');
  }

  // Resto de lógica usa locationId...
}
```

## Rationale

### 1. **Generación atómica del folio**

El folio tiene formato `{LOC}-{YYYY}-{NNNNN}` y se genera desde `ReceiptFolioCounter`:
```
@@unique([tenantId, locationId, year])
```

Si `locationId` se derivara del paciente:
- Query 1: Obtener `patientId` del DTO
- Query 2: Buscar `Patient` para extraer `locationId`
- Query 3: Actualizar `ReceiptFolioCounter`

Actual (con `locationId` explícito):
- Query 1: Actualizar `ReceiptFolioCounter` directamente (en transacción)

**Beneficio:** Una query menos, latencia reducida, transacción más simple.

### 2. **Row-Level Security (RLS) por sucursal**

`MANAGER`/`STAFF` solo tienen acceso a datos de su `locationId`. El control está implementado así:

```ts
if (userLocationId !== null && dto.locationId !== userLocationId) {
  throw new NotFoundException('Location not found or not accessible');
}
```

Si `locationId` se derivara del paciente:
- Un usuario pasaría solo `patientId`
- El backend buscaría el paciente y obtendría su `locationId`
- **Nunca se ejecutaría el filtro de acceso**
- Un `MANAGER` de sucursal A podría crear recibos para pacientes de sucursal B

**Riesgo crítico:** Pérdida de aislamiento multi-tenant por sucursal.

### 3. **Reportes y cortes de caja por sucursal**

`CashClose` es específico a una sucursal:
```
CashClose { tenantId, locationId, periodStart, periodEnd, ... }
```

Para calcular totales en un corte de caja:
```sql
SELECT SUM(amount) FROM receipt
WHERE tenantId = ? AND locationId = ? AND date BETWEEN ? AND ?
```

Si `locationId` se derivara del paciente, ¿qué sucursal se usa si un paciente histórico se atiende en otra sucursal? **Ambigüedad.** Con `locationId` explícito, es claro: la sucursal donde se prestó el servicio.

### 4. **Flexibilidad futura**

Aunque hoy cada `Patient` tiene un `locationId` fijo, casos de uso futuros podrían incluir:
- Pacientes que se atienden en múltiples sucursales
- Cambio temporal de ubicación sin modificar el registro del paciente

Con `locationId` explícito en `Receipt`, estos casos se soportan sin cambio de schema. Si se derivara del paciente, se requeriría migración compleja.

## Alternatives Considered

### A. Derivar `locationId` del `Patient`
- **Pros:** Una columna menos en la tabla
- **Cons:**
  - Requiere query adicional para el folio
  - Rompe control de acceso por sucursal
  - Ambigüedad en reportes
  - Inflexible para casos futuros

### B. Mantener `locationId` pero permitir que difiera del paciente
- **Pros:** Máxima flexibilidad
- **Cons:** Complejidad: ¿cuál sucursal se considera la "activa" del paciente?
- **Decisión:** No, mantener restricción: `receipt.locationId === patient.locationId`

## Consequences

1. **UI: Formulario de creación de recibos**
   - Para `MANAGER`/`STAFF`: NO mostrar selector de sucursal (está fija a su ubicación)
   - Para `OWNER`/`ADMIN`: SÍ mostrar dropdown de sucursales (pero con validación)

2. **Schema Zod**
   - `locationId` en `CreateReceiptSchema` es optional (se rellena en backend para roles menores)

3. **Validaciones**
   - Backend: Validar siempre que `receipt.locationId === patient.locationId`
   - Backend: Validar siempre que `user.locationId === receipt.locationId` (si usuario tiene ubicación)

4. **API Response**
   - `locationId` se incluye en `ReceiptResponse` (necesario para reportes)

5. **Migración (si aplica)**
   - N/A: `locationId` ya existe en `Receipt`

## Links

- Spec: `docs/specs/receipts.md` (por crear si no existe)
- Schema Prisma: `apps/api/prisma/schema.prisma` (modelo `Receipt`)
- Zod schemas: `packages/types/src/receipts.schemas.ts`
- Service: `apps/api/src/receipts/receipts.service.ts`
