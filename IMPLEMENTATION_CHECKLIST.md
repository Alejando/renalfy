# Implementation Checklist — Roadmap Execution

**Purpose:** Detailed checklist to execute the replanned roadmap from approval through go-live

**Date:** 2026-03-22
**Status:** Ready for use upon approval

---

## Phase 1: Approval & Planning (Week 1–2)

### Stakeholder Review & Approval

- [ ] **Product Owner:** Review ROADMAP_EXECUTIVE_BRIEF.md
- [ ] **Tech Lead:** Review ROADMAP_REPLANNED_2026-03-22.md
- [ ] **Architect:** Review ROADMAP_JUSTIFICATION.md
- [ ] **Finance/Business:** Confirm budget for 1–2 developers × 28 weeks
- [ ] **Legal:** Review MIGRATION_QUICK_START.md (consent strategy decision)

### Obtain Sign-Offs

- [ ] **Product Owner sign-off:** Timeline acceptable (7 months / 5 months with 2 devs)
- [ ] **Tech Lead sign-off:** Roadmap realistic and achievable
- [ ] **Architect sign-off:** Design sound and compliant
- [ ] **Legal sign-off:** Consent strategy approved
- [ ] **Finance sign-off:** Budget approved for resources

### Decision Meeting

- [ ] **Schedule meeting:** 45 min with PO, Tech Lead, Legal, Migration Engineer (TBD)
- [ ] **Attendees prepared:** Each has read MIGRATION_QUICK_START.md
- [ ] **Agenda:** Use template from ROADMAP_VISUAL_GUIDE.md (Section 10)
- [ ] **Decision 1 (Consent):** Recorded and approved ✅
- [ ] **Decision 2 (Location):** Recorded and approved ✅
- [ ] **Decision 3 (Folio):** Recorded and approved ✅
- [ ] **Decision 4 (Go-Live):** Recorded and approved ✅
- [ ] **Documentation:** All 4 decisions documented in shared location

### Resource Allocation

- [ ] **Backend Developer:** Assigned for Sprints 13–28
- [ ] **Frontend Developer:** Assigned for Sprints 14–24 (can start later)
- [ ] **QA Lead:** Assigned for Sprint 25
- [ ] **Migration Lead:** Assigned for Sprints 26–28 (1 FTE)
- [ ] **DBA:** Available for Sprint 28 cutover support
- [ ] **Architect:** Allocated for design reviews + decision-making

---

## Phase 2: Planning & Preparation (Week 2–3)

### Repository Setup

- [ ] **Merge updated CLAUDE.md:** Replace sprint table with new table from SPRINTS_TABLE_UPDATE.md
- [ ] **Create /docs directory:** If not exists, create at repo root
- [ ] **Create /docs/specs directory:** For feature specs
- [ ] **Create /docs/decisions directory:** For ADRs
- [ ] **Commit docs:** `git add -A && git commit -m "docs: add migration analysis and replanned roadmap"`
- [ ] **Create project documentation wiki:** Share all 5 roadmap documents with team

### Sprint 13 Detailed Planning

- [ ] **Create Sprint 13 ticket:** Companies + Plans backend (JIRA/Linear)
- [ ] **Define acceptance criteria:**
  - [ ] Company CRUD endpoints (POST, GET, PATCH, DELETE)
  - [ ] Plan CRUD endpoints with exhaustion tracking
  - [ ] Zod schemas for @repo/types
  - [ ] Unit tests (service layer)
  - [ ] E2E tests (API endpoints)
  - [ ] Spec document: Companies + Plans feature spec
- [ ] **Estimate story points:** Based on Sprints 1–12 velocity
- [ ] **Assign backend developer:** Named owner
- [ ] **Define "done" criteria:** Lint ✅, Types ✅, Tests ✅

### Sprint 14 Detailed Planning

