# Renalfy — CLAUDE.md

Plataforma SaaS multi-tenant para gestión de clínicas médicas. **El plan técnico completo está en `/Users/alejandroprado/pratum/sutr/PLAN_NUEVA_APP.md`.**

---

## Producto

- **Multi-tenant:** cada tenant = una organización médica con una o varias sucursales (`Location`)
- **Primer caso de uso:** clínicas de diálisis renal (migración desde SUTR), pero el sistema es genérico
- **Principio:** lo específico de cada especialidad se configura por tenant (ej: `ClinicalTemplate`), nunca se hardcodea
- **Subdominio por tenant:** `{slug}.renalfy.app`

### Roles y scope de acceso

| Rol | Scope |
|---|---|
| `SUPER_ADMIN` | Global — administra la plataforma |
| `OWNER` | Tenant — acceso total a su organización |
| `ADMIN` | Tenant — gestión administrativa de todas las sucursales |
| `MANAGER` | Sucursal — operación completa de su `locationId` |
| `STAFF` | Sucursal — registro de pacientes, citas, recibos |

**Regla crítica:** `MANAGER` y `STAFF` solo ven datos de su `locationId`. Este filtro se aplica en el backend — **nunca en el frontend.**

---

## Metodología de desarrollo — TDD

**Todo feature se desarrolla siguiendo el ciclo Red → Green → Refactor:**

1. **Red** — escribir el test primero. Debe fallar porque la funcionalidad no existe aún
2. **Green** — escribir el mínimo código para que el test pase
3. **Refactor** — limpiar el código sin romper los tests

### Definición de "feature completo"

Un feature **no está terminado** hasta que se cumplan las tres condiciones:

1. `pnpm lint` — sin errores ni warnings
2. `pnpm check-types` — sin errores de TypeScript
3. `pnpm test` — todos los tests en verde

**Backend (NestJS):**
- Unit tests: cada `service` tiene su `.spec.ts` con mocks tipados de `PrismaService`
- E2E tests: en `apps/api/test/` contra BD de test real
- Los mocks se crean con objetos plain — **sin librerías de mocking de Prisma**
- Naming: por comportamiento, no por implementación

**Frontend (Next.js):**
- Unit/component tests: Vitest + React Testing Library
- Testear comportamiento visible, no detalles de implementación

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 16 (App Router) + TypeScript |
| Estilos | Tailwind CSS v4 + shadcn/ui |
| Backend | NestJS + TypeScript |
| ORM | Prisma 7 |
| Base de datos | PostgreSQL 16 |
| Auth | JWT (access 15m + refresh 7d) |
| Monorepo | Turborepo |
| Contenedores | Docker + docker-compose |

---

## Row-Level Security (RLS)

El aislamiento de datos entre tenants ocurre en **dos capas:**

1. **Aplicación** — los servicios de NestJS filtran por `tenantId` en cada query
2. **Base de datos** — PostgreSQL RLS bloquea queries sin el tenant correcto seteado

**Flujo:**
```
Request HTTP
  → JwtAuthGuard          (extrae tenantId del JWT)
  → TenantInterceptor     (set_config('app.current_tenant_id', tenantId))
  → PostgreSQL RLS        (aplica WHERE "tenantId" = current_tenant_id())
  → Servicio              (ejecuta query normalmente)
  → TenantInterceptor     (limpia set_config)
```

**Dos usuarios de BD:**
| Usuario | Uso | RLS |
|---|---|---|
| `renalfy` | Migraciones de Prisma | BYPASSRLS (superusuario) |
| `renalfy_app` | Runtime de la aplicación | Sujeto a RLS |

**Tablas con RLS:**
- Directa (tienen `tenantId`): `User`, `Location`, `TenantSettings`, `Patient`, `ServiceType`, `Receipt`, `Appointment`, `Measurement`, `ClinicalTemplate`, `Company`, `Plan`, `Product`, `LocationStock`, `Supplier`, `SupplierProduct`, `PurchaseOrder`, `Purchase`, `InventoryMovement`, `Sale`, `Income`, `Expense`, `CashClose`
- Via JOIN al padre: `SaleItem`, `PurchaseOrderItem`, `PurchaseItem`, `InventoryMovementItem`
- Sin RLS (plataforma): `Tenant`

---

## Convenciones NestJS

