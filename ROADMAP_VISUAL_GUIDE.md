# Renalfy Roadmap — Visual Guide

**Quick reference diagrams for the replanned sprint roadmap**

---

## 1. Critical Path — What Must Happen Before Migration

```
                          MIGRATION TIMELINE
                          ═══════════════════════════════════════

✅ DONE                   Sprint 12: Clinic Complete
                          (Pacientes, Servicios, Citas, Recibos)
                                       │
                                       ↓
🔄 IN PROGRESS           Sprint 24: All Modules Complete
                          (Planes, Inventario, Caja)
                          • Sprint 13–14: Plans
                          • Sprint 15–20: Inventory
                          • Sprint 21–24: Cash
                                       │
                                       ↓
⏳ PENDING               Sprint 25: QA Validation
                          • E2E testing
                          • RLS enforcement
                          • Performance testing
                          • Business logic validation
                                       │
                                       ↓
⏳ PENDING               Sprint 26: Migration Prep
                          • Update schema
                          • Script skeleton
                          • Enum mappings
                          • Decisions confirmed
                                       │
                                       ↓
⏳ PENDING               Sprint 27: Migration Development
                          • Full script logic
                          • Sample data testing
                          • Bug fixes
                                       │
                                       ↓
🎯 TARGET                Sprint 28: Production Migration
                          • Full dataset migration
                          • Comprehensive validation
                          • Production cutover
                          • Parallel operation begins
                                       │
                                       ↓
⏳ PENDING               Sprint 29+: Post-Launch
                          • Stabilization
                          • Bug fixes
                          • Performance tuning
```

---

## 2. Module Timeline — Which Sprints Cover What?

```
SPRINTS 1–12: CLINIC MODULE (✅ DONE/IN PROGRESS)
┌─────────────────────────────────────┐
│ Auth (1–2) ✅                       │
│ Locations/Users/Roles (3) ✅        │
│ Landing Page UI (4) ✅              │
│ Patients + ServiceTypes (5) ✅      │
│ Appointments + ClinicalForm (6) ✅  │
│ Receipts + Folio (7) ✅             │
│ Auth UI (8) ✅                      │
│ Settings UI (9) ✅                  │
│ Patients + Services UI (10) ✅      │
│ Receipts UI (11) ✅                 │
│ Appointments + Form UI (12) In Prog │
└─────────────────────────────────────┘
            │
            ↓
SPRINTS 13–24: BUSINESS MODULES (⏳ PENDING)

┌─────────────────────────────────────┐
│ SPRINT 13–14: PLANS MODULE          │
├─────────────────────────────────────┤
│ Sprint 13: Companies + Plans (Back) │
│ Sprint 14: Companies + Plans (UI)   │
└─────────────────────────────────────┘
            │
            ├─────────────────────┐
            ↓                     ↓
┌──────────────────────┐  ┌──────────────────────┐
│ SPRINTS 15–20:       │  │ Can also run in      │
│ INVENTORY MODULE     │  │ parallel with other  │
├──────────────────────┤  │ modules!             │
│ 15: Products (Back)  │  └──────────────────────┘
│ 16: Products (UI)    │
│ 17: Suppliers (Back) │
│ 18: Suppliers (UI)   │
│ 19: Purchases (Back) │
│ 20: Purchases (UI)   │
└──────────────────────┘
            │
            ↓
┌──────────────────────────────────┐
│ SPRINTS 21–24: CASH MODULE       │
├──────────────────────────────────┤
│ 21: Sales (Back)                 │
│ 22: Sales (UI)                   │
│ 23: Income/Expense/CashClose (B) │
│ 24: Income/Expense/CashClose (U) │
└──────────────────────────────────┘
            │
            ↓
┌──────────────────────────────────┐
│ SPRINT 25: QA + STABILIZATION    │
├──────────────────────────────────┤
│ • E2E scenario testing            │
│ • RLS enforcement validation      │
│ • Performance testing             │
│ • Business logic validation       │
│ • Security testing                │
└──────────────────────────────────┘
            │
            ↓
┌──────────────────────────────────┐
│ SPRINT 26: MIGRATION PREP         │
├──────────────────────────────────┤
│ • Schema updates (backward compat)│
│ • Migration script skeleton       │
│ • Enum mappings                   │
│ • Decision documentation          │
└──────────────────────────────────┘
            │
            ↓
┌──────────────────────────────────┐
│ SPRINT 27: MIGRATION DEVELOPMENT │
├──────────────────────────────────┤
│ • Full migration script logic     │
│ • Test on sample SUTR data        │
│ • Bug fixes                       │
│ • Validate transformations        │
└──────────────────────────────────┘
            │
            ↓
🎯  SPRINT 28: PRODUCTION CUTOVER   🎯
┌──────────────────────────────────┐
│ ✅ TARGET DATE: Mid-May 2026     │
├──────────────────────────────────┤
│ • Full dataset migration          │
│ • Comprehensive validation        │
│ • Production deployment           │
│ • Parallel operation begins       │
└──────────────────────────────────┘
```

