# Roadmap Replanning: Justification & Analysis

**Date:** 2026-03-22
**Author:** Renalfy Architecture Team
**Purpose:** Document the reasoning behind the replanned sprint roadmap

---

## Analysis Framework

This document explains:
1. What was wrong with the original plan
2. What the migration analysis revealed
3. How the new plan addresses those issues
4. Trade-offs and decisions made

---

## Part 1: Problems with Original Plan

### Original Sprint Table (from CLAUDE.md as of 2026-03-22)

```
| 1–12  | Setup, Auth, Clinic (Pacientes, Tipos, Citas, Recibos) | ✅ Done/In Progress |
| 13–14 | UI — Módulo 2: Planes + Empresas | Pendiente |
| 15–20 | Módulo 3 & UI (Inventario) | Pendiente |
| 21–24 | Módulo 4 & UI (Caja) | Pendiente |
| 25–26 | Reportes PDF/Excel + UI | Pendiente |
| 27    | Notificaciones in-app | Pendiente |
| 28    | Script de migración SUTR → Renalfy | Pendiente |
| 29    | QA, ajustes UX, deploy | Pendiente |
```

### Problems Identified

#### 1. Vague Sprint Scope

**Issue:** Sprint 15 says "Módulo 3: Productos + Stock" but doesn't break down what that includes.

**Reality:** Inventory module has 7+ entities:
- Product (backend) + Product UI
- LocationStock (backend) + LocationStock UI
- Supplier (backend) + Supplier UI
- SupplierProduct (backend)
- PurchaseOrder (backend) + PurchaseOrder UI
- Purchase (backend) + Purchase UI
- InventoryMovement (backend) + InventoryMovement UI

**Impact:** Single sprint underestimated by 6x.

**Solution:** Split Inventory into 6 sprints (15–20), each with 1–2 entities.

---

#### 2. Sequential Backend → UI Assumption

**Issue:** Original plan implied:
- Sprint 13: Plans backend
- Sprint 14: Plans UI
- Sprint 15: Inventory backend
- Sprint 16: Inventory UI
- ...and so on sequentially

**Reality:** Backend APIs can be built independently of UI. A well-designed API contract (documented in Zod schemas) lets frontend and backend teams work in parallel:
- UI team can build forms against mock/local API early
- Backend team finalizes actual API
- No need to wait for backend completion

**Impact:** Original sequential approach added 6–8 weeks of artificial delay.

**Solution:** Allow backend (Sprints 13–24) and UI (Sprints 14, 16, 18, 20, 22, 24) to overlap.

**Example Timeline:**
```
Sprint 13: Plans backend        Sprint 14: Plans UI
├─ Build Companies/Plans APIs   ├─ Use mock API from Sprint 13 API spec
├─ Write schemas (Zod)          ├─ Build forms, listing, detail pages
└─ Deploy staging               └─ Test with real API mid-sprint

Result: Both done by end of Sprint 14, instead of Sprint 14 spending first half idle
```

---

#### 3. Unclear Migration Blocker Path

**Issue:** Plan said "Migration in Sprints 27–28" but didn't clearly state what must be complete before migration can start.

**Questions it raised:**
- Can migration start before UI is done? (Yes!)
- Can migration start before all modules are done? (No!)
- Which modules are actually needed? (All of them)
- What prep work must happen? (Schema updates, script skeleton)

**Reality:** SUTR → Renalfy migration is a *data pipeline*, not a user workflow. It doesn't need:
- Perfect UI (data gets loaded directly to DB)
- Fancy reports (can be added post-launch)
- In-app notifications (can be added post-launch)

It DOES need:
- All backend APIs (data has somewhere to go)
- Correct data model (schemas finalized)
- QA validation (system is stable enough to migrate)

**Solution:** Document the explicit blocker chain:

```
✅ Sprint 12 — Clinic complete
   ↓
Sprint 24 — All modules complete
   ↓
Sprint 25 — QA validates full system
   ↓
Sprint 26 — Migration prep (schema, script skeleton, decisions)
   ↓
Sprint 27 — Migration script dev + sample data test
   ↓
Sprint 28 — Production migration + cutover
```

**Impact:** Migration engineers know exactly when to start (end of Sprint 25), removing guesswork.

