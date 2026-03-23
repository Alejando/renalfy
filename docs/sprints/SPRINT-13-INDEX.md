# Sprint 13 — Documentation Index

**Module 2: Companies + Plans (Backend)**

All planning is complete and ready for implementation. This index guides you to each document.

---

## 🎯 Start Here

**New to Sprint 13?** Start with these in order:

1. **[SPRINT-13-QUICKREF.md](./SPRINT-13-QUICKREF.md)** (5 min read)
   - Quick overview of what needs to be built
   - Schema status, module structure, key decisions
   - High-level test plan
   - **Perfect for:** Understanding the big picture

2. **[SPRINT-13-COMPANIES-PLANS-BACKEND.md](./SPRINT-13-COMPANIES-PLANS-BACKEND.md)** (20 min read + reference)
   - Detailed implementation guide
   - Complete API contract
   - Business rules
   - TDD workflow step-by-step
   - **Perfect for:** Developer actually implementing the feature

3. **[../decisions/ADR-013-A-*.md](../decisions/ADR-013-A-ONE-ACTIVE-PLAN-PER-PATIENT-SERVICETYPE.md)** (5 min read)
   - Why only 1 ACTIVE plan per (patientId, serviceTypeId)
   - Rationale and alternatives considered
   - **Perfect for:** Understanding design choices

4. **[../decisions/ADR-013-B-*.md](../decisions/ADR-013-B-PLAN-LOCATIONID-EXPLICIT.md)** (5 min read)
   - Why locationId is explicit, not derived from patient
   - RLS implications
   - **Perfect for:** Understanding data model decisions

5. **[../specs/companies-plans.md](../specs/companies-plans.md)** (30 min read + reference)
   - Complete feature specification
   - Data model details
   - Zod schemas
   - API contract (all 10 endpoints)
   - Business rules (13 for Plans, 3 for Companies)
   - Test plan with full assertions
   - **Perfect for:** Comprehensive reference during implementation

---

## 📋 By Purpose

### For Planning & Analysis
- **[SPRINT-13-QUICKREF.md](./SPRINT-13-QUICKREF.md)** — 1-page overview
- **[SPRINT-13-COMPANIES-PLANS-BACKEND.md](./SPRINT-13-COMPANIES-PLANS-BACKEND.md)** — Full plan

### For Architecture Decisions
- **[ADR-013-A](../decisions/ADR-013-A-ONE-ACTIVE-PLAN-PER-PATIENT-SERVICETYPE.md)** — Plan constraint rationale
- **[ADR-013-B](../decisions/ADR-013-B-PLAN-LOCATIONID-EXPLICIT.md)** — locationId design decision

### For Implementation Reference
- **[companies-plans.md](../specs/companies-plans.md)** — Complete spec
- **[SPRINT-13-COMPANIES-PLANS-BACKEND.md](./SPRINT-13-COMPANIES-PLANS-BACKEND.md)** — Step-by-step guide

### For Testing
- **[SPRINT-13-COMPANIES-PLANS-BACKEND.md](./SPRINT-13-COMPANIES-PLANS-BACKEND.md)** — Section 8: TDD Workflow & Test Plan
- **[companies-plans.md](../specs/companies-plans.md)** — Section: Test Plan

---

## 📊 Document Breakdown

| Document | Purpose | Length | Link |
|----------|---------|--------|------|
| SPRINT-13-QUICKREF.md | Quick reference | 1 page | [Link](./SPRINT-13-QUICKREF.md) |
| SPRINT-13-COMPANIES-PLANS-BACKEND.md | Full implementation plan | 14 sections | [Link](./SPRINT-13-COMPANIES-PLANS-BACKEND.md) |
| ADR-013-A | One ACTIVE plan constraint | 4 sections | [Link](../decisions/ADR-013-A-ONE-ACTIVE-PLAN-PER-PATIENT-SERVICETYPE.md) |
| ADR-013-B | Explicit locationId rationale | 4 sections | [Link](../decisions/ADR-013-B-PLAN-LOCATIONID-EXPLICIT.md) |
| companies-plans.md | Feature specification | 15 sections | [Link](../specs/companies-plans.md) |

---

## 🔍 Quick Lookups

