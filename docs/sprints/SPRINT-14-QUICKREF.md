# SPRINT 14 — Quick Reference Guide

**One-page reference for developers implementing Sprint 14 features.**

---

## File Creation Checklist

```bash
# 1. Server Actions
touch apps/web/app/actions/companies.ts
touch apps/web/app/actions/plans.ts

# 2. Companies UI
mkdir -p apps/web/app/tenants/\[slug\]/\(dashboard\)/companies
touch apps/web/app/tenants/\[slug\]/\(dashboard\)/companies/page.tsx
touch apps/web/app/tenants/\[slug\]/\(dashboard\)/companies/companies-page-client.tsx
touch apps/web/app/tenants/\[slug\]/\(dashboard\)/companies/company-drawer.tsx
touch apps/web/app/tenants/\[slug\]/\(dashboard\)/companies/company-form.tsx
touch apps/web/app/tenants/\[slug\]/\(dashboard\)/companies/companies-page-client.test.tsx
touch apps/web/app/tenants/\[slug\]/\(dashboard\)/companies/company-drawer.test.tsx
touch apps/web/app/tenants/\[slug\]/\(dashboard\)/companies/company-form.test.tsx

# 3. Plans UI
mkdir -p apps/web/app/tenants/\[slug\]/\(dashboard\)/plans
touch apps/web/app/tenants/\[slug\]/\(dashboard\)/plans/page.tsx
touch apps/web/app/tenants/\[slug\]/\(dashboard\)/plans/plans-page-client.tsx
touch apps/web/app/tenants/\[slug\]/\(dashboard\)/plans/plan-drawer.tsx
touch apps/web/app/tenants/\[slug\]/\(dashboard\)/plans/plan-form.tsx
touch apps/web/app/tenants/\[slug\]/\(dashboard\)/plans/plan-status-badge.tsx
touch apps/web/app/tenants/\[slug\]/\(dashboard\)/plans/plan-progress-bar.tsx
touch apps/web/app/tenants/\[slug\]/\(dashboard\)/plans/plans-page-client.test.tsx
touch apps/web/app/tenants/\[slug\]/\(dashboard\)/plans/plan-drawer.test.tsx
touch apps/web/app/tenants/\[slug\]/\(dashboard\)/plans/plan-form.test.tsx

# 4. Utilities
touch apps/web/lib/constants/plan-constants.ts
touch apps/web/lib/utils/plan-utils.ts
```

---

## Code Templates

### Server Action Template (companies.ts)
```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { CreateCompanySchema, UpdateCompanySchema } from '@repo/types';
import { apiFetch } from '../../lib/api';
import type {
  PaginatedCompaniesResponse,
  CompanyResponse,
  CompanyQuery,
} from '@repo/types';

export type CompanyActionState = { error: string } | null;

// Fetch
export async function fetchCompaniesAction(
  query: CompanyQuery = {},
): Promise<PaginatedCompaniesResponse> {
  const params = new URLSearchParams();
  if (query.page) params.set('page', query.page.toString());
  if (query.limit) params.set('limit', query.limit.toString());
  if (query.search) params.set('search', query.search);
  const qs = params.toString();
  return apiFetch<PaginatedCompaniesResponse>(
    `/companies${qs ? `?${qs}` : ''}`,
  );
}

export async function fetchCompanyAction(id: string): Promise<CompanyResponse> {
  return apiFetch<CompanyResponse>(`/companies/${id}`);
}

// Create
export async function createCompanyAction(
  _prev: CompanyActionState,
  formData: FormData,
): Promise<CompanyActionState> {
  const rawData = {
    name: formData.get('name'),
    taxId: formData.get('taxId') || undefined,
    phone: formData.get('phone') || undefined,
    email: formData.get('email') || undefined,
    address: formData.get('address') || undefined,
    contactPerson: formData.get('contactPerson') || undefined,
  };

  const result = CreateCompanySchema.safeParse(rawData);
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Datos inválidos' };
  }

  try {
    await apiFetch('/companies', {
      method: 'POST',
      body: JSON.stringify(result.data),
    });
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error al crear empresa' };
  }

  revalidatePath('/companies');
  return null;
}

// Update
export async function updateCompanyAction(
  _prev: CompanyActionState,
  formData: FormData,
): Promise<CompanyActionState> {
  const id = formData.get('id') as string;
  if (!id) {
    return { error: 'ID de empresa requerido' };
  }

  const rawData = {
    name: formData.get('name') || undefined,
    taxId: formData.get('taxId') || undefined,
    phone: formData.get('phone') || undefined,
    email: formData.get('email') || undefined,
    address: formData.get('address') || undefined,
    contactPerson: formData.get('contactPerson') || undefined,
  };

  const result = UpdateCompanySchema.safeParse(rawData);
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Datos inválidos' };
  }

  try {
    await apiFetch(`/companies/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(result.data),
    });
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error al actualizar' };
  }

  revalidatePath('/companies');
  return null;
}

