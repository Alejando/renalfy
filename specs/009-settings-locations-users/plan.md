# Implementation Plan: Settings UI — Locations & Users

**Branch**: `009-settings-locations-users` | **Date**: 2026-03-21 | **Spec**: [spec.md](./spec.md)

## Summary

Implement the Settings section of the Renalfy dashboard (frontend only, Next.js App Router). Delivers two fully functional management screens: **Locations** (`/settings/locations`) and **Users** (`/settings/users`), each with a list view (Server Component) and a create/edit drawer (Client Component). Mutations go through Server Actions that call the existing backend REST API. Role-based access control redirects MANAGER/STAFF away from settings pages. Follows the TDD cycle with Vitest + React Testing Library.

## Technical Context

**Language/Version**: TypeScript / Node.js 25
**Primary Dependencies**: Next.js 16.2 (App Router, Turbopack), Tailwind CSS v4, Vitest + React Testing Library, `@repo/types` (Zod schemas)
**Backend**: Existing NestJS API — no new endpoints needed
**Auth**: `access_token` httpOnly cookie read via `cookies()` from `next/headers` in Server Components and Server Actions
**Testing**: Vitest + React Testing Library — component tests with mocked fetch / Server Actions
**Target Platform**: Vercel (frontend), subdomain routing via `proxy.ts`
**Project Type**: Next.js App Router UI module

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| I. Multi-Tenant | ✓ PASS | `tenantId` enforced by backend; frontend reads from JWT cookie implicitly |
| II. Schema-First | ✓ PASS | Zod schemas already in `@repo/types` (`locations.schemas.ts`, `users.schemas.ts`) |
| III. Test-First | ✓ PASS | Component tests written before each page/component — Red → Green → Refactor |
| IV. Regulatory | ✓ PASS | No PHI displayed; user data is operational, not clinical |
| V. Security | ✓ PASS | MANAGER/STAFF redirected server-side; `access_token` never exposed to client |
| VI. Simplicity | ✓ PASS | Two pages, two drawers, four Server Actions — no custom hooks or global state |

## Project Structure

### Documentation

```text
specs/009-settings-locations-users/
├── plan.md              ← this file
├── spec.md
└── tasks.md
```

### Source Code (new files)

```text
apps/web/app/
└── tenants/[slug]/(dashboard)/
    ├── layout.tsx                          ← MODIFY: add "Configuración" nav link
    └── settings/
        ├── locations/
        │   ├── page.tsx                    ← Server Component: fetch + render list
        │   ├── page.test.tsx               ← Vitest: list rendering + empty state
        │   ├── location-drawer.tsx         ← Client Component: create/edit form
        │   └── location-drawer.test.tsx    ← Vitest: form validation + submission
        └── users/
            ├── page.tsx                    ← Server Component: fetch + render list
            ├── page.test.tsx               ← Vitest: list rendering + empty state
            ├── user-drawer.tsx             ← Client Component: create/edit form
            └── user-drawer.test.tsx        ← Vitest: form validation + submission

apps/web/app/actions/
├── locations.ts                            ← NEW: Server Actions for locations
└── users.ts                                ← NEW: Server Actions for users
```

### Access Control

```text
apps/web/proxy.ts   ← MODIFY: add /settings/locations and /settings/users to
                       PROTECTED_SETTINGS_PATHS (redirect MANAGER/STAFF to /dashboard)
```

## Implementation Strategy

### Phase 1: Server Actions (Foundation)

Create `actions/locations.ts` and `actions/users.ts`. Each action:
1. Reads `access_token` from cookies
2. Calls the backend API with `Authorization: Bearer <token>`
3. Returns `{ error: string } | { data: T }` — same pattern as `auth.ts`
4. Calls `revalidatePath('/settings/locations')` or `revalidatePath('/settings/users')` on success

### Phase 2: Locations (US1)

TDD cycle per component:
1. Write `page.test.tsx` (red) → implement `page.tsx` (green)
2. Write `location-drawer.test.tsx` (red) → implement `location-drawer.tsx` (green)

