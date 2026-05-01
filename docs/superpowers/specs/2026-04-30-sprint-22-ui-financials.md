# Sprint 22 — UI Financials Completa (Sales + Income + Expense + CashClose)

**Date:** 2026-04-30  
**Status:** Design Approved  
**Scope:** Frontend UI for complete financial module (4 sub-modules)  
**Dependencies:** Sprint 21 backend API (Sales, Income, Expense, CashClose) ✅

---

## Overview

Construir la interfaz de usuario completa para el módulo de Finanzas (Ventas, Ingresos, Egresos, Corte de Caja). El backend está 100% completo en Sprint 21 con transacciones atómicas, RLS, y validaciones críticas.

**Success Criteria:**
1. Dashboard unificado `/dashboard/financials` con 4 tabs funcionales
2. CRUD completo para cada módulo (crear, listar, detalles, cancelar/anular donde aplique)
3. Validación client-side + manejo de errores server-side
4. >80% test coverage (Vitest + React Testing Library)
5. Cumplir `pnpm lint`, `pnpm check-types`, `pnpm test` sin errores
6. Responsive design (desktop + mobile)

---

## Product Requirements

### Sales (Ventas)

**Crear venta:**
- Seleccionar cliente (dropdown de clientes activos)
- Agregar productos (solo `isForSale = true`)
  - Seleccionar producto → cantidad → precio unitario
  - Validar stock en tiempo real
  - Mostrar subtotal por producto + total
- Método de pago: **CASH, CREDIT, DEBIT, TRANSFER** (4 opciones)
  - ⚠️ BENEFIT **no aplica** para venta de productos
- Preview antes de guardar
- ✅ Folio generado automáticamente por backend

**Listar ventas:**
- Tabla: folio | cliente | fecha | total | status (ACTIVE/FINISHED/SETTLED/CANCELLED)
- Filtros: fecha range, cliente, status
- Paginación
- Botón "Ver detalles"

**Detalles de venta:**
- Todos los items: producto | cantidad | precio unitario | subtotal
- Total, descuentos si aplican
- Método de pago
- Status
- Botón "Anular venta" (solo si status = ACTIVE) → modal de confirmación

---

### Income (Ingresos)

**Crear ingreso:**
- Fecha (date picker)
- Tipo (dropdown enum: SALES_OTHER, REFUND, OTHER)
- Monto (número positivo)
- Descripción (textarea)
- ✅ Status automático = ACTIVE

**Listar ingresos:**
- Tabla: fecha | tipo | monto | descripción | status
- Filtros: fecha range, tipo
- Paginación

**Detalles:**
- Ver todo
- Botón "Cancelar ingreso" (soft delete, solo si status = ACTIVE)

---

### Expense (Egresos)

**Exacto patrón que Income**
- Tipos: SUPPLIES, UTILITIES, STAFF, OTHER
- Crear, listar, detalles, cancelar

---

### CashClose (Corte de Caja)

**Crear corte:**
- Selector de período:
  - Si es el **primer corte**: desde la fecha de la **primera venta** realizada
  - Si no es el primero: desde el **último CashClose creado**
- Mostrar resumen automático:
  - ∑ ventas del período
  - ∑ ingresos del período
  - ∑ egresos del período
  - **Total en caja = ventas + ingresos - egresos**
- Botón "Crear corte" → transacción atómica en backend
  - Después de crear: todas las transacciones del período quedan locked (`isClosed = true`)
  - Nuevas transacciones para ese período → rechazadas con error "Período cerrado"

**Listar cortes:**
- Tabla: fecha | total en caja | status (siempre CLOSED)
- Filtros: fecha range
- Paginación

**Detalles:**
- Resumen de transacciones incluidas (ventas + ingresos + egresos del período)
- Totales por categoría
- ⚠️ Immutable — no hay edición/cancelación

---

## Technical Architecture

### Pages & Routes

```
/dashboard/financials
└── FinancialsPage (client component)
    ├── Tab navigation (Sales | Income | Expense | CashClose)
    ├── SalesTab
    ├── IncomeTab
    ├── ExpenseTab
    └── CashCloseTab
```

### Component Structure

**Page:**
- `apps/web/src/app/dashboard/financials/page.tsx` — tabs + layout

