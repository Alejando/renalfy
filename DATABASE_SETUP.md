# Database Setup — Development vs Test

## Overview

El proyecto ahora usa **dos bases de datos separadas**:

- **`renalfy`** — Para development local (nunca se toca en testing)
- **`renalfy_test`** — Para tests automatizados (se resetea en cada test run)

## Configuration Files

### `.env` (Development)
```env
DATABASE_URL=postgresql://renalfy_app:renalfy_app_dev@localhost:5434/renalfy
DATABASE_MIGRATION_URL=postgresql://postgres:postgres@localhost:5434/renalfy
NODE_ENV=development
```

### `.env.test` (Testing)
```env
DATABASE_URL=postgresql://renalfy_app:renalfy_app_dev@localhost:5434/renalfy_test
DATABASE_MIGRATION_URL=postgresql://postgres:postgres@localhost:5434/renalfy_test
NODE_ENV=test
```

## Initial Setup

### 1. Create Test Database

```bash
cd apps/api
pnpm test:setup
```

Este comando:
- Crea la BD `renalfy_test` (si no existe)
- Aplica todas las migraciones
- Configura usuarios y RLS

### 2. Verify Both Databases Exist

```bash
# Listar bases de datos (requiere contraseña de postgres)
PGPASSWORD=postgres psql -U postgres -h localhost -p 5434 -l | grep renalfy
```

Deberías ver:
```
 renalfy      | renalfy      | UTF8     | es_ES.UTF-8 | es_ES.UTF-8 |
 renalfy_test | renalfy      | UTF8     | es_ES.UTF-8 | es_ES.UTF-8 |
```

## Usage

### Development Workflow

```bash
# Start development server (usa .env → BD renalfy)
pnpm dev

# Check schema with Prisma Studio (conecta a renalfy)
cd apps/api
npx prisma studio
```

### Testing Workflow

```bash
# Run tests (carga .env.test automáticamente)
pnpm --filter api test           # Unit tests
pnpm --filter api test:watch     # Watch mode
pnpm --filter api test:e2e       # E2E tests

# Lo que pasa internamente:
# 1. NODE_ENV=test se establece
# 2. test/setup.ts carga .env.test
# 3. Jest resetea renalfy_test
# 4. Tests corren en BD limpia
```

## Important Notes

- ✅ **Never** `pnpm test` tocará la BD de development
- ✅ **Always** `pnpm test` resetea completamente `renalfy_test`
- ✅ `.env.test` está en `.gitignore` (similar a `.env`)
- ✅ Los secretos JWT son diferentes en `.env.test` (para tests)

## Troubleshooting

### "database renalfy_test does not exist"

Ejecuta:
```bash
pnpm test:setup
```

### "role renalfy_app does not exist"

La BD existe pero no tiene el usuario configurado. Ejecuta:
```bash
# Desde apps/api
DATABASE_MIGRATION_URL=postgresql://postgres:postgres@localhost:5434/renalfy_test \
npx prisma migrate deploy
```

### Verificar migraciones en BD de test

```bash
# Conectar a renalfy_test y ver tablas
PGPASSWORD=postgres psql -U postgres -h localhost -p 5434 renalfy_test -c "\dt"
```

## Summary

| Tarea | Comando |
|---|---|
| Setup inicial test DB | `pnpm test:setup` |
| Ver BD development | `npx prisma studio` (en apps/api) |
| Ejecutar tests | `pnpm --filter api test` |
| Tests en watch mode | `pnpm --filter api test:watch` |
| Ver BD test (manual) | `PGPASSWORD=postgres psql -U postgres -h localhost -p 5434 renalfy_test` |
