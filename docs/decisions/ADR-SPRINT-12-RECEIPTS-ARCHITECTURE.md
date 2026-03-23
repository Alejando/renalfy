# ADR-Sprint-12: Receipts UI Architecture

**Date:** 2026-03-22
**Status:** Accepted
**Context:** Designing the UI for the Receipts module (Sprint 12) following patterns from Patients UI (Sprint 10) and integrating with Receipts Backend (Sprint 7).

---

## Context

The Receipts backend (Sprint 7) is complete with all CRUD endpoints:
- `POST /api/receipts` — atomic folio generation
- `PATCH /api/receipts/:id/status` — state transitions
- `GET /api/receipts` — list with filtering
- `GET /api/receipts/:id` — detail view

The Receipts domain has complex rules:
1. **State machine:** ACTIVE → (FINISHED | CANCELLED), FINISHED → SETTLED, states are terminal
2. **BENEFIT payments:** increment plan.usedSessions, mark EXHAUSTED if threshold reached
3. **Appointment association:** optional but bidirectional (selecting appointment auto-fills patient + service)
4. **Folio generation:** atomic, sequential per location/year, immutable (NOM-004-SSA3 compliance)
5. **RLS enforcement:** MANAGER/STAFF see only their locationId (both list and detail)

The UI must follow:
- **TDD:** Red → Green → Refactor
- **shadcn/ui:** consistent design system
- **Zod schemas:** single source of truth in @repo/types
- **Next.js 16:** Server Components by default, Client Components only for interactivity

---

## Decisions

### ADR-S12-D1: Folio as Immutable Backend-Generated Field

**Decision:**
The receipt folio is generated atomically in the backend during creation and is never editable. The format is `{LOC}-{YYYY}-{NNNNN}` (e.g., `"CEN-2026-00001"`).

**Rationale:**
1. **Uniqueness guarantee:** Backend controls the counter to prevent race conditions (atomic transaction)
2. **NOM-004-SSA3 compliance:** Clinical records must be immutable; folio is part of the identity
3. **Simpler UI:** Folio field is not part of creation form; just shown in response/toast
4. **Single source of truth:** Format logic is in backend, no duplication

**Implications:**
- The `CreateReceiptDto` does NOT have a `folio` field
- After creation, folio is shown in success toast
- Detail view displays folio prominently but cannot be changed
- No edit/update endpoint for receipt core fields (only status transitions allowed)

**Alternatives Considered:**
- Client generates folio: ❌ Risk of duplicates, races, violates immutability principle
- Folio as editable field: ❌ Breaks NOM-004-SSA3, enables audit fraud

---

### ADR-S12-D2: State Transitions Defined in Backend, Frontend Respects

**Decision:**
The valid state transitions are defined in the backend (`VALID_RECEIPT_TRANSITIONS` constant). The frontend reads these indirectly by only showing buttons for transitions the backend will accept. Attempting an invalid transition results in a 400 Bad Request.

**Rationale:**
1. **Single source of truth:** Backend is authoritative on allowed transitions
2. **Security:** Cannot bypass business rules from client-side manipulation
3. **Forward compatibility:** If business rules change, backend change propagates immediately
4. **UX clarity:** Frontend only shows valid buttons, no confusing disabled states

**Implications:**
- The UI component `ReceiptStatusTransitionDrawer` does NOT hardcode transitions; it derives them from current status:
  - If status === "ACTIVE": show buttons for [FINISHED, CANCELLED]
  - If status === "FINISHED": show button for [SETTLED]
  - If status in [SETTLED, CANCELLED]: show "No transitions available"
- The modal should make this logic clear (e.g., "This receipt cannot be further modified")
- Error handling: if backend returns 400 (invalid transition), show user-friendly toast

**Alternatives Considered:**
- Frontend hardcodes transitions: ❌ Duplication, breaks on backend changes
- Status change is open-ended (any→any): ❌ No business logic protection

---

### ADR-S12-D3: BENEFIT Payments Require PlanId (Frontend + Backend Validation)

**Decision:**
When `paymentType === 'BENEFIT'`, the `planId` field is mandatory. Both frontend (form validation) and backend (DTO validation) enforce this.

**Rationale:**
1. **Business rule:** A BENEFIT payment must increment a plan's sessions. Without a plan, the action is incomplete.
2. **Early feedback:** FE validation catches the error before API call
3. **Defense in depth:** BE validation ensures the API is never called without planId even if FE is bypassed
4. **UX:** Plan field appears conditionally only when BENEFIT is selected

**Implications:**
- `ReceiptForm` has conditional rendering: `{paymentType === 'BENEFIT' && <PlanSelect required={true} />}`
- React Hook Form marks the field as required in the condition
- Error message: "Plan is required for BENEFIT payments"
- The `PlanSelect` filters to status !== "EXHAUSTED" (offer only viable plans)
- Toast error if user tries to create BENEFIT without plan: "Plan is required"

**Alternatives Considered:**
- BENEFIT doesn't require plan: ❌ Breaks business logic (sessions not incremented)
- Only backend validates: ❌ Poor UX (form submits, returns error, user confused)

---

### ADR-S12-D4: Appointment Association is Optional but Bidirectional

**Decision:**
When creating a receipt, the user can optionally associate it with a completed appointment. When an appointment is selected, the patient and service fields auto-populate from the appointment.