- **Prefijo global:** `/api` — todos los endpoints son `/api/...`
- **Módulo por recurso:** cada recurso tiene su módulo con controller, service, y dto/
- **Guards:** usar `@UseGuards(JwtAuthGuard)` en todos los endpoints protegidos
- **@CurrentUser():** decorador para obtener `{ userId, tenantId, role }` del JWT
- **Inyección de tenantId:** viene del JWT payload — **nunca del body del request**
- **Transacciones Prisma:** usar `prisma.$transaction(fn)` para operaciones atómicas (folio, corte de caja, etc.)
- **Validación global:** `ZodValidationPipe` en `main.ts` — los DTOs se heredan de `createZodDto(Schema)`
- **Schemas en @repo/types:** DTOs se crean desde `@repo/types`, no se definen en el backend

### Prisma 7 — limitaciones críticas

- `PrismaClient` **no es extensible** (`extends` no funciona)
- Usar **composición** en `PrismaService`: exponer modelos como propiedades `readonly`
- El constructor requiere argumento: `new PrismaClient({} as any)`
- Después de cambiar el schema: `npx prisma generate` + `npx prisma migrate dev`

---

## Auth

- **Access token:** JWT, 15 minutos, firma con `JWT_SECRET`
- **Refresh token:** JWT, 7 días, firma con `JWT_REFRESH_SECRET`
- **Payload del access token:** `{ sub: userId, tenantId, role }`
- **Endpoints:** `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `GET /api/auth/me`, `PATCH /api/auth/me/password`

---

## Módulo 4 — Ventas, Ingresos, Egresos, Corte de Caja

### Reglas de negocio

- **Folio:** único por `(tenantId, locationId, año)`, generado server-side en transacción atómica. Formato: `{LOC}-{YYYY}-{NNNNN}`
- **Stock:** decrementado en `LocationStock` al crear venta; si insuficiente → 400 BadRequest
- **InventoryMovement:** creado automáticamente con tipo OUT, referencia sale ID
- **Plan.usedSessions:** incrementado si `paymentType = BENEFIT`; si >= `plannedSessions` → status `EXHAUSTED`
- **CashClose:** una vez creado (`status = CLOSED`), todas sus transacciones están locked (`isClosed = true`), impide crear nuevas para ese período
- **Permisos:** STAFF rechazado (403), MANAGER limitado a su `locationId`, OWNER/ADMIN acceso total
- **Auditoría:** todas las operaciones loggeadas en `AuditLog` (async, fire-and-forget)

**Para la lista completa de endpoints, ver `docs/ARCHITECTURE.md`.**

---

## Modelo de datos — resumen

### Sin tenant (plataforma)
- `Tenant` → `TenantSettings` (branding)

### Con tenant (negocio)
- **Usuarios y sucursales:** `User`, `Location`
- **Módulo 1 — Clínica:** `Patient`, `ServiceType`, `Receipt`, `Appointment`, `Measurement`, `ClinicalTemplate`
- **Módulo 2 — Planes:** `Plan`, `Company`
- **Módulo 3 — Inventario:** `Product`, `LocationStock`, `Supplier`, `SupplierProduct`, `PurchaseOrder`, `PurchaseOrderItem`, `Purchase`, `PurchaseItem`, `InventoryMovement`, `InventoryMovementItem`
- **Módulo 4 — Caja:** `Sale`, `SaleItem`, `Income`, `Expense`, `CashClose`

**Lógica de negocio crítica:**
- **Folio de recibo:** secuencial por `tenantId + locationId`, generado en transacción atómica
- **Planes:** al crear recibo con `paymentType = BENEFIT` → `plan.usedSessions++`; si >= `plannedSessions` → `EXHAUSTED`
- **Stock:** se actualiza en transacción al recibir pedido / registrar venta / movimiento de inventario
- **Corte de caja:** transacción atómica que marca `isClosed = true` en ventas/ingresos/egresos del período
- **Estados de recibo:** `ACTIVE → FINISHED → SETTLED` o `ACTIVE → CANCELLED`

---

## Cumplimiento regulatorio — México (Salud)

Renalfy almacena datos personales de salud (PHI). Las siguientes normas son **obligatorias** en cada feature que toque datos de pacientes.

### LFPDPPP — Ley Federal de Protección de Datos Personales

- Todo paciente debe otorgar **consentimiento explícito** antes de almacenar información clínica
- El consentimiento se registra en `PatientConsent` — campos: `patientId`, `tenantId`, `consentType`, `signedAt`, `consentFileUrl`, `revokedAt`
- **Nunca** crear `Appointment` o `Measurement` sin `PatientConsent` activo (`revokedAt IS NULL`)
- El aviso de privacidad debe estar en la landing page pública: `/{tenant}/privacidad`

### NOM-004-SSA3 — Expediente clínico electrónico

- Los registros clínicos (`Measurement`, `Appointment`, `ClinicalTemplate`) son **inmutables** una vez creados
- Las correcciones se hacen con nuevo registro con referencia al anterior — **nunca UPDATE directo**
- `AuditLog` registra toda creación, modificación y acceso a expedientes clínicos
- Los registros clínicos deben conservarse mínimo **5 años** — no se borran, solo se marcan inactivos
- Cada entrada: quién (`userId`), cuándo (`createdAt`), desde dónde (`ipAddress`)

### NOM-024-SSA3 — Sistemas de información de salud

- La información clínica solo se comparte entre profesionales autorizados dentro del mismo tenant
- Los reportes exportados incluyen marca de agua con `tenantId` y fecha de generación
- El acceso entre tenants está **prohibido** — RLS + filtros de aplicación garantizan esto

### AI / PHI Zero-Data Rule

- **Nunca** enviar datos identificables (nombre, CURP, fecha de nacimiento) a APIs externas de IA
- Anonimizar antes de cualquier llamada externa: usar solo `patientId` + datos clínicos agregados
- Preferir modelos on-premise o con contratos DPA firmados para PHI

### Audit Log — garantías técnicas

```sql
-- La política RLS solo permite SELECT e INSERT para renalfy_app
-- No hay UPDATE ni DELETE → bloqueadas por PostgreSQL
-- Solo el superusuario (renalfy) puede borrar registros
```

### Código de ejemplo

```ts
// Verificar consentimiento activo antes de crear registro clínico
const consent = await this.prisma.patientConsent.findFirst({
  where: { patientId, tenantId, revokedAt: null },
});
if (!consent) throw new ForbiddenException('Sin consentimiento activo');

