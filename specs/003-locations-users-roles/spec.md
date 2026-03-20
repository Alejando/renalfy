# Feature Specification: Locations, Users & Role-Based Access

**Feature Branch**: `003-locations-users-roles`
**Created**: 2026-03-19
**Status**: Draft
**Sprint**: 3

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — OWNER gestiona sucursales de su organización (Priority: P1)

Como OWNER de una clínica, quiero crear y administrar las sucursales de mi organización para poder operar varias ubicaciones desde una sola cuenta.

**Why this priority**: Sin sucursales no hay contexto para asignar usuarios ni filtrar datos por ubicación. Es el prerequisito de todo Sprint 3.

**Independent Test**: Se puede probar creando una sucursal vía `POST /api/locations`, listando con `GET /api/locations`, y verificando que solo aparecen las del tenant del OWNER.

**Acceptance Scenarios**:

1. **Given** un OWNER autenticado, **When** hace `POST /api/locations` con `{ name, address, phone }`, **Then** se crea la sucursal vinculada a su `tenantId` y retorna `201` con el objeto creado.
2. **Given** un OWNER autenticado, **When** hace `GET /api/locations`, **Then** recibe solo las sucursales de su tenant (nunca de otros tenants).
3. **Given** un OWNER autenticado, **When** hace `PATCH /api/locations/:id` con datos válidos, **Then** actualiza la sucursal y retorna `200`.
4. **Given** un OWNER autenticado, **When** hace `DELETE /api/locations/:id`, **Then** la sucursal queda con `status = 'inactive'` (soft delete) — nunca se borra físicamente.
5. **Given** un MANAGER o STAFF, **When** intenta `POST /api/locations`, **Then** recibe `403 Forbidden`.

---

### User Story 2 — OWNER/ADMIN gestiona usuarios de su organización (Priority: P1)

Como OWNER o ADMIN, quiero invitar y gestionar usuarios de mi organización, asignándoles un rol y opcionalmente una sucursal, para controlar quién accede a qué.

**Why this priority**: La gestión de usuarios es necesaria para que la clínica pueda operar con múltiples personas con distintos permisos.

**Independent Test**: Se puede probar creando un usuario MANAGER con `locationId`, autenticando con ese usuario y verificando que solo ve datos de su sucursal.

**Acceptance Scenarios**:

1. **Given** un OWNER autenticado, **When** hace `POST /api/users` con `{ name, email, password, role, locationId? }`, **Then** se crea el usuario con `tenantId` del OWNER y retorna `201`.
2. **Given** un OWNER autenticado, **When** hace `GET /api/users`, **Then** recibe todos los usuarios de su tenant con sus roles y sucursales.
3. **Given** un ADMIN, **When** intenta crear un usuario con `role = OWNER`, **Then** recibe `403 Forbidden` (solo OWNER puede crear OWNERs).
4. **Given** un MANAGER o STAFF, **When** intenta `POST /api/users`, **Then** recibe `403 Forbidden`.
5. **Given** un OWNER, **When** hace `PATCH /api/users/:id/status` con `{ status: 'SUSPENDED' }`, **Then** el usuario queda suspendido y no puede autenticarse.
6. **Given** un usuario con email ya existente en el mismo tenant, **When** se intenta crear otro con el mismo email, **Then** retorna `409 Conflict`.

---

### User Story 3 — MANAGER y STAFF solo ven datos de su sucursal (Priority: P1)

Como sistema, debo garantizar que un MANAGER o STAFF nunca pueda ver ni modificar datos de una sucursal distinta a la suya, incluso si manipula parámetros de la URL.

**Why this priority**: Es un requisito de seguridad crítico. Si falla, toda la separación de datos del sistema es inválida.

**Independent Test**: Crear dos sucursales (A y B), autenticar como MANAGER de A, intentar `GET /api/locations/[id-de-B]` → debe retornar `404` (no `403`, para no revelar existencia).

**Acceptance Scenarios**:

1. **Given** un MANAGER de sucursal A, **When** hace `GET /api/locations`, **Then** recibe solo su propia sucursal.
2. **Given** un MANAGER de sucursal A, **When** hace `GET /api/locations/:id` con el ID de sucursal B, **Then** retorna `404`.
3. **Given** un STAFF de sucursal A, **When** hace `GET /api/users`, **Then** retorna `403 Forbidden` (STAFF no tiene acceso a gestión de usuarios).
4. **Given** un MANAGER de sucursal A, **When** hace `GET /api/users`, **Then** recibe solo los usuarios asignados a su sucursal.

