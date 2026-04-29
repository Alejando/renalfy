# Tasks: Sprint 20 — Frontend UI for Purchases & Inventory Movements

**Input**: Design documents from `/specs/016-sprint-frontend-purchases/`  
**Prerequisites**: plan.md ✅, spec.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**TDD**: Tests written FIRST (Red), then implementation (Green), then refactor. Per CLAUDE.md mandate.

**Patterns** (inferred from existing codebase):
- Server actions: `apps/web/app/actions/{feature}.ts` with `'use server'` and `apiFetch` from `../../lib/api`
- Pages: `page.tsx` (Server Component, async, fetches data) → `{feature}-page-client.tsx` (`'use client'`, receives data as props)
- Tests: `{feature}.test.tsx` co-located with component, using Vitest + React Testing Library
- Spanish labels, `es-MX` locale for dates and currency
- shadcn/ui components (Table, Button, Sheet, AlertDialog, Badge, Dialog)
- All paths below are relative to `apps/web/` unless stated otherwise

---

## Phase 1: Setup (Infrastructure Prerequisites)

**Purpose**: Add missing navigation tabs and create the two new server action files that all user stories depend on.

- [ ] T001 Update `apps/web/app/tenants/[slug]/(dashboard)/inventory/layout.tsx` to add a "Compras" tab with href `/inventory/purchases` after the existing "Órdenes" tab — visible to all authenticated roles — and a "Movimientos" tab with href `/inventory/movements` after "Compras", also visible to all roles

- [ ] T002 Create `apps/web/app/actions/purchases.ts` with `'use server'` directive; export `receivePurchaseAction(prevState, formData: FormData)` that calls `apiFetch('/purchases', { method: 'POST', body: ... })` using `ReceivePurchaseOrderSchema` from `@repo/types` for validation, calls `revalidatePath('/inventory/purchase-orders')` and `revalidatePath('/inventory/purchases')` on success, returns `{ error: string } | null`; and export `closePurchaseOrderAction(id: string)` that calls `apiFetch('/purchase-orders/{id}/close', { method: 'POST' })` with `revalidatePath`, returns `{ error: string } | null`

- [ ] T003 Create `apps/web/app/actions/inventory-movements.ts` with `'use server'` directive; export `fetchInventoryMovementsAction(query: { page?: number; limit?: number; type?: string; productId?: string; dateFrom?: string; dateTo?: string; reference?: string })` that builds URLSearchParams and calls `apiFetch<PaginatedInventoryMovementsResponse>('/inventory-movements?...')` importing the type from `@repo/types`; and export `fetchInventoryMovementAction(id: string)` that calls `apiFetch<InventoryMovementDetailResponse>('/inventory-movements/{id}')` importing the type from `@repo/types`

---

## Phase 2: Foundational (Type Schema Fix — Blocks US2)

**Purpose**: The existing `PurchaseOrderItemResponseSchema` in `packages/types/src/suppliers.schemas.ts` is missing `unitsPerPackage` (number) and `tax` (string) fields that the receive-items form needs. These must be added before implementing the receive flow.

**⚠️ CRITICAL**: Tasks T004–T005 must complete before any US2 tasks begin.

- [ ] T004 Update `packages/types/src/suppliers.schemas.ts`: in `PurchaseOrderItemResponseSchema`, add field `unitsPerPackage: z.number().int()` after `quantity`, and add field `tax: z.string()` after `unitPrice`; then add `unitsPerPackage: number` and `tax: string` to the inferred `PurchaseOrderItemResponse` type (already auto-inferred from schema — just verify the type reflects the change)

- [ ] T005 Verify that the existing `purchase-order-detail-client.tsx` at `apps/web/app/tenants/[slug]/(dashboard)/inventory/purchase-orders/[id]/purchase-order-detail-client.tsx` still compiles cleanly after the schema change by running `pnpm check-types` from the repository root; fix any resulting TypeScript errors in that file before continuing

**Checkpoint**: Types are updated and `pnpm check-types` passes — US2 implementation can now begin.

---

## Phase 3: User Story 1 — Purchase Order Listing with Date Range Filtering (Priority: P1) 🎯 MVP

**Goal**: Add date range filter inputs and "Limpiar Filtros" button to the existing purchase-orders list page, so managers can filter orders by dateFrom/dateTo in addition to the existing supplier and status filters.

