# Tasks: Citas/Sesiones con Formulario Dinámico

**Input**: Design documents from `specs/006-appointments-dynamic-form/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/api.md ✅

**Tests**: TDD obligatorio — Red → Green → Refactor por cada story (ver CLAUDE.md).

**Organization**: Tasks agrupadas por user story para implementación y testing independiente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: User story a la que pertenece (US1–US5)
- Paths exactos incluidos en cada descripción

---

## Phase 1: Setup — Schemas en @repo/types

**Purpose**: Definir los Zod schemas en `packages/types` antes de tocar el backend. Son la única fuente de verdad para validación y tipos en todo el monorepo.

- [x] T001 Crear `packages/types/src/appointments.schemas.ts` con `CreateAppointmentSchema` (patientId, locationId, serviceTypeId?, scheduledAt, clinicalData?, notes?), `UpdateAppointmentStatusSchema` (status, notes?), `AppointmentQuerySchema` (page, limit, date?, status?, patientId?), `CreateMeasurementSchema` (recordedAt, data, notes?) y sus tipos inferidos
- [x] T002 [P] Crear `packages/types/src/clinical-templates.schemas.ts` con `TemplateFieldSchema` (key, label, type, required, options?), `UpsertClinicalTemplateSchema` (serviceTypeId, fields[]) y sus tipos inferidos
- [x] T003 Actualizar `packages/types/src/index.ts` para re-exportar los schemas de appointments y clinical-templates

---

## Phase 2: Foundational — DTOs, módulos y registro

**Purpose**: Scaffolding completo de ambos módulos NestJS. Debe completarse antes de cualquier user story.

**⚠️ CRÍTICO**: Ningún trabajo de user story puede comenzar hasta que esta fase esté completa.

- [x] T004 Crear los cuatro DTOs de appointments en `apps/api/src/appointments/dto/`: `create-appointment.dto.ts`, `update-appointment-status.dto.ts`, `appointment-query.dto.ts`, `create-measurement.dto.ts` — cada uno con `createZodDto` sobre el schema correspondiente de `@repo/types`
- [x] T005 [P] Crear `apps/api/src/clinical-templates/dto/upsert-clinical-template.dto.ts` con `createZodDto(UpsertClinicalTemplateSchema)`
- [x] T006 Crear scaffold de `AppointmentsModule` en `apps/api/src/appointments/`: `appointments.module.ts` (registra controller y service), `appointments.controller.ts` (clase vacía con `@Controller('appointments')`), `appointments.service.ts` (clase vacía con inyección de `PrismaService`), `appointments.service.spec.ts` (describe vacío listo para tests)
- [x] T007 [P] Crear scaffold de `ClinicalTemplatesModule` en `apps/api/src/clinical-templates/`: `clinical-templates.module.ts`, `clinical-templates.controller.ts`, `clinical-templates.service.ts`, `clinical-templates.service.spec.ts`
- [x] T008 Registrar `AppointmentsModule` y `ClinicalTemplatesModule` en `apps/api/src/app.module.ts`

**Checkpoint**: Foundation lista — ambos módulos resuelven en la app sin errores de compilación.

---

## Phase 3: User Story 1 — Agendar una cita para un paciente (Priority: P1) 🎯 MVP

**Goal**: `POST /api/appointments` crea una cita con validación de consentimiento activo, scope de sucursal para MANAGER/STAFF, y validación de `clinicalData` contra la plantilla clínica del tipo de servicio.

**Independent Test**: Crear una cita con `POST /api/appointments` y verificar que existe con `GET /api/appointments/:id`. Si el tipo de servicio tiene plantilla, `clinicalData` debe reflejar los datos ingresados.

### Tests para User Story 1 — escribir primero, deben fallar (Red) ⚠️

> **IMPORTANTE**: Estos tests DEBEN fallar antes de escribir la implementación.

- [x] T009 [US1] Escribir tests unitarios fallidos para `AppointmentsService.create()` en `apps/api/src/appointments/appointments.service.spec.ts`: (a) crea cita con status SCHEDULED y tenantId del JWT, (b) lanza `ForbiddenException` si el paciente no tiene consentimiento activo, (c) lanza `NotFoundException` si el paciente no pertenece al location del MANAGER, (d) lanza `BadRequestException` si serviceType está INACTIVE, (e) lanza `BadRequestException` si `clinicalData` omite campos `required` de la plantilla, (f) crea cita con `clinicalData = null` si no hay plantilla

### Implementación de User Story 1 (Green)

- [x] T010 [US1] Implementar `AppointmentsService.create()` en `apps/api/src/appointments/appointments.service.ts`: verificar consentimiento activo, verificar serviceType ACTIVE, validar `clinicalData` contra plantilla si existe, crear la cita con `tenantId`/`userId` del JWT, filtrar paciente por `locationId` para MANAGER/STAFF
- [x] T011 [US1] Implementar `POST /api/appointments` en `apps/api/src/appointments/appointments.controller.ts` con `@UseGuards(JwtAuthGuard)`, `@Audit({ action: 'CREATE', resource: 'Appointment' })`, `@Body() dto: CreateAppointmentDto` y `@CurrentUser()` — retorna 201

**Checkpoint**: `POST /api/appointments` funciona end-to-end con validaciones de consentimiento y plantilla.

---

## Phase 4: User Story 2 — Gestionar el estado de una cita (Priority: P1)

**Goal**: `PATCH /api/appointments/:id/status` aplica transiciones de estado válidas, registra `startedAt`/`endedAt` automáticamente y bloquea modificaciones a citas COMPLETED (NOM-004).

**Independent Test**: Crear cita (SCHEDULED) → avanzar a IN_PROGRESS → avanzar a COMPLETED. Verificar que cada transición retorna el nuevo estado y que transiciones inválidas retornan 400/409.

### Tests para User Story 2 — escribir primero (Red) ⚠️

- [x] T012 [US2] Escribir tests unitarios fallidos para `AppointmentsService.updateStatus()` en `apps/api/src/appointments/appointments.service.spec.ts`: (a) SCHEDULED → IN_PROGRESS registra `startedAt`, (b) IN_PROGRESS → COMPLETED registra `endedAt`, (c) SCHEDULED → CANCELLED acepta notes, (d) COMPLETED → cualquier estado lanza `ConflictException`, (e) SCHEDULED → COMPLETED (saltando IN_PROGRESS) lanza `BadRequestException`, (f) cita de otro location lanza `NotFoundException`

### Implementación de User Story 2 (Green)

- [x] T013 [US2] Implementar constante `VALID_TRANSITIONS` y `AppointmentsService.updateStatus()` en `apps/api/src/appointments/appointments.service.ts`: guardia COMPLETED inmutable, lookup de transición válida, auto-set de `startedAt`/`endedAt`, filtro por `locationId` para MANAGER/STAFF
- [x] T014 [US2] Implementar `PATCH /api/appointments/:id/status` en `apps/api/src/appointments/appointments.controller.ts` con `@UseGuards(JwtAuthGuard)`, `@Audit({ action: 'UPDATE', resource: 'Appointment' })`, `@Body() dto: UpdateAppointmentStatusDto` — retorna 200

**Checkpoint**: Ciclo completo de estados funciona con todas las restricciones de inmutabilidad.

---

## Phase 5: User Story 3 — Consultar citas y filtrar (Priority: P1)

**Goal**: `GET /api/appointments` retorna citas paginadas con filtros por `date`, `status`, `patientId`. `GET /api/appointments/:id` retorna la cita con sus mediciones. MANAGER/STAFF solo ven su sucursal.

**Independent Test**: Autenticar como MANAGER de sucursal-a, crear varias citas, verificar que `GET /api/appointments?date=2026-03-20` devuelve solo las de esa fecha en esa sucursal.

### Tests para User Story 3 — escribir primero (Red) ⚠️

- [x] T015 [US3] Escribir tests unitarios fallidos para `AppointmentsService.findAll()` y `findOne()` en `apps/api/src/appointments/appointments.service.spec.ts`: (a) OWNER recibe todas las citas del tenant, (b) MANAGER recibe solo su sucursal, (c) filtro por `date` aplica rango del día, (d) filtro por `status` funciona, (e) filtro por `patientId` funciona respetando scope, (f) `findOne()` incluye `measurements` en la respuesta, (g) `findOne()` con ID de otro tenant lanza `NotFoundException`

### Implementación de User Story 3 (Green)

- [x] T016 [US3] Implementar `AppointmentsService.findAll()` en `apps/api/src/appointments/appointments.service.ts`: paginación con `page`/`limit`, filtro de `locationId` para MANAGER/STAFF, filtros opcionales de fecha (rango de día), `status`, `patientId`
- [x] T017 [US3] Implementar `AppointmentsService.findOne()` en `apps/api/src/appointments/appointments.service.ts`: include de `measurements`, filtro por `tenantId` + `locationId` para MANAGER/STAFF, `NotFoundException` si no existe
- [x] T018 [US3] Implementar `GET /api/appointments` y `GET /api/appointments/:id` en `apps/api/src/appointments/appointments.controller.ts` con `@UseGuards(JwtAuthGuard)`, `@Audit({ action: 'READ', resource: 'Appointment' })`, `@Query() query: AppointmentQueryDto`

**Checkpoint**: Listado y detalle de citas con aislamiento de sucursal verificado.

---

## Phase 6: User Story 4 — Registrar mediciones durante una sesión (Priority: P2)

**Goal**: `POST /api/appointments/:id/measurements` crea una medición clínica inmutable solo en citas `IN_PROGRESS`. Las mediciones no tienen endpoints de update/delete (NOM-004).

**Independent Test**: Crear cita en IN_PROGRESS → `POST /api/appointments/:id/measurements` → verificar en `GET /api/appointments/:id` bajo el arreglo `measurements`.

### Tests para User Story 4 — escribir primero (Red) ⚠️

- [x] T019 [US4] Escribir tests unitarios fallidos para `AppointmentsService.createMeasurement()` en `apps/api/src/appointments/appointments.service.spec.ts`: (a) crea medición con `tenantId` de la cita padre, (b) lanza `ConflictException` si cita no está en IN_PROGRESS (SCHEDULED, COMPLETED), (c) cita de otro location lanza `NotFoundException`

### Implementación de User Story 4 (Green)

- [x] T020 [US4] Implementar `AppointmentsService.createMeasurement()` en `apps/api/src/appointments/appointments.service.ts`: buscar cita con filtros de scope, verificar `status === 'IN_PROGRESS'`, crear `Measurement` con `tenantId` heredado de la cita
- [x] T021 [US4] Implementar `POST /api/appointments/:id/measurements` en `apps/api/src/appointments/appointments.controller.ts` con `@UseGuards(JwtAuthGuard)`, `@Audit({ action: 'CREATE', resource: 'Measurement' })`, `@Body() dto: CreateMeasurementDto` — retorna 201. **No crear endpoints PUT/PATCH/DELETE para measurements.**

**Checkpoint**: Mediciones inmutables registradas en citas activas, sin rutas de modificación.

---

## Phase 7: User Story 5 — Gestionar plantillas clínicas (Priority: P2)

**Goal**: `POST /api/clinical-templates` hace upsert de plantilla para un tipo de servicio (solo OWNER/ADMIN). `GET /api/clinical-templates` y `GET /api/clinical-templates/:id` disponibles para todos.

**Independent Test**: `POST /api/clinical-templates` para un `serviceTypeId` → crear cita con ese tipo → verificar que `clinicalData` acepta solo los campos definidos.

### Tests para User Story 5 — escribir primero (Red) ⚠️

- [x] T022 [P] [US5] Escribir tests unitarios fallidos para `ClinicalTemplatesService.upsert()` en `apps/api/src/clinical-templates/clinical-templates.service.spec.ts`: (a) crea plantilla si no existe, (b) actualiza plantilla existente (upsert), (c) lanza `NotFoundException` si `serviceTypeId` no existe en el tenant, (d) lanza `BadRequestException` si serviceType está INACTIVE
- [x] T023 [P] [US5] Escribir tests unitarios fallidos para `ClinicalTemplatesService.findAll()` y `findOne()` en `apps/api/src/clinical-templates/clinical-templates.service.spec.ts`: (a) `findAll()` filtra por `serviceTypeId` si se provee, (b) `findOne()` lanza `NotFoundException` si no existe

### Implementación de User Story 5 (Green)

- [x] T024 [US5] Implementar `ClinicalTemplatesService.upsert()` en `apps/api/src/clinical-templates/clinical-templates.service.ts`: verificar que `serviceTypeId` existe y está ACTIVE en el tenant, ejecutar `prisma.clinicalTemplate.upsert({ where: { serviceTypeId_tenantId } })`
- [x] T025 [US5] Implementar `ClinicalTemplatesService.findAll()` (con filtro opcional por `serviceTypeId`) y `findOne()` en `apps/api/src/clinical-templates/clinical-templates.service.ts`
- [x] T026 [US5] Implementar `POST /api/clinical-templates` (con `@Audit({ action: 'CREATE', resource: 'ClinicalTemplate' })`), `GET /api/clinical-templates` y `GET /api/clinical-templates/:id` en `apps/api/src/clinical-templates/clinical-templates.controller.ts` — guardia de roles OWNER/ADMIN en POST

**Checkpoint**: Plantillas clínicas gestionables; validación de `clinicalData` en citas funciona con plantillas reales.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Verificación final de calidad y cumplimiento normativo.

- [x] T027 [P] Auditar que todos los endpoints de `apps/api/src/appointments/appointments.controller.ts` tienen `@Audit()` con action y resource correctos (CREATE/UPDATE/READ para Appointment, CREATE para Measurement)
- [x] T028 Ejecutar `pnpm --filter api lint && pnpm --filter api check-types && pnpm --filter api test` desde la raíz y corregir todos los errores hasta obtener green en los tres

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Sin dependencias — puede iniciar de inmediato
- **Phase 2 (Foundational)**: Depende de Phase 1 — bloquea todas las user stories
- **Phases 3–7 (User Stories)**: Dependen del completion de Phase 2
  - US1, US2, US3 son todas P1 y se enfocan en `AppointmentsService` — implementar en orden secuencial (US1 → US2 → US3) ya que los métodos del servicio son acumulativos en el mismo archivo
  - US4 (mediciones) puede implementarse después de US1 ya que `createMeasurement` es independiente
  - US5 (plantillas) puede implementarse en paralelo con US1–US4 ya que es un módulo separado
- **Phase 8 (Polish)**: Depende del completion de todas las user stories

### User Story Dependencies

- **US1 (P1)**: Puede iniciar tras Phase 2 — sin dependencias en otras stories
- **US2 (P1)**: Puede iniciar tras Phase 2 — depende de estructura del servicio de US1 (mismo archivo)
- **US3 (P1)**: Puede iniciar tras Phase 2 — acumula sobre el servicio de US1/US2
- **US4 (P2)**: Puede iniciar tras US1 — `createMeasurement` usa la cita creada en US1
- **US5 (P2)**: Puede iniciar tras Phase 2 en paralelo con US1–US4 (módulo separado)

### Within Each User Story

1. Tests (Red) — escribir primero, verificar que **fallan**
2. Implementar servicio (Green)
3. Implementar controller (Green)
4. Verificar que los tests ahora **pasan**
5. Refactor si es necesario

### Parallel Opportunities

- T001 y T002 (schemas) — en paralelo
- T004 y T005 (DTOs) — en paralelo
- T006 y T007 (scaffolds de módulos) — en paralelo
- T022 y T023 (tests de US5) — en paralelo entre sí
- US5 completa (T022–T026) — en paralelo con US1–US4

---

## Parallel Example: US5 en paralelo con US1

```bash
# Un desarrollador trabaja en US1 (appointments):
T009 → T010 → T011

