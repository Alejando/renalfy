# Agentes Especializados y Skills de Renalfy

Este documento explica cómo usar los agentes especializados y skills del proyecto para implementar features de forma eficiente.

---

## ¿Por Qué Agentes Especializados?

El proyecto Renalfy es complejo: combina regulaciones de datos de salud, arquitectura multi-tenant, transacciones atómicas, y componentes UI sofisticados. Los agentes especializados dividen el trabajo por dominio y garantizan coherencia:

- **project-architect:** decisiones arquitectónicas, specs, ADRs
- **senior-backend-dev:** implementación backend (NestJS, Prisma, TDD)
- **frontend-tdd-architect:** implementación frontend (Next.js, componentes, formularios)
- **qa-flow-validator:** validación E2E de features completas

---

## Catálogo de Agentes

### 1. `project-architect` (Este Agente)

**Responsabilidad:** decisiones arquitectónicas, documentación, specs de features, ADRs.

| Aspecto | Detalle |
|---|---|
| **Cuándo usarlo** | Escribir/actualizar specs, decisiones de design, ADRs, refactoring de módulos |
| **Entrada típica** | "Necesito diseñar el módulo de reportes. ¿Cómo hacerlo sin romper RLS?" |
| **Salida típica** | Spec en `/docs/specs/`, ADR en `/docs/decisions/` |
| **No hace** | Escribir código production, tests, UI |

**Ejemplo de invocación:**
```
user: Especifica el módulo de reportes — endpoints, validaciones, compliance
architect: Lee ARCHITECTURE.md → crea docs/specs/reports.md con reglas de negocio y validaciones
```

---

### 2. `senior-backend-dev`

**Responsabilidad:** implementación backend (NestJS modules, Prisma migrations, services, controllers, tests).

| Aspecto | Detalle |
|---|---|
| **Cuándo usarlo** | Implementar un módulo backend, crear migrations, tests, controllers |
| **Entrada típica** | "Implementa el módulo de Sales siguiendo TDD. Aquí está el spec." |
| **Salida típica** | Controllers, services, migrations, tests en verde |
| **Requiere** | Spec previo (de project-architect) |
| **No hace** | Frontend, decisiones arquitectónicas, UI |

**Flujo típico:**
```
1. project-architect escribe /docs/specs/sales.md
2. senior-backend-dev implementa:
   - apps/api/src/sales/ (module, controller, service)
   - test case
   - Prisma migrations si necesaria
3. qa-flow-validator valida E2E
```

---

### 3. `frontend-tdd-architect`

**Responsabilidad:** implementación frontend (Next.js pages, componentes, formularios, tests).

| Aspecto | Detalle |
|---|---|
| **Cuándo usarlo** | Crear páginas, componentes, formularios, tests en frontend |
| **Entrada típica** | "Implementa la UI para Sales. Usa estos componentes shadcn/ui." |
| **Salida típica** | Pages, componentes, tests en verde (Vitest) |
| **Requiere** | Backend ya implementado, spec disponible |
| **No hace** | Backend, API contracts (ya existen) |

**Flujo típico:**
```
1. senior-backend-dev implementa /api/sales
2. frontend-tdd-architect implementa:
   - apps/web/app/tenants/[slug]/(dashboard)/financials/page.tsx
   - components/sales/SalesTable.tsx, CreateSalesModal.tsx
   - tests: SalesTable.test.tsx
3. qa-flow-validator valida E2E
```

---

### 4. `qa-flow-validator`

**Responsabilidad:** validación E2E completa de features después de implementación.

| Aspecto | Detalle |
|---|---|
| **Cuándo usarlo** | Después de que backend + frontend estén en verde |
| **Entrada típica** | "Valida el flow completo: crear venta → listar → detalles → cancelar" |
| **Salida típica** | Reporte de validación, bugs encontrados (si hay) |
| **Requiere** | Backend + Frontend completados |
| **No hace** | Implementación, escritura de código |

**Checklist típico:**
```
✅ pnpm lint + pnpm check-types + pnpm test
✅ Crear venta en UI → verificar en BD
✅ Filtros en lista funcian
✅ Cancelar venta revierte stock
✅ RLS aislamiento (usuario de otro tenant no ve)
✅ Compliance: AuditLog, consentimiento si aplica
```

---

### 5. Otros Agentes (Soporte)