**Independent Test**: Navigate to `/inventory/purchase-orders`, apply dateFrom=2026-04-01 and dateTo=2026-04-30, verify only orders in that range appear; click "Limpiar Filtros", verify all orders reappear.

### Tests for User Story 1 (TDD — write first, make them FAIL)

- [ ] T006 [P] [US1] Add failing test to `apps/web/app/tenants/[slug]/(dashboard)/inventory/purchase-orders/purchase-orders-page-client.test.tsx`: `it('renders dateFrom and dateTo date inputs')` that renders `<PurchaseOrdersPageClient>` with OWNER role and checks `screen.getByLabelText(/fecha desde/i)` and `screen.getByLabelText(/fecha hasta/i)` are in the document — this test must FAIL before T007

- [ ] T007 [P] [US1] Add failing test to `purchase-orders-page-client.test.tsx`: `it('shows "Limpiar Filtros" button')` that renders with any active filter (pass `?status=CONFIRMED` via mocked useSearchParams) and checks `screen.getByRole('button', { name: /limpiar filtros/i })` is in the document — this test must FAIL before T008

- [ ] T008 [P] [US1] Add failing test to `purchase-orders-page-client.test.tsx`: `it('clears all filters when "Limpiar Filtros" is clicked')` that mocks `useRouter`, renders with mock `useSearchParams` returning `status=CONFIRMED&supplierId=supplier-1`, fires `userEvent.click` on "Limpiar Filtros", and asserts `mockRouterPush` was called with `?page=1` (no status or supplierId params) — this test must FAIL before T009

- [ ] T009 [P] [US1] Add failing test to `purchase-orders-page-client.test.tsx`: `it('updates URL with dateFrom when date input changes')` that mocks `useRouter`, renders with OWNER role, finds the dateFrom input by `getByLabelText(/fecha desde/i)`, fires `userEvent.type(input, '2026-04-01')`, and asserts `mockRouterPush` was called with a URL containing `dateFrom=2026-04-01` — this test must FAIL before T010

### Implementation for User Story 1

- [ ] T010 [US1] Add `dateFrom` and `dateTo` state variables to `purchase-orders-page-client.tsx` (initialize from `searchParams.get('dateFrom') ?? ''` and `searchParams.get('dateTo') ?? ''`); add two `<input type="date" />` elements with `id="dateFrom"`, `<label htmlFor="dateFrom">Fecha desde</label>`, `id="dateTo"`, `<label htmlFor="dateTo">Fecha hasta</label>` in the filter controls section below the existing status select; on change, debounce by 300ms and push to URL via `router.push` with params updated; validate client-side that when both values are set, `dateFrom <= dateTo` — if not, show inline text "La fecha de inicio debe ser anterior a la fecha de fin" below the dateTo input and do NOT push to URL

- [ ] T011 [US1] Add "Limpiar Filtros" button to `purchase-orders-page-client.tsx` in the filter controls row — use `<Button variant="ghost" size="sm">Limpiar Filtros</Button>`; the button's `onClick` calls `router.push('?page=1')` (no other params), and resets all local state: `setSearchValue('')`, `setSupplierFilter('all')`, `setStatusFilter('all')`, `setDateFrom('')`, `setDateTo('')`; the button is always visible when any filter is active (non-empty searchValue or supplierFilter !== 'all' or statusFilter !== 'all' or dateFrom !== '' or dateTo !== '')

- [ ] T012 [US1] Update `apps/web/app/tenants/[slug]/(dashboard)/inventory/purchase-orders/page.tsx` to extract `searchParams.dateFrom` and `searchParams.dateTo` from the Next.js `searchParams` prop (these are available as `Promise<{ dateFrom?: string; dateTo?: string; ... }>`) and pass them to `fetchPurchaseOrdersAction` — add `dateFrom` and `dateTo` to the existing query object passed to the action

- [ ] T013 [US1] Update `fetchPurchaseOrdersAction` in `apps/web/app/actions/purchase-orders.ts` to accept `dateFrom?: string` and `dateTo?: string` in its query parameter object; add `if (query.dateFrom) params.set('dateFrom', query.dateFrom)` and `if (query.dateTo) params.set('dateTo', query.dateTo)` to the URLSearchParams construction

- [ ] T014 [US1] Run `pnpm check-types` and `pnpm --filter web test -- purchase-orders-page-client.test.tsx` from repository root; fix all failing tests (T006–T009 should now pass) and all TypeScript errors before marking US1 complete

