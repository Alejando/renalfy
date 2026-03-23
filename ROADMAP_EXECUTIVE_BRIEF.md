# Renalfy Roadmap Replanning — Executive Brief

**Date:** 2026-03-22
**Prepared for:** Product Owner, Technical Lead, Stakeholders
**Status:** Ready for Approval

---

## The Bottom Line

**Migration Target:** Sprint 28 (mid-May 2026)
**Path:** Complete all backend modules (Sprints 13–24) → QA (Sprint 25) → Prep (Sprint 26) → Migrate (Sprints 27–28)
**Timeline:** 7 months (1 developer) or 5 months (2 developers)
**Risk:** Low (tested rollback plan, full backup, parallel operation available)

---

## What Changed from Original Plan?

### Original Plan (from CLAUDE.md)
```
Sprints 1–12: Clinic ✅
Sprints 13–26: Modules (sequential: Planes → Inventario → Caja → Reports → Notifications)
Sprints 27–29: Migration
```

**Problems:**
- Too much assumed to happen sequentially
- Migration start date was vague ("Sprints 27–29")
- UI dependencies unclear
- No dedicated QA sprint

### New Plan (Replanned 2026-03-22)
```
Sprints 1–12: Clinic ✅
Sprints 13–24: Modules (can parallelize: backend+UI for different modules at same time)
Sprint 25: QA (dedicated system-wide testing)
Sprint 26: Migration Prep (schema update + script skeleton)
Sprints 27–28: Migration (script development + production cutover)
Sprint 29+: Post-launch (stabilization + enhancements)
```

**Improvements:**
- Clear migration blocker path (what must be done first)
- Explicit QA phase (not afterthought)
- UI can start early; doesn't block migration
- Backend + UI can run in parallel
- Realistic post-launch roadmap

---

## Key Insight: UI Is NOT Required for Migration

The migration script connects directly to both SUTR and Renalfy databases. Users don't interact with the UI during migration — they're just copied.

**What this means:**
- Backend can be tested/ready weeks before UI is polished
- UI can be "functional but minimal" at go-live (polish in Sprint 29+)
- Migration can start Sprint 27 regardless of UI completion status
- Saves 2–3 weeks vs. original plan

---

## Module Scope & Dependencies

### Clinic Module (✅ Done or in progress)
- Patients ✅ (Sprint 5)
- ServiceTypes ✅ (Sprint 5)
- Appointments ✅ (Sprint 6, UI in Sprint 12)
- Receipts ✅ (Sprint 7, UI in Sprint 11)
- **Blocker:** None — clinic is complete

### Plans Module (Sprints 13–14)
- Companies (backend Sprint 13, UI Sprint 14)
- Plans (backend Sprint 13, UI Sprint 14)
- **Blocker:** Clinic complete; plans track benefit usage on receipts

### Inventory Module (Sprints 15–20)
- Products + LocationStock (backend 15, UI 16)
- Suppliers + PurchaseOrders (backend 17, UI 18)
- Purchases + InventoryMovements (backend 19, UI 20)
- **Blocker:** Plans complete; inventory is independent

### Cash Module (Sprints 21–24)
- Sales (backend 21, UI 22)
- Income + Expense + CashClose (backend 23, UI 24)
- **Blocker:** Inventory complete; cash tracks all transactions

### QA (Sprint 25)
- End-to-end testing (patient → appointment → receipt → plan → sales → cashclose)
- RLS enforcement (multi-tenant isolation)
- Performance testing
- **Blocker:** All modules complete

### Migration Prep (Sprint 26)
- Schema updates (Patient optional fields + Product status enum)
- Migration script skeleton (TypeScript project)
- Enum mappings (SUTR → Renalfy)
- Decision documentation (consent, location, folio, go-live)
- **Blocker:** QA complete; script ready to develop

### Migration Dev (Sprint 27)
- Full migration logic implemented (28 tables, ~25,000 rows)
- Tested on sample SUTR data
- ID mapping validated
- **Blocker:** Prep complete

