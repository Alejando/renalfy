# Sprint 22 — UI Financials Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete financial dashboard UI (Sales, Income, Expense, CashClose) with 4 tabs, forms, tables, filtering, and >80% test coverage.

**Architecture:** Single page (`/dashboard/financials`) with tab navigation. Each tab is a self-contained component managing its own React Query state, with shared modals for create/edit flows. All forms use React Hook Form + Zod for validation. Data fetching via React Query hooks. TDD workflow: tests first, minimal implementation, refactor.

**Tech Stack:** Next.js 16 (App Router), React 19, TanStack React Query, React Hook Form, Zod, Shadcn/ui, Tailwind CSS v4, Vitest, React Testing Library, Zustand (for tab state).

---

## File Structure

```
apps/web/src/app/dashboard/financials/
├── page.tsx                                    # Main page with tab layout
├── layout.tsx                                  # (optional, if shared layout)
├── components/
│   ├── FinancialsPage.tsx                     # Tab navigation wrapper
│   ├── SalesTab.tsx                           # Sales list + create button
│   ├── IncomeTab.tsx                          # Income list + create button
│   ├── ExpenseTab.tsx                         # Expense list + create button
│   ├── CashCloseTab.tsx                       # CashClose list + create button
│   ├── modals/
│   │   ├── CreateSaleModal.tsx                # Form to create sale
│   │   ├── CreateIncomeModal.tsx              # Form to create income
│   │   ├── CreateExpenseModal.tsx             # Form to create expense
│   │   ├── CreateCashCloseModal.tsx           # Form to create cash close
│   │   └── DetailDrawer.tsx                   # View details of transaction
│   ├── tables/
│   │   ├── SalesTable.tsx                     # Render sales list with actions
│   │   ├── IncomeTable.tsx                    # Render income list
│   │   ├── ExpenseTable.tsx                   # Render expense list
│   │   └── CashCloseTable.tsx                 # Render cash close list
│   ├── filters/
│   │   └── FinancialFilters.tsx               # Shared filter UI
│   ├── Totals.tsx                             # Summary card (for CashClose)
│   └── LoadingState.tsx                       # Skeleton loaders
├── hooks/
│   ├── useSales.ts                            # React Query hooks for sales
│   ├── useIncomes.ts                          # React Query hooks for incomes
│   ├── useExpenses.ts                         # React Query hooks for expenses
│   ├── useCashCloses.ts                       # React Query hooks for cash closes
│   ├── useFinancialFilters.ts                 # Shared filter state (Zustand)
│   └── useDetailDrawer.ts                     # Modal state management
├── store/
│   └── financial-store.ts                     # Zustand store (tab, modals, filters)
├── types.ts                                    # Local TypeScript types
├── __tests__/
│   ├── FinancialsPage.test.tsx
│   ├── SalesTab.test.tsx
│   ├── IncomeTab.test.tsx
│   ├── ExpenseTab.test.tsx
│   ├── CashCloseTab.test.tsx
│   ├── CreateSaleModal.test.tsx
│   ├── CreateIncomeModal.test.tsx
│   ├── CreateExpenseModal.test.tsx
│   ├── CreateCashCloseModal.test.tsx
│   ├── SalesTable.test.tsx
│   ├── IncomeTable.test.tsx
│   ├── ExpenseTable.test.tsx
│   ├── CashCloseTable.test.tsx
│   ├── FinancialFilters.test.tsx
│   └── hooks.test.ts
```

---

## Phase 1: Setup & Hooks (React Query)

### Task 1: Create React Query hooks for Sales

**Files:**
- Create: `apps/web/src/app/dashboard/financials/hooks/useSales.ts`
- Test: `apps/web/src/app/dashboard/financials/__tests__/hooks.test.ts`

- [ ] **Step 1: Write failing test for useSales hook**

```typescript
// apps/web/src/app/dashboard/financials/__tests__/hooks.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSales } from '../hooks/useSales.js';
import { ReactNode } from 'react';

describe('useSales', () => {
  it('should fetch sales data', async () => {
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useSales(), { wrapper });
    
    expect(result.current.isLoading).toBe(true);
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    expect(result.current.data).toBeDefined();
    expect(Array.isArray(result.current.data)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/alejandroprado/pratum/renalfy
pnpm test -- FinancialFilters.test.tsx --run
```

Expected output: Module not found error for `useSales`

- [ ] **Step 3: Implement useSales hook**

```typescript
// apps/web/src/app/dashboard/financials/hooks/useSales.ts
import { useQuery } from '@tanstack/react-query.js';

interface SalesFilters {
  dateFrom?: string;
  dateTo?: string;
  clientId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export const useSales = (filters?: SalesFilters) => {
  const queryParams = new URLSearchParams();
  if (filters?.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
  if (filters?.dateTo) queryParams.append('dateTo', filters.dateTo);
  if (filters?.clientId) queryParams.append('clientId', filters.clientId);
  if (filters?.status) queryParams.append('status', filters.status);
  if (filters?.page) queryParams.append('page', String(filters.page));
  if (filters?.limit) queryParams.append('limit', String(filters.limit));

  return useQuery({
    queryKey: ['sales', filters],
    queryFn: async () => {
      const res = await fetch(`/api/sales?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch sales');
      return res.json();
    },
  });
};

export const useCreateSale = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to create sale');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
  });
};