# Simultáneamente, otro desarrollador trabaja en US5 (clinical-templates):
T022 → T023 → T024 → T025 → T026
```

---

## Implementation Strategy

### MVP (US1 + US2 + US3 únicamente)

1. Completar Phase 1 y Phase 2 (schemas, DTOs, módulos)
2. Completar Phase 3 (US1 — crear cita)
3. Completar Phase 4 (US2 — gestionar estado)
4. Completar Phase 5 (US3 — consultar citas)
5. **STOP y VALIDAR**: `pnpm --filter api test` debe pasar con todos los casos de US1–US3
6. El sistema ya puede agendar, gestionar y consultar citas — valor clínico real

### Incremental Delivery

1. Phase 1 + Phase 2 → Foundation lista
2. US1 (crear cita) → primer endpoint clínico funcional
3. US2 (estados) → ciclo de vida completo de una cita
4. US3 (consultar) → agenda operativa
5. US4 (mediciones) → expediente clínico digital
6. US5 (plantillas) → formularios dinámicos por especialidad

---

## Notes

- **TDD es obligatorio**: cada test debe fallar antes de escribir el código de producción
- `[P]` = archivos distintos, sin dependencias pendientes — pueden lanzarse en paralelo
- `[Story]` mapea directamente a user stories de spec.md para trazabilidad
- Los tres criterios de "feature completo" (lint + types + tests) son obligatorios antes de considerar cualquier task concluida
- `@Audit()` se agrega en la task del controller de cada story — no dejarlo para el final
- Las mediciones **no tienen** rutas de update/delete — no crearlas aunque parezca incompleto
- El upsert de `ClinicalTemplate` usa `serviceTypeId_tenantId` como clave única (RLS garantiza el aislamiento de tenant)