| Agente | Uso |
|---|---|
| `Explore` | Búsqueda de archivos, símbolos, keywords — usar antes de cualquier investigación |
| `general-purpose` | Tareas multi-paso, investigaciones complejas, debugging |
| `claude-code-guide` | Preguntas sobre Claude Code CLI, configuración, MCP, hooks |
| `Plan` | Diseñar estrategia de implementación (sprintear, estimar esfuerzo) |
| `statusline-setup` | Configurar statusline de Claude Code |

---

## Catálogo de Skills

Los skills son capas de conocimiento especializadas. Se invocan con la herramienta `Skill`.

### Frontend Skills

| Skill | Cuándo usar | Nota |
|---|---|---|
| `frontend-design` | Crear UI distinctive, production-grade, polished | Para nuevo diseño de componentes |
| `react-best-practices` | Build React components, hooks patterns, re-render optimization | Para lógica de componentes |
| `react-hook-form` | Validación client-side, useForm, useWatch, useController | Para formularios React Hook Form |
| `shadcn` | Extender componentes shadcn/ui, customizar estilos | Para UI customization |
| `tailwind-v4-shadcn` | Tailwind CSS v4 + shadcn/ui integration | Para styling |
| `tailwind-css-patterns` | Patrones CSS Tailwind, responsive design, spacing | Para diseño |
| `accessibility` | a11y, ARIA, screen readers, keyboard navigation | Para accesibilidad |
| `composition-patterns` | React composition, compound components, render props | Para arquitectura de componentes |

### Backend Skills

| Skill | Cuándo usar | Nota |
|---|---|---|
| `nestjs-best-practices` | NestJS patterns, modules, DI, guards, interceptors | Para backend TDD |
| `nodejs-best-practices` | Node.js patterns, async/await, error handling | Para Node utilities |
| `nodejs-backend-patterns` | Server patterns, middleware, tracing | Para backend architecture |
| `prisma-cli` | Prisma migrate, generate, studio, reset | Para migraciones |
| `prisma-client-api` | `PrismaClient` operations, queries, composición | Para PrismaService |
| `prisma-postgres` | PostgreSQL + Prisma, RLS, indexes, query optimization | Para BD |
| `prisma-database-setup` | Database initialization, Docker Compose, env setup | Para BD setup |

### Testing & Tooling Skills

| Skill | Cuándo usar | Nota |
|---|---|---|
| `vitest` | Frontend tests con Vitest, mocking, fixtures | Para test frontend |
| `zod` | Zod schemas, parsing, error handling, custom validations | Para Zod en @repo/types |
| `typescript-advanced-types` | Tipos avanzados, generics, type guards, inference | Para TypeScript complejo |

### Otros Skills

| Skill | Cuándo usar | Nota |
|---|---|---|
| `turborepo` | Configurar Turbo, caching, task pipeline | Para monorepo |
| `next-best-practices` | Next.js patterns, RSC, data fetching, metadata | Para Next.js |
| `next-cache-components` | PPR, cache directive, cacheLife, cacheTag | Para Next.js 16 caching |
| `seo` | SEO setup, metadata, Open Graph, robots.txt | Para landing pages |

---

## Flujos Recomendados

### Flujo 1: Nuevo Módulo Backend

```
1. project-architect
   ├─ Lee requerimientos de negocio
   ├─ Crea /docs/specs/{modulo}.md
   ├─ Crea ADR si hay decisión arquitectónica
   └─ Define:
      - Endpoints (método, path, body, response, status)
      - Data model (Prisma migrations)
      - Zod schemas (@repo/types)
      - Business rules, edge cases
      - RLS implications

2. senior-backend-dev
   ├─ Lee spec
   ├─ Implementa tests primero (RED)
   │  ├─ Unit tests: service.spec.ts
   │  └─ E2E tests: apps/api/test/
   ├─ Implementa módulo (GREEN)
   │  ├─ Prisma migrations
   │  ├─ @repo/types schemas
   │  ├─ DTOs (wrappers de schemas)
   │  ├─ Controllers
   │  └─ Services
   ├─ Refactor (REFACTOR)
    └─ pnpm lint + check-types + test + build → ✅

3. qa-flow-validator
   ├─ Valida endpoints con curl/Postman
   ├─ Verifica RLS (tenant1 usuario no ve datos de tenant2)
   ├─ Verifica AuditLog
   └─ Reporte final
```

---

### Flujo 2: Nueva Página/Componente Frontend

