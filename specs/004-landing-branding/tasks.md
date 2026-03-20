# Tasks: Dynamic Landing Page & Tenant Branding

**Branch**: `004-landing-branding` | **Plan**: [plan.md](./plan.md)

---

## Phase 0 — Schema en @repo/types

- [ ] **T-001** Crear `packages/types/src/tenant-settings.schemas.ts` con `TenantSettingsSchema`, `PublicTenantResponseSchema`, `UpdateTenantSettingsSchema`
- [ ] **T-002** Actualizar `packages/types/src/index.ts` — re-exportar nuevos schemas
- [ ] **T-003** Verificar compilación: `pnpm --filter @repo/types exec tsc --noEmit`

## Phase 1 — Backend: PublicTenantsModule

- [ ] **T-004** Escribir `public-tenants.service.spec.ts` — tests en rojo para `findBySlug` (found / not found)
- [ ] **T-005** Implementar `PublicTenantsService.findBySlug` (Green)
- [ ] **T-006** Crear `PublicTenantsController` — `GET /api/public/tenants/:slug` sin guards
- [ ] **T-007** Crear `PublicTenantsModule` y registrar en `AppModule`

## Phase 2 — Backend: TenantSettingsModule

- [ ] **T-008** Crear `update-tenant-settings.dto.ts`
- [ ] **T-009** Escribir `tenant-settings.service.spec.ts` — tests en rojo para `update` (OWNER ok / ADMIN 403 / cross-tenant bloqueado)
- [ ] **T-010** Implementar `TenantSettingsService.update` (Green)
- [ ] **T-011** Crear `TenantSettingsController` — `PATCH /api/tenant-settings` con `@Roles(UserRole.OWNER)`
- [ ] **T-012** Crear `TenantSettingsModule` y registrar en `AppModule`

## Phase 3 — Frontend: Middleware

- [ ] **T-013** Configurar Vitest en `apps/web` (`vitest.config.ts` + dependencias)
- [ ] **T-014** Escribir `middleware.test.ts` — tests en rojo para extracción de subdominio e inyección de headers
- [ ] **T-015** Implementar `middleware.ts` — extraer slug del `Host`, inyectar `x-tenant-slug`, manejar localhost con `NEXT_PUBLIC_DEV_TENANT_SLUG`, configurar `matcher`

## Phase 4 — Frontend: Landing Page

- [ ] **T-016** Crear `apps/web/lib/api.ts` — `getPublicTenant(slug)` con `PublicTenantResponseSchema.parse()` y manejo de error 404
- [ ] **T-017** Escribir `[tenant]/page.test.tsx` — test en rojo: nombre y tagline del tenant aparecen en el render (mockear `lib/api.ts`)
- [ ] **T-018** Implementar `apps/web/app/(landing)/[tenant]/page.tsx` — Server Component con `notFound()` si tenant no existe
- [ ] **T-019** Implementar `apps/web/app/(landing)/[tenant]/layout.tsx` — CSS variables de branding + metadatos dinámicos (`<title>`, `<meta description>`)
- [ ] **T-020** Implementar `apps/web/app/(landing)/[tenant]/not-found.tsx` — página 404 descriptiva
- [ ] **T-021** Agregar link a `/{tenant}/privacidad` en el footer de la landing (cumplimiento LFPDPPP)

## Phase 5 — Gates finales

- [ ] **T-022** `pnpm lint` — cero errores y warnings (backend + frontend)
- [ ] **T-023** `pnpm check-types` — cero errores TypeScript (backend + frontend)
- [ ] **T-024** `pnpm --filter api test` — todos los unit tests en verde
- [ ] **T-025** `pnpm --filter web test` — todos los tests de Vitest en verde
- [ ] **T-026** Commit y PR a `main`
