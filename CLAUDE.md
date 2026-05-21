# Renalfy — Guía de Desarrollo para AIs

**Renalfy** es una plataforma SaaS multi-tenant para gestión de clínicas médicas. Esta guía documenta decisiones arquitectónicas, convenciones de código, y reglas de negocio que todo asistente debe conocer para trabajar en el proyecto.

---

## Producto

### Qué es Renalfy

- **Multi-tenant SaaS:** cada tenant es una organización médica independiente
- **Primer caso de uso:** clínicas de diálisis renal (migración desde SUTR), pero genérico por diseño
- **Subdominio por tenant:** `{slug}.renalfy.app`
- **Principio cardinal:** lo específico de cada especialidad se configura por tenant (ej: `ClinicalTemplate`), **nunca se hardcodea**

### Roles y Scope de Acceso

| Rol | Scope | Nota |
|---|---|---|
| `SUPER_ADMIN` | Global — administra la plataforma | Acceso a todos los tenants |
| `OWNER` | Tenant — control total de la organización | Acceso a todas las sucursales del tenant |
| `ADMIN` | Tenant — gestión administrativa | Acceso a todas las sucursales del tenant |
| `MANAGER` | Sucursal — operación diaria | Filtrado por `locationId` en backend |
| `STAFF` | Sucursal — registro de datos clínicos | Filtrado por `locationId` en backend |

**Regla crítica de RLS:** `MANAGER` y `STAFF` solo ven datos de su `locationId`. Este filtro se aplica **exclusivamente en el backend** — nunca en el frontend.

---

## Stack Técnico

| Capa | Tecnología | Versión |
|---|---|---|
| **Frontend** | Next.js (App Router) + TypeScript | 16.2.0 |
| **Backend** | NestJS + TypeScript | 11.0+ |
| **Estilos** | Tailwind CSS v4 + shadcn/ui | v4 |
| **ORM** | Prisma | 7.5.0 |
| **Base de Datos** | PostgreSQL | 16 |
| **Auth** | JWT (access + refresh) | — |
| **Testing** | Jest (backend), Vitest (frontend) | — |
| **Monorepo** | Turborepo + pnpm | pnpm 9.0+ |
| **Deployment** | Docker + docker-compose | — |

---

## Metodología: Test-Driven Development (TDD)

**Todo feature se desarrolla siguiendo Red → Green → Refactor:**

```
1. Red       → escribir el test PRIMERO (debe fallar)
2. Green     → mínimo código para pasar el test
3. Refactor  → limpiar sin romper tests
```

### Definición de "Feature Completo"

Un feature **no está terminado** hasta que se cumplan estas cuatro condiciones:

```bash
pnpm lint        # ✅ sin errores ni warnings
pnpm check-types # ✅ sin errores de TypeScript
pnpm test        # ✅ todos los tests en verde
pnpm build       # ✅ compila sin errores (api + web + packages)
```

**Backend (NestJS):**
- Unit tests: cada `service` tiene `.spec.ts` con mocks tipados de `PrismaService`
- E2E tests: en `apps/api/test/` contra BD real de test
- Los mocks se crean con objetos plain — **sin librerías especiales de mocking de Prisma**
- Naming: por comportamiento, no por implementación (`shouldRejectIfStockInsufficient`, no `testErrorCase`)

**Frontend (Next.js):**
- Unit/component tests: Vitest + React Testing Library
- Testear comportamiento visible al usuario, no detalles de implementación
- Usar `render()` + `screen` queries + user events

---

## Arquitectura

### Monorepo (Turborepo)