**Checkpoint**: All 6 new US1 tests pass. dateFrom, dateTo, and "Limpiar Filtros" work end-to-end.

---

## Phase 4: User Story 2 — Purchase Order Details & Receive Purchase (Priority: P1)

**Goal**: Add "Recibir Artículos" button to CONFIRMED orders in the detail view, open a dialog/sheet where the manager enters quantityReceived and unitsPerPackage per item with live stockDelta preview, submits, and sees the order status update to RECEIVED. Remove the Sprint 18 placeholder note.

**Independent Test**: Open a CONFIRMED order at `/inventory/purchase-orders/{id}`, click "Recibir Artículos", fill in quantityReceived=10 and unitsPerPackage=12, verify stockDelta shows 120, submit, verify order shows status RECEIVED and the form was submitted via `receivePurchaseAction`.

### Tests for User Story 2 (TDD — write first, make them FAIL)

- [ ] T015 [P] [US2] Create test file `apps/web/app/tenants/[slug]/(dashboard)/inventory/purchase-orders/[id]/receive-items-dialog.test.tsx`; add mock for `next/navigation` returning `{ useRouter: () => ({ refresh: vi.fn(), back: vi.fn() }) }`; add mock for `@/app/actions/purchases` returning `{ receivePurchaseAction: vi.fn().mockResolvedValue(null) }`; write `it('renders dialog with product name and inputs for each item')` that renders `<ReceiveItemsDialog>` with a mock `order` containing one item (productId, productName, quantity: 100, unitsPerPackage: 12, unitPrice: '100.00', tax: '0.00') and an `open=true` prop, and checks `screen.getByText('Dialysis Solution 2L')`, `getByLabelText(/cantidad recibida/i)`, and `getByLabelText(/unidades por empaque/i)` are in the document — this test must FAIL before T018

- [ ] T016 [P] [US2] Add test to `receive-items-dialog.test.tsx`: `it('calculates and displays stockDelta when quantityReceived and unitsPerPackage change')` — renders dialog, types `5` into the quantityReceived input and `12` into unitsPerPackage, checks that the text `60` appears somewhere (representing 5 × 12) — this test must FAIL before T020

- [ ] T017 [P] [US2] Add test to `receive-items-dialog.test.tsx`: `it('calls receivePurchaseAction and refreshes router on successful submit')` — renders dialog, fills in quantityReceived and unitsPerPackage, fires `userEvent.click` on the submit button (label: `/recibir artículos/i`), awaits the mock action, asserts `receivePurchaseAction` was called once with the correct payload and `mockRouter.refresh` was called — this test must FAIL before T022

- [ ] T018 [P] [US2] Add failing test to `purchase-order-detail-client.test.tsx` (existing file at `apps/web/app/tenants/[slug]/(dashboard)/inventory/purchase-orders/[id]/purchase-order-detail-client.test.tsx`): `it('shows "Recibir Artículos" button for MANAGER on CONFIRMED order')` — renders `<PurchaseOrderDetailClient>` with a mock order where `status='CONFIRMED'` and userRole='MANAGER', checks `screen.getByRole('button', { name: /recibir artículos/i })` is in document — this test must FAIL before T023

- [ ] T019 [P] [US2] Add failing test to `purchase-order-detail-client.test.tsx`: `it('does not show "Recibir Artículos" button for STAFF role')` — renders with `status='CONFIRMED'` and `userRole='STAFF'`, checks `screen.queryByRole('button', { name: /recibir artículos/i })` is NOT in document — this test must FAIL before T023

### Implementation for User Story 2

- [ ] T020 [US2] Create `apps/web/app/tenants/[slug]/(dashboard)/inventory/purchase-orders/[id]/receive-items-dialog.tsx` with `'use client'` directive; the component accepts props: `order: PurchaseOrderDetailResponse` (imported from `@repo/types`), `open: boolean`, `onClose: () => void`, `onSuccess: () => void`; renders a `<Sheet open={open} onOpenChange={onClose}>` from shadcn/ui with `side="right"` and `className="w-full max-w-lg flex flex-col p-0"`; inside `<SheetHeader>` show title "Recibir Artículos" and description showing order supplier name; the component body is delegated to `<ReceiveItemsForm>` (see T021)