```
1. frontend-tdd-architect
   ├─ Lee spec (proyecto-architect debería haberla escrito)
   ├─ Verifica que backend esté listo
   ├─ Implementa tests primero (RED)
   │  ├─ Component tests: {component}.test.tsx
   │  ├─ Testea comportamiento visible
   │  └─ Usa React Testing Library
   ├─ Implementa componentes (GREEN)
   │  ├─ Usa React Hook Form + Zod resolver
   │  ├─ Extiende shadcn/ui (no modificar directamente)
   │  ├─ Usa Server Components donde sea posible
   │  └─ Coloca formularios en modales/drawers
   ├─ Refactor (REFACTOR)
    └─ pnpm lint + check-types + test + build → ✅

2. qa-flow-validator
   ├─ Ejecuta flujo UI end-to-end
   ├─ Verifica validación de formularios
   ├─ Verifica RLS (MANAGER solo ve su locationId)
   └─ Reporte final
```

---

### Flujo 3: Bug o Refactoring

```
1. general-purpose o Explore
   ├─ Investiga el bug
   ├─ Reproduce el problema
   ├─ Identifica raíz del problema

2. senior-backend-dev (si es backend) O frontend-tdd-architect (si es frontend)
   ├─ Escribe test que reproduce el bug (RED)
   ├─ Implementa fix (GREEN)
   ├─ Refactor si es necesario (REFACTOR)
    └─ pnpm lint + check-types + test + build → ✅

3. qa-flow-validator
   ├─ Valida que el bug esté arreglado
   ├─ Verifica no hay regresiones
   └─ Reporte
```

---

### Flujo 4: Decisión Arquitectónica

```
1. project-architect
   ├─ Plantea el problema
   ├─ Enumera opciones (al menos 2)
   ├─ Evalúa contra principios del proyecto
   ├─ Decide y escribe ADR
   │  ├─ Context
   │  ├─ Decision
   │  ├─ Rationale
   │  ├─ Alternatives considered
   │  └─ Consequences
   └─ Comunica implicaciones al equipo

2. senior-backend-dev + frontend-tdd-architect
   └─ Implementan según la decisión
```

---

## Cómo Invocar Skills

### Sintaxis

```
user: [contexto de la tarea]

assistant: Debo usar la skill [skill-name]
[invoca herramienta Skill con skill=[skill-name]]
```

### Ejemplos

**Diseñar un componente React:**
```
user: Necesito un modal para crear una venta con validación de stock

assistant: Voy a usar frontend-design para crear la UI polished
[Skill: frontend-design]
```

**Escribir tests con Vitest:**
```
user: Escribir tests para el hook useFinancials

assistant: Necesito vitest skill para escribir tests bien
[Skill: vitest]
```

**Optimizar query de Prisma:**
```
user: El listado de sales es lento. Cómo optimizar?

assistant: Voy a consultar prisma-client-api
[Skill: prisma-client-api]
```

---

## Reglas para Spawning de Agentes

### Cuándo NO spawnar un subagente

- ❌ La tarea es de una sola línea (ej: "abre este archivo")
- ❌ El agente actual puede hacerla bien (ej: linter error, trivial fix)
- ❌ La tarea es investigación rápida (usar Explore skill en el agente actual)

### Cuándo SÍ spawnar

- ✅ La tarea requiere días de trabajo (nuevo módulo completo)
- ✅ El agente es especialista en eso (ej: spawn `frontend-tdd-architect` para página nueva)
- ✅ El context actual es muy grande (delegar para limpiar)
- ✅ Es parallelizable (ej: backend y frontend en simultáneo)

### Cómo pasar contexto al agente

**Mal:**
```
"Implementa el módulo de reportes"
```

**Bien:**
```
"Implementa el módulo de reportes siguiendo este spec:
/docs/specs/reports.md

Requisitos clave:
- Exportar con marca de agua (tenantId + fecha)
- Solo MANAGER+ puede acceder
- Reportes son read-only, no se editan

El backend está aquí:
/api/reports (GET lista, GET :id detalles)

Endpoints esperados:
- GET /reports (lista paginada)
- GET /reports/:id (detalles + descargar PDF)

RLS:
- MANAGER ve solo su locationId
- OWNER/ADMIN ven todo

Compliance:
- Verificar que no hay PHI identificable en exports
- AuditLog cada acceso

Los tests son obligatorios (TDD).
Los componentes van en apps/web/app/tenants/[slug]/(dashboard)/reports/"
```

---

## Stack Alignment: Qué Skill Usar por Tecnología

### React / Next.js Componentes

```
react-best-practices    → Lógica de componentes, hooks, memoization
react-hook-form         → Formularios controlados, validación
shadcn                  → Componentes base shadcn/ui
tailwind-v4-shadcn      → Estilos con Tailwind v4
composition-patterns    → Arquitectura de componentes (compound, render props)
frontend-design         → UI polished, distinctive, production-grade
```

