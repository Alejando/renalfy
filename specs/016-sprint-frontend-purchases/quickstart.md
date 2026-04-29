# Quickstart — Integration Guide for Sprint 20 Frontend

**Feature**: Sprint 20 — Frontend UI for Purchases & Inventory Movements  
**Date**: 2026-04-28  
**Audience**: Frontend developers implementing pages and components

---

## Project Setup

### Prerequisites

1. Node.js 25+ (check `.nvmrc`)
2. `pnpm` installed
3. `apps/web` (Next.js 16 App Router) running locally
4. Backend (`apps/api`) running on `localhost:3019`
5. JWT tokens configured in `.env.local`

### Environment

```bash
# apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3019/api
```

### Dependencies

All dependencies are already installed in `package.json`:

```bash
# React Hook Form for form state
npm list react-hook-form

# Zod for schema validation
npm list zod

# shadcn/ui for components
npm list @radix-ui
```

If missing, install:

```bash
pnpm --filter web add react-hook-form zod @hookform/resolvers
```

---

## 1. Using API Schemas

All data contracts live in `@repo/types`. Import and use in your components:

### Example: Fetch Purchase Orders

```typescript
// app/inventory/purchase-orders/page.tsx
'use client';

import { useEffect, useState } from 'react';
import type { PurchaseOrder } from '@repo/types';
import { PurchaseOrdersListPage } from '@/components/inventory/purchase-orders-list';

export default function Page() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPOs = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/purchase-orders?page=1&limit=20`,
          {
            headers: {
              Authorization: `Bearer ${getAccessToken()}`, // Helper to get JWT from storage
            },
          }
        );
        
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status}`);
        }
        
        const data = await response.json();
        setPurchaseOrders(data.data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPOs();
  }, []);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return <PurchaseOrdersListPage orders={purchaseOrders} />;
}
```

### Example: Type Safety with Zod

```typescript
// Use Zod schemas to validate API responses
import { PurchaseOrderSchema } from '@repo/types';

const validateResponse = (data: unknown) => {
  try {
    const validated = PurchaseOrderSchema.parse(data);
    return validated;
  } catch (err) {
    console.error('Validation failed:', err);
    throw new Error('Invalid response from server');
  }
};
```

---

## 2. Form Implementation with React Hook Form + Zod

### Example: ReceiveItemsForm

```typescript
// components/inventory/receive-items-form.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ReceiveItemsFormSchema } from '@repo/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface ReceiveItemsFormProps {
  purchaseOrderId: string;
  locationId: string;
  items: Array<{
    purchaseOrderItemId: string;
    productId: string;
    productName: string;
    quantityOrdered: number;
    quantityReceived?: number;
    currentLocationStock: number;
  }>;
  onSubmit: (data: ReceiveItemsFormInput) => Promise<void>;
}

export function ReceiveItemsForm({
  purchaseOrderId,
  locationId,
  items,
  onSubmit,
}: ReceiveItemsFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: zodResolver(ReceiveItemsFormSchema),
    defaultValues: {
      purchaseOrderId,
      locationId,
      items: items.map((item) => ({
        purchaseOrderItemId: item.purchaseOrderItemId,
        productId: item.productId,
        quantityReceived: 0,
        unitsPerPackage: 1,
        unitPrice: '0',
        tax: '0',
      })),
      notes: '',
    },
  });

  const formItems = watch('items');

  const handleFormSubmit = async (data) => {
    try {
      await onSubmit(data);
      reset();
    } catch (err) {
      console.error('Form submission failed:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Item rows */}
      {formItems.map((item, idx) => {
        const remainingQty =
          items[idx].quantityOrdered - (items[idx].quantityReceived ?? 0);
        const quantityReceived = formItems[idx].quantityReceived || 0;
        const unitsPerPackage = formItems[idx].unitsPerPackage || 1;
        const stockDelta = quantityReceived * unitsPerPackage;
        const newStock = items[idx].currentLocationStock + stockDelta;

        return (
          <div
            key={item.purchaseOrderItemId}
            className="border p-4 rounded-lg space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium">Product</label>
                <div className="text-sm text-gray-600">
                  {items[idx].productName}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium">
                  Remaining Qty
                </label>
                <div className="text-sm text-gray-600">{remainingQty}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor={`items.${idx}.quantityReceived`} className="block text-sm font-medium">
                  Quantity Received
                </label>
                <Input
                  {...register(`items.${idx}.quantityReceived`, {
                    valueAsNumber: true,
                  })}
                  type="number"
                  min="0"
                  max={remainingQty}
                  className="mt-1"
                />
                {errors.items?.[idx]?.quantityReceived && (
                  <p className="text-red-600 text-sm mt-1">
                    {errors.items[idx]?.quantityReceived?.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor={`items.${idx}.unitsPerPackage`} className="block text-sm font-medium">
                  Units Per Package
                </label>
                <Input
                  {...register(`items.${idx}.unitsPerPackage`, {
                    valueAsNumber: true,
                  })}
                  type="number"
                  min="1"
                  className="mt-1"
                />
                {errors.items?.[idx]?.unitsPerPackage && (
                  <p className="text-red-600 text-sm mt-1">
                    {errors.items[idx]?.unitsPerPackage?.message}
                  </p>
                )}
              </div>
            </div>

            {/* Display calculations */}
            <div className="bg-blue-50 p-3 rounded text-sm space-y-1">
              <div>
                <span className="font-medium">Stock Delta:</span>{' '}
                {quantityReceived} × {unitsPerPackage} ={' '}
                <span className="font-bold">{stockDelta}</span> units
              </div>
              <div>
                <span className="font-medium">After Receipt:</span>{' '}
                {items[idx].currentLocationStock} + {stockDelta} ={' '}
                <span className="font-bold">{newStock}</span> units
              </div>
            </div>
          </div>
        );
      })}

      {/* Notes field */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium">
          Notes (Optional)
        </label>
        <Textarea
          {...register('notes')}
          placeholder="e.g., 'Partial receipt - some items damaged'"
          className="mt-1"
        />
        {errors.notes && (
          <p className="text-red-600 text-sm mt-1">{errors.notes.message}</p>
        )}
      </div>

      {/* Submit buttons */}
      <div className="flex gap-2 justify-end">
        <Button variant="outline" type="button">
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Register Receipt'}
        </Button>
      </div>
    </form>
  );
}
```