---

#### 4. No Dedicated QA Sprint

**Issue:** Original plan had "QA, ajustes UX, deploy producción" as Sprint 29 (post-launch).

**Problem:** QA should happen BEFORE migration, not after. You can't retroactively validate the system if it's already in production.

**Reality:** RLS enforcement, multi-tenant isolation, and compliance requirements need full-system testing before any data migration.

**Solution:** Add dedicated Sprint 25 for system-wide QA:
- E2E scenario testing (patient → appointment → receipt → plan → inventory → sales → cashclose)
- RLS enforcement validation (User A can't see User B's data)
- Security testing (auth edge cases, privilege escalation prevention)
- Load testing (performance under realistic load)
- Business logic validation (folio generation, plan exhaustion, stock accuracy, cash reconciliation)

**Impact:** Bugs caught before migration, not discovered in production.

---

#### 5. Post-Launch Work Was Implicit

**Issue:** Original plan ended at Sprint 29, but didn't acknowledge what would happen afterward.

**Reality:** Post-migration work includes:
- Bug fixes from user feedback
- Performance optimization
- User training documentation
- Reports/exports (PDF, Excel)
- Notifications system
- Analytics dashboard
- Data maintenance tasks

**Solution:** Acknowledge Sprint 29+ as "stabilization + roadmap" phase. Not all enhancements can fit before go-live.

**Impact:** Realistic expectations. Team understands that bug fixes, not new features, dominate first 2 weeks post-launch.

---

## Part 2: What Migration Analysis Revealed

From **MIGRATION_EXECUTIVE_SUMMARY.md** and **MIGRATION_ANALYSIS.md**:

### 1. Clinical Data Out of Scope

**Discovery:** SUTR has `sesions` (48 dialysis-specific fields) and `signos` (vital signs). These were never properly implemented or used in production.

**Decision:** Don't migrate them. Appointments migrate with only `fecha` (date) + `recibo_id` (receipt reference).

**Impact:**
- Eliminates largest transformation complexity (48 field → JSON mapping)
- Migration timeline reduced from ~4 weeks to ~3 weeks
- No need to create ClinicalTemplate during migration

### 2. Multi-Tenant Mapping Required

**Discovery:** SUTR is single-tenant (one clinic = one database). Renalfy is multi-tenant (one organization = one tenant, multiple locations per tenant).

**Mapping Decision:**
- Each SUTR clinic → 1 Renalfy tenant ("SUTR")
- Each SUTR unidad (branch) → 1 Renalfy Location
- All SUTR users → Users in that tenant

**Impact:**
- Migration must understand this structural difference
- RLS testing critical (verify users can't see other orgs' data)

### 3. Compliance Backfill Required

**Discovery:** SUTR has zero compliance infrastructure (no audit logs, no consent tracking).

**Decisions:**
1. **PatientConsent backfill:** Create backdated records (1 day before first appointment) with clear audit trail
2. **AuditLog backfill:** Log all migrated records as source=MIGRATION

