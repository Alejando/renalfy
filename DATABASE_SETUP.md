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

### 1. Create Development Database

```bash
cd apps/api
bash ./scripts/setup-dev-db.sh
```

Este comando:
- Crea la BD `renalfy` (si no existe)
- Crea roles `renalfy` (migraciones) y `renalfy_app` (runtime)
- Otorga permisos a `renalfy_app` en el schema `public`

### 2. Create Test Database

```bash
cd apps/api
pnpm test:setup
```

Este comando:
- Crea la BD `renalfy_test` (si no existe)
- Crea roles necesarios
- Otorga permisos a `renalfy_app` en el schema `public`
- Aplica todas las migraciones

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

### "permission denied for schema public"

El usuario `renalfy_app` no tiene permisos en el schema `public`. Ejecuta:

```bash
cd apps/api
bash ./scripts/setup-dev-db.sh    # Para BD development
pnpm test:setup                    # Para BD test
```

O manualmente:
```bash
PGPASSWORD=postgres psql -U postgres -h localhost -p 5434 renalfy -c "
GRANT USAGE ON SCHEMA public TO renalfy_app;
GRANT CREATE ON SCHEMA public TO renalfy_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO renalfy_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO renalfy_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO renalfy_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO renalfy_app;
"
```

### "database renalfy_test does not exist"

Ejecuta:
```bash
pnpm test:setup
```

### "role renalfy_app does not exist"

La BD existe pero no tiene el usuario configurado. Ejecuta:
```bash
cd apps/api
bash ./scripts/setup-dev-db.sh    # Crea roles y permisos
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