---

## 3. Custom Hooks for Data Fetching

### Example: usePurchaseOrders Hook

```typescript
// hooks/usePurchaseOrders.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { PurchaseOrder } from '@repo/types';

interface UsePurchaseOrdersOptions {
  page?: number;
  limit?: number;
  supplierId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function usePurchaseOrders(options: UsePurchaseOrdersOptions = {}) {
  const [data, setData] = useState<PurchaseOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (options.page) params.append('page', options.page.toString());
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.supplierId) params.append('supplierId', options.supplierId);
      if (options.status) params.append('status', options.status);
      if (options.dateFrom) params.append('dateFrom', options.dateFrom);
      if (options.dateTo) params.append('dateTo', options.dateTo);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/purchase-orders?${params}`,
        {
          headers: {
            Authorization: `Bearer ${getAccessToken()}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch: ${response.status} ${response.statusText}`
        );
      }

      const result = await response.json();
      setData(result.data);
      setTotal(result.pagination.total);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [options]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return {
    data,
    total,
    isLoading,
    error,
    refetch: fetch,
  };
}
```

### Example: useReceivePurchase Hook

```typescript
// hooks/useReceivePurchase.ts
'use client';

import { useState } from 'react';
import type { ReceiveItemsFormInput } from '@repo/types';

interface UseReceivePurchaseResult {
  data: any | null;
  isLoading: boolean;
  error: string | null;
  submit: (formData: ReceiveItemsFormInput) => Promise<void>;
}

export function useReceivePurchase(): UseReceivePurchaseResult {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (formData: ReceiveItemsFormInput) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/purchases`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getAccessToken()}`,
          },
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to register receipt');
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { data, isLoading, error, submit };
}
```

---

## 4. Layout & Page Structure

### Inventory Pages Hierarchy

```
app/tenants/[slug]/(dashboard)/
├── inventory/
│   ├── layout.tsx                 # Shared inventory nav
│   ├── products/
│   ├── suppliers/
│   ├── purchase-orders/
│   │   ├── page.tsx               # List page
│   │   └── [id]/
│   │       └── page.tsx           # Detail page
│   ├── purchases/
│   │   ├── page.tsx               # List page (inventory movements created from purchases)
│   │   └── [id]/
│   │       └── page.tsx           # Detail page
│   └── movements/
│       ├── page.tsx               # List page
│       └── [id]/
│           └── page.tsx           # Detail page
```

### Example: Purchase Orders List Page

```typescript
// app/tenants/[slug]/(dashboard)/inventory/purchase-orders/page.tsx
'use client';