---

## 3. Parallelization Opportunities — How to Save 2–3 Weeks

```
SEQUENTIAL (1 DEVELOPER) = 28 WEEKS

Sprint 13 Plans Back →
  Sprint 14 Plans UI →
    Sprint 15 Products Back →
      Sprint 16 Products UI →
        Sprint 17 Suppliers Back →
          Sprint 18 Suppliers UI →
            Sprint 19 Purchases Back →
              Sprint 20 Purchases UI →
                Sprint 21 Sales Back →
                  Sprint 22 Sales UI →
                    Sprint 23 Income/Expense Back →
                      Sprint 24 Income/Expense UI →
                        Sprint 25 QA →
                          Sprint 26 Migration Prep →
                            Sprint 27 Migration Dev →
                              Sprint 28 Cutover

Total: 16 weeks of critical path + buffer = ~28 weeks

═══════════════════════════════════════════════════════════════════

PARALLEL (2 DEVELOPERS) = ~20 WEEKS

Developer 1                    Developer 2
━━━━━━━━━━━━━━━━━━━           ━━━━━━━━━━━━━━━━━━
Sprint 13 Plans Back           Sprint 15 Products Back
Sprint 14 Plans UI             Sprint 16 Products UI
(Sprint 15 Products Back)       (Sprint 17 Suppliers Back)
(Sprint 16 Products UI)         (Sprint 18 Suppliers UI)
Sprint 17 Suppliers Back       Sprint 19 Purchases Back
Sprint 18 Suppliers UI         Sprint 20 Purchases UI
Sprint 19 Purchases Back       Sprint 21 Sales Back
Sprint 20 Purchases UI         Sprint 22 Sales UI
Sprint 21 Sales Back           Sprint 23 Income/Exp Back
Sprint 22 Sales UI             Sprint 24 Income/Exp UI
Sprint 23 Income/Exp Back
Sprint 24 Income/Exp UI
Sprint 25 QA (both)
Sprint 26 Migration Prep (both)
Sprint 27 Migration Dev (both)
Sprint 28 Cutover (both)

Total: 8 weeks modules + 4 weeks migration+qa = ~20 weeks
Savings: 8 weeks (40% faster!)

═══════════════════════════════════════════════════════════════════

KEY INSIGHT: Not all developers must do both backend AND UI.
Developer 1 can focus on backend; Developer 2 on UI. No sequential
bottleneck between them if API contracts (Zod schemas) are clear.
```

---

## 4. Module Dependencies — What Blocks What?

```
                  Clinic (✅ Done)
                         │
                         ↓
         ┌───────────────┬───────────────┐
         │               │               │
         ↓               ↓               ↓
      Plans          Inventory        (Cash will depend on Inventory)
     (13–14)         (15–20)
       │               │
       │               │
       └───────┬───────┘
               │
               ↓
        Inventory Complete
         (Products, Stock,
          Suppliers, POs,
          Purchases, Movements)
         (15–20 done)
               │
               ↓
             Cash
           (21–24)
               │
               ├─ Sales needs Products (from Inventory)
               ├─ Income/Expense don't have dependencies
               └─ CashClose aggregates all above
               │
               ↓
          All Modules Done
            (Sprint 24)
               │
               ↓
            QA Sprint 25
               │
               ↓
        Migration Prep (26)
               │
               ↓
        Migration Dev (27)
               │
               ↓
       Production Cutover (28)

CONCLUSION: Inventory and Plans can run in parallel.
Only Cash depends on Inventory (for Sales).
Critical path is longest module chain: Inventory (15–20) + QA (25)
```

---

## 5. Effort Breakdown — Hours per Sprint