**Tab Components:**
- `SalesTab.tsx` — list + filters + "Crear" button
- `IncomeTab.tsx` — list + filters + "Crear" button
- `ExpenseTab.tsx` — list + filters + "Crear" button
- `CashCloseTab.tsx` — list + filters + "Crear" button

**Modal/Drawer Components:**
- `CreateSaleModal.tsx` — form con cliente, productos, pago
- `CreateIncomeModal.tsx` — form simple
- `CreateExpenseModal.tsx` — form simple
- `CreateCashCloseModal.tsx` — período selector + resumen + confirmación

**Table Components:**
- `SalesTable.tsx`
- `IncomeTable.tsx`
- `ExpenseTable.tsx`
- `CashCloseTable.tsx`

**Shared:**
- `FinancialFilters.tsx` — filtros reutilizables (fecha range, tipo, cliente, status)
- `DetailDrawer.tsx` — modal para ver detalles de transacción

### Data Flow

**Fetching (React Query):**
```typescript
// List hooks
useGetSales(filters)        // GET /api/sales?dateFrom=...&dateTo=...&clientId=...
useGetIncomes(filters)      // GET /api/incomes?...
useGetExpenses(filters)     // GET /api/expenses?...
useGetCashCloses(filters)   // GET /api/cash-closes?...

// Lookups
useGetClients()             // GET /api/clients (para dropdown)
useGetProducts()            // GET /api/products?isForSale=true
```

**Mutations (React Query):**
```typescript
useCreateSale()             // POST /api/sales
useCancelSale(saleId)       // PATCH /api/sales/:id (status update)
useCreateIncome()           // POST /api/incomes
useCancelIncome(incomeId)   // PATCH /api/incomes/:id
useCreateExpense()          // POST /api/expenses
useCancelExpense(expenseId) // PATCH /api/expenses/:id
useCreateCashClose()        // POST /api/cash-closes
```

**Form State:**
- React Hook Form + Zod schemas (from `@repo/types`)
- Validaciones client-side antes de submit
- Error messages en UI

**UI State:**
- Zustand store o Context para: active tab, modal open/close, loading states

---

## Validation & Error Handling

### Client-Side (Vitest + React Testing Library)

**Sales form validation:**
- Cantidad > 0
- Producto seleccionado
- Cliente seleccionado
- Método de pago seleccionado
- Stock disponible (mostrar en tiempo real)

**Income/Expense validation:**
- Monto > 0
- Tipo seleccionado
- Descripción no vacía

**CashClose validation:**
- Período válido
- Verificar que no existe otro corte para ese rango

### Server-Side (Backend handles)

**Stock insuficiente** → 400 BadRequest
- UI muestra toast: "Stock insuficiente para producto X"

**Período cerrado** → 400 BadRequest
- UI muestra: "Período bloqueado — existe corte de caja"

**Datos inválidos** → 400 BadRequest
- Mostrar validation error del backend

### UI Feedback

- Loading states: botones disabled + spinner
- Success toasts: "Venta creada exitosamente"
- Error toasts: mensaje detallado
- Real-time validation en filtros (debounce 300ms)

---

## Data Model & API Contracts

All schemas defined in `@repo/types`:

**Sale:**
```typescript
{
  id: string
  folio: string              // LOC-YYYY-NNNNN (server-generated)
  clientId: string
  items: SaleItem[]          // { productId, quantity, unitPrice, subtotal }
  paymentType: 'CASH' | 'CREDIT' | 'DEBIT' | 'TRANSFER'
  total: number
  status: 'ACTIVE' | 'FINISHED' | 'SETTLED' | 'CANCELLED'
  isClosed: boolean          // locked after CashClose
  createdAt: Date
}
```

**Income / Expense:**
```typescript
{
  id: string
  date: Date
  type: string               // enum
  amount: number
  description: string
  status: 'ACTIVE' | 'CANCELLED'
  isClosed: boolean
  createdAt: Date
}
```

**CashClose:**
```typescript
{
  id: string
  date: Date
  periodStartDate: Date
  periodEndDate: Date
  totalSales: number
  totalIncomes: number
  totalExpenses: number
  totalInCash: number        // totalSales + totalIncomes - totalExpenses
  status: 'CLOSED'           // always CLOSED
  createdAt: Date
}
```

---

## Testing Strategy

