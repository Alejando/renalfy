# Sprint 13 — Quick Reference

**Module 2: Companies + Plans (Backend)**

---

## Schema Status

| Entity | Status | Fields | Notes |
|---|---|---|---|
| Company | ✅ Complete | id, tenantId, name, taxId, phone, email, address, contactPerson, createdAt, updatedAt | No migration needed |
| Plan | ✅ Complete | id, tenantId, locationId, patientId, companyId, serviceTypeId, userId, startDate, plannedSessions, usedSessions, amount, status, notes, createdAt, updatedAt | No migration needed |

---

## Zod Schemas to Create

**File:** `packages/types/src/companies-plans.schemas.ts`

- `CreateCompanySchema` → `CreateCompanyDto`
- `UpdateCompanySchema` → `UpdateCompanyDto`
- `CompanyQuerySchema` → `CompanyQuery`
- `CompanyResponseSchema` → `CompanyResponse`
- `PaginatedCompaniesResponseSchema` → `PaginatedCompaniesResponse`
- `CreatePlanSchema` → `CreatePlanDto`
- `UpdatePlanSchema` → `UpdatePlanDto`
- `PlanQuerySchema` → `PlanQuery`
- `PlanResponseSchema` → `PlanResponse` (includes patientName, companyName, serviceTypeName)
- `PaginatedPlansResponseSchema` → `PaginatedPlansResponse`

---

## NestJS Modules

### Companies Module

```
src/companies/
├── companies.module.ts
├── companies.controller.ts
├── companies.service.ts
├── companies.service.spec.ts
└── dto/
    ├── create-company.dto.ts
    └── update-company.dto.ts
```

**Endpoints:**
- `GET /api/companies` — list (paginated, searchable)
- `POST /api/companies` — create
- `GET /api/companies/:id` — detail
- `PATCH /api/companies/:id` — update
- `DELETE /api/companies/:id` — delete (only if no plans)

**Access:** OWNER/ADMIN only

### Plans Module

```
src/plans/
├── plans.module.ts
├── plans.controller.ts
├── plans.service.ts
├── plans.service.spec.ts
└── dto/
    ├── create-plan.dto.ts
    └── update-plan.dto.ts
```

**Endpoints:**
- `GET /api/plans` — list (paginated, filterable by patientId/companyId/status)
- `POST /api/plans` — create
- `GET /api/plans/:id` — detail
- `PATCH /api/plans/:id` — update (status transitions, fields)
- `DELETE /api/plans/:id` — delete (only if usedSessions === 0)

**Access:** All roles (MANAGER/STAFF see only their location)

---

## Key Business Rules

### Companies
1. Unique `{ tenantId, name }` (app-level check)
2. Optional email validation
3. Hard delete only if no plans reference it

### Plans
1. **locationId REQUIRED** (explicit field, not derived from patient)
   - Auto-filled from user for MANAGER/STAFF
   - Required in DTO for OWNER/ADMIN
2. **Patient validation:** Must exist + belong to tenantId + locationId
3. **Company validation:** If provided, must exist + belong to tenantId
4. **ServiceType validation:** If provided, must exist + belong to tenantId
5. **Only 1 ACTIVE plan per (patientId, serviceTypeId)** — unless serviceTypeId is null
6. **Cannot modify EXHAUSTED status** — terminal state
7. **Cannot delete if usedSessions > 0** — use INACTIVE instead
8. **usedSessions is read-only** — managed by Receipts service

---

## Receipts Integration

**Already implemented in Sprint 7:**

When creating Receipt with `paymentType === 'BENEFIT'`:
1. Fetch Plan by planId
2. Increment `usedSessions`
3. If `usedSessions >= plannedSessions`, set status to `EXHAUSTED`
4. Done in atomic transaction

**Plans service must:**
- Never directly modify `usedSessions`
- Read it for display
- Assume it's updated by Receipts service

---

## TDD Order

1. **Schemas first** → export in `@repo/types`
2. **Companies service unit tests** (RED) → implementation (GREEN) → refactor
3. **Companies DTO + controller**
4. **Plans service unit tests** (RED) → implementation (GREEN) → refactor
5. **Plans DTO + controller**
6. **E2E tests** (full workflows)
7. **Verify:** lint + check-types + test + test:e2e

---

## Critical Decisions

| Decision | Status |
|---|---|
| locationId explicit on Plan | ✅ DECIDED (like ADR-001 Receipts) |
| Only 1 ACTIVE plan per (patientId, serviceTypeId) | ✅ DECIDED |
| usedSessions managed by Receipts | ✅ DECIDED |
| Company hard delete with constraint | ✅ DECIDED (MVP) |
| Enrich responses with names | ✅ DECIDED |

---

## RLS Pattern

```typescript
// In controller
@CurrentUser() user: { tenantId: string; locationId: string | null }

// In service
async findAll(tenantId: string, userLocationId: string | null, query) {
  const where = {
    tenantId,
    ...(userLocationId !== null && { locationId: userLocationId }),
    ...query,
  };
  return this.prisma.plan.findMany({ where, ... });
}
```

---

## Test Coverage

### Companies Service
- `create`: Permission check, unique name, optional fields
- `findAll`: Pagination, search by name/taxId
- `findOne`: Fetch, 404 handling
- `update`: Field updates, unique name validation
- `delete`: FK constraint check

### Plans Service
- `create`: Patient/company/serviceType validation, 1-ACTIVE rule, locationId handling
- `findAll`: Pagination, filters (patientId, companyId, status), RLS
- `findOne`: Fetch, enrichment, 404 handling
- `update`: Status transitions, field updates, no usedSessions direct edit
- `delete`: usedSessions > 0 check

### E2E
- Full company CRUD
- Full plan CRUD
- Receipt with BENEFIT → usedSessions increment
- RLS validation (MANAGER sees only their location)

---

## Files to Create/Modify

**Create:**
- `packages/types/src/companies-plans.schemas.ts`
- `apps/api/src/companies/` (module + controller + service + tests + DTOs)
- `apps/api/src/plans/` (module + controller + service + tests + DTOs)
- `apps/api/test/companies-plans.e2e-spec.ts`
- `docs/decisions/ADR-013-*.md` (2 ADRs)
- `docs/specs/companies-plans.md`

**Modify:**
- `packages/types/src/index.ts` — add exports
- `apps/api/src/app.module.ts` — register modules

---

## Success Criteria

✅ All unit tests pass
✅ All E2E tests pass
✅ pnpm lint passes
✅ pnpm check-types passes
✅ ADRs written
✅ Spec written

---

Generated: 2026-03-22
