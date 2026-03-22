# Feature Specification: Settings UI — Locations & Users

**Feature Branch**: `009-settings-locations-users`
**Created**: 2026-03-21
**Status**: Draft
**Input**: Sprint 9 — UI: Settings (Locations + Users). Frontend Next.js, wires to existing backend endpoints.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Locations List & Management (Priority: P1)

An OWNER or ADMIN needs to view all clinic locations for their tenant, add new ones, edit existing ones, and deactivate locations that are no longer operational. The list must show name, address, phone, and status at a glance.

**Why this priority**: Locations are the foundational configuration entity — users are assigned to locations, and data is scoped by location. This must work before user management is usable.

**Independent Test**: Navigating to `/settings/locations` renders a table of locations. Clicking "Nueva sucursal" opens a drawer and submitting creates a location that appears in the list.

**Acceptance Scenarios**:

1. **Given** an OWNER navigates to `/settings/locations`, **When** the page loads, **Then** all locations for their tenant are displayed in a table with columns: Nombre, Dirección, Teléfono, Estado, Acciones.
2. **Given** the locations list is open, **When** the user clicks "Nueva sucursal", **Then** a right-side drawer opens with fields: Nombre (required), Dirección (optional), Teléfono (optional).
3. **Given** the drawer is open with valid data, **When** the user submits, **Then** the location is created via `POST /api/locations`, the drawer closes, and the new location appears in the list.
4. **Given** the drawer is open with the Nombre field empty, **When** the user submits, **Then** a validation error "El nombre es obligatorio" is shown and the request is not sent.
5. **Given** an existing location in the list, **When** the user clicks "Editar", **Then** the same drawer opens pre-filled with the location's current data.
6. **Given** the edit drawer has modified data, **When** the user submits, **Then** the location is updated via `PATCH /api/locations/:id` and the list reflects the change.
7. **Given** an existing location, **When** the user clicks "Desactivar", **Then** a confirmation is shown; on confirm, `PATCH /api/locations/:id` is called with `{ status: 'INACTIVE' }` and the row shows status badge "Inactiva".
8. **Given** a MANAGER or STAFF user navigates to `/settings/locations`, **Then** they are redirected to `/dashboard` (access denied).

---

### User Story 2 — Users List & Management (Priority: P2)

An OWNER or ADMIN needs to manage the team: invite new users with a role assignment, edit their profile and location, and suspend/reactivate accounts. Each user row shows their role and assigned location.

**Why this priority**: User management depends on locations existing (assigning MANAGER/STAFF to a location). Comes after US1.

**Independent Test**: Navigating to `/settings/users` renders a table of users. Creating a new user with role STAFF and a valid locationId appears in the list.

**Acceptance Scenarios**:

1. **Given** an OWNER navigates to `/settings/users`, **When** the page loads, **Then** all users for their tenant are shown in a table with columns: Nombre, Email, Rol, Sucursal, Estado, Acciones.
2. **Given** the users list is open, **When** the user clicks "Nuevo usuario", **Then** a drawer opens with fields: Nombre (required), Email (required), Contraseña (required, create-only), Rol (required, dropdown), Sucursal (required when role is MANAGER or STAFF), Teléfono (optional).
3. **Given** the drawer has role MANAGER selected, **When** the user submits without choosing a Sucursal, **Then** a validation error "La sucursal es obligatoria para este rol" is shown.
4. **Given** valid data for a new STAFF user, **When** the user submits, **Then** `POST /api/users` is called, the drawer closes, and the new user appears in the table.
5. **Given** the API returns a 409 (email already exists), **When** the drawer is submitted, **Then** the error "Ya existe un usuario con ese correo" is displayed inside the drawer without closing it.
6. **Given** an existing user in the list, **When** the user clicks "Editar", **Then** the drawer opens pre-filled (without the password field) with editable fields: Nombre, Teléfono, Rol, Sucursal.
7. **Given** an ACTIVE user, **When** the admin clicks "Suspender", **Then** `PATCH /api/users/:id/status` is called with `{ status: 'SUSPENDED' }` and the row shows badge "Suspendido".
8. **Given** a SUSPENDED user, **When** the admin clicks "Activar", **Then** `PATCH /api/users/:id/status` is called with `{ status: 'ACTIVE' }` and the row shows badge "Activo".

