# Phase 0 Research: Sprint 21 — Módulo 4: Ventas (Backend)

**Date**: 2026-04-29 | **Status**: Complete

---

## Overview

All clarifications from the feature specification have been evaluated and confirmed. No open NEEDS CLARIFICATION items remain. This document summarizes key findings and design decisions that informed the implementation plan.

---

## Key Findings

### 1. Folio Generation Strategy

**Decision**: Sequence-based atomic folio generation with format `{LOCATION_CODE}-{YYYY}-{SEQUENCE}`.

**Rationale**:
- Ensures uniqueness per tenant + location + month
- Atomic transaction prevents race conditions under concurrent sales
- Monthly reset aligns with financial close practices
- Matches existing Receipt folio pattern (Sprint 7)

**Alternatives Considered**:
- UUID-based folio: UUID is opaque and not user-friendly for ledgers and period reconciliation
- Timestamp-based: Prone to collisions under millisecond concurrency

**Conclusion**: Sequence-based approach proven in Sprint 7 (Receipts). Reuse same pattern.

---

### 2. Income/Expense Type System

**Decision**: Hybrid — predefined enums + optional custom_type field.

**Predefined Types**:
- **Income**: `SERVICE_FEE`, `DEPOSIT`, `TRANSFER`, `REFUND`, `OTHER`
- **Expense**: `PAYROLL`, `SUPPLIES`, `UTILITIES`, `MAINTENANCE`, `OTHER`

**Rationale**:
- Predefined types enable quick categorization and reporting without open-ended text
- Custom_type field (≤100 chars, optional) accommodates edge cases without table explosion
- Default to `OTHER` if custom_type is provided and doesn't match preset

**Alternatives Considered**:
- Pure enum: Too rigid for diverse clinic operations
- Completely free-form: No structure for reporting, hard to analyze

**Conclusion**: Hybrid approach balances structure and flexibility.

---

### 3. CashClose Immutability

**Decision**: CashClose.status = CLOSED is completely immutable. No UPDATE or DELETE allowed once closed.

**Rationale**:
- Audit trail preservation: correcting errors requires new Income/Expense records, creating clear transaction history
- Regulatory compliance: Mexican health/financial law requires immutable transaction records
- Prevents accidental overwrites or timestamp tampering
- Conflicts (concurrency) detected and reported to user (409 Conflict) rather than silently failing

**Alternatives Considered**:
- Soft update: Allow status change from CLOSED → REOPENED: Breaks audit trail, invites regulatory issues
- Hard delete: Eliminates transaction history entirely

**Conclusion**: Immutability enforced at DB level via RLS policy (no UPDATE/DELETE on CashClose, only INSERT/SELECT).

---

### 4. Refund Handling

**Decision**: Two separate transaction line items — CANCELLED sale + refund sale — visible in CashClose for full audit visibility.

**Rationale**:
- Algebraic sum in calculatedTotal shows net cash impact
- Each line item independently auditable (who, when, original sale reference)
- Regulatory requirement: transaction corrections must be traceable, not "netted away"

**Alternatives Considered**:
- Single net refund line: Loses original transaction visibility, fails audit
- Separate credit memo table: Adds complexity for minimal benefit

**Conclusion**: Two-line audit trail approach.

---

### 5. Concurrency & Conflict Handling

**Decision**: First-come, first-served CashClose. Duplicate close attempts receive 409 Conflict with "Period already closed".

**Rationale**:
- Prevents accidental double-closes
- User can retry with different period or acknowledge conflict
- Matches REST semantics (409 = resource conflict)
- Idempotency key prevents duplicate sales within 10-second window

**Alternatives Considered**:
- Silent no-op: User unaware close failed
- Auto-retry: Can mask race condition bugs

**Conclusion**: 409 Conflict + clear message.

---

### 6. Stock Validation & InventoryMovement

**Decision**: Validate stock real-time at sale creation time. On success, atomically create InventoryMovement (OUT) + decrement LocationStock in same transaction.

