# ADR-013-A: Only One ACTIVE Plan per (patientId, serviceTypeId)

**Date:** 2026-03-22
**Status:** Accepted
**Author:** Architect

---

## Context

In Module 2 (Plans), the question arises: **Can a patient have multiple ACTIVE plans for the same service type?**

The SUTR system allowed multiple simultaneous benefit plans per patient without explicit constraints. However, Renalfy's design philosophy emphasizes clarity and prevents data ambiguity.

### Problem Statement

If a patient can have multiple ACTIVE plans for the same service type (e.g., two dialysis plans), then:

1. **Reporting ambiguity:** When creating a receipt with `paymentType = BENEFIT`, which plan should get the session deducted?
2. **UI confusion:** The frontend doesn't know which plan to display or recommend
3. **Migration risk:** SUTR data may contain duplicates that violate business logic
4. **Future maintenance:** Code must handle "pick one of many ACTIVE plans" — complex state

---

## Decision

**Enforce a unique constraint: A patient can have at most one ACTIVE plan per `serviceTypeId`.**

### Implementation

Application-level validation in `PlansService.create()`:

```typescript
async create(
  dto: CreatePlanDto,
  tenantId: string,
  userId: string,
  userLocationId: string | null,
): Promise<PlanResponse> {
  // ... other validations ...

  // Check: if status === ACTIVE and serviceTypeId is provided,
  // no other ACTIVE plan should exist for this (patientId, serviceTypeId)
  if (dto.status === 'ACTIVE' && dto.serviceTypeId !== undefined) {
    const existing = await this.prisma.plan.findFirst({
      where: {
        patientId: dto.patientId,
        serviceTypeId: dto.serviceTypeId,
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

  // Create the plan...
}
```

### Edge Case: Multiple ACTIVE Plans with NULL serviceTypeId

**Allowed:** A patient can have:
- One ACTIVE plan with `serviceTypeId = dialysis`
- One ACTIVE plan with `serviceTypeId = NULL` (general benefit)
- And they coexist peacefully

This is intentional: a "general benefit" plan (no service type attached) is independent and not in conflict with typed plans.

---

## Rationale

### 1. **Clarity in Receipt Processing**

When a user creates a receipt with `paymentType = BENEFIT` for a patient:

```typescript
// In ReceiptsService.create
const plan = await this.prisma.plan.findFirst({
  where: {
    patientId,
    status: 'ACTIVE',
    tenantId,
    // If serviceTypeId is provided from receipt, match it
    ...(serviceTypeId !== undefined && { serviceTypeId }),
  },
});
```

If a patient had two ACTIVE plans for the same serviceType, this query would return the first one (indeterminate). The business logic becomes unclear: **which plan was intended?**

With the constraint, the query is deterministic.

### 2. **Data Integrity & Reporting**

In reports and cash close operations, queries like:

```sql
SELECT SUM(usedSessions) FROM plan
WHERE patientId = ? AND status = 'ACTIVE' AND serviceTypeId = 'dialysis'
```

Should return at most one plan. Multiple plans = ambiguity in reporting.

### 3. **User Experience**

A MANAGER looking at a patient's plans should see:
- One ACTIVE dialysis plan
- Zero or one INACTIVE dialysis plans (archived history)
- Clear state, no confusion

If multiple ACTIVE plans existed, the UI would need logic like "show all ACTIVE plans" or "pick one to deduct from" — poor UX.

### 4. **Migration Safety**

SUTR data may contain duplicate benefit plans. Rather than silently allowing this duplication, Renalfy forces a clean migration: consolidate overlapping plans or keep only the latest ACTIVE one.

### 5. **Prevents Accidental Overbooking**

If a patient has two ACTIVE dialysis plans (e.g., 10 sessions each), the clinic might accidentally:
- Create two receipts, both deducting from different plans
- Lose track of which plan is being used
- Overbook sessions

The constraint prevents this human error at the source.

---

## Alternatives Considered

### A. Allow Multiple ACTIVE Plans, Pick First in Receipts

**Pros:**
- Maximum flexibility
- Matches SUTR behavior

**Cons:**
- Ambiguous receipt processing
- Reporting nightmare
- UX confusion
- Risk of overbooking

**Rejected:** Too risky, violates clarity principle.

### B. Enforce DB-Level Unique Constraint

**Option:**
```sql
ALTER TABLE plan
ADD CONSTRAINT one_active_plan_per_patient_servicetype
UNIQUE (patientId, serviceTypeId)
WHERE status = 'ACTIVE';
```

**Pros:**
- Enforced at DB level (stronger)
- Can't be bypassed

**Cons:**
- Partial/conditional unique indexes are complex in PostgreSQL
- Harder to migrate data
- Less flexible for updates

**Chosen:** Application-level check first (MVP), can add DB constraint later if needed.

### C. Allow Multiple ACTIVE Plans but Deprecate in Favor of Single

**Option:** Allow creation but warn in API/UI

**Cons:**
- Technical debt
- Confusion during migration
- Defeats the purpose

**Rejected:** Not chosen.

---

## Consequences

### 1. **Schema (no changes needed)**

Plan.status remains `PlanStatus { ACTIVE | INACTIVE | EXHAUSTED }`

### 2. **API Validation**

`PlansService.create()` enforces the constraint.

`PlansService.update()` also enforces it:
```typescript
// If updating status from INACTIVE → ACTIVE
if (dto.status === 'ACTIVE' && plan.serviceTypeId !== null) {
  const existing = await this.prisma.plan.findFirst({
    where: {
      patientId: plan.patientId,
      serviceTypeId: plan.serviceTypeId,
      status: 'ACTIVE',
      id: { not: planId }, // Exclude current plan
    },
  });
  if (existing) {
    throw new ConflictException('...');
  }
}
```

### 3. **Migration Strategy**

During SUTR → Renalfy migration:
- Detect duplicate ACTIVE plans for (patientId, serviceTypeId)
- Keep the most recent one, mark others as INACTIVE
- Log warnings so admin can review

### 4. **Zod Schema**

No special validation needed in schema — validation happens in service.

### 5. **Test Coverage**

Unit test: `should throw ConflictException if ACTIVE plan exists for (patientId, serviceTypeId)`

E2E test: Attempt to create second ACTIVE plan, expect 409 Conflict.

---

## Links

- **Spec:** `docs/specs/companies-plans.md` (Section: Plan Business Rules)
- **Implementation:** `apps/api/src/plans/plans.service.ts` (create/update methods)
- **Tests:** `apps/api/src/plans/plans.service.spec.ts`
- **Related:** ADR-013-B (locationId explicit on Plan)

---

## Q&A

**Q: What if a patient legitimately needs two dialysis plans (e.g., part-time at two clinics)?**

A: Renalfy is single-tenant per organization. A patient is tied to one Location. If they're registered at Clinic A and Clinic B, they're two separate Patient records (one per clinic, one per tenant). This is the architectural boundary.

**Q: Can I have one ACTIVE and one INACTIVE plan for the same (patientId, serviceTypeId)?**

A: Yes. The constraint only applies to ACTIVE status. You can archive a plan (set to INACTIVE) and create a new one (set to ACTIVE). The inactive one remains for historical audit.

**Q: What if I need to transition from one plan to another without a gap?**

A: The workflow is:
1. Create new plan in ACTIVE status (only possible if old plan is not ACTIVE)
2. Set old plan to INACTIVE
3. Or vice versa: Set old plan to INACTIVE, then create new plan as ACTIVE

In a single transaction for atomicity if needed.

---

**Accepted:** 2026-03-22