import { useState } from 'react';
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders';
import { PurchaseOrdersTable } from '@/components/inventory/purchase-orders-table';
import { PurchaseOrdersFilters } from '@/components/inventory/purchase-orders-filters';
import { Button } from '@/components/ui/button';

export default function PurchaseOrdersPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({});

  const { data, total, isLoading, error, refetch } = usePurchaseOrders({
    page,
    limit: 20,
    ...filters,
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Purchase Orders</h1>
        <Button>Create PO</Button>
      </div>

      <PurchaseOrdersFilters onFiltersChange={setFilters} />

      {error && (
        <div className="bg-red-50 p-4 rounded-lg text-red-800">
          {error}
          <Button variant="outline" onClick={() => refetch()} className="mt-2">
            Retry
          </Button>
        </div>
      )}

      {isLoading ? (
        <div>Loading...</div>
      ) : data.length === 0 ? (
        <div>No purchase orders found.</div>
      ) : (
        <>
          <PurchaseOrdersTable orders={data} />
          {/* Pagination here */}
        </>
      )}
    </div>
  );
}
```

---

## 5. Error Handling Patterns

### Global Error Boundary (Optional)

```typescript
// app/inventory/error.tsx
'use client';

interface ErrorProps {
  error: Error;
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  return (
    <div className="bg-red-50 p-4 rounded-lg">
      <h2 className="text-red-800 font-bold">Something went wrong</h2>
      <p className="text-red-700 mt-2">{error.message}</p>
      <button onClick={() => reset()} className="mt-4 px-4 py-2 bg-red-800 text-white rounded">
        Try again
      </button>
    </div>
  );
}
```

### Toast Notifications

```typescript
// Use shadcn/ui toast (sonner or similar)
import { useToast } from '@/hooks/use-toast';

const { toast } = useToast();

// On success
toast({
  title: 'Success',
  description: 'Receipt registered for 3 items',
  variant: 'default',
});

// On error
toast({
  title: 'Error',
  description: error.message,
  variant: 'destructive',
});
```

---

## 6. Testing with Vitest + React Testing Library

### Example: Component Test

```typescript
// components/__tests__/receive-items-form.test.ts
import { render, screen, userEvent } from '@testing-library/react';
import { ReceiveItemsForm } from '../receive-items-form';

describe('ReceiveItemsForm', () => {
  it('should submit form with valid data', async () => {
    const mockOnSubmit = vi.fn();
    const items = [
      {
        purchaseOrderItemId: '123',
        productId: '456',
        productName: 'Test Product',
        quantityOrdered: 100,
        currentLocationStock: 50,
      },
    ];

    render(
      <ReceiveItemsForm
        purchaseOrderId="po-123"
        locationId="loc-123"
        items={items}
        onSubmit={mockOnSubmit}
      />
    );

    const input = screen.getByRole('spinbutton', { name: /quantity received/i });
    await userEvent.type(input, '50');

    const button = screen.getByRole('button', { name: /register receipt/i });
    await userEvent.click(button);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
    });
  });
});
```

---

## 7. Real-Time Updates with Polling

### Example: Auto-refresh Movements List

```typescript
// hooks/useInventoryMovementsWithPolling.ts
export function useInventoryMovementsWithPolling(
  pollInterval = 5000 // 5 seconds
) {
  const [movements, setMovements] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const refetch = useCallback(async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/inventory-movements?page=1&limit=20`
      );
      const data = await response.json();
      setMovements(data.data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Polling error:', err);
    }
  }, []);

  useEffect(() => {
    refetch(); // Fetch immediately

    const interval = setInterval(refetch, pollInterval);
    return () => clearInterval(interval);
  }, [refetch, pollInterval]);

  return { movements, lastUpdated, refetch };
}
```

---

## Key Principles

1. **Never filter data on frontend** — RLS is enforced on backend
2. **Always use Zod schemas** for type safety
3. **Show loading states** during async operations
4. **Handle 409 Conflict** errors gracefully (concurrent modifications)
5. **Use React Hook Form** for all forms
6. **Implement error boundaries** for graceful fallbacks
7. **Validate dates client-side** before submitting
8. **Use decimal libraries** for financial calculations (avoid floating-point errors)

---

## References

- **Type Definitions**: `/packages/types/src/`
- **API Contracts**: `/specs/016-sprint-frontend-purchases/contracts/`
- **Data Model**: `/specs/016-sprint-frontend-purchases/data-model.md`
- **React Hook Form**: https://react-hook-form.com/
- **Zod**: https://zod.dev/
- **shadcn/ui**: https://ui.shadcn.com/