- [ ] **Create Sprint 14 ticket:** Companies + Plans UI
- [ ] **Define acceptance criteria:**
  - [ ] Companies listing page
  - [ ] Create/edit company forms
  - [ ] Plans listing with usage visualization
  - [ ] Create/edit plan forms
  - [ ] Plan detail page
  - [ ] Component tests (Vitest + RTL)
  - [ ] Responsive design (mobile-friendly)
- [ ] **Assign frontend developer:** Named owner
- [ ] **API contract ready:** Use Zod schemas from Sprint 13 for type safety
- [ ] **Mock server:** Set up (json-server/MSW) for local development

### Sprints 15–24 Planning (Light Touch)

- [ ] **Create JIRA epic:** "Renalfy Business Modules" (Sprints 13–24)
- [ ] **List all 12 sprints** as linked issues (not fully detailed yet)
- [ ] **Assign epic owner:** Backend lead
- [ ] **Link to decisions:** Reference 4 critical decisions where relevant
- [ ] **Schedule refinement:** Weekly on Mondays (refine next 2 sprints)

### Migration Planning (Sprints 26–28)

- [ ] **Identify Migration Lead:** 1 FTE, available Sprints 26–28
- [ ] **Create migration project:** Separate repo or folder in main repo
- [ ] **Schedule migration kickoff:** After Sprint 25 completes (estimate Sprint 26 Week 1)
- [ ] **Arrange SUTR database access:** Read-only copy for testing
- [ ] **Plan backup strategy:** Full production backup before Sprint 28 cutover
- [ ] **Prepare rollback plan:** Document rollback procedure + test it
- [ ] **Schedule stakeholder review:** Before Sprint 28 cutover (final go/no-go)

---

## Phase 3: Sprints 13–24 Execution (16–24 weeks)

### Weekly Rhythm (Every Sprint)

#### Monday (Sprint Planning)
- [ ] **Team standup:** Review sprint goal, assign tasks
- [ ] **Refinement:** Next sprint's tickets reviewed and estimated
- [ ] **Clarify blockers:** Resolve dependencies with other teams

#### Tuesday–Thursday (Implementation)
- [ ] **Daily standup:** 15 min, what's done/blocked/next
- [ ] **Code review:** All PRs reviewed + approved before merge
- [ ] **Testing:** Write tests first (TDD), then code
- [ ] **Documentation:** Spec updates as understanding evolves

#### Friday (Sprint Review & Retro)
- [ ] **Demo:** Show working features to stakeholders (if applicable)
- [ ] **Verification:** Lint ✅, Types ✅, Tests ✅ — must pass before sprint closes
- [ ] **Retro:** What went well? What to improve?
- [ ] **Update CLAUDE.md specs:** Ensure spec docs match implementation

### Per-Sprint Validation

**Before sprint closes, verify:**
- [ ] **Lint passes:** `pnpm lint` (0 errors, 0 warnings)
- [ ] **Types check:** `pnpm check-types` (0 errors)
- [ ] **Tests pass:** `pnpm test` (all green)
- [ ] **Spec updated:** Feature spec in `/docs/specs/` matches code
- [ ] **No `any` types:** TypeScript strict mode enforced
- [ ] **RLS enforced:** All business endpoints filter by `tenantId` + `locationId` (if applicable)
- [ ] **Zod schemas:** DTOs use nestjs-zod + schemas from @repo/types
- [ ] **API documented:** Endpoints in spec with request/response examples

### Sprint 13 (Week 1)

**Backend: Companies + Plans**
- [ ] Design Companies + Plans API contract (Zod schemas)
- [ ] Implement Company service (CRUD + RLS)
- [ ] Implement Plan service (CRUD + exhaustion logic)
- [ ] Write unit tests (service layer)
- [ ] Write E2E tests (API endpoints)
- [ ] Document API in spec
- [ ] Deploy to staging
- [ ] **Definition of Done:** Lint ✅, Types ✅, Tests ✅

### Sprint 14 (Week 2)

