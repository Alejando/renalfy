# Implementation Plan: Citas/Sesiones con Formulario Dinámico

**Branch**: `006-appointments-dynamic-form` | **Date**: 2026-03-20 | **Spec**: [spec.md](./spec.md)

## Summary

Implementar el CRUD de `Appointment` (con validación de consentimiento y transiciones de estado) y `ClinicalTemplate` (upsert por tipo de servicio) en el backend NestJS. Incluye registro de `Measurement` durante sesiones activas, validación de `clinicalData` contra la plantilla, inmutabilidad NOM-004, aislamiento por `locationId` para MANAGER/STAFF, y auditoría completa. Solo backend — el frontend (dashboard de agenda) se aborda en sprint posterior.

## Technical Context

**Language/Version**: TypeScript / Node.js 25
**Primary Dependencies**: NestJS, Prisma 7, nestjs-zod, `@repo/types`
**Storage**: PostgreSQL 16 con RLS — modelos `Appointment`, `Measurement`, `ClinicalTemplate` ya existen
**Testing**: Jest (unit tests por servicio)
**Target Platform**: Node.js server (API REST)
**Project Type**: Backend API module (NestJS)
**Performance Goals**: < 500 ms p95 en operaciones CRUD simples
**Constraints**: RLS activo, `tenantId` del JWT, NOM-004 (inmutabilidad COMPLETED + Measurement), consentimiento activo obligatorio

## Constitution Check

| Principio | Estado |
|---|---|
| I. Multi-Tenant | ✅ `tenantId` del JWT, RLS en `Appointment` + `Measurement` + `ClinicalTemplate` |
| II. Schema-First | ✅ Schemas en `@repo/types` antes de tocar backend |
| III. Test-First | ✅ Red → Green → Refactor en cada servicio |
| IV. Regulatory | ✅ Consentimiento verificado en create, COMPLETED inmutable, `@Audit()` en todos los endpoints clínicos |
| V. Security | ✅ MANAGER/STAFF filtrados por `locationId` en servicio |
| VI. Simplicity | ✅ Dos módulos: `AppointmentsModule`, `ClinicalTemplatesModule` |

## Project Structure

### Documentación

```
specs/006-appointments-dynamic-form/
├── spec.md
├── plan.md           ← este archivo
├── research.md
├── data-model.md
├── contracts/
│   └── api.md
└── tasks.md
```

### Código fuente

```
packages/types/src/
├── appointments.schemas.ts      (nuevo)
├── clinical-templates.schemas.ts (nuevo)
└── index.ts                     (actualizar exports)

apps/api/src/
├── appointments/
│   ├── appointments.module.ts
│   ├── appointments.controller.ts
│   ├── appointments.service.ts
│   ├── appointments.service.spec.ts
│   └── dto/
│       ├── create-appointment.dto.ts
│       ├── update-appointment-status.dto.ts
│       ├── create-measurement.dto.ts
│       └── appointment-query.dto.ts
└── clinical-templates/
    ├── clinical-templates.module.ts
    ├── clinical-templates.controller.ts
    ├── clinical-templates.service.ts
    ├── clinical-templates.service.spec.ts
    └── dto/
        └── upsert-clinical-template.dto.ts
```

## API Contracts

Ver detalle completo en [contracts/api.md](./contracts/api.md).

### Appointments

| Método | Endpoint | Roles | Descripción |
|---|---|---|---|
| `POST` | `/api/appointments` | OWNER, ADMIN, MANAGER, STAFF | Crear cita (valida consentimiento + plantilla) |
| `GET` | `/api/appointments` | Todos | Listar citas paginadas con filtros |
| `GET` | `/api/appointments/:id` | Todos | Obtener cita con mediciones incluidas |
| `PATCH` | `/api/appointments/:id/status` | OWNER, ADMIN, MANAGER, STAFF | Transicionar estado |
| `POST` | `/api/appointments/:id/measurements` | OWNER, ADMIN, MANAGER, STAFF | Agregar medición (solo IN_PROGRESS) |

### Clinical Templates

| Método | Endpoint | Roles | Descripción |
|---|---|---|---|
| `POST` | `/api/clinical-templates` | OWNER, ADMIN | Crear o actualizar plantilla (upsert) |
| `GET` | `/api/clinical-templates` | Todos | Listar plantillas del tenant |
| `GET` | `/api/clinical-templates/:id` | Todos | Obtener plantilla por ID |

## Notas de implementación

### AppointmentsService

- **Validación de consentimiento en `create()`**: `prisma.patientConsent.findFirst({ where: { patientId, tenantId, revokedAt: null } })` — si no existe, `ForbiddenException`.
- **Validación de `clinicalData`**: si `serviceTypeId` tiene plantilla, iterar `fields` y verificar que todos los `required: true` estén presentes en `clinicalData`. Lanzar `BadRequestException` con lista de campos faltantes.
- **Transiciones de estado**: constante `VALID_TRANSITIONS` en el servicio. `ConflictException` si origen es `COMPLETED`. `BadRequestException` si la transición no está en el mapa.
- **`startedAt` / `endedAt`**: seteados automáticamente en `updateStatus()`.
- **Inmutabilidad COMPLETED**: verificar `current.status === 'COMPLETED'` antes de cualquier update. Lanzar `ConflictException`.
- **`measurements` en `findOne()`**: incluir con Prisma `include: { measurements: true }`.

### ClinicalTemplatesService

- **Upsert**: `prisma.clinicalTemplate.upsert({ where: { serviceTypeId }, create: {...}, update: {...} })`. RLS garantiza el aislamiento por tenant.
- **Validar `serviceTypeId`**: verificar que existe y es `ACTIVE` en el tenant antes del upsert.

### `@Audit()`

- Todos los endpoints de `AppointmentsController` y el `POST /api/clinical-templates` requieren `@Audit()`.
- `GET` de clinical templates no necesita auditoría (no es dato sensible del paciente).

### Prisma — Sin migración necesaria

Los tres modelos ya existen en el schema. Solo se necesita `prisma generate` si se agrega alguna relación. En este sprint no hay cambios de schema.

### Estructura de `ClinicalTemplate.fields` (JSON)

```typescript
type FieldType = 'text' | 'number' | 'boolean' | 'select';

interface TemplateField {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[]; // Solo para type = 'select'
}
```
