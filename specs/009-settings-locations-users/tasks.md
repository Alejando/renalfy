# Tasks: Settings UI — Locations & Users

**Input**: Design documents from `/specs/009-settings-locations-users/`
**Prerequisites**: plan.md ✓ spec.md ✓

**Tests**: Included (TDD — Red → Green → Refactor, per project constitution and CLAUDE.md).

**Organization**: Phases are sequential. Within a phase, tasks marked with [P] can run in parallel.

---

## Phase 1: Foundation — API Helper & Server Actions

**Purpose**: Create the shared `apiFetch` utility and all Server Actions. These are the foundation that pages and drawers depend on.

- [ ] T001 Create `apps/web/lib/api.ts` with `apiFetch<T>(path, init?)` — reads `access_token` cookie via `cookies()` from `next/headers`, attaches `Authorization: Bearer` header, throws `Error` with backend message on non-OK responses
- [ ] T002 Create `apps/web/app/actions/locations.ts` with `createLocationAction`, `updateLocationAction`, `updateLocationStatusAction` — each returns `LocationActionState | null` and calls `revalidatePath('/settings/locations')` on success
- [ ] T003 [P] Create `apps/web/app/actions/users.ts` with `createUserAction`, `updateUserAction`, `updateUserStatusAction` — each returns `UserActionState | null` and calls `revalidatePath('/settings/users')` on success

**Checkpoint**: `pnpm check-types` passes on the new files.

---

## Phase 2: Locations — User Story 1 (Priority: P1)

**Goal**: `/settings/locations` shows a table of locations with create/edit/status-toggle actions.

### Tests — Write FIRST, confirm they FAIL before implementation

- [ ] T004 Write `apps/web/app/tenants/[slug]/(dashboard)/settings/locations/page.test.tsx`:
  - (a) renders a table with location rows when API returns data
  - (b) renders empty state when API returns an empty array
  - (c) renders error state when `apiFetch` throws
- [ ] T005 Write `apps/web/app/tenants/[slug]/(dashboard)/settings/locations/location-drawer.test.tsx`:
  - (a) renders create form when no `location` prop is passed
  - (b) renders edit form pre-filled when `location` prop is passed
  - (c) shows "El nombre es obligatorio" when name is empty and form is submitted
  - (d) calls `createLocationAction` with form data on valid create submission
  - (e) calls `updateLocationAction` with form data on valid edit submission
  - (f) shows error message from action state when action returns `{ error }`
  - (g) closes (calls `onClose`) after successful submission (action returns null)

### Implementation

- [ ] T006 Create `apps/web/app/tenants/[slug]/(dashboard)/settings/locations/page.tsx`:
  - Server Component — calls `apiFetch<LocationResponse[]>('/locations')`
  - Renders `LocationsPageClient` with `locations` prop
  - Wraps fetch in try/catch — renders `<ErrorState>` on failure
- [ ] T007 Create `apps/web/app/tenants/[slug]/(dashboard)/settings/locations/locations-page-client.tsx` (`'use client'`):
  - Holds `drawerOpen: boolean` and `selectedLocation: LocationResponse | null`
  - Renders page header with "Nueva sucursal" button, locations table, and `<LocationDrawer>`
  - Table columns: Nombre, Dirección, Teléfono, Estado (badge), Acciones (Editar / Activar/Desactivar)
- [ ] T008 Create `apps/web/app/tenants/[slug]/(dashboard)/settings/locations/location-drawer.tsx` (`'use client'`):
  - Props: `open`, `onClose`, `location?: LocationResponse`, `onSuccess`
  - Uses `useActionState` with `createLocationAction` or `updateLocationAction`
  - Fields: Nombre (required), Dirección, Teléfono
  - Focus-trapped overlay, closeable with Escape
  - Shows field-level error from action state

**Checkpoint**: `pnpm test --filter web` — all T004+T005 tests green.

---

## Phase 3: Users — User Story 2 (Priority: P2)

**Goal**: `/settings/users` shows a table of users with create/edit/status-toggle actions.

### Tests — Write FIRST, confirm they FAIL before implementation

- [ ] T009 Write `apps/web/app/tenants/[slug]/(dashboard)/settings/users/page.test.tsx`:
  - (a) renders a table with user rows (name, email, role badge, location name, status badge)
  - (b) renders empty state when API returns empty array
  - (c) renders error state when `apiFetch` throws
- [ ] T010 Write `apps/web/app/tenants/[slug]/(dashboard)/settings/users/user-drawer.test.tsx`:
  - (a) renders create form with password field when no `user` prop
  - (b) does NOT render password field when `user` prop is passed (edit mode)
  - (c) shows "La sucursal es obligatoria" when role is MANAGER/STAFF and no location selected
  - (d) hides location field when role is OWNER or ADMIN
  - (e) calls `createUserAction` on valid create submission
  - (f) calls `updateUserAction` on valid edit submission
  - (g) shows API error message ("Ya existe un usuario con ese correo") inside drawer without closing
  - (h) closes on successful submission