**Frontend: Companies + Plans UI**
- [ ] Set up mock API using Zod schemas from Sprint 13
- [ ] Build Companies listing page
- [ ] Build Company create/edit forms
- [ ] Build Plans listing (with usage bar visualization)
- [ ] Build Plan create/edit forms
- [ ] Build Plan detail page
- [ ] Write component tests
- [ ] Connect to real API (Sprint 13 deployed)
- [ ] Test responsive design
- [ ] **Definition of Done:** Lint ✅, Types ✅, Tests ✅, Mobile-friendly ✅

### Sprints 15–20 (Inventory Cycle)

**Sprint 15:** Products backend (CRUD, LocationStock)
**Sprint 16:** Products UI (listing, forms, stock per location)
**Sprint 17:** Suppliers + POs backend (CRUD, status machine)
**Sprint 18:** Suppliers + POs UI (forms, status workflow)
**Sprint 19:** Purchases + Movements backend (auto stock update, transactional)
**Sprint 20:** Purchases + Movements UI (PO→Purchase, movement audit trail)

*For each:*
- [ ] Spec created (feature requirements)
- [ ] Backend API designed (Zod schemas)
- [ ] Tests written (unit + E2E)
- [ ] UI built (components + pages)
- [ ] RLS enforced (business data isolated by tenant/location)
- [ ] Lint ✅, Types ✅, Tests ✅ before sprint closes

### Sprints 21–24 (Cash Cycle)

**Sprint 21:** Sales backend (CRUD, status machine, auto stock update)
**Sprint 22:** Sales UI (listing, create form multi-item, status workflow)
**Sprint 23:** Income/Expense/CashClose backend (reconciliation logic, immutability)
**Sprint 24:** Income/Expense/CashClose UI (forms, CashClose wizard, read-only detail)

*For each:*
- [ ] Spec created (feature requirements, business logic edge cases)
- [ ] Backend API designed (Zod schemas)
- [ ] Tests include business logic (plan exhaustion, stock accuracy, cash reconciliation)
- [ ] Tests include RLS (multi-tenant isolation)
- [ ] UI built (responsive, accessible)
- [ ] Lint ✅, Types ✅, Tests ✅ before sprint closes

### Parallel Execution (If 2 Developers)

- [ ] **Developer 1:** Sprints 13, 15, 17, 19, 21, 23 (all backends)
- [ ] **Developer 2:** Sprints 14, 16, 18, 20, 22, 24 (all UIs)
- [ ] **Communication:** Weekly sync on API contracts, blockers
- [ ] **Staging deployment:** Each sprint deployed to staging for integration testing
- [ ] **Code review:** Cross-review backend/UI changes for consistency

---

## Phase 4: Sprint 25 — QA & Stabilization (Week 17)

### System-Wide Testing

- [ ] **E2E Scenario Testing**
  - [ ] Create patient → Create appointment → Generate receipt → Track plan → Create sale → Close cash
  - [ ] Verify all data flows correctly end-to-end
  - [ ] Verify calculations (receipt folio, plan sessions, stock, cash total)

- [ ] **RLS Enforcement Testing**
  - [ ] User in Location A requests Location B data → 403 Forbidden
  - [ ] Staff user tries to access Admin settings → 403 Forbidden
  - [ ] Manager in Clinic 1 cannot see Clinic 2 data (multi-tenant isolation)
  - [ ] Test with each role (SUPER_ADMIN, OWNER, ADMIN, MANAGER, STAFF)

- [ ] **Security Testing**
  - [ ] Auth token expiration (access 15m, refresh 7d)
  - [ ] Privilege escalation attempts (staff trying to create company)
  - [ ] CSRF protection (if applicable)
  - [ ] Password reset flow
  - [ ] Session timeout

- [ ] **Performance Testing**
  - [ ] Load test: 1000+ concurrent users
  - [ ] Measure page load times (target: < 3s)
  - [ ] Measure API response times (target: < 500ms)
  - [ ] Identify slow queries + optimize
  - [ ] Test on staging database with production-like data volume

