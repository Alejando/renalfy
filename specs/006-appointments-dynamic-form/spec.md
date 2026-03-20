# Feature Specification: Citas/Sesiones con Formulario Dinámico

**Feature Branch**: `006-appointments-dynamic-form`
**Created**: 2026-03-20
**Status**: Draft
**Sprint**: 6
**Scope**: Backend únicamente (NestJS + Prisma). Frontend en sprint posterior.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Agendar una cita para un paciente (Priority: P1)

Como STAFF o MANAGER, quiero crear una cita para un paciente de mi sucursal, indicando la fecha, el tipo de servicio y capturando los datos clínicos del formato correspondiente, para tener un registro completo de cada sesión desde el momento en que se agenda.

**Why this priority**: La cita es la unidad central del flujo clínico. Sin poder agendar citas, el sistema no puede registrar sesiones, mediciones ni generar recibos. Es el prerequisito de todo lo demás en el módulo clínico.

**Independent Test**: Crear una cita con `POST /api/appointments` y verificar que existe con `GET /api/appointments/:id`. Si el tipo de servicio tiene una plantilla clínica, el campo `clinicalData` debe reflejar los datos ingresados.

**Acceptance Scenarios**:

1. **Given** un STAFF autenticado en `sucursal-a` con un paciente con consentimiento activo, **When** hace `POST /api/appointments` con `{ patientId, serviceTypeId, scheduledAt, clinicalData }`, **Then** crea la cita con `status = SCHEDULED`, `tenantId` del JWT y retorna `201`.
2. **Given** un STAFF de `sucursal-a`, **When** intenta crear una cita con un paciente de `sucursal-b` del mismo tenant, **Then** retorna `404` (el paciente no existe en su scope).
3. **Given** un MANAGER de `sucursal-a`, **When** intenta crear una cita en `sucursal-b`, **Then** retorna `403` (solo puede operar en su propia sucursal).
4. **Given** un paciente sin consentimiento activo, **When** STAFF intenta crear una cita para ese paciente, **Then** retorna `403` con mensaje claro.
5. **Given** un `serviceTypeId` con plantilla clínica definida, **When** se crea la cita con `clinicalData` que no cumple la estructura de la plantilla, **Then** retorna `400` con detalle de validación.
6. **Given** un `serviceTypeId` sin plantilla clínica, **When** se crea la cita sin `clinicalData`, **Then** la cita se crea normalmente con `clinicalData = null`.

---

### User Story 2 — Gestionar el estado de una cita (Priority: P1)

Como STAFF o MANAGER, quiero actualizar el estado de una cita a lo largo de su ciclo de vida (agendada → en curso → completada, o cancelada/no presentó), para reflejar con exactitud lo que ocurre en la clínica y mantener un historial fiel.

**Why this priority**: Sin control de estados, las citas no tienen valor clínico. Los estados disparan lógica crítica: una cita COMPLETED habilita la generación de recibo; IN_PROGRESS indica que el paciente está actualmente en sesión.

**Independent Test**: Crear una cita (SCHEDULED), avanzarla a IN_PROGRESS con `PATCH /api/appointments/:id/status`, luego a COMPLETED. Verificar que cada transición retorna el nuevo estado y que las transiciones inválidas retornan `400`.

**Acceptance Scenarios**:

1. **Given** una cita en estado `SCHEDULED`, **When** STAFF hace `PATCH /api/appointments/:id/status` con `{ status: "IN_PROGRESS" }`, **Then** la cita avanza a `IN_PROGRESS` con `startedAt` registrado automáticamente y retorna `200`.
2. **Given** una cita en estado `IN_PROGRESS`, **When** STAFF hace `PATCH /api/appointments/:id/status` con `{ status: "COMPLETED" }`, **Then** la cita avanza a `COMPLETED` con `endedAt` registrado automáticamente.
3. **Given** una cita en estado `SCHEDULED`, **When** STAFF hace `PATCH /api/appointments/:id/status` con `{ status: "CANCELLED", notes: "..." }`, **Then** la cita queda `CANCELLED`.
4. **Given** una cita en estado `COMPLETED`, **When** cualquier usuario intenta cambiar el estado, **Then** retorna `409` (las citas completadas son inmutables por NOM-004).
5. **Given** una cita en estado `SCHEDULED`, **When** se intenta pasar directamente a `COMPLETED` (saltando `IN_PROGRESS`), **Then** retorna `400` (transición de estado inválida).
6. **Given** un MANAGER de `sucursal-a`, **When** intenta actualizar el estado de una cita de `sucursal-b`, **Then** retorna `404`.

---

### User Story 3 — Consultar citas y filtrar por fecha, estado o paciente (Priority: P1)

Como usuario autenticado, quiero listar las citas de mi clínica/sucursal con filtros por fecha, estado y paciente, para organizar la agenda diaria y consultar el historial clínico de un paciente.

