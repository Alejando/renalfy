# Feature Specification: Pacientes + Tipos de Servicio

**Feature Branch**: `005-patients-service-types`
**Created**: 2026-03-20
**Status**: Draft
**Sprint**: 5
**Scope**: Backend únicamente (NestJS + Prisma). Frontend en sprint posterior.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Registrar paciente con consentimiento (Priority: P1)

Como OWNER, ADMIN o STAFF, quiero registrar un nuevo paciente en mi clínica y capturar su consentimiento de privacidad al mismo tiempo, para cumplir con la LFPDPPP y poder crear citas y mediciones futuras.

**Why this priority**: Sin pacientes no existe el expediente clínico. Es el prerequisito de todo Módulo 1. Además, el consentimiento es obligatorio por ley antes de cualquier operación clínica.

**Independent Test**: Se puede probar haciendo `POST /api/patients` con datos válidos y verificando que se crea el paciente junto con su `PatientConsent`. Luego `GET /api/patients/:id` confirma que el registro existe.

**Acceptance Scenarios**:

1. **Given** un STAFF autenticado en `sucursal-a`, **When** hace `POST /api/patients` con `{ name, locationId, consent: { type, version } }`, **Then** crea el paciente con `tenantId` del JWT, crea el `PatientConsent` vinculado, y retorna `201` con el objeto del paciente.
2. **Given** un STAFF de `sucursal-a`, **When** intenta crear un paciente con `locationId` de `sucursal-b` (diferente tenant), **Then** retorna `404` (la ubicación no existe en su tenant).
3. **Given** un MANAGER de `sucursal-a`, **When** intenta crear un paciente con `locationId` de `sucursal-b` del mismo tenant, **Then** retorna `403` (solo puede crear pacientes en su propia sucursal).
4. **Given** un payload incompleto (sin `name`), **When** hace `POST /api/patients`, **Then** retorna `400` con detalle de validación.
5. **Given** un paciente creado, **When** se consulta `GET /api/patients/:id`, **Then** la respuesta incluye `hasConsent: true`.

---

### User Story 2 — Consultar y actualizar el expediente del paciente (Priority: P1)

Como usuario autenticado, quiero listar y consultar pacientes de mi clínica/sucursal para gestionar el flujo clínico diario, y actualizar datos de contacto cuando el paciente los cambia.

**Why this priority**: El listado y detalle de pacientes es la operación más frecuente del sistema. Sin esto el dashboard médico no tiene sentido.

**Independent Test**: Se puede probar autenticando como MANAGER de `sucursal-a`, listando pacientes (`GET /api/patients`), y verificando que solo aparecen los de esa sucursal — nunca los de `sucursal-b`.

**Acceptance Scenarios**:

1. **Given** un OWNER autenticado, **When** hace `GET /api/patients`, **Then** recibe todos los pacientes ACTIVE del tenant, paginados.
2. **Given** un MANAGER de `sucursal-a`, **When** hace `GET /api/patients`, **Then** recibe solo los pacientes de `sucursal-a`.
3. **Given** un MANAGER de `sucursal-a`, **When** hace `GET /api/patients/:id` con ID de un paciente de `sucursal-b`, **Then** retorna `404`.
4. **Given** un STAFF autenticado, **When** hace `PATCH /api/patients/:id` con `{ phone, address }`, **Then** actualiza los campos y retorna `200`.
5. **Given** un STAFF, **When** intenta `PATCH /api/patients/:id` de un paciente de otra sucursal, **Then** retorna `404`.
6. **Given** un MANAGER, **When** hace `GET /api/patients?search=García`, **Then** retorna pacientes cuyo nombre contiene "García" (case-insensitive), filtrados a su sucursal.

---

### User Story 3 — Dar de baja un paciente (Priority: P2)

Como OWNER o ADMIN, quiero marcar un paciente como inactivo o eliminado (sin borrar físicamente el registro) para cumplir con NOM-004 (retención 5 años) y mantener el historial clínico intacto.

**Why this priority**: La baja lógica es necesaria para la gestión del padrón activo, pero no es crítica para el flujo clínico diario. P2 porque no bloquea P1.

**Independent Test**: `DELETE /api/patients/:id` → retorna `200`, el paciente queda con `status = DELETED`, pero sigue apareciendo en `GET /api/patients/:id` y sus registros clínicos siguen intactos.

**Acceptance Scenarios**:

1. **Given** un OWNER autenticado, **When** hace `DELETE /api/patients/:id`, **Then** el paciente cambia a `status = DELETED` y retorna `200`.
2. **Given** un STAFF, **When** intenta `DELETE /api/patients/:id`, **Then** retorna `403` (solo OWNER/ADMIN pueden dar de baja).
3. **Given** un paciente con `status = DELETED`, **When** se consulta `GET /api/patients`, **Then** no aparece en el listado por defecto (a menos que se filtre con `?include=deleted`).
4. **Given** un paciente con `status = DELETED`, **When** se consulta `GET /api/patients/:id`, **Then** retorna `200` con el registro completo (para auditoría).

---

### User Story 4 — OWNER/ADMIN gestiona el catálogo de tipos de servicio (Priority: P2)