### Migration Cutover (Sprint 28)
- Full production migration
- Comprehensive validation
- Rollback tested
- Users migrated + parallel operation begins
- **Blocker:** Dev complete

---

## Effort Estimation

| Phase | Sprints | People | Weeks | Status |
|---|---|---|---|---|
| **Clinic** | 1–12 | 1 | 12 | ✅ Done/In Progress |
| **Plans** | 13–14 | 1 | 2 | Pending |
| **Inventory** | 15–20 | 1–2 | 6 | Pending (parallelizable) |
| **Cash** | 21–24 | 1 | 4 | Pending |
| **QA** | 25 | 1 | 1 | Pending |
| **Migration Prep** | 26 | 1 | 1 | Pending |
| **Migration Dev** | 27 | 1 | 1 | Pending |
| **Migration Cutover** | 28 | 1 + DBA | 1 | Pending |
| **Post-Launch** | 29+ | 1–2 | Ongoing | Pending |
| **TOTAL** | **28 sprints** | **1–2 FTE** | **~28 weeks (1 FTE)** | |

### Acceleration Opportunities

- **With 2 developers:** Backend (13–24) + UI (14–24) can overlap → saves ~4 weeks → total ~20 weeks
- **With 3 developers:** Inventory (15–20) + Caja (21–24) can run in parallel → saves another 2–3 weeks → ~18 weeks possible

---

## The Migration Timeline (Sprints 27–28)

### Why 3 Weeks Total?

**Sprint 27 (1 week):**
- Develop full migration script: extract SUTR → transform → load Renalfy
- Test on sample SUTR data (100–200 rows per table)
- Validate data integrity (referential integrity, no missing FKs)
- Fix bugs

**Sprint 28 (1 week):**
- Run on full SUTR production backup (25,000+ rows)
- Comprehensive validation:
  - Row counts match (every table)
  - Business logic correct (folio format, plan exhaustion, stock, cash totals)
  - Compliance met (PatientConsent created, AuditLog populated)
- Performance test (queries < 1s under load)
- Rollback test (can revert in < 2 hours)
- Final stakeholder sign-off
- Production cutover (1–2 hour maintenance window)
- Parallel operation begins (SUTR + Renalfy both live)

### Parallel Operation (30–60 Days Post-Migration)

Instead of a hard cutover, run SUTR and Renalfy simultaneously:
- **SUTR:** Read-only mode (no new data entry)
- **Renalfy:** Live (users slowly transitioned, data validated)
- **Sync:** Some tables kept in sync (patients, receipts) for validation
- **Benefit:** Low risk; users build confidence; bugs caught before SUTR shutdown

**Decision needed:** Hard cutover (risky but fast) or parallel operation (safe but slower)?

---

## Critical Dependencies & Blockers

```
Must-Have Order:
1. ✅ Sprint 12: Clinic complete (clinic is foundation)
   ↓
2. Sprint 24: All modules complete (nothing left to do)
   ↓
3. Sprint 25: QA validates full system (ready to migrate)
   ↓
4. Sprint 26: Migration infrastructure ready (schema, script skeleton)
   ↓
5. Sprint 27: Full migration tested on sample data (script works)
   ↓
6. Sprint 28: Production migration (go-live)

Optional Parallelization:
- Sprints 13–24: Different modules can run in parallel
  - Example: Sprint 13 (Plans backend) + Sprint 16 (Products UI) can overlap
  - Example: Sprint 15 (Products backend) + Sprint 21 (Sales backend) can overlap
```

### No Blockers Between Modules?

**Plans (13–14)** depends only on Clinic (12) — no other modules needed.
**Inventory (15–20)** depends on Clinic (12) — can start independently.
**Cash (21–24)** depends on Inventory (15) — needs Products for Sales.

**Implication:** Inventory and Plans can run in parallel! Start both Sprint 13 and 15 simultaneously.

---

