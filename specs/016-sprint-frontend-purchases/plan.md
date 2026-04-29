# Implementation Plan: Sprint 20 — Frontend UI for Purchases & Inventory Movements

**Branch**: `016-sprint-frontend-purchases` | **Date**: 2026-04-28 | **Spec**: `/specs/016-sprint-frontend-purchases/spec.md`

**Input**: Feature specification from `/specs/016-sprint-frontend-purchases/spec.md`

---

## Summary

**Objective**: Build complete frontend UI for the Purchases & Inventory Movements module (Módulo 3, Part 2). Provides hospital administrators and inventory managers with interfaces to view/manage purchase orders, register purchase receipts, and track real-time inventory movements with multi-tenant RLS enforcement.

**Scope**: 5 user stories (P1-P2), 46 functional requirements, 13 success criteria across 5 pages/features:
1. Purchase Orders listing + filtering
2. Purchase Order details + receive workflow
3. Inventory Movements listing + filtering
4. Movement details view
5. Real-time stock caching + updates

**Technical Approach**: 
- Next.js 16 App Router with TypeScript
- TDD + Vitest for component/hook testing
- React Hook Form + Zod for validation (schemas from @repo/types)
- shadcn/ui components + Tailwind CSS v4
- Polling-based real-time (5-10s interval)
- Server-side RLS enforcement via backend API

---

## Technical Context

**Language/Version**: TypeScript 5.7 + React 19 (Next.js 16 App Router)

**Primary Dependencies**:
- React Hook Form (form management)
- Zod + @hookform/resolvers/zod (validation)
- shadcn/ui (component library)
- Tailwind CSS v4 (styling)
- TanStack React Query or fetch (data fetching)
- Vitest + React Testing Library (testing)

**Storage**: PostgreSQL 16 (backend only; frontend reads via API)

**Testing**: Vitest + React Testing Library (unit/component tests)

**Target Platform**: Web browser (responsive design; desktop-first, mobile-optimized)

**Project Type**: Next.js frontend module (part of Renalfy monorepo)

**Performance Goals**:
- List pages load + filters apply in <2 seconds
- User completes receipt flow in <5 minutes
- Real-time updates visible within 2 seconds
- No console errors during typical workflows

**Constraints**:
- Multi-tenant via RLS (enforced in backend, frontend receives filtered data only)
- MANAGER/STAFF location filtering (enforced by backend, frontend respects)
- No external API calls for patient data (comply with PHI zero-data rule)
- No edit capability for purchase orders (v1 MVP scope)

**Scale/Scope**:
- ~5 new pages/components
- ~46 requirements, ~10 components
- Expected 5000 POs, 10000 movements per tenant
- Pagination (20 items/page)

---

## Constitution Check

✅ **Principle I — Multi-Tenant Design**:
- All data fetched via backend API with server-enforced RLS
- tenantId comes from JWT (extracted by JwtAuthGuard)
- MANAGER/STAFF filtering by locationId enforced by backend
- Frontend displays only pre-filtered data
- **Status**: PASS

✅ **Principle II — Schema-First (@repo/types)**:
- Backend Sprint 19 already defined: PurchaseOrderResponse, PurchaseResponse, InventoryMovementResponse, PurchaseOrderQueryDto, InventoryMovementQueryDto schemas
- Frontend will extend these schemas for any additional DTO needs (e.g., ReceivePurchaseFormDto)
- Form validation uses Zod resolver pattern
- Response parsing uses Schema.parse() pattern
- **Status**: PASS (schemas already defined in Sprint 19)

✅ **Principle III — Test-First (Red → Green → Refactor)**:
- Component tests written before implementation
- Happy path + error scenarios tested
- Vitest + React Testing Library
- No component considered "done" until tests pass + lint + types pass
- **Status**: PASS (will implement)

