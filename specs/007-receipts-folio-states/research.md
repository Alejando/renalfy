# Research: Receipts — Folio Generation & State Machine

## Folio Generation Strategy

**Decision**: Use a dedicated `ReceiptFolioCounter` table with a row per `(tenantId, locationId, year)` holding a `lastSequence` integer, updated atomically via `prisma.$transaction` + `UPDATE ... SET lastSequence = lastSequence + 1 RETURNING lastSequence`.

**Rationale**: Deriving the sequence from `MAX()` on existing receipts requires a table-level lock and is fragile if rows are deleted or if the table grows large. A dedicated counter row is lightweight, easy to lock exclusively (`SELECT ... FOR UPDATE` via a raw query or Prisma's `$queryRaw`), and makes the folio counter independent of the receipt payload itself.

**Alternatives considered**:
- **MAX() derivation**: Simpler schema, but requires a lock on potentially many rows and is vulnerable to row deletion.
- **UUID folio**: Unique but not sequential or human-readable — rejected because Mexican health billing requires sequential folios.
- **Database sequence per location**: PostgreSQL sequences are tenant-agnostic; one sequence per location would need dynamic DDL — too complex.

**Implementation approach**:
1. Add `ReceiptFolioCounter` model: `(id, tenantId, locationId, year, lastSequence)` with unique index on `(tenantId, locationId, year)`.
2. In `prisma.$transaction(async (tx) => { ... })`: `UPSERT` the counter row (insert with `lastSequence=1` on conflict increment), then use the returned value to build the folio string.
3. Folio format: `` `${locationCode}-${year}-${String(seq).padStart(5, '0')}` ``

---

## Location Code for Folio

**Decision**: Derive `{LOC}` from the first 3 characters of `location.name`, uppercased and stripped of spaces/accents, e.g., `"Sucursal Norte"` → `"SUC"`.

**Rationale**: The `Location` model has no `code` field in the current schema. Adding a `code` field is possible but would require a migration and back-fill for existing locations. Using 3-char truncation is sufficient for the folio format, which already uses year + sequence to guarantee global uniqueness within a location.

**Alternatives considered**:
- **Add `code` field to Location**: Cleaner long-term but requires extra migration and back-fill not scoped to this sprint.
- **Use location UUID prefix**: Guaranteed uniqueness but produces unreadable folios like `3fa8c1-2026-00001`.

---

## BENEFIT Payment + Plan Session Atomicity

**Decision**: Wrap receipt creation + plan counter update in a single `prisma.$transaction`. If the plan update fails, the receipt is not created (automatic rollback).

**Rationale**: Partial state (receipt exists but plan not updated) would cause billing inaccuracies. Atomicity is a constitutional requirement (see Principle I and CLAUDE.md "Transacciones Prisma").

**Plan exhaustion check**: Checked inside the transaction after incrementing. If `updatedPlan.usedSessions >= updatedPlan.plannedSessions`, set `plan.status = 'EXHAUSTED'` in the same transaction.

**Pre-condition**: If `plan.status === 'EXHAUSTED'` at the start of the request, reject with HTTP 409 before entering the transaction — no plan updates should happen on exhausted plans.

---

## Appointment Linkage

**Observation**: The schema models the Receipt → Appointment link via `Appointment.receiptId` (FK on Appointment side). Creating a receipt with an `appointmentId` means:
1. Verify the appointment is `COMPLETED` and belongs to the same `tenantId + locationId`.
2. Verify the appointment does not already have a `receiptId` (would be a duplicate).
3. Create the receipt.
4. In the same transaction, `UPDATE appointment SET receiptId = newReceiptId WHERE id = appointmentId`.

---

## State Machine Implementation

**Decision**: Mirror the `VALID_TRANSITIONS` pattern established in `AppointmentsService`. A constant `VALID_RECEIPT_TRANSITIONS: Record<ReceiptStatus, ReceiptStatus[]>` defines allowed transitions. `SETTLED` and `CANCELLED` map to empty arrays (terminal states).

```ts
const VALID_RECEIPT_TRANSITIONS: Record<ReceiptStatus, ReceiptStatus[]> = {
  ACTIVE:    ['FINISHED', 'CANCELLED'],
  FINISHED:  ['SETTLED'],
  SETTLED:   [],
  CANCELLED: [],
};
```

---

## Schema Changes Required

1. **Add `planId String?` to `Receipt`** — optional FK for BENEFIT payment tracking.
2. **Add `ReceiptFolioCounter` model** — dedicated counter table for atomic folio generation.

Both changes require a Prisma migration (`npx prisma migrate dev`).

---

## Audit Logging

All receipt endpoints use the existing `@Audit({ action, resource })` decorator pattern. `AuditInterceptor` is fire-and-forget — no changes needed.

---

## No Research Blockers

All NEEDS CLARIFICATION items from spec resolved:
- Folio counter mechanism: `ReceiptFolioCounter` table.
- Location code: 3-char truncation of `location.name`.
- BENEFIT atomicity: single `$transaction`.
- Appointment link direction: Appointment holds the FK.