## Risks & Mitigations

### High-Risk: Migration Timeline

**Risk:** Migration script takes longer than 1 week to develop or test.
**Likelihood:** Medium (complex data transform, ~28 tables)
**Mitigation:**
- Sprint 26 builds reusable skeleton (connection logic, ID mapping, transformation helpers)
- Sprint 27 plugs in transformation logic per module
- Test on sample data first (catch 80% of bugs before full run)
- **Contingency:** Allocate 1 bonus week (Sprint 28.5) if needed

### High-Risk: Data Validation

**Risk:** Data is migrated but reconciliation finds mismatches (folio duplicates, stock wrong, cash off).
**Likelihood:** Low (good test coverage on transformation logic)
**Mitigation:**
- Sprint 25 (QA) ensures all business logic working correctly
- Sprint 27 tests transformation on sample SUTR data with known results
- Sprint 28 reconciliation checklist (row counts, cash totals, folio uniqueness)
- **Contingency:** Rollback plan tested; full backup retained

### Medium-Risk: User Confusion

**Risk:** New UI confuses users post-migration; they go back to SUTR.
**Likelihood:** Medium (UI is quite different from legacy system)
**Mitigation:**
- Parallel operation (30–60 days) gives users time to adjust
- Training materials + walkthrough videos in Sprint 29
- Dedicated support channel first 2 weeks
- **Contingency:** Keep SUTR operational as safety net

### Low-Risk: Performance Degradation

**Risk:** System slow post-migration under real load.
**Likelihood:** Low (staging environment tests load)
**Mitigation:**
- Sprint 25 includes load testing (1000+ concurrent users)
- Sprint 28 performance validation on full dataset
- Query optimization in Sprint 29 if needed
- **Contingency:** Caching, query tuning, DB tuning in post-launch phase

---

## Four Critical Decisions (From Migration Analysis)

These are documented in MIGRATION_QUICK_START.md. Confirm these before Sprints 27–28:

### 1. Patient Consent: How to Handle LFPDPPP Compliance?

**Problem:** SUTR has no consent records; Renalfy requires explicit consent before clinical data.

**Recommended:** Backdate consent records (1 day before first appointment) with clear audit trail.
- Complies with law
- Audit log shows migration date clearly
- Real consent captured on next user login (optional re-consent flow)

### 2. Income/Expense: Which Location?

**Problem:** SUTR doesn't track location for income/expense; Renalfy requires it.

**Recommended:** Assign all to primary location (first branch).
- Post-migration, users can reassign manually if needed
- Functional; data complete

### 3. Receipt Folio Format: What Format?

**Problem:** SUTR doesn't document folio generation; Renalfy needs clear format.

**Recommended:** `{LOCATION_CODE}-{YYYY}-{NNNNN}` (e.g., "SUC1-2025-00001")
- Location context preserved
- Year-based for tax compliance
- Sequence prevents duplicates
- Affects PDF/receipts, bank statements, customer records

### 4. Go-Live: Hard Cutover or Parallel?

**Problem:** Switching systems has risk; how to minimize?

**Recommended:** Parallel operation (30–60 days)
- SUTR in read-only mode
- Renalfy live; users slowly transitioned
- Data validated before SUTR shutdown
- Low risk; high confidence

**Alternative:** Hard cutover (1–2 hours downtime, tested rollback plan)

---

## Success Criteria

✅ **Before Migration:** All 4 decisions documented, approved by stakeholders
✅ **During Migration:** 0 data loss, 100% referential integrity
✅ **After Migration:** Users can log in, see all data, run workflows
✅ **Compliance:** PatientConsent created, AuditLog populated, NOM-004 immutability enforced
✅ **Stability:** < 3 critical bugs first week; performance acceptable (< 3s page load)

---

## What Happens if We Don't Migrate?

- SUTR stays single-tenant, hardcoded for dialysis, not scalable
- Can't onboard new medical specialties (cardiology, oncology, etc.)
- No compliance features (audit logs, consent tracking)
- Legacy codebase gets harder to maintain
- Tech debt compounds