- [ ] T021 [US2] Create `apps/web/app/tenants/[slug]/(dashboard)/inventory/purchase-orders/[id]/receive-items-form.tsx` with `'use client'` directive; import `useForm` from `react-hook-form` and `zodResolver` from `@hookform/resolvers/zod`; import `ReceivePurchaseOrderSchema` from `@repo/types`; props: `order: PurchaseOrderDetailResponse`, `onSuccess: () => void`, `onClose: () => void`; use `useForm({ resolver: zodResolver(ReceivePurchaseOrderSchema), defaultValues: { purchaseOrderId: order.id, locationId: order.location.id, items: order.items.map(item => ({ purchaseOrderItemId: item.id, productId: item.productId, quantityReceived: 1, unitsPerPackage: item.unitsPerPackage, unitPrice: item.unitPrice, tax: item.tax })), notes: '' } })`; render a scrollable `<form>` with one card per item: item.product.name (read-only), a `<label htmlFor="quantityReceived-{idx}">Cantidad Recibida</label>` with `<input type="number" id="quantityReceived-{idx}" min="1" max={item.quantity - (item.quantityReceived ?? 0)} />` registered via `register`, inline validation error below; a `<label htmlFor="unitsPerPackage-{idx}">Unidades por Empaque</label>` with `<input type="number" id="unitsPerPackage-{idx}" min="1" />` registered via `register`, inline validation error below; a read-only display line "Delta de Stock: {quantityReceived × unitsPerPackage} unidades" computed with `watch`; at the bottom, a "Cancelar" button (variant="outline") calling onClose, and a submit button "Recibir Artículos" (variant="gradient") that is disabled and shows "Registrando…" when `isSubmitting`

- [ ] T022 [US2] Wire the form submission in `receive-items-form.tsx`: `handleSubmit` calls `receivePurchaseAction(null, formData)` (converting form data to FormData) or better — since `receivePurchaseAction` uses Zod validation, call it with the raw validated object by building the FormData from form values; on `result?.error`, set a component-level `errorMessage` state and show it as `<p className="text-destructive text-sm">{errorMessage}</p>` above the submit button; on success (`!result?.error`), call `onSuccess()`

- [ ] T023 [US2] Update `apps/web/app/tenants/[slug]/(dashboard)/inventory/purchase-orders/[id]/purchase-order-detail-client.tsx`: import `ReceiveItemsDialog` from `'./receive-items-dialog'`; add `receiveDialogOpen: boolean` state initialized to `false`; in the action buttons section, add a condition `isConfirmed && (userRole === 'MANAGER' || userRole === 'OWNER' || userRole === 'ADMIN')` and render `<Button variant="gradient" onClick={() => setReceiveDialogOpen(true)}>Recibir Artículos</Button>`; remove the teal-50 placeholder box that currently says "La recepción de mercancía se registra en el módulo de Compras (Sprint 19)"; render `<ReceiveItemsDialog order={order} open={receiveDialogOpen} onClose={() => setReceiveDialogOpen(false)} onSuccess={() => { setReceiveDialogOpen(false); router.refresh(); }} />` at the bottom of the JSX

- [ ] T024 [US2] Add `isReceived` condition to `purchase-order-detail-client.tsx`: when `order.status === 'RECEIVED'` AND userRole is 'OWNER' or 'ADMIN', show a `<Button variant="outline" onClick={handleCloseOrder} disabled={actionLoading}>Cerrar Orden</Button>` button; implement `handleCloseOrder` that calls `closePurchaseOrderAction(order.id)` from `@/app/actions/purchases`, sets `actionLoading` to true/false around the call, shows `window.confirm('¿Cerrar esta orden de compra?')` before proceeding

- [ ] T025 [US2] Implement `receivePurchaseAction` in `apps/web/app/actions/purchases.ts` created in T002: the action validates `ReceivePurchaseOrderSchema.safeParse({ purchaseOrderId, locationId, items, notes })` where all values come from the `formData` argument (items serialized as JSON string in a single FormData field named 'items'); on validation failure return `{ error: result.error.issues[0]?.message ?? 'Datos inválidos' }`; on success call `apiFetch('/purchases', { method: 'POST', body: JSON.stringify(result.data) })`; call `revalidatePath('/inventory/purchase-orders')` and `revalidatePath('/inventory/purchases')` and `revalidatePath('/inventory/movements')` on success; return null on success; catch errors and return `{ error: e instanceof Error ? e.message : 'Error al registrar recepción' }`; handle 409 status by returning `{ error: 'Orden modificada por otro usuario. Actualiza la página e intenta de nuevo.' }`

