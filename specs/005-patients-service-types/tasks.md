# Tasks: Pacientes + Tipos de Servicio

**Branch**: `005-patients-service-types` | **Plan**: [plan.md](./plan.md)

---

## Phase 0 — Schemas en @repo/types

- [ ] **T-001** Crear `packages/types/src/patients.schemas.ts` con `CreatePatientSchema`, `UpdatePatientSchema`, `PatientQuerySchema`, `PatientResponseSchema`, `PaginatedPatientsResponseSchema`
- [ ] **T-002** Crear `packages/types/src/service-types.schemas.ts` con `CreateServiceTypeSchema`, `UpdateServiceTypeSchema`, `ServiceTypeResponseSchema`
- [ ] **T-003** Actualizar `packages/types/src/index.ts` — re-exportar nuevos schemas
- [ ] **T-004** Verificar que `@repo/types` compila: `pnpm --filter @repo/types build`

## Phase 1 — Migración de Prisma

- [ ] **T-005** Agregar campos `description String?` y `price Decimal?` al modelo `ServiceType` en `schema.prisma`
- [ ] **T-006** Ejecutar `npx prisma migrate dev --name add-service-type-fields` en `apps/api`
- [ ] **T-007** Regenerar cliente Prisma: `npx prisma generate`
- [ ] **T-008** Verificar que la migración aplica limpiamente contra la BD local

## Phase 2 — AuditDecorator (si no existe)

- [ ] **T-009** Crear `apps/api/src/common/decorators/audit.decorator.ts` — `@Audit({ action, resource })`
- [ ] **T-010** Crear `apps/api/src/common/interceptors/audit.interceptor.ts` — fire-and-forget, escribe en `AuditLog`
- [ ] **T-011** Registrar `AuditInterceptor` en `AppModule` (o dejarlo para aplicar por módulo según el plan)

## Phase 3 — ServiceTypesModule

- [ ] **T-012** Crear `apps/api/src/service-types/dto/create-service-type.dto.ts` y `update-service-type.dto.ts`
- [ ] **T-013** Escribir `service-types.service.spec.ts` — tests en rojo para `create`, `findAll`, `update`, `remove` (soft delete)
- [ ] **T-014** Implementar `ServiceTypesService` (Green): `tenantId` del JWT, soft delete con `status = INACTIVE`, listado solo de `ACTIVE`
- [ ] **T-015** Crear `ServiceTypesController` con `@UseGuards(JwtAuthGuard, RolesGuard)` y `@Roles()` por endpoint
- [ ] **T-016** Crear `ServiceTypesModule` y registrar en `AppModule`
- [ ] **T-017** Refactor si hay duplicación — re-run tests

## Phase 4 — PatientsModule

- [ ] **T-018** Crear `apps/api/src/patients/dto/create-patient.dto.ts`, `update-patient.dto.ts`, `patient-query.dto.ts`
- [ ] **T-019** Escribir `patients.service.spec.ts` — tests en rojo para:
  - `create` (transacción atómica paciente + consentimiento)
  - `findAll` (paginación, búsqueda, filtro por `locationId` para MANAGER/STAFF)
  - `findOne` (incluye pacientes DELETED para auditoría; 404 si no pertenece al tenant/location)
  - `update` (solo campos de contacto/notas)
  - `remove` (soft delete `status = DELETED`, solo OWNER/ADMIN)
- [ ] **T-020** Implementar `PatientsService` (Green)
  - `create`: `prisma.$transaction` → crea `Patient` + `PatientConsent` atómicamente
  - `findAll`: filtro `status = ACTIVE` por defecto, soporte `?include=deleted`, `locationId` para MANAGER/STAFF, paginación offset-based, búsqueda ilike por nombre
  - `findOne`: retorna el paciente con `hasConsent` calculado (COUNT sobre `PatientConsent` donde `revokedAt IS NULL`)
  - `update`: `prisma.patient.update` con campos permitidos
  - `remove`: `prisma.patient.update({ data: { status: 'DELETED' } })`
- [ ] **T-021** Crear `PatientsController` con `@UseGuards(JwtAuthGuard, RolesGuard)`, `@Roles()` y `@Audit()` en cada endpoint
- [ ] **T-022** Crear `PatientsModule` y registrar en `AppModule`
- [ ] **T-023** Refactor si hay duplicación — re-run tests

## Phase 5 — Gates finales

- [ ] **T-024** `pnpm lint` — cero errores y warnings
- [ ] **T-025** `pnpm check-types` — cero errores TypeScript
- [ ] **T-026** `pnpm --filter api test` — todos los unit tests en verde
- [ ] **T-027** Commit y PR a `main`