// Delete
export async function deleteCompanyAction(id: string): Promise<CompanyActionState> {
  try {
    await apiFetch(`/companies/${id}`, { method: 'DELETE' });
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error al eliminar' };
  }

  revalidatePath('/companies');
  return null;
}
```

### Page Wrapper Template (page.tsx)
```typescript
import { getSessionUser } from '../../../../../lib/session';
import { apiFetch } from '../../../../../lib/api';
import { ErrorState } from '../../../../components/error-state';
import { CompaniesPageClient } from './companies-page-client';
import type { PaginatedCompaniesResponse } from '@repo/types';

interface CompaniesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CompaniesPage({ searchParams }: CompaniesPageProps) {
  const params = await searchParams;
  const page = typeof params['page'] === 'string' ? Number(params['page']) : 1;
  const search = typeof params['search'] === 'string' ? params['search'] : undefined;

  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return <ErrorState message="No se pudo obtener la sesión del usuario." />;
  }

  // Restrict access
  if (!['OWNER', 'ADMIN'].includes(sessionUser.role)) {
    return <ErrorState message="No tienes permiso para ver empresas." />;
  }

  let companiesData: PaginatedCompaniesResponse;
  try {
    const query = new URLSearchParams();
    query.set('page', page.toString());
    if (search) query.set('search', search);
    companiesData = await apiFetch<PaginatedCompaniesResponse>(
      `/companies?${query.toString()}`,
    );
  } catch {
    return <ErrorState message="No se pudieron cargar las empresas." />;
  }

  return (
    <CompaniesPageClient
      companies={companiesData}
      userRole={sessionUser.role}
    />
  );
}
```

### Form Component Template (with React Hook Form + Zod)
```typescript
'use client';

import { useActionState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateCompanySchema } from '@repo/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createCompanyAction } from '../../actions/companies';

type CompanyFormData = typeof CreateCompanySchema._type;

interface CompanyFormProps {
  onSuccess: () => void;
  initialData?: CompanyFormData;
}

export function CompanyForm({ onSuccess, initialData }: CompanyFormProps) {
  const [state, formAction] = useActionState(createCompanyAction, null);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CompanyFormData>({
    resolver: zodResolver(CreateCompanySchema),
    defaultValues: initialData,
  });

  const onSubmit = async (data: CompanyFormData) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });
    await formAction(formData);
    if (!state?.error) {
      reset();
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="text-xs font-semibold uppercase">Nombre de Empresa</label>
        <Input
          {...register('name')}
          placeholder="Ej: Seguros Vida Plena"
          className="mt-1"
        />
        {errors.name && <span className="text-xs text-red-500">{errors.name.message}</span>}
      </div>

      <div>
        <label className="text-xs font-semibold uppercase">RFC / TAX ID</label>
        <Input
          {...register('taxId')}
          placeholder="Ej: SVP123456ABC"
          className="mt-1"
        />
        {errors.taxId && <span className="text-xs text-red-500">{errors.taxId.message}</span>}
      </div>

      {/* More fields... */}

      {state?.error && <div className="text-xs text-red-500">{state.error}</div>}

      <Button type="submit" className="w-full">
        {initialData ? 'Guardar Cambios' : 'Crear Empresa'}
      </Button>
    </form>
  );
}
```

---

## Constants Template

```typescript
// lib/constants/plan-constants.ts

export const PLAN_STATUSES = ['ACTIVE', 'INACTIVE', 'EXHAUSTED'] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

export const STATUS_LABELS: Record<PlanStatus, string> = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
  EXHAUSTED: 'Agotado',
};

