# Phase 1 Data Model: Sprint 21 — Módulo 4: Ventas

**Date**: 2026-04-29 | **Status**: Complete

---

## Entity Definitions

### 1. Sale

**Purpose**: Register a sales transaction with line items, payment method, and financial tracking.

**Attributes**:

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK, auto | Unique sale identifier |
| `tenantId` | UUID | FK, NOT NULL | Multi-tenant isolation |
| `locationId` | UUID | FK, NOT NULL | Which location closed the sale |
| `folio` | String | UNIQUE (tenantId, locationId), NOT NULL | Format: `LOC-YYYY-NNNNN` |
| `totalAmount` | Decimal(10, 2) | NOT NULL | SUM(items.qty * unitPrice + tax) |
| `paymentType` | Enum | NOT NULL | `CASH \| CREDIT \| BENEFIT \| INSURANCE \| TRANSFER` |
| `status` | Enum | NOT NULL, default ACTIVE | `ACTIVE \| FINISHED \| SETTLED \| CANCELLED` |
| `isClosed` | Boolean | default false | Marked true when CashClose created for period |
| `userId` | UUID | FK, NOT NULL | Who created the sale (MANAGER+) |
| `notes` | String | nullable, max 500 | Optional free-form notes |
| `createdAt` | DateTime | auto, immutable | |
| `finishedAt` | DateTime | nullable | When payment confirmed (status → FINISHED) |
| `settledAt` | DateTime | nullable | When reconciled (status → SETTLED) |
| `closedAt` | DateTime | nullable | When CashClose marked it (isClosed = true) |

**Relationships**:
- 1 Sale → N SaleItems (line items)
- 1 Sale → 1 User (who created) via userId
- 1 Sale → 1 Plan (if paymentType = BENEFIT, optional)

**Validation Rules**:
- folio: immutable once set (generated at creation)
- totalAmount: calculated server-side, not trusted from client
- paymentType: if BENEFIT, linkedPlanId must be provided
- status transitions: ACTIVE → FINISHED → SETTLED or ACTIVE → CANCELLED
- createdAt immutable: set once, never changes
- finishedAt: can only be set if status transitioning to FINISHED
- isClosed: set to true only by CashClose service (user cannot directly)

**Indexes**:
- `(tenantId, locationId, createdAt)` — for period queries, CashClose calculations
- `(tenantId, status)` — for status-based filtering
- `(folio)` — for duplicate detection

---

### 2. SaleItem

**Purpose**: Line item in a Sale — represents one product/service sold.

**Attributes**:

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK, auto | Unique line item ID |
| `saleId` | UUID | FK, NOT NULL | Parent sale |
| `productId` | UUID | FK, NOT NULL | Reference to Product (soft reference; product can be deleted) |
| `quantity` | Integer | NOT NULL, > 0 | Units sold |
| `unitPrice` | Decimal(10, 2) | NOT NULL | Price per unit (server-calculated, not trusted) |
| `tax` | Decimal(10, 2) | NOT NULL, >= 0 | Tax amount per item |
| `subtotal` | Decimal(10, 2) | NOT NULL | qty * unitPrice + tax (server-calculated) |
| `createdAt` | DateTime | auto, immutable | |

**Relationships**:
- N SaleItems → 1 Sale (parent) via saleId
- N SaleItems → 1 Product (reference) via productId

**Validation Rules**:
- quantity: must be positive integer
- unitPrice: must match Product.currentPrice or be validated against tolerance
- tax: must be >= 0
- subtotal: immutable, calculated server-side
- Product deletion: SaleItem.productId remains valid (soft reference); UI flags as "unavailable"

**Immutability**:
- SaleItem completely immutable once Sale.status ≠ ACTIVE
- No corrections on SaleItem; corrections happen at Sale level (CANCELLED + new sale)

**Indexes**:
- `(saleId)` — for retrieval by sale

---

### 3. Income

**Purpose**: Record cash inflows (service fees, deposits, transfers, refunds, etc.)

**Attributes**:

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK, auto | Unique income ID |
| `tenantId` | UUID | FK, NOT NULL | Multi-tenant isolation |
| `locationId` | UUID | FK, NOT NULL | Which location recorded it |
| `type` | Enum | NOT NULL | `SERVICE_FEE \| DEPOSIT \| TRANSFER \| REFUND \| OTHER` |
| `customType` | String | nullable, max 100 | Free-form type if type = OTHER or custom |
| `amount` | Decimal(10, 2) | NOT NULL, > 0 | Cash amount |
| `description` | String | nullable, max 500 | Why/what income |
| `status` | Enum | NOT NULL, default ACTIVE | `ACTIVE \| CANCELLED` |
| `isClosed` | Boolean | default false | Marked true when CashClose created for period |
| `userId` | UUID | FK, NOT NULL | Who recorded it |
| `createdAt` | DateTime | auto, immutable | |
| `cancelledAt` | DateTime | nullable | When marked CANCELLED |
| `closedAt` | DateTime | nullable | When CashClose marked it |