**Rationale:**
1. **Workflow efficiency:** Creating a receipt from an appointment is the primary flow; auto-filling patient + service saves data entry
2. **Data consistency:** Appointment already has patient + service; reuse that link
3. **Optional:** Receipts can be created standalone (without appointment) for manual sessions
4. **Validation:** Only COMPLETED appointments without existing receipts are selectable (business rule)

**Implications:**
- `AppointmentSelect` is optional in the form
- `AppointmentSelect` fetches from `/api/appointments?status=COMPLETED&patientId={patientId}&receiptId=null`
- When appointment is selected, a `useEffect` triggers:
  ```ts
  useEffect(() => {
    if (selectedAppointment) {
      form.setValue('patientId', selectedAppointment.patientId);
      form.setValue('serviceTypeId', selectedAppointment.serviceTypeId);
    }
  }, [selectedAppointment]);
  ```
- Patient field is marked `disabled` or visually indicated as "from appointment"
- If user later changes appointment selection, patient + service are re-synced

**Alternatives Considered:**
- No appointment integration: ❌ Forces re-entry of already-known data
- Appointment required: ❌ Blocks manual receipt creation, inflexible

---

### ADR-S12-D5: Server Actions for Create/Update Instead of Direct Fetch

**Decision:**
Use Next.js Server Actions (functions marked `'use server'`) to handle `createReceipt` and `updateReceiptStatus` instead of making fetch calls from the client component.

**Rationale:**
1. **Security:** JWT token never exposed to client JavaScript; backend receives it from middleware
2. **Simpler error handling:** Server actions naturally throw exceptions, which can be caught in the client component
3. **Automatic revalidation:** Server actions can revalidate Next.js caches without client-side refetch
4. **Consistency:** Aligns with Next.js 16 best practices and existing patterns (if already used in Patients UI)

**Implications:**
- File `receipt-actions.ts` contains:
  ```ts
  'use server';

  export async function createReceipt(dto: CreateReceiptDto) {
    const res = await fetch(..., { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(res.statusText);
    return res.json();
  }
  ```
- The form uses `action={createReceipt}` prop (or manual call with async handling)
- Error handling in the client:
  ```ts
  try {
    const result = await createReceipt(formData);
    toast.success(`Recibo creado: ${result.folio}`);
  } catch (error) {
    toast.error(error.message);
  }
  ```

**Alternatives Considered:**
- Direct fetch from client: ❌ Token exposure, less secure
- tRPC: ❌ Adds complexity not yet in the project

---

### ADR-S12-D6: MANAGER/STAFF Location Filtering in Both List and Detail Views

**Decision:**
Both the receipts list (`ReceiptsPageClient`) and detail view (`ReceiptDetailClient`) filter results to the user's `locationId`. MANAGER and STAFF users can only see receipts from their assigned location.

**Rationale:**
1. **Multi-location safety:** Prevents cross-location data leakage
2. **RLS enforcement:** Backend query filters by locationId via RLS; frontend mirrors this for UX
3. **Audit compliance:** Users cannot accidentally view receipts outside their scope

**Implications:**
- The backend already enforces this via RLS (SQL policies)
- Frontend passes `locationId` from session to `ReceiptsPageClient`
- List view: server-side filtering in `findAll` (already in backend)
- Detail view: 404 if `locationId` mismatch
- ADMIN/OWNER users see all locations (no restriction)
- Optional location selector in toolbar for ADMIN/OWNER

**Alternatives Considered:**
- Only backend filters: ❌ User confusion ("receipt doesn't exist" when they can't access it)
- Frontend-only filtering: ❌ Insufficient (doesn't prevent backend bypass)

---

## Consequences

### Positive
1. **Immutable folio ensures audit trail integrity** — NOM-004 compliance
2. **State machine clarity** — no ambiguous intermediate states
3. **Conditional plan field** — UX adapts to payment type, clear validation
4. **Server Actions safety** — JWT never exposed, simpler error handling
5. **Bidirectional appointment** — efficient workflows

### Negative (Mitigated)
1. **Folio only shown after creation** — user must wait for response (mitigated by fast API)
2. **Plan selector visible only for BENEFIT** — UI complexity (mitigated by clear conditional UX)
3. **Appointment selection requires patient first** — may need search/autocomplete (mitigated by good UX)

---

## Testing Implications

1. **Folio generation:** Test that folio is present in response, correctly formatted, and same folio not created twice
2. **State transitions:** Test invalid transitions return 400, valid ones succeed
3. **BENEFIT validation:** Test form rejects BENEFIT without plan, test conditional field appears/disappears
4. **Appointment bidirectional:** Test patient + service auto-populate when appointment selected
5. **Location filtering:** Test MANAGER sees only their location in list + detail, ADMIN sees all
6. **Server Actions:** Test error handling (toast on BadRequest, network error, etc.)

---

## Future Considerations

1. **Receipts PDF export** (Sprint 25-26): Will need to format folio prominently
2. **Notifications** (Sprint 27): May emit event when receipt created or state changed
3. **Receipt amendments** (Future): If business requires corrections post-creation, implement as new receipt with reference to original (maintains immutability)

---

## References

- ADR-D: Dates specified in CLAUDE.md "Decisión-Making Framework"
- NOM-004-SSA3: Expediente clínico electrónico (immutability requirements)
- Sprint 7: Receipts backend implementation
- Sprint 10: Patients UI patterns (reference for form structure)
- CLAUDE.md: TDD, RLS, Zod schemas, Next.js conventions