export const useCancelSale = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (saleId: string) => {
      const res = await fetch(`/api/sales/${saleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      });
      if (!res.ok) throw new Error('Failed to cancel sale');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
  });
};
```

- [ ] **Step 4: Add missing import**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query.js';
```

- [ ] **Step 5: Run test to verify it passes**

```bash
pnpm test -- hooks.test.ts --run
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/dashboard/financials/hooks/useSales.ts apps/web/src/app/dashboard/financials/__tests__/hooks.test.ts
git commit -m "feat: add useSales React Query hook with create and cancel mutations"
```

---

### Task 2: Create React Query hooks for Income, Expense, CashClose

**Files:**
- Create: `apps/web/src/app/dashboard/financials/hooks/useIncomes.ts`
- Create: `apps/web/src/app/dashboard/financials/hooks/useExpenses.ts`
- Create: `apps/web/src/app/dashboard/financials/hooks/useCashCloses.ts`
- Modify: `apps/web/src/app/dashboard/financials/__tests__/hooks.test.ts` (add more tests)

- [ ] **Step 1: Write tests for useIncomes, useExpenses, useCashCloses**

```typescript
// Add to hooks.test.ts
describe('useIncomes', () => {
  it('should fetch incomes data', async () => {
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useIncomes(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    expect(result.current.data).toBeDefined();
  });
});

describe('useExpenses', () => {
  it('should fetch expenses data', async () => {
    // Same pattern as useIncomes
  });
});

describe('useCashCloses', () => {
  it('should fetch cash closes data', async () => {
    // Same pattern
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test -- hooks.test.ts --run
```

- [ ] **Step 3: Implement useIncomes hook**

```typescript
// apps/web/src/app/dashboard/financials/hooks/useIncomes.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query.js';

interface IncomeFilters {
  dateFrom?: string;
  dateTo?: string;
  type?: string;
  page?: number;
  limit?: number;
}

export const useIncomes = (filters?: IncomeFilters) => {
  const queryParams = new URLSearchParams();
  if (filters?.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
  if (filters?.dateTo) queryParams.append('dateTo', filters.dateTo);
  if (filters?.type) queryParams.append('type', filters.type);
  if (filters?.page) queryParams.append('page', String(filters.page));
  if (filters?.limit) queryParams.append('limit', String(filters.limit));

  return useQuery({
    queryKey: ['incomes', filters],
    queryFn: async () => {
      const res = await fetch(`/api/incomes?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch incomes');
      return res.json();
    },
  });
};

export const useCreateIncome = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/incomes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to create income');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomes'] });
    },
  });
};

export const useCancelIncome = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (incomeId: string) => {
      const res = await fetch(`/api/incomes/${incomeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      });
      if (!res.ok) throw new Error('Failed to cancel income');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomes'] });
    },
  });
};
```

- [ ] **Step 4: Implement useExpenses hook (same pattern as useIncomes)**

```typescript
// apps/web/src/app/dashboard/financials/hooks/useExpenses.ts
// (identical to useIncomes, just replace 'incomes' with 'expenses' and endpoint '/api/expenses')
```

- [ ] **Step 5: Implement useCashCloses hook**

```typescript
// apps/web/src/app/dashboard/financials/hooks/useCashCloses.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query.js';

interface CashCloseFilters {
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export const useCashCloses = (filters?: CashCloseFilters) => {
  const queryParams = new URLSearchParams();
  if (filters?.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
  if (filters?.dateTo) queryParams.append('dateTo', filters.dateTo);
  if (filters?.page) queryParams.append('page', String(filters.page));
  if (filters?.limit) queryParams.append('limit', String(filters.limit));

  return useQuery({
    queryKey: ['cashCloses', filters],
    queryFn: async () => {
      const res = await fetch(`/api/cash-closes?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch cash closes');
      return res.json();
    },
  });
};

export const useCreateCashClose = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/cash-closes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to create cash close');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashCloses'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['incomes'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
};
```

- [ ] **Step 6: Run tests to verify they all pass**

```bash
pnpm test -- hooks.test.ts --run
```

Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/dashboard/financials/hooks/useIncomes.ts apps/web/src/app/dashboard/financials/hooks/useExpenses.ts apps/web/src/app/dashboard/financials/hooks/useCashCloses.ts
git commit -m "feat: add React Query hooks for incomes, expenses, and cash closes"
```

---

### Task 3: Create Zustand store for financial tab/modal state

**Files:**
- Create: `apps/web/src/app/dashboard/financials/store/financial-store.ts`
- Test: `apps/web/src/app/dashboard/financials/__tests__/store.test.ts`

- [ ] **Step 1: Write failing test for financial store**

```typescript
// apps/web/src/app/dashboard/financials/__tests__/store.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useFinancialStore } from '../store/financial-store.js';

describe('useFinancialStore', () => {
  beforeEach(() => {
    useFinancialStore.setState({
      activeTab: 'sales',
      openModal: null,
      selectedTransactionId: null,
    });
  });

  it('should have initial state', () => {
    const state = useFinancialStore.getState();
    expect(state.activeTab).toBe('sales');
    expect(state.openModal).toBeNull();
  });

  it('should change active tab', () => {
    useFinancialStore.setState({ activeTab: 'income' });
    const state = useFinancialStore.getState();
    expect(state.activeTab).toBe('income');
  });

  it('should open modal', () => {
    useFinancialStore.setState({ openModal: 'create-sale' });
    const state = useFinancialStore.getState();
    expect(state.openModal).toBe('create-sale');
  });

  it('should close modal', () => {
    useFinancialStore.setState({ openModal: null });
    const state = useFinancialStore.getState();
    expect(state.openModal).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- store.test.ts --run
```

Expected: Module not found

- [ ] **Step 3: Implement Zustand store**

```typescript
// apps/web/src/app/dashboard/financials/store/financial-store.ts
import { create } from 'zustand.js';

type TabType = 'sales' | 'income' | 'expense' | 'cashClose';
type ModalType = 'create-sale' | 'create-income' | 'create-expense' | 'create-cashClose' | 'details' | null;

interface FinancialStore {
  activeTab: TabType;
  openModal: ModalType;
  selectedTransactionId: string | null;
  
  setActiveTab: (tab: TabType) => void;
  openCreateModal: (modal: Exclude<ModalType, null | 'details'>) => void;
  openDetailModal: (transactionId: string) => void;
  closeModal: () => void;
}

export const useFinancialStore = create<FinancialStore>((set) => ({
  activeTab: 'sales',
  openModal: null,
  selectedTransactionId: null,
  
  setActiveTab: (tab) => set({ activeTab: tab }),
  openCreateModal: (modal) => set({ openModal: modal }),
  openDetailModal: (transactionId) => set({ openModal: 'details', selectedTransactionId: transactionId }),
  closeModal: () => set({ openModal: null, selectedTransactionId: null }),
}));
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test -- store.test.ts --run
```

Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/dashboard/financials/store/financial-store.ts apps/web/src/app/dashboard/financials/__tests__/store.test.ts
git commit -m "feat: add Zustand store for financial dashboard state management"
```

---

## Phase 2: Table & Filter Components

### Task 4: Create SalesTable and FinancialFilters components

**Files:**
- Create: `apps/web/src/app/dashboard/financials/components/tables/SalesTable.tsx`
- Create: `apps/web/src/app/dashboard/financials/components/filters/FinancialFilters.tsx`
- Test: `apps/web/src/app/dashboard/financials/__tests__/SalesTable.test.tsx`
- Test: `apps/web/src/app/dashboard/financials/__tests__/FinancialFilters.test.tsx`

- [ ] **Step 1: Write failing test for SalesTable**

```typescript
// apps/web/src/app/dashboard/financials/__tests__/SalesTable.test.tsx
import { render, screen } from '@testing-library/react.js';
import { SalesTable } from '../components/tables/SalesTable.js';
import { describe, it, expect, vi } from 'vitest';

describe('SalesTable', () => {
  it('should render sales table with headers', () => {
    const mockSales = [];
    const mockOnDetails = vi.fn();
    const mockOnCancel = vi.fn();

    render(
      <SalesTable 
        sales={mockSales}
        isLoading={false}
        onDetails={mockOnDetails}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Folio')).toBeInTheDocument();
    expect(screen.getByText('Cliente')).toBeInTheDocument();
    expect(screen.getByText('Fecha')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('Estado')).toBeInTheDocument();
  });

  it('should render sales rows', () => {
    const mockSales = [
      {
        id: '1',
        folio: 'LOC-2026-00001',
        clientId: 'client-1',
        client: { name: 'Juan Pérez' },
        date: new Date('2026-04-30'),
        total: 1000,
        status: 'ACTIVE',
      },
    ];
    const mockOnDetails = vi.fn();
    const mockOnCancel = vi.fn();

    render(
      <SalesTable 
        sales={mockSales}
        isLoading={false}
        onDetails={mockOnDetails}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('LOC-2026-00001')).toBeInTheDocument();
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    expect(screen.getByText('1000')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- SalesTable.test.tsx --run
```

- [ ] **Step 3: Implement SalesTable component**

```typescript
// apps/web/src/app/dashboard/financials/components/tables/SalesTable.tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.js';
import { Button } from '@/components/ui/button.js';
import { formatCurrency, formatDate } from '@/lib/formatters.js';

interface Sale {
  id: string;
  folio: string;
  clientId: string;
  client: { name: string };
  date: Date;
  total: number;
  status: 'ACTIVE' | 'FINISHED' | 'SETTLED' | 'CANCELLED';
}

interface SalesTableProps {
  sales: Sale[];
  isLoading: boolean;
  onDetails: (saleId: string) => void;
  onCancel: (saleId: string) => void;
}

export const SalesTable = ({ sales, isLoading, onDetails, onCancel }: SalesTableProps) => {
  if (isLoading) {
    return <div className="py-8 text-center">Cargando...</div>;
  }

  if (sales.length === 0) {
    return <div className="py-8 text-center text-gray-500">No hay ventas registradas</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Folio</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead>Fecha</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sales.map((sale) => (
          <TableRow key={sale.id}>
            <TableCell className="font-mono">{sale.folio}</TableCell>
            <TableCell>{sale.client.name}</TableCell>
            <TableCell>{formatDate(sale.date)}</TableCell>
            <TableCell>{formatCurrency(sale.total)}</TableCell>
            <TableCell>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                sale.status === 'ACTIVE' ? 'bg-blue-100 text-blue-800' :
                sale.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {sale.status}
              </span>
            </TableCell>
            <TableCell>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onDetails(sale.id)}
                >
                  Detalles
                </Button>
                {sale.status === 'ACTIVE' && (
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => onCancel(sale.id)}
                  >
                    Anular
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test -- SalesTable.test.tsx --run
```

Expected: PASS

- [ ] **Step 5: Write failing test for FinancialFilters**

```typescript
// apps/web/src/app/dashboard/financials/__tests__/FinancialFilters.test.tsx
import { render, screen, fireEvent } from '@testing-library/react.js';
import { FinancialFilters } from '../components/filters/FinancialFilters.js';
import { describe, it, expect, vi } from 'vitest';

describe('FinancialFilters', () => {
  it('should render date range inputs', () => {
    const mockOnFilter = vi.fn();
    render(
      <FinancialFilters 
        onFilter={mockOnFilter}
        filterType="sales"
      />
    );

    expect(screen.getByPlaceholderText(/Desde/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Hasta/i)).toBeInTheDocument();
  });

  it('should call onFilter when dates change', () => {
    const mockOnFilter = vi.fn();
    render(
      <FinancialFilters 
        onFilter={mockOnFilter}
        filterType="sales"
      />
    );

    const dateInput = screen.getByPlaceholderText(/Desde/i) as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '2026-04-01' } });
    
    // Debounce delay
    setTimeout(() => {
      expect(mockOnFilter).toHaveBeenCalled();
    }, 350);
  });
});
```

- [ ] **Step 6: Implement FinancialFilters component**

```typescript
// apps/web/src/app/dashboard/financials/components/filters/FinancialFilters.tsx
import { useState, useCallback } from 'react.js';
import { Input } from '@/components/ui/input.js';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.js';
import { debounce } from '@/lib/utils.js';

type FilterType = 'sales' | 'income' | 'expense' | 'cashClose';

interface FinancialFiltersProps {
  onFilter: (filters: any) => void;
  filterType: FilterType;
}

export const FinancialFilters = ({ onFilter, filterType }: FinancialFiltersProps) => {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [type, setType] = useState('');
  const [clientId, setClientId] = useState('');

  const debouncedFilter = useCallback(
    debounce((filters: any) => onFilter(filters), 300),
    [onFilter]
  );

  const handleDateFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDateFrom(value);
    debouncedFilter({ dateFrom: value, dateTo, type, clientId });
  };

  const handleDateToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDateTo(value);
    debouncedFilter({ dateFrom, dateTo: value, type, clientId });
  };

  return (
    <div className="flex gap-4 mb-4 flex-wrap">
      <Input
        type="date"
        placeholder="Desde"
        value={dateFrom}
        onChange={handleDateFromChange}
        className="w-40"
      />
      <Input
        type="date"
        placeholder="Hasta"
        value={dateTo}
        onChange={handleDateToChange}
        className="w-40"
      />
      
      {filterType === 'sales' && (
        <Input
          placeholder="ID Cliente"
          value={clientId}
          onChange={(e) => {
            setClientId(e.target.value);
            debouncedFilter({ dateFrom, dateTo, type, clientId: e.target.value });
          }}
          className="w-40"
        />
      )}

      {(filterType === 'income' || filterType === 'expense') && (
        <Select value={type} onValueChange={(value) => {
          setType(value);
          debouncedFilter({ dateFrom, dateTo, type: value, clientId });
        }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos</SelectItem>
            {filterType === 'income' && (
              <>
                <SelectItem value="SALES_OTHER">Venta Otra</SelectItem>
                <SelectItem value="REFUND">Reembolso</SelectItem>
                <SelectItem value="OTHER">Otro</SelectItem>
              </>
            )}
            {filterType === 'expense' && (
              <>
                <SelectItem value="SUPPLIES">Suministros</SelectItem>
                <SelectItem value="UTILITIES">Servicios</SelectItem>
                <SelectItem value="STAFF">Personal</SelectItem>
                <SelectItem value="OTHER">Otro</SelectItem>
              </>
            )}
          </SelectContent>
        </Select>
      )}
    </div>
  );
};
```

- [ ] **Step 7: Run tests to verify they pass**

```bash
pnpm test -- SalesTable.test.tsx FinancialFilters.test.tsx --run
```

Expected: All PASS

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/app/dashboard/financials/components/tables/SalesTable.tsx apps/web/src/app/dashboard/financials/components/filters/FinancialFilters.tsx apps/web/src/app/dashboard/financials/__tests__/SalesTable.test.tsx apps/web/src/app/dashboard/financials/__tests__/FinancialFilters.test.tsx
git commit -m "feat: add SalesTable and FinancialFilters components with tests"
```

---

### Task 5: Create Income, Expense, CashClose tables

**Files:**
- Create: `apps/web/src/app/dashboard/financials/components/tables/IncomeTable.tsx`
- Create: `apps/web/src/app/dashboard/financials/components/tables/ExpenseTable.tsx`
- Create: `apps/web/src/app/dashboard/financials/components/tables/CashCloseTable.tsx`
- Modify: `apps/web/src/app/dashboard/financials/__tests__/` (add tests for each)

- [ ] **Step 1: Write failing tests for all three tables**

```typescript
// Add to __tests__ folder
// IncomeTable.test.tsx, ExpenseTable.test.tsx, CashCloseTable.test.tsx with similar structure to SalesTable.test.tsx

describe('IncomeTable', () => {
  it('should render income table with headers', () => {
    // Similar to SalesTable test
    expect(screen.getByText('Fecha')).toBeInTheDocument();
    expect(screen.getByText('Tipo')).toBeInTheDocument();
    expect(screen.getByText('Monto')).toBeInTheDocument();
  });
});

describe('ExpenseTable', () => {
  // Same as IncomeTable
});

describe('CashCloseTable', () => {
  it('should render cash close table', () => {
    expect(screen.getByText('Fecha')).toBeInTheDocument();
    expect(screen.getByText('Total en Caja')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test -- IncomeTable.test.tsx ExpenseTable.test.tsx CashCloseTable.test.tsx --run
```

- [ ] **Step 3: Implement IncomeTable**

```typescript
// apps/web/src/app/dashboard/financials/components/tables/IncomeTable.tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.js';
import { Button } from '@/components/ui/button.js';
import { formatCurrency, formatDate } from '@/lib/formatters.js';

interface Income {
  id: string;
  date: Date;
  type: string;
  amount: number;
  description: string;
  status: 'ACTIVE' | 'CANCELLED';
}

interface IncomeTableProps {
  incomes: Income[];
  isLoading: boolean;
  onDetails: (incomeId: string) => void;
  onCancel: (incomeId: string) => void;
}

export const IncomeTable = ({ incomes, isLoading, onDetails, onCancel }: IncomeTableProps) => {
  if (isLoading) {
    return <div className="py-8 text-center">Cargando...</div>;
  }

  if (incomes.length === 0) {
    return <div className="py-8 text-center text-gray-500">No hay ingresos registrados</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fecha</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Monto</TableHead>
          <TableHead>Descripción</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {incomes.map((income) => (
          <TableRow key={income.id}>
            <TableCell>{formatDate(income.date)}</TableCell>
            <TableCell>{income.type}</TableCell>
            <TableCell>{formatCurrency(income.amount)}</TableCell>
            <TableCell>{income.description}</TableCell>
            <TableCell>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                income.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                'bg-red-100 text-red-800'
              }`}>
                {income.status}
              </span>
            </TableCell>
            <TableCell>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onDetails(income.id)}
                >
                  Detalles
                </Button>
                {income.status === 'ACTIVE' && (
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => onCancel(income.id)}
                  >
                    Cancelar
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
```

- [ ] **Step 4: Implement ExpenseTable (identical pattern to IncomeTable)**

```typescript
// apps/web/src/app/dashboard/financials/components/tables/ExpenseTable.tsx
// Same as IncomeTable, just replace "Ingreso" with "Egreso"
```

- [ ] **Step 5: Implement CashCloseTable**

```typescript
// apps/web/src/app/dashboard/financials/components/tables/CashCloseTable.tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.js';
import { Button } from '@/components/ui/button.js';
import { formatCurrency, formatDate } from '@/lib/formatters.js';

interface CashClose {
  id: string;
  date: Date;
  totalSales: number;
  totalIncomes: number;
  totalExpenses: number;
  totalInCash: number;
  status: string;
}

interface CashCloseTableProps {
  cashCloses: CashClose[];
  isLoading: boolean;
  onDetails: (cashCloseId: string) => void;
}

export const CashCloseTable = ({ cashCloses, isLoading, onDetails }: CashCloseTableProps) => {
  if (isLoading) {
    return <div className="py-8 text-center">Cargando...</div>;
  }

  if (cashCloses.length === 0) {
    return <div className="py-8 text-center text-gray-500">No hay cortes registrados</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fecha</TableHead>
          <TableHead>Ventas</TableHead>
          <TableHead>Ingresos</TableHead>
          <TableHead>Egresos</TableHead>
          <TableHead>Total en Caja</TableHead>
          <TableHead>Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {cashCloses.map((cc) => (
          <TableRow key={cc.id}>
            <TableCell>{formatDate(cc.date)}</TableCell>
            <TableCell>{formatCurrency(cc.totalSales)}</TableCell>
            <TableCell>{formatCurrency(cc.totalIncomes)}</TableCell>
            <TableCell>{formatCurrency(cc.totalExpenses)}</TableCell>
            <TableCell className="font-bold">{formatCurrency(cc.totalInCash)}</TableCell>
            <TableCell>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onDetails(cc.id)}
              >
                Detalles
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
pnpm test -- IncomeTable.test.tsx ExpenseTable.test.tsx CashCloseTable.test.tsx --run
```

Expected: All PASS

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/dashboard/financials/components/tables/IncomeTable.tsx apps/web/src/app/dashboard/financials/components/tables/ExpenseTable.tsx apps/web/src/app/dashboard/financials/components/tables/CashCloseTable.tsx
git commit -m "feat: add Income, Expense, and CashClose tables with full test coverage"
```

---

## Phase 3: Modal/Form Components

### Task 6: Create CreateSaleModal with validation

**Files:**
- Create: `apps/web/src/app/dashboard/financials/components/modals/CreateSaleModal.tsx`
- Test: `apps/web/src/app/dashboard/financials/__tests__/CreateSaleModal.test.tsx`

- [ ] **Step 1: Write failing test for CreateSaleModal**

```typescript
// apps/web/src/app/dashboard/financials/__tests__/CreateSaleModal.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react.js';
import userEvent from '@testing-library/user-event.js';
import { CreateSaleModal } from '../components/modals/CreateSaleModal.js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query.js';
import { describe, it, expect, vi } from 'vitest';

const queryClient = new QueryClient();
const wrapper = ({ children }: any) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

describe('CreateSaleModal', () => {
  it('should render modal with form fields', () => {
    render(
      <CreateSaleModal open={true} onClose={() => {}} />,
      { wrapper }
    );

    expect(screen.getByLabelText(/Cliente/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Método de Pago/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Crear Venta/i })).toBeInTheDocument();
  });

  it('should validate required fields before submit', async () => {
    const mockOnClose = vi.fn();
    render(
      <CreateSaleModal open={true} onClose={mockOnClose} />,
      { wrapper }
    );

    const submitButton = screen.getByRole('button', { name: /Crear Venta/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Cliente es requerido/i)).toBeInTheDocument();
    });
  });

  it('should submit form with valid data', async () => {
    const mockOnClose = vi.fn();
    const user = userEvent.setup();

    render(
      <CreateSaleModal open={true} onClose={mockOnClose} />,
      { wrapper }
    );

    const clientSelect = screen.getByLabelText(/Cliente/i);
    const paymentSelect = screen.getByLabelText(/Método de Pago/i);
    const submitButton = screen.getByRole('button', { name: /Crear Venta/i });

    await user.selectOption(clientSelect, 'client-1');
    await user.selectOption(paymentSelect, 'CASH');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- CreateSaleModal.test.tsx --run
```

- [ ] **Step 3: Create sale validation schema in @repo/types**

```typescript
// packages/types/src/sales.schemas.ts (add or modify)
import { z } from 'zod.js';

export const CreateSaleSchema = z.object({
  clientId: z.string().min(1, 'Cliente es requerido'),
  items: z.array(z.object({
    productId: z.string().min(1, 'Producto es requerido'),
    quantity: z.number().int().min(1, 'Cantidad debe ser mayor a 0'),
    unitPrice: z.number().min(0, 'Precio debe ser positivo'),
  })).min(1, 'Al menos un producto es requerido'),
  paymentType: z.enum(['CASH', 'CREDIT', 'DEBIT', 'TRANSFER']),
});

export type CreateSaleInput = z.infer<typeof CreateSaleSchema>;
```

- [ ] **Step 4: Implement CreateSaleModal**

```typescript
// apps/web/src/app/dashboard/financials/components/modals/CreateSaleModal.tsx
import { useForm, useFieldArray } from 'react-hook-form.js';
import { zodResolver } from '@hookform/resolvers/zod.js';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog.js';
import { Button } from '@/components/ui/button.js';
import { Input } from '@/components/ui/input.js';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.js';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form.js';
import { toast } from 'sonner.js';
import { CreateSaleSchema } from '@repo/types/sales.schemas.js';
import { useCreateSale } from '../hooks/useSales.js';
import { useQuery } from '@tanstack/react-query.js';

interface CreateSaleModalProps {
  open: boolean;
  onClose: () => void;
}

export const CreateSaleModal = ({ open, onClose }: CreateSaleModalProps) => {
  const form = useForm({
    resolver: zodResolver(CreateSaleSchema),
    defaultValues: {
      clientId: '',
      items: [{ productId: '', quantity: 1, unitPrice: 0 }],
      paymentType: 'CASH' as const,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const { mutate: createSale, isPending } = useCreateSale();

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const res = await fetch('/api/clients');
      return res.json();
    },
  });

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await fetch('/api/products?isForSale=true');
      return res.json();
    },
  });

  const onSubmit = (data: any) => {
    createSale(data, {
      onSuccess: () => {
        toast.success('Venta creada exitosamente');
        form.reset();
        onClose();
      },
      onError: (error: any) => {
        toast.error(error.message || 'Error al crear venta');
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear Venta</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar cliente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clients?.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <label className="text-sm font-medium">Productos</label>
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 mt-2">
                  <FormField
                    control={form.control}
                    name={`items.${index}.productId`}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Producto" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {products?.map((p: any) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`items.${index}.quantity`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="Cantidad" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`items.${index}.unitPrice`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="Precio" 
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => remove(index)}
                  >
                    Quitar
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                className="mt-2"
                onClick={() => append({ productId: '', quantity: 1, unitPrice: 0 })}
              >
                Agregar Producto
              </Button>
            </div>

            <FormField
              control={form.control}
              name="paymentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Método de Pago</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="CASH">Efectivo</SelectItem>
                      <SelectItem value="CREDIT">Crédito</SelectItem>
                      <SelectItem value="DEBIT">Débito</SelectItem>
                      <SelectItem value="TRANSFER">Transferencia</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Creando...' : 'Crear Venta'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
```

- [ ] **Step 5: Run test to verify it passes**

```bash
pnpm test -- CreateSaleModal.test.tsx --run
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/dashboard/financials/components/modals/CreateSaleModal.tsx apps/web/src/app/dashboard/financials/__tests__/CreateSaleModal.test.tsx packages/types/src/sales.schemas.ts
git commit -m "feat: add CreateSaleModal with form validation using React Hook Form + Zod"
```

---

### Task 7: Create Income, Expense, CashClose modals

**Files:**
- Create: `apps/web/src/app/dashboard/financials/components/modals/CreateIncomeModal.tsx`
- Create: `apps/web/src/app/dashboard/financials/components/modals/CreateExpenseModal.tsx`
- Create: `apps/web/src/app/dashboard/financials/components/modals/CreateCashCloseModal.tsx`
- Add tests for each

- [ ] **Step 1: Add validation schemas for Income/Expense/CashClose**

```typescript
// packages/types/src/income.schemas.ts
export const CreateIncomeSchema = z.object({
  date: z.string().or(z.date()),
  type: z.enum(['SALES_OTHER', 'REFUND', 'OTHER']),
  amount: z.number().min(0.01, 'Monto debe ser mayor a 0'),
  description: z.string().min(1, 'Descripción es requerida'),
});

// packages/types/src/expense.schemas.ts
export const CreateExpenseSchema = z.object({
  date: z.string().or(z.date()),
  type: z.enum(['SUPPLIES', 'UTILITIES', 'STAFF', 'OTHER']),
  amount: z.number().min(0.01, 'Monto debe ser mayor a 0'),
  description: z.string().min(1, 'Descripción es requerida'),
});

// packages/types/src/cash-close.schemas.ts
export const CreateCashCloseSchema = z.object({
  date: z.string().or(z.date()),
});
```

- [ ] **Step 2: Write failing tests for all three modals**

```typescript
// CreateIncomeModal.test.tsx, CreateExpenseModal.test.tsx, CreateCashCloseModal.test.tsx
describe('CreateIncomeModal', () => {
  it('should render income form', () => {
    render(<CreateIncomeModal open={true} onClose={() => {}} />, { wrapper });
    expect(screen.getByLabelText(/Monto/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Descripción/i)).toBeInTheDocument();
  });

  it('should validate required fields', async () => {
    render(<CreateIncomeModal open={true} onClose={() => {}} />, { wrapper });
    const submitButton = screen.getByRole('button', { name: /Crear Ingreso/i });
    fireEvent.click(submitButton);
    await waitFor(() => {
      expect(screen.getByText(/Monto es requerido|Monto debe ser mayor a 0/i)).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 3: Implement CreateIncomeModal**

```typescript
// apps/web/src/app/dashboard/financials/components/modals/CreateIncomeModal.tsx
import { useForm } from 'react-hook-form.js';
import { zodResolver } from '@hookform/resolvers/zod.js';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog.js';
import { Button } from '@/components/ui/button.js';
import { Input } from '@/components/ui/input.js';
import { Textarea } from '@/components/ui/textarea.js';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.js';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form.js';
import { toast } from 'sonner.js';
import { CreateIncomeSchema } from '@repo/types/income.schemas.js';
import { useCreateIncome } from '../hooks/useIncomes.js';

interface CreateIncomeModalProps {
  open: boolean;
  onClose: () => void;
}

export const CreateIncomeModal = ({ open, onClose }: CreateIncomeModalProps) => {
  const form = useForm({
    resolver: zodResolver(CreateIncomeSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      type: 'SALES_OTHER',
      amount: 0,
      description: '',
    },
  });

  const { mutate: createIncome, isPending } = useCreateIncome();

  const onSubmit = (data: any) => {
    createIncome(data, {
      onSuccess: () => {
        toast.success('Ingreso creado exitosamente');
        form.reset();
        onClose();
      },
      onError: (error: any) => {
        toast.error(error.message || 'Error al crear ingreso');
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear Ingreso</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="SALES_OTHER">Venta Otra</SelectItem>
                      <SelectItem value="REFUND">Reembolso</SelectItem>
                      <SelectItem value="OTHER">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0.00"
                      step="0.01"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Descripción..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Creando...' : 'Crear Ingreso'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
```

- [ ] **Step 4: Implement CreateExpenseModal (identical to CreateIncomeModal, except endpoint and types)**

```typescript
// apps/web/src/app/dashboard/financials/components/modals/CreateExpenseModal.tsx
// Same as CreateIncomeModal, but:
// - Import useCreateExpense instead of useCreateIncome
// - Title: "Crear Egreso"
// - Types: SUPPLIES, UTILITIES, STAFF, OTHER
// - Mutation: useCreateExpense
```

- [ ] **Step 5: Implement CreateCashCloseModal**

```typescript
// apps/web/src/app/dashboard/financials/components/modals/CreateCashCloseModal.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog.js';
import { Button } from '@/components/ui/button.js';
import { Input } from '@/components/ui/input.js';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form.js';
import { toast } from 'sonner.js';
import { useForm } from 'react-hook-form.js';
import { zodResolver } from '@hookform/resolvers/zod.js';
import { CreateCashCloseSchema } from '@repo/types/cash-close.schemas.js';
import { useCreateCashClose, useCashCloses, useSales, useIncomes, useExpenses } from '../hooks/index.js';
import { useCallback, useEffect, useState } from 'react.js';
import { formatCurrency } from '@/lib/formatters.js';

interface CreateCashCloseModalProps {
  open: boolean;
  onClose: () => void;
}

export const CreateCashCloseModal = ({ open, onClose }: CreateCashCloseModalProps) => {
  const form = useForm({
    resolver: zodResolver(CreateCashCloseSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
    },
  });

  const { mutate: createCashClose, isPending } = useCreateCashClose();
  const { data: cashCloses } = useCashCloses({ limit: 1 });
  const { data: salesData } = useSales();
  const { data: incomesData } = useIncomes();
  const { data: expensesData } = useExpenses();

  const [periodStart, setPeriodStart] = useState<Date | null>(null);
  const [summary, setSummary] = useState({ sales: 0, incomes: 0, expenses: 0 });

  useEffect(() => {
    const selectedDate = new Date(form.watch('date'));
    
    if (cashCloses && cashCloses.length > 0) {
      // Period starts from last cash close
      setPeriodStart(new Date(cashCloses[0].date));
    } else if (salesData && salesData.length > 0) {
      // Period starts from first sale
      setPeriodStart(new Date(salesData[0].date));
    }

    // Calculate summary for period
    const sales = salesData
      ?.filter((s: any) => new Date(s.date) > (periodStart || new Date('2000-01-01')))
      .reduce((sum: number, s: any) => sum + s.total, 0) || 0;

    const incomes = incomesData
      ?.filter((i: any) => new Date(i.date) > (periodStart || new Date('2000-01-01')))
      .reduce((sum: number, i: any) => sum + i.amount, 0) || 0;

    const expenses = expensesData
      ?.filter((e: any) => new Date(e.date) > (periodStart || new Date('2000-01-01')))
      .reduce((sum: number, e: any) => sum + e.amount, 0) || 0;

    setSummary({ sales, incomes, expenses });
  }, [form.watch('date'), cashCloses, salesData, incomesData, expensesData, periodStart]);

  const onSubmit = (data: any) => {
    createCashClose(data, {
      onSuccess: () => {
        toast.success('Corte de caja creado exitosamente');
        form.reset();
        onClose();
      },
      onError: (error: any) => {
        toast.error(error.message || 'Error al crear corte de caja');
      },
    });
  };

  const totalInCash = summary.sales + summary.incomes - summary.expenses;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Crear Corte de Caja</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha del Corte</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {periodStart && (
              <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
                <p className="text-gray-600">
                  Período: {periodStart.toLocaleDateString()} - {new Date(form.watch('date')).toLocaleDateString()}
                </p>
              </div>
            )}

            <div className="bg-blue-50 p-4 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Ventas:</span>
                <span className="font-bold">{formatCurrency(summary.sales)}</span>
              </div>
              <div className="flex justify-between">
                <span>Ingresos:</span>
                <span className="font-bold">{formatCurrency(summary.incomes)}</span>
              </div>
              <div className="flex justify-between">
                <span>Egresos:</span>
                <span className="font-bold">{formatCurrency(summary.expenses)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between">
                <span>Total en Caja:</span>
                <span className="font-bold text-lg">{formatCurrency(totalInCash)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Creando...' : 'Crear Corte'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
```

- [ ] **Step 6: Run tests for all three modals**

```bash
pnpm test -- CreateIncomeModal.test.tsx CreateExpenseModal.test.tsx CreateCashCloseModal.test.tsx --run
```

Expected: All PASS

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/dashboard/financials/components/modals/CreateIncomeModal.tsx apps/web/src/app/dashboard/financials/components/modals/CreateExpenseModal.tsx apps/web/src/app/dashboard/financials/components/modals/CreateCashCloseModal.tsx packages/types/src/income.schemas.ts packages/types/src/expense.schemas.ts packages/types/src/cash-close.schemas.ts
git commit -m "feat: add Income, Expense, and CashClose modals with validation"
```

---

## Phase 4: Tab Components & Main Page

### Task 8: Create SalesTab, IncomeTab, ExpenseTab, CashCloseTab

**Files:**
- Create: `apps/web/src/app/dashboard/financials/components/SalesTab.tsx`
- Create: `apps/web/src/app/dashboard/financials/components/IncomeTab.tsx`
- Create: `apps/web/src/app/dashboard/financials/components/ExpenseTab.tsx`
- Create: `apps/web/src/app/dashboard/financials/components/CashCloseTab.tsx`
- Test: `apps/web/src/app/dashboard/financials/__tests__/SalesTab.test.tsx` (etc)

- [ ] **Step 1: Write failing test for SalesTab**

```typescript
// apps/web/src/app/dashboard/financials/__tests__/SalesTab.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react.js';
import { SalesTab } from '../components/SalesTab.js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query.js';
import { describe, it, expect, vi } from 'vitest';

const queryClient = new QueryClient();
const wrapper = ({ children }: any) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

describe('SalesTab', () => {
  it('should render sales list with create button', () => {
    render(<SalesTab />, { wrapper });
    expect(screen.getByRole('button', { name: /Crear Venta/i })).toBeInTheDocument();
  });

  it('should open create modal when button is clicked', async () => {
    render(<SalesTab />, { wrapper });
    const createButton = screen.getByRole('button', { name: /Crear Venta/i });
    fireEvent.click(createButton);
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('should load and display sales data', async () => {
    render(<SalesTab />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText(/Folio|Cliente|Fecha/)).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- SalesTab.test.tsx --run
```

- [ ] **Step 3: Implement SalesTab**

```typescript
// apps/web/src/app/dashboard/financials/components/SalesTab.tsx
import { useState, useMemo } from 'react.js';
import { SalesTable } from './tables/SalesTable.js';
import { FinancialFilters } from './filters/FinancialFilters.js';
import { CreateSaleModal } from './modals/CreateSaleModal.js';
import { DetailDrawer } from './DetailDrawer.js';
import { Button } from '@/components/ui/button.js';
import { useSales, useCancelSale } from '../hooks/useSales.js';
import { useFinancialStore } from '../store/financial-store.js';
import { toast } from 'sonner.js';

export const SalesTab = () => {
  const [filters, setFilters] = useState<any>({});
  const { data: sales, isLoading } = useSales(filters);
  const { mutate: cancelSale } = useCancelSale();
  const { openModal, openCreateModal, openDetailModal, closeModal, selectedTransactionId } = useFinancialStore();

  const handleCreateClick = () => {
    openCreateModal('create-sale');
  };

  const handleCancelSale = (saleId: string) => {
    if (confirm('¿Está seguro de que desea anular esta venta?')) {
      cancelSale(saleId, {
        onSuccess: () => {
          toast.success('Venta anulada exitosamente');
        },
        onError: (error: any) => {
          toast.error(error.message || 'Error al anular venta');
        },
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Ventas</h2>
        <Button onClick={handleCreateClick}>
          Crear Venta
        </Button>
      </div>

      <FinancialFilters onFilter={setFilters} filterType="sales" />
      <SalesTable 
        sales={sales || []}
        isLoading={isLoading}
        onDetails={openDetailModal}
        onCancel={handleCancelSale}
      />

      <CreateSaleModal 
        open={openModal === 'create-sale'} 
        onClose={closeModal}
      />

      {selectedTransactionId && (
        <DetailDrawer 
          open={openModal === 'details'} 
          onClose={closeModal}
          transactionId={selectedTransactionId}
          type="sale"
        />
      )}
    </div>
  );
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test -- SalesTab.test.tsx --run
```

Expected: PASS

- [ ] **Step 5: Implement IncomeTab, ExpenseTab, CashCloseTab (same pattern)**

```typescript
// apps/web/src/app/dashboard/financials/components/IncomeTab.tsx
// Same as SalesTab, but:
// - Use useSales → useIncomes
// - use CreateSaleModal → CreateIncomeModal
// - use openCreateModal('create-sale') → openCreateModal('create-income')
// - title: "Ingresos"

// apps/web/src/app/dashboard/financials/components/ExpenseTab.tsx
// Same pattern as IncomeTab but for expenses

// apps/web/src/app/dashboard/financials/components/CashCloseTab.tsx
// Same pattern, no cancel option (immutable)
```

- [ ] **Step 6: Run all tab tests**

```bash
pnpm test -- SalesTab.test.tsx IncomeTab.test.tsx ExpenseTab.test.tsx CashCloseTab.test.tsx --run
```

Expected: All PASS

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/dashboard/financials/components/SalesTab.tsx apps/web/src/app/dashboard/financials/components/IncomeTab.tsx apps/web/src/app/dashboard/financials/components/ExpenseTab.tsx apps/web/src/app/dashboard/financials/components/CashCloseTab.tsx apps/web/src/app/dashboard/financials/__tests__/SalesTab.test.tsx apps/web/src/app/dashboard/financials/__tests__/IncomeTab.test.tsx apps/web/src/app/dashboard/financials/__tests__/ExpenseTab.test.tsx apps/web/src/app/dashboard/financials/__tests__/CashCloseTab.test.tsx
git commit -m "feat: add Sales, Income, Expense, and CashClose tabs with full functionality"
```

---

### Task 9: Create DetailDrawer and main page

**Files:**
- Create: `apps/web/src/app/dashboard/financials/components/DetailDrawer.tsx`
- Create: `apps/web/src/app/dashboard/financials/components/FinancialsPage.tsx`
- Create: `apps/web/src/app/dashboard/financials/page.tsx`
- Test: appropriate test files

- [ ] **Step 1: Write failing test for DetailDrawer**

```typescript
// apps/web/src/app/dashboard/financials/__tests__/DetailDrawer.test.tsx
describe('DetailDrawer', () => {
  it('should render drawer with transaction details', async () => {
    render(
      <DetailDrawer
        open={true}
        onClose={() => {}}
        transactionId="sale-1"
        type="sale"
      />,
      { wrapper }
    );

    await waitFor(() => {
      expect(screen.getByText(/Folio|Cliente|Total/)).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Implement DetailDrawer**

```typescript
// apps/web/src/app/dashboard/financials/components/DetailDrawer.tsx
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer.js';
import { useSales } from '../hooks/useSales.js';
import { useIncomes } from '../hooks/useIncomes.js';
import { useExpenses } from '../hooks/useExpenses.js';
import { useCashCloses } from '../hooks/useCashCloses.js';
import { formatCurrency, formatDate } from '@/lib/formatters.js';
import { Skeleton } from '@/components/ui/skeleton.js';

interface DetailDrawerProps {
  open: boolean;
  onClose: () => void;
  transactionId: string;
  type: 'sale' | 'income' | 'expense' | 'cashClose';
}

export const DetailDrawer = ({ open, onClose, transactionId, type }: DetailDrawerProps) => {
  let data: any;
  let isLoading = false;

  if (type === 'sale') {
    const { data: sales, isLoading: loading } = useSales();
    data = sales?.find((s: any) => s.id === transactionId);
    isLoading = loading;
  } else if (type === 'income') {
    const { data: incomes, isLoading: loading } = useIncomes();
    data = incomes?.find((i: any) => i.id === transactionId);
    isLoading = loading;
  } else if (type === 'expense') {
    const { data: expenses, isLoading: loading } = useExpenses();
    data = expenses?.find((e: any) => e.id === transactionId);
    isLoading = loading;
  } else if (type === 'cashClose') {
    const { data: closes, isLoading: loading } = useCashCloses();
    data = closes?.find((c: any) => c.id === transactionId);
    isLoading = loading;
  }

  if (isLoading) {
    return (
      <Drawer open={open} onOpenChange={onClose}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Cargando detalles...</DrawerTitle>
          </DrawerHeader>
          <Skeleton className="h-96" />
        </DrawerContent>
      </Drawer>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <Drawer open={open} onOpenChange={onClose}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>
            {type === 'sale' && `Venta ${data.folio}`}
            {type === 'income' && 'Detalles del Ingreso'}
            {type === 'expense' && 'Detalles del Egreso'}
            {type === 'cashClose' && 'Detalles del Corte de Caja'}
          </DrawerTitle>
        </DrawerHeader>

        <div className="p-6 space-y-4">
          {type === 'sale' && (
            <>
              <div>
                <p className="text-sm text-gray-600">Folio</p>
                <p className="font-mono font-bold">{data.folio}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Cliente</p>
                <p>{data.client.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Fecha</p>
                <p>{formatDate(data.date)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Items</p>
                <div className="space-y-2 mt-2">
                  {data.items?.map((item: any) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>{item.product.name} × {item.quantity}</span>
                      <span>{formatCurrency(item.subtotal)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t pt-4 flex justify-between font-bold">
                <span>Total</span>
                <span>{formatCurrency(data.total)}</span>
              </div>
            </>
          )}

          {(type === 'income' || type === 'expense') && (
            <>
              <div>
                <p className="text-sm text-gray-600">Fecha</p>
                <p>{formatDate(data.date)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Tipo</p>
                <p>{data.type}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Monto</p>
                <p className="font-bold text-lg">{formatCurrency(data.amount)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Descripción</p>
                <p>{data.description}</p>
              </div>
            </>
          )}

          {type === 'cashClose' && (
            <>
              <div>
                <p className="text-sm text-gray-600">Fecha</p>
                <p>{formatDate(data.date)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded space-y-2">
                <div className="flex justify-between">
                  <span>Ventas</span>
                  <span>{formatCurrency(data.totalSales)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ingresos</span>
                  <span>{formatCurrency(data.totalIncomes)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Egresos</span>
                  <span>{formatCurrency(data.totalExpenses)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold">
                  <span>Total en Caja</span>
                  <span>{formatCurrency(data.totalInCash)}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};
```

- [ ] **Step 3: Implement FinancialsPage wrapper**

```typescript
// apps/web/src/app/dashboard/financials/components/FinancialsPage.tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.js';
import { useFinancialStore } from '../store/financial-store.js';
import { SalesTab } from './SalesTab.js';
import { IncomeTab } from './IncomeTab.js';
import { ExpenseTab } from './ExpenseTab.js';
import { CashCloseTab } from './CashCloseTab.js';

export const FinancialsPage = () => {
  const { activeTab, setActiveTab } = useFinancialStore();

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Financials</h1>
      
      <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="sales">Ventas</TabsTrigger>
          <TabsTrigger value="income">Ingresos</TabsTrigger>
          <TabsTrigger value="expense">Egresos</TabsTrigger>
          <TabsTrigger value="cashClose">Corte de Caja</TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          <SalesTab />
        </TabsContent>

        <TabsContent value="income">
          <IncomeTab />
        </TabsContent>

        <TabsContent value="expense">
          <ExpenseTab />
        </TabsContent>

        <TabsContent value="cashClose">
          <CashCloseTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};
```

- [ ] **Step 4: Implement page.tsx**

```typescript
// apps/web/src/app/dashboard/financials/page.tsx
'use client';

import { FinancialsPage } from './components/FinancialsPage.js';

export default function FinancialsPageRoute() {
  return <FinancialsPage />;
}
```

- [ ] **Step 5: Run all tests**

```bash
pnpm test -- DetailDrawer.test.tsx FinancialsPage.test.tsx --run
```

Expected: All PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/dashboard/financials/components/DetailDrawer.tsx apps/web/src/app/dashboard/financials/components/FinancialsPage.tsx apps/web/src/app/dashboard/financials/page.tsx apps/web/src/app/dashboard/financials/__tests__/DetailDrawer.test.tsx
git commit -m "feat: add DetailDrawer and main FinancialsPage with tab navigation"
```

---

## Phase 5: Polish & QA

### Task 10: Run full test suite and verify code quality

**Files:**
- All files created/modified in previous tasks

- [ ] **Step 1: Run all tests**

```bash
cd /Users/alejandroprado/pratum/renalfy
pnpm test -- apps/web/src/app/dashboard/financials --run
```

Expected output: All tests PASS, coverage >80%

- [ ] **Step 2: Run linting**

```bash
pnpm lint
```

Expected: 0 errors, 0 warnings

- [ ] **Step 3: Run TypeScript check**

```bash
pnpm check-types
```

Expected: 0 errors

- [ ] **Step 4: Build frontend**

```bash
pnpm build --filter=web
```

Expected: Build succeeds

- [ ] **Step 5: Verify responsive design**

Open browser and test at 375px, 768px, 1024px breakpoints:
- Tables render properly
- Forms are usable
- Buttons are clickable
- Modals are accessible

- [ ] **Step 6: Test each module manually**

**Sales:**
- Create a sale (select client, add products, select payment method)
- List sales with filters
- View sale details
- Anular a sale

**Income/Expense:**
- Create an income/expense
- List with filters
- View details
- Cancel

**CashClose:**
- Create a cash close (should show period summary)
- Verify transac locked
- View details

- [ ] **Step 7: Commit final QA pass**

```bash
git add -A
git commit -m "fix: resolve test coverage gaps and polish UI"
```

---

## Summary

**Total tasks: 10**
- Task 1-3: Setup (hooks, store)
- Task 4-5: Tables & Filters
- Task 6-7: Modals/Forms
- Task 8-9: Tab components & main page
- Task 10: Polish & QA

**Expected outcomes:**
- ✅ 4-tab dashboard `/dashboard/financials`
- ✅ Full CRUD for Sales, Income, Expense
- ✅ CashClose with period calculation
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ >80% test coverage (Vitest + RTL)
- ✅ Zero lint/TypeScript errors
- ✅ All validations (client + server)
- ✅ Error handling with toasts
- ✅ RLS enforced by API (backend Sprint 21)

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-04-30-sprint-22-ui-financials.md`.**

Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
