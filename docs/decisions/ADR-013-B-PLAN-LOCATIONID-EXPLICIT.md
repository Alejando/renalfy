# ADR-013-B: Maintain Explicit `locationId` on Plan

**Date:** 2026-03-22
**Status:** Accepted
**Author:** Architect

---

## Context

In the Plans module, the question arises: **Is `Plan.locationId` redundant?**

A Plan always references a Patient, and a Patient has a fixed `locationId`. The naive assumption: derive Plan's location from Patient, eliminating a column.

However, this ignores critical architectural constraints.

---

## Decision

**Maintain `Plan.locationId` as an explicit, required field in the Prisma schema.**

This mirrors ADR-001 (Receipt.locationId) and follows the same rationale.

### Implementation

**In CreatePlanSchema (Zod):**

```typescript
export const CreatePlanSchema = z.object({
  patientId: z.string().uuid(),
  locationId: z.string().uuid().optional(),  // Optional in DTO
  // ... other fields ...
});
```

**In PlansController:**

```typescript
async create(
  @Body() dto: CreatePlanDto,
  @CurrentUser() user: { tenantId: string; locationId: string | null },
) {
  return this.plansService.create(
    dto,
    user.tenantId,
    user.id,
    user.locationId,  // Pass user's location
  );
}
```

**In PlansService.create():**

```typescript
async create(
  dto: CreatePlanDto,
  tenantId: string,
  userId: string,
  userLocationId: string | null,
): Promise<PlanResponse> {
  // For MANAGER/STAFF: auto-fill locationId from user
  const locationId = userLocationId ?? dto.locationId;
  if (!locationId) {
    throw new BadRequestException(
      'locationId is required for OWNER/ADMIN role',
    );
  }

  // Fetch patient and validate location match
  const patient = await this.prisma.patient.findFirst({
    where: { id: dto.patientId, tenantId, locationId },
  });
  if (!patient) {
    throw new NotFoundException('Patient not found or not in this location');
  }

  // Create plan with explicit locationId
  const plan = await this.prisma.plan.create({
    data: {
      tenantId,
      locationId,  // Explicit
      patientId: dto.patientId,
      userId,
      // ... other fields ...
    },
  });

  return this.toResponse(plan);
}
```

---

## Rationale

### 1. **Row-Level Security (RLS) by Location**

MANAGER and STAFF users have location-scoped access:

```typescript
// In PlansController.findAll
async findAll(
  @Query() query: PlanQuerySchema,
  @CurrentUser() user: { tenantId: string; locationId: string | null },
) {
  return this.plansService.findAll(
    user.tenantId,
    user.locationId,  // Passed to service
    query,
  );
}

// In PlansService.findAll
async findAll(
  tenantId: string,
  userLocationId: string | null,
  query: Partial<PlanQuery>,
): Promise<PaginatedPlansResponse> {
  const where = {
    tenantId,
    ...(userLocationId !== null && { locationId: userLocationId }),
    // other filters
  };
  return this.prisma.plan.findMany({ where, ... });
}
```

**Problem:** If locationId were derived from Patient, the validation would be:

```typescript
const patient = await this.prisma.patient.findFirst({
  where: { id: patientId, tenantId },  // NO location check
});
const locationId = patient.locationId;  // Derived

// Can a MANAGER from Location A access Patient from Location B?
// The filter below never executes because locationId is already determined
if (userLocationId !== null && locationId !== userLocationId) {
  throw new ForbiddenException(...);  // NEVER REACHED
}
```

**Result:** A MANAGER from Sucursal A could create plans for patients in Sucursal B. **Critical security flaw.**

With explicit locationId in the DTO, the validation is unavoidable:

```typescript
const locationId = userLocationId ?? dto.locationId;
if (userLocationId !== null && locationId !== userLocationId) {
  throw new ForbiddenException('Not authorized for this location');
}
```

### 2. **Cash Close Aggregation by Location**

CashClose is location-specific:

```typescript
export interface CashClose {
  tenantId: string;
  locationId: string;
  periodStart: DateTime;
  periodEnd: DateTime;
  // ... totals ...
}
```

When calculating plan-related totals for a cash close:

```sql
SELECT COUNT(*) as plans_with_sessions
FROM plan
WHERE tenantId = $1 AND locationId = $2 AND DATE(startDate) BETWEEN $3 AND $4
```