```
renalfy/
├── apps/
│   ├── api/           → NestJS backend
│   └── web/           → Next.js frontend
├── packages/
│   ├── types/         → @repo/types (Zod schemas — única fuente de verdad)
│   ├── ui/            → @repo/ui (componentes shadcn/ui)
│   ├── utils/         → @repo/utils (helpers)
│   ├── eslint-config/ → @repo/eslint-config
│   └── typescript-config/ → @repo/typescript-config
├── docs/
│   ├── specs/         → especificaciones técnicas de features
│   ├── sprints/       → documentación de sprints
│   ├── decisions/     → ADRs (Architecture Decision Records)
│   └── ARCHITECTURE.md
└── turbo.json
```

**Comandos Turborepo:**
```bash
pnpm build        # Compilar todos los workspaces
pnpm dev          # Ejecutar dev servers (persistente)
pnpm lint         # Lint en todos los workspaces
pnpm check-types  # Type check en todos los workspaces
pnpm test         # Tests en todos los workspaces
```

### Row-Level Security (RLS)

El aislamiento multi-tenant ocurre en **dos capas:**

1. **Aplicación** — NestJS filtra por `tenantId` en cada query
2. **Base de datos** — PostgreSQL RLS bloquea queries sin tenant correcto

**Flujo de request:**

```
HTTP Request
  ↓
JwtAuthGuard (extrae tenantId del JWT payload)
  ↓
TenantInterceptor (before)
  → set_config('app.current_tenant_id', tenantId)
  ↓
PostgreSQL RLS policies
  → WHERE "tenantId" = current_tenant_id()
  ↓
Servicio NestJS (ejecuta query normalmente)
  ↓
TenantInterceptor (after)
  → limpia set_config
  ↓
Response
```

**Dos usuarios de BD:**

| Usuario | Rol | RLS | Uso |
|---|---|---|---|
| `renalfy` | Superusuario | BYPASSRLS | Migraciones de Prisma |
| `renalfy_app` | App user | Sujeto a RLS | Runtime de la aplicación |

**Tablas con RLS (tienen `tenantId`):**
- Core: `User`, `Location`
- Clínica: `Patient`, `ServiceType`, `Appointment`, `Measurement`, `Receipt`, `ClinicalTemplate`
- Planes: `Company`, `Plan`
- Inventario: `Product`, `LocationStock`, `Supplier`, `SupplierProduct`, `PurchaseOrder`, `Purchase`, `InventoryMovement`
- Financieros: `Sale`, `Income`, `Expense`, `CashClose`
- Items (via JOIN): `SaleItem`, `PurchaseOrderItem`, `PurchaseItem`, `InventoryMovementItem`

**Tablas sin RLS (plataforma global):**
- `Tenant`

---

## Backend — NestJS (`apps/api`)

### Principios Arquitectónicos

1. **Prefijo global:** todos los endpoints son `/api/...`
2. **Módulo por recurso:** cada recurso tiene su módulo con `*.controller.ts`, `*.service.ts`, `dto/`
3. **Guards en todos los endpoints protegidos:** `@UseGuards(JwtAuthGuard)`
4. **RolesGuard en endpoints restringidos:** `@UseGuards(RolesGuard) @Roles('MANAGER', 'OWNER')`
5. **Inyección de tenantId desde JWT:** usa `@CurrentUser()` decorador, **nunca del body del request**
6. **Validación global:** `ZodValidationPipe` en `main.ts` valida todos los requests contra Zod schemas
7. **DTOs heredan de `@repo/types`:** no se definen en el backend

### Estructura de Módulos

```
apps/api/src/
├── main.ts                    (bootstrap, ValidationPipe global, CORS)
├── app.module.ts              (imports de todos los módulos)
├── prisma/
│   ├── prisma.service.ts      (composición sobre PrismaClient)
│   └── prisma.module.ts       (@Global())
├── common/
│   ├── guards/
│   │   ├── JwtAuthGuard.ts    (valida JWT, extrae tenantId)
│   │   ├── JwtRefreshGuard.ts (valida refresh token)
│   │   └── RolesGuard.ts      (@Roles() decorator)
│   ├── decorators/
│   │   └── current-user.ts    (@CurrentUser() → { userId, tenantId, role })
│   ├── interceptors/
│   │   ├── TenantInterceptor  (setea/limpia RLS config)
│   │   └── AuditInterceptor   (loguea operaciones)
│   └── filters/
│       └── HttpExceptionFilter
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── dto/
│   └── strategies/ (JWT, JWT-refresh)
└── [recursos]/                 (patient, sale, income, etc.)
    ├── [recurso].module.ts
    ├── [recurso].controller.ts
    ├── [recurso].service.ts
    ├── [recurso].service.spec.ts
    └── dto/
```

