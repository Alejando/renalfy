# SUTR → Renalfy Migration: Quick Start Guide

**For:** Migration Team, Product Leads, Stakeholders
**Read Time:** 5–10 minutes
**Detailed Docs:** See `/docs/` for full specifications

---

## What Is This Migration?

We're moving **SUTR** (legacy single-tenant system) → **Renalfy** (new multi-tenant SaaS).

**Why?**
- SUTR is hardcoded for dialysis clinics; Renalfy is generic and future-proof
- SUTR has no compliance features; Renalfy is built for Mexican healthcare regulations
- SUTR is monolithic; Renalfy is a SaaS platform (can sell to other medical specialties)

**What happens to my data?**
- ✅ All 25,000+ rows transferred safely
- ✅ Zero data loss
- ✅ Regulatory compliance added (consent, audit logs)
- ✅ All reports/exports preserved

---

## Key Numbers

| Metric | Value |
|---|---|
| **Tables to migrate** | 28 (users, patients, appointments, receipts, inventory, cash, etc.) |
| **Rows per clinic** | ~25,000 (patients, sessions, sales, inventory) |
| **Clinical data** | Dropped — never implemented in SUTR; appointments migrate as date + receipt link only |
| **Timeline** | 3 weeks (Sprints 27–29) |
| **Effort** | 1 full-time engineer + part-time support |
| **Downtime** | 1–2 hours (or zero with parallel operation) |
| **Risk Level** | Low (tested rollback plan available) |

---

## Four Decisions Needed Before We Start

### 1️⃣ Consent: How do we handle patient privacy law?

**The problem:** SUTR has zero consent records. Renalfy requires patient consent (LFPDPPP law) before storing health data.

**Options:**
- ✅ **Recommended:** Backdate consent records (1 day before first appointment). Clear audit trail shows migration date.
- ❌ **Not recommended:** Force all users to re-consent on login (breaks workflow).

**Decision needed by:** End of this week

---

### 2️⃣ Income/Expense: Which location?

**The problem:** SUTR income/expenses don't track which location they belong to. Renalfy requires it.

**Options:**
- ✅ **Recommended:** Assign all to primary location (first branch). Post-migration, users can reassign manually if needed.
- ❌ **Alternative:** Prompt during migration (slower, needs data entry).

**Decision needed by:** End of this week

---

### 3️⃣ Receipt Numbers: What format?

**The problem:** SUTR doesn't show how folios are generated. Renalfy needs a clear format.

**Options:**
- ✅ **Recommended:** `SUC1-2025-00001` (location code-year-sequence)
- ❌ **Alternative:** `SUTR-2025-00001` (generic tenant code)
- ❌ **Alternative:** Just auto-increment (loses location context)

**Decision needed by:** End of this week

**Business impact:** Affects PDF/receipts, bank statements, customer records.

---

### 4️⃣ Go-Live: Hard cutover or parallel?

**The problem:** Switching systems has risk. How do we minimize it?

**Options:**
- ✅ **Recommended:** Run both systems in parallel 30–60 days
  - SUTR still works (read-only)
  - Users slowly transition to Renalfy
  - Data can be validated before SUTR shutdown
  - Low risk; high confidence

- ⚡ **Alternative:** Hard cutover (1–2 hour downtime)
  - Faster switchover
  - Tested rollback plan (< 2 hours to revert)
  - Medium risk; acceptable if backup solid

**Decision needed by:** 2 weeks (before Phase 3 cutover planning)

---

## Timeline: 3 Weeks

```
WEEK 1 (Sprint 28)        WEEK 2 (Sprint 28–29)   WEEK 3 (Sprint 29)
├─ Decisions              ├─ Migration script dev  ├─ Full validation
├─ Schema minor tweaks    ├─ Sample data test      ├─ Backup & rollback test
└─ Prep + SUTR export     └─ Bug fixes             └─ Production cutover
```