If locationId were derived, this query becomes:

```sql
SELECT COUNT(*) as plans_with_sessions
FROM plan p
JOIN patient pt ON pt.id = p.patientId
WHERE p.tenantId = $1 AND pt.locationId = $2 AND DATE(p.startDate) BETWEEN $3 AND $4
```

The derived approach requires an extra JOIN. More latency, more complex. With explicit locationId, it's a simple index scan.

### 3. **Data Consistency During Patient Transfer**

Future scenario: A patient is transferred between locations (e.g., moves to a new clinic branch).

- **Derived approach:** Plan.locationId would implicitly change when Patient.locationId changes. Silent side effect.
- **Explicit approach:** Plan.locationId is independent. Transfer requires explicit plan migration logic (future feature).

Explicit is safer: no silent changes.

### 4. **Historical Accuracy**

A Plan records "this service was delivered/planned at Location X on Date Y". This is historical fact, not derivative.

If a patient later moves to Location Z, the historical plan should still reflect Location X. Explicit locationId preserves this.

### 5. **Flexibility for Future Cases**

Future enhancements:
- Patient temporarily attending a different location (cross-location session)
- Telehealth plans (no location, or virtual location)
- Plan coverage negotiated at org level, applied to multiple locations

Explicit locationId provides the foundation for these without schema changes.

---

## Alternatives Considered

### A. Derive locationId from Patient

**Pros:**
- One fewer column
- Slightly smaller table

**Cons:**
- Breaks RLS enforcement (critical security issue)
- Requires JOIN for cash close queries
- Silent changes on patient transfer
- Inflexible for future cases

**Rejected:** Security risk outweighs storage savings.

### B. Allow locationId to Differ from Patient

**Option:** Let locationId be independent (even if Patient is in Location A, Plan can reference Location B).

**Pros:**
- Maximum flexibility

**Cons:**
- Confusing: which location is "responsible" for the patient?
- Reports become ambiguous
- Complicates RLS rules

**Rejected:** Not chosen. We enforce `plan.locationId === patient.locationId` at creation time.

### C. Use PostgreSQL RLS Policy to Enforce

**Option:** Create a DB-level CHECK constraint:

```sql
ALTER TABLE plan
ADD CONSTRAINT plan_location_matches_patient
CHECK (locationId = (SELECT locationId FROM patient WHERE id = patientId));
```

**Pros:**
- Enforced at DB level

**Cons:**
- Migrations become complex
- Application must also validate (RLS can't be sole source of truth)
- Harder to update tests

**Chosen:** Application-level validation (can add DB constraint later if needed).

---

## Consequences

### 1. **API/DTO**

- `CreatePlanSchema.locationId` is optional (backend fills it)
- Controller maps user role to auto-fill behavior

### 2. **Service Layer**

- Always validate: `plan.locationId === patient.locationId`
- Always validate: `user.locationId === null OR user.locationId === plan.locationId`

### 3. **Responses**

- All Plan responses include `locationId`
- Frontend/clients can display location info without additional queries

### 4. **Queries & Indexes**

- Index on `(tenantId, locationId)` for fast location-scoped filters
- Cash close queries become simple index scans

### 5. **Migration (SUTR → Renalfy)**

- Load SUTR beneficio records
- For each: fetch related paciente, extract locationId
- Set plan.locationId = paciente.locationId
- Validate 1:1 match (should always be true in SUTR)

### 6. **Tests**

- Unit test: MANAGER can't create plan in another location
- E2E test: Verify RLS enforcement

---

## Links

- **Related ADR:** ADR-001 (Receipt.locationId Explicit)
- **Spec:** `docs/specs/companies-plans.md`
- **Implementation:** `apps/api/src/plans/plans.service.ts`
- **Schema:** `apps/api/prisma/schema.prisma` (Plan model)

---

## Q&A

**Q: Can a patient in Location A have a plan for Location B?**

A: No. Validation enforces `plan.locationId === patient.locationId`. If a patient needs to be served in multiple locations, they're separate Patient records per location.

**Q: Does locationId make plans non-portable between locations?**

A: Yes, intentionally. A plan is location-specific. Transferring a patient to another location requires creating a new plan in that location (or archiving the old one).

**Q: Why not derive it and save the column?**

A: See Rationale #1: RLS would be broken. Security > storage.

---

**Accepted:** 2026-03-22
