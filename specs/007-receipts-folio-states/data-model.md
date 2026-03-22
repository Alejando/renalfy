# Data Model: Receipts — Folio Generation & State Machine

## Existing Models (no changes to fields)

### Receipt *(modified — add planId)*

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| tenantId | String | Multi-tenant isolation |
| locationId | String | Location scope |
| patientId | String | FK to Patient |
| userId | String | Who created the receipt |
| serviceTypeId | String? | Optional service type |
| **planId** | **String?** | **NEW — FK to Plan (required when paymentType = BENEFIT)** |
| folio | String | Generated: `{LOC}-{YYYY}-{NNNNN}` |
| date | DateTime | Payment date |
| amount | Decimal(10,2) | Payment amount |
| paymentType | PaymentType | CASH, CREDIT, BENEFIT, INSURANCE, TRANSFER |
| status | ReceiptStatus | ACTIVE (default), FINISHED, SETTLED, CANCELLED |
| notes | String? | Optional notes |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

Relations: `appointments Appointment[]` (back-relation — Appointment holds `receiptId`)

### Plan *(no schema changes — only `usedSessions` and `status` fields are written at runtime)*

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| tenantId | String | Multi-tenant isolation |
| locationId | String | Location scope |
| patientId | String | FK to Patient |
| companyId | String? | FK to Company (optional) |
| serviceTypeId | String? | Optional |
| userId | String | Who created the plan |
| startDate | DateTime | Plan start date |
| plannedSessions | Int | Total sessions contracted |
| usedSessions | Int | Counter incremented on BENEFIT receipt creation |
| amount | Decimal(10,2) | Total amount |
| status | PlanStatus | ACTIVE (default), INACTIVE, EXHAUSTED |
| notes | String? | Optional |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

### Appointment *(no schema changes — `receiptId` already exists)*

Relevant field: `receiptId String?` — set when a receipt is created for this appointment.

---

## New Model: ReceiptFolioCounter

Dedicated counter table for atomic, sequential folio generation per tenant + location + year.

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| tenantId | String | Tenant scope |
| locationId | String | Location scope |
| year | Int | Calendar year (e.g., 2026) |
| lastSequence | Int | Last issued sequence number (starts at 0) |

Unique constraint: `(tenantId, locationId, year)`

**Usage in transaction**:
1. `UPSERT` row — insert with `lastSequence = 1` on first receipt; increment `lastSequence++` on subsequent ones.
2. Use the returned `lastSequence` to build the folio string.

---

## State Machine

```
ReceiptStatus transitions:

  ACTIVE ──────────────────► FINISHED ──────────────► SETTLED
     │                                                  (terminal)
     └────────────────────────────────────────────────► CANCELLED
                                                        (terminal)
```

`SETTLED` and `CANCELLED` are immutable terminal states.

---

## Enums (existing)

```
ReceiptStatus: ACTIVE | FINISHED | SETTLED | CANCELLED
PaymentType:   CASH | CREDIT | BENEFIT | INSURANCE | TRANSFER
PlanStatus:    ACTIVE | INACTIVE | EXHAUSTED
```

---

## Schema Changes Summary

```prisma
// 1. Add planId to Receipt
model Receipt {
  ...
  planId String?
  plan   Plan?   @relation(fields: [planId], references: [id])
  ...
}

// 2. Add receipts back-relation to Plan
model Plan {
  ...
  receipts Receipt[]
  ...
}

// 3. New ReceiptFolioCounter
model ReceiptFolioCounter {
  id           String @id @default(uuid())
  tenantId     String
  locationId   String
  year         Int
  lastSequence Int    @default(0)

  @@unique([tenantId, locationId, year])
}
```