### Next.js (Framework)

```
next-best-practices     → App Router, RSC, data fetching, layouts
next-cache-components   → PPR, cache directive, cacheTag (Next.js 16)
seo                     → Metadata, Open Graph, robots.txt
```

### NestJS Backend

```
nestjs-best-practices   → Modules, DI, Guards, Interceptors, Services
nodejs-backend-patterns → Middleware, error handling, async patterns
```

### Prisma + PostgreSQL

```
prisma-cli             → migrate, generate, studio, reset
prisma-client-api      → Queries, transactions, composición
prisma-postgres        → RLS, indexes, query optimization
prisma-database-setup  → Docker Compose, env, seeds
```

### Testing

```
vitest                 → Frontend tests (Vitest + React Testing Library)
```

### Tipos y Validación

```
typescript-advanced-types  → Tipos complejos, generics, type guards
zod                        → Schemas, parsing, validaciones personalizadas
```

### Monorepo

```
turborepo              → Configuración, caching, task pipeline
```

---

## Checklist: Feature Completado

Una feature está lista para merge cuando:

```
Spec / Diseño
☐ /docs/specs/{modulo}.md escrito por project-architect
☐ ADR si hay decisión arquitectónica
☐ Requerimientos y edge cases documentados

Backend
☐ Tests escritos primero (TDD Red)
☐ Implementación (TDD Green)
☐ Refactoring (TDD Refactor)
☐ pnpm lint (backend) ✅
☐ pnpm check-types (backend) ✅
☐ pnpm test (backend) ✅
☐ pnpm build (backend) ✅
☐ RLS validado (tenant aislamiento)
☐ AuditLog en place
☐ Transacciones atómicas donde aplica

Frontend
☐ Tests escritos primero (TDD Red)
☐ Implementación (TDD Green)
☐ Refactoring (TDD Refactor)
☐ pnpm lint (frontend) ✅
☐ pnpm check-types (frontend) ✅
☐ pnpm test (frontend) ✅
☐ pnpm build (frontend) ✅
☐ RLS validado (MANAGER solo ve su locationId)
☐ Formularios en modales/drawers (no pages)
☐ Uso de React Hook Form + Zod

Compliance (si PHI o negocio crítico)
☐ Consentimiento validado (LFPDPPP)
☐ Auditoría en AuditLog (NOM-004)
☐ Aislamiento multi-tenant (NOM-024)
☐ No hay secretos en logs

QA / E2E
☐ qa-flow-validator validó el flujo completo
☐ Reporte de validación sin issues críticos
☐ Regresiones descartadas

Security (ADR-014 — obligatorio pre-producción)
☐ JWT_SECRET y JWT_REFRESH_SECRET validados (no vacíos, no fallback a '')
☐ Refresh tokens se validan contra BD (refreshTokenHash)
☐ RLS policies en PostgreSQL (no solo app-level WHERE tenantId)
☐ Helmet + security headers en API y frontend
☐ Dockerfile con USER no-root
☐ Exception filter atrapa todas las excepciones (@Catch())
☐ bcrypt con 12+ rounds
☐ Password min 8 caracteres en todos los schemas
☐ Sin rutas legacy con fetch() sin auth
☐ DB connections con ?sslmode=require en producción

Documentación
☐ Spec actualizado si diverge de implementación
☐ Comentarios en código complejo
☐ ADR actualizado si hay cambios
```

---

## Resumen Visual: De Especificación a Merge

```
┌─────────────────────────────────────┐
│  Nuevo Feature: Módulo Reportes     │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  project-architect                  │
│  ├─ Escribe /docs/specs/reports.md  │
│  ├─ Define endpoints, reglas        │
│  ├─ Compliance checklist             │
│  └─ ADR si hay decisión              │
└─────────────────────────────────────┘
           ↓
┌──────────────────────┬──────────────────────┐
│  senior-backend-dev  │ frontend-tdd-arch    │
│  ├─ Implementa /api  │ ├─ Implementa pages  │
│  ├─ Tests + TDD      │ ├─ Componentes + UI  │
│  ├─ Migrations       │ ├─ Tests + TDD       │
│  └─ ✅ Lint+Types+Test+Build│  └─ ✅ Lint+Types+Test+Build│
└──────────────────────┴──────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  qa-flow-validator                  │
│  ├─ Valida E2E                      │
│  ├─ Verifica RLS, Compliance        │
│  ├─ Verifica sin regresiones        │
│  └─ Reporte final                   │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  MERGE a main ✅                    │
└─────────────────────────────────────┘
```
