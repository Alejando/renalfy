# Implementation Plan: Módulo 3 — Proveedores + Órdenes de Compra

**Feature ID**: `014-sprint-dulo-proveedores` | **Date**: 2026-04-24 | **Spec**: [spec.md](./spec.md)

## Summary

Implementar el módulo de proveedores y órdenes de compra en dos sprints:
- **Sprint 17 (Backend)**: Migraciones de schema, módulos NestJS `suppliers` y `purchase-orders`, actualización de `@repo/types`.
- **Sprint 18 (UI)**: Páginas y componentes de dashboard para el directorio de proveedores y la gestión de órdenes de compra.

**Hallazgos de análisis del schema**: El schema de Prisma ya tiene las entidades base (`Supplier`, `SupplierProduct`, `PurchaseOrder`, `PurchaseOrderItem`) pero con campos incompletos y un enum desalineado. Se requieren migraciones antes de implementar la capa de aplicación.

## Technical Context

**Language/Version**: TypeScript 5 + NestJS (backend) / React 19 + Next.js 16 App Router (frontend)
**Primary Dependencies**: Prisma 7, nestjs-zod, @repo/types, shadcn/ui, Tailwind CSS v4, Vitest, React Testing Library
**Storage**: PostgreSQL 16 con RLS — migraciones sobre tablas existentes + actualización de enum
**Testing**: Jest unit + E2E (backend); Vitest + RTL (frontend)
**Target Platform**: Dashboard multi-tenant `{slug}.renalfy.app`
**Project Type**: Full-stack — Sprint 17 backend + Sprint 18 UI
**Constraints**: Schema-first: `@repo/types` se actualiza antes de tocar backend o frontend

## Constitution Check

| Principio | Estado | Nota |
|---|---|---|
| I. Multi-tenant | ✓ PASS | `tenantId` en todas las tablas; RLS en migraciones; MANAGER filtrado por locationId en servicio |
| II. Schema-first | ✓ REQUIRED | `@repo/types` actualizado antes de cualquier código de aplicación |
| III. Test-first | ✓ REQUIRED | Red → Green → Refactor en cada módulo |
| IV. Regulatory | ✓ N/A | Módulo de inventario — sin datos de pacientes |
| V. Security | ✓ PASS | Endpoints de escritura restringidos a OWNER/ADMIN con `@Roles()` |
| VI. Simplicity | ✓ PASS | Un módulo NestJS por recurso principal; sub-recursos en el módulo padre |

## Project Structure

### Documentation

```text
specs/014-sprint-dulo-proveedores/
├── plan.md          ← este archivo
├── research.md      ← Phase 0
├── data-model.md    ← Phase 1
├── contracts/
│   ├── api.md       ← contratos de endpoints backend
│   └── ui.md        ← contratos de componentes UI
├── quickstart.md    ← Phase 1
└── tasks.md         ← generado por /speckit.tasks
```

### Source Code — Sprint 17 (Backend)

```text
packages/types/src/
├── enums.ts                    ← actualizar PurchaseOrderStatus (ISSUED→SENT, +CONFIRMED)
└── suppliers.schemas.ts        ← NUEVO: todos los schemas de supplier y purchase-order

apps/api/prisma/
└── migrations/
    └── YYYYMMDD_suppliers_and_purchase_orders/
        ├── migration.sql       ← campos nuevos + enum update + RLS policies

apps/api/src/
├── suppliers/
│   ├── suppliers.module.ts
│   ├── suppliers.controller.ts
│   ├── suppliers.service.ts
│   ├── suppliers.service.spec.ts
│   └── dto/
│       ├── create-supplier.dto.ts
│       ├── update-supplier.dto.ts
│       ├── create-supplier-product.dto.ts
│       ├── update-supplier-product.dto.ts
│       └── supplier-query.dto.ts
├── purchase-orders/
│   ├── purchase-orders.module.ts
│   ├── purchase-orders.controller.ts
│   ├── purchase-orders.service.ts
│   ├── purchase-orders.service.spec.ts
│   └── dto/
│       ├── create-purchase-order.dto.ts
│       ├── add-purchase-order-item.dto.ts
│       ├── update-purchase-order-item.dto.ts
│       ├── update-purchase-order-status.dto.ts
│       └── purchase-order-query.dto.ts
└── test/
    ├── suppliers.e2e-spec.ts
    └── purchase-orders.e2e-spec.ts
```

### Source Code — Sprint 18 (UI)

```text
apps/web/app/tenants/[slug]/(dashboard)/inventory/
├── suppliers/
│   ├── page.tsx
│   ├── page.test.tsx
│   ├── suppliers-page-client.tsx
│   ├── suppliers-page-client.test.tsx
│   ├── supplier-drawer.tsx
│   ├── supplier-drawer.test.tsx
│   ├── supplier-form.tsx
│   ├── supplier-form.test.tsx
│   └── [id]/
│       ├── page.tsx
│       ├── page.test.tsx
│       ├── supplier-detail-client.tsx
│       ├── supplier-detail-client.test.tsx
│       └── add-supplier-product-dialog.tsx
├── purchase-orders/
│   ├── page.tsx
│   ├── page.test.tsx
│   ├── purchase-orders-page-client.tsx
│   ├── purchase-orders-page-client.test.tsx
│   └── [id]/
│       ├── page.tsx
│       ├── page.test.tsx
│       ├── purchase-order-detail-client.tsx
│       ├── purchase-order-detail-client.test.tsx
│       └── add-order-item-dialog.tsx
└── (shared)/
    └── purchase-order-status-badge.tsx   ← si se usa en 2+ pantallas

apps/web/app/actions/
├── suppliers.ts          ← Server Actions: createSupplier, updateSupplier, addSupplierProduct, etc.
└── purchase-orders.ts    ← Server Actions: createPurchaseOrder, addItem, updateItem, deleteItem, updateStatus
```

## Constitution Check Post-Diseño

Sin nuevas violaciones. La estructura sigue el patrón del proyecto. Los sub-recursos de suppliers y purchase-orders se implementan dentro del módulo padre. El `AddOrderItemDialog` con inline creation de `SupplierProduct` opera en el mismo contexto transaccional en el backend.