- [ ] **Business Logic Validation**
  - [ ] Receipt folio generation: No duplicates, format correct
  - [ ] Plan exhaustion: Session counter accurate, status → EXHAUSTED correct
  - [ ] Stock accuracy: Product quantities update on purchase/sale/movement
  - [ ] Cash reconciliation: Sum(Sales + Income - Expense) = CashClose balance
  - [ ] Location filtering: Ensures MANAGER/STAFF only see their location

### Bug Triage & Fixes

- [ ] **Critical bugs:** Fix immediately (blocking any feature)
- [ ] **High bugs:** Fix in Sprint 25 (affects user workflow)
- [ ] **Medium bugs:** Log for Sprint 29+ (workaround available)
- [ ] **Low bugs:** Log for future (cosmetic or edge case)
- [ ] **All bugs documented:** Issue tracker with clear reproduction steps

### Documentation Updates

- [ ] **Spec updates:** Each feature spec reflects actual implementation
- [ ] **ADRs:** Document any key decisions made during build
- [ ] **Test results:** Document test coverage + known limitations
- [ ] **Performance baseline:** Document current load test results (for Sprint 29 optimization)

### Stakeholder Check-In

- [ ] **QA results presented:** No critical/high bugs remaining
- [ ] **Performance acceptable:** Page load < 3s, RLS enforced
- [ ] **Readiness for migration:** Green light to proceed to Sprint 26
- [ ] **Final sign-off:** Product owner approves system ready for migration

---

## Phase 5: Sprint 26 — Migration Preparation (Week 18)

### Schema Updates (Backward-Compatible)

- [ ] **Patient model:** Add optional fields (ssn, insuranceNumber, email)
- [ ] **Product enum:** Add status (ACTIVE | INACTIVE | DISCONTINUED)
- [ ] **Create migration file:** `prisma/migrations/20260-patient-product-fields.sql`
- [ ] **Test migration:** Run on staging database
- [ ] **Deploy to production:** Schema updated before Sprint 27 starts
- [ ] **Verify backward compatibility:** No existing code breaks

### Migration Script Infrastructure

- [ ] **Initialize migration project:** Separate TypeScript project or folder
- [ ] **Dependencies:** Add libs (pg client, prisma client, dotenv, pino for logging)
- [ ] **Connection logic:** Connect to SUTR DB (read-only) + Renalfy DB
- [ ] **CLI interface:** `npx ts-node migrate.ts --source-db ... --target-db ... --dry-run`
- [ ] **Error handling:** Graceful failures with clear error messages
- [ ] **Logging:** All transformations logged to file (for audit trail)
- [ ] **Resumability:** Can restart from checkpoint if interrupted
- [ ] **Test on sample:** Skeleton ready to plug in transformation logic

### Enum Mappings Documentation

- [ ] **SUTR user tipos → Renalfy roles:**
  - [ ] 1 → SUPER_ADMIN
  - [ ] 2 → ADMIN
  - [ ] 3 → MANAGER
  - [ ] 4 → STAFF
- [ ] **SUTR estatus → Renalfy status (varies by model):**
  - [ ] 1 → ACTIVE / OPEN / DRAFT (context-dependent)
  - [ ] 2 → INACTIVE / SUSPENDED / CANCELLED (context-dependent)
- [ ] **Payment types mapping:** SUTR → Renalfy enum
- [ ] **Create mapping document:** Shared with migration team

### ID Mapping Table

- [ ] **Schema created:** `IDMapping(old_id INT, new_id UUID, table_name STRING, PRIMARY KEY(old_id, table_name))`
- [ ] **Purpose:** Track SUTR ID → Renalfy UUID for referential integrity
- [ ] **Populated during migration:** Record every ID transformation
- [ ] **Validation after migration:** Verify no orphaned FKs

### Decisions Documentation

