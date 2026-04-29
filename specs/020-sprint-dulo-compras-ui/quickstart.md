# Phase 1: Quickstart Guide — Sprint 20

**Goal**: Get a developer from zero to implementing their first component in <10 minutes.

---

## 1. Understand the Deliverables

Sprint 20 = **UI for Purchases & Inventory Movements** (frontend only, backend from Sprint 19).

### What You're Building

```
/inventory/purchases/{id}      ← NEW: Purchase detail page (read-only)
/inventory/movements           ← NEW: Movements list with filters & pagination
```

Plus:
- Complete the receive items flow (dialog + form for registering purchases)
- Ensure all components have tests (Vitest + React Testing Library)

### What Already Exists

- ✅ Backend endpoints: `/api/purchases`, `/api/purchases/{id}`, `/api/inventory-movements`
- ✅ Schemas in `@repo/types/purchases.schemas.ts`: `PurchaseDetailResponseSchema`, `InventoryMovementResponseSchema`
- ✅ Server action: `receivePurchaseAction()` in `apps/web/app/actions/purchases.ts`
- ✅ Partial UI: `purchases-page-client.tsx` (list view, View button disabled)
- ✅ Dialog: `receive-items-dialog.tsx` + `receive-items-form.tsx`

### What You're Building From Scratch

1. **Purchase detail page** (`purchases/[id]/page.tsx` + `purchase-detail-client.tsx`)
2. **Movements list page** (`movements/page.tsx` + `movements-page-client.tsx`)
3. **Movement filters component** (`movements/movement-filters.tsx`)
4. **Movement table component** (`movements/movement-table.tsx`)
5. **Tests for all components** (use Vitest + React Testing Library patterns from CLAUDE.md)

---

## 2. Setup & Prerequisites

### Environment

```bash
# Ensure correct Node version
nvm use          # Uses .nvmrc (Node 25)

# Install dependencies (if not already done)
pnpm install

# Start dev server (both api + web)
pnpm dev
# Opens: api :3019, web :3020
```

### Check Existing Code

```bash
# Review Sprint 19 backend types
cat packages/types/src/purchases.schemas.ts
cat packages/types/src/enums.ts

# Review existing purchase listing page
cat apps/web/app/tenants/[slug]/(dashboard)/inventory/purchases/purchases-page-client.tsx

# Review existing receive form
cat apps/web/app/tenants/[slug]/(dashboard)/inventory/purchase-orders/[id]/receive-items-form.tsx

# Review server action pattern
cat apps/web/app/actions/purchases.ts
```

---

## 3. Project Structure

```
apps/web/
├── app/
│   ├── actions/
│   │   └── purchases.ts              # Server actions (already exists)
│   ├── components/
│   │   ├── empty-state.tsx           # Reuse for "no movements" state
│   │   └── error-state.tsx           # Reuse for error states
│   ├── lib/
│   │   └── api.ts                    # apiFetch() wrapper
│   │   └── session.ts                # getSessionUser()
│   └── tenants/[slug]/(dashboard)/
│       └── inventory/
│           ├── purchases/
│           │   ├── page.tsx          # Server component (existing)
│           │   ├── purchases-page-client.tsx  # Client component (enable View button)
│           ├── purchases/[id]/       # NEW
│           │   ├── page.tsx          # NEW: Server component
│           │   ├── purchase-detail-client.tsx  # NEW: Client component
│           │   └── [...].test.tsx    # NEW: Tests
│           └── movements/            # NEW
│               ├── page.tsx          # NEW: Server component
│               ├── movements-page-client.tsx  # NEW: Client component
│               ├── movement-filters.tsx  # NEW: Filter form
│               ├── movement-table.tsx    # NEW: Table rendering
│               └── [...].test.tsx    # NEW: Tests
│
packages/types/
└── src/
    ├── purchases.schemas.ts     # Already defined
    └── enums.ts                 # Already defined
```

---

## 4. Getting Started: First Implementation

### Step 1: Create Purchase Detail Page (Server Component)

**File**: `apps/web/app/tenants/[slug]/(dashboard)/inventory/purchases/[id]/page.tsx`