**Why this priority**: El listado es la operación más frecuente del sistema. El STAFF lo consulta múltiples veces al día para gestionar la agenda. Sin esto, el módulo de citas no tiene uso práctico.

**Independent Test**: Autenticar como MANAGER de `sucursal-a`, crear varias citas en distintos estados, y verificar que `GET /api/appointments?date=2026-03-20` devuelve solo las de esa fecha en esa sucursal.

**Acceptance Scenarios**:

1. **Given** un OWNER autenticado, **When** hace `GET /api/appointments`, **Then** recibe todas las citas del tenant paginadas.
2. **Given** un MANAGER de `sucursal-a`, **When** hace `GET /api/appointments`, **Then** recibe solo las citas de `sucursal-a`, nunca las de `sucursal-b`.
3. **Given** citas con distintos estados, **When** se filtra con `?status=SCHEDULED`, **Then** solo se retornan citas con ese estado.
4. **Given** citas en distintas fechas, **When** se filtra con `?date=2026-03-20`, **Then** solo se retornan citas programadas para ese día.
5. **Given** un paciente con varias citas, **When** se filtra con `?patientId=uuid`, **Then** se retornan todas las citas de ese paciente (respetando el scope de sucursal).
6. **Given** un STAFF, **When** hace `GET /api/appointments/:id`, **Then** retorna la cita con sus datos clínicos (`clinicalData`) y mediciones asociadas.

---

### User Story 4 — Registrar mediciones durante una sesión (Priority: P2)

Como STAFF, quiero registrar mediciones clínicas durante una cita activa (IN_PROGRESS), para documentar los parámetros del paciente durante la sesión con el detalle que requiere la plantilla clínica del tipo de servicio.

**Why this priority**: Las mediciones son el corazón del expediente clínico digital. Sin ellas el sistema es solo una agenda. P2 porque se puede completar una cita sin mediciones adicionales, usando solo `clinicalData`.

**Independent Test**: Crear una cita en estado `IN_PROGRESS`, hacer `POST /api/appointments/:id/measurements` con datos clínicos, y verificar que el registro existe en `GET /api/appointments/:id` bajo el arreglo de mediciones.

**Acceptance Scenarios**:

1. **Given** una cita en estado `IN_PROGRESS`, **When** STAFF hace `POST /api/appointments/:id/measurements` con `{ data, recordedAt }`, **Then** crea la medición y retorna `201`.
2. **Given** una cita en estado `SCHEDULED` o `COMPLETED`, **When** se intenta agregar una medición, **Then** retorna `409` (solo se pueden registrar mediciones en citas activas).
3. **Given** una medición creada, **When** se intenta modificar o eliminar, **Then** retorna `405` (las mediciones son inmutables por NOM-004).
4. **Given** un STAFF de `sucursal-a`, **When** intenta agregar mediciones a una cita de `sucursal-b`, **Then** retorna `404`.

---

### User Story 5 — OWNER/ADMIN gestiona plantillas clínicas por tipo de servicio (Priority: P2)

Como OWNER o ADMIN, quiero definir y actualizar el formulario clínico asociado a cada tipo de servicio, para que el STAFF capture exactamente los datos que la clínica necesita documentar según la especialidad y el servicio.

**Why this priority**: Las plantillas clínicas son la configuración que hace al sistema genérico y adaptable a cualquier especialidad. P2 porque pueden crearse después del lanzamiento sin bloquear las citas; el sistema funciona sin ellas (con `clinicalData = null`).

**Independent Test**: Crear una plantilla con `POST /api/clinical-templates` para un `serviceTypeId`, luego crear una cita con ese tipo de servicio y verificar que `clinicalData` acepta solo los campos definidos.

**Acceptance Scenarios**:

1. **Given** un OWNER autenticado, **When** hace `POST /api/clinical-templates` con `{ serviceTypeId, fields: [...] }`, **Then** crea la plantilla y retorna `201`.
2. **Given** una plantilla existente, **When** OWNER hace `PATCH /api/clinical-templates/:id` con nuevos campos, **Then** actualiza la plantilla; las citas históricas NO se ven afectadas.
3. **Given** un `serviceTypeId` con plantilla activa, **When** se crea una cita con ese tipo de servicio, **Then** el sistema valida que `clinicalData` cumpla la estructura de la plantilla.
4. **Given** un STAFF, **When** intenta `POST /api/clinical-templates`, **Then** retorna `403`.
5. **Given** un MANAGER autenticado, **When** hace `GET /api/clinical-templates?serviceTypeId=uuid`, **Then** recibe la plantilla del tipo de servicio indicado (lectura permitida para todos).

---

### Edge Cases