- [ ] **Decision 1 (Consent):** Documented with legal sign-off
- [ ] **Decision 2 (Location):** Documented with business approval
- [ ] **Decision 3 (Folio):** Documented with business approval
- [ ] **Decision 4 (Go-Live):** Documented (parallel vs. hard cutover)
- [ ] **All documented:** In shared wiki or migration planning doc
- [ ] **Migration team briefed:** All team members understand decisions

### Backup & Rollback Plan

- [ ] **Backup strategy:** When/how to backup SUTR + Renalfy before cutover
- [ ] **Restore procedure:** How to restore Renalfy from backup if needed
- [ ] **Rollback testing:** Dry-run restore on staging (< 2 hours)
- [ ] **Communication:** Notify stakeholders of downtime window + rollback capability
- [ ] **Contact list:** Who to call if something goes wrong

---

## Phase 6: Sprint 27 — Migration Development (Week 19)

### Full Migration Logic Implementation

**For each module, implement transformation:**

- [ ] **Users**
  - [ ] SUTR users → Renalfy User
  - [ ] Map tipo → role (1→SUPER_ADMIN, 2→ADMIN, 3→MANAGER, 4→STAFF)
  - [ ] Map estatus → status (ACTIVE, SUSPENDED)
  - [ ] Assign tenantId (all go to "SUTR" tenant)
  - [ ] Assign locationId (if tipo > 2, use unidad_id; else null)

- [ ] **Locations**
  - [ ] SUTR unidads → Renalfy Location
  - [ ] Map nombre → name, direccion → address
  - [ ] Map estatus → status

- [ ] **Patients**
  - [ ] SUTR pacientes → Renalfy Patient
  - [ ] Assign tenantId + locationId
  - [ ] Verify date_of_birth format (handle invalid dates)
  - [ ] Create backdated PatientConsent records (1 day before first appointment)

- [ ] **ServiceTypes**
  - [ ] SUTR conceptos → Renalfy ServiceType
  - [ ] Map name, status
  - [ ] Leave price null (not in SUTR)

- [ ] **Appointments**
  - [ ] SUTR sesions → Renalfy Appointment
  - [ ] Migrate: id, recibo_id, fecha, created_at, updated_at
  - [ ] DROP: All 48 dialysis-specific fields (never used)
  - [ ] DROP: signos entirely (vital signs)
  - [ ] Set clinicalData = null for all migrated records

- [ ] **Receipts**
  - [ ] SUTR recibos → Renalfy Receipt
  - [ ] Generate new folios (format: {LOC_CODE}-{YYYY}-{NNNNN})
  - [ ] Track old ID → new folio (for validation)
  - [ ] Verify no duplicate folios

- [ ] **Companies**
  - [ ] SUTR empresas → Renalfy Company
  - [ ] Map fields: razon_social → name, etc.
  - [ ] Assign tenantId

- [ ] **Plans**
  - [ ] SUTR beneficios → Renalfy Plan
  - [ ] Map sesiones → plannedSessions, sesiones_realizadas → usedSessions
  - [ ] Calculate status: if usedSessions >= plannedSessions then EXHAUSTED else ACTIVE
  - [ ] Assign tenantId + locationId

- [ ] **Products**
  - [ ] SUTR productos → Renalfy Product
  - [ ] Default status = ACTIVE (can mark DISCONTINUED post-migration if needed)
  - [ ] Assign tenantId
  - [ ] Fix stock field type (string → int)

- [ ] **LocationStock**
  - [ ] SUTR producto_unidads → Renalfy LocationStock
  - [ ] Map cantidad → quantity
  - [ ] Assign tenantId + locationId + productId
  - [ ] Verify stock quantities non-negative

- [ ] **Suppliers**
  - [ ] SUTR proveedors → Renalfy Supplier

- [ ] **SupplierProduct**
  - [ ] SUTR producto_proveedors → Renalfy SupplierProduct

