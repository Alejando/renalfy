# Sprint 12 — Quick Reference

**Full plan:** `/Users/alejandroprado/pratum/renalfy/docs/sprints/sprint-12-receipts-ui.md`

---

## Quick Facts

| Item | Detail |
|---|---|
| **Sprint** | 12 — Receipts UI |
| **Duration** | 2 weeks |
| **Effort** | 30 story points |
| **Dependency** | Sprint 7 (Backend ✓), Sprint 10 (Patients UI) |
| **Blocking** | Sprint 11 (Appointments UI needs "Create Receipt" button) |
| **Folder** | `/apps/web/app/tenants/[slug]/(dashboard)/receipts/` |

---

## Key API Endpoints

```
POST   /api/receipts                  # Create receipt
PATCH  /api/receipts/:id/status      # Change state
GET    /api/receipts                  # List (paginated, filterable)
GET    /api/receipts/:id              # Detail
```

---

## State Machine

```
ACTIVE  ──→  FINISHED  ──→  SETTLED    (terminal)
  └──────────→  CANCELLED              (terminal)
```

---

## Payment Types

| Type | Color | Notes |
|---|---|---|
| CASH | Green (#16a34a) | Pago en efectivo |
| CREDIT | Orange (#ea580c) | Crédito/A vencer |
| BENEFIT | Purple (#a855f7) | Usa plan → **requires planId** |
| INSURANCE | Sky Blue (#0ea5e9) | Seguro/Cobertura |
| TRANSFER | Gray (#6b7280) | Transferencia bancaria |

---

## Components (18 total)

**Table & Listing (6):**
- ReceiptsPageClient, ReceiptTable, ReceiptFilters
- ReceiptStatusBadge, ReceiptPaymentTypeBadge
- receipt-row (implicit in table)

**Creation (6):**
- ReceiptCreateDrawer, ReceiptForm
- PatientSelect, ServiceTypeSelect, PlanSelect, AppointmentSelect

**Details & State (6):**
- ReceiptDetailClient, ReceiptStatusTransitionDrawer
- ReceiptInfo, PatientInfoCard, ServiceInfoCard, PlanInfoCard

---

## File Structure

```
receipts/
├── page.tsx + receipts-page-client.tsx          (List)
├── receipt-table.tsx + receipt-filters.tsx       (Table UI)
├── receipt-status-badge.tsx                      (Status badge)
├── receipt-payment-type-badge.tsx                (Payment badge)
├── receipt-create-drawer.tsx                     (Create modal)
├── receipt-form.tsx                              (Form)
├── patient-select.tsx                            (Selects)
├── service-type-select.tsx
├── plan-select.tsx
├── appointment-select.tsx
├── [id]/
│   ├── page.tsx + receipt-detail-client.tsx     (Detail)
│   ├── receipt-info.tsx                          (Info cards)
│   ├── patient-info-card.tsx
│   ├── service-info-card.tsx
│   └── plan-info-card.tsx
├── receipt-status-transition-drawer.tsx          (State change)
└── utils/
    ├── receipt-actions.ts                        (Server actions)
    ├── receipt-utils.ts                          (Helpers)
    └── receipt-constants.ts                      (Constants)
```

---

## 6 Implementation Phases

| Phase | Tasks | Days | Status |
|---|---|---|---|
| 1 | Setup folders | 0.5 | ⏳ |
| 2 | Table/List (badges, filters, pagination) | 2 | ⏳ |
| 3 | Create form (RHF, Zod, conditionals) | 2.5 | ⏳ |
| 4 | Details (cards, links) | 2 | ⏳ |
| 5 | State transitions (modal, validation) | 1 | ⏳ |
| 6 | Integration, E2E tests, polish | 1.5 | ⏳ |

---

## Key Decision Points

1. **Folio** generated in backend → show in toast → immutable
2. **BENEFIT** requires planId (FE + BE validation)
3. **Appointment** optional but auto-fills paciente + servicio
4. **State changes** explicit machine (backend source of truth)
5. **Server Actions** for create/update (safer than client fetch)

---

## Acceptance Criteria Checklist

### Creation
- [ ] Form validates with CreateReceiptSchema
- [ ] Folio generated, shown in toast
- [ ] BENEFIT requires plan
- [ ] Cita bidirectional (auto-fills)
- [ ] MANAGER/STAFF restricted to location

### List
- [ ] 20 items, paginated
- [ ] Ordered by date descending
- [ ] Filters combinable
- [ ] Responsive (mobile/tablet/desktop)
- [ ] Color badges correct

### Details
- [ ] Complete info loaded
- [ ] Links work (patient, appointment)
- [ ] State change opens modal
- [ ] MANAGER/STAFF see 404 if not their location

### State Change
- [ ] Only valid transitions shown
- [ ] SETTLED/CANCELLED immutable
- [ ] Toast on success

### Code Quality
- [ ] Zero `any`, `default`, `require()`
- [ ] Local imports with `.js`
- [ ] TDD: tests first
- [ ] 80%+ coverage
- [ ] `pnpm lint` ✓
- [ ] `pnpm check-types` ✓
- [ ] `pnpm test` ✓

---

## Zod Schemas (from @repo/types)

```ts
CreateReceiptSchema
UpdateReceiptStatusSchema
ReceiptQuerySchema
ReceiptResponseSchema
PaginatedReceiptsResponseSchema
```

All in: `/packages/types/src/receipts.schemas.ts`

---

## Color Reference

**Receipt Status:**
- ACTIVE: #3b82f6 (Blue)
- FINISHED: #eab308 (Yellow)
- SETTLED: #22c55e (Green)
- CANCELLED: #ef4444 (Red)

**Payment Type:**
- CASH: #16a34a (Dark Green)
- CREDIT: #ea580c (Orange)
- BENEFIT: #a855f7 (Purple)
- INSURANCE: #0ea5e9 (Sky Blue)
- TRANSFER: #6b7280 (Gray)

---

## Integration Points

1. **Patients UI (Sprint 10):**
   - Button "Crear recibo" in patient detail
   - Navigate to `/receipts?patientId=xxx`

2. **Appointments UI (Sprint 11):**
   - Button "Crear recibo" in appointment detail (if COMPLETED)
   - Navigate to `/receipts?appointmentId=xxx`
   - Should open drawer with form prefilled

3. **Future (Sprint 25-26):**
   - Export receipts as PDF/Excel
   - Reports/Analytics

4. **Future (Sprint 27):**
   - Notifications when receipt created/state changed

---

## Common Gotchas

1. **Folio is immutable** — don't include in edit form, only create
2. **BENEFIT requires plan** — validate this in FE + BE (double check!)
3. **Appointment bidirectional** — selecting appointment should auto-fill patient + service
4. **State transitions** — backend is source of truth, FE respects
5. **Responsive mobile** — table becomes card list on small screens
6. **Filters combinable** — AND logic (state AND payment type AND date)
7. **MANAGER/STAFF scoping** — both list AND detail views must check locationId
8. **Terminal states** — SETTLED/CANCELLED have no further transitions

---

## Testing Strategy (TDD)

1. Write test first (red)
2. Write minimal code to pass (green)
3. Refactor (clean up, extract, improve)

**Test files:**
- `receipts-page-client.test.tsx` — list view
- `receipt-form.test.tsx` — form validation
- `receipt-detail-client.test.tsx` — detail view
- `receipt-status-transition-drawer.test.tsx` — state changes
- `receipt-actions.test.ts` — server actions (optional, E2E covers)

**Target: 80%+ coverage**

---

## Related Documentation

- **Full Plan:** `/Users/alejandroprado/pratum/renalfy/docs/sprints/sprint-12-receipts-ui.md`
- **Backend (Sprint 7):** `/apps/api/src/receipts/`
- **Patients UI (Sprint 10):** `/apps/web/app/.../patients/`
- **Zod Schemas:** `/packages/types/src/receipts.schemas.ts`
- **CLAUDE.md:** Project conventions, TDD rules, code style

---

## Execution Checklist

- [ ] Read full sprint-12-receipts-ui.md
- [ ] Review backend endpoints and schemas
- [ ] Review Patients UI patterns (Sprint 10)
- [ ] Create folder structure (Phase 1)
- [ ] Start Phase 2 (Table/List)
- [ ] Follow TDD: test first, red → green → refactor
- [ ] Ensure 80%+ test coverage
- [ ] Run: `pnpm lint`, `pnpm check-types`, `pnpm test`
- [ ] Prepare integration points for Sprint 11

**Good luck! You've got this.**