### Importaciones en NestJS (ESM)

**Todos los imports locales en `apps/api` deben incluir extensión `.js` aunque el archivo sea `.ts`:**

```typescript
// ✅ correcto
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';

// ❌ incorrecto (fallará en runtime)
import { PrismaService } from '../prisma/prisma.service';
```

### Checklist de Seguridad por Tipo de Cambio

Cada vez que se implementa o modifica un módulo, verificar estos puntos **antes de hacer merge**. Estos checks previenen vulnerabilidades que han ocurrido en auditorías previas.

#### Nuevo Controller NestJS

- [ ] `@UseGuards(JwtAuthGuard)` aplicado **a nivel de clase** (no solo en métodos individuales)
- [ ] `@CurrentUser()` está tipado con `{ tenantId, role, locationId }` en todos los endpoints que leen o mutan datos
- [ ] `tenantId` se extrae **exclusivamente del JWT** — nunca del body ni de query params
- [ ] Si el endpoint modifica datos: `@UseGuards(RolesGuard) @Roles(...)` está presente en el método
- [ ] MANAGER: el controller pasa `role` y `locationId` al service; el service aplica filtro condicional

#### Nuevo Service CRUD

**findAll():**
- [ ] Si `role === 'MANAGER'`: se fuerza `where.locationId = userLocationId` (no opcional, no del query param)
- [ ] Si `role === 'ADMIN'` u `'OWNER'`: `locationId` del query param es opcional

**create():**
- [ ] Se valida que `dto.locationId` pertenece al tenant **antes de crear**:
  ```typescript
  const location = await this.prisma.location.findUnique({ 
    where: { id: dto.locationId } 
  });
  if (!location || location.tenantId !== tenantId) {
    throw new NotFoundException('Sucursal no encontrada');
  }
  ```

**cancel() / update():**
- [ ] Se verifica `entity.isClosed` **antes de mutar** — lanzar `BadRequestException` si está cerrado
- [ ] Si `role === 'MANAGER'`: se verifica que `entity.locationId === userLocationId` — lanzar `ForbiddenException` si no coincide
- [ ] **Orden de validaciones:** findUnique → tenantId check → isClosed check → role/location check → mutar

#### Schemas en @repo/types

- [ ] Los `FormSchema` **reutilizan los enums base** (`PaymentTypeSchema`, `IncomeTypeSchema`, `ExpenseTypeSchema`) — nunca redefinir `z.enum([...])` si ya existe el enum
- [ ] Los valores de enum en `FormSchema` son un subconjunto **válido** del enum del backend — nunca incluir valores que el backend no acepta
- [ ] Al agregar un nuevo valor a un enum en `enums.ts`, verificar **todos los FormSchema** que lo usan y actualizarlos

**Anti-patrón encontrado en auditoría:**
```typescript
// ❌ Redefinir enum en FormSchema (causa desincronización)
export const CreateSaleFormSchema = z.object({
  paymentType: z.enum(['CASH', 'CREDIT', 'DEBIT']),  // ← 'DEBIT' no existe en backend
});

// ✅ Reutilizar enum base
export const CreateSaleFormSchema = z.object({
  paymentType: PaymentTypeSchema.optional(),
});
```

#### Server Actions (Next.js)