Como OWNER o ADMIN, quiero crear y mantener el catálogo de tipos de servicio (p.ej. "Hemodiálisis estándar", "Hemodiálisis nocturna") para usarlos en recibos y citas.

**Why this priority**: Los tipos de servicio son necesarios para los recibos (Sprint 7) y citas (Sprint 6), pero pueden configurarse antes. P2 porque su ausencia no bloquea el registro de pacientes.

**Independent Test**: `POST /api/service-types` → crea el tipo, `GET /api/service-types` → lo lista, `PATCH /api/service-types/:id/status` → lo desactiva.

**Acceptance Scenarios**:

1. **Given** un OWNER autenticado, **When** hace `POST /api/service-types` con `{ name, description?, price? }`, **Then** crea el tipo con `tenantId` del JWT y retorna `201`.
2. **Given** un OWNER autenticado, **When** hace `GET /api/service-types`, **Then** recibe todos los tipos ACTIVE del tenant.
3. **Given** un OWNER autenticado, **When** hace `PATCH /api/service-types/:id` con `{ name }`, **Then** actualiza el nombre y retorna `200`.
4. **Given** un OWNER autenticado, **When** hace `DELETE /api/service-types/:id`, **Then** el tipo cambia a `status = INACTIVE` (soft delete).
5. **Given** un STAFF, **When** intenta `POST /api/service-types`, **Then** retorna `403`.
6. **Given** un MANAGER, **When** hace `GET /api/service-types`, **Then** recibe los tipos ACTIVE del tenant (los tipos de servicio son visibles a nivel tenant, no por sucursal).

---

### Edge Cases

- ¿Qué pasa si se intenta crear una cita o medición para un paciente sin `PatientConsent` activo? → `403 Forbidden` con mensaje claro (validado en servicio, no en controller).
- ¿Qué pasa si se intenta registrar un paciente con `locationId` que pertenece a otro tenant? → La RLS de PostgreSQL bloquea el read de esa `Location`, el servicio lanza `NotFoundException`.
- ¿Puede un paciente tener múltiples `PatientConsent`? → Sí (múltiples versiones de aviso de privacidad). Solo se verifica que al menos uno tenga `revokedAt IS NULL`.
- ¿Qué pasa con los registros clínicos de un paciente dado de baja? → Se conservan intactos (NOM-004 retención 5 años).
- ¿Puede un `ServiceType` con `INACTIVE` usarse en nuevas citas/recibos? → No. El servicio de citas/recibos debe validar que el tipo esté `ACTIVE`.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Al crear un paciente, el sistema DEBE crear simultáneamente (en transacción atómica) un `PatientConsent` con los datos del aviso firmado.
- **FR-002**: Los pacientes son tenant-scoped; `MANAGER` y `STAFF` solo pueden leer/escribir pacientes de su `locationId`.
- **FR-003**: Los pacientes nunca se borran físicamente — solo `status = DELETED` (NOM-004: retención mínima 5 años).
- **FR-004**: Toda creación, modificación y acceso a expedientes de pacientes DEBE registrarse en `AuditLog` (NOM-004 + NOM-024).
- **FR-005**: La respuesta de `GET /api/patients` incluye `hasConsent: boolean` para saber rápidamente si el paciente tiene consentimiento activo.
- **FR-006**: `GET /api/patients` soporta paginación (`?page=1&limit=20`) y búsqueda por nombre (`?search=texto`).
- **FR-007**: `ServiceType` es tenant-scoped pero visible para todos los roles (lectura); escritura solo para `OWNER` y `ADMIN`.
- **FR-008**: Un `ServiceType` con `status = INACTIVE` no puede usarse en nuevas citas ni recibos (validación en el servicio correspondiente, no aquí).

### Key Entities

- **Patient**: Paciente de la clínica. Atributos: `tenantId`, `locationId`, `name`, `birthDate?`, `address?`, `phone?`, `mobile?`, `notes?`, `status (ACTIVE|INACTIVE|DELETED)`.
- **PatientConsent**: Registro de consentimiento informado. Atributos: `tenantId`, `patientId`, `type (PRIVACY_NOTICE)`, `version`, `grantedAt`, `revokedAt?`, `ipAddress?`, `signatureUrl?`.
- **ServiceType**: Tipo de servicio médico ofrecido por el tenant. Atributos: `tenantId`, `name`, `description?`, `price?`, `status (ACTIVE|INACTIVE)`.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `POST /api/patients` crea paciente y consentimiento en una sola llamada y retorna `201` en menos de 500 ms.
- **SC-002**: `GET /api/patients` de un MANAGER nunca retorna pacientes de otra sucursal, verificado por tests de aislamiento.
- **SC-003**: Un paciente con `status = DELETED` no aparece en listados por defecto; sus datos siguen accesibles para auditoría.
- **SC-004**: `pnpm lint && pnpm check-types && pnpm test` pasan sin errores al completar el sprint.
- **SC-005**: Todo endpoint que accede a datos de pacientes tiene `@Audit()` decorator.
- **SC-006**: La eliminación de un paciente (soft delete) no borra ningún registro clínico asociado.
