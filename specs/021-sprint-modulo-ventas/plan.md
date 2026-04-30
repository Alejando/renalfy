# Implementation Plan: Sprint 21 — Módulo 4: Ventas (Backend)

**Branch**: `021-sprint-modulo-ventas` | **Date**: 2026-04-29 | **Spec**: `specs/021-sprint-modulo-ventas/spec.md`
**Input**: Sprint 21 backend (Module 4: Sales). Implement sales transactions, income/expense tracking, daily cash close with state machine + RLS.

## Summary

Sprint 21 implements the backend for the Sales module (Módulo 4, Part 1/2). Provides administrators and managers with the ability to: (1) register and track sales with automatic inventory deduction and folio generation, (2) record cash inflows (income) and outflows (expenses) categorized by type, (3) close daily/periodic cash registers with state machine enforcement and audit trail. All operations enforce multi-tenant isolation (RLS), role-based access (MANAGER+), and location-based filtering.

## Technical Context

**Language/Version**: TypeScript 5.3, Node.js 25, NestJS 11 (backend)  
**Primary Dependencies**: NestJS 11, Prisma 7, PostgreSQL 16, nestjs-zod, @repo/types (Zod schemas)  
**Storage**: PostgreSQL 16 with Row-Level Security (RLS) — 5 new tables: `Sale`, `SaleItem`, `Income`, `Expense`, `CashClose`  
**Testing**: Jest (unit tests per service `.spec.ts`) + E2E tests in `apps/api/test/` with real test DB  
**Target Platform**: Backend REST API on Node.js (Linux, containerized via Docker on Render)  
**Project Type**: NestJS REST API (monorepo backend module)  
**Performance Goals**: <500ms per endpoint, <1s for cash close with 1000+ records, <200ms folio generation (atomic)  
**Constraints**: Multi-tenant isolation (tenantId in JWT), RLS at DB level, immutable CashClose (no UPDATE/DELETE once CLOSED), atomic folio + stock deduction, concurrency-safe with Prisma transactions  
**Scale/Scope**: 5 new NestJS modules (Sales, Income, Expense, CashClose, SaleItem), ~40-50 unit tests, ~15 E2E tests, ~400-500 lines per service

## Constitution Check

✅ **PASS** — All constitution principles satisfied:

- **I. Multi-Tenant**: `Sale`, `Income`, `Expense`, `CashClose` all include `tenantId`; RLS enforced at DB level
- **II. Schema-First**: Zod schemas created in `@repo/types` before implementation (Phase 1)
- **III. Test-First**: TDD workflow (Red → Green → Refactor) — 40-50 unit tests + 15 E2E tests planned
- **IV. Regulatory**: No patient data touched; `AuditLog` integration for transaction trails
- **V. Security**: JWT `tenantId` enforcement, RLS policies, `TenantInterceptor` context management
- **VI. Simplicity**: One NestJS module per resource (Sales, Income, Expense, CashClose); no premature abstractions

No violations. No justifications needed.

## Project Structure

### Documentation (this feature)

```text
specs/021-sprint-modulo-ventas/
├── plan.md                          # This file
├── research.md                      # Phase 0: Research findings
├── data-model.md                    # Phase 1: Entity definitions and relationships
├── quickstart.md                    # Phase 1: Developer quick start guide
└── tasks.md                         # Phase 2: Actionable implementation tasks
```

### Source Code (NestJS monorepo structure)

```text
apps/api/src/
├── app.module.ts                    # Module registration for Sales, Income, Expense, CashClose
├── sales/
│   ├── sales.controller.ts          # REST endpoints: POST /api/sales, GET /api/sales/:id
│   ├── sales.service.ts             # Business logic: folio generation, inventory deduction, atomic transactions
│   ├── sales.spec.ts                # Unit tests (40-50 tests)
│   └── dto/
│       ├── create-sale.dto.ts       # CreateSaleDto from @repo/types
│       └── sale-response.dto.ts     # SaleResponseDto from @repo/types
├── sale-item/
│   ├── sale-item.service.ts         # Line item persistence (no separate controller)
│   └── sale-item.spec.ts
├── income/
│   ├── income.controller.ts         # REST endpoints: POST /api/income, GET /api/income
│   ├── income.service.ts            # Income recording logic
│   ├── income.spec.ts               # Unit tests
│   └── dto/
│       ├── create-income.dto.ts
│       └── income-response.dto.ts
├── expense/
│   ├── expense.controller.ts        # REST endpoints: POST /api/expense, GET /api/expense
│   ├── expense.service.ts           # Expense recording logic
│   ├── expense.spec.ts              # Unit tests
│   └── dto/
│       ├── create-expense.dto.ts
│       └── expense-response.dto.ts
├── cash-close/
│   ├── cash-close.controller.ts     # REST endpoints: POST /api/cash-close, GET /api/cash-close/:id
│   ├── cash-close.service.ts        # Close logic: aggregation, state machine, immutability enforcement
│   ├── cash-close.spec.ts           # Unit tests
│   └── dto/
│       ├── create-cash-close.dto.ts
│       └── cash-close-response.dto.ts

apps/api/test/
├── sales.e2e.spec.ts                # E2E: sale creation, folio generation, inventory impact
├── income-expense.e2e.spec.ts       # E2E: income/expense CRUD, filtering
├── cash-close.e2e.spec.ts           # E2E: close workflow, immutability, concurrency conflicts

packages/types/src/
├── sales.schemas.ts                 # Zod: CreateSaleSchema, SaleResponseSchema, SaleItemSchema
├── income.schemas.ts                # Zod: CreateIncomeSchema, IncomeResponseSchema
├── expense.schemas.ts               # Zod: CreateExpenseSchema, ExpenseResponseSchema
├── cash-close.schemas.ts            # Zod: CreateCashCloseSchema, CashCloseResponseSchema
└── enums.ts                         # z.enum for PaymentType, IncomeType, ExpenseType, CashCloseStatus, SaleStatus
```

## Complexity Tracking

None. All constraints align with constitution principles. No violations requiring justification.