- [ ] T026 [US2] Implement `closePurchaseOrderAction` in `apps/web/app/actions/purchases.ts`: accepts `id: string`, calls `apiFetch('/purchase-orders/{id}/close', { method: 'POST', body: JSON.stringify({}) })`; calls `revalidatePath('/inventory/purchase-orders')` and `revalidatePath('/inventory/purchase-orders/{id}')`; returns `{ error: string } | null`

- [ ] T027 [US2] Add 409 Conflict error handling in `receive-items-form.tsx`: when `receivePurchaseAction` returns an error containing "Orden modificada", display the message and add a `<Button variant="outline" onClick={onClose}>Cerrar y Actualizar</Button>` button so the user can close the dialog and refresh the parent page via `router.refresh()` called in `onSuccess`

- [ ] T028 [US2] Run `pnpm check-types` and `pnpm --filter web test -- receive-items-dialog.test.tsx purchase-order-detail-client.test.tsx` from repository root; all T015–T019 tests must now pass; fix any TypeScript errors before marking US2 complete

**Checkpoint**: CONFIRMED orders show "Recibir Artículos" button. Receipt form calculates stockDelta live. Submission calls backend and refreshes order status.

---

## Phase 5: User Story 3 — Inventory Movements Listing, Filtering & Detail (Priority: P1)

**Goal**: Build the complete Inventory Movements module: list page with type/product/date/reference filters, type badges (Entrada=green/Salida=red), pagination, row-click navigation to detail view, and the detail view showing items with before/after stock audit trail.

**Independent Test**: Navigate to `/inventory/movements`, verify movements load in a table with type badges; filter by type=IN, verify only "Entrada" rows appear; click a row, verify movement detail page shows items table with "Antes" and "Después" stock columns.

### Tests for User Story 3 (TDD — write first, make them FAIL)

- [ ] T029 [P] [US3] Create test file `apps/web/app/tenants/[slug]/(dashboard)/inventory/movements/movements-page-client.test.tsx`; mock `next/navigation` with `useRouter: () => ({ push: vi.fn() })` and `useSearchParams: () => new URLSearchParams()`; write `it('renders table heading "Movimientos de Inventario"')` that renders `<MovementsPageClient movements={makePaginatedMovements([])} userRole="OWNER" />` and checks `screen.getByRole('heading', { name: /movimientos de inventario/i })`; write `it('renders movement rows with type badge, date, and reference')` that passes one movement of type 'IN', reference 'PURCHASE-abc', date '2026-04-28' and checks for the badge text "Entrada" and the reference text — all tests must FAIL before T033

- [ ] T030 [P] [US3] Add test to `movements-page-client.test.tsx`: `it('shows empty state "Sin movimientos encontrados" when data is empty')` — renders with empty data array, checks `screen.getByText(/sin movimientos encontrados/i)` is in document — must FAIL before T033

- [ ] T031 [P] [US3] Add test to `movements-page-client.test.tsx`: `it('navigates to movement detail when row is clicked')` — renders with one movement (id: 'mov-uuid-1'), fires `userEvent.click` on the row, checks `mockRouterPush` was called with `/inventory/movements/mov-uuid-1` — must FAIL before T033

- [ ] T032 [P] [US3] Create test file `apps/web/app/tenants/[slug]/(dashboard)/inventory/movements/[id]/movement-detail-client.test.tsx`; mock `next/navigation`; write `it('renders movement type badge and reference')` that renders `<MovementDetailClient movement={mockMovement} />` where `mockMovement` has type 'OUT', reference 'SALE-xyz', and checks for "Salida" text and "SALE-xyz"; write `it('renders items table with beforeStock and afterStock columns')` that passes movement with one item (beforeStock: 50, afterStock: 30, productName: 'Product A') and checks for `screen.getByText('50')` and `screen.getByText('30')` — all tests must FAIL before T037

### Implementation for User Story 3