✅ **Principle IV — Regulatory Compliance**:
- This module does not create Patient records; only handles procurement/inventory
- No patient consent check needed at this layer (enforced in clinical modules)
- No access to clinical data (Appointment, Measurement)
- Audit trail visible via InventoryMovement.reference links to source documents
- **Status**: PASS (not applicable to procurement module)

✅ **Principle V — Security First**:
- No direct database access; all API calls via authenticated endpoints
- tenantId from JWT (set by TenantInterceptor on backend)
- Session tokens validated by JwtAuthGuard
- No secrets in frontend code
- **Status**: PASS

✅ **Principle VI — Simplicity & Modularity**:
- Component per user story (PurchaseOrdersPage, ReceiveModalForm, InventoryMovementsPage, etc.)
- Custom hooks for data fetching, filtering, caching
- shadcn/ui primitives (no custom component design system entries needed)
- Google TypeScript Style Guide adherence
- **Status**: PASS

---

## Project Structure

### Documentation (this feature)

```text
specs/016-sprint-frontend-purchases/
├── spec.md              # Feature specification (done)
├── plan.md              # This file (implementation plan)
├── data-model.md        # Frontend data structures & API contracts
├── contracts/
│   ├── purchase-orders.api.md      # API endpoints & response shapes
│   ├── inventory-movements.api.md   # API endpoints & response shapes
│   └── forms.contracts.md           # Form DTO schemas
├── quickstart.md        # Integration guide for developers
└── checklists/
    └── requirements.md  # Quality checklist (done)
```

### Source Code Structure (frontend)

```text
apps/web/
├── app/tenants/[slug]/(dashboard)/inventory/
│   ├── layout.tsx                  # Inventory section layout
│   ├── purchase-orders/
│   │   ├── page.tsx                # PO listing page
│   │   ├── [id]/
│   │   │   └── page.tsx            # PO detail page
│   │   ├── _components/
│   │   │   ├── PurchaseOrdersTable.tsx
│   │   │   ├── PurchaseOrderFilters.tsx
│   │   │   ├── PurchaseOrderDetail.tsx
│   │   │   ├── ReceiveItemsModal.tsx
│   │   │   └── ReceiveItemsForm.tsx
│   │   └── _hooks/
│   │       ├── usePurchaseOrders.ts        # Data fetching
│   │       ├── usePurchaseOrderFilters.ts  # Filter state
│   │       └── useReceivePurchase.ts       # Receipt mutation
│   │
│   └── movements/
│       ├── page.tsx                # Inventory movements listing
│       ├── [id]/
│       │   └── page.tsx            # Movement detail page
│       ├── _components/
│       │   ├── MovementsTable.tsx
│       │   ├── MovementsFilters.tsx
│       │   └── MovementDetail.tsx
│       └── _hooks/
│           ├── useInventoryMovements.ts    # Data fetching
│           └── useMovementFilters.ts       # Filter state
│
├── actions/
│   └── purchases.ts                # Server action for receive mutation
│
└── lib/
    └── api-client.ts               # Fetch wrapper + error handling

packages/types/src/
├── purchases.schemas.ts            # Existing (Sprint 19)
│   ├── PurchaseOrderResponseSchema
│   ├── PurchaseOrderItemResponseSchema
│   ├── PurchaseResponseSchema
│   ├── PurchaseItemResponseSchema
│   ├── InventoryMovementResponseSchema
│   ├── InventoryMovementItemResponseSchema
│   ├── InventoryMovementDetailResponseSchema
│   └── + query DTOs
│
└── purchases-forms.schemas.ts      # New (Sprint 20)
    ├── ReceiveItemsFormSchema
    ├── ReceiveItemSchema
    └── ReceivePurchaseDto

tests/
└── [purchase-orders, inventory-movements]/
    ├── pages.test.tsx              # Page rendering + integration
    ├── components.test.tsx         # Component unit tests
    ├── hooks.test.ts               # Hook unit tests
    └── e2e/                        # Integration scenarios (Playwright)
```

---

## Phase 1 Design: Data Model & Contracts

