.PHONY: help dev db db-stop db-reset migrate seed api web test lint types types-build

SHELL := /bin/bash
NVM_SH := $(HOME)/.nvm/nvm.sh

# Activa la versión de Node definida en .nvmrc antes de ejecutar cualquier comando
node_use = . $(NVM_SH) && nvm use --silent

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
	$(node_use) && pnpm --filter @repo/types build

migrate:
	@echo "→ Aplicando migraciones..."
	$(node_use) && cd apps/api && npx prisma migrate dev

seed:
	@echo "→ Insertando datos de desarrollo..."
	$(node_use) && cd apps/api && npx tsx prisma/seed.ts

studio:
	$(node_use) && cd apps/api && npx prisma studio

# ─── Servidores ───────────────────────────────────────────────────────────────

api:
	@echo "→ Iniciando API en :4001..."
	$(node_use) && pnpm --filter api dev

web:
	@echo "→ Iniciando Web en :4000..."
	$(node_use) && pnpm --filter web dev

# ─── Calidad ──────────────────────────────────────────────────────────────────

test:
	@echo "→ Tests backend..."
	$(node_use) && pnpm --filter api test
	@echo "→ Tests frontend..."
	$(node_use) && pnpm --filter web test

lint:
	$(node_use) && pnpm lint

types:
	$(node_use) && pnpm check-types

check: lint types test
	@echo "✓ Todos los gates pasaron"