```
EFFORT PER SPRINT (assuming 1 developer, 40 hrs/week)

Backend Sprints (typically 35–40 hours)
┌─────────────────────────────────┐
│ 5–10 hrs: Design + spec update  │
│ 20–25 hrs: Implementation       │
│ 5–10 hrs: Testing + debugging   │
│ Total: ~40 hours                │
└─────────────────────────────────┘

Frontend Sprints (typically 35–40 hours)
┌─────────────────────────────────┐
│ 3–5 hrs: Design review          │
│ 20–25 hrs: Component building   │
│ 5–10 hrs: Testing + debugging   │
│ Total: ~40 hours                │
└─────────────────────────────────┘

QA Sprint (typically 40 hours)
┌─────────────────────────────────┐
│ 10 hrs: Test plan creation      │
│ 15 hrs: Manual testing          │
│ 10 hrs: Bug triage + reporting  │
│ 5 hrs: Documentation            │
│ Total: ~40 hours                │
└─────────────────────────────────┘

Migration Sprints (typically 40–50 hours)
┌─────────────────────────────────┐
│ 10 hrs: Design + schema review  │
│ 20–30 hrs: Script development   │
│ 10 hrs: Testing + validation    │
│ Total: ~40–50 hours             │
└─────────────────────────────────┘

ALL SPRINTS: ~40 hours per week = realistic and sustainable
(No 60+ hour crunch required)
```

---

## 6. Decision Tree — 4 Critical Decisions

```
DECISION 1: PATIENT CONSENT
┌─────────────────────────────────────────────────────┐
│ Question: How to handle LFPDPPP compliance for      │
│ historical patients?                                 │
├─────────────────────────────────────────────────────┤
│ ✅ RECOMMENDED: Backdate consent records            │
│    • 1 day before first appointment                 │
│    • Clear audit trail showing migration date       │
│    • Legal compliant                                │
│    • Real consent captured on next login            │
│                                                      │
│ ❌ NOT RECOMMENDED: Force re-consent on login       │
│    • Breaks user workflow                           │
│    • Compliance gap (no historical consent)         │
└─────────────────────────────────────────────────────┘

DECISION 2: INCOME/EXPENSE LOCATION
┌─────────────────────────────────────────────────────┐
│ Question: SUTR doesn't track location; what to do?  │
├─────────────────────────────────────────────────────┤
│ ✅ RECOMMENDED: Assign all to primary location      │
│    • Functional; data complete                      │
│    • Users can manually reassign post-migration     │
│    • No blocker for go-live                         │
│                                                      │
│ ❌ NOT RECOMMENDED: Manual entry during migration   │
│    • Slower; requires data entry                    │
│    • Higher error rate                              │
└─────────────────────────────────────────────────────┘

DECISION 3: FOLIO FORMAT
┌─────────────────────────────────────────────────────┐
│ Question: How to format receipt folios?             │
├─────────────────────────────────────────────────────┤
│ ✅ RECOMMENDED: {LOCATION_CODE}-{YYYY}-{NNNNN}     │
│    Example: "SUC1-2025-00001"                       │
│    • Location context preserved                     │
│    • Year-based (tax compliance)                    │
│    • Sequential (prevents duplicates)               │
│    • Professional appearance                        │
│                                                      │
│ ❌ ALTERNATIVE 1: {TENANT_CODE}-{YYYY}-{NNNNN}    │
│    • Loses location context                         │
│                                                      │
│ ❌ ALTERNATIVE 2: Just auto-increment               │
│    • No location or year context                    │
└─────────────────────────────────────────────────────┘

DECISION 4: GO-LIVE APPROACH
┌─────────────────────────────────────────────────────┐
│ Question: How to switch from SUTR to Renalfy?      │
├─────────────────────────────────────────────────────┤
│ ✅ RECOMMENDED: Parallel Operation (30–60 days)    │
│    • SUTR: Read-only mode                          │
│    • Renalfy: Live; users gradually transitioned   │
│    • Risk: Very low                                │
│    • User comfort: High (time to adjust)           │
│    • Data validation: Can be thorough              │
│                                                      │
│ ⚡ ALTERNATIVE: Hard Cutover (1–2 hour downtime)  │
│    • Risk: Medium (rollback tested but scary)      │
│    • User comfort: Medium (no transition time)     │
│    • Speed: Fast                                   │
│    • Backup: Full rollback plan available          │
└─────────────────────────────────────────────────────┘
```

---

## 7. Timeline Gantt — Visual Roadmap