// Marcar endpoints que acceden/modifican datos clínicos
@Audit({ action: 'READ', resource: 'Patient' })
@Get(':id')
findOne(@Param('id') id: string) { ... }
```

---

## Estilo de código — Google TypeScript Style Guide

### Nomenclatura

| Construcción | Estilo |
|---|---|
| Clases, interfaces, tipos, enums, decoradores | `UpperCamelCase` |
| Variables, parámetros, funciones, métodos, propiedades | `lowerCamelCase` |
| Constantes globales y valores de enum | `CONSTANT_CASE` |

**Reglas:** Acrónimos = palabras completas (`loadHttpUrl`). Sin prefijos/sufijos (`_foo`, `foo_`). Sin `$` excepto Observables. Variables de una letra solo en scopes < 10 líneas.

### Prohibido

- `var` — usar `const` o `let`
- `const enum` — usar `enum` regular
- `with`, `eval`, `Function(string)`
- Wrapper objects: `new String()`, `new Boolean()`, `new Number()`
- Modificar prototipos de built-ins
- `export default`
- `export let` (exports mutables)
- `require()`
- `any` — configurado como `error` en ESLint

---

## Importaciones en NestJS (ESM / nodenext)

Todos los imports locales en `apps/api` **deben incluir extensión `.js`** aunque el archivo sea `.ts`:

```ts
// ✅ correcto
import { PrismaService } from '../prisma/prisma.service.js';

// ❌ incorrecto
import { PrismaService } from '../prisma/prisma.service';
```

---

## Documentación por temas

Para información más detallada, consulta:

- **Setup y configuración:** `docs/SETUP.md` — variables de entorno, BD dev/test, comandos
- **TypeScript — Style Guide completo:** `docs/TYPESCRIPT_STYLE.md` — todas las reglas y ejemplos de código
- **Arquitectura del proyecto:** `docs/ARCHITECTURE.md` — estructura de directorios, módulos, endpoints
- **Sprints y roadmap:** `docs/sprints/` — documentación de cada sprint

---

## Notas sobre el proyecto

- **Monorepo:** Turborepo con workspaces en `apps/` (api, web) y `packages/` (types, utils, ui, eslint-config)
- **Schemas compartidos:** todos los DTOs viven en `@repo/types` con Zod — es la única fuente de verdad para validación
- **Frontend:** Next.js 16 App Router, Server Components por defecto, formularios en modales/drawers (no páginas dedicadas)
- **Almacenamiento clínico:** datos de pacientes son sensibles y sujetos a regulación — aplicar RLS y cumplimiento en cada feature