### Data Model (`data-model.md`)

**Frontend Data Structures** (read-only views of backend entities):

1. **PurchaseOrder** (from API)
   - id: string (UUID)
   - supplierId: string (UUID)
   - supplierName: string
   - locationId: string (UUID)
   - locationName: string
   - status: "CONFIRMED" | "RECEIVED" | "CLOSED"
   - orderDate: Date
   - totalAmount: number
   - itemCount: number
   - createdAt: Date
   - updatedAt: Date

2. **PurchaseOrderItem** (from API)
   - id: string (UUID)
   - purchaseOrderId: string
   - productId: string (UUID)
   - productName: string
   - brand: string | null
   - quantityOrdered: number
   - unitsPerPackage: number
   - unitPrice: string (decimal as string)
   - tax: string (decimal as string)
   - subtotal: string (calculated client-side: quantityOrdered × unitPrice)
   - currentLocationStock: number (from API)

3. **InventoryMovement** (from API)
   - id: string (UUID)
   - type: "IN" | "OUT"
   - date: Date
   - reference: string (e.g., "PURCHASE-{id}", "SALE-{id}")
   - locationId: string (UUID)
   - createdBy: string (userId + userName)
   - notes: string | null
   - itemCount: number
   - createdAt: Date

4. **InventoryMovementItem** (from API)
   - id: string (UUID)
   - inventoryMovementId: string
   - productId: string (UUID)
   - productName: string
   - brand: string | null
   - quantity: number
   - unitPrice: string (decimal)
   - totalValue: string (quantity × unitPrice)
   - beforeStock: number (for audit)
   - afterStock: number (for audit)

5. **LocalCache** (Frontend State)
   - locationStocks: Map<productId, number> (current levels)
   - lastUpdated: Date
   - expiresAt: Date (10-minute TTL)

**Form Models**:

1. **ReceiveItemsForm**
   - items: Array<{
       purchaseOrderItemId: string
       productId: string
       quantityReceived: number
       unitsPerPackage: number
       stockDelta: number (calculated = quantityReceived × unitsPerPackage)
     }>
   - notes: string (optional)

**Validation Rules**:
- quantityReceived: 0 < x ≤ quantityOrdered
- unitsPerPackage: x > 0
- Both numeric, required
- Date filters: fromDate < toDate

---

### API Contracts (`contracts/purchase-orders.api.md`)

**GET /api/purchase-orders** (list with filters)
- Query: { page: number, limit: number, supplierId?: string, status?: string, dateFrom?: ISO8601, dateTo?: ISO8601 }
- Response: { data: PurchaseOrder[], total: number, page: number, limit: number }
- Status: 200 OK, 400 Bad Request, 401 Unauthorized, 403 Forbidden

**GET /api/purchase-orders/:id** (detail)
- Response: { id, supplierName, locationName, status, items: PurchaseOrderItem[], createdAt, updatedAt, ... }
- Status: 200 OK, 404 Not Found, 401 Unauthorized, 403 Forbidden

**POST /api/purchases** (receive items)
- Body: { purchaseOrderId: string, locationId: string, items: Array<{ purchaseOrderItemId, quantityReceived, unitsPerPackage, unitPrice, tax }> }
- Response: { id: string, purchaseOrderId: string, locationId: string, status: "RECEIVED", items: PurchaseItem[], createdAt: Date }
- Status: 201 Created, 400 Bad Request (validation), 409 Conflict (concurrent modification), 401 Unauthorized, 403 Forbidden

**GET /api/inventory-movements** (list with filters)
- Query: { page, limit, type?: "IN"|"OUT", productId?: string, dateFrom?: ISO8601, dateTo?: ISO8601, reference?: string }
- Response: { data: InventoryMovement[], total, page, limit }
- Status: 200 OK, 400 Bad Request, 401 Unauthorized, 403 Forbidden

