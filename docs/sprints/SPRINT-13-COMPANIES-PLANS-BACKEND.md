# Sprint 13 — Módulo 2: Empresas + Planes (Backend)

**Objective:** Implement full backend support for Companies and Plans following TDD methodology

**Status:** Planning
**Duration:** 1 sprint
**Dependencies:** Sprint 7 (Receipts) — `usedSessions++` logic must be verified

---

## 1. SCHEMA ANALYSIS & GAPS

### Current State (Prisma Schema)

```prisma
model Company {
  id            String   @id @default(uuid())
  tenantId      String
  name          String
  taxId         String?
  phone         String?
  email         String?
  address       String?
  contactPerson String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model Plan {
  id              String     @id @default(uuid())
  tenantId        String
  locationId      String
  patientId       String
  companyId       String?
  serviceTypeId   String?
  userId          String
  startDate       DateTime
  plannedSessions Int
  usedSessions    Int        @default(0)
  amount          Decimal    @db.Decimal(10, 2)
  status          PlanStatus @default(ACTIVE)
  notes           String?
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt

  receipts Receipt[]
}

enum PlanStatus {
  ACTIVE
  INACTIVE
  EXHAUSTED
}
```

### SUTR Reference (from MIGRATION_ACTION_ITEMS.md)

**empresas table:**
- `id` → UUID (new)
- `razon_social` → `name`
- `rfc` → `taxId`
- `telefono` → `phone`
- `email` → `email`
- `direccion` → `address`
- `persona_contacto` → `contactPerson`

**beneficios table:**
- `id` → UUID (new)
- `paciente_id` → `patientId`
- `empresa_id` → `companyId` (optional)
- `concepto_id` → `serviceTypeId` (optional)
- `sesiones_planeadas` → `plannedSessions`
- `sesiones_usadas` → `usedSessions`
- `monto` → `amount`
- `estatus` → `status` (1:ACTIVE, 2:INACTIVE, 3:EXHAUSTED)
- `fecha_inicio` → `startDate`
- `notas` → `notes`

### Verdict: ✅ SCHEMA IS COMPLETE

The current Prisma schema has all necessary fields for both Company and Plan. No migrations needed.

**Decisions to document:**
1. **locationId on Plan:** Required for sucursal-level access control (similar to ADR-001 for Receipts)
2. **One ACTIVE plan per patient+serviceType rule:** Must be enforced in service logic (not DB constraint)
3. **Plan.amount:** Represents total agreed amount (independent of usedSessions or receipt amounts)

---

## 2. DEPENDENCY CHECK: Sprint 7 (Receipts) Verification

**CRITICAL:** Verify that Receipts service already implements `usedSessions++` when `paymentType = 'BENEFIT'`.

**File:** `apps/api/src/receipts/receipts.service.ts` (lines 181–197)

**Status:** ✅ IMPLEMENTED

```typescript
// FR-004/FR-005: BENEFIT — increment plan sessions atomically
if (dto.paymentType === 'BENEFIT' && plan !== null) {
  const newUsedSessions = plan.usedSessions + 1;
  const isExhausted = newUsedSessions >= plan.plannedSessions;
  await (tx as unknown as { plan: { update: ... } }).plan.update({
    where: { id: plan.id },
    data: {
      usedSessions: { increment: 1 },
      ...(isExhausted && { status: 'EXHAUSTED' as PlanStatus }),
    },
  });
}
```