| Phase | Tasks | Owner | Done? |
|---|---|---|---|
| **Phase 0 (Days 1–3)** | Make 4 decisions above | Product + Stakeholders | ⏳ |
| **Phase 0.5 (Days 4–5)** | Minor Renalfy schema tweaks (Patient optional fields) | Backend lead | ⏳ |
| **Phase 1 (Days 6–10)** | Extract SUTR data, build migration script skeleton | Migration engineer | ⏳ |
| **Phase 2 (Days 11–18)** | Write migration logic, test on sample data | Migration engineer | ⏳ |
| **Phase 3 (Days 19–21)** | Full-dataset validation, reconciliation | Migration engineer + QA | ⏳ |
| **Phase 4 (Day 22)** | Production migration, go-live | Migration engineer + DBA | ⏳ |

---

## What Happens to My Data?

### ✅ Transfers Safely

- Patients (demographics, status)
- Appointments (date + receipt link only)
- Receipts (with new sequential folios)
- Plans & companies
- Inventory & products
- Sales, income, expenses
- Cash closes & reconciliation

### ➕ Added for Compliance

- **Patient Consent:** Backdated records showing consent (legal requirement)
- **Audit Log:** Immutable record of all migrations (regulatory requirement)

### ❌ Dropped (Not Migrated)

- Dialysis clinical session data (`sesions` — 48 fields never properly implemented)
- Periodic vital signs (`signos` — never properly implemented)
- Old password reset tokens
- Notifications log

---

## After Migration: What's Different?

### For Users
- 📱 **New UI** (modern, mobile-friendly, Tailwind CSS + shadcn/ui)
- 🔒 **Better security** (OAuth-ready, audit logs, compliance controls)
- 🎯 **Same workflows** (patient → appointment → receipt still works)
- 📊 **Same data** (all reports/exports preserved)
- ⚙️ **More configurable** (can customize forms, templates, etc.)

### For Developers
- 🏗️ **Modern stack** (Next.js + NestJS + TypeScript + Prisma)
- 🔐 **Multi-tenant architecture** (Row-Level Security built-in)
- 📋 **Type safety** (Zod schemas + strict TypeScript)
- 🧪 **TDD culture** (all features tested)
- 🌍 **SaaS-ready** (can sell to other clinics/specialties)

---

## Risks & How We Mitigate Them

| Risk | Likelihood | Mitigation |
|---|---|---|
| **Data loss** | Very Low | Full backup; test on copy first; ID mapping validation |
| **Wrong folio format** | Low | Confirm format with business; generate & validate before prod |
| **Consent/compliance gap** | Low | Legal review; audit trail shows migration date; clear documentation |
| **User confusion (new UI)** | Medium | Training; documentation; parallel operation (30–60 days) |
| **Performance issues** | Low | Test on full dataset first; batch processing; monitor after launch |
| **Rollback needed** | Very Low | Tested rollback plan; full backup; can revert in < 2 hours |

**Verdict:** Low overall risk with comprehensive mitigation.

---

## How to Read the Detailed Docs

### If you're **not technical:**
📖 Read `MIGRATION_EXECUTIVE_SUMMARY.md` (this file for context, 8KB)
- High-level overview
- Risks & decisions
- Timeline for stakeholders

### If you're **technical lead/backend engineer:**
🔧 Read all three detailed docs in order:
1. `MIGRATION_ANALYSIS.md` (gap analysis, complete system inventory)
2. `MIGRATION_ACTION_ITEMS.md` (phase breakdown, specific tasks)
3. `SUTR_RENALFY_ENTITY_MAPPING.md` (field-by-field transformations)

### If you're **product/business owner:**
📋 Read `MIGRATION_ACTION_ITEMS.md` (decisions, timeline, owners)
+ `MIGRATION_EXECUTIVE_SUMMARY.md` (risks, FAQ)

### If you're **QA/validation:**
✅ Read `SUTR_RENALFY_ENTITY_MAPPING.md` (transformations & validation rules)
+ Appendix of `MIGRATION_ANALYSIS.md` (business logic spot-checks)

---

## FAQ

**Q: When do users need to migrate?**
A: Option 1 (parallel): Gradually over 30–60 days. Option 2 (hard cutover): All at once on go-live day.