---

### User Story 4 — Sistema de guards y decoradores de roles (Priority: P2)

Como desarrollador, quiero un `RolesGuard` y un decorator `@Roles()` reutilizables para poder proteger cualquier endpoint nuevo con una sola línea.

**Why this priority**: Es infraestructura necesaria para todos los sprints futuros. Sin ella, cada módulo implementaría su propia lógica de autorización.

**Independent Test**: Aplicar `@Roles(UserRole.OWNER)` a un endpoint y verificar que ADMIN, MANAGER y STAFF reciben `403` mientras OWNER recibe `200`.

**Acceptance Scenarios**:

1. **Given** un endpoint decorado con `@Roles(UserRole.OWNER, UserRole.ADMIN)`, **When** un MANAGER hace la request, **Then** recibe `403`.
2. **Given** un endpoint decorado con `@Roles(UserRole.OWNER, UserRole.ADMIN)`, **When** un OWNER hace la request, **Then** pasa el guard y ejecuta el handler.
3. **Given** el `RolesGuard` registrado globalmente, **When** un endpoint no tiene `@Roles()`, **Then** solo requiere autenticación (cualquier rol pasa).

---

### Edge Cases

- MANAGER sin `locationId` asignado: la creación debe fallar con `400 Bad Request` — MANAGER siempre requiere `locationId`.
- STAFF sin `locationId` asignado: mismo comportamiento que MANAGER.
- OWNER/ADMIN pueden tener `locationId = null` (acceso a toda la organización).
- Intentar asignar un `locationId` de otro tenant al crear usuario: debe retornar `400` (validación cruzada).
- Usuario SUSPENDED intenta autenticarse: `AuthService.login` ya retorna `401` (ya cubierto en Sprint 2 si el status se validó — verificar).
- SUPER_ADMIN no pertenece a ningún tenant — los endpoints de Locations y Users deben retornar `403` para SUPER_ADMIN (son endpoints de tenant).

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE crear, listar, actualizar y desactivar (soft delete) sucursales (`Location`) filtradas por `tenantId`.
- **FR-002**: El sistema DEBE crear, listar, actualizar y suspender usuarios (`User`) filtrados por `tenantId`.
- **FR-003**: Los roles `MANAGER` y `STAFF` DEBEN tener `locationId` asignado — el sistema DEBE rechazar su creación sin él.
- **FR-004**: `GET /api/locations` y `GET /api/users` para roles `MANAGER` y `STAFF` DEBEN filtrar automáticamente por su `locationId`.
- **FR-005**: El sistema DEBE exponer un `RolesGuard` y un decorator `@Roles(...roles)` aplicables a cualquier controller o handler.
- **FR-006**: Solo `OWNER` puede crear usuarios con rol `OWNER`. `ADMIN` puede crear `MANAGER` y `STAFF`.
- **FR-007**: Los passwords de nuevos usuarios DEBEN hashearse con bcrypt antes de persistirse.
- **FR-008**: El sistema DEBE retornar `404` (no `403`) cuando un MANAGER/STAFF intenta acceder a un recurso de otra sucursal (para no revelar su existencia).
- **FR-009**: Las sucursales eliminadas DEBEN usar soft delete (`status = 'inactive'`), nunca borrado físico.

### Key Entities

- **Location**: sucursal de un tenant. Atributos: `id`, `tenantId`, `name`, `address?`, `phone?`, `status` (`active` | `inactive`), `createdAt`, `updatedAt`.
- **User**: usuario de un tenant. Atributos: `id`, `tenantId`, `locationId?`, `name`, `email`, `password` (hashed), `role` (enum), `status` (`ACTIVE` | `SUSPENDED`), `phone?`, `avatarUrl?`, `createdAt`, `updatedAt`.
- **RolesGuard**: guard de NestJS que verifica `req.user.role` contra los roles permitidos declarados con `@Roles()`.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `pnpm lint && pnpm check-types && pnpm test` pasan en verde antes de merge.
- **SC-002**: Un MANAGER autenticado en sucursal A nunca puede obtener datos de sucursal B — verificado por test E2E con dos sucursales reales en BD de test.
- **SC-003**: El `RolesGuard` rechaza con `403` cualquier rol no listado en `@Roles()` — verificado por unit test del guard.
- **SC-004**: Todos los endpoints nuevos tienen tests de autorización que prueban al menos: el rol permitido más bajo que pasa, y el rol más alto que debe ser rechazado.
- **SC-005**: No existe ningún endpoint de Locations o Users accesible sin `JwtAuthGuard`.