**GET /api/inventory-movements/:id** (detail)
- Response: { id, type, date, reference, items: InventoryMovementItem[] (with before/after stock), createdAt, ... }
- Status: 200 OK, 404 Not Found, 401 Unauthorized, 403 Forbidden

**POST /api/purchase-orders/:id/close** (admin only)
- Body: { closedReason?: string }
- Response: { id, status: "CLOSED", closedAt: Date }
- Status: 200 OK, 400 (invalid state), 401, 403 Forbidden

---

### Implementation Strategy

**Phase 1a — Setup & Infrastructure** (Sprint 20, Week 1)
- Configure TanStack React Query or simple fetch wrapper
- Set up Zod schemas for forms in @repo/types
- Create API client with error handling
- Set up test infrastructure (Vitest config, fixtures)

**Phase 1b — Core Features** (Sprint 20, Weeks 2-3)
- User Story 1 (P1): PO listing + filtering
- User Story 2 (P1): PO details + receive workflow
- User Story 3 (P1): Movement listing + filtering

**Phase 1c — Polish & Real-Time** (Sprint 20, Week 4)
- User Story 4 (P2): Admin actions (close order)
- User Story 5 (P2): Real-time stock updates (polling)
- Error handling, accessibility, full test coverage

---

## Architecture Decisions

| Decision | Rationale | Alternatives |
|----------|-----------|--------------|
| **Data Fetching**: Direct fetch (no React Query) | Simpler for CRUD-heavy module; polling overhead manageable | React Query for more advanced caching |
| **Real-Time**: Polling 5-10s interval | Initial MVP; no WebSocket complexity | WebSocket (deferred to S21+) |
| **Form State**: React Hook Form + Zod | Project standard; strong validation | Formik, custom state |
| **Styling**: Tailwind CSS v4 + shadcn/ui | Project established; no new design needed | Custom CSS, Material-UI |
| **Testing**: Vitest + React Testing Library | Aligned with project; fast feedback | Jest, Cypress |
| **Caching Strategy**: Manual cache in useContext | Lightweight; supports polling | Redux, TanStack React Query |
| **Layout**: Separate pages per feature | Clear separation; independent testing | Dashboard grid layout |

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Concurrent receipt race condition** | Two users receive same items; stock updates conflict | Backend validates accumulated qty; frontend shows optimistic update + refresh on conflict |
| **Large dataset performance** (1000+ POs) | Pagination lag, filter slowness | Limit initial load to 20 items; lazy-load filtered results |
| **Real-time stale data** | Users see outdated stock levels | Poll every 5-10s; show "stale" indicator; allow manual refresh |
| **RLS bypass via frontend** | Data leakage across tenants/locations | Backend enforces RLS on all endpoints; frontend never filters (displays only API-filtered data) |
| **Permissions not enforced** (STAFF can receive) | STAFF bypasses admin-only actions | Backend validates role before processing; frontend disables UI buttons |

---

## Success Metrics

- ✅ 5 user stories with acceptance scenarios automated (Vitest tests)
- ✅ 46 functional requirements mapped to components/hooks
- ✅ 100% of validation errors caught by Zod schemas
- ✅ Accessibility: WCAG 2.1 AA (keyboard nav, ARIA, color contrast)
- ✅ Performance: List pages load <2s, receipt flow <5min
- ✅ Zero console errors during workflows
- ✅ RLS isolation verified (no cross-tenant/location data visible)
- ✅ All tests passing (unit + e2e): `pnpm lint && pnpm check-types && pnpm test`

---

## Next Steps

1. **Phase 1 Artifacts**: Create `data-model.md`, `contracts/`, `quickstart.md`
2. **Zod Schemas**: Add form schemas to `packages/types/src/purchases-forms.schemas.ts`
3. **Tasks Generation**: Run `/speckit.tasks` to break into sprint tasks
4. **Implementation**: Begin TDD cycle with Red → Green → Refactor

**Ready for**: `/speckit.tasks` command to generate detailed, testable task breakdown
