# Feature Specification: Receipts — Folio Generation & State Machine

**Feature Branch**: `007-receipts-folio-states`
**Created**: 2026-03-20
**Status**: Draft
**Input**: User description: "Sprint 7 — Módulo 1: Recibos (folio + flujo de estados). Solo backend NestJS."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Create Receipt with Atomic Folio (Priority: P1)

A staff member closes a clinical session and needs to issue a receipt documenting the payment. The system must generate a unique, sequential folio identifier (format `{LOC}-{YYYY}-{NNNNN}`) in an atomic transaction so that no two receipts ever share the same folio within a tenant + location combination. The receipt is linked to an optional completed appointment and to a patient.

**Why this priority**: Folio generation is the foundation of the receipts module. Every other story depends on a receipt existing with a valid folio. Atomic uniqueness is a hard compliance requirement for Mexican health billing.

**Independent Test**: POST /api/receipts with a valid payload returns a receipt with a correctly formatted folio. Two sequential requests produce consecutive folios.

**Acceptance Scenarios**:

1. **Given** a patient with active consent in location "SUC1", **When** staff posts a new receipt with paymentType CASH, **Then** the receipt is created with folio `SUC1-2026-00001` and status `ACTIVE`.
2. **Given** a receipt with folio `SUC1-2026-00001` already exists, **When** a second receipt is created for the same location, **Then** its folio is `SUC1-2026-00002`.
3. **Given** a receipt creation with `appointmentId` pointing to an appointment in status `SCHEDULED`, **When** staff submits the request, **Then** the system rejects it with a 409 error.
4. **Given** a receipt creation with `appointmentId` pointing to a `COMPLETED` appointment, **When** staff submits the request, **Then** the receipt is created successfully.
5. **Given** a MANAGER user assigned to location A, **When** they attempt to create a receipt for location B, **Then** the request is rejected with 404.

---

### User Story 2 — Receipt State Transitions (Priority: P2)

An admin or staff member needs to advance a receipt through its lifecycle: from `ACTIVE` (payment registered) to `FINISHED` (service rendered) to `SETTLED` (accounting closed), or cancel it. The state machine must enforce valid transitions and prevent illegal ones.

**Why this priority**: State transitions control the financial and operational lifecycle of a receipt. Without this, receipts are static records with no workflow.

**Independent Test**: PATCH /api/receipts/:id/status can advance or cancel a receipt; invalid transitions are rejected with descriptive errors.

**Acceptance Scenarios**:

1. **Given** a receipt in status `ACTIVE`, **When** staff transitions to `FINISHED`, **Then** the receipt status becomes `FINISHED`.
2. **Given** a receipt in status `FINISHED`, **When** staff transitions to `SETTLED`, **Then** the receipt status becomes `SETTLED`.
3. **Given** a receipt in status `ACTIVE`, **When** staff transitions to `CANCELLED`, **Then** the receipt status becomes `CANCELLED`.
4. **Given** a receipt in status `SETTLED`, **When** staff attempts any status transition, **Then** the system rejects it with a 409 conflict.
5. **Given** a receipt in status `CANCELLED`, **When** staff attempts to transition to `ACTIVE`, **Then** the system rejects it with a 400 bad request.
6. **Given** a receipt in status `FINISHED`, **When** staff attempts to transition directly to `CANCELLED`, **Then** the system rejects it with a 400 bad request.

---

### User Story 3 — BENEFIT Payment: Plan Session Tracking (Priority: P3)

When a receipt is created with payment type `BENEFIT`, the system must deduct a session from the patient's active plan. If the plan's used sessions reach or exceed the planned session count, the plan status is automatically set to `EXHAUSTED`.

**Why this priority**: Plan session tracking is critical for insurance/benefit billing but is additive behaviour on top of receipt creation. Can be developed after core receipt CRUD is working.

**Independent Test**: POST /api/receipts with paymentType BENEFIT and a valid planId increments plan.usedSessions. Reaching the session limit sets plan.status = EXHAUSTED.

**Acceptance Scenarios**:

1. **Given** a plan with `plannedSessions=10` and `usedSessions=3`, **When** a receipt with `paymentType=BENEFIT` is created referencing that plan, **Then** `plan.usedSessions` becomes `4`.
2. **Given** a plan with `plannedSessions=10` and `usedSessions=9`, **When** a receipt with `paymentType=BENEFIT` is created, **Then** `plan.usedSessions` becomes `10` and `plan.status` becomes `EXHAUSTED`.
3. **Given** a receipt creation with `paymentType=BENEFIT` but no `planId`, **Then** the system rejects the request with a 400 error.
4. **Given** a receipt creation with `paymentType=CASH` and a `planId`, **Then** the plan's session count is NOT modified.
5. **Given** a plan belonging to a different tenant, **When** a receipt references it, **Then** the system rejects the request with a 404 error.

---

### User Story 4 — Query Receipts with Filters & Location Scope (Priority: P4)

Staff and managers need to list receipts filtered by patient, date, status, or payment type. MANAGER and STAFF users must only see receipts from their assigned location. OWNER and ADMIN can see all locations.