```
SIMPLIFIED GANTT CHART (Each █ = 1 week)

SPRINT   NAME                                TIMELINE (28 weeks)
─────────────────────────────────────────────────────────────────
1–12     Clinic Module (done)                ███████████ ✅

13       Plans Backend                       ░░░░░░░░░░░░█
14       Plans UI                            ░░░░░░░░░░░░░█
15       Products Backend                    ░░░░░░░░░░░░░░█
16       Products UI                         ░░░░░░░░░░░░░░░█
17       Suppliers Backend                   ░░░░░░░░░░░░░░░░█
18       Suppliers UI                        ░░░░░░░░░░░░░░░░░█
19       Purchases Backend                   ░░░░░░░░░░░░░░░░░░█
20       Purchases UI                        ░░░░░░░░░░░░░░░░░░░█
21       Sales Backend                       ░░░░░░░░░░░░░░░░░░░░█
22       Sales UI                            ░░░░░░░░░░░░░░░░░░░░░█
23       Income/Expense Backend              ░░░░░░░░░░░░░░░░░░░░░░█
24       Income/Expense UI                   ░░░░░░░░░░░░░░░░░░░░░░░█
25       QA + Stabilization                  ░░░░░░░░░░░░░░░░░░░░░░░░█
26       Migration Prep                      ░░░░░░░░░░░░░░░░░░░░░░░░░█
27       Migration Development               ░░░░░░░░░░░░░░░░░░░░░░░░░░█
28       Production Cutover     🎯 TARGET    ░░░░░░░░░░░░░░░░░░░░░░░░░░░█
29+      Post-Launch                         ░░░░░░░░░░░░░░░░░░░░░░░░░░░░→

ACTUAL CALENDAR (starting early March 2026):
Week 1–12:  March–May (Clinic done)
Week 13–16: May (Plans + start Inventory)
Week 17–20: May–June (Inventory continues)
Week 21–24: June (Sales)
Week 25–26: June (QA + Migration Prep)
Week 27–28: Late June (Migration Dev + Cutover) 🎯 ~June 25, 2026

Note: Actual dates depend on start date of Sprint 13.
Assuming start ~May 1, 2026:
  Sprints 13–24: 12 weeks
  Sprints 25–26: 2 weeks
  Sprints 27–28: 2 weeks
  ────────────────────
  Total to cutover: ~16 weeks from Sprint 13 start
  Cutover date: ~Late August 2026

(Adjust based on actual Sprint 13 start date)
```

---

## 8. Risk Matrix — Likelihood vs. Impact

```
RISK MATRIX (Impact vs. Likelihood)

                HIGH
                ▲
                │
         CRITICAL ZONE (Immediate Action)
                │
         ┌──────┼──────┐
         │      │      │
         │   5  │  6   │
IMPACT   │      │      │
    M    │  1   │  2   │
    I    ├──────┼──────┤
    D    │      │      │
         │   3  │  4   │
         │      │      │
         └──────┼──────┘
                │
                └────────────────────────────► LIKELIHOOD
                LOW            HIGH

Legend:
1. RLS Enforcement Bugs (Low likelihood, High impact)
   Mitigation: Sprint 25 dedicated RLS validation

2. Data Validation Issues (Low likelihood, High impact)
   Mitigation: Sprint 27 tests on sample data

3. UI Delay (Medium likelihood, Medium impact)
   Mitigation: UI not required for migration; defer polish

4. Performance Issues Post-Launch (Low likelihood, Medium impact)
   Mitigation: Load testing Sprint 25; tuning Sprint 29

5. Migration Script Complex (Low likelihood, Medium impact)
   Mitigation: Skeleton in Sprint 26; careful dev in Sprint 27

6. User Confusion (High likelihood, Medium impact)
   Mitigation: Parallel operation 30–60 days; training materials

OVERALL RISK LEVEL: LOW
(All high-impact risks have mitigations; medium-impact risks manageable)
```

---

## 9. Success Criteria Checklist

