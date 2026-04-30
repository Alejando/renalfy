# Renalfy — Setup y Configuración

Guía para configurar el entorno de desarrollo y ejecutar comandos frecuentes.

## Variables de entorno (`apps/api/.env`)

```
DATABASE_URL=postgresql://renalfy:renalfy_dev@localhost:5432/renalfy
JWT_SECRET=...
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=...
JWT_REFRESH_EXPIRES_IN=7d
PORT=3001
NODE_ENV=development
```

---

## Bases de datos — Development vs Test

El proyecto usa **dos bases de datos separadas** para evitar conflictos:

| Base de datos | Propósito | Usuario | Puerto | URL |
|---|---|---|---|---|
| `renalfy` | Development local | `renalfy_app` | 5434 | `localhost:5434/renalfy` |
| `renalfy_test` | Tests automatizados | `renalfy_app` | 5434 | `localhost:5434/renalfy_test` |

**Usuarios:**
- **`renalfy`** — superuser para migraciones (BYPASSRLS implícito)
- **`renalfy_app`** — usuario de aplicación en runtime (sujeto a RLS)

**Configuración:**
- **`.env`** — apunta a BD de development
- **`.env.test`** — apunta a BD de test (solo para tests)
- Los tests cargan `.env.test` automáticamente con `NODE_ENV=test`
- Cada `pnpm test` hace `migrate reset` en `renalfy_test` (destruye y recrea)
- BD de development nunca se toca durante testing
- **Crucial:** `renalfy_app` debe tener permisos USAGE, CREATE en schema `public`

**Setup inicial:**
```bash
cd apps/api
bash ./scripts/setup-dev-db.sh   # Setup BD development + permisos
pnpm test:setup                  # Setup BD test + migraciones
```

Si el error es `permission denied for schema public`, ejecutar:
```bash
bash ./scripts/setup-dev-db.sh
pnpm test:setup
```

---

## Comandos frecuentes

### Arrancar entorno local

```bash
docker-compose up -d          # PostgreSQL en puerto 5434
pnpm dev                      # api en :3019, web en :3020
```

### Base de datos

```bash
cd apps/api
npx prisma migrate dev        # crear y aplicar migración (en renalfy)
npx prisma generate           # regenerar cliente Prisma
npx prisma studio             # GUI de la BD renalfy
```

### Tests

```bash
pnpm --filter api test        # unit tests + BD test reset automático
pnpm --filter api test:watch  # watch mode
pnpm --filter api test:e2e    # E2E tests
pnpm --filter api test:cov    # coverage
```

> **Nota:** Prisma 7 usa WASM internamente. Para E2E tests:
> ```bash
> NODE_OPTIONS="--experimental-vm-modules" pnpm --filter api test:e2e
> ```

### Build

```bash
pnpm build                    # build completo (turbo)
pnpm lint                     # lint
pnpm check-types              # typecheck
```

### Instalar dependencias

```bash
pnpm --filter api add <package>      # en apps/api
pnpm --filter web add <package>      # en apps/web
```

---

## Node.js

El proyecto usa **Node 25** (especificado en `.nvmrc`).

```bash
nvm use          # activa Node 25 en el shell actual
```

Si el shell no lo activa automáticamente, ejecutar `nvm use` antes de los comandos.