**Implications for Sprint 13:**
- When creating a Plan, do NOT check `usedSessions` (it's always 0)
- The Receipts service already handles plan exhaustion — Plan service does NOT need to worry about it
- Plan service validation: Ensure plan status is not already `EXHAUSTED` when attempting creation (defensive check)

---

## 3. ZOD SCHEMAS TO CREATE

**File:** `packages/types/src/companies-plans.schemas.ts` (new file)

### Companies Schemas

```typescript
export const CreateCompanySchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  taxId: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  contactPerson: z.string().optional(),
});

export const UpdateCompanySchema = z.object({
  name: z.string().optional(),
  taxId: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  contactPerson: z.string().optional(),
});

export const CompanyQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(), // Search by name or taxId
});

export const CompanyResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string(),
  taxId: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  address: z.string().nullable(),
  contactPerson: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const PaginatedCompaniesResponseSchema = z.object({
  data: z.array(CompanyResponseSchema),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
});

export type CreateCompanyDto = z.infer<typeof CreateCompanySchema>;
export type UpdateCompanyDto = z.infer<typeof UpdateCompanySchema>;
export type CompanyQuery = z.infer<typeof CompanyQuerySchema>;
export type CompanyResponse = z.infer<typeof CompanyResponseSchema>;
export type PaginatedCompaniesResponse = z.infer<typeof PaginatedCompaniesResponseSchema>;
```

### Plans Schemas

```typescript
export const CreatePlanSchema = z.object({
  patientId: z.string().uuid(),
  locationId: z.string().uuid().optional(), // Auto-filled for MANAGER/STAFF
  companyId: z.string().uuid().optional(),
  serviceTypeId: z.string().uuid().optional(),
  startDate: z.coerce.date(),
  plannedSessions: z.number().int().min(1, 'Sesiones debe ser > 0'),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  notes: z.string().optional(),
});

export const UpdatePlanSchema = z.object({
  companyId: z.string().uuid().optional(),
  serviceTypeId: z.string().uuid().optional(),
  startDate: z.coerce.date().optional(),
  plannedSessions: z.number().int().min(1).optional(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  status: PlanStatusSchema.optional(), // Only ACTIVE → INACTIVE allowed
  notes: z.string().optional(),
});

export const PlanQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  patientId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  status: PlanStatusSchema.optional(),
});

export const PlanResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  locationId: z.string().uuid(),
  patientId: z.string().uuid(),
  companyId: z.string().uuid().nullable(),
  serviceTypeId: z.string().uuid().nullable(),
  userId: z.string().uuid(),
  startDate: z.coerce.date(),
  plannedSessions: z.number().int(),
  usedSessions: z.number().int(),
  amount: z.string(),
  status: PlanStatusSchema,
  notes: z.string().nullable(),
  patientName: z.string(), // Enriched on read
  companyName: z.string().nullable(), // Enriched on read
  serviceTypeName: z.string().nullable(), // Enriched on read
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const PaginatedPlansResponseSchema = z.object({
  data: z.array(PlanResponseSchema),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
});

export type CreatePlanDto = z.infer<typeof CreatePlanSchema>;
export type UpdatePlanDto = z.infer<typeof UpdatePlanSchema>;
export type PlanQuery = z.infer<typeof PlanQuerySchema>;
export type PlanResponse = z.infer<typeof PlanResponseSchema>;
export type PaginatedPlansResponse = z.infer<typeof PaginatedPlansResponseSchema>;
```

**Key schema decisions:**
- `locationId` in CreatePlanSchema is optional (auto-filled by backend for MANAGER/STAFF, required for OWNER/ADMIN)
- `status` in UpdatePlanSchema is optional and restricted: only transitions to INACTIVE allowed (EXHAUSTED is automatic from Receipts)
- Responses include enriched data: `patientName`, `companyName`, `serviceTypeName`

---

## 4. NestJS MODULES STRUCTURE

Create two modules in `apps/api/src/`:

### Module 1: Companies

```
apps/api/src/companies/
├── companies.module.ts
├── companies.controller.ts
├── companies.service.ts
├── companies.service.spec.ts
└── dto/
    └── create-company.dto.ts
    └── update-company.dto.ts
```

### Module 2: Plans

```
apps/api/src/plans/
├── plans.module.ts
├── plans.controller.ts
├── plans.service.ts
├── plans.service.spec.ts
└── dto/
    └── create-plan.dto.ts
    └── update-plan.dto.ts
```

---

## 5. API ENDPOINTS CONTRACT

### Companies API

| Method | Path | Query/Body | Response | Status |
|---|---|---|---|---|
| **GET** | `/api/companies` | QuerySchema | PaginatedCompaniesResponse | 200 |
| **POST** | `/api/companies` | CreateCompanySchema | CompanyResponse | 201 |
| **GET** | `/api/companies/:id` | – | CompanyResponse | 200 |
| **PATCH** | `/api/companies/:id` | UpdateCompanySchema | CompanyResponse | 200 |
| **DELETE** | `/api/companies/:id` | – | – | 204 |

**Access Control:**
- All endpoints: `@UseGuards(JwtAuthGuard)` + `@CurrentUser()`
- OWNER/ADMIN: Full access
- MANAGER/STAFF: No access (throw ForbiddenException)

### Plans API

| Method | Path | Query/Body | Response | Status |
|---|---|---|---|---|
| **GET** | `/api/plans` | PlanQuerySchema | PaginatedPlansResponse | 200 |
| **POST** | `/api/plans` | CreatePlanSchema | PlanResponse | 201 |
| **GET** | `/api/plans/:id` | – | PlanResponse | 200 |
| **PATCH** | `/api/plans/:id` | UpdatePlanSchema | PlanResponse | 200 |
| **DELETE** | `/api/plans/:id` | – | – | 204 |

**Access Control:**
- All endpoints: `@UseGuards(JwtAuthGuard)` + `@CurrentUser()`
- OWNER/ADMIN: Full access to all plans in tenant
- MANAGER/STAFF: Only access plans from their `locationId`

---

## 6. BUSINESS RULES & VALIDATIONS

### Companies

1. **Unique name per tenant:** `{ tenantId, name }` should be unique (application-level validation)
2. **Email format:** If provided, must be valid email
3. **Soft delete:** DELETE should mark as soft-deleted (future: add `deletedAt` field to schema) OR hard delete only if no plans reference it
4. **Search:** `GET /api/companies?search=term` searches across `name` and `taxId`

### Plans

1. **locationId must be explicit:** Either from user (`MANAGER`/`STAFF`) or from DTO (`OWNER`/`ADMIN`)
2. **Patient must exist and belong to tenant + location:**
   ```typescript
   const patient = await this.prisma.patient.findFirst({
     where: { id: patientId, tenantId, locationId },
   });
   if (!patient) throw new NotFoundException('Patient not found');
   ```

3. **Company (if provided) must exist and belong to tenant:**
   ```typescript
   if (companyId !== undefined) {
     const company = await this.prisma.company.findFirst({
       where: { id: companyId, tenantId },
     });
     if (!company) throw new NotFoundException('Company not found');
   }
   ```

4. **ServiceType (if provided) must exist and belong to tenant:**
   ```typescript
   if (serviceTypeId !== undefined) {
     const serviceType = await this.prisma.serviceType.findFirst({
       where: { id: serviceTypeId, tenantId },
     });
     if (!serviceType) throw new NotFoundException('ServiceType not found');
   }
   ```

5. **Only one ACTIVE plan per (patientId, serviceTypeId) combination:**
   ```typescript
   if (status === 'ACTIVE' && serviceTypeId !== undefined) {
     const existing = await this.prisma.plan.findFirst({
       where: {
         patientId,
         serviceTypeId,
         status: 'ACTIVE',
         tenantId,
       },
     });
     if (existing) {
       throw new ConflictException(
         'Patient already has an ACTIVE plan for this service type',
       );
     }
   }
   ```

6. **Cannot update status from EXHAUSTED:** `EXHAUSTED` is terminal (set only by Receipts service)
   ```typescript
   if (current.status === 'EXHAUSTED') {
     throw new ConflictException('Cannot modify EXHAUSTED plan');
   }
   ```

7. **Cannot delete plan if usedSessions > 0:**
   ```typescript
   if (plan.usedSessions > 0) {
     throw new ConflictException(
       'Cannot delete plan with used sessions. Set status to INACTIVE instead.',
     );
   }
   ```

8. **plannedSessions must be > 0** (validation in schema)

9. **Audit logging:** All CREATE/UPDATE operations should log to AuditLog (fire-and-forget via interceptor)

---

## 7. TDD WORKFLOW — TEST PLAN

Follow **Red → Green → Refactor** strictly:

### Companies Service Unit Tests

**File:** `apps/api/src/companies/companies.service.spec.ts`

#### Describe: `CompaniesService`

1. **Describe: `create`**
   - ✅ should create company for tenant
   - ✅ should throw NotFoundException if user lacks permission (MANAGER/STAFF)
   - ✅ should enforce unique (tenantId, name) constraint
   - ✅ should accept optional fields (taxId, phone, email, etc.)

2. **Describe: `findAll`**
   - ✅ should return paginated companies for tenant
   - ✅ should filter by search term (name or taxId)
   - ✅ should respect pagination limits (max 100)
   - ✅ should return total count

3. **Describe: `findOne`**
   - ✅ should return single company by id
   - ✅ should throw NotFoundException if id doesn't exist
   - ✅ should throw NotFoundException if company belongs to different tenant

4. **Describe: `update`**
   - ✅ should update allowed fields
   - ✅ should throw NotFoundException if id not found
   - ✅ should throw ForbiddenException for MANAGER/STAFF
   - ✅ should enforce unique (tenantId, name) on update

5. **Describe: `delete`**
   - ✅ should delete company if no plans reference it
   - ✅ should throw ConflictException if plans exist for company
   - ✅ should throw NotFoundException if id not found
   - ✅ should throw ForbiddenException for MANAGER/STAFF

### Plans Service Unit Tests

**File:** `apps/api/src/plans/plans.service.spec.ts`

#### Describe: `PlansService`

1. **Describe: `create`**
   - ✅ should create plan for tenant
   - ✅ should auto-fill locationId from user if MANAGER/STAFF
   - ✅ should require locationId in DTO if OWNER/ADMIN
   - ✅ should throw NotFoundException if patient doesn't exist
   - ✅ should throw ForbiddenException if patient belongs to different location (MANAGER/STAFF)
   - ✅ should throw NotFoundException if company doesn't exist (when provided)
   - ✅ should throw NotFoundException if serviceType doesn't exist (when provided)
   - ✅ should throw ConflictException if ACTIVE plan exists for (patientId, serviceTypeId)
   - ✅ should initialize usedSessions to 0
   - ✅ should initialize status to ACTIVE
   - ✅ should set userId to current user

2. **Describe: `findAll`**
   - ✅ should return paginated plans for tenant
   - ✅ should filter by patientId
   - ✅ should filter by companyId
   - ✅ should filter by status
   - ✅ should respect MANAGER/STAFF locationId restriction
   - ✅ should include enriched data (patientName, companyName, serviceTypeName)

3. **Describe: `findOne`**
   - ✅ should return plan with enriched data
   - ✅ should throw NotFoundException if id not found
   - ✅ should throw NotFoundException if plan belongs to different location (MANAGER/STAFF)

4. **Describe: `update`**
   - ✅ should update allowed fields (companyId, serviceTypeId, startDate, plannedSessions, amount, notes)
   - ✅ should NOT allow direct usedSessions update
   - ✅ should allow status ACTIVE → INACTIVE transition
   - ✅ should throw ConflictException on invalid status transition (EXHAUSTED is terminal)
   - ✅ should throw ConflictException if setting to ACTIVE when another ACTIVE exists for (patientId, serviceTypeId)
   - ✅ should throw NotFoundException if id not found
   - ✅ should throw ForbiddenException for MANAGER/STAFF from different location

5. **Describe: `delete`**
   - ✅ should delete plan if usedSessions === 0
   - ✅ should throw ConflictException if usedSessions > 0
   - ✅ should throw NotFoundException if id not found
   - ✅ should throw ForbiddenException for MANAGER/STAFF from different location

### E2E Tests

**File:** `apps/api/test/companies-plans.e2e-spec.ts`

Cover full workflows:

1. **Companies flow**
   - Create company → List → Get → Update → Delete
   - Search by name/taxId
   - Soft/hard delete constraints

2. **Plans flow**
   - Create plan for patient
   - Create receipt with BENEFIT payment → usedSessions increments → plan status changes
   - List plans with filters
   - Update plan status
   - Cannot delete plan with usedSessions > 0

3. **RLS/Access control**
   - MANAGER can only see/edit their location's plans
   - STAFF same restrictions
   - OWNER/ADMIN see all

---

## 8. IMPLEMENTATION ORDER (Sequential)

### Phase 1: Zod Schemas (1–2 hours)

1. Create `packages/types/src/companies-plans.schemas.ts`
2. Export types in `packages/types/src/index.ts`
3. Run `pnpm check-types` to verify

**Checklist:**
- [ ] CreateCompanySchema, UpdateCompanySchema, queries, responses defined
- [ ] CreatePlanSchema, UpdatePlanSchema, queries, responses defined
- [ ] All types exported
- [ ] No TypeScript errors

### Phase 2: Companies Service (Unit Tests First) (3–4 hours)

**RED:** Write all unit tests in `companies.service.spec.ts` (tests will fail)

**GREEN:** Implement `CompaniesService`:
- Constructor: inject `PrismaService`
- `create()`: validate, insert, return response
- `findAll()`: paginate, filter, return list
- `findOne()`: fetch, throw if not found
- `update()`: fetch, validate transitions, update
- `delete()`: check if plans reference, delete or throw

**REFACTOR:** Extract helper functions, improve readability

**Checklist:**
- [ ] All unit tests pass
- [ ] `pnpm --filter api test` shows all passing
- [ ] No `any` types, all typed correctly

### Phase 3: Companies DTO & Controller (1–2 hours)

1. Create `companies/dto/create-company.dto.ts` (wrapper over CreateCompanySchema)
2. Create `companies/dto/update-company.dto.ts` (wrapper over UpdateCompanySchema)
3. Implement `CompaniesController`:
   - `@Post()` — create
   - `@Get()` — list
   - `@Get(':id')` — get one
   - `@Patch(':id')` — update
   - `@Delete(':id')` — delete
4. Create `companies.module.ts` and register in `app.module.ts`

**Checklist:**
- [ ] All DTOs created
- [ ] All controller methods implemented
- [ ] Module registered in AppModule
- [ ] `pnpm lint` passes

### Phase 4: Plans Service (Unit Tests First) (5–6 hours)

**RED:** Write all unit tests in `plans.service.spec.ts`

**GREEN:** Implement `PlansService`:
- Constructor: inject `PrismaService`
- `create()`: validate patient/company/serviceType, check 1-ACTIVE rule, insert
- `findAll()`: paginate, filter, apply RLS, enrich data
- `findOne()`: fetch, enrich, apply RLS
- `update()`: validate status transitions, update
- `delete()`: check usedSessions, delete

**REFACTOR:** Extract validation helpers, enrichment logic

**Checklist:**
- [ ] All unit tests pass
- [ ] Receipts integration verified (usedSessions flows through correctly)
- [ ] No `any` types

### Phase 5: Plans DTO & Controller (1–2 hours)

1. Create `plans/dto/create-plan.dto.ts`
2. Create `plans/dto/update-plan.dto.ts`
3. Implement `PlansController` (5 endpoints)
4. Create `plans.module.ts` and register

**Checklist:**
- [ ] All controller methods implemented
- [ ] Module registered
- [ ] `pnpm lint` passes

### Phase 6: E2E Tests (2–3 hours)

1. Create `apps/api/test/companies-plans.e2e-spec.ts`
2. Write comprehensive flows:
   - Create/list/get/update/delete companies
   - Create plan → receipt with BENEFIT → usedSessions increments
   - RLS validation

**Checklist:**
- [ ] E2E tests pass
- [ ] `pnpm --filter api test:e2e` all green

### Phase 7: Final Verification (1 hour)

Run the full validation suite:

```bash
pnpm lint
pnpm check-types
pnpm --filter api test
pnpm --filter api test:e2e
```

All must pass before marking Sprint complete.

---

## 9. CRITICAL DECISIONS & GOTCHAS

### Decision 1: locationId on Plan

**Status:** DECIDED (following ADR-001 Receipt pattern)

- **Plan.locationId is REQUIRED** (not optional in schema)
- **In CreatePlanSchema:** optional (auto-filled for MANAGER/STAFF, required for OWNER/ADMIN)
- **Rationale:** RLS control, folio independence, cash close aggregation per location

### Decision 2: One ACTIVE Plan per (patientId, serviceTypeId)

**Status:** DECIDED

- Enforced in service layer (application logic, not DB constraint)
- Allows multiple plans if serviceTypeId is NULL (general benefit plan)
- Rationale: Clarity for reporting, prevents accidental overbooking

### Decision 3: usedSessions Management

**Status:** DECIDED (Receipts service owns this)

- Plans service NEVER modifies usedSessions directly
- Receipts service increments usedSessions and manages status transitions
- Plans service is read-only on usedSessions

### Decision 4: Soft Delete vs Hard Delete for Companies

**Status:** PENDING (recommend hard delete with constraint)

- Current recommendation: Hard delete only if no plans reference it
- Future consideration: Add `deletedAt` field for soft delete
- For MVP: Throw ConflictException if plans exist

### Decision 5: Enrich Responses with Names

**Status:** DECIDED

- PlanResponse includes `patientName`, `companyName`, `serviceTypeName`
- Avoids N+1 queries: load related data via joins in findMany/findOne
- API client doesn't need to fetch relations separately

---

## 10. POTENTIAL ISSUES & MITIGATIONS

### Issue 1: Race Condition on "Only 1 ACTIVE per (patientId, serviceTypeId)"

**Scenario:** Two concurrent requests create plans for same patient+service type

**Mitigation:** Use database unique constraint or check-before-create in transaction:
```typescript
const existing = await tx.plan.findFirst({
  where: { patientId, serviceTypeId, status: 'ACTIVE', tenantId },
});
if (existing) {
  throw new ConflictException('...');
}
// then create
```

Transactions in NestJS: `await this.prisma.$transaction(async (tx) => { ... })`

### Issue 2: Plan Exhaustion Race Condition

**Scenario:** Two receipts submitted concurrently for last session

**Status:** Already handled by Receipts service using transactions. Plans service doesn't need to worry.

### Issue 3: locationId Mismatch Validation

**Scenario:** User submits locationId that differs from patient's locationId

**Mitigation:** Always validate:
```typescript
if (patient.locationId !== locationId) {
  throw new ConflictException('Patient location mismatch');
}
```

### Issue 4: Null Handling for Optional Relations

**Scenario:** companyId or serviceTypeId is null in responses

**Solution:** Use nullable types in schemas:
```typescript
companyId: z.string().uuid().nullable(),
companyName: z.string().nullable(),
```

---

## 11. DOCUMENTATION & ADRs

### ADR to Write

- **ADR-013-A:** One ACTIVE Plan per (patientId, serviceTypeId) Constraint
  - Why: Prevent accidental double-booking, clarity in reports
  - How: Application-level check at creation time

- **ADR-013-B:** locationId Explicit on Plan (similar to ADR-001 for Receipts)
  - Why: RLS control, cash close aggregation
  - How: Optional in DTO, auto-filled for MANAGER/STAFF

### Spec to Write

- **docs/specs/companies-plans.md:** Complete feature specification for Module 2
  - Data model overview
  - API contract
  - Business rules
  - Edge cases
  - Test coverage

---

## 12. VERIFICATION CHECKLIST

Before marking Sprint 13 as complete:

```bash
# Unit tests
pnpm --filter api test -- companies.service.spec.ts
pnpm --filter api test -- plans.service.spec.ts

# E2E tests
pnpm --filter api test:e2e -- companies-plans.e2e-spec.ts

# Full suite
pnpm lint
pnpm check-types
pnpm --filter api test
pnpm --filter api test:e2e

# Manual validation
curl -X GET http://localhost:3001/api/companies \
  -H "Authorization: Bearer <token>"
curl -X GET http://localhost:3001/api/plans \
  -H "Authorization: Bearer <token>"
```

All must be ✅ GREEN.

---

## 13. OPEN QUESTIONS (for clarification before implementation)

1. **Question:** Should Companies be soft-deleted or hard-deleted?
   - **Recommendation:** Hard delete with FK constraint for MVP. Future: add `deletedAt` field.
   - **Decision needed from:** Product

2. **Question:** Is Plan.amount independent of actual receipt amounts?
   - **Recommendation:** Yes, it's just a budget/agreed amount. Not aggregated from receipts.
   - **Confirmation status:** Assumed based on SUTR schema.

3. **Question:** Should Plans be searchable/filterable?
   - **Recommendation:** Yes, by patientId, companyId, status (query params).
   - **Confirmation status:** Included in spec above.

4. **Question:** Should Plan allow multiple ACTIVE plans if no serviceTypeId?
   - **Recommendation:** Yes. The unique constraint only applies when serviceTypeId is NOT NULL.
   - **Confirmation status:** Assumed (general benefit plans should be allowed).

---

## 14. SUCCESS CRITERIA

Sprint 13 is **DONE** when:

1. ✅ All Zod schemas defined in `@repo/types` and exported
2. ✅ CompaniesService fully tested (unit tests all green)
3. ✅ CompaniesController fully implemented with RLS
4. ✅ PlansService fully tested (unit tests all green)
5. ✅ PlansController fully implemented with RLS
6. ✅ E2E tests validate full workflows (create→read→update→delete)
7. ✅ E2E test validates Receipts integration (BENEFIT payment increments usedSessions)
8. ✅ `pnpm lint` passes
9. ✅ `pnpm check-types` passes
10. ✅ `pnpm --filter api test` all green
11. ✅ `pnpm --filter api test:e2e` all green
12. ✅ ADRs written and committed
13. ✅ Feature spec written and committed

---

## Appendix A: File Checklist

**Create these files:**

```
packages/types/src/
  └── companies-plans.schemas.ts (new)

apps/api/src/companies/
  ├── companies.module.ts (new)
  ├── companies.controller.ts (new)
  ├── companies.service.ts (new)
  ├── companies.service.spec.ts (new)
  └── dto/
      ├── create-company.dto.ts (new)
      └── update-company.dto.ts (new)

apps/api/src/plans/
  ├── plans.module.ts (new)
  ├── plans.controller.ts (new)
  ├── plans.service.ts (new)
  ├── plans.service.spec.ts (new)
  └── dto/
      ├── create-plan.dto.ts (new)
      └── update-plan.dto.ts (new)

apps/api/test/
  └── companies-plans.e2e-spec.ts (new)

docs/decisions/
  ├── ADR-013-A-active-plan-constraint.md (new)
  └── ADR-013-B-plan-locationid-explicit.md (new)

docs/specs/
  └── companies-plans.md (new)

packages/types/src/
  └── index.ts (update exports)

apps/api/src/
  └── app.module.ts (register CompaniesModule, PlansModule)
```

**Modify these files:**

```
packages/types/src/index.ts          — add exports for companies-plans schemas
apps/api/src/app.module.ts           — import CompaniesModule, PlansModule
```

---

## Appendix B: Quick Reference — RLS Implementation

All endpoints must filter by tenantId + locationId (for MANAGER/STAFF):

```typescript
// Example from PlanController
async findAll(
  @Query() query: PlanQuerySchema,
  @CurrentUser() user: { tenantId: string; locationId: string | null },
) {
  return this.plansService.findAll(
    user.tenantId,
    user.locationId,  // null for OWNER/ADMIN, set for MANAGER/STAFF
    query,
  );
}

// In PlansService.findAll:
async findAll(
  tenantId: string,
  userLocationId: string | null,
  query: Partial<PlanQuery>,
) {
  const where = {
    tenantId,
    ...(userLocationId !== null && { locationId: userLocationId }),
    ...(query.patientId !== undefined && { patientId: query.patientId }),
    ...(query.companyId !== undefined && { companyId: query.companyId }),
    ...(query.status !== undefined && { status: query.status }),
  };

  return this.prisma.plan.findMany({
    where,
    include: {
      patient: true,
      company: true,
      // Don't include full relations in response, just extract names
    },
  });
}
```

---

**Generated:** 2026-03-22
**Version:** 1.0
**Status:** READY FOR IMPLEMENTATION
