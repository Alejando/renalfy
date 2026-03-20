.PHONY: help dev db db-stop db-reset migrate seed api web test lint types types-build

# Default target
help:
	@echo ""
	@echo "  Renalfy — comandos disponibles"
	@echo ""
	@echo "  Entorno"
	@echo "  -------"
	@echo "  make dev        Levanta todo: DB + API + Web en paralelo"
	@echo "  make db         Levanta solo PostgreSQL (puerto 5433)"
	@echo "  make db-stop    Detiene y elimina los contenedores"
	@echo "  make db-reset   Elimina el volumen y reinicia la BD desde cero"
	@echo ""
	@echo "  Base de datos"
	@echo "  -------------"
	@echo "  make migrate    Aplica migraciones pendientes"
	@echo "  make seed       Inserta datos de desarrollo"
	@echo "  make studio     Abre Prisma Studio en el browser"
	@echo ""
	@echo "  Calidad"
	@echo "  -------"
	@echo "  make test       Corre todos los tests (backend + frontend)"
	@echo "  make lint       ESLint en todo el monorepo"
	@echo "  make types      TypeScript check en todo el monorepo"
	@echo "  make check      lint + types + test (gates de CI)"
	@echo ""

# ─── Entorno ──────────────────────────────────────────────────────────────────

dev: db
	@echo "→ Levantando API y Web..."
	@$(MAKE) -j2 api web

db:
	@echo "→ Levantando PostgreSQL en puerto 5433..."
	docker compose up -d postgres
	@echo "→ Esperando a que la BD esté lista..."
	@until docker exec renalfy-db pg_isready -U renalfy -q; do sleep 1; done
	@echo "✓ PostgreSQL listo"

db-stop:
	docker compose down

db-reset:
	docker compose down -v
	$(MAKE) db
	$(MAKE) migrate

# ─── Base de datos ────────────────────────────────────────────────────────────

types-build:
	@echo "→ Compilando @repo/types..."
	pnpm --filter @repo/types build

migrate:
	@echo "→ Aplicando migraciones..."
	cd apps/api && npx prisma migrate dev

seed:
	@echo "→ Insertando datos de desarrollo..."
	cd apps/api && npx tsx prisma/seed.ts

studio:
	cd apps/api && npx prisma studio

# ─── Servidores ───────────────────────────────────────────────────────────────

api:
	@echo "→ Iniciando API en :4001..."
	pnpm --filter api dev

web:
	@echo "→ Iniciando Web en :4000..."
	NEXT_PUBLIC_DEV_TENANT_SLUG=clinica-demo pnpm --filter web dev

# ─── Calidad ──────────────────────────────────────────────────────────────────

test:
	@echo "→ Tests backend..."
	pnpm --filter api test
	@echo "→ Tests frontend..."
	pnpm --filter web test

lint:
	pnpm lint

types:
	pnpm check-types

check: lint types test
	@echo "✓ Todos los gates pasaron"