**Rationale**:
- Real-time validation prevents overselling
- Atomic transaction ensures consistency (if sale created, movement created; if movement failed, sale rolled back)
- LocationStock updated in same transaction as InventoryMovement creation
- Movement references sale via `reference="SALE-{saleId}"`

**Alternatives Considered**:
- Eventual consistency (async movement): Sale succeeds but movement fails → stock leak
- Dual writes (manual + db): Complex, error-prone

**Conclusion**: Single atomic Prisma transaction.

---

### 7. Plan.usedSessions Increment

**Decision**: Atomically increment Plan.usedSessions in same transaction as Sale creation when paymentType = BENEFIT.

**Rationale**:
- Ensures plan counter and sale record are consistent
- Prevents "ghost" sessions (sale created but plan not updated)
- If plan exhausted (usedSessions >= plannedSessions), mark Plan.status = EXHAUSTED

**Alternatives Considered**:
- Async job: Risk of drift between sale and plan counter
- Manual increment: Error-prone, requires user intervention

**Conclusion**: Atomic transaction in SalesService.

---

### 8. Role-Based Access Control

**Decision**: MANAGER/OWNER/ADMIN can create sales; STAFF cannot (403 Forbidden).

**Rationale**:
- MANAGER = operational authority (can open sales, track cash)
- STAFF = register only (patient data, appointments, receipt creation; no financial control)
- OWNER/ADMIN = oversight (always view all; OWNER can see reports but not modify CashClose)
- Protects financial integrity from unauthorized user changes

**Alternatives Considered**:
- All roles same access: Security risk, no segregation of duties
- STAFF can create sales: Violates role model

**Conclusion**: MANAGER+ only.

---

### 9. LocationId Filtering

**Decision**: MANAGER/STAFF see only their assigned locationId. OWNER/ADMIN see all locations.

**Rationale**:
- Multi-location clinics: Each manager operates independently
- OWNER oversight: Can see all locations but not modify transactions
- RLS enforces at DB level; application layer enforces in API queries

**Alternatives Considered**:
- Tenant-level only: Ignores location scope
- No filtering: Security breach

**Conclusion**: Filtered at both app + DB layers.

---

### 10. AuditLog Integration

**Decision**: Every Sale/Income/Expense/CashClose creation logged asynchronously (fire-and-forget). Audit log failure does NOT block transaction.

**Rationale**:
- AuditLog non-blocking: Logging should never delay user operations
- Async logging via event bus (if available) or background job
- Preserves audit trail without impacting latency

**Alternatives Considered**:
- Synchronous audit: Can slow down high-volume sales
- No audit: Regulatory non-compliance

**Conclusion**: Async fire-and-forget with dedicated logging service.

---

### 11. Tax Handling

**Decision**: Tax is optional per-item field (passed by client, validated server-side). No automatic calculation in v1.

**Rationale**:
- Simplifies implementation
- Different jurisdictions/clinics have different tax rules
- Total = SUM(qty * unitPrice + tax per item), calculated server-side
- Tax validation: ensure tax <= (quantity * unitPrice * MAX_TAX_RATE) to detect obvious errors

**Alternatives Considered**:
- Automatic calculation: Requires configurable tax rules per location/product
- Compound tax: Out of scope for v1

**Conclusion**: Manual tax per item, server-side validation.

---

### 12. Pagination & Filtering

**Decision**: API default 50 items/page, client can request 10-500. Filter by type, dateFrom, dateTo, locationId, status.

**Rationale**:
- Prevents full-table returns (performance)
- Filters applied server-side (DB query level, not in-memory)
- Indexes on date, locationId, status for fast queries

**Alternatives Considered**:
- No pagination: Slow on large datasets
- Client-side filtering: Requires fetching all data first

**Conclusion**: Server-side pagination + filters.

---

### 13. Idempotency & Retry Logic

**Decision**: Client implements exponential backoff (1s, 2s, 4s) on 409/5xx. Backend detects duplicates within 10-second window using (userId + timestamp + items hash).