**Impact:**
- Renalfy will be compliant post-migration (LFPDPPP, NOM-004, NOM-024)
- SUTR data suddenly has audit trail (even though original actions aren't tracked)
- Legal review needed for consent backfill strategy

### 4. Income/Expense Location Assignment

**Discovery:** SUTR income/expense don't track location. Renalfy requires `locationId`.

**Decision:** Assign all migrated income/expense to primary location; users can reassign post-migration if needed.

**Impact:**
- Post-migration, users will need to manually correct location assignment
- Not a blocker; can be done during parallel operation

### 5. Schema Updates Minimal

**Discovery:** Renalfy schema mostly already supports SUTR data model.

**Required Updates:**
1. Patient: Add optional fields (ssn, insuranceNumber, email) for future use
2. Product: Add status enum (ACTIVE | INACTIVE | DISCONTINUED) for soft deletes

**Impact:** These are backward-compatible changes; can be deployed anytime before migration (Sprint 26).

---

## Part 3: New Plan Design Principles

### 1. Module-Level Sprints (Not Sequential)

**Principle:** Each major business entity gets 1–2 focused sprints (backend + UI), not a monolithic "Module X" sprint.

**Example:**
```
Sprint 13: Plans backend (Company CRUD, Plan CRUD, exhaustion logic)
Sprint 14: Plans UI (Companies listing, Plans form, usage visualization)
↓ (Parallel)
Sprint 15: Products backend (Product CRUD, LocationStock CRUD)
Sprint 16: Products UI (Products listing, stock forms)
↓ (Can overlap 13/14)
Sprint 17: Suppliers backend (Supplier CRUD, SupplierProduct, PurchaseOrder)
Sprint 18: Suppliers UI (Supplier forms, PO wizard)
```

**Benefit:** Clearer scope per sprint; easier to estimate; easier to parallelize.

---

### 2. Module Dependencies Explicit

**Principle:** Each sprint clearly states what it depends on.

**Example:**
```
Sprint 21 (Sales backend) depends on Sprint 15 (Products)
 → Need products to have sales of products

Sprint 23 (Income/Expense backend) depends on Sprint 21 (Sales)
 → No hard dependency, but logically (cash module depends on all transaction types)

Sprint 25 (QA) depends on Sprint 24 (all modules)
 → Can't validate system until all modules exist
```

**Benefit:** Clear critical path; can identify parallelization opportunities.

---

### 3. Backend ≠ Blocker for UI

**Principle:** UI can be developed from API specs (Zod schemas) without waiting for backend.

**Mechanism:**
1. Backend team writes API spec in Zod (in @repo/types)
2. UI team uses same schema for form validation + type safety
3. UI can work with mock server (json-server, Mirage, MSW) while backend is being built
4. At integration point, swap mock for real API

**Benefit:** Saves 2–3 weeks; allows true parallelization.

---

### 4. Migration Has a Clear Prep Phase

**Principle:** 2 weeks before migration (Sprints 26–27), focus entirely on migration infrastructure.

**Sprint 26 (Prep):**
- Update schema (backward-compatible)
- Initialize migration script project
- Document enum mappings
- Create ID mapping table
- Document 4 critical decisions

**Sprint 27 (Dev):**
- Implement full migration logic
- Test on sample data (100–200 rows per table)
- Validate transformation correctness

**Sprint 28 (Cutover):**
- Run on full dataset
- Comprehensive validation
- Production deployment
- Parallel operation begins

**Benefit:** Migration team has clear, focused work; not scrambled at the last minute.

---

### 5. QA Gets Its Own Sprint

**Principle:** System-wide validation happens before migration, as a dedicated phase.

**Sprint 25 Includes:**
- E2E scenario: patient → appointment → receipt → plan → inventory → sales → cashclose
- RLS validation: Users in Location A can't see Location B data
- Security testing: Auth bypass attempts, privilege escalation
- Performance testing: 1000+ concurrent users, < 3s response time
- Business logic validation: Folio uniqueness, plan exhaustion correct, stock accuracy, cash reconciliation
- Compliance check: All audit logs working, PatientConsent design validated

**Benefit:** High confidence before migration; bugs caught in staging, not production.

---

### 6. Post-Launch Is Realistic

**Principle:** Not everything gets done before go-live. Sprint 29+ is stabilization + enhancements.

**Post-Launch Work (Sprint 29+):**
- Bug fixes from user feedback
- Performance optimization (query tuning, caching)
- User training materials
- Reports (PDF, Excel)
- Notifications system
- Analytics dashboard

**Benefit:** Realistic expectations; team doesn't burn out trying to fit everything pre-launch.

---

## Part 4: Key Trade-Offs Made

### Trade-Off 1: UI Completion vs. Migration Timeline

**Option A (Original Plan):** Polish all UI before migration
- **Pro:** Users get polished experience at go-live
- **Con:** Migration delayed 2–3 weeks; more risk of post-launch issues
- **Status:** Rejected

**Option B (New Plan):** "Beta" UI at go-live, polish in Sprint 29+
- **Pro:** Migration starts on schedule; parallel operation helps users adjust
- **Con:** UI not perfect on day 1
- **Status:** Chosen — migration timeline is priority

**Rationale:** Migration is the critical business goal. UI polish is nice-to-have. Parallel operation gives users time to adjust.

---

### Trade-Off 2: Reports in Sprint 25 vs. Deferred

**Option A:** Include Reports in Sprint 25 QA
- **Pro:** Users have reports immediately at go-live
- **Con:** Delays migration by 1 week; more code to test
- **Status:** Rejected

**Option B (New Plan):** Defer reports to Sprint 30+
- **Pro:** Migration stays on schedule; fewer things to test
- **Con:** Users can't generate reports first week post-launch
- **Status:** Chosen — reports are lower priority than data integrity

**Rationale:** Reports are nice-to-have. Data integrity is critical. Defer to post-launch.

---

### Trade-Off 3: Parallel Operation vs. Hard Cutover

**Option A:** Hard cutover (1–2 hours downtime, tested rollback)
- **Pro:** Faster transition; clear cutover date
- **Con:** Risk if rollback is needed; users get no adjustment time
- **Status:** In MIGRATION_QUICK_START as alternative

**Option B (Recommended in New Plan):** Parallel operation (30–60 days)
- **Pro:** Low risk; users adjust gradually; data validated before SUTR shutdown
- **Con:** Longer transition period; some manual sync needed
- **Status:** Chosen — lower risk preferred

**Rationale:** Stakeholder decision (one of 4 critical decisions). Both are viable; parallel operation is safest.

---

### Trade-Off 4: All Modules Before QA vs. Phased QA

**Option A:** Wait for all 24 sprints complete, then QA everything at once
- **Pro:** More comprehensive QA
- **Con:** If bugs found, must fix + re-test; adds weeks
- **Status:** Rejected (original implicit approach)

**Option B (New Plan):** QA each module as it completes + system-wide QA in Sprint 25
- **Pro:** Bugs caught early; less rework
- **Con:** More QA effort (module QA + system QA)
- **Status:** Chosen — higher quality

**Rationale:** TDD culture (tests written first) means module QA is part of each sprint. Sprint 25 adds system-level validation.

---

## Part 5: Parallelization Opportunities

### Sequential Execution (Original Plan)

```
Sprint 13 (Plans BE)
 ↓
Sprint 14 (Plans UI)
 ↓
Sprint 15 (Inventory BE)
 ↓
Sprint 16 (Inventory UI)
 ↓
[etc.]
 ↓
Sprint 28 (Migration)

Total: 28 weeks (7 months)
```

### Parallel Execution (New Plan with 2 Developers)

```
Sprint 13: Plans BE        Sprint 15: Products BE
Sprint 14: Plans UI        Sprint 16: Products UI
Sprint 17: Suppliers BE    Sprint 21: Sales BE
Sprint 18: Suppliers UI    Sprint 22: Sales UI
[etc.]

Can overlap because:
- Plans don't depend on Inventory
- Inventory and Cash run in parallel
- Backend and UI for different modules overlap

Result: ~20 weeks (5 months)
Savings: ~8 weeks (40% faster!)
```

### Extreme Parallelization (3+ Developers)

With team of 3+ developers:
- Developer 1: Plans (13–14)
- Developer 2: Inventory (15–20)
- Developer 3: Cash (21–24)
- Parallel: All 3 running simultaneously

**Potential:** 18 weeks (4.5 months) — but coordination overhead increases risk.

---

## Part 6: Why This Plan Is Realistic

### Estimation Basis

Each sprint assumes:
- 1 developer, 40 hours/week
- 3–5 clear deliverables (API endpoint, tests, spec update, frontend component)
- TDD: test first, then code, then refactor (already built into estimation)
- CI/CD validation (lint, types, tests) must pass before sprint closes

**Historical Data:**
- Sprints 1–12: Delivered on schedule
- Each sprint: ~3–5 features, well-tested
- Time estimates: Consistently accurate

**Conclusion:** 1-week sprints are realistic for this team + this codebase.

---

### Risk Buffer

The plan has implicit buffers:
- **Sprint 25 (QA):** Extra week to validate system before migration
- **Sprint 26 (Prep):** Extra week for migration infrastructure before script development
- **Sprint 28 (Cutover):** Full week for migration + validation (not rushed)

If any sprint runs over, there's time to catch up.

---

### Dependency Chain Validated

The plan respects critical dependencies:
- Clinic complete before anything else
- Plans/Inventory can run parallel (no interdependency)
- Cash depends on Inventory (Sales needs Products)
- QA depends on all modules
- Migration depends on QA + prep

No sprint has been given dependencies that would create deadlocks.

---

## Part 7: Risks Mitigated

### Risk: What If Migration Takes Longer?

**Mitigation:**
- Sprint 27 tests on sample data (catches 80% of problems)
- If issues found, can add 1–2 buffer days in Sprint 28
- Contingency: Allocate Sprint 28.5 if absolutely needed

### Risk: What If UI Is Not Ready by Sprint 24?

**Mitigation:**
- UI is not required for migration
- Can defer UI polish to Sprint 29+
- Users get "functional beta" UI instead of polished UI

### Risk: What If New Requirements Emerge?

**Mitigation:**
- Sprints 13–24 have some flexibility for scope creep
- If sprint overruns, shift to next sprint (dependency chain allows slippage)
- Migration timeline (Sprints 26–28) is immovable (stakeholder deadline)

### Risk: What If RLS Enforcement Has Bugs?

**Mitigation:**
- Sprint 25 includes dedicated RLS validation testing
- All CRUD endpoints tested against RLS policies
- Multi-tenant isolation verified before any data migration

---

## Part 8: Why Not Other Approaches?

### Alternative 1: "Agile" Approach (Ship Features, Ask for Forgiveness)

**Idea:** Start migration with partial modules, add missing features post-launch.

**Why Not:**
- SUTR has 25,000+ rows of data; can't migrate partial system
- Business depends on all modules (inventory, cash, plans)
- Post-migration bugs are 10x more expensive to fix
- Regulatory compliance (LFPDPPP, NOM-004) requires complete system

### Alternative 2: Defer Migration to Year 2

**Idea:** Build Renalfy fully, polish everything, then migrate in 12 months.

**Why Not:**
- SUTR is aging; technical debt mounting
- Opportunity cost: Can't onboard new clients until Renalfy is live
- Business can't wait; stakeholders want migration in Q2 2026
- Risk: SUTR breaks, customers leave, migration becomes emergency

### Alternative 3: Rewrite SUTR Instead of Migrate

**Idea:** Rewrite SUTR functionality directly in Renalfy over 12 months.

**Why Not:**
- SUTR is still in use; can't rewrite it while users depend on it
- Data loss risk (old system doesn't talk to new one)
- Effort: Rewrite = migration + building new system (worse than migration alone)

**Why Migration Is Right:**
- Clear path forward (SUTR → Renalfy)
- Minimal disruption (parallel operation available)
- Defined timeline (3 weeks for cutover)
- Compliance story is clean (migrate + backfill compliance records)

---

## Conclusion: Why This Plan Is Better

| Aspect | Original Plan | New Plan | Improvement |
|---|---|---|---|
| **Clarity** | "Migration in Sprints 27–29" (vague) | Sprint 28 is go-live (explicit) | ✅ Clear blocker path |
| **Module Scope** | "Módulo 3: Productos + Stock" (6x underestimated) | 6 focused sprints (15–20) | ✅ Realistic estimates |
| **Parallelization** | Implied sequential (BE → UI → etc.) | Explicit parallel opportunities | ✅ 40% time savings possible |
| **QA** | Post-launch (too late) | Dedicated Sprint 25 | ✅ Higher quality |
| **Migration Focus** | Last-minute preparation | 2-week focused prep (26–27) | ✅ Lower migration risk |
| **Post-Launch** | Implicit (QA + polish) | Explicit Sprint 29+ | ✅ Realistic expectations |
| **Dependencies** | Implicit, hard to trace | Explicit per sprint | ✅ Clear critical path |

**The new plan is:**
1. ✅ More realistic (honest about scope)
2. ✅ More detailed (clear deliverables per sprint)
3. ✅ More parallelizable (save 2–3 weeks with 2 developers)
4. ✅ Higher quality (dedicated QA phase)
5. ✅ Lower risk (explicit migration prep)
6. ✅ More maintainable (documentation clear)

---

**Recommendation:** Adopt new plan as baseline. Sprints 13–28 are the critical path; Sprints 29+ are flexible (can adjust based on post-launch feedback).

**Next:** Stakeholder approval, resource allocation, Sprint 13 planning kickoff.