```
✅ PRE-MIGRATION SUCCESS CRITERIA

Before Sprint 28 can proceed:

SPRINT 12 (Clinic Complete)
  ☐ Patient CRUD fully functional
  ☐ Appointment CRUD with dynamic forms
  ☐ Receipt generation with folio logic
  ☐ All tests pass (lint + types + tests)
  ☐ UI matches spec (patients, services, citas, recibos)

SPRINT 24 (All Modules Complete)
  ☐ Plans CRUD + exhaustion logic
  ☐ Inventory (Products, Stock, Suppliers, POs, Purchases, Movements)
  ☐ Cash (Sales, Income, Expense, CashClose)
  ☐ All tests pass
  ☐ UI for all modules complete

SPRINT 25 (QA Validation)
  ☐ E2E scenario test passes (patient → appointment → receipt → plan → sales)
  ☐ RLS enforcement verified (User A cannot see User B's Location data)
  ☐ Load test passes (1000+ concurrent users, < 3s response)
  ☐ Business logic validated (folios unique, plans exhausted correctly, stock accurate, cash reconciles)
  ☐ Security testing (no privilege escalation, auth edge cases covered)

SPRINT 26 (Migration Prep)
  ☐ Schema updated (Patient optional fields, Product status enum)
  ☐ Migration script skeleton initialized (TypeScript project)
  ☐ Enum mappings documented (SUTR tipo/estatus → Renalfy)
  ☐ 4 critical decisions documented and approved
  ☐ ID mapping table schema created

SPRINT 27 (Migration Dev)
  ☐ Full migration logic implemented for all 28 tables
  ☐ Sample SUTR data migrated successfully (100–200 rows/table)
  ☐ Data integrity validated (no missing FKs, row counts match expected)
  ☐ Transformations correct (folio format, plan status, stock)
  ☐ Script runs in < 30 minutes on sample data

SPRINT 28 (Production Cutover)
  ☐ Full SUTR dataset migrated (25,000+ rows)
  ☐ Row count reconciliation complete (100% matches)
  ☐ Referential integrity verified (all FKs valid)
  ☐ Business logic validated (folio format, plans, stock, cash)
  ☐ Performance acceptable (queries < 1s under load)
  ☐ Rollback plan tested (can revert in < 2 hours)
  ☐ All users can log in (password resets work)
  ☐ Stakeholder sign-off obtained
  ☐ Go-live approved (go/no-go decision made)

POST-LAUNCH (Sprint 29+)
  ☐ < 3 critical bugs in first week
  ☐ Page load times < 3s
  ☐ Users report workflows functional
  ☐ RLS working (no data leaks between orgs)
```

---

## 10. Decision Meeting Agenda — 45 Minutes

```
TIME   TOPIC                                  DURATION  OWNER
─────────────────────────────────────────────────────────────────
0–10   Overview & Context                     10 min    PO
       • Why we're migrating (business case)
       • Timeline: 3 weeks cutover (Sprints 27–28)
       • Risk mitigation: parallel operation available

10–20  Decision 1: Patient Consent            10 min    Legal + Tech
       • How to handle LFPDPPP compliance?
       • Recommended: Backdate consent (legal review needed)

20–25  Decision 2: Income/Expense Location   5 min     Tech
       • Which location for historical income/expense?
       • Recommended: Primary location (users reassign post-launch)

25–30  Decision 3: Receipt Folio Format      5 min     Tech + Biz
       • What format for folios?
       • Recommended: {LOC_CODE}-{YYYY}-{NNNNN}
       • Impact: PDF/receipts, bank statements

30–40  Decision 4: Go-Live Approach          10 min    PO + Tech
       • Hard cutover (risky, fast) vs. Parallel (safe, slower)?
       • Recommended: Parallel operation (30–60 days)
       • Impact: User confidence, data validation time

40–45  Timeline & Next Steps                  5 min     PO
       • Confirm all 4 decisions documented
       • Assign migration lead (1 FTE for Sprints 27–28)
       • Kick off Sprint 13 planning next week
       • Schedule follow-up if decisions unclear

ATTENDEES: Product Owner, Tech Lead, Backend Lead, Legal/Compliance,
           Migration Engineer (if assigned)

OUTCOME: Documented decisions, assigned owners, signed approval
```

---

## 11. Post-Launch Roadmap (Sprint 29+)

```
POST-LAUNCH FEATURES (Deferred from critical path)

Sprint 29–30: Stabilization & Bug Fixes
├─ Monitor production for errors
├─ Fix critical bugs
├─ Performance optimization
└─ User feedback capture

Sprint 31+: Enhancements
├─ Reports (PDF/Excel)
│  ├─ Receipt reports
│  ├─ Sales summaries
│  └─ Inventory reports
│
├─ Notifications
│  ├─ Plan exhaustion alerts
│  ├─ Low stock warnings
│  └─ Cash close errors
│
├─ Analytics
│  ├─ Revenue dashboard
│  ├─ Utilization metrics
│  └─ Inventory turnover
│
├─ Third-Party Integrations
│  ├─ Accounting software
│  ├─ Bank sync
│  └─ Email notifications
│
└─ Mobile App
   ├─ iOS app
   ├─ Android app
   └─ Mobile web PWA

(Not required for migration; can be planned based on user feedback)
```

---

**Bottom Line:** This visual guide makes the roadmap easy to understand at a glance. Use these diagrams in stakeholder presentations, team meetings, and planning sessions.

---

**Prepared by:** Renalfy Architecture Team
**Date:** 2026-03-22