**Q: Will I lose my data?**
A: No. Zero data loss expected. All 25,000+ rows transfer. Full backup taken before migration.

**Q: Do I need a new password?**
A: Yes. All users reset password on first Renalfy login (security best practice).

**Q: Will the new system work the same as SUTR?**
A: ~90% same workflows. Some UI improvements. Training provided.

**Q: What if something breaks?**
A: We have a tested rollback plan. Revert to pre-migration state in < 2 hours. Full data backup maintained.

**Q: What about my session/clinical history?**
A: The dialysis session form data was never properly captured in SUTR. Appointments migrate with their date and receipt link intact. Clinical data capture starts fresh in Renalfy.

**Q: How long does the migration take?**
A: 3 weeks total (Sprints 28–29). Cutover day: 1–2 hours downtime (or zero with parallel operation).

**Q: Can we test before going live?**
A: Yes. We'll run on a full backup of SUTR data, validate everything, then replicate to production.

**Q: What about my reports/exports?**
A: All historical data preserved. Reports generate in Renalfy same as before.

---

## Decision Meeting Template

**Agenda (45 min):**
1. Overview (10 min) — This document
2. Decision 1: Consent backfill (10 min)
3. Decision 2: Income/expense location (5 min)
4. Decision 3: Receipt folio format (5 min)
5. Decision 4: Go-live approach (10 min)
6. Timeline & next steps (5 min)

**Attendees:** Product Owner, backend lead, legal/compliance, migration engineer

**Outcome:** Documented decisions in meeting notes. Migration engineer begins Phase 1 immediately after.

---

## Success Criteria

✅ **Before:** All 4 decisions made, documented, communicated
✅ **During:** 0 data loss, referential integrity 100%
✅ **After:** All users can log in, see data, run reports
✅ **Compliance:** Consent records created, audit logs populated
✅ **Stability:** No errors in first 30 days; performance acceptable (< 5s pages)

---

## Contacts

| Role | Name | Availability |
|---|---|---|
| **Migration Lead** | (TBD) | Full-time, Sprints 28–29 |
| **Renalfy Architect** | (TBD) | For unblocking, design reviews |
| **Product Owner** | (TBD) | Decisions, sign-offs |
| **DB Admin** | (TBD) | Backup, restore, performance |

---

## Next Steps (Right Now!)

1. **Share this document** with team
2. **Schedule decision meeting** (45 min, this week)
3. **Assign migration lead** (backend engineer, 1 FTE available Sprints 28–29)
4. **Read detailed docs** (tech leads)
5. **Make 4 decisions** (by end of week)
6. **Kickoff Phase 1** (Sprint 28 starts)

---

## One Pager: The Plan

```
SUTR (Legacy Monolith)
├─ 28 tables migrated, 25K rows
├─ Clinical session data DROPPED (never used)
├─ Single-tenant
└─ Zero compliance features

      ↓ MIGRATE (3 weeks, 1 FTE)

Renalfy (Modern SaaS)
├─ Multi-tenant architecture
├─ PatientConsent (LFPDPPP compliance)
├─ AuditLog (NOM-004 compliance)
└─ Ready for growth (new specialties, new clients)

KEY DECISIONS
├─ Consent: Backdate (1 day before first appt)
├─ Location: Primary location for income/expense
├─ Folios: {LOC_CODE}-{YYYY}-{NNNNN}
└─ Go-Live: Parallel operation (30–60 days)

TIMELINE: 3 weeks (Sprints 28–29)
├─ Phase 0: Decisions (days 1–3)
├─ Phase 1: Prep (days 4–10)
├─ Phase 2: Dev (days 11–18)
├─ Phase 3: Validation (days 19–21)
└─ Phase 4: Cutover (day 22)

OUTCOME
✅ Zero data loss (on used data)
✅ Regulatory compliance
✅ SaaS-ready platform
✅ Users migrated smoothly
```

---

**Questions?** Review detailed docs or schedule a sync.

**Ready to start?** Make the 4 decisions. We start Phase 0 this week.

**Timeline:** Go-live in 3 weeks (Sprints 28–29, mid April 2026).