**Why this priority**: Read operations complete the module. Location scoping is a cross-cutting security concern already established in the codebase.

**Independent Test**: GET /api/receipts returns paginated results respecting the caller's location scope and applied filters.

**Acceptance Scenarios**:

1. **Given** a MANAGER in location A with receipts in both A and B, **When** they request all receipts, **Then** only receipts from location A are returned.
2. **Given** an OWNER, **When** they request all receipts, **Then** receipts from all locations are returned.
3. **Given** receipts with different statuses, **When** querying with `status=ACTIVE`, **Then** only ACTIVE receipts are returned.
4. **Given** receipts for different patients, **When** querying with `patientId`, **Then** only that patient's receipts are returned.
5. **Given** 50 receipts exist, **When** requesting page 2 with limit 20, **Then** receipts 21–40 are returned with correct pagination metadata.

---

### Edge Cases

- What happens when two concurrent requests generate folios for the same location simultaneously? The folio counter must be incremented in an atomic transaction to prevent duplicates.
- What happens when a receipt references a `planId` that does not belong to the same tenant? The request is rejected with 404.
- What happens if `plan.usedSessions` already equals `plannedSessions` before a BENEFIT receipt? The plan is already EXHAUSTED — the system should still reject or allow based on plan status validation (assume reject with 409 if plan is already EXHAUSTED).
- What happens if the associated appointment already has a receipt linked to it? The system rejects the creation with a 409 conflict.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST generate a unique sequential folio per `tenantId + locationId` in format `{LOC}-{YYYY}-{NNNNN}` within an atomic database transaction to prevent duplicate folios under concurrent load.
- **FR-002**: System MUST enforce the receipt state machine: `ACTIVE → FINISHED → SETTLED` and `ACTIVE → CANCELLED`. All other transitions MUST be rejected with HTTP 400 or 409.
- **FR-003**: System MUST reject receipt creation if the provided `appointmentId` does not reference a `COMPLETED` appointment belonging to the same tenant and location.
- **FR-004**: System MUST increment `plan.usedSessions` by 1 atomically (same transaction as receipt creation) when `paymentType = BENEFIT`.
- **FR-005**: System MUST set `plan.status = EXHAUSTED` when `plan.usedSessions >= plan.plannedSessions` after a BENEFIT receipt is created.
- **FR-006**: System MUST require a valid `planId` when `paymentType = BENEFIT`; BENEFIT receipts without a `planId` MUST be rejected with HTTP 400.
- **FR-007**: System MUST reject receipt creation with `paymentType = BENEFIT` if the referenced plan is already `EXHAUSTED`, returning HTTP 409.
- **FR-008**: `MANAGER` and `STAFF` roles MUST only create, update, and read receipts for their assigned `locationId`. Requests for other locations MUST return 404.
- **FR-009**: System MUST apply full audit logging on all receipt endpoints (create, status update, list, read by ID).
- **FR-010**: System MUST support paginated receipt listing filtered by `status`, `patientId`, `date` (single-day range), and `paymentType`.

### Key Entities

- **Receipt**: Documents a payment event. Has a unique folio, payment type, amount, status (`ACTIVE`, `FINISHED`, `SETTLED`, `CANCELLED`), and optional links to an appointment, a patient, and a plan.
- **Plan**: Tracks a patient's pre-paid session allowance. Has `plannedSessions`, `usedSessions`, and `status` (`ACTIVE` / `EXHAUSTED`). Modified atomically when BENEFIT receipts are created.
- **Company**: The insurer or corporate entity that may sponsor a plan. Referenced by Plan; not modified by this module.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Folio generation never produces duplicates — verified by unit tests with mocked atomic counter and by service-layer logic review.
- **SC-002**: All valid state transitions succeed and return HTTP 200; all invalid transitions return HTTP 400 or 409 with a descriptive Spanish message.
- **SC-003**: A BENEFIT receipt creation atomically increments `plan.usedSessions`; a rolled-back transaction leaves the plan unmodified — verified by unit tests.
- **SC-004**: MANAGER/STAFF users never receive receipts outside their assigned location — verified by tests covering cross-location scenarios.
- **SC-005**: All receipt endpoints appear in the audit log with correct `action`, `resource`, and user metadata.
- **SC-006**: The module passes `pnpm lint`, `pnpm check-types`, and `pnpm test` with zero errors before the feature is considered complete.

## Assumptions

- The `Receipt`, `Plan`, and `Company` models already exist in the Prisma schema with all required fields.
- `Location` has a `code` field (short string used as the `{LOC}` part of the folio). If absent, the first 3 characters of `location.name`, uppercased, will be used.
- The folio sequence counter is maintained as a separate `ReceiptFolioCounter` row (or derived from `MAX(sequence)` on existing receipts) — final approach decided at planning stage.
- Amount and currency fields are present on Receipt; their values are provided by the client and not validated beyond type checking.
- Only one `planId` is passed per BENEFIT receipt; the system does not attempt to auto-select a plan.
