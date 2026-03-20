# Implementation Plan: Pacientes + Tipos de Servicio

**Branch**: `005-patients-service-types` | **Date**: 2026-03-20 | **Spec**: [spec.md](./spec.md)

## Summary

Implementar el CRUD de `Patient` (con `PatientConsent` atómico) y `ServiceType` en el backend NestJS. Incluye aislamiento por `locationId` para MANAGER/STAFF, soft delete, auditoría NOM-004, paginación y búsqueda. Solo backend — el frontend (dashboard de pacientes) se aborda en un sprint posterior.

## Technical Context

**Language/Version**: TypeScript / Node.js 25
**Primary Dependencies**: NestJS, Prisma 7, nestjs-zod, `@repo/types`
**Storage**: PostgreSQL 16 con RLS habilitado en tablas `Patient`, `PatientConsent`, `ServiceType`
**Testing**: Jest (unit tests por servicio) — E2E opcional en sprint posterior
**Target Platform**: Node.js server (API REST)
**Project Type**: Backend API módule (NestJS)
**Performance Goals**: < 500 ms p95 en operaciones CRUD simples
**Constraints**: RLS activo, `tenantId` siempre del JWT (nunca del body)

## Constitution Check

| Principio | Estado |
|---|---|
| I. Multi-Tenant | ✅ `tenantId` del JWT, RLS en `Patient` + `PatientConsent` + `ServiceType` |
| II. Schema-First | ✅ Schemas en `@repo/types` antes de tocar backend |
| III. Test-First | ✅ Ciclo Red→Green→Refactor en cada servicio |
| IV. Regulatory | ✅ `PatientConsent` obligatorio, `@Audit()` en endpoints clínicos, soft delete |
| V. Security | ✅ `MANAGER`/`STAFF` filtrados por `locationId` en servicio |
| VI. Simplicity | ✅ Un módulo por recurso (`PatientsModule`, `ServiceTypesModule`) |

## Project Structure

### Documentación

```
specs/005-patients-service-types/
├── spec.md      ← requisitos y user stories
├── plan.md      ← este archivo
└── tasks.md     ← lista de tareas
```

### Código fuente

```
packages/types/src/
├── patients.schemas.ts      (nuevo)
├── service-types.schemas.ts (nuevo)
└── index.ts                 (actualizar exports)

apps/api/src/
├── patients/
│   ├── patients.module.ts
│   ├── patients.controller.ts
│   ├── patients.service.ts
│   ├── patients.service.spec.ts
│   └── dto/
│       ├── create-patient.dto.ts
│       ├── update-patient.dto.ts
│       └── patient-query.dto.ts
└── service-types/
    ├── service-types.module.ts
    ├── service-types.controller.ts
    ├── service-types.service.ts
    ├── service-types.service.spec.ts
    └── dto/
        ├── create-service-type.dto.ts
        └── update-service-type.dto.ts
```

## API Contracts

### Pacientes

| Método | Endpoint | Roles | Descripción |
|---|---|---|---|
| `POST` | `/api/patients` | OWNER, ADMIN, MANAGER, STAFF | Crear paciente + consentimiento (transacción) |
| `GET` | `/api/patients` | Todos | Listar pacientes del tenant/sucursal (paginado) |
| `GET` | `/api/patients/:id` | Todos | Obtener paciente por ID (incluye DELETED para auditoría) |
| `PATCH` | `/api/patients/:id` | OWNER, ADMIN, MANAGER, STAFF | Actualizar datos de contacto/notas |
| `DELETE` | `/api/patients/:id` | OWNER, ADMIN | Soft delete → `status = DELETED` |

### Tipos de Servicio

| Método | Endpoint | Roles | Descripción |
|---|---|---|---|
| `POST` | `/api/service-types` | OWNER, ADMIN | Crear tipo de servicio |
| `GET` | `/api/service-types` | Todos | Listar tipos ACTIVE del tenant |
| `PATCH` | `/api/service-types/:id` | OWNER, ADMIN | Actualizar nombre/descripción/precio |
| `DELETE` | `/api/service-types/:id` | OWNER, ADMIN | Soft delete → `status = INACTIVE` |

### Request/Response Bodies

**POST /api/patients**
```json
{
  "name": "María García López",
  "locationId": "uuid",
  "birthDate": "1980-05-15",
  "phone": "3312345678",
  "mobile": "3398765432",
  "address": "Calle Reforma 100, Guadalajara",
  "notes": "Paciente con hipertensión",
  "consent": {
    "type": "PRIVACY_NOTICE",
    "version": "v1.0",
    "ipAddress": "192.168.1.1"
  }
}
```

**Response (Patient)**
```json
{
  "id": "uuid",
  "tenantId": "uuid",
  "locationId": "uuid",
  "name": "María García López",
  "birthDate": "1980-05-15T00:00:00.000Z",
  "phone": "3312345678",
  "mobile": "3398765432",
  "address": "Calle Reforma 100, Guadalajara",
  "notes": "Paciente con hipertensión",
  "status": "ACTIVE",
  "hasConsent": true,
  "createdAt": "2026-03-20T00:00:00.000Z",
  "updatedAt": "2026-03-20T00:00:00.000Z"
}
```

**GET /api/patients** (query params: `?page=1&limit=20&search=García`)
```json
{
  "data": [ ...Patient[] ],
  "total": 45,
  "page": 1,
  "limit": 20
}
```

**POST /api/service-types**
```json
{
  "name": "Hemodiálisis estándar",
  "description": "Sesión de 4 horas",
  "price": 1500.00
}
```

## Notas de implementación

- **Transacción atómica** en `create()` de `PatientsService`: `prisma.$transaction([createPatient, createConsent])` — si falla el consentimiento, el paciente no se crea.
- **Filtro por locationId**: `PatientsService` recibe `locationId: string | null` del `@CurrentUser()`. Si no es null (MANAGER/STAFF), agrega `locationId` al `WHERE`.
- **`hasConsent`**: calculado en el servicio con un `COUNT` sobre `PatientConsent` donde `revokedAt IS NULL`. No es un campo en la BD — se computa en cada query de detalle.
- **Paginación**: offset-based simple (`skip = (page-1) * limit`, `take = limit`). Cursor-based en sprint posterior si el volumen lo requiere.
- **`@Audit()`**: decorator en todos los endpoints de pacientes. `ServiceType` no es dato clínico — no necesita auditoría.
- **Prisma schema**: `Patient.locationId` ya es requerido (`String`). `ServiceType` ya no tiene `price` ni `description` en el schema — hay que agregar esos campos con una migración.
