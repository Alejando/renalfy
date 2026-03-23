# SPRINT 14 — Índice de documentación

**Sprint:** 14 (UI — Módulo 2: Empresas + Planes)
**Versión:** 1.0
**Última actualización:** 2026-03-23

---

## Documentos principales

### [SPRINT-14-COMPANIES-PLANS-UI.md](./SPRINT-14-COMPANIES-PLANS-UI.md)
Plan técnico completo de Sprint 14. Incluye:
- Objetivo general y dependencias
- Alcance (incluido/excluido)
- Especificación de 4 pantallas principales (Company List, New Company Drawer, Plan List, New Plan Drawer)
- Estructura de archivos a crear
- Server actions (CRUD companies, CRUD plans)
- Componentes principales (CompanyPageClient, CompanyDrawer, PlanPageClient, PlanDrawer)
- 5 flujos de usuario (crear empresa, editar empresa, crear plan, editar plan, filtrar planes)
- Plan de pruebas (unit + E2E)
- Orden de implementación en 4 fases
- Criterios de aceptación
- Decisiones de diseño
- Riesgos y mitigaciones

**Lectura recomendada:** Antes de iniciar cualquier tarea en este sprint.

---

## Quick Reference

### Rutas a implementar
```
✅ GET    /companies              — Company List
✅ POST   /companies              — New Company (via drawer)
✅ PATCH  /companies/:id          — Edit Company (via drawer)
✅ DELETE /companies/:id          — Delete Company

✅ GET    /plans                  — Plan List
✅ POST   /plans                  — New Plan (via drawer)
✅ PATCH  /plans/:id              — Edit Plan (via drawer)
✅ DELETE /plans/:id              — Delete Plan
```

### Archivos a crear

#### Server Actions
- `apps/web/app/actions/companies.ts`
- `apps/web/app/actions/plans.ts`

#### Companies UI
- `apps/web/app/tenants/[slug]/(dashboard)/companies/page.tsx`
- `apps/web/app/tenants/[slug]/(dashboard)/companies/companies-page-client.tsx`
- `apps/web/app/tenants/[slug]/(dashboard)/companies/company-drawer.tsx`
- `apps/web/app/tenants/[slug]/(dashboard)/companies/company-form.tsx`
- `apps/web/app/tenants/[slug]/(dashboard)/companies/companies-page-client.test.tsx`
- `apps/web/app/tenants/[slug]/(dashboard)/companies/company-drawer.test.tsx`
- `apps/web/app/tenants/[slug]/(dashboard)/companies/company-form.test.tsx`

#### Plans UI
- `apps/web/app/tenants/[slug]/(dashboard)/plans/page.tsx`
- `apps/web/app/tenants/[slug]/(dashboard)/plans/plans-page-client.tsx`
- `apps/web/app/tenants/[slug]/(dashboard)/plans/plan-drawer.tsx`
- `apps/web/app/tenants/[slug]/(dashboard)/plans/plan-form.tsx`
- `apps/web/app/tenants/[slug]/(dashboard)/plans/plan-status-badge.tsx`
- `apps/web/app/tenants/[slug]/(dashboard)/plans/plan-progress-bar.tsx`
- `apps/web/app/tenants/[slug]/(dashboard)/plans/plans-page-client.test.tsx`
- `apps/web/app/tenants/[slug]/(dashboard)/plans/plan-drawer.test.tsx`
- `apps/web/app/tenants/[slug]/(dashboard)/plans/plan-form.test.tsx`

#### Utilities & Constants
- `lib/constants/plan-constants.ts` (PLAN_STATUSES, STATUS_LABELS, etc.)
- `lib/utils/plan-utils.ts` (formatters, helpers)

### Access Control Rules
```
Companies (/companies):
  ✅ Only OWNER, ADMIN can view and edit
  ❌ MANAGER, STAFF cannot see this section

Plans (/plans):
  ✅ OWNER, ADMIN see all plans
  ✅ MANAGER, STAFF see only plans where locationId === userLocationId
  ✅ All roles can create/edit plans (subject to locationId restriction)
```

### Design System ("The Clinical Curator")
- **Primary color:** `#00647c` (deep teal)
- **Secondary color:** `#5d5e66` (slate)
- **Tertiary (alerts):** `#825100` (amber)
- **Background (surface):** `#f7f9fb`
- **Cards:** `#ffffff`
- **No-line rule:** No 1px borders; use background color shifts for separation
- **Typography:** Manrope (headlines), Inter (body)
- **Radius:** `rounded-md` (inputs), `rounded-lg` (buttons)

### Mockups
All mockups available in Stitch project `14996019202291546385`:
- Company List (Screen ID: [PENDING])
- New Company Drawer (Screen ID: `837e7b282b7f4d5e9266677e18caf4eb`)
- Plan List (Screen ID: [PENDING])
- New Plan Drawer (Screen ID: [PENDING])

### Key Backend Endpoints (Sprint 13)
```
POST   /api/companies              body: CreateCompanySchema
GET    /api/companies              query: { page, limit, search }
GET    /api/companies/:id
PATCH  /api/companies/:id          body: UpdateCompanySchema
DELETE /api/companies/:id

POST   /api/plans                  body: CreatePlanSchema
GET    /api/plans                  query: { page, limit, companyId, status, patientId }
GET    /api/plans/:id
PATCH  /api/plans/:id              body: UpdatePlanSchema (excludes patientId, usedSessions)
DELETE /api/plans/:id
```

---

## Implementation Phases

### Phase 1: Setup + Server Actions (1–2 days)
1. Create server actions (companies.ts, plans.ts)
2. Create route folders and page wrappers
3. Unit test server actions

### Phase 2: Companies UI (2–3 days)
1. Implement company-form.tsx + tests
2. Implement company-drawer.tsx + tests
3. Implement companies-page-client.tsx + tests
4. Polish and error handling

### Phase 3: Plans UI (3–4 days)
1. Implement plan-form.tsx + tests
2. Implement plan-drawer.tsx + tests
3. Implement plan-status-badge.tsx, plan-progress-bar.tsx
4. Implement plans-page-client.tsx + tests
5. Polish and error handling

### Phase 4: Integration + Polish (1–2 days)
1. Verify navigation and links
2. Validate RLS in frontend
3. E2E testing
4. Lint, type-check, test pass
5. Code review and merge

---

## Definition of Done

A feature is complete when:
1. ✅ All acceptance criteria met
2. ✅ Unit tests written and passing
3. ✅ E2E tests written and passing
4. ✅ `pnpm lint` passes (no warnings)
5. ✅ `pnpm check-types` passes (no TS errors)
6. ✅ `pnpm test` passes (all tests green)
7. ✅ Code reviewed and approved
8. ✅ Merged to `main`

---

## Related Documentation

- **Sprint 13 (Backend):** `/docs/sprints/SPRINT-13-COMPANIES-PLANS-BACKEND.md`
- **Architecture Decisions:**
  - ADR-013-A: One Active Plan Per Patient/ServiceType
  - ADR-013-B: Plan LocationId Explicit
- **Type Definitions:** `packages/types/src/companies-plans.schemas.ts`
- **Design System:** Memory file `stitch_design_project.md`

---

## Contact & Questions

**Sprint Owner:** Alejandro Prado (Project Architect)
**Questions about:** Architecture, design decisions, integration points

For implementation issues, refer to CLAUDE.md project conventions and existing patterns in Sprint 12 (Receipts UI).

---

**Version:** 1.0
**Last Updated:** 2026-03-23
**Status:** Ready for implementation