- [ ] T033 [P] [US3] Create `apps/web/app/tenants/[slug]/(dashboard)/inventory/movements/movement-type-badge.tsx` with no `'use client'` directive (pure render, no hooks); exports `MovementTypeBadge({ type }: { type: 'IN' | 'OUT' })` function; renders a `<span>` with `className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"` and conditionally applies `"bg-emerald-100 text-emerald-800"` for IN or `"bg-red-100 text-red-800"` for OUT; shows text "Entrada" for IN and "Salida" for OUT (Spanish); no external library imports needed

- [ ] T034 [P] [US3] Create `apps/web/app/tenants/[slug]/(dashboard)/inventory/movements/movements-page-client.tsx` with `'use client'` directive; accepts props: `movements: PaginatedInventoryMovementsResponse` (imported from `@repo/types`), `userRole: UserRole` (imported from `@repo/types`); imports `MovementTypeBadge` from `'./movement-type-badge'`; imports `useRouter`, `useSearchParams` from `next/navigation`; imports `Button` from `@/components/ui/button`, `Input` from `@/components/ui/input`, `EmptyState` from `@/app/components/empty-state`, `Table`, `TableBody`, `TableCell`, `TableHead`, `TableHeader`, `TableRow` from `@/components/ui/table`

- [ ] T035 [US3] Implement filter state and controls in `movements-page-client.tsx`: add state `typeFilter` (initialized from `searchParams.get('type') ?? 'all'`), `dateFrom` (from `searchParams.get('dateFrom') ?? ''`), `dateTo` (from `searchParams.get('dateTo') ?? ''`), `referenceSearch` (from `searchParams.get('reference') ?? ''`); render filter row with: `<select id="typeFilter">` with options "all=Todos los tipos", "IN=Entrada", "OUT=Salida" with `<label htmlFor="typeFilter">Tipo</label>`, `<input type="date" id="dateFrom" aria-label="Fecha desde" />`, `<input type="date" id="dateTo" aria-label="Fecha hasta" />`, `<Input id="reference" placeholder="Buscar por referencia..." />`, and `<Button variant="ghost" size="sm">Limpiar Filtros</Button>`; each filter change calls `router.push` with updated URL params and `page=1`; "Limpiar Filtros" resets all state and calls `router.push('?page=1')`

- [ ] T036 [US3] Implement table rendering in `movements-page-client.tsx`: when `movements.data.length === 0`, render `<EmptyState title="Sin movimientos encontrados" description="No hay movimientos de inventario que coincidan con los filtros." />`; otherwise render `<Table>` with `<TableHeader>` containing columns: "Tipo", "Fecha", "Referencia", "Artículos", "Registrado por"; in `<TableBody>`, map `movements.data` to `<TableRow key={m.id} onClick={() => router.push('/inventory/movements/' + m.id)} className="cursor-pointer hover:bg-muted/50">`; each row shows: `<TableCell><MovementTypeBadge type={m.type} /></TableCell>`, date formatted with `new Date(m.date).toLocaleDateString('es-MX')`, `m.reference ?? '—'`, `m.itemCount`, and the `createdBy.name` field (if available in the API response) or `m.userId` as fallback

- [ ] T037 [US3] Add pagination controls to `movements-page-client.tsx` inside a conditional `{movements.total > movements.limit && (...)}` block: render `<div className="flex items-center justify-between">` with `<p className="text-sm text-secondary">Página {movements.page} de {Math.ceil(movements.total / movements.limit)}</p>` and two buttons "Anterior" (disabled when `movements.page <= 1`) and "Siguiente" (disabled when `movements.page * movements.limit >= movements.total`); each button updates the URL with `router.push('?' + updatedParams)` where page is decremented/incremented

- [ ] T038 [US3] Create `apps/web/app/tenants/[slug]/(dashboard)/inventory/movements/page.tsx` as an async server component; extract search params from the Next.js `searchParams: Promise<{ page?: string; type?: string; dateFrom?: string; dateTo?: string; reference?: string }>` prop; call `await fetchInventoryMovementsAction({ page: Number(searchParams.page ?? 1), limit: 20, type: searchParams.type, dateFrom: searchParams.dateFrom, dateTo: searchParams.dateTo, reference: searchParams.reference })` (import from `@/app/actions/inventory-movements`); get `sessionUser` via `getSessionUser()` from `../../../../../lib/session`; render `<MovementsPageClient movements={movements} userRole={sessionUser?.role ?? 'STAFF'} />` (import from `'./movements-page-client'`)