```typescript
import type { PurchaseDetailResponse } from '@repo/types';
import { apiFetch } from '@/lib/api';
import { getSessionUser } from '@/lib/session';
import { ErrorState } from '@/app/components/error-state';
import { PurchaseDetailClient } from './purchase-detail-client';

interface PurchaseDetailPageProps {
  params: Promise<{ slug: string; id: string }>;
}

export default async function PurchaseDetailPage({
  params,
}: PurchaseDetailPageProps) {
  const { id } = await params;
  const sessionUser = await getSessionUser();

  if (!sessionUser || sessionUser.role === 'STAFF') {
    return <ErrorState message="No tienes permiso para ver compras." />;
  }

  let purchase: PurchaseDetailResponse;
  try {
    purchase = await apiFetch<PurchaseDetailResponse>(`/purchases/${id}`);
  } catch {
    return <ErrorState message="No se pudo cargar la compra." />;
  }

  if (sessionUser.role === 'MANAGER' && purchase.locationId !== sessionUser.locationId) {
    return <ErrorState message="No tienes permiso para ver compras de otra sucursal." />;
  }

  return <PurchaseDetailClient purchase={purchase} />;
}
```

### Step 2: Create Purchase Detail Client Component

**File**: `apps/web/app/tenants/[slug]/(dashboard)/inventory/purchases/[id]/purchase-detail-client.tsx`

```typescript
'use client';

import type { PurchaseDetailResponse } from '@repo/types';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface PurchaseDetailClientProps {
  purchase: PurchaseDetailResponse;
}

export function PurchaseDetailClient({ purchase }: PurchaseDetailClientProps) {
  const router = useRouter();

  const totalPrice = purchase.items.reduce((sum, item) => {
    return sum + parseFloat(item.subtotal || '0');
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          ← Volver
        </Button>
        <h1 className="text-2xl font-bold">Detalle de Compra</h1>
      </div>

      {/* Order Info */}
      <div className="grid grid-cols-2 gap-4 rounded-lg border p-4">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">Orden de Compra</p>
          <p className="text-lg font-bold">{purchase.purchaseOrderId}</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-muted-foreground">Proveedor</p>
          <p className="text-lg">{purchase.supplierName}</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-muted-foreground">Sucursal</p>
          <p className="text-lg">{purchase.locationName}</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-muted-foreground">Fecha</p>
          <p className="text-lg">
            {new Date(purchase.date).toLocaleDateString('es-MX')}
          </p>
        </div>
      </div>

      {/* Items Table */}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead className="text-right">Ordenado</TableHead>
              <TableHead className="text-right">Recibido</TableHead>
              <TableHead className="text-right">Unidades/Empaque</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead className="text-right">Impuesto</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {purchase.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.product.name}</TableCell>
                <TableCell className="text-right">{item.quantity}</TableCell>
                <TableCell className="text-right">{item.quantityReceived}</TableCell>
                <TableCell className="text-right">{item.unitsPerPackage}</TableCell>
                <TableCell className="text-right">${item.unitPrice}</TableCell>
                <TableCell className="text-right">${item.tax}</TableCell>
                <TableCell className="text-right font-semibold">
                  ${item.subtotal}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Total */}
      <div className="flex justify-end">
        <div className="w-full max-w-xs rounded-lg border p-4">
          <div className="flex justify-between">
            <span>Monto Total:</span>
            <span className="font-bold">${totalPrice.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### Step 3: Create Tests for Purchase Detail

**File**: `apps/web/app/tenants/[slug]/(dashboard)/inventory/purchases/[id]/purchase-detail-client.test.tsx`

```typescript
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import type { PurchaseDetailResponse } from '@repo/types';
import { PurchaseDetailClient } from './purchase-detail-client';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    back: vi.fn(),
  }),
}));

describe('PurchaseDetailClient', () => {
  const mockPurchase: PurchaseDetailResponse = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    tenantId: '550e8400-e29b-41d4-a716-446655440001',
    locationId: '550e8400-e29b-41d4-a716-446655440002',
    userId: '550e8400-e29b-41d4-a716-446655440003',
    supplierId: '550e8400-e29b-41d4-a716-446655440004',
    purchaseOrderId: '550e8400-e29b-41d4-a716-446655440005',
    date: new Date('2026-04-29'),
    amount: '5000.00',
    notes: 'Test notes',
    supplierName: 'Test Supplier',
    locationName: 'Clinic A',
    itemCount: 2,
    createdAt: new Date('2026-04-29'),
    items: [
      {
        id: '550e8400-e29b-41d4-a716-446655440006',
        purchaseId: '550e8400-e29b-41d4-a716-446655440000',
        productId: '550e8400-e29b-41d4-a716-446655440007',
        quantity: 10,
        quantityReceived: 10,
        unitsPerPackage: 100,
        unitPrice: '500.00',
        tax: '80.00',
        subtotal: '5080.00',
        createdAt: new Date('2026-04-29'),
        product: {
          id: '550e8400-e29b-41d4-a716-446655440007',
          name: 'Solución de diálisis',
          brand: 'Baxter',
        },
      },
    ],
    supplier: {
      id: '550e8400-e29b-41d4-a716-446655440004',
      name: 'Test Supplier',
      contact: 'John Doe',
      phone: '555-1234',
      email: 'test@supplier.com',
    },
    location: {
      id: '550e8400-e29b-41d4-a716-446655440002',
      name: 'Clinic A',
    },
  };

  it('renders purchase header information', () => {
    render(<PurchaseDetailClient purchase={mockPurchase} />);
    expect(screen.getByText('Detalle de Compra')).toBeInTheDocument();
    expect(screen.getByText('Test Supplier')).toBeInTheDocument();
    expect(screen.getByText('Clinic A')).toBeInTheDocument();
  });

  it('renders all items in the table', () => {
    render(<PurchaseDetailClient purchase={mockPurchase} />);
    expect(screen.getByText('Solución de diálisis')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument(); // quantity received
  });

  it('calculates and displays total amount', () => {
    render(<PurchaseDetailClient purchase={mockPurchase} />);
    expect(screen.getByText('$5080.00')).toBeInTheDocument();
  });
});
```

---

## 5. Common Patterns

### Fetching Data (Server Component)

```typescript
// pages/page.tsx
import { apiFetch } from '@/lib/api';

