# Renalfy Constitution

## Core Principles

### I. Multi-Tenant by Design (NON-NEGOTIABLE)

Every feature must respect tenant boundaries at all times:

- Every business table carries `tenantId` — no exceptions
- Application layer filters by `tenantId` in every query (first line of defense)
- PostgreSQL RLS enforces isolation at the database level (defense in depth)
- `tenantId` always comes from the JWT payload — never from the request body
- `MANAGER` / `STAFF` additionally filter by `locationId` — enforced in the backend, never the frontend
- Cross-tenant data access is forbidden by architecture; any code that could leak data across tenants must be rejected

### II. Schema-First — @repo/types as Single Source of Truth

Every new resource starts with its Zod schemas in `packages/types/` before any backend or frontend code is written:

- Schemas define DTOs, response shapes, and enums
- Backend DTOs extend `createZodDto(Schema)` from `nestjs-zod` — `class-validator` is not used
- Frontend forms use `zodResolver(Schema)` from `@hookform/resolvers/zod`
- Frontend API response parsing uses `Schema.parse()` — never unchecked `JSON.parse()`
- `export default` is prohibited — named exports only

### III. Test-First (NON-NEGOTIABLE)

All production code is written in response to a failing test — Red → Green → Refactor:

1. **Red** — write the test first; it must fail because the feature does not exist
2. **Green** — write the minimum code to make the test pass
3. **Refactor** — clean up without breaking tests

A feature is **not done** until all three gates pass:

```
pnpm lint          # zero errors, zero warnings
pnpm check-types   # zero TypeScript errors
pnpm test          # all tests green
```

Backend: unit tests per service (`.spec.ts`) + E2E tests in `apps/api/test/`.
Frontend: component tests with Vitest + React Testing Library.
Prisma mocks use plain objects implementing the service interface — no mock libraries.

### IV. Regulatory Compliance — Mexican Health Law

Every feature touching patient data must satisfy:

- **LFPDPPP**: explicit patient consent (`PatientConsent` row with `revokedAt IS NULL`) is required before creating `Appointment` or `Measurement` records
- **NOM-004-SSA3**: clinical records are immutable once created — corrections are new records referencing the previous one; records retained minimum 5 years
- **NOM-024-SSA3**: clinical data shared only within the same tenant; exported reports include tenant watermark
- **AuditLog**: every creation, modification, and access to clinical data is logged; `AuditLog` has INSERT/SELECT only (no UPDATE/DELETE) via RLS
- **AI / PHI Zero-Data Rule**: identifiable patient data (name, CURP, DOB) must never be sent to external AI APIs; pseudoanonymize using UUID + aggregated clinical data only

### V. Security First

- Two database users: `renalfy` (migrations, BYPASSRLS) and `renalfy_app` (runtime, subject to RLS)
- `tenantId` extracted from JWT by `JwtAuthGuard`; set in PostgreSQL session by `TenantInterceptor` before every query
- Session context cleaned by `TenantInterceptor` after every request (prevents connection-pool leakage)
- Secrets live in environment variables — never committed to the repository
- All endpoints touching sensitive data decorated with `@Audit()`

### VI. Simplicity and Modularity

- One NestJS module per business resource: controller + service + `dto/` folder
- Functions do one thing; maximum 10 lines; maximum 3 parameters (group into DTO if more needed)
- No `any` — ESLint is configured as `error`; use `unknown` + narrowing
- No magic numbers — extract named constants
- No premature abstractions — build for current requirements only
- **Design System rule**: a UI component moves into `@repo/ui/domain/` only when it is needed in two or more distinct screens — not before. Primitive components (Button, Input, Table…) live in `@repo/ui/primitives/` from the start via shadcn/ui.
- Google TypeScript Style Guide is the coding standard

## Architecture Constraints

| Layer | Technology | Version |
|---|---|---|
| Frontend | Next.js App Router + TypeScript | 16 |
| Styles | Tailwind CSS v4 + shadcn/ui | 4 |
| Backend | NestJS + TypeScript | latest |
| ORM | Prisma | 7 |
| Database | PostgreSQL | 16 |
| Auth | JWT access 15 min + refresh 7 d | — |
| Monorepo | Turborepo + pnpm workspaces | — |

- **API prefix**: all endpoints are `/api/...`
- **Local ports**: web `:4000`, api `:4001`
- **Subdomains**: `{slug}.renalfy.app` routes requests to the correct tenant
- **Prisma 7**: `PrismaClient` is not extendable — use composition in `PrismaService`; generated client at `apps/api/generated/prisma/`
- **ESM imports in NestJS**: local imports must include `.js` extension even for `.ts` files

## Development Workflow

1. Create / update Zod schemas in `@repo/types` for the new resource
2. Run `pnpm generate` to regenerate Prisma client after schema changes
3. Write failing tests (unit + E2E)
4. Implement the minimum code to pass tests
5. Refactor
6. Run `pnpm lint && pnpm check-types && pnpm test` — all must pass before opening a PR

## Governance

This constitution supersedes all ad-hoc decisions. Any amendment requires:

1. A description of what is changing and why
2. A migration plan for existing code that does not comply
3. Update to this file and to `CLAUDE.md`

All code reviews must verify compliance with principles I–VI above.
Complexity beyond what is strictly required must be justified.
Use `CLAUDE.md` for runtime development guidance and detailed conventions.

**Version**: 1.0.0 | **Ratified**: 2026-03-18 | **Last Amended**: 2026-03-18