- [ ] T039 [US3] Create `apps/web/app/tenants/[slug]/(dashboard)/inventory/movements/[id]/movement-detail-client.tsx` with `'use client'` directive; accepts prop `movement: InventoryMovementDetailResponse` (imported from `@repo/types`); imports `MovementTypeBadge` from `'../movement-type-badge'`; imports `useRouter` from `next/navigation`; imports `Button`, `Table`, `TableBody`, `TableCell`, `TableHead`, `TableHeader`, `TableRow` from shadcn/ui; renders: (1) header row with `<Button variant="ghost" size="sm" onClick={() => router.back()}>← Volver</Button>` and `<MovementTypeBadge type={movement.type} />`; (2) metadata card with: Reference, Date (es-MX locale), Notes (`movement.notes ?? '—'`); (3) items table with columns "Producto", "Cantidad", "Precio Unitario", "Valor Total", "Antes", "Después" — where "Antes" shows `item.beforeStock ?? '—'` and "Después" shows `item.afterStock ?? '—'` (note: these fields may not exist in current schema — see T040)

- [ ] T040 [US3] Check whether `InventoryMovementItemResponseSchema` in `packages/types/src/purchases.schemas.ts` includes `beforeStock: z.number().int()` and `afterStock: z.number().int()` fields; if missing, add them as `.optional()` (nullable for backwards compat: `z.number().int().optional()`) — run `pnpm check-types` after to verify no breaks

- [ ] T041 [US3] Create `apps/web/app/tenants/[slug]/(dashboard)/inventory/movements/[id]/page.tsx` as an async server component; extract `params: Promise<{ id: string }>` from props (Next.js 16 App Router pattern where params is a Promise); call `const { id } = await params`; call `await fetchInventoryMovementAction(id)` from `@/app/actions/inventory-movements`; render `<MovementDetailClient movement={movement} />` (import from `'./movement-detail-client'`); wrap the `fetchInventoryMovementAction` call in a try/catch — if it throws (404), render a `<div className="p-8 text-center"><p className="text-muted-foreground">Movimiento no encontrado.</p><Button variant="outline" onClick={() => router.back()}>Volver</Button></div>` — but since this is a server component with no router, simply render a paragraph "Movimiento no encontrado" with a link back to `/inventory/movements`

- [ ] T042 [US3] Run `pnpm check-types` and `pnpm --filter web test -- movements-page-client.test.tsx movement-detail-client.test.tsx` from repository root; all tests T029–T032 must now pass; fix all TypeScript errors before marking US3 complete

**Checkpoint**: `/inventory/movements` shows paginated list with type badges. Filters update URL. Clicking a row opens detail with before/after stock columns.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Accessibility, error states, and final validation across all user stories.

- [ ] T043 Add `aria-label` attributes to all filter controls in `purchase-orders-page-client.tsx` that don't already have `<label>` elements: the supplier `<select>` gets `aria-label="Filtrar por proveedor"`, the status `<select>` gets `aria-label="Filtrar por estado"`, the text search `<Input>` already has `placeholder` but add `aria-label="Buscar por proveedor"` — per FR-083

- [ ] T044 Add `role="status"` and `aria-live="polite"` to the loading/error states in `movements-page-client.tsx` so screen readers announce when data loads — per FR-083/FR-084; specifically wrap the table/empty-state section with a `<div role="status" aria-live="polite" aria-label="Lista de movimientos">` wrapper

- [ ] T045 Add page-level heading `<h1 className="text-2xl font-bold text-on-surface font-headline">Movimientos de Inventario</h1>` and subheading `<p className="text-secondary text-sm mt-1">Historial de entradas y salidas de inventario</p>` to `movements-page-client.tsx` in the header section above the filter controls

- [ ] T046 Add page-level heading `<h1>Detalle de Movimiento</h1>` and `<MovementTypeBadge>` inline to the `movement-detail-client.tsx` header section; ensure the `<h1>` uses `className="text-2xl font-bold text-on-surface font-headline"` for visual consistency with other detail pages

- [ ] T047 Verify `inventory/layout.tsx` activeTab logic: the existing `InventoryTab` component uses static `className` without active-state detection; check if other tabs (Products, Stock, Suppliers, Órdenes) show active state via CSS (check `usePathname`); if the other tabs have active detection, apply the same pattern to the new "Compras" and "Movimientos" tabs; if they don't, leave as-is and document it as a known limitation

