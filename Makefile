.PHONY: help dev api web stop restart migrate seed studio db-setup test lint types check types-build

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
	@echo "  make dev        Levanta API (:3019) + Web (:3020) en paralelo"
	@echo "  make api        Levanta solo la API en :3019"
	@echo "  make web        Levanta solo el Web en :3020"
	@echo "  make stop       Mata los procesos en puertos 3019 y 3020"
	@echo "  make restart    stop + dev"
	@echo ""
	@echo "  Base de datos (shared_postgres — puerto 5434)"
	@echo "  -----------------------------------------------"
	@echo "  make db-setup   Crea la BD renalfy y el usuario renalfy_app (primera vez)"
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

dev:
	@echo "→ Levantando API (:3019) y Web (:3020)..."
	@$(MAKE) -j2 api web

stop:
	@echo "→ Deteniendo servidores en puertos 3019 y 3020..."
	@lsof -ti:3019,3020 | xargs kill -9 2>/dev/null || true
	@echo "✓ Servidores detenidos"

restart: stop dev

# ─── Base de datos ────────────────────────────────────────────────────────────

db-setup:
	@echo "→ Configurando BD renalfy en shared_postgres (puerto 5434)..."
	@docker exec shared_postgres psql -U postgres -tc \
		"SELECT 1 FROM pg_database WHERE datname='renalfy'" | grep -q 1 \
		|| docker exec shared_postgres psql -U postgres -c "CREATE DATABASE renalfy"
	@docker exec -i shared_postgres psql -U postgres -d renalfy < docker/init.sql 2>/dev/null || true
	@echo "✓ BD lista — corre 'make migrate' para aplicar el schema"

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
	@echo "→ Iniciando API en :3019..."
	$(node_use) && pnpm --filter api dev

web:
	@echo "→ Iniciando Web en :3020..."
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