### Implementation

- [ ] T011 Create `apps/web/app/tenants/[slug]/(dashboard)/settings/users/page.tsx`:
  - Server Component — fetches users and locations in parallel: `Promise.all([apiFetch('/users'), apiFetch('/locations')])`
  - Renders `UsersPageClient` with `users` and `locations` props
- [ ] T012 Create `apps/web/app/tenants/[slug]/(dashboard)/settings/users/users-page-client.tsx` (`'use client'`):
  - Holds `drawerOpen: boolean` and `selectedUser: UserResponse | null`
  - Renders page header, users table, `<UserDrawer>`
  - Table columns: Nombre, Email, Rol (badge), Sucursal, Estado (badge), Acciones (Editar / Suspender/Activar)
  - Status toggle calls `updateUserStatusAction` directly (no drawer)
- [ ] T013 Create `apps/web/app/tenants/[slug]/(dashboard)/settings/users/user-drawer.tsx` (`'use client'`):
  - Props: `open`, `onClose`, `user?: UserResponse`, `locations: LocationResponse[]`
  - Fields (create): Nombre, Email, Contraseña, Rol (select), Sucursal (select, conditional), Teléfono
  - Fields (edit): Nombre, Rol (select), Sucursal (select, conditional), Teléfono
  - Sucursal field visible only when role is MANAGER or STAFF
  - Uses `useActionState` with `createUserAction` or `updateUserAction`

**Checkpoint**: `pnpm test --filter web` — all T009+T010 tests green.

---

## Phase 4: Nav & Access Control

**Purpose**: Add Settings to the navigation and hide it from MANAGER/STAFF.

- [ ] T014 Modify `apps/web/app/tenants/[slug]/(dashboard)/layout.tsx`: add "Configuración" nav link pointing to `/settings/locations`; conditionally hide it when user role is MANAGER or STAFF (read role from decoded JWT in a server-side helper or pass as prop)
- [ ] T015 Add a `getSessionUser()` server utility in `apps/web/lib/session.ts` that reads and decodes the `access_token` JWT cookie to extract `{ userId, tenantId, role }` — used in layout to conditionally render nav items
- [ ] T016 Write tests for `getSessionUser()` in `apps/web/lib/session.test.ts`: (a) returns null when no cookie, (b) returns parsed payload when valid JWT, (c) returns null when JWT is malformed

**Checkpoint**: MANAGER/STAFF users do not see "Configuración" in the nav; OWNER/ADMIN do.

---

## Phase 5: Polish & Quality Gates

**Purpose**: Verify all quality gates pass with no regressions.

- [ ] T017 Add `<ErrorState>` and `<EmptyState>` shared components in `apps/web/components/` if not already present — used by both settings pages
- [ ] T018 Run `pnpm lint` from repo root — fix any warnings or errors
- [ ] T019 Run `pnpm check-types` from repo root — fix any TypeScript errors
- [ ] T020 Run `pnpm test --filter web` — confirm all tests green with no regressions (target: existing 32 + new ~20 tests)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Foundation)**: No dependencies — start immediately
- **Phase 2 (Locations)**: Depends on Phase 1 (needs `apiFetch` + `createLocationAction`)
- **Phase 3 (Users)**: Depends on Phase 1 — can run in parallel with Phase 2 after T001–T003
- **Phase 4 (Nav)**: Depends on Phases 2 and 3 (pages must exist before linking to them)
- **Phase 5 (Polish)**: Depends on all prior phases

### Parallel Opportunities

- T002 and T003 can run in parallel (different action files)
- T004+T005 can run in parallel with T009+T010 (different test files — after Phase 1)
- T006+T007+T008 can run in parallel with T011+T012+T013 (different feature areas)

### Execution Order Summary

```
T001 → T002+T003 (parallel)
     → T004+T005 (parallel) → T006+T007+T008 (parallel)   ← Locations
     → T009+T010 (parallel) → T011+T012+T013 (parallel)   ← Users
     → T014+T015+T016 (nav)
     → T017 → T018 → T019 → T020
```

---

## Notes

- TDD is mandatory: write each test task first, confirm it fails, then implement.
- `'use server'` and `'use client'` boundaries must be explicit — do not mix in the same file.
- Server Components can `async`/`await` directly — no `useEffect` for data fetching.
- The `apiFetch` utility must only be called from Server Components or Server Actions (it uses `cookies()` which is server-only).
- Drawer open/close state stays in Client Components — never in URL params for this sprint.
- The `useActionState` hook requires the action signature `(prevState, formData) => Promise<State>`.
- `revalidatePath` in Server Actions invalidates the Server Component cache so the list re-fetches automatically after mutation.
- Location dropdown in the user drawer is passed as a prop from the parent (already fetched by the Server Component) — no client-side fetch.
- Run `pnpm --filter @repo/types build` if any types schema is modified (not expected in this sprint — schemas already exist).