- [ ] `revalidatePath` usa la **ruta real del App Router**, no una ruta inventada:
  - ✅ `revalidatePath('/', 'layout')` — revalida todo el layout (opción segura)
  - ✅ `revalidatePath(`/tenants/${slug}/financials`)` — revalida ruta específica (preciso)
  - ❌ `revalidatePath('/financials')` — ruta que no existe, no revalida nada
- [ ] Las actions de mutación siempre tienen `revalidatePath` o `revalidateTag` al final

**Anti-patrón encontrado:**
```typescript
// ❌ Ruta que no existe en App Router
revalidatePath('/financials');

// ✅ Ruta real del App Router
revalidatePath(`/tenants/${slug}/financials`);
```

#### Hooks de React Query (cliente)

- [ ] Los endpoints de cancelación usan la **subruta explícita:** `PATCH /api/{resource}/{id}/cancel`
- [ ] **Nunca** enviar `{ status: 'CANCELLED' }` en el body de un PATCH genérico — el backend no acepta updates de status por body
- [ ] **Convención de rutas de acción:** `/{id}/cancel`, `/{id}/finish`, `/{id}/settle` — siempre subruta, nunca body con estado

**Anti-patrón encontrado:**
```typescript
// ❌ URL incorrecta
useMutation(() => fetch(`/api/sales/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'CANCELLED' }) }));

// ✅ Subruta explícita
useMutation(() => fetch(`/api/sales/${id}/cancel`, { method: 'PATCH' }));
```

### Security Hardening Rules (ADR-014, May 2026)

Estas reglas previenen vulnerabilidades encontradas en auditoría de seguridad. **Son obligatorias para cualquier deploy a producción.**

#### JWT y Secrets

- [ ] **JWT_SECRET no puede ser vacío ni undefined.** Las estrategias JWT lanzan error fatal en startup si falta:
  ```typescript
  // ❌ NUNCA usar fallback a string vacío
  secretOrKey: config.get('JWT_SECRET') ?? ''  // bypass de auth!
  
  // ✅ Validar explícitamente
  const secret = config.get('JWT_SECRET');
  if (!secret) throw new Error('JWT_SECRET is not configured');
  super({ secretOrKey: secret });
  ```

- [ ] **Refresh tokens deben validarse contra BD.** Almacenar `refreshTokenHash` en User, validar en cada refresh:
  ```typescript
  // Login: generar tokens + guardar hash
  const hash = await bcrypt.hash(tokens.refreshToken, BCRYPT_ROUNDS);
  await prisma.user.update({ where: { id }, data: { refreshTokenHash: hash } });
  
  // Refresh: validar hash + rotar par
  if (!user.refreshTokenHash) throw new UnauthorizedException('Token revoked');
  const valid = await bcrypt.compare(refreshToken, user.refreshTokenHash);
  if (!valid) { /* revocar + throw */ }
  
  // Password change / logout: invalidar refresh tokens
  await prisma.user.update({ where: { id }, data: { refreshTokenHash: null } });
  ```

- [ ] **bcrypt usa 12 rounds (mínimo).** `const BCRYPT_ROUNDS = 12`

- [ ] **Password mínimo 8 caracteres** en todos los schemas (`LoginSchema`, `ChangePasswordSchema`, `CreateUserSchema`).

#### RLS (Row-Level Security)

- [ ] **RLS policies deben existir en PostgreSQL.** No depender solo de filtros `WHERE tenantId` en código:
  - Todas las tablas con `tenantId` deben tener `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
  - Policy `FOR ALL USING ("tenantId" = app.current_tenant_id())`
  - `AuditLog`: solo SELECT + INSERT (no UPDATE/DELETE)
  - La migración `add_rls_policies` es el baseline; nuevas tablas con `tenantId` deben incluir RLS.

