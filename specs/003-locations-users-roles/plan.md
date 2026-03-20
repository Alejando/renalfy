# Implementation Plan: Locations, Users & Role-Based Access

**Branch**: `003-locations-users-roles` | **Date**: 2026-03-19 | **Spec**: [spec.md](./spec.md)

---

## Summary

Implementar `LocationModule` y `UserModule` en NestJS con CRUD completo, filtrado automático por `tenantId` y `locationId` según rol, más un `RolesGuard` reutilizable y el decorator `@Roles()`. Todo desarrollado en ciclo TDD (Red → Green → Refactor).

## Technical Context

**Language/Version**: TypeScript / Node 25
**Primary Dependencies**: NestJS, Prisma 7, nestjs-zod, bcrypt, @repo/types
**Storage**: PostgreSQL 16 (ya configurado con RLS)
**Testing**: Jest (unit) + Jest E2E con BD de test
**Target Platform**: Backend NestJS en `apps/api`
**Performance Goals**: N/A para este sprint
**Constraints**: `tenantId` siempre del JWT, nunca del body. Sin `any`. `.js` en imports locales.
**Scale/Scope**: Endpoints internos del dashboard — no expuestos públicamente aún.

## Constitution Check

| Principio | ¿Cumple? | Notas |
|---|---|---|
| I. Multi-tenant | ✅ | `tenantId` del JWT, RLS activo, filtros en servicio |
| II. Schema-first | ✅ | Schemas en `@repo/types` antes de tocar backend |
| III. TDD | ✅ | Red → Green → Refactor obligatorio por cada FR |
| IV. Compliance | N/A | Sprint 3 no toca datos clínicos de pacientes |
| V. Security | ✅ | Passwords con bcrypt, `RolesGuard` en todos los endpoints |
| VI. Simplicity | ✅ | Un módulo por recurso, sin abstracciones extras |

## Project Structure

### Documentation (this feature)

```text
specs/003-locations-users-roles/
├── spec.md      ← historias, requisitos, criterios de éxito
├── plan.md      ← este archivo
└── tasks.md     ← tareas atómicas en orden de ejecución
```

### Source Code

```text
packages/types/src/
├── locations.schemas.ts   ← NEW: CreateLocationSchema, UpdateLocationSchema, LocationResponseSchema
├── users.schemas.ts       ← NEW: CreateUserSchema, UpdateUserSchema, UserResponseSchema
└── index.ts               ← actualizar re-exports

apps/api/src/
├── common/
│   ├── guards/
│   │   ├── jwt-auth.guard.ts         (existente)
│   │   ├── jwt-refresh.guard.ts      (existente)
│   │   └── roles.guard.ts            ← NEW
│   └── decorators/
│       ├── current-user.decorator.ts (existente)
│       ├── audit.decorator.ts        (existente)
│       └── roles.decorator.ts        ← NEW
├── locations/
│   ├── locations.module.ts           ← NEW
│   ├── locations.controller.ts       ← NEW
│   ├── locations.service.ts          ← NEW
│   ├── locations.service.spec.ts     ← NEW (unit tests)
│   └── dto/
│       ├── create-location.dto.ts    ← NEW
│       └── update-location.dto.ts    ← NEW
└── users/
    ├── users.module.ts               ← NEW
    ├── users.controller.ts           ← NEW
    ├── users.service.ts              ← NEW
    ├── users.service.spec.ts         ← NEW (unit tests)
    └── dto/
        ├── create-user.dto.ts        ← NEW
        ├── update-user.dto.ts        ← NEW
        └── update-user-status.dto.ts ← NEW

apps/api/test/
├── locations.e2e-spec.ts             ← NEW
└── users.e2e-spec.ts                 ← NEW
```

## Phases

### Phase 0 — Schemas en @repo/types

Antes de escribir una sola línea de backend:

1. `packages/types/src/locations.schemas.ts` — `CreateLocationSchema`, `UpdateLocationSchema`, `LocationResponseSchema`
2. `packages/types/src/users.schemas.ts` — `CreateUserSchema`, `UpdateUserSchema`, `UpdateUserStatusSchema`, `UserResponseSchema`
3. Actualizar `packages/types/src/index.ts`
4. `pnpm --filter @repo/types build` — verificar que compila

### Phase 1 — RolesGuard + @Roles() decorator

Infraestructura reutilizable que usarán todos los módulos futuros:

1. `roles.decorator.ts` — `@Roles(...roles: UserRole[])` usando `SetMetadata`
2. `roles.guard.ts` — `RolesGuard implements CanActivate`, lee `Reflector`, compara con `req.user.role`
3. Unit test del guard: probar que `403` cuando el rol no está en la lista, `200` cuando sí
4. Registrar `RolesGuard` como provider en `AppModule` (o aplicar por módulo según convenga)

### Phase 2 — LocationModule (TDD)

Para cada FR de Location, ciclo Red → Green → Refactor:

1. **Unit tests** `locations.service.spec.ts` — mock de `PrismaService`
   - `create`: persiste con `tenantId` del JWT
   - `findAll`: filtra por `tenantId`; MANAGER/STAFF además filtran por `locationId`
   - `findOne`: retorna `404` si no pertenece al tenant (o `locationId` del usuario)
   - `update`: actualiza solo si pertenece al tenant
   - `remove`: soft delete (`status = 'inactive'`), no borra físicamente
2. Implementar `LocationsService`
3. Implementar `LocationsController` con guards: `@UseGuards(JwtAuthGuard, RolesGuard)`
4. **E2E tests** `locations.e2e-spec.ts` — dos tenants, dos sucursales, todos los roles
5. Refactor si hay duplicación

### Phase 3 — UserModule (TDD)

Para cada FR de User, ciclo Red → Green → Refactor:

1. **Unit tests** `users.service.spec.ts` — mock de `PrismaService` y `bcrypt`
   - `create`: hashea password, valida que `locationId` exista en el mismo tenant para MANAGER/STAFF
   - `findAll`: filtra por `tenantId`; MANAGER además filtra por `locationId`
   - `findOne`: retorna `404` si no pertenece al tenant
   - `updateStatus`: solo OWNER puede suspender OWNERs; ADMIN puede suspender MANAGER/STAFF
   - Regla: ADMIN no puede crear OWNER
2. Implementar `UsersService`
3. Implementar `UsersController`
4. **E2E tests** `users.e2e-spec.ts` — cubrir todos los escenarios de autorización
5. Refactor

### Phase 4 — Gates finales

```bash
pnpm lint           # cero warnings
pnpm check-types    # cero errores TS
pnpm --filter api test      # unit tests
pnpm --filter api test:e2e  # e2e tests
```

## Complexity Tracking

No hay violaciones a la constitución en este plan.