### "How do I implement Companies service?"
→ [SPRINT-13-COMPANIES-PLANS-BACKEND.md § Phase 2](./SPRINT-13-COMPANIES-PLANS-BACKEND.md#phase-2-companies-service-unit-tests-first-3–4-hours)

### "What are all the API endpoints?"
→ [companies-plans.md § API Contract](../specs/companies-plans.md#api-contract)

### "What should my tests cover?"
→ [companies-plans.md § Test Plan](../specs/companies-plans.md#test-plan)

### "How does RLS work for Plans?"
→ [SPRINT-13-COMPANIES-PLANS-BACKEND.md § Appendix B](./SPRINT-13-COMPANIES-PLANS-BACKEND.md#appendix-b-quick-reference—rls-implementation)

### "Can a patient have multiple plans?"
→ [ADR-013-A § Decision](../decisions/ADR-013-A-ONE-ACTIVE-PLAN-PER-PATIENT-SERVICETYPE.md#decision)

### "Why is locationId explicit?"
→ [ADR-013-B § Rationale](../decisions/ADR-013-B-PLAN-LOCATIONID-EXPLICIT.md#rationale)

### "How do Receipts and Plans integrate?"
→ [SPRINT-13-COMPANIES-PLANS-BACKEND.md § Dependencies](./SPRINT-13-COMPANIES-PLANS-BACKEND.md#2-dependency-check-sprint-7-receipts-verification)

### "What's the TDD workflow?"
→ [SPRINT-13-COMPANIES-PLANS-BACKEND.md § Implementation Order](./SPRINT-13-COMPANIES-PLANS-BACKEND.md#8-implementation-order-sequential)

### "What are the business rules?"
→ [companies-plans.md § Business Rules](../specs/companies-plans.md#business-rules) (13 for Plans, 3 for Companies)

---

## 🎓 Learning Path

**For a developer new to this module:**

1. Read **QUICKREF** (understand what's being built)
2. Skim **BACKEND plan** (understand the workflow)
3. Read **ADR-013-A & B** (understand why these decisions matter)
4. Implement **Phase 1: Zod Schemas** using BACKEND plan as guide
5. Reference **Spec** while implementing other phases
6. Use **Test Plan** in Spec to write comprehensive tests

**Estimated time:** 1.5 hours learning + 14–20 hours implementation

---

## ✅ Implementation Checklist

Use this to track progress:

### Pre-Implementation
- [ ] Read QUICKREF (5 min)
- [ ] Read BACKEND plan § 1-4 (15 min)
- [ ] Review ADRs (10 min)

### Phase 1: Zod Schemas
- [ ] Create companies-plans.schemas.ts
- [ ] Export all types
- [ ] pnpm check-types passes

### Phase 2: Companies Service
- [ ] Write all unit tests (tests fail)
- [ ] Implement service (tests pass)
- [ ] Refactor for clarity

### Phase 3: Companies Controller
- [ ] Create DTOs
- [ ] Implement 5 endpoints
- [ ] Register module

### Phase 4: Plans Service
- [ ] Write all unit tests (tests fail)
- [ ] Implement service (tests pass)
- [ ] Refactor for clarity

### Phase 5: Plans Controller
- [ ] Create DTOs
- [ ] Implement 5 endpoints
- [ ] Register module

### Phase 6: E2E Tests
- [ ] Write full workflows
- [ ] Test Receipts integration
- [ ] Validate RLS

### Phase 7: Final Verification
- [ ] pnpm lint passes
- [ ] pnpm check-types passes
- [ ] pnpm --filter api test passes
- [ ] pnpm --filter api test:e2e passes

---

## 🎯 Success Criteria

Sprint 13 is **DONE** when:

- ✅ All documentation reviewed and understood
- ✅ All phases implemented following TDD
- ✅ All tests pass (unit + E2E)
- ✅ pnpm lint, check-types all green
- ✅ Code passes team review
- ✅ Feature spec and ADRs are accurate

---

## 🔗 Related Documentation

- **Previous sprints:** Sprint 7 (Receipts — dependency)
- **Related modules:** Patients, Receipts, ServiceTypes
- **Migration guide:** [SUTR_RENALFY_ENTITY_MAPPING.md](../SUTR_RENALFY_ENTITY_MAPPING.md)

---

## 📝 Questions?

If you have questions while implementing:

1. Check the **QUICKREF** for quick answers
2. Consult the **Spec** for detailed rules
3. Review the relevant **ADR** for design rationale
4. Follow the **BACKEND plan** Phase-by-phase

---

**Generated:** 2026-03-22
**Status:** Ready for Implementation