- [ ] **En transacciones `$transaction`, siempre setear RLS context:**
  ```typescript
  await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, false)`;
  ```

#### Security Headers y Middleware

- [ ] **Backend usa helmet + trust proxy.** `main.ts` debe tener:
  ```typescript
  app.use(helmet());
  app.set('trust proxy', 1);
  ```

- [ ] **Frontend tiene security headers.** `next.config.js` debe incluir HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.

#### Docker / Infra

- [ ] **Dockerfile NO ejecuta como root.** Usar `USER` directive con usuario no-root.
- [ ] **docker-compose tiene `cap_drop: [ALL]`, `no-new-privileges`, `read_only: true`.**
- [ ] **DB connections usan `?sslmode=require` en producción.**

#### Error Handling

- [ ] **Exception filter atrapa TODAS las excepciones** (`@Catch()`, no `@Catch(HttpException)`).
- [ ] **En producción, nunca devolver stack traces ni mensajes de error internos.**
- [ ] **No usar `console.error` para logging en producción.** Usar `Logger` de NestJS.

#### Código Muerto y Raw Queries

- [ ] **No dejar rutas legacy con fetch() sin autenticación.** Verificar que `src/app/` no tenga código activo si Next.js usa `app/`.
- [ ] **`$queryRaw` para SELECT, `$executeRaw` para INSERT/UPDATE/DELETE.** No intercambiarlos:
  ```typescript
  // ❌ $executeRaw para SELECT — retorna row count, no datos
  const result = await tx.$executeRaw`SELECT ...`;
  
  // ✅ $queryRaw para SELECT
  const result = await tx.$queryRaw<Array<{ col: string }>>`SELECT ...`;
  ```

### Prisma 7 — Limitaciones Críticas

- **No es extensible:** `class PrismaService extends PrismaClient { }` no funciona
- **Usar composición:** exponer modelos como propiedades `readonly` en `PrismaService`
- **Constructor requiere argumento:** `new PrismaClient({} as any)` (necesario para Prisma 7)
- **Después de cambiar schema:**
  ```bash
  npx prisma generate     # regenerar client
  npx prisma migrate dev  # crear y ejecutar migración
  ```

### Transacciones Atómicas

Para operaciones que afectan múltiples tablas (ej: crear venta + decrementar stock + crear AuditLog), usar transacción:

```typescript
await this.prisma.$transaction(async (tx) => {
  const sale = await tx.sale.create({ data: { ... } });
  await tx.locationStock.update({ ... });
  // Si cualquier operación falla, TODO se revierte
});
```

### Decorador @Audit

Marca endpoints que acceden/modifican datos sensibles (PHI, auditoría):

```typescript
@Post()
@Audit({ action: 'CREATE', resource: 'Sale' })
create(@Body() dto: CreateSaleDto) { ... }

@Get(':id')
@Audit({ action: 'READ', resource: 'Patient' })
findOne(@Param('id') id: string) { ... }
```

---

## Frontend — Next.js (`apps/web`)

### Principios

1. **Server Components por defecto** — usar `'use client'` solo cuando sea necesario (interactividad, hooks)
2. **Formularios en modales/drawers**, nunca en páginas dedicadas
3. **Validación con React Hook Form + Zod** usando schemas de `@repo/types`
4. **Rutas por subfolderes + layout.tsx** (no custom routing)
5. **shadcn/ui en `components/ui/`** — extender, no modificar directamente

### Estructura de Rutas (App Router)

```
apps/web/app/
├── (landing)/
│   ├── page.tsx               (home)
│   └── [tenant]/
│       ├── page.tsx           (landing específica del tenant)
│       └── privacidad/        (aviso de privacidad)
├── (auth)/
│   └── login/
│       └── page.tsx
├── middleware.ts              (resolución de tenant por subdominio)
└── tenants/
    └── [slug]/
        ├── (dashboard)/
        │   ├── layout.tsx     (layout protegido + sidebar)
        │   ├── page.tsx       (dashboard principal)
        │   ├── patients/
        │   ├── appointments/
        │   ├── receipts/
        │   ├── plans/
        │   ├── companies/
        │   ├── inventory/
        │   │   ├── products/
        │   │   ├── suppliers/
        │   │   ├── purchase-orders/
        │   │   ├── purchases/
        │   │   └── movements/
        │   ├── financials/     (ventas, ingresos, egresos, corte de caja)
        │   ├── reports/
        │   └── settings/
        │       ├── locations/
        │       ├── users/
        │       ├── service-types/
        │       ├── clinical-templates/
        │       └── branding/
        └── actions/           (Server Actions)