const data = await apiFetch<ResponseType>('/endpoint');
```

### Validating User Access

```typescript
// pages/page.tsx
import { getSessionUser } from '@/lib/session';

const sessionUser = await getSessionUser();
if (!sessionUser || sessionUser.role === 'STAFF') {
  return <ErrorState message="No tienes permiso" />;
}
```

### Filtering by Location (MANAGER)

```typescript
if (sessionUser.role === 'MANAGER') {
  // Only show data from their location
  if (purchase.locationId !== sessionUser.locationId) {
    return <ErrorState message="No tienes permiso" />;
  }
}
```

### Testing Components

```typescript
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { vi } from 'vitest';

describe('MyComponent', () => {
  it('does something', () => {
    render(<MyComponent />);
    expect(screen.getByText('Expected text')).toBeInTheDocument();
  });
});
```

---

## 6. Running Tests & Validation

```bash
# Unit tests
pnpm --filter web test

# Type check
pnpm check-types

# Linting
pnpm lint

# All three (must pass before PR)
pnpm lint && pnpm check-types && pnpm test
```

---

## 7. Development Checklist

Before opening a PR:

- [ ] All new components have tests (Vitest + React Testing Library)
- [ ] Purchase detail page loads and displays data correctly
- [ ] Movements list page loads with pagination + filters
- [ ] MANAGER role filtering works (can't see other locations)
- [ ] STAFF role gets access denied
- [ ] Error states display for missing/unauthorized data
- [ ] Links work (purchase list → detail, detail → movements)
- [ ] Responsive design tested (mobile 320px, tablet 768px, desktop 1024px)
- [ ] All TypeScript types are correct (no `any`, no `@ts-ignore`)
- [ ] `pnpm lint` passes
- [ ] `pnpm check-types` passes
- [ ] `pnpm test` passes

---

## 8. Documentation References

- **Schemas**: `packages/types/src/purchases.schemas.ts`
- **Style Guide**: `CLAUDE.md` (Google TypeScript Style Guide, TDD, component patterns)
- **Constitution**: `.specify/memory/constitution.md` (multi-tenant, RLS, testing rules)
- **Backend API**: `apps/api/src/purchases/` (endpoint docs in code comments)
- **Existing UI**: `apps/web/app/tenants/[slug]/(dashboard)/inventory/purchases/purchases-page-client.tsx`

---

## 9. Troubleshooting

| Issue | Solution |
|-------|----------|
| "Cannot find module '@repo/types'" | Run `pnpm install` in monorepo root |
| "apiFetch is not exported" | Check `apps/web/lib/api.ts` exists and has `export function apiFetch` |
| "getSessionUser returns null" | Session expired or JWT missing; check middleware + cookies |
| TypeScript errors on API response | Use `Schema.parse()` to validate before using data |
| Tests fail with "useRouter is not a function" | Mock `next/navigation` with `vi.mock()` |

---

## Next Steps

1. **Implement** Purchase Detail page (server + client components + tests)
2. **Implement** Movements List page (server + client + filters + table + tests)
3. **Enable** View button in purchases list to navigate to detail
4. **Test** all flows end-to-end (list → detail → movements → back)
5. **Validate** role-based access (STAFF denied, MANAGER filtered, OWNER/ADMIN unrestricted)
6. **Ensure** responsive design on mobile/tablet/desktop
7. **Run** `pnpm lint && pnpm check-types && pnpm test` — all must pass
8. **Open PR** to main branch

You're ready to start! 🚀