**Relationships**:
- 1 Income → 1 User (who recorded) via userId
- 1 Income → 1 CashClose (period it belongs to, optional)

**Validation Rules**:
- type: must be valid enum or custom_type ≤ 100 chars
- amount: must be positive decimal
- status: ACTIVE → CANCELLED (one-way)
- createdAt: immutable
- cancelledAt: set only when status → CANCELLED
- CANCELLED incomes excluded from CashClose calculations

**Soft Delete**:
- Mark status = CANCELLED, set cancelledAt = now()
- Do NOT physically delete (audit trail)
- Exclude from CashClose aggregation (WHERE status = 'ACTIVE')

**Indexes**:
- `(tenantId, locationId, createdAt)` — for period queries
- `(tenantId, status)` — for filtering

---

### 4. Expense

**Purpose**: Record cash outflows (payroll, supplies, utilities, maintenance, etc.)

**Attributes**:

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK, auto | Unique expense ID |
| `tenantId` | UUID | FK, NOT NULL | Multi-tenant isolation |
| `locationId` | UUID | FK, NOT NULL | Which location recorded it |
| `type` | Enum | NOT NULL | `PAYROLL \| SUPPLIES \| UTILITIES \| MAINTENANCE \| OTHER` |
| `customType` | String | nullable, max 100 | Free-form type if type = OTHER or custom |
| `amount` | Decimal(10, 2) | NOT NULL, > 0 | Cash amount |
| `description` | String | nullable, max 500 | Why/what expense |
| `status` | Enum | NOT NULL, default ACTIVE | `ACTIVE \| CANCELLED` |
| `isClosed` | Boolean | default false | Marked true when CashClose created for period |
| `userId` | UUID | FK, NOT NULL | Who recorded it |
| `createdAt` | DateTime | auto, immutable | |
| `cancelledAt` | DateTime | nullable | When marked CANCELLED |
| `closedAt` | DateTime | nullable | When CashClose marked it |

**Relationships**:
- 1 Expense → 1 User (who recorded) via userId
- 1 Expense → 1 CashClose (period it belongs to, optional)

**Validation Rules**:
- Identical to Income (see above)
- type: Expense-specific enum (PAYROLL, SUPPLIES, etc.)

**Soft Delete**:
- Mark status = CANCELLED, set cancelledAt = now()
- Exclude from CashClose (WHERE status = 'ACTIVE')

**Indexes**:
- `(tenantId, locationId, createdAt)` — for period queries
- `(tenantId, status)` — for filtering

---

### 5. CashClose

**Purpose**: Reconcile cash register for a period (day/shift), lock records to prevent modification.

**Attributes**:

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK, auto | Unique close ID |
| `tenantId` | UUID | FK, NOT NULL | Multi-tenant isolation |
| `locationId` | UUID | FK, NOT NULL | Which location |
| `date` | Date | NOT NULL | Period date (e.g., 2026-04-29) |
| `status` | Enum | NOT NULL, immutable | `OPEN \| CLOSED` |
| `calculatedTotal` | Decimal(10, 2) | computed | SUM(Sales) + SUM(Incomes) - SUM(Expenses) |
| `salesTotal` | Decimal(10, 2) | computed | SUM(Sales.totalAmount) for period |
| `incomesTotal` | Decimal(10, 2) | computed | SUM(Income.amount) for period |
| `expensesTotal` | Decimal(10, 2) | computed | SUM(Expense.amount) for period |
| `userId` | UUID | FK, NOT NULL | Who initiated close (MANAGER+) |
| `createdAt` | DateTime | auto, immutable | |
| `closedAt` | DateTime | immutable | Same as createdAt (when status = CLOSED) |

**Relationships**:
- 1 CashClose → 1 User (who closed) via userId
- 1 CashClose → N Sales (period date match) — soft FK via date/locationId
- 1 CashClose → N Incomes (period date match)
- 1 CashClose → N Expenses (period date match)

**Validation Rules**:
- date: must be today or past (no future closes)
- UNIQUE (tenantId, locationId, date): prevents duplicate closes for same period
- status: OPEN → CLOSED only (immutable once CLOSED, no UPDATE/DELETE)
- calculatedTotal: computed server-side, never trusted from client
- Concurrent closes: first succeeds, second fails with 409 Conflict

**Immutability**:
- Once status = CLOSED, CashClose record locked
- No UPDATE allowed (RLS policy forbids it)
- No DELETE allowed (RLS policy forbids it)
- Only SELECT/INSERT allowed
- Corrections: create new Income/Expense records, not modify CashClose