**By contrast, Renalfy post-migration:**
- Multi-tenant SaaS platform
- Configurable by specialty (no hardcoding)
- Built-in compliance (LFPDPPP, NOM-004, NOM-024)
- Modern stack (Next.js, NestJS, PostgreSQL with RLS)
- Ready to sell to other clinics

---

## Timeline Summary

| Milestone | Sprint | Week | Status |
|---|---|---|---|
| Clinic module complete | 12 | Week 12 | In Progress |
| All modules complete | 24 | Week 24 | Pending |
| QA pass | 25 | Week 25 | Pending |
| Migration prep done | 26 | Week 26 | Pending |
| Migration tested (sample) | 27 | Week 27 | Pending |
| **Go-Live (SUTR → Renalfy)** | **28** | **Week 28** | **Pending (TARGET)** |
| Stabilization | 29 | Week 29 | Pending |
| Reports/Notifications | 30+ | Week 30+ | Future roadmap |

**Target Date:** Mid-May 2026 (assuming start in early March)

---

## Next Steps

### Immediate (This Week)

1. **Review this brief** with product owner, tech lead, stakeholders
2. **Confirm 4 critical decisions** (see above)
3. **Approve timeline** (7 months with 1 developer, 5 months with 2)
4. **Assign sprint owners** (who owns Sprints 13, 14, 15, etc.?)

### Next Week

1. **Kick off Sprint 13** (Plans backend)
2. **Start planning Sprint 15** (Products backend) — can start in parallel
3. **Brief team** on new roadmap + migration path

### Weeks 2–12 (Sprints 13–24)

1. Execute module sprints (Plans, Inventory, Cash)
2. Deliver backend APIs + UI for each module
3. Update specs + tests per CLAUDE.md standards

### Week 13 (Sprint 25)

1. QA sprint: system-wide testing, RLS validation, performance checks

### Week 14 (Sprint 26)

1. Migration prep: update schema, initialize script, document decisions

### Weeks 15–16 (Sprints 27–28)

1. Migration development + testing (Sprint 27)
2. Production migration + cutover (Sprint 28)

### Week 17+ (Sprint 29+)

1. Post-launch stabilization
2. Bug fixes, performance optimization
3. User feedback capture
4. Plan enhancements roadmap

---

## Questions?

- **Timeline too long?** Can accelerate with 2 developers (~5 months). Parallelization opportunities exist in Sprints 13–24.
- **Migration too risky?** Rollback plan tested; full backup retained; parallel operation available.
- **UI not ready at go-live?** Fine — migration doesn't require perfect UI. Users get "beta" UI + final polish in Sprint 29+.
- **One of the 4 decisions still open?** Schedule a 30-min decision meeting this week.

---

## Contacts

| Role | Responsibility |
|---|---|
| **Product Owner** | Approve timeline, confirm decisions, sign-off on go/no-go |
| **Tech Lead** | Assign sprint owners, monitor execution, unblock teams |
| **Renalfy Architect** | Design reviews, decision-making authority, compliance verification |
| **Migration Lead (TBD)** | Execute Sprints 26–28, migration script development, cutover orchestration |
| **QA Lead** | Sprint 25 testing, validation criteria, sign-off |

---

## Conclusion

**The new roadmap is realistic, achievable, and ready for execution.**

✅ Respects current progress (Sprints 1–12)
✅ Unblocks migration clearly (Sprint 28 is the target)
✅ Allows parallelization (can reduce timeline with more developers)
✅ Is fully scoped (every sprint has clear deliverables)
✅ Includes post-launch planning (not everything done before go-live)
✅ Has tested mitigations for all risks

**Next:** Stakeholder approval, 4 decisions finalized, Sprint 13 planning begins.

---

**Prepared by:** Renalfy Architecture Team
**Date:** 2026-03-22
**Status:** Ready for Review & Approval
