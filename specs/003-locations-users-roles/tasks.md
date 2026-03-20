# Tasks: Locations, Users & Role-Based Access

**Branch**: `003-locations-users-roles` | **Plan**: [plan.md](./plan.md)

---

## Phase 0 — Schemas en @repo/types

- [ ] **T-001** Crear `packages/types/src/locations.schemas.ts` con `CreateLocationSchema`, `UpdateLocationSchema`, `LocationResponseSchema`
- [ ] **T-002** Crear `packages/types/src/users.schemas.ts` con `CreateUserSchema`, `UpdateUserSchema`, `UpdateUserStatusSchema`, `UserResponseSchema`
- [ ] **T-003** Actualizar `packages/types/src/index.ts` — re-exportar nuevos schemas
- [ ] **T-004** Verificar que `@repo/types` compila: `pnpm --filter @repo/types build`

## Phase 1 — RolesGuard + @Roles()

- [ ] **T-005** Crear `apps/api/src/common/decorators/roles.decorator.ts`
- [ ] **T-006** Crear `apps/api/src/common/guards/roles.guard.ts`
- [ ] **T-007** Escribir unit tests para `RolesGuard` (probar cada rol contra cada combinación permitida)
- [ ] **T-008** Registrar `RolesGuard` como provider global en `AppModule`

## Phase 2 — LocationModule

- [ ] **T-009** Crear `apps/api/src/locations/dto/create-location.dto.ts` y `update-location.dto.ts`
- [ ] **T-010** Escribir `locations.service.spec.ts` — tests en rojo para `create`, `findAll`, `findOne`, `update`, `remove`
- [ ] **T-011** Implementar `LocationsService` (Green)
- [ ] **T-012** Crear `LocationsController` con `@UseGuards(JwtAuthGuard, RolesGuard)` y `@Roles()` por endpoint
- [ ] **T-013** Crear `LocationsModule` y registrar en `AppModule`
- [ ] **T-014** Escribir `apps/api/test/locations.e2e-spec.ts` — cubrir todos los acceptance scenarios del spec
- [ ] **T-015** Refactor si hay duplicación — re-run tests

## Phase 3 — UserModule

- [ ] **T-016** Crear DTOs en `apps/api/src/users/dto/`
- [ ] **T-017** Escribir `users.service.spec.ts` — tests en rojo para `create`, `findAll`, `findOne`, `updateStatus`
- [ ] **T-018** Implementar `UsersService` (Green) — bcrypt para password, validación de `locationId` por tenant
- [ ] **T-019** Crear `UsersController` con guards y roles por endpoint
- [ ] **T-020** Crear `UsersModule` y registrar en `AppModule`
- [ ] **T-021** Escribir `apps/api/test/users.e2e-spec.ts` — cubrir todos los acceptance scenarios
- [ ] **T-022** Refactor si hay duplicación — re-run tests

## Phase 4 — Gates finales

- [ ] **T-023** `pnpm lint` — cero errores y warnings
- [ ] **T-024** `pnpm check-types` — cero errores TypeScript
- [ ] **T-025** `pnpm --filter api test` — todos los unit tests en verde
- [ ] **T-026** `pnpm --filter api test:e2e` — todos los E2E en verde
- [ ] **T-027** Commit y PR a `main`