export const STATUS_COLORS: Record<PlanStatus, string> = {
  ACTIVE: 'bg-teal-100 text-teal-800',
  INACTIVE: 'bg-gray-100 text-gray-800',
  EXHAUSTED: 'bg-amber-100 text-amber-800',
};
```

---

## Component Props Reference

### CompaniesPageClient
```typescript
interface CompaniesPageClientProps {
  companies: PaginatedCompaniesResponse;
  userRole: UserRole;
}
```

### CompanyDrawer
```typescript
interface CompanyDrawerProps {
  open: boolean;
  company: CompanyResponse | null; // null = create mode
  onClose: () => void;
  onSuccess: () => void;
}
```

### PlansPageClient
```typescript
interface PlansPageClientProps {
  plans: PaginatedPlansResponse;
  userRole: UserRole;
  userLocationId: string | null;
  patients: { id: string; name: string }[];
  companies: { id: string; name: string }[];
  serviceTypes: { id: string; name: string }[];
  locations?: LocationResponse[];
}
```

### PlanDrawer
```typescript
interface PlanDrawerProps {
  open: boolean;
  plan: PlanResponse | null; // null = create mode
  onClose: () => void;
  onSuccess: () => void;
  patients: { id: string; name: string }[];
  companies: { id: string; name: string }[];
  serviceTypes: { id: string; name: string }[];
  locations?: LocationResponse[];
  userRole: UserRole;
  userLocationId: string | null;
}
```

---

## Test Template (Vitest + React Testing Library)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CompanyForm } from './company-form';

describe('CompanyForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render all required fields', () => {
    render(<CompanyForm onSuccess={vi.fn()} />);
    expect(screen.getByLabelText(/Nombre de Empresa/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/RFC/i)).toBeInTheDocument();
  });

  it('should show validation error when name is empty', async () => {
    const onSuccess = vi.fn();
    render(<CompanyForm onSuccess={onSuccess} />);

    const submitButton = screen.getByRole('button', { name: /Crear Empresa/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/nombre es obligatorio/i)).toBeInTheDocument();
    });
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('should call onSuccess when form is submitted with valid data', async () => {
    const onSuccess = vi.fn();
    render(<CompanyForm onSuccess={onSuccess} />);

    fireEvent.change(screen.getByPlaceholderText(/Seguros Vida Plena/i), {
      target: { value: 'Test Company' },
    });

    const submitButton = screen.getByRole('button', { name: /Crear Empresa/i });
    fireEvent.click(submitButton);

    // Mock the server action to succeed
    // ... your mock setup here

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });
});
```

---

## Colors & Styling

### Tailwind Classes (Renalfy)
```
Text:
- text-foreground = #191c1e (on_surface)
- text-muted-foreground = #3e484d (on_surface_variant)

Background:
- bg-surface = #f7f9fb (base)
- bg-card = #ffffff (surface_container_lowest)
- bg-secondary = #f2f4f6 (surface_container_low)

Buttons:
- Primary: bg-[#00647c] text-white rounded-md
- Secondary: bg-transparent border border-gray-300

Badges:
- ACTIVE: bg-teal-100 text-teal-800
- INACTIVE: bg-gray-100 text-gray-800
- EXHAUSTED: bg-amber-100 text-amber-800
```

---

## RLS Checklist

```
✅ Page wrapper checks user role (reject if not authorized)
✅ Query includes tenantId in apiFetch (automatic via auth header)
✅ MANAGER/STAFF filtered by locationId in page.tsx
✅ Server actions validate tenantId via JWT
✅ Frontend dropdowns respect locationId filter
```

---

## Debugging Tips

### "Dropdown empty when opening form"
- Check that page.tsx fetches pre-data and passes to PlanDrawer
- Verify apiFetch calls are correct (`/patients?limit=1000`, etc.)
- Check for RLS filtering hiding items

### "Form validation not showing errors"
- Ensure `react-hook-form` + `@hookform/resolvers` installed
- Check Zod schema is imported from `@repo/types`
- Verify error rendering: `{errors.field && <span>{errors.field.message}</span>}`

### "Delete action doesn't update table"
- Confirm `revalidatePath('/plans')` in action
- Check that page.tsx is Server Component (not `'use client'`)
- Verify delete button calls action correctly

---

## Common Pitfalls to Avoid

❌ **Don't:** Mix server actions with client-side hooks (useEffect + useState)
✅ **Do:** Use `useActionState` for form submission, `router.push()` for navigation

❌ **Don't:** Import from `@repo/types` without `as const` on enums
✅ **Do:** Use `typeof EnumType._type` for TypeScript inference

❌ **Don't:** Forget `revalidatePath()` after mutations
✅ **Do:** Call it after every POST/PATCH/DELETE in server action

❌ **Don't:** Render MANAGER/STAFF Companies nav link
✅ **Do:** Conditionally hide in nav based on `userRole`

❌ **Don't:** Allow MANAGER to select arbitrary `locationId` in Plan form
✅ **Do:** Force auto-fill from `userLocationId`

---

## Useful Commands

```bash
# Run tests for this sprint
pnpm test companies-plans-ui

# Type check
pnpm check-types

# Lint
pnpm lint

# Dev mode (watch)
pnpm dev

# Build
pnpm build

# Generate Prisma client (if schema changes)
cd apps/api && npx prisma generate
```

---

**Quick Reference v1.0 | 2026-03-23**