**Unit Tests (Vitest):**
- Componentes: renderizar, interactuar, verificar llamadas a mutaciones
- Forms: llenar campos, validar errores, submit
- Filters: cambiar valores, refetch data
- Tables: renderizar datos, paginar, ordenar

**Component Tests (React Testing Library):**
- `SalesTab.test.tsx` — crear venta, listar, anular
- `CreateSaleModal.test.tsx` — validación, submit
- `IncomeTab.test.tsx`, `ExpenseTab.test.tsx`, `CashCloseTab.test.tsx` — equivalentes

**Mock Strategy:**
- Mock React Query con `@testing-library/react-query` o `vi.mock()`
- Mock API calls con Vitest mocks
- No usar MSW (mantener tests rápidos)

**Coverage Target:**
- Line coverage: >80%
- Branch coverage: >80%
- Functions: 100%

**TDD Workflow (Red → Green → Refactor):**
1. Test falla porque componente no existe
2. Implementar componente mínimo para pasar test
3. Refactor: limpiar, extraer subcomponentes, mejorar types

---

## Design & UX

**Responsive:**
- Desktop (1024px+): layout full width con tabla
- Tablet (768px-1023px): tabla scrollable horizontal
- Mobile (< 768px): stack vertical, tabla con scroll

**UI Framework:**
- Shadcn/ui components (Button, Table, Select, Input, Dialog/Drawer, etc.)
- Tailwind CSS v4 para estilos

**Accessibility:**
- ARIA labels en inputs y buttons
- Tab navigation funcional
- Error messages asociados a inputs (aria-describedby)
- Cumplir WCAG 2.2 AA mínimo

---

## File Structure

```
apps/web/src/app/dashboard/financials/
├── page.tsx                                    (main page with tabs)
├── components/
│   ├── SalesTab.tsx
│   ├── IncomeTab.tsx
│   ├── ExpenseTab.tsx
│   ├── CashCloseTab.tsx
│   ├── modals/
│   │   ├── CreateSaleModal.tsx
│   │   ├── CreateIncomeModal.tsx
│   │   ├── CreateExpenseModal.tsx
│   │   └── CreateCashCloseModal.tsx
│   ├── tables/
│   │   ├── SalesTable.tsx
│   │   ├── IncomeTable.tsx
│   │   ├── ExpenseTable.tsx
│   │   └── CashCloseTable.tsx
│   ├── filters/
│   │   └── FinancialFilters.tsx
│   ├── DetailDrawer.tsx
│   └── Totals.tsx                             (summary card)
├── hooks/
│   ├── useSales.ts
│   ├── useIncomes.ts
│   ├── useExpenses.ts
│   ├── useCashCloses.ts
│   └── useFinancialFilters.ts
├── __tests__/
│   ├── SalesTab.test.tsx
│   ├── CreateSaleModal.test.tsx
│   ├── IncomeTab.test.tsx
│   ├── CashCloseTab.test.tsx
│   └── ...
└── types.ts                                    (local types if needed)
```

---

## Dependencies & Stack

**Frontend:**
- Next.js 16 (App Router)
- React 19
- TanStack React Query (data fetching)
- React Hook Form + Zod (forms)
- Shadcn/ui (components)
- Tailwind CSS v4
- Zustand (UI state) or Context API
- Vitest + React Testing Library (tests)

**Backend (Sprint 21):**
- NestJS endpoints: `/api/sales`, `/api/incomes`, `/api/expenses`, `/api/cash-closes`
- All CRUD operations
- RLS + Atomic transactions ✅

---

## Out of Scope

- Reports/analytics (Sprint 24)
- PDF export (future)
- Batch operations (bulk edit/delete)
- Workflow automations (future)
- Mobile-native app (future)

---

## Success Metrics

- All tests passing (`pnpm test`)
- No linting errors (`pnpm lint`)
- No TypeScript errors (`pnpm check-types`)
- >80% test coverage
- Responsive on mobile/tablet/desktop
- Performance: page load < 2s, interactions < 100ms
- All user stories completable in UI

---

## Next Steps (After Approval)

1. ✅ Design approved
2. → Invoke `superpowers:writing-plans` to create detailed implementation plan
3. → Execute plan with TDD (Red → Green → Refactor)
4. → QA validation
5. → Merge to main