- [ ] **PurchaseOrders**
  - [ ] SUTR pedidos → Renalfy PurchaseOrder
  - [ ] Default status = RECEIVED (assume all migrated POs received)

- [ ] **Purchases**
  - [ ] SUTR compras → Renalfy Purchase
  - [ ] Assign tenantId + locationId

- [ ] **InventoryMovements**
  - [ ] SUTR registros → Renalfy InventoryMovement
  - [ ] Assign tenantId + locationId
  - [ ] Assign reason (e.g., "MIGRATION_IMPORT")

- [ ] **Sales**
  - [ ] SUTR ventas → Renalfy Sale
  - [ ] Default status = SETTLED (assume all migrated sales closed)
  - [ ] Assign tenantId + locationId

- [ ] **Income**
  - [ ] SUTR ingresos → Renalfy Income
  - [ ] Assign tenantId + primary locationId (Decision 2)

- [ ] **Expense**
  - [ ] SUTR egresos → Renalfy Expense
  - [ ] Assign tenantId + primary locationId (Decision 2)

- [ ] **CashClose**
  - [ ] SUTR cortes → Renalfy CashClose
  - [ ] Calculate balance (sum of included sales/income/expense)
  - [ ] Assign tenantId + locationId

- [ ] **AuditLog (Backfill)**
  - [ ] Create entries for all migrated records
  - [ ] action = MIGRATION_IMPORT
  - [ ] source = MIGRATION
  - [ ] Assign tenantId + userId = system user

- [ ] **PatientConsent (Backfill)**
  - [ ] Create for each patient (if not already created in Patient migration)
  - [ ] grantedAt = 1 day before first appointment (or now() if no appointments)
  - [ ] type = PRIVACY_NOTICE
  - [ ] Clear audit trail

### Sample Data Testing

- [ ] **Extract sample SUTR data:** 100–200 rows per table
- [ ] **Run migration on sample:** `npx ts-node migrate.ts --sample-only`
- [ ] **Validate output:**
  - [ ] All 100–200 rows migrated
  - [ ] No missing FKs (referential integrity)
  - [ ] ID mapping complete (every old ID has new UUID)
  - [ ] Transformations correct (folio format, plan status, stock quantities)
  - [ ] Receipt folios unique (no duplicates)

### Bug Fixes & Refinement

- [ ] **Issues found during sample test:** Documented with clear error messages
- [ ] **Root cause analysis:** Why did it fail?
- [ ] **Fix implemented:** Change script to handle the issue
- [ ] **Re-test:** Run sample migration again, verify fix works
- [ ] **Iterate:** Until sample migration passes cleanly

### Script Validation

- [ ] **Execution time:** Sample migration runs in < 30 minutes
- [ ] **Memory usage:** No memory leaks (monitor during long runs)
- [ ] **Error handling:** Graceful failure with clear error message if SUTR DB unavailable
- [ ] **Logging:** All transformations logged to file (at least WARN+ level visible)
- [ ] **Documentation:** Script has README with usage examples

### Sign-Off

- [ ] **Migration lead:** Script ready for production (not perfect, but tested + debugged)
- [ ] **Architect:** Transformation logic reviewed and approved
- [ ] **Stakeholder:** Informed of readiness for Sprint 28 cutover

---

## Phase 7: Sprint 28 — Production Migration & Cutover (Week 20)

### Pre-Cutover Preparation (Days 1–3)

- [ ] **Announce maintenance window:** Email users (24–48h notice)
- [ ] **Final SUTR backup:** Full production backup taken (retained post-migration)
- [ ] **Renalfy staging validation:** Latest code deployed + tested on staging
- [ ] **Rollback plan reviewed:** Team walks through rollback procedure
- [ ] **Stakeholder notification:** PO aware of cutover date/time
- [ ] **On-call team assigned:** Tech support available during + 24h post-cutover

### Cutover Day (Day 4)