### Phase 3: Users (US2)

Same TDD cycle. The user drawer has additional complexity (role-dependent locationId field, location dropdown from props).

### Phase 4: Nav + Access Control

- Add "Configuración" link to dashboard `layout.tsx`
- Extend `proxy.ts` to block MANAGER/STAFF from settings pages

---

## Key Design Decisions

### API Client Helper (Server-side)

```ts
// apps/web/lib/api.ts  (new utility)
import { cookies } from 'next/headers';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3019/api';

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const message = typeof body['message'] === 'string' ? body['message'] : `Error ${res.status}`;
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}
```

Used in Server Components for GET requests and in Server Actions for mutations.

### Server Action Pattern (Mutations)

```ts
// apps/web/app/actions/locations.ts
'use server';
import { revalidatePath } from 'next/cache';
import { apiFetch } from '../../lib/api';
import type { LocationResponse } from '@repo/types';

export interface LocationActionState {
  error?: string;
}

export async function createLocationAction(
  _prev: LocationActionState | null,
  formData: FormData,
): Promise<LocationActionState | null> {
  const name = formData.get('name');
  if (!name || String(name).trim() === '') return { error: 'El nombre es obligatorio.' };
  try {
    await apiFetch<LocationResponse>('/locations', {
      method: 'POST',
      body: JSON.stringify({
        name: String(name).trim(),
        address: formData.get('address') ?? undefined,
        phone: formData.get('phone') ?? undefined,
      }),
    });
    revalidatePath('/settings/locations');
    return null;
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Error al crear la sucursal.' };
  }
}
```

### Drawer State Pattern

Drawers are controlled by a Client Component wrapper in `page.tsx`:

```tsx
// In the Server Component page.tsx:
import { LocationsPageClient } from './locations-page-client'; // 'use client'

export default async function LocationsPage() {
  const locations = await apiFetch<LocationResponse[]>('/locations');
  return <LocationsPageClient locations={locations} />;
}

// locations-page-client.tsx — 'use client'
// Holds: drawerOpen (boolean), selectedLocation (LocationResponse | null)
// Renders: table + header button + LocationDrawer
```

This keeps data fetching in the Server Component while drawer state stays in the Client Component.

### Role Guard in `proxy.ts`

```ts
// Settings pages restricted to OWNER and ADMIN only
const SETTINGS_ONLY_PATHS = new Set(['/settings/locations', '/settings/users']);

// In proxy():
if (slug !== null && SETTINGS_ONLY_PATHS.has(pathname)) {
  // Decode JWT to check role (or rely on backend 403 and show error page)
  // Simpler: redirect to /dashboard — backend will 403 anyway
}
```

**Decision**: Keep the role check simple — the backend already enforces 403. If a MANAGER hits `/settings/locations`, the `apiFetch` in the Server Component will get a 403, the page renders an error state, and the nav doesn't show the link to MANAGER/STAFF users anyway. No need to decode JWT in proxy for this sprint.

### Role Badge Colors

```ts
const ROLE_BADGE: Record<string, string> = {
  OWNER:   'bg-primary/10 text-primary',
  ADMIN:   'bg-tertiary/10 text-tertiary',
  MANAGER: 'bg-secondary/10 text-secondary',
  STAFF:   'bg-outline/10 text-outline',
};
```

### Status Badge Colors

```ts
// Location / User status
const STATUS_BADGE = {
  ACTIVE:    'bg-green-50 text-green-700',
  INACTIVE:  'bg-surface-container-low text-secondary',
  SUSPENDED: 'bg-error/10 text-error',
};
```

---

## Stitch Mockups Available

| Screen | Stitch ID | Notes |
|---|---|---|
| Location List | `970c9f30` | Reference for table layout and action buttons |
| New Location Drawer | `2dbbc9ac` | Reference for drawer layout and form fields |
| User List | — | Not yet in Stitch — implement following Location List pattern |
| New User Drawer | — | Not yet in Stitch — implement following Location Drawer pattern |
