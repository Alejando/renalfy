# Implementation Plan: Sprint 20 — UI del Módulo de Compras y Movimientos de Inventario

**Branch**: `020-sprint-dulo-compras-ui` | **Date**: 2026-04-29 | **Spec**: `specs/020-sprint-dulo-compras-ui/spec.md`
**Input**: Sprint 19 backend completo. Necesita UI: detalle de compra, listado de movimientos, completar/mejorar tests, integración con recepciones.

## Summary

Sprint 20 implementa la interfaz de usuario para visualizar y gestionar compras de inventario y su historial de movimientos. El backend (Sprint 19) ya existe y expone endpoints para consultar compras, órdenes y movimientos. El trabajo incluye: (1) crear página de detalles de compra con tabla de ítems recibidos, (2) crear listado de movimientos de inventario con filtros, (3) conectar el diálogo de recepción de ítems (parcialmente existente) con el detalle de orden, (4) completar tests de todos los componentes, (5) asegurar responsiveness y acceso por rol/tenant.

## Technical Context

**Language/Version**: TypeScript 5.3, Node.js 25, React 19 (Next.js 16 App Router)  
**Primary Dependencies**: Next.js 16, shadcn/ui, Tailwind CSS v4, React Hook Form + Zod, Vitest + React Testing Library  
**Storage**: PostgreSQL 16 (backend already has data); frontend consumes API endpoints  
**Testing**: Vitest (unit/component tests), React Testing Library, no E2E tests in frontend (backend E2E covered in Sprint 19)  
**Target Platform**: Web (desktop 1024px+, tablet 768px+, mobile 320px+)  
**Project Type**: Multi-tenant SaaS web application (monorepo: Next.js frontend + NestJS backend)  
**Performance Goals**: Page load <2s, list filtering <3s for 1000+ records, API response <500ms  
**Constraints**: Multi-tenant isolation (tenantId from JWT, RLS at DB), role-based access (OWNER/ADMIN unrestricted, MANAGER location-filtered, STAFF denied), immutable purchases (read-only detail view)  
**Scale/Scope**: 3 new pages/sections (purchase detail, inventory movements, dialog completion), ~10 components, ~20-25 tests

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Multi-Tenant by Design** | ✅ PASS | All purchases filtered by tenantId (from JWT). Manager sees only their locationId. Frontend enforces nothing — backend filters all queries. |
| **II. Schema-First (@repo/types)** | ✅ PASS | Schemas already defined in Sprint 19: ReceivePurchaseOrderSchema, PurchaseResponseSchema, etc. Frontend uses zodResolver. |
| **III. Test-First (Red→Green→Refactor)** | ✅ PASS | All components will have Vitest tests. TDD enforced in spec requirement FR-027. |
| **IV. Regulatory Compliance** | ✅ N/A | Sprint 20 is inventory UI, not clinical data. Purchases don't touch patient consent or clinical records. |
| **V. Security First** | ✅ PASS | Backend ensures RLS/tenant isolation. Frontend receives user role & locationId from session — display filtered accordingly. No secrets in frontend. |
| **VI. Simplicity & Modularity** | ✅ PASS | One component per responsibility (DetailPage, MovementsPage, ReceiveDialog, etc.). No premature abstraction. Google TypeScript Style Guide enforced. |

**Gate Result**: ✅ ALL GATES PASS — proceed to Phase 0 research.

## Project Structure

### Documentation (this feature)

```text
specs/020-sprint-dulo-compras-ui/
├── plan.md              # This file
├── research.md          # Phase 0 output (TBD)
├── data-model.md        # Phase 1 output (TBD)
├── quickstart.md        # Phase 1 output (TBD)
├── contracts/           # Phase 1 output (TBD)
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (monorepo)

```text
apps/web/
├── app/
│   ├── actions/
│   │   ├── purchases.ts                # Server actions: receivePurchase, closePurchaseOrder
│   │   └── purchase-orders.ts          # (existing)
│   ├── tenants/[slug]/(dashboard)/
│   │   └── inventory/
│   │       ├── purchases/
│   │       │   ├── page.tsx            # Purchase listing (server component)
│   │       │   ├── purchases-page-client.tsx  # (partially done, enable View button)
│   │       │   ├── [id]/               # NEW: Purchase detail page
│   │       │   │   ├── page.tsx        # Server component - fetch detail data
│   │       │   │   └── detail-client.tsx # Client component - display
│   │       │   └── [...].test.tsx      # Tests
│   │       ├── movements/              # NEW: Inventory movements listing
│   │       │   ├── page.tsx            # Server component - fetch movements + filters
│   │       │   ├── movements-page-client.tsx  # Client component - display + pagination
│   │       │   └── [...].test.tsx      # Tests
│   │       └── purchase-orders/[id]/
│   │           ├── receive-items-dialog.tsx  # (existing, may refine)
│   │           ├── receive-items-form.tsx    # (existing, may refine)
│   │           └── [...].test.tsx      # (complete if missing)
│   ├── components/
│   │   ├── empty-state.tsx             # (reuse existing)
│   │   └── status-badge.tsx            # (reuse existing or create)
│   └── lib/
│       └── api.ts                      # (reuse existing fetch wrapper)
│
packages/types/
├── src/
│   ├── index.ts
│   ├── enums.ts          # (PurchaseOrderStatus, InventoryMovementType already defined?)
│   └── [...].schemas.ts  # (purchase, movement schemas already defined in Sprint 19)
```

**Structure Decision**: Web application (Next.js frontend only for this sprint). Option 2 selected — existing monorepo structure. New files added under `apps/web/app/tenants/.../inventory/`. Reuse existing components, API wrapper, and server action pattern. All components follow Next.js App Router + Client Component conventions. Testing in same directory with `.test.tsx` suffix.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
