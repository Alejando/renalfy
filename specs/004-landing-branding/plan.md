# Implementation Plan: Dynamic Landing Page & Tenant Branding

**Branch**: `004-landing-branding` | **Date**: 2026-03-19 | **Spec**: [spec.md](./spec.md)

---

## Summary

Implementar la infraestructura multi-tenant en el frontend (middleware de resolución de subdominio), el endpoint público de branding en el backend, la landing page dinámica por tenant en Next.js, y el endpoint autenticado para que el OWNER actualice su branding.

## Technical Context

**Language/Version**: TypeScript / Node 25
**Primary Dependencies (backend)**: NestJS, Prisma 7, nestjs-zod, @repo/types
**Primary Dependencies (frontend)**: Next.js 16 App Router, Tailwind CSS v4, @repo/types
**Storage**: PostgreSQL 16 (lectura de `Tenant` + `TenantSettings`)
**Testing**: Jest (backend unit) · Vitest + React Testing Library (frontend)
**Target Platform**: Backend NestJS + Frontend Next.js
**Performance Goals**: Landing debe renderizar en < 500ms (SSR con fetch al backend local)
**Constraints**: El endpoint público NO lleva `JwtAuthGuard`. `tenantId` del OWNER del JWT para escritura. Server Components por defecto en Next.js.
**Scale/Scope**: 1 endpoint público + 1 endpoint protegido + 1 página SSR + middleware

## Constitution Check

| Principio | ¿Cumple? | Notas |
|---|---|---|
| I. Multi-tenant | ✅ | Middleware resuelve slug → tenantId; endpoint público filtra por slug |
| II. Schema-first | ✅ | `TenantSettingsSchema` en `@repo/types` antes de backend/frontend |
| III. TDD | ✅ | Tests antes de implementación en cada capa |
| IV. Compliance | ✅ | Landing pública incluye link a `/privacidad` (LFPDPPP) |
| V. Security | ✅ | Endpoint público solo expone datos de branding, nunca datos internos |
| VI. Simplicity | ✅ | Server Component simple, sin estado en cliente para la landing |

## Project Structure

### Documentation

```text
specs/004-landing-branding/
├── spec.md      ← historias, requisitos, criterios de éxito
├── plan.md      ← este archivo
└── tasks.md     ← tareas atómicas
```

### Source Code

```text
packages/types/src/
├── tenant-settings.schemas.ts  ← NEW: TenantSettingsSchema, PublicTenantResponseSchema,
│                                        UpdateTenantSettingsSchema
└── index.ts                    ← actualizar re-exports

apps/api/src/
├── public-tenants/
│   ├── public-tenants.module.ts     ← NEW (sin guards)
│   ├── public-tenants.controller.ts ← NEW: GET /api/public/tenants/:slug
│   ├── public-tenants.service.ts    ← NEW
│   └── public-tenants.service.spec.ts ← NEW
├── tenant-settings/
│   ├── tenant-settings.module.ts     ← NEW
│   ├── tenant-settings.controller.ts ← NEW: PATCH /api/tenant-settings
│   ├── tenant-settings.service.ts    ← NEW
│   ├── tenant-settings.service.spec.ts ← NEW
│   └── dto/
│       └── update-tenant-settings.dto.ts ← NEW
└── app.module.ts               ← registrar nuevos módulos

apps/web/
├── middleware.ts               ← NEW: resolución de subdominio → x-tenant-slug
├── middleware.test.ts          ← NEW: unit test del middleware
├── app/
│   └── (landing)/
│       └── [tenant]/
│           ├── layout.tsx      ← NEW: aplica CSS variables de branding
│           ├── page.tsx        ← NEW: Server Component, llama al backend
│           └── not-found.tsx   ← NEW: página 404 por tenant
├── lib/
│   └── api.ts                  ← NEW: helpers tipados para fetch al backend
└── vitest.config.ts            ← NEW: configuración de Vitest para web
```

## Phases

### Phase 0 — Schema en @repo/types

1. `tenant-settings.schemas.ts` — `TenantSettingsSchema`, `PublicTenantResponseSchema`, `UpdateTenantSettingsSchema`
2. Actualizar `index.ts`
3. Verificar compilación

### Phase 1 — Backend: PublicTenantsModule (TDD)

1. Unit test `public-tenants.service.spec.ts` — rojo: `findBySlug` retorna datos, lanza `NotFoundException` si slug inválido
2. Implementar `PublicTenantsService`
3. `PublicTenantsController` — sin `JwtAuthGuard`, prefijo `public/tenants`
4. Registrar en `AppModule`

### Phase 2 — Backend: TenantSettingsModule (TDD)

1. Unit test `tenant-settings.service.spec.ts` — rojo: `update` actualiza solo el tenant del caller, ADMIN recibe `ForbiddenException`
2. Implementar `TenantSettingsService`
3. `TenantSettingsController` — `@Roles(UserRole.OWNER)`, `PATCH /api/tenant-settings`
4. Registrar en `AppModule`

### Phase 3 — Frontend: Middleware

1. Unit test `middleware.test.ts` — rojo: verifica inyección de `x-tenant-slug` a partir del hostname
2. Implementar `middleware.ts` — extraer subdominio de `Host`, inyectar header, manejar localhost con `NEXT_PUBLIC_DEV_TENANT_SLUG`
3. Configurar `matcher` en el middleware para excluir `/_next/`, `/api/`, assets estáticos

### Phase 4 — Frontend: Landing Page (Vitest + RTL)

1. Configurar Vitest en `apps/web`
2. Test de componente `page.test.tsx` — rojo: verifica que nombre y tagline del tenant aparecen en el render
3. Implementar `lib/api.ts` — `getPublicTenant(slug)` con `PublicTenantResponseSchema.parse()`
4. Implementar `[tenant]/page.tsx` — Server Component con `fetch` + `notFound()` si 404
5. Implementar `[tenant]/layout.tsx` — inyecta `--color-primary` y `--color-secondary` como CSS variables inline
6. Implementar `[tenant]/not-found.tsx` — página 404 descriptiva

### Phase 5 — Gates finales

```bash
pnpm lint
pnpm check-types
pnpm --filter api test
pnpm --filter web test     # Vitest
```

## Complexity Tracking

No hay violaciones a la constitución en este plan.