**T-0 (Morning):**
- [ ] **Maintenance window announced:** Slack/email to all users
- [ ] **SUTR placed in read-only mode:** Users cannot create new data
- [ ] **Final backup:** SUTR + Renalfy (before migration starts)

**T+0 (Migration start):**
- [ ] **Run full migration script:** `npx ts-node migrate.ts --source-db <SUTR> --target-db <RENALFY>`
- [ ] **Monitor execution:**
  - [ ] Process doesn't hang (check logs every 10 min)
  - [ ] No "out of memory" errors
  - [ ] Migration progresses (log output shows tables migrating)

**T+1 hour (Validation phase):**
- [ ] **Row count reconciliation:** Compare SUTR row counts with Renalfy
  - [ ] Users: exact match
  - [ ] Patients: exact match
  - [ ] Receipts: exact match (+ new folio format)
  - [ ] [etc. for all tables]
  - [ ] Tolerance: 0 rows missing (100% match required)

- [ ] **Referential integrity check:** Run PostgreSQL constraint validation
  - [ ] All foreign keys valid
  - [ ] No orphaned records
  - [ ] No duplicate folios

- [ ] **Business logic validation:**
  - [ ] Receipt folios formatted correctly (LOC-YYYY-NNNNN)
  - [ ] Plan session counters accurate
  - [ ] Stock quantities match expectations
  - [ ] Cash totals reconcile (sum of sales + income - expense)
  - [ ] Patient consent records created (all patients have consent)
  - [ ] Audit log entries created (migration logged)

- [ ] **User access testing:**
  - [ ] 1–2 test users can log in to Renalfy
  - [ ] Password reset works (all migrated users must reset on first login)
  - [ ] RLS works (user in Location A cannot see Location B data)

- [ ] **Performance validation:**
  - [ ] Query response time acceptable (< 1s for common queries)
  - [ ] UI loads in < 3s
  - [ ] No N+1 queries visible in logs

**T+2 hours (Go/No-Go Decision):**
- [ ] **Validation summary:** All checks pass ✅
- [ ] **Stakeholder sign-off:** PO approves go-live ✅
- [ ] **Decision:** GO or ROLLBACK?
  - [ ] GO: Enable Renalfy for users (maintenance window ends)
  - [ ] ROLLBACK: Restore SUTR from backup, reschedule migration

### Post-Cutover (Parallel Operation — 30–60 Days)

- [ ] **SUTR:** Kept in read-only mode; users cannot write
- [ ] **Renalfy:** Live; users gradually transitioned
- [ ] **Data sync:** Some tables kept in sync (if applicable) for validation
- [ ] **Monitoring:** 24/7 monitoring for errors, performance issues
- [ ] **Support:** Help desk ready to assist users
- [ ] **Training:** User guides + documentation available
- [ ] **Feedback loop:** Collect user issues, prioritize fixes

### Parallel Operation Validation (Days 1–30)

- [ ] **Daily checks:**
  - [ ] No critical errors in error logs
  - [ ] Page load times acceptable
  - [ ] RLS enforced (no data leaks)
  - [ ] Users can perform workflows (patient → receipt → plan)

- [ ] **Weekly validation:**
  - [ ] Spot-check sample of migrated data (10–20 records per table)
  - [ ] Verify calculations still correct
  - [ ] Measure user adoption (% of users logged into Renalfy vs. SUTR)
  - [ ] Collect feedback from beta users

- [ ] **Contingency prep:**
  - [ ] If critical bugs found: Sprint 29 can start bug-fix cycle
  - [ ] Rollback plan remains available (full backup retained)
  - [ ] Stakeholder decision: Continue parallel or escalate

### SUTR Decommissioning (Day 30–60)

- [ ] **User migration complete:** All users transitioned to Renalfy
- [ ] **Data validation complete:** All data accurate in Renalfy
- [ ] **Final decision:** SUTR can be shut down
- [ ] **Archive SUTR:** Database backed up to cold storage (for compliance)
- [ ] **Decommission SUTR infrastructure:** Servers shut down (save costs)
- [ ] **Announce sunset:** Email users that SUTR is offline