---

### Edge Cases

- What happens when the locations API call fails (network error)? The list page shows an inline error state with a retry option.
- What happens when creating a user with a duplicate email? The drawer stays open showing the API error message.
- What happens when a MANAGER navigates to `/settings/users`? They are redirected to `/dashboard`.
- What if the location list is empty (new tenant)? An empty state is shown with a prompt to create the first location.
- What if the users list has no users beyond the current admin? Empty state is shown with a "Nuevo usuario" CTA.
- What happens when the access token expires mid-session while submitting a form? The Server Action returns an auth error, the user is redirected to `/login`.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST render `/settings/locations` as a Server Component that fetches all tenant locations from `GET /api/locations` using the authenticated user's access token.
- **FR-002**: System MUST render `/settings/users` as a Server Component that fetches all tenant users from `GET /api/users` using the access token.
- **FR-003**: System MUST implement Server Actions for location mutations: `createLocationAction`, `updateLocationAction`, `updateLocationStatusAction`.
- **FR-004**: System MUST implement Server Actions for user mutations: `createUserAction`, `updateUserAction`, `updateUserStatusAction`.
- **FR-005**: System MUST validate form fields client-side using Zod schemas from `@repo/types` before calling a Server Action.
- **FR-006**: System MUST show inline field-level validation errors inside the drawer without closing it.
- **FR-007**: System MUST revalidate the list page after every successful mutation using `revalidatePath`.
- **FR-008**: System MUST redirect MANAGER and STAFF users away from all `/settings/*` pages (except `/settings/password`) with a 302 to `/dashboard`.
- **FR-009**: Drawers MUST be accessible: focus-trapped when open, closeable with Escape key, labelled with `aria-label`.
- **FR-010**: The "Sucursal" dropdown in the user drawer MUST be populated from the list of active locations fetched server-side.

### Key Entities (from existing backend)

- **Location**: `{ id, name, address?, phone?, status: 'ACTIVE'|'INACTIVE', createdAt }`
- **User**: `{ id, name, email, role: UserRole, locationId?, phone?, status: 'ACTIVE'|'SUSPENDED', createdAt }`
- **UserRole**: `OWNER | ADMIN | MANAGER | STAFF` (SUPER_ADMIN not managed from this UI)

### Non-Functional Requirements

- Server Components must handle API fetch errors gracefully — never crash with unhandled exceptions.
- Drawer open/close is controlled by local React state in a Client Component wrapper — no URL params.
- No optimistic UI — wait for Server Action completion, then show updated list.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `/settings/locations` renders a table of locations populated from the live API — verified by component tests with mocked fetch.
- **SC-002**: Submitting the location drawer form calls the correct Server Action and the list is updated — verified by component tests with mocked Server Actions.
- **SC-003**: Role-based access control redirects MANAGER/STAFF from `/settings/locations` and `/settings/users` — verified by proxy/middleware tests.
- **SC-004**: User drawer shows a validation error for MANAGER/STAFF roles without a locationId — verified by component tests.
- **SC-005**: All API errors from the backend (409, 404, 500) are displayed inside the drawer as readable messages, not raw status codes.
- **SC-006**: The feature passes `pnpm lint`, `pnpm check-types`, and `pnpm test` with zero errors.

---

## Assumptions

- The backend endpoints (`GET /api/locations`, `POST /api/locations`, `PATCH /api/locations/:id`, `GET /api/users`, `POST /api/users`, `PATCH /api/users/:id`, `PATCH /api/users/:id/status`) are already fully implemented and tested (Sprint 3).
- The `access_token` httpOnly cookie is always present for authenticated users (enforced by `proxy.ts`).
- Location status toggle uses `PATCH /api/locations/:id` with `{ status: 'INACTIVE' | 'ACTIVE' }` in the body.
- No pagination UI is needed for v1 — the API returns all records (reasonable for a tenant's location/user count).
- The "Settings" navigation entry will be added to the dashboard layout as a dropdown or direct link.
- Stitch mockup screens exist for Location List (`970c9f30`) and New Location Drawer (`2dbbc9ac`). User screens need to be generated or implemented following the same pattern.
