# Implementation Plan: UI — Módulo 3: Productos y Stock

**Feature ID**: `013-sprint-modulo-productos-stock` | **Date**: 2026-04-24 | **Spec**: [spec.md](./spec.md)

## Summary

Implementar el módulo de inventario en el dashboard de Renalfy: catálogo de productos (lista + detalle + CRUD vía drawer), gestión de stock por sucursal (lista + ajuste de cantidad + configuración de parámetros), y panel de resumen ejecutivo para OWNER/ADMIN.

**Cambio de alcance vs Sprint 15**: El análisis del sistema legacy (SUTR) reveló dos requisitos no implementados en el backend que son necesarios para este sprint:
1. **`productType`** (`SALE` | `CONSUMABLE`): distingue productos de venta de insumos de sesión. Requiere migración de BD y actualización de schemas en `@repo/types`.
2. **`ProductCategory`**: las categorías son entidades gestionadas por tenant (no texto libre). Requiere nueva tabla, módulo NestJS, y pantalla de configuración.

Estos cambios de backend se implementan en este mismo sprint antes de la UI.

## Technical Context

**Language/Version**: TypeScript 5 + React 19 (Next.js 16, App Router) / NestJS (backend additions)
**Primary Dependencies**: shadcn/ui, Tailwind CSS v4, Vitest, React Testing Library, @hookform/resolvers/zod, @repo/types, Prisma 7 (migraciones backend)
**Storage**: PostgreSQL — 2 migraciones nuevas: `productType` en `Product`, nueva tabla `ProductCategory`
**Testing**: Vitest + React Testing Library (frontend); Jest unit + E2E (backend additions)
**Target Platform**: Web browser — dashboard multi-tenant (`{slug}.renalfy.app`)
**Project Type**: Full-stack sprint — backend additions + módulo frontend
**Performance Goals**: Filtros y búsquedas responden en <1 segundo para catálogos de hasta 500 productos (SC-006)
**Constraints**: Schema-first: actualizar `@repo/types` antes de tocar backend o frontend. El control de acceso MANAGER/STAFF lo aplica el backend.
**Scale/Scope**: 2 migraciones BD, 1 módulo NestJS nuevo, ~5 rutas frontend, ~14 componentes, roles OWNER/ADMIN/MANAGER/STAFF

## Constitution Check

| Principio | Estado | Nota |
|---|---|---|
| I. Multi-tenant | ✓ PASS | `tenantId` viene del JWT (backend). MANAGER/STAFF scope lo aplica el backend; frontend oculta controles de escritura por rol. |
| II. Schema-first | ✓ PASS | Todos los schemas (`ProductResponseSchema`, `LocationStockResponseSchema`, etc.) ya existen en `@repo/types` desde Sprint 15. No se crean schemas nuevos. |
| III. Test-first | ✓ REQUIRED | Cada componente y página tiene su test antes de la implementación. |
| IV. Regulatory | ✓ N/A | Módulo de inventario — sin datos de pacientes, sin AuditLog requerido. |
| V. Security | ✓ PASS | Los endpoints de escritura ya están protegidos con `@Roles('OWNER','ADMIN')` en el backend. |
| VI. Simplicity | ✓ REQUIRED | Componentes al nivel de ruta hasta que aparezcan en 2+ pantallas distintas; solo entonces mover a `@repo/ui/domain/`. |

**Resultado pre-diseño**: Sin violaciones. Proceder a Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/013-sprint-modulo-productos-stock/
├── plan.md          ← este archivo
├── research.md      ← Phase 0
├── data-model.md    ← Phase 1
├── contracts/       ← Phase 1
│   ├── products-ui.md
│   └── stock-ui.md
├── quickstart.md    ← Phase 1
└── tasks.md         ← generado por /speckit.tasks (no creado aquí)
```

### Source Code

```text
# Backend additions
packages/types/src/
└── products.schemas.ts   ← agregar ProductType enum, CategorySchema, actualizar CreateProductSchema

apps/api/src/
├── product-categories/
│   ├── product-categories.module.ts
│   ├── product-categories.controller.ts
│   ├── product-categories.service.ts
│   ├── product-categories.service.spec.ts
│   └── dto/
│       ├── create-category.dto.ts
│       └── category-query.dto.ts
└── products/
    └── dto/
        └── create-product.dto.ts  ← añadir productType, categoryId

apps/api/prisma/
└── migrations/
    ├── YYYYMMDD_add_product_type/       ← enum ProductType + columna en Product
    └── YYYYMMDD_create_product_categories/  ← tabla ProductCategory

# Frontend
apps/web/app/tenants/[slug]/(dashboard)/
├── settings/
│   └── categories/                      # Nueva pantalla Settings > Categorías
│       ├── page.tsx
│       ├── page.test.tsx
│       ├── categories-page-client.tsx
│       └── categories-page-client.test.tsx
└── inventory/
    ├── products/
    │   ├── page.tsx
    │   ├── page.test.tsx
    │   ├── products-page-client.tsx
    │   ├── products-page-client.test.tsx
    │   ├── product-drawer.tsx             # Sheet — crear y editar (incluye category combobox + productType)
    │   ├── product-drawer.test.tsx
    │   ├── product-form.tsx
    │   ├── product-form.test.tsx
    │   └── [id]/
    │       ├── page.tsx
    │       └── page.test.tsx
    ├── stock/
    │   ├── page.tsx
    │   ├── page.test.tsx
    │   ├── stock-page-client.tsx
    │   ├── stock-page-client.test.tsx
    │   ├── stock-adjust-drawer.tsx
    │   ├── stock-adjust-drawer.test.tsx
    │   ├── stock-config-drawer.tsx
    │   └── stock-config-drawer.test.tsx
    └── summary/
        ├── page.tsx
        ├── page.test.tsx
        ├── summary-page-client.tsx
        └── summary-page-client.test.tsx
```

**Convención de nombres**: sigue el patrón establecido en `patients/`, `receipts/`, `companies/`:
- `*-page-client.tsx` — Client Component con estado e interacciones
- `*-drawer.tsx` — modal/drawer de creación o edición
- `*-form.tsx` — formulario reutilizable dentro del drawer

## Constitution Check Post-Diseño

Sin nuevas violaciones introducidas en el diseño. La estructura de archivos sigue el patrón del proyecto. Los componentes son específicos de cada ruta hasta que aplique el criterio de 2+ pantallas.
