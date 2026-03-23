# Spec: Companies + Plans (Module 2)

**Version:** 1.0
**Status:** Ready for Implementation
**Last Updated:** 2026-03-22

---

## Overview

The Companies + Plans module provides a framework for managing benefit plans across a medical organization's patient population. A **Plan** represents an agreed-upon benefit agreement (typically with an insurance company or employer) for a specific patient, specifying a number of planned sessions and a budget. Sessions are deducted automatically as receipts are created with the `BENEFIT` payment type.

**Key entities:**
- **Company:** Insurance company, employer, or benefit provider (e.g., IMSS, Seguros Monterrey New York)
- **Plan:** A benefit agreement linking a patient to a company (or general plan without company), specifying planned sessions and status

---

## Scope

### Included
- Create, read, update, delete Companies
- Create, read, update, delete Plans
- Automatic session deduction from Plans when receipts are created with `paymentType = BENEFIT`
- Plan status management: ACTIVE → INACTIVE, automatic transition to EXHAUSTED
- Multi-tenant isolation (tenant filtering)
- Location-scoped access (MANAGER/STAFF can only see/edit their location's plans)
- Search and filtering by multiple criteria

### Explicitly Out of Scope
- Manual session refunds (future feature)
- Plan expiration rules (future feature)
- Bulk plan operations (future feature)
- Plans with expiration dates (future feature)
- Automatic plan switching logic (future feature)

---

## Data Model

### Company

```prisma
model Company {
  id            String   @id @default(uuid())
  tenantId      String   // Multi-tenant isolation
  name          String   // E.g., "IMSS Jalisco"
  taxId         String?  // RFC (Mexico tax ID)
  phone         String?  // Contact phone
  email         String?  // Contact email
  address       String?  // Business address
  contactPerson String?  // Primary contact name
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Relations
  plans Plan[]
}

// Constraints:
// - Unique: { tenantId, name } (implicit, enforced at service level)
// - No hard foreign key to plans (use ConflictException on delete if plans exist)
```

### Plan

```prisma
model Plan {
  id            String     @id @default(uuid())
  tenantId      String     // Multi-tenant isolation
  locationId    String     // Location-scoped access control
  patientId     String     // Patient receiving the plan
  companyId     String?    // Company providing benefit (optional for general plans)
  serviceTypeId String?    // Service this plan covers (optional for general plans)
  userId        String     // User who created the plan
  startDate     DateTime   // When the plan becomes effective
  plannedSessions Int      // Total sessions covered by plan
  usedSessions  Int        @default(0) // Auto-incremented by Receipts service
  amount        Decimal    @db.Decimal(10, 2) // Budget/agreed amount
  status        PlanStatus @default(ACTIVE)
  notes         String?    // Internal notes
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt

  // Relations
  receipts Receipt[]
}

enum PlanStatus {
  ACTIVE    // Plan is in effect
  INACTIVE  // Plan is archived/inactive
  EXHAUSTED // All sessions used (set automatically by Receipts service)
}

// Constraints:
// - Unique: Max one ACTIVE plan per (patientId, serviceTypeId) when serviceTypeId is not null
//   (enforced at service level, not DB constraint)
// - locationId must match patient.locationId (enforced at service level)
// - usedSessions is read-only from Plans service (modified by Receipts service)
```

### Relationships

```
Company         Plan
  1 ─── * (companyId)

Patient         Plan
  1 ─── * (patientId)

ServiceType     Plan
  1 ─── * (serviceTypeId, optional)

Location        Plan
  1 ─── * (locationId)

Plan            Receipt
  1 ─── * (planId, optional)
```

---

## Zod Schemas (@repo/types)

### File: `companies-plans.schemas.ts`

```typescript
// ═════════════════════════════════════════════════════════
// COMPANIES
// ═════════════════════════════════════════════════════════

export const CreateCompanySchema = z.object({
  name: z.string().min(1, 'El nombre de la empresa es obligatorio'),
  taxId: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  contactPerson: z.string().optional(),
});

export const UpdateCompanySchema = z.object({
  name: z.string().min(1).optional(),
  taxId: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  contactPerson: z.string().optional(),
});

export const CompanyQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(), // Search name or taxId
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

// ═════════════════════════════════════════════════════════
// PLANS
// ═════════════════════════════════════════════════════════

export const CreatePlanSchema = z.object({
  patientId: z.string().uuid('Patient ID must be a valid UUID'),
  locationId: z.string().uuid().optional(), // Auto-filled for MANAGER/STAFF
  companyId: z.string().uuid().optional(), // Optional for general plans
  serviceTypeId: z.string().uuid().optional(), // Optional for general plans
  startDate: z.coerce.date(),
  plannedSessions: z.number().int().min(1, 'Planned sessions must be at least 1'),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid amount format'),
  notes: z.string().optional(),
});

export const UpdatePlanSchema = z.object({
  companyId: z.string().uuid().optional(),
  serviceTypeId: z.string().uuid().optional(),
  startDate: z.coerce.date().optional(),
  plannedSessions: z.number().int().min(1).optional(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(), // Only these transitions allowed
  notes: z.string().optional(),
});

export const PlanQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  patientId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'EXHAUSTED']).optional(),
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
  amount: z.string(), // Decimal as string for precision
  status: z.enum(['ACTIVE', 'INACTIVE', 'EXHAUSTED']),
  notes: z.string().nullable(),
  // Enriched fields (populated from related tables)
  patientName: z.string(),
  companyName: z.string().nullable(),
  serviceTypeName: z.string().nullable(),
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

---

## API Contract

### Companies Endpoints

#### GET /api/companies

**Access:** Requires authentication. Only OWNER/ADMIN.

**Query Parameters:**
```typescript
{
  page?: number (default: 1)
  limit?: number (default: 20, max: 100)
  search?: string // Searches name and taxId
}
```

**Response (200 OK):**
```typescript
{
  data: CompanyResponse[],
  total: number,
  page: number,
  limit: number
}
```

**Error Codes:**
- 401 Unauthorized (not logged in)
- 403 Forbidden (not OWNER/ADMIN)

---

#### POST /api/companies

**Access:** Requires authentication. Only OWNER/ADMIN.

**Request Body:**
```typescript
{
  name: string (required, 1+ chars)
  taxId?: string
  phone?: string
  email?: string (valid email if provided)
  address?: string
  contactPerson?: string
}
```

**Response (201 Created):**
```typescript
CompanyResponse
```

**Error Codes:**
- 400 Bad Request (validation error, name already exists)
- 401 Unauthorized
- 403 Forbidden

---

#### GET /api/companies/:id

**Access:** Requires authentication. Only OWNER/ADMIN.

**Response (200 OK):**
```typescript
CompanyResponse
```

**Error Codes:**
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found

---

#### PATCH /api/companies/:id

**Access:** Requires authentication. Only OWNER/ADMIN.

**Request Body:**
```typescript
{
  name?: string
  taxId?: string
  phone?: string
  email?: string
  address?: string
  contactPerson?: string
}
```

**Response (200 OK):**
```typescript
CompanyResponse
```

**Error Codes:**
- 400 Bad Request (validation error, name conflict)
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found

---

#### DELETE /api/companies/:id

**Access:** Requires authentication. Only OWNER/ADMIN.

**Response (204 No Content)**

**Error Codes:**
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found
- 409 Conflict (company has plans referencing it)

---

### Plans Endpoints

#### GET /api/plans

**Access:** Requires authentication. All roles (with RLS: MANAGER/STAFF see only their location).

**Query Parameters:**
```typescript
{
  page?: number (default: 1)
  limit?: number (default: 20, max: 100)
  patientId?: string (UUID)
  companyId?: string (UUID)
  status?: 'ACTIVE' | 'INACTIVE' | 'EXHAUSTED'
}
```

**Response (200 OK):**
```typescript
{
  data: PlanResponse[],
  total: number,
  page: number,
  limit: number
}
```

---

#### POST /api/plans

**Access:** Requires authentication. All roles (with RLS: MANAGER/STAFF must create in their location).

**Request Body:**
```typescript
{
  patientId: string (required, UUID)
  locationId?: string (optional for MANAGER/STAFF, required for OWNER/ADMIN)
  companyId?: string (UUID)
  serviceTypeId?: string (UUID)
  startDate: Date (required)
  plannedSessions: number (required, >= 1)
  amount: string (required, e.g., "1000.00")
  notes?: string
}
```

**Response (201 Created):**
```typescript
PlanResponse
```

**Error Codes:**
- 400 Bad Request (validation, missing locationId for OWNER/ADMIN, etc.)
- 401 Unauthorized
- 403 Forbidden (MANAGER/STAFF trying to create in another location)
- 404 Not Found (patient, company, or serviceType not found)
- 409 Conflict (ACTIVE plan already exists for this patient+serviceType)

---

#### GET /api/plans/:id

**Access:** Requires authentication. All roles (with RLS).

**Response (200 OK):**
```typescript
PlanResponse
```

**Error Codes:**
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found

---

#### PATCH /api/plans/:id

**Access:** Requires authentication. All roles (with RLS).

**Request Body:**
```typescript
{
  companyId?: string
  serviceTypeId?: string
  startDate?: Date
  plannedSessions?: number
  amount?: string
  status?: 'ACTIVE' | 'INACTIVE' // No direct update to EXHAUSTED
  notes?: string
}
```

**Response (200 OK):**
```typescript
PlanResponse
```

**Note:** Direct modification of `usedSessions` is **forbidden**. It's managed by the Receipts service.

**Error Codes:**
- 400 Bad Request (invalid status transition, validation error)
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found
- 409 Conflict (EXHAUSTED status is terminal, or attempting to set ACTIVE when another ACTIVE exists)

---

#### DELETE /api/plans/:id

**Access:** Requires authentication. All roles (with RLS).

**Response (204 No Content)**

**Note:** Can only delete if `usedSessions === 0`. For used plans, set status to INACTIVE instead.

**Error Codes:**
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found
- 409 Conflict (usedSessions > 0)

---

## Business Rules

### Companies

1. **Unique name per tenant:** Two companies in the same tenant cannot have the same name.
   - Validated in service layer during create and update.
   - Error: 400 Bad Request with message "Company name already exists in this organization"

2. **Email validation:** If email is provided, must be valid.
   - Validated by Zod schema.
   - Error: 400 Bad Request

3. **No deletion if plans exist:** Cannot delete a company if any plans reference it.
   - Validated in service layer.
   - Error: 409 Conflict with message "Cannot delete company with active plans"

4. **Search:** GET /api/companies?search=term searches across `name` and `taxId`.
   - Case-insensitive LIKE search.
   - Pagination still applies.

5. **Soft delete (future):** Currently hard-delete only. Future enhancement: add `deletedAt` field.

### Plans

1. **Explicit locationId:** Plan always has an explicit `locationId`.
   - For MANAGER/STAFF: auto-filled from user.locationId.
   - For OWNER/ADMIN: required in DTO.
   - Validated: `plan.locationId === patient.locationId`.
   - See ADR-013-B for rationale.

2. **Patient validation:**
   - Patient must exist in the same tenant and location.
   - Validated in service: `{ tenantId, id: patientId, locationId }`.
   - Error: 404 Not Found

3. **Company validation (if provided):**
   - Company must exist in the same tenant.
   - Validated in service: `{ tenantId, id: companyId }`.
   - Error: 404 Not Found

4. **ServiceType validation (if provided):**
   - ServiceType must exist in the same tenant.
   - Validated in service: `{ tenantId, id: serviceTypeId }`.
   - Error: 404 Not Found

5. **One ACTIVE plan per (patientId, serviceTypeId):**
   - Only applies when creating or updating to ACTIVE status.
   - Allows multiple plans if serviceTypeId is NULL (general benefit plans).
   - Validated in service layer.
   - Error: 409 Conflict with message "Patient already has an active plan for this service type"
   - See ADR-013-A for rationale.

6. **Status transitions:**
   - **ACTIVE → INACTIVE:** Allowed (archive the plan)
   - **INACTIVE → ACTIVE:** Allowed (reactivate) if no other ACTIVE plan for same (patientId, serviceTypeId)
   - **→ EXHAUSTED:** Only Receipts service can do this (automatic when usedSessions >= plannedSessions)
   - **EXHAUSTED → anything:** Forbidden (terminal state)
   - Error: 409 Conflict for invalid transitions

7. **Read-only usedSessions:**
   - Plans service cannot update `usedSessions` directly.
   - Receipts service increments `usedSessions` when creating receipt with `paymentType = 'BENEFIT'`.
   - If a request includes `usedSessions` in update, ignore it (or throw error depending on preference).
   - See Receipts service spec for integration details.

8. **Delete only if not used:**
   - Can only delete plan if `usedSessions === 0`.
   - If plan has been used, set status to INACTIVE instead.
   - Error: 409 Conflict with message "Cannot delete plan with used sessions. Set status to INACTIVE instead."

9. **Audit logging:**
   - All CREATE and UPDATE operations log to AuditLog (fire-and-forget).
   - Logged as resource: "Plan", action: CREATE/UPDATE.

10. **RLS enforcement:**
    - MANAGER/STAFF can only view/edit plans from their location.
    - OWNER/ADMIN can view/edit all plans in tenant.
    - Validated in service layer via `userLocationId` parameter.
    - Error: 403 Forbidden or 404 Not Found (appears as 404 to prevent leaking location info)

---

## Edge Cases & Error Handling

### Edge Case 1: Patient with NULL locationId

**Scenario:** How is locationId determined if patient.locationId is somehow NULL?

**Resolution:** This should never happen (Patient.locationId is NOT NULL in schema). If it does, it's a data integrity issue. Throw 500 Internal Server Error with log.

### Edge Case 2: Concurrent Plan Creation for Same Patient+ServiceType

**Scenario:** Two requests arrive simultaneously, both creating ACTIVE plans for the same patient and service type.

**Resolution:** First request succeeds, second receives 409 Conflict. Use database transaction + check-before-insert pattern.

```typescript
const existing = await tx.plan.findFirst({
  where: { patientId, serviceTypeId, status: 'ACTIVE', tenantId },
});
if (existing) {
  throw new ConflictException(...);
}
const created = await tx.plan.create({...});
```

### Edge Case 3: Concurrent Receipt + Plan Update

**Scenario:** While Receipt increments plan.usedSessions, a concurrent request tries to update plan.plannedSessions.

**Resolution:** Both are independent. usedSessions is managed by Receipts service (via transaction). plannedSessions can be updated independently. No conflict.

### Edge Case 4: Delete Plan While Receipt is Being Created

**Scenario:** DELETE /api/plans/:id arrives while a Receipt with paymentType=BENEFIT is being created.

**Resolution:**
- If DELETE executes first, the Receipt's attempt to find the plan will fail → 404 Not Found in Receipts service.
- If Receipt executes first, it increments usedSessions. DELETE then fails with 409 Conflict.
- Overall: proper error handling in both services.

### Edge Case 5: Null Company/ServiceType in Responses

**Scenario:** Plan has companyId=NULL and serviceTypeId=NULL (general plan).

**Resolution:** Response includes `companyName: null` and `serviceTypeName: null`. No error. Client handles gracefully.

### Edge Case 6: Plan Created with serviceTypeId, Then ServiceType is Deleted

**Scenario:** A plan references serviceTypeId=X. Later, that ServiceType is deleted from the system.

**Resolution:**
- Plan record still has serviceTypeId=X (no ON DELETE CASCADE).
- In responses, if ServiceType is not found, `serviceTypeName: null`.
- Plan is still valid and usable.

### Edge Case 7: MANAGER Tries to View Plans from Another Location

**Scenario:** MANAGER of Location A requests `GET /api/plans?patientId=Y` where patient Y is in Location B.

**Resolution:**
- Backend applies filter: `{ locationId: userLocationId }`.
- Query returns 0 results (appears as empty list, not 404).
- This is correct RLS behavior: user simply doesn't see the data.

---

## Security & Compliance

### Multi-tenant Isolation

- All queries filter by `tenantId` from JWT.
- No cross-tenant data leakage.

### Location-Scoped Access Control (RLS)

- MANAGER and STAFF users can only create, read, update, delete plans from their assigned location.
- Enforced in service layer via `userLocationId` parameter.
- Implementation: `where: { tenantId, ...(userLocationId !== null && { locationId: userLocationId }) }`.

### Audit Logging

- All CREATE and UPDATE operations trigger AuditLog (fire-and-forget, doesn't block API response).
- Logged as: resource="Plan", action=CREATE/UPDATE, resourceId=plan.id, newValues={...}, oldValues={...} (for update).

### PHI Considerations

- Plans contain `patientId` (links to PHI).
- API responses enrich with `patientName` (PHI).
- Only authorized users (same location or OWNER/ADMIN) can access.
- No plan data is exposed to unauthenticated requests.

### No Direct usedSessions Modification

- Prevents tampering with session counts.
- Receipts service is the sole source of truth.

---

## Test Plan

### Unit Tests: CompaniesService

**File:** `apps/api/src/companies/companies.service.spec.ts`

```typescript
describe('CompaniesService', () => {
  describe('create', () => {
    it('should create company with valid data');
    it('should throw BadRequestException if name already exists in tenant');
    it('should throw ForbiddenException if user is MANAGER/STAFF');
    it('should accept optional fields');
  });

  describe('findAll', () => {
    it('should return paginated list of companies');
    it('should filter by search term (name or taxId)');
    it('should respect pagination limits (max 100)');
    it('should return total count');
  });

  describe('findOne', () => {
    it('should return company by id');
    it('should throw NotFoundException if id does not exist');
    it('should throw NotFoundException if company belongs to different tenant');
  });

  describe('update', () => {
    it('should update company fields');
    it('should throw BadRequestException if name conflicts with another company');
    it('should throw NotFoundException if id does not exist');
    it('should throw ForbiddenException if user is MANAGER/STAFF');
  });

  describe('delete', () => {
    it('should delete company if no plans reference it');
    it('should throw ConflictException if plans exist');
    it('should throw NotFoundException if id does not exist');
    it('should throw ForbiddenException if user is MANAGER/STAFF');
  });
});
```

### Unit Tests: PlansService

**File:** `apps/api/src/plans/plans.service.spec.ts`

```typescript
describe('PlansService', () => {
  describe('create', () => {
    it('should create plan with valid data');
    it('should auto-fill locationId from user if MANAGER/STAFF');
    it('should require locationId in DTO if OWNER/ADMIN');
    it('should throw NotFoundException if patient does not exist');
    it('should throw ForbiddenException if patient is in different location (MANAGER/STAFF)');
    it('should throw NotFoundException if company does not exist (when provided)');
    it('should throw NotFoundException if serviceType does not exist (when provided)');
    it('should throw ConflictException if ACTIVE plan exists for (patientId, serviceTypeId)');
    it('should initialize usedSessions to 0');
    it('should initialize status to ACTIVE');
    it('should set userId to current user');
    it('should validate locationId matches patient.locationId');
  });

  describe('findAll', () => {
    it('should return paginated plans for tenant');
    it('should filter by patientId');
    it('should filter by companyId');
    it('should filter by status');
    it('should apply MANAGER/STAFF location restriction');
    it('should include enriched data (patientName, companyName, serviceTypeName)');
  });

  describe('findOne', () => {
    it('should return plan with enriched data');
    it('should throw NotFoundException if id not found');
    it('should throw NotFoundException if plan from different location (MANAGER/STAFF)');
  });

  describe('update', () => {
    it('should update allowed fields (companyId, serviceTypeId, startDate, plannedSessions, amount, notes)');
    it('should NOT allow direct usedSessions update');
    it('should allow ACTIVE → INACTIVE transition');
    it('should allow INACTIVE → ACTIVE transition (if no other ACTIVE plan)');
    it('should throw ConflictException if setting ACTIVE when another ACTIVE exists');
    it('should throw ConflictException on invalid transition (EXHAUSTED is terminal)');
    it('should throw NotFoundException if id not found');
    it('should throw ForbiddenException for MANAGER/STAFF from different location');
  });

  describe('delete', () => {
    it('should delete plan if usedSessions === 0');
    it('should throw ConflictException if usedSessions > 0');
    it('should throw NotFoundException if id not found');
    it('should throw ForbiddenException for MANAGER/STAFF from different location');
  });
});
```

### E2E Tests

**File:** `apps/api/test/companies-plans.e2e-spec.ts`

```typescript
describe('Companies & Plans E2E', () => {
  describe('Companies Flow', () => {
    it('should create, list, get, update, and delete company');
    it('should search companies by name and taxId');
    it('should prevent deletion if plans exist');
    it('should enforce unique name per tenant');
  });

  describe('Plans Flow', () => {
    it('should create plan for patient');
    it('should auto-fill locationId for MANAGER');
    it('should require locationId for OWNER');
    it('should prevent creation if ACTIVE plan exists for same (patientId, serviceTypeId)');
    it('should allow multiple plans if serviceTypeId is different or null');
    it('should list plans with filters');
    it('should get plan detail with enriched data');
    it('should update plan fields');
    it('should prevent update to EXHAUSTED status (Receipts service only)');
    it('should prevent deletion if usedSessions > 0');
  });

  describe('Receipts Integration', () => {
    it('should increment usedSessions when receipt with BENEFIT payment is created');
    it('should set plan status to EXHAUSTED when usedSessions >= plannedSessions');
    it('should prevent creating receipt if plan is EXHAUSTED');
  });

  describe('RLS/Access Control', () => {
    it('should prevent MANAGER from accessing plans from other locations');
    it('should allow MANAGER to access plans from own location');
    it('should allow OWNER/ADMIN to access all plans in tenant');
    it('should prevent creation outside own location (MANAGER)');
  });
});
```

---

## Open Questions

1. **Should Company names be unique globally or per tenant?**
   - Recommendation: Per tenant (multiple organizations can have "IMSS").
   - Decision: Per tenant (unique constraint on { tenantId, name }).

2. **Should Plans support expiration dates?**
   - Recommendation: No for MVP. Future feature.
   - Decision: Defer to Sprint 14+.

3. **Should plans be soft-deleted or hard-deleted?**
   - Recommendation: Hard delete only if usedSessions === 0.
   - Decision: Hard delete (soft delete future feature).

4. **Should we allow manual session refunds?**
   - Recommendation: No for MVP. Future feature.
   - Decision: Defer to Sprint 14+.

---

## Future Enhancements

1. **Plan expiration:** Add `endDate` field, auto-deactivate expired plans.
2. **Session refunds:** Allow reversing receipts, decrement usedSessions.
3. **Plan templates:** Create reusable plan templates per company.
4. **Bulk operations:** Create/update multiple plans in one request.
5. **Plan auto-renewal:** Automatically create new plan when previous expires.
6. **Session carryover:** Allow unused sessions to carry over to next period.

---

## Related Documentation

- **ADR-013-A:** One ACTIVE Plan per (patientId, serviceTypeId)
- **ADR-013-B:** Explicit locationId on Plan
- **Receipts Spec:** docs/specs/receipts.md (Session deduction logic)
- **Migration Guide:** docs/SUTR_RENALFY_ENTITY_MAPPING.md (Company/Plan mapping)

---

**Version:** 1.0
**Last Updated:** 2026-03-22
**Status:** Ready for Implementation