components/
├── ui/                        (shadcn/ui — no modificar)
├── forms/                     (componentes de forma reutilizables)
└── [feature]/                 (componentes específicos de features)

lib/
├── api.ts                     (cliente HTTP con auth + errores)
├── auth.ts                    (manejo de JWT)
└── utils.ts                   (helpers)
```

### Formularios: React Hook Form + Zod

**Patrón:**

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateSaleSchema } from '@repo/types';

export function CreateSaleForm() {
  const form = useForm({
    resolver: zodResolver(CreateSaleSchema),
    defaultValues: { ... }
  });

  async function onSubmit(data: z.infer<typeof CreateSaleSchema>) {
    const res = await fetch('/api/sales', { method: 'POST', body: JSON.stringify(data) });
    // ...
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField name="locationId" control={form.control} render={...} />
        {/* más campos */}
      </form>
    </Form>
  );
}
```

### shadcn/ui

Los componentes base están en `components/ui/` — extender con custom props en la ruta de feature:

```typescript
// ✅ correcto: crear wrapper
// components/sales/SaleForm.tsx
import { Button } from '@/components/ui/button';

export function SaleForm() {
  return <Button className="custom-styles">Create Sale</Button>;
}

// ❌ incorrecto: modificar ui/button.tsx directamente
```

---

## Shared Types (`@repo/types`)

**Es la única fuente de verdad para validación y tipos** en todo el monorepo.

### Estructura

```
packages/types/src/
├── enums.ts                     (PaymentType, UserRole, etc.)
├── auth.schemas.ts              (LoginSchema, RefreshSchema, etc.)
├── patients.schemas.ts          (CreatePatientSchema, UpdatePatientSchema)
├── sales.schemas.ts             (CreateSaleSchema, etc.)
├── income.schemas.ts
├── expense.schemas.ts
├── cash-close.schemas.ts
└── index.ts                      (re-exporta todo)
```

### Cómo usar

**Backend (NestJS):**

```typescript
// 1. Schema en @repo/types
// packages/types/src/sales.schemas.ts
export const CreateSaleSchema = z.object({
  locationId: z.string().uuid(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive(),
    pricePerUnit: z.number().nonnegative(),
  })),
  paymentType: z.enum(['CASH', 'CREDIT', 'BENEFIT']),
});
export type CreateSaleDto = z.infer<typeof CreateSaleSchema>;

// 2. DTO como wrapper en el backend (una línea)
// apps/api/src/sales/dto/create-sale.dto.ts
import { createZodDto } from 'nestjs-zod';
import { CreateSaleSchema } from '@repo/types';

export class CreateSaleDto extends createZodDto(CreateSaleSchema) {}

// 3. Usar en controller
import { CreateSaleDto } from './dto/create-sale.dto.js';

@Post()
@UseGuards(JwtAuthGuard)
create(@Body() dto: CreateSaleDto, @CurrentUser() user: CurrentUserDto) {
  return this.salesService.create(dto, user.tenantId, user.userId);
}
```

**Frontend (Next.js):**

```typescript
import { CreateSaleSchema } from '@repo/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const form = useForm({
  resolver: zodResolver(CreateSaleSchema),
});
```

---

## Seguridad y Cumplimiento Regulatorio

Renalfy almacena **datos personales de salud (PHI)**. Las siguientes regulaciones mexicanas son **obligatorias** en cada feature que toque datos clínicos.