**Rationale**:
- Network timeouts common in production
- Prevents double-charges on retry
- 10-second window aligns with typical checkout workflow

**Alternatives Considered**:
- No idempotency: User might be charged twice
- Indefinite window: Cache grows unbounded

**Conclusion**: Time-boxed deduplication cache.

---

## Technology Stack Confirmation

| Component | Version | Rationale |
|---|---|---|
| NestJS | 11 | Established framework, DI container, guards, interceptors |
| TypeScript | 5.3 | Type safety, aligns with project standards |
| Prisma | 7 | ORM with RLS support, atomic transactions |
| PostgreSQL | 16 | Mature, RLS, SERIAL sequences for folio |
| Jest | latest | Testing framework, matches existing setup |
| nestjs-zod | latest | Schema validation, DTO generation from Zod |
| @repo/types | internal | Single source of truth for schemas |

All confirmed. No dependency conflicts or blockers.

---

## Performance Targets Feasibility

| Target | Feasibility | Notes |
|---|---|---|
| <500ms per endpoint | ✅ High | Simple CRUD operations, indexed queries |
| <1s cash close (1000+ records) | ✅ High | DB aggregation (GROUP BY, SUM) is O(n) with indexes |
| <200ms folio generation | ✅ High | Sequence increment + insert = atomic, sub-100ms |
| 100+ concurrent sales | ✅ High | Prisma transaction isolation, DB connection pooling |
| 0 folio duplicates | ✅ High | SERIAL sequence + transaction atomicity |

All targets achievable with standard SQL optimization.

---

## Security & Compliance Confirmation

| Requirement | Status | Implementation |
|---|---|---|
| Multi-tenant isolation | ✅ | tenantId in JWT, RLS policies, TenantInterceptor |
| Role-based access | ✅ | JwtAuthGuard + role checks in service |
| Location filtering | ✅ | App layer + RLS policy |
| Audit logging | ✅ | AuditInterceptor (async, fire-and-forget) |
| Immutable CashClose | ✅ | DB policy prevents UPDATE/DELETE after CLOSED |
| Data encryption in transit | ✅ | HTTPS/TLS in production |
| No hardcoded secrets | ✅ | Environment variables only |

All security measures in place.

---

## Dependencies & Blockers

### External Dependencies
- ✅ Product table exists (Sprint 15)
- ✅ LocationStock table exists (Sprint 15)
- ✅ InventoryMovement table exists (Sprint 19)
- ✅ Plan table exists (Sprint 13)
- ✅ AuditLog table exists (Sprint 7)
- ✅ Prisma client generated

### No Blockers
- All required tables exist
- RLS policies can be added incrementally
- Existing transaction patterns proven (Receipts, Purchases)

---

## Open Questions Resolved

**Q: Can STAFF create sales?**  
A: No. STAFF has register-only role; MANAGER+ required for financial transactions.

**Q: What if CashClose period has no sales?**  
A: calculatedTotal = 0, CashClose still created. Use case: empty day, close anyway to mark period as reconciled.

**Q: Can a Sale reference a deleted Product?**  
A: Yes. SaleItem keeps productId but marks as "unavailable" if product deleted. Sale still finalized.

**Q: What happens if Plan is exhausted mid-sale?**  
A: Sale succeeds (already accepted). Plan.status = EXHAUSTED prevents further BENEFIT payments without admin action.

**Q: Can user modify Sale after finalization?**  
A: No. Sale immutable after status = FINISHED. Corrections via CANCELLED sale + new refund sale.

All clarifications documented. Ready for Phase 1 design.

---

## Phase 0 Completion Checklist

- [x] All unknowns from Technical Context resolved
- [x] Technology choices evaluated and confirmed
- [x] Performance targets assessed as feasible
- [x] Security/compliance verified
- [x] Dependencies confirmed (no blockers)
- [x] Edge cases discussed and handled
- [x] All user questions answered
- [x] Ready for Phase 1 (data modeling)