- ¿Qué pasa si se agenda una cita para un paciente con `status = DELETED`? → `404` (el paciente no existe en el scope activo).
- ¿Qué pasa si el `serviceTypeId` referenciado tiene `status = INACTIVE`? → `400` (no se pueden crear citas con tipos de servicio inactivos).
- ¿Pueden existir dos citas para el mismo paciente al mismo tiempo? → El sistema no bloquea solapamientos en este sprint; queda como validación de negocio futura.
- ¿Qué pasa si se actualiza la plantilla clínica de un tipo de servicio? → Las citas ya creadas conservan sus datos intactos (`clinicalData` es inmutable con la cita). La nueva plantilla aplica solo a futuras citas.
- ¿Puede una cita existir sin `serviceTypeId`? → Sí, es opcional; en ese caso no hay plantilla clínica y `clinicalData` es `null`.
- ¿Qué pasa si se intenta crear más de una plantilla para el mismo `serviceTypeId`? → El sistema actualiza la existente (`upsert`); solo puede existir una plantilla por tipo de servicio por tenant.
- ¿Qué pasa si la cita tiene mediciones cuando se intenta cancelar? → Se permite cancelar (las mediciones se conservan por NOM-004, la cita queda en `CANCELLED`).

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Al crear una cita, el sistema DEBE verificar que el paciente tiene al menos un consentimiento activo (`revokedAt IS NULL`); en caso contrario, rechaza la creación.
- **FR-002**: Las citas son tenant-scoped; `MANAGER` y `STAFF` solo pueden leer y escribir citas de su `locationId`.
- **FR-003**: Las transiciones de estado DEBEN seguir el flujo válido: `SCHEDULED → IN_PROGRESS`, `SCHEDULED → CANCELLED`, `SCHEDULED → NO_SHOW`, `IN_PROGRESS → COMPLETED`, `IN_PROGRESS → CANCELLED`. Cualquier otra transición es rechazada con error.
- **FR-004**: Al avanzar a `IN_PROGRESS`, el sistema DEBE registrar automáticamente `startedAt = now()`. Al avanzar a `COMPLETED`, DEBE registrar `endedAt = now()`.
- **FR-005**: Las citas con `status = COMPLETED` son **inmutables** (NOM-004). Ningún campo puede ser modificado ni el estado puede cambiar una vez completada.
- **FR-006**: Las mediciones (`Measurement`) son **inmutables** una vez creadas (NOM-004). No se permiten operaciones de actualización ni eliminación.
- **FR-007**: Las mediciones solo pueden crearse en citas con `status = IN_PROGRESS`.
- **FR-008**: Si el tipo de servicio tiene una plantilla clínica activa, el campo `clinicalData` de la cita DEBE ser validado contra la estructura de campos (`fields`) de esa plantilla.
- **FR-009**: Una plantilla clínica (`ClinicalTemplate`) es de uno a uno con `serviceTypeId` por tenant; crear una segunda plantilla para el mismo tipo actualiza la existente.
- **FR-010**: Toda creación, modificación y acceso a citas y mediciones DEBE registrarse en la bitácora de auditoría (NOM-004 + NOM-024).
- **FR-011**: `GET /api/appointments` soporta filtros por `date`, `status` y `patientId`, además de paginación (`?page=1&limit=20`).

### Key Entities

- **Appointment**: Cita o sesión clínica. Atributos: `tenantId`, `locationId`, `patientId`, `userId`, `serviceTypeId?`, `scheduledAt`, `startedAt?`, `endedAt?`, `status (SCHEDULED|IN_PROGRESS|COMPLETED|CANCELLED|NO_SHOW)`, `clinicalData?`, `notes?`.
- **Measurement**: Medición clínica registrada durante una sesión. Atributos: `tenantId`, `appointmentId`, `recordedAt`, `data (JSON)`, `notes?`. Inmutable por NOM-004.
- **ClinicalTemplate**: Plantilla que define la estructura del formulario clínico para un tipo de servicio. Atributos: `tenantId`, `serviceTypeId (único por tenant)`, `fields (JSON — array de definiciones de campo)`.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `POST /api/appointments` crea la cita y valida el consentimiento del paciente en una sola llamada, retornando `201` en menos de 500 ms.
- **SC-002**: `GET /api/appointments` de un MANAGER nunca retorna citas de otra sucursal, verificado por tests de aislamiento.
- **SC-003**: Una cita con `status = COMPLETED` no puede ser modificada por ningún endpoint ni usuario, verificado por tests.
- **SC-004**: Las mediciones creadas no pueden ser modificadas ni eliminadas, verificado por tests.
- **SC-005**: Las transiciones de estado inválidas son rechazadas con `400`, verificado con al menos 3 casos de prueba por transición ilegal.
- **SC-006**: `pnpm lint && pnpm check-types && pnpm test` pasan sin errores al completar el sprint.
- **SC-007**: Todo endpoint que accede a datos clínicos (citas y mediciones) tiene `@Audit()` decorator.