### LFPDPPP — Ley Federal de Protección de Datos Personales

- **Consentimiento explícito:** todo paciente debe consentir almacenamiento de información clínica
- **Registro:** `PatientConsent` con campos `patientId`, `tenantId`, `consentType`, `signedAt`, `consentFileUrl`, `revokedAt`
- **Validación:** **nunca** crear `Appointment` o `Measurement` sin `PatientConsent` activo (`revokedAt IS NULL`)
- **Aviso privacidad:** debe estar en `/{tenant}/privacidad`

### NOM-004-SSA3 — Expediente Clínico Electrónico

- **Inmutabilidad:** `Measurement`, `Appointment`, `ClinicalTemplate` son **immutables** una vez creados
- **Correcciones:** crear nuevo registro con referencia al anterior, **nunca UPDATE directo**
- **Auditoría:** `AuditLog` registra todo: creación, modificación, acceso (quién, cuándo, desde dónde)
- **Conservación:** mínimo 5 años — no se borran, solo se marcan inactivos

### NOM-024-SSA3 — Sistemas de Información de Salud

- **Aislamiento:** información clínica solo se comparte entre profesionales autorizados del mismo tenant
- **Reportes:** exportaciones incluyen marca de agua con `tenantId` y fecha
- **Acceso cross-tenant:** **prohibido** — RLS + filtros de aplicación lo garantizan

### AI / PHI Zero-Data Rule

- **Nunca** enviar datos identificables (nombre, CURP, fecha de nacimiento) a APIs externas de IA
- **Anonimizar:** usar solo `patientId` + datos clínicos agregados
- **Contratos DPA:** preferir modelos on-premise o con Data Processing Agreements firmados

---

## Estilo de Código — Google TypeScript Style Guide

### Nomenclatura

| Construcción | Estilo | Ejemplo |
|---|---|---|
| Clases, interfaces, tipos, enums | `UpperCamelCase` | `class UserService`, `interface Patient` |
| Variables, funciones, métodos, parámetros, propiedades | `lowerCamelCase` | `const userName`, `function calculateTotal()` |
| Constantes globales y valores de enum | `CONSTANT_CASE` | `const MAX_RETRIES = 3`, `enum Status { ACTIVE, CLOSED }` |

**Reglas:**
- Acrónimos = palabras completas: `loadHttpUrl` (no `loadHTTPURL`)
- Sin prefijos/sufijos: `_foo`, `foo_` están prohibidos
- Sin `$` excepto en Observables (RxJS)
- Variables de una letra (i, j, x) solo en scopes < 10 líneas

### Prohibido — ESLint error

- `var` — usar `const` (preferido) o `let`
- `const enum` — usar `enum` regular
- `export default` — exportaciones nombradas solo
- `export let` — exports mutables prohibidos
- `require()` — usar import/export ESM
- `any` — configurado como error
- `with`, `eval`, `Function(string)` — inseguro
- Wrapper objects: `new String()`, `new Boolean()`, `new Number()`
- Modificar prototipos de built-ins

---

## Módulo 4 — Ventas, Ingresos, Egresos, Corte de Caja

Este módulo maneja transacciones financieras atómicas y es crítico para el negocio.

### Reglas de Negocio

1. **Folio secuencial:** único por `(tenantId, locationId, año)`, generado server-side en transacción atómica
   - Formato: `{LOCCODE}-{YYYY}-{NNNNN}` (ej: `CLINICA1-2026-00001`)
   - Incrementa automáticamente
   - **Nunca** reutilizar ni permitir entrada del usuario

2. **Stock:** decrementado en `LocationStock` al crear venta
   - Si stock insuficiente → 400 BadRequest
   - En transacción atómica con creación de venta

3. **InventoryMovement:** creado automáticamente
   - Tipo: `OUT` (salida de stock)
   - Referencia: `saleId`