- [ ] T048 Ensure `receive-items-dialog.tsx` closes on Escape key: the shadcn/ui `<Sheet>` handles Escape natively via Radix; verify by reading the `SheetContent` source — no additional code needed; add a comment in the component: `{/* Sheet closes on Escape via Radix Dialog primitive */}`

- [ ] T049 Run final validation suite from repository root: `pnpm lint && pnpm check-types && pnpm --filter web test`; fix ALL lint errors, TypeScript errors, and test failures; target: 0 errors, 0 warnings, 100% of new tests passing

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1; BLOCKS US2 tasks that use PurchaseOrderItem fields
- **Phase 3 (US1)**: Depends on Phase 1 only — can start in parallel with Phase 2
- **Phase 4 (US2)**: Depends on Phase 2 (T004-T005 must complete first)
- **Phase 5 (US3)**: Depends on Phase 1 (T002–T003) only — can start in parallel with US1 and US2
- **Phase 6 (Polish)**: Depends on US1 + US2 + US3 completion

### Within Each User Story

- TDD tests (marked Red) → must FAIL before implementation begins
- Implementation tasks run in order within each story
- `pnpm check-types` + tests run at the end of each story

### Parallel Opportunities

- **T006, T007, T008, T009**: All US1 tests are parallel (different test cases, same file — write all before implementing)
- **T015, T016, T017, T018, T019**: All US2 tests are parallel (different test cases)
- **T029, T030, T031, T032**: All US3 tests are parallel
- **T033, T034**: Independent components (badge + page-client scaffold) — parallel
- **T002, T003**: Two different action files — parallel
- **US1 and US3**: Completely independent — can run in parallel once Phase 1 completes
- **T043, T044, T045, T046**: Polish tasks in different files — parallel

---

## Parallel Example: User Story 3

```bash
# Step 1 — Write all US3 tests (will fail)
Task: movements-page-client.test.tsx — heading, rows, empty, navigation tests (T029–T031)
Task: movement-detail-client.test.tsx — type badge, before/after stock tests (T032)

# Step 2 — Implement badge and scaffold (parallel)
Task: movement-type-badge.tsx (T033)
Task: movements-page-client.tsx scaffold (T034)

# Step 3 — Implement filters, table, pagination (sequential)
Task: filter controls in movements-page-client.tsx (T035)
Task: table and empty state in movements-page-client.tsx (T036)
Task: pagination in movements-page-client.tsx (T037)

# Step 4 — Server pages + detail (parallel)
Task: movements/page.tsx (T038)
Task: movement-detail-client.tsx (T039)
Task: check schema for beforeStock/afterStock (T040)
Task: movements/[id]/page.tsx (T041)

# Step 5 — Validate all tests pass (T042)
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1 (T001–T003)
2. Complete Phase 3/US1 (T006–T014) — date range filter on existing PO list
3. **STOP and VALIDATE**: Open `/inventory/purchase-orders`, apply date filters, verify filtering works
4. If working, deliver US1 and continue

### Full Sprint Delivery

1. Phase 1 → Phase 2 (setup + type fix)
2. US1 + US3 in parallel (both list-only, independent)
3. US2 (receive flow — depends on Phase 2)
4. Phase 6 Polish
5. Final: `pnpm lint && pnpm check-types && pnpm --filter web test` — all green

### Important Notes

- `PurchaseOrderDetailResponse.items[].unitsPerPackage` may be `undefined` until T004 runs — do NOT start T015–T027 before T004–T005 complete
- The `beforeStock`/`afterStock` fields (T040) are optional in the API response; render `'—'` when undefined to avoid crashes
- All labels and messages must be in Spanish (Spanish UI convention per CLAUDE.md)
- Date formatting: `new Date(date).toLocaleDateString('es-MX')` — use this everywhere
- Currency formatting: `Number(amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })`
- `apiFetch` is imported from `'../../lib/api'` in actions (relative path from `apps/web/app/actions/`)

---

## Notes

- `[P]` tasks = different files, no dependency — safe to start simultaneously
- `[US#]` label maps task to spec user story for traceability
- TDD cycle: write failing test → confirm it fails → implement → confirm it passes
- Verify `pnpm check-types` passes after EVERY phase checkpoint
- Target: `pnpm lint && pnpm check-types && pnpm --filter web test` all green before marking sprint complete