**Impact on Related Records**:
- When CashClose created: all Sales/Incomes/Expenses for that period marked isClosed = true, closedAt = timestamp
- Prevents new Sales/Incomes/Expenses for that period (400 Bad Request "Cannot modify closed cash period")

**Calculation Details**:
```
calculatedTotal = SUM(Sales.totalAmount WHERE status IN ('ACTIVE', 'FINISHED', 'SETTLED') AND status != 'CANCELLED')
                + SUM(Income.amount WHERE status = 'ACTIVE' AND createdAt::date = date)
                - SUM(Expense.amount WHERE status = 'ACTIVE' AND createdAt::date = date)
```

**Indexes**:
- `UNIQUE (tenantId, locationId, date)` — prevents duplicate closes

---

## Relationships Diagram

```
User
  ├─ N → Sales (created)
  ├─ N → SaleItems (via Sale)
  ├─ N → Income (recorded)
  ├─ N → Expense (recorded)
  └─ N → CashClose (initiated)

Sale
  ├─ N SaleItems (line items)
  ├─ 1 Location (locationId)
  ├─ 1 User (created by)
  ├─ 0..1 Plan (if paymentType = BENEFIT)
  └─ linked to CashClose (by date + locationId)

Product
  └─ N SaleItems (sold)

Plan
  └─ 0..1 Sale (if paymentType = BENEFIT)

LocationStock
  ├─ N InventoryMovements (OUT when sale created)
  └─ N Sales (validates stock before)

CashClose
  ├─ linked to Sales (date match)
  ├─ linked to Incomes (date match)
  └─ linked to Expenses (date match)
```

---

## State Machines

### Sale Lifecycle

```
                    ┌─────────────┐
                    │   ACTIVE    │
                    └──────┬──────┘
                      /    |    \
                     /     |     \
        (pay)       /      |      \       (void)
                   /       |       \
                  /        |        \
            ┌─────────┐    |    ┌──────────┐
            │ FINISHED│    |    │CANCELLED │
            └────┬────┘    |    └──────────┘
                 |         |
         (reconcile)       |
                 |         |
            ┌─────────┐    |
            │ SETTLED │    |
            └─────────┘    |
                          (end)
```

**Transitions**:
- ACTIVE → FINISHED: user marks as paid (finishedAt = now())
- FINISHED → SETTLED: during/after CashClose (settledAt = now())
- ACTIVE → CANCELLED: user voids sale (cancelledAt = now(), create inverse InventoryMovement)
- From SETTLED: no further transitions (immutable)
- From CANCELLED: no further transitions (immutable)

---

### CashClose Lifecycle

```
                    ┌────────────┐
                    │    OPEN    │  (transient state)
                    └─────┬──────┘
                          |
                    (finalize)
                          |
                    ┌─────▼──────┐
                    │   CLOSED   │  (immutable, locked)
                    └────────────┘
```

**Transitions**:
- OPEN → CLOSED: when POST /api/cash-close initiated (createdAt = closedAt = now())
- CLOSED: final state, no changes allowed
- Duplicate close attempt: 409 Conflict (CLOSED already exists for period)

---

## Validation Rules Summary

### Sale Creation

```typescript
{
  // Required
  locationId: UUID,
  paymentType: PaymentType,
  items: [
    {
      productId: UUID,
      quantity: number > 0,
      unitPrice: Decimal >= 0,
      tax: Decimal >= 0,
    }
  ],
  // Optional
  notes: string <= 500,
  linkedPlanId: UUID (required if paymentType = BENEFIT),
}

// Server-side calculations:
- subtotal = SUM(qty * unitPrice + tax per item)
- totalAmount = subtotal
- folio = generate unique {LOC_CODE}-{YYYY}-{NNNNN}
- Verify stock: for each item, LocationStock >= quantity (real-time check)
```

### Income/Expense Creation

```typescript
{
  // Required
  locationId: UUID,
  type: IncomeType | ExpenseType,
  amount: Decimal > 0,
  // Optional
  customType: string <= 100,
  description: string <= 500,
}

// Constraints:
- status defaults to ACTIVE
- createdAt = now() (server-set, immutable)
```

### CashClose Creation

```typescript
{
  // Required
  locationId: UUID,
  date: Date,
  // Computed by service
  status = 'CLOSED',
  calculatedTotal = SUM(Sales) + SUM(Incomes) - SUM(Expenses),
}

// Constraints:
- UNIQUE (tenantId, locationId, date)
- Concurrent attempts: second fails with 409 Conflict
- Once created, immutable (no UPDATE/DELETE)
```

---

## Soft Deletes & Archival

**Income/Expense Soft Deletion**:
- Mark `status = CANCELLED`, set `cancelledAt = now()`
- Physically retained (audit trail)
- Excluded from CashClose aggregation: `WHERE status = 'ACTIVE'`