4. **Plan.usedSessions:** incrementado si `paymentType = BENEFIT`
   - Si `usedSessions >= plannedSessions` → estado del plan cambia a `EXHAUSTED`

5. **CashClose:** una vez creado, es **inmutable**
   - Status: `CLOSED`
   - Todas sus transacciones quedan locked: `isClosed = true`
   - Impide crear nuevas ventas/ingresos/egresos para ese período

6. **Permisos:**
   - `STAFF` → rechazado (403 Forbidden)
   - `MANAGER` → limitado a su `locationId`
   - `OWNER`, `ADMIN` → acceso total

7. **Auditoría:** todas las operaciones se loguean en `AuditLog` (async, fire-and-forget)

### API Endpoints

```
POST   /api/sales               (crear venta)
GET    /api/sales               (listar)
GET    /api/sales/:id           (detalles)
PATCH  /api/sales/:id/finish    (marcar FINISHED)
PATCH  /api/sales/:id/settle    (marcar SETTLED)
PATCH  /api/sales/:id/cancel    (cancelar, revertir stock)

POST   /api/income              (registrar ingreso)
GET    /api/income              (listar)
PATCH  /api/income/:id/cancel   (cancelar)

POST   /api/expense             (registrar egreso)
GET    /api/expense             (listar)
PATCH  /api/expense/:id/cancel  (cancelar)

POST   /api/cash-close          (crear cierre de caja — ATÓMICO)
GET    /api/cash-close          (listar)
GET    /api/cash-close/:id      (detalles)
```

---

## Comandos de Desarrollo

### Instalación y Setup

```bash
pnpm install              # instalar dependencias
cp .env.example .env.local # configurar variables de entorno
pnpm db:setup             # inicializar BD dev/test
```

### Desarrollo

```bash
pnpm dev                  # ejecutar api + web en watch mode
pnpm dev --filter=api     # solo backend
pnpm dev --filter=web     # solo frontend
```

### Testing

```bash
pnpm test                 # todos los tests (frontend + backend)
pnpm test --filter=api    # solo backend tests
pnpm test --filter=web    # solo frontend tests
pnpm test:watch           # watch mode
pnpm test:cov             # coverage report
```

### Linting y Type Checking

```bash
pnpm lint                 # ESLint en todos los workspaces
pnpm check-types          # TypeScript type check (no-emit)
pnpm format               # Prettier format (escribe archivos)
```

### Build

```bash
pnpm build                # build frontend + backend
pnpm build --filter=api   # solo backend
pnpm build --filter=web   # solo frontend
```

### Prisma

```bash
npx prisma generate      # regenerar Prisma client (en apps/api)
npx prisma migrate dev   # crear y ejecutar nueva migración
npx prisma db push      # sincronizar schema con BD (dev)
npx prisma studio      # interfaz gráfica de BD
```

---

## Documentación Detallada

Para información más profunda, consulta:

- **Setup y ambiente:** `/docs/SETUP.md`
- **Arquitectura completa:** `/docs/ARCHITECTURE.md`
- **TypeScript Style Guide:** `/docs/TYPESCRIPT_STYLE.md`
- **Especificaciones de features:** `/docs/specs/`
- **ADRs (decisiones arquitectónicas):** `/docs/decisions/`
- **Roadmap de sprints:** `/docs/sprints/`

---

## Notas Finales

1. **Schemas son la fuente de verdad:** si un DTO discrepa con `@repo/types`, actualiza el schema
2. **RLS no es negociable:** todos los queries de aplicación van filtrados por `tenantId`
3. **TDD es obligatorio:** no se mergea código sin tests en verde
4. **Compliance es código:** LFPDPPP, NOM-004, NOM-024 no son "por si acaso" — son requerimientos funcionales
5. **Transacciones atómicas:** cualquier operación multi-paso (venta + stock + inventario) debe ser atómica
6. **Importaciones `.js` en backend:** ESM requiere extensión incluso para `.ts` archivos