### Cutover Sign-Off

- [ ] **Migration lead:** Confirms migration complete and validated ✅
- [ ] **Architect:** Approves system ready for production ✅
- [ ] **Product owner:** Approves go-live and user transition ✅
- [ ] **Stakeholders:** All sign-off obtained ✅
- [ ] **Documentation:** Cutover report filed with results + lessons learned

---

## Phase 8: Sprint 29+ — Post-Launch Stabilization (Weeks 21+)

### Week 1 (Sprint 29 Start): Crisis Mode

- [ ] **Monitor logs:** Any errors appearing?
- [ ] **User reports:** Critical bugs from real users?
- [ ] **Performance:** Page loads still acceptable under real load?
- [ ] **Data accuracy:** Any data discrepancies discovered?

**If critical bugs found:**
- [ ] Prioritize + fix immediately
- [ ] Deploy hotfix
- [ ] Communicate resolution to users

**If performance issues found:**
- [ ] Identify slow queries
- [ ] Optimize (add indexes, cache, query refactor)
- [ ] Re-deploy + verify improvement

### Weeks 2–4 (Sprint 29 Continuation): Stabilization

- [ ] **Bug triage:** All reported issues categorized + prioritized
- [ ] **Medium bugs:** Fix in Sprint 29 (improving user experience)
- [ ] **Low bugs:** Schedule for Sprint 30+ (polish work)
- [ ] **Documentation:** Update user guides based on feedback
- [ ] **Training:** Address common user questions

### Post-Sprint 29: Roadmap Planning

- [ ] **User feedback summary:** What do users want?
- [ ] **Planned enhancements (Sprint 30+):**
  - [ ] Reports (PDF/Excel)
  - [ ] Notifications (in-app alerts)
  - [ ] Analytics dashboard
  - [ ] Third-party integrations
  - [ ] Mobile app

- [ ] **Prioritize:** What's most important to users?
- [ ] **Plan Sprints 30+** based on priorities

---

## Final Verification Checklist

**Before declaring "Migration Complete":**

- [ ] All 25,000+ rows migrated ✅
- [ ] Zero data loss (100% referential integrity) ✅
- [ ] Users can log in ✅
- [ ] Workflows function (patient → appointment → receipt → plan → sales → cashclose) ✅
- [ ] RLS enforced (multi-tenant isolation verified) ✅
- [ ] Compliance met (consent + audit logs) ✅
- [ ] Performance acceptable (< 3s page load, < 500ms API) ✅
- [ ] Rollback tested (can revert in < 2 hours if needed) ✅
- [ ] Stakeholder sign-off obtained ✅
- [ ] Go-live date reached (Sprint 28 target) ✅

---

## Timeline at a Glance

| Phase | Duration | Status |
|---|---|---|
| Phase 1: Approval & Planning | Weeks 1–2 | ⏳ Ready to start |
| Phase 2: Prep & Planning | Weeks 2–3 | ⏳ After Phase 1 |
| Phase 3: Sprints 13–24 Execution | Weeks 3–18 | ⏳ After Phase 2 |
| Phase 4: Sprint 25 QA | Week 19 | ⏳ After Phase 3 |
| Phase 5: Sprint 26 Migration Prep | Week 20 | ⏳ After Phase 4 |
| Phase 6: Sprint 27 Migration Dev | Week 21 | ⏳ After Phase 5 |
| Phase 7: Sprint 28 Cutover | Week 22 | ⏳ After Phase 6 |
| Phase 8: Sprint 29+ Post-Launch | Weeks 23+ | ⏳ After Phase 7 |

---

**Status:** ✅ Checklist ready for use

**Next:** Print/share this checklist with team. Update status weekly. Use as project dashboard.

---

**Prepared by:** Renalfy Architecture Team
**Date:** 2026-03-22
**Version:** 1.0