**Sale Cancellation**:
- Mark `status = CANCELLED`, create inverse InventoryMovement (IN) to restore stock
- CashClose includes CANCELLED sales for visibility (algebra shows as deduction)

**CashClose Immutability**:
- No soft delete — CashClose records are legally binding financial documents
- Corrections: create new Income/Expense records, not delete/modify CashClose

---

## Multi-Tenant & Location Isolation

### Application Layer Enforcement

```typescript
// SalesService.create(dto, user)
dto.tenantId = user.tenantId  // Extract from JWT, never from body
dto.locationId = (user.role === 'MANAGER') 
  ? user.locationId            // MANAGER: restrict to own location
  : dto.locationId             // OWNER/ADMIN: allow any location
  
// Similar for Income, Expense, CashClose services
```

### Database Layer Enforcement (RLS)

```sql
-- Table: Sale
CREATE POLICY sale_isolation ON Sale
  USING (tenantId = current_setting('app.current_tenant_id'))
  WITH CHECK (tenantId = current_setting('app.current_tenant_id'));

-- Similar policies on SaleItem, Income, Expense, CashClose
```

**TenantInterceptor** (all requests):
```
Request → JwtAuthGuard extracts tenantId from JWT
        → TenantInterceptor: SELECT set_config('app.current_tenant_id', tenantId)
        → Service executes query
        → TenantInterceptor: SELECT set_config('app.current_tenant_id', '') [cleanup]
```

---

## Indexes for Performance

```sql
-- Sale
CREATE INDEX idx_sale_tenant_location_date 
  ON Sale(tenantId, locationId, createdAt);
CREATE INDEX idx_sale_folio ON Sale(folio);
CREATE UNIQUE INDEX idx_sale_folio_unique 
  ON Sale(tenantId, locationId, folio) 
  WHERE status != 'CANCELLED';

-- Income
CREATE INDEX idx_income_tenant_location_date 
  ON Income(tenantId, locationId, createdAt);
CREATE INDEX idx_income_status 
  ON Income(tenantId, status);

-- Expense
CREATE INDEX idx_expense_tenant_location_date 
  ON Expense(tenantId, locationId, createdAt);
CREATE INDEX idx_expense_status 
  ON Expense(tenantId, status);

-- CashClose
CREATE UNIQUE INDEX idx_cashclose_period 
  ON CashClose(tenantId, locationId, date);
```

---

## API Contracts (Request/Response)

### POST /api/sales

**Request**:
```json
{
  "locationId": "uuid",
  "paymentType": "CASH | CREDIT | BENEFIT | INSURANCE | TRANSFER",
  "items": [
    {
      "productId": "uuid",
      "quantity": 5,
      "unitPrice": "100.00",
      "tax": "0.00"
    }
  ],
  "notes": "optional notes",
  "linkedPlanId": "uuid (required if paymentType=BENEFIT)"
}
```

**Response (201 Created)**:
```json
{
  "id": "uuid",
  "tenantId": "uuid",
  "locationId": "uuid",
  "folio": "LOC-2026-00001",
  "totalAmount": "500.00",
  "paymentType": "CASH",
  "status": "ACTIVE",
  "userId": "uuid",
  "items": [ { "id": "uuid", "productId": "uuid", "quantity": 5, ... } ],
  "createdAt": "2026-04-29T10:00:00Z"
}
```

### POST /api/income

**Request**:
```json
{
  "locationId": "uuid",
  "type": "SERVICE_FEE | DEPOSIT | TRANSFER | REFUND | OTHER",
  "amount": "500.00",
  "description": "optional",
  "customType": "optional"
}
```

**Response (201 Created)**:
```json
{
  "id": "uuid",
  "tenantId": "uuid",
  "locationId": "uuid",
  "type": "SERVICE_FEE",
  "amount": "500.00",
  "status": "ACTIVE",
  "userId": "uuid",
  "createdAt": "2026-04-29T10:00:00Z"
}
```

### POST /api/cash-close

**Request**:
```json
{
  "locationId": "uuid",
  "date": "2026-04-29"
}
```

**Response (201 Created)**:
```json
{
  "id": "uuid",
  "tenantId": "uuid",
  "locationId": "uuid",
  "date": "2026-04-29",
  "status": "CLOSED",
  "calculatedTotal": "600.00",
  "salesTotal": "500.00",
  "incomesTotal": "200.00",
  "expensesTotal": "100.00",
  "userId": "uuid",
  "createdAt": "2026-04-29T17:00:00Z",
  "closedAt": "2026-04-29T17:00:00Z"
}
```

---

## Schema Version

**Prisma Schema Version**: 1.0  
**Effective Date**: 2026-04-29  
**Last Updated**: 2026-04-29

All entities ready for migration generation via `npx prisma migrate dev --name add_sales_module`.
