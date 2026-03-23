# Renalfy — CLAUDE.md

Plataforma SaaS multi-tenant para gestión de clínicas médicas.
El plan técnico completo está en `/Users/alejandroprado/pratum/sutr/PLAN_NUEVA_APP.md`.

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

**Regla crítica:** `MANAGER` y `STAFF` solo ven datos de su `locationId`. Este filtro se aplica en el backend — nunca en el frontend.

---

## Metodología de desarrollo — TDD

**Todo feature se desarrolla siguiendo el ciclo Red → Green → Refactor.**

### Ciclo obligatorio

1. **Red** — escribir el test primero. El test debe fallar porque la funcionalidad no existe aún
2. **Green** — escribir el mínimo código necesario para que el test pase
3. **Refactor** — limpiar el código sin romper los tests

No se escribe código de producción sin un test en rojo que lo justifique.

### Definición de "feature completo"

Un feature **no está terminado** hasta que se cumplan las tres condiciones:

1. `pnpm lint` — sin errores ni warnings
2. `pnpm check-types` — sin errores de TypeScript
3. `pnpm test` — todos los tests en verde

Estas tres verificaciones son obligatorias antes de considerar cualquier tarea como concluida.

### Backend (NestJS)

- **Unit tests:** cada `service` tiene su `.spec.ts` con mocks de `PrismaService` y dependencias
- **E2E tests:** cada módulo tiene tests en `apps/api/test/` que levantan la app real contra la BD de test
- Usar `jest` (ya configurado en `apps/api/package.json`)
- Los mocks de Prisma se crean con objetos plain que implementan la interfaz del servicio — no usar librerías de mocking de Prisma
- Nombrar los describes por comportamiento, no por implementación: `describe('AuthService', () => { describe('login', () => { it('should throw when credentials are invalid') }) })`

### Frontend (Next.js)

- **Unit/component tests:** con Vitest + React Testing Library
- Testear comportamiento visible, no detalles de implementación

### Comandos

```bash
# Backend
pnpm --filter api test           # unit tests
pnpm --filter api test:watch     # watch mode
pnpm --filter api test:e2e       # e2e tests
pnpm --filter api test:cov       # coverage
```

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
| Deploy frontend | Vercel |
| Deploy backend | Render (Docker) |

---

## Estructura del monorepo

```
/
├── apps/
│   ├── api/          → NestJS (backend)
│   └── web/          → Next.js (frontend)
├── packages/
│   ├── types/        → @repo/types  — DTOs e interfaces compartidos
│   ├── utils/        → @repo/utils  — helpers compartidos
│   ├── eslint-config/→ @repo/eslint-config
│   ├── typescript-config/ → @repo/typescript-config
│   └── ui/           → @repo/ui — componentes compartidos
├── .github/workflows/ci.yml
├── docker-compose.yml
├── turbo.json
└── package.json
```

---

## Backend — NestJS (`apps/api`)

### Estructura de módulos

```
src/
├── main.ts               → bootstrap, ValidationPipe global, prefix "api", CORS
├── app.module.ts         → ConfigModule (global), PrismaModule, AuthModule, ...
├── prisma/
│   ├── prisma.service.ts → composición sobre PrismaClient (Prisma 7)
│   └── prisma.module.ts  → @Global()
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── dto/
│   └── strategies/       → jwt.strategy.ts, jwt-refresh.strategy.ts
├── common/
│   ├── guards/           → JwtAuthGuard, JwtRefreshGuard
│   └── decorators/       → @CurrentUser()
└── [módulos de negocio]/
```

### Contrato API ↔ Frontend — Zod + nestjs-zod

Los schemas viven en `@repo/types` y son la **única fuente de verdad** para validación y tipos en todo el monorepo:

```
packages/types/src/
├── enums.ts          → todos los enums como z.enum() con tipos inferidos
├── auth.schemas.ts   → LoginSchema, ChangePasswordSchema, MeResponseSchema, ...
├── patients.schemas.ts  (próximamente)
└── index.ts          → re-exporta todo
```

**En el backend (NestJS):**
```ts
// 1. El schema vive en @repo/types
// packages/types/src/auth.schemas.ts
export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
export type LoginDto = z.infer<typeof LoginSchema>;

// 2. El DTO es solo un wrapper de una línea
// apps/api/src/auth/dto/login.dto.ts
import { createZodDto } from 'nestjs-zod';
import { LoginSchema } from '@repo/types';
export class LoginDto extends createZodDto(LoginSchema) {}
```

- El `ZodValidationPipe` global (en `main.ts`) valida automáticamente todos los DTOs
- `class-validator` y `class-transformer` **no se usan** — fueron reemplazados por nestjs-zod

**En el frontend (Next.js):**
```ts
// Mismo schema para validar formularios (React Hook Form + Zod resolver)
import { LoginSchema } from '@repo/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const form = useForm({ resolver: zodResolver(LoginSchema) });

// Y para validar respuestas de la API
import { MeResponseSchema } from '@repo/types';
const me = MeResponseSchema.parse(await res.json());
```

**Regla:** cada nuevo recurso crea su archivo de schemas en `@repo/types` antes de tocar el backend o el frontend.

### Row-Level Security (RLS)

El aislamiento de datos entre tenants opera en **dos capas**:

1. **Aplicación** — los servicios de NestJS filtran por `tenantId` en cada query (primera línea de defensa)
2. **Base de datos** — PostgreSQL aplica políticas RLS que bloquean cualquier query que no tenga el tenant correcto seteado, sin importar lo que haga la aplicación (defensa en profundidad)

**Cómo funciona:**

```
Request HTTP
  → JwtAuthGuard     extrae tenantId del JWT (o X-Tenant-ID header en login)
  → TenantInterceptor  llama: SELECT set_config('app.current_tenant_id', tenantId, false)
  → PostgreSQL RLS   aplica política: WHERE "tenantId" = current_tenant_id()
  → Servicio         ejecuta query normalmente
  → TenantInterceptor  limpia: set_config('app.current_tenant_id', '', false)
```

**Dos usuarios de base de datos:**

| Usuario | Uso | RLS |
|---|---|---|
| `renalfy` | Migraciones de Prisma | BYPASSRLS (superusuario) |
| `renalfy_app` | Runtime de la aplicación | Sujeto a RLS |

- `DATABASE_MIGRATION_URL` → `renalfy` (usado por `prisma.config.ts`)
- `DATABASE_URL` → `renalfy_app` (usado por `PrismaService` en runtime)

**Tablas con RLS:**
- Directa (tienen `tenantId`): `User`, `Location`, `TenantSettings`, `Patient`, `ServiceType`, `Receipt`, `Appointment`, `Measurement`, `ClinicalTemplate`, `Company`, `Plan`, `Product`, `LocationStock`, `Supplier`, `SupplierProduct`, `PurchaseOrder`, `Purchase`, `InventoryMovement`, `Sale`, `Income`, `Expense`, `CashClose`
- Via JOIN al padre: `SaleItem`, `PurchaseOrderItem`, `PurchaseItem`, `InventoryMovementItem`
- Sin RLS (plataforma): `Tenant`

**Fuentes de `tenantId` en el interceptor:**
- Rutas autenticadas: `req.user.tenantId` (del JWT)
- Ruta de login: header `X-Tenant-ID` (seteado por el middleware de Next.js al resolver el subdominio)

**Nota sobre concurrencia:** `set_config` opera a nivel de sesión (`is_local = false`). Con connection pooling, el interceptor limpia el contexto al finalizar cada request para evitar residuos en conexiones reutilizadas.

### Convenciones NestJS

- **Prefijo global:** `/api` — todos los endpoints son `/api/...`
- **Módulo por recurso:** cada recurso tiene su propio módulo con controller, service, y dto/
- **DTOs con class-validator:** `@IsString()`, `@IsEmail()`, `@IsUUID()`, etc. — ValidationPipe está configurado como `whitelist: true, forbidNonWhitelisted: true`
- **Guards:** usar `@UseGuards(JwtAuthGuard)` en todos los endpoints protegidos
- **@CurrentUser():** decorador para obtener `{ userId, tenantId, role }` del JWT
- **Inyección de tenantId:** el `tenantId` viene del JWT payload — nunca del body del request
- **Transacciones Prisma:** usar `prisma.$transaction(fn)` para operaciones atómicas (folio de recibos, corte de caja, etc.)

### Prisma 7 — importante

- `PrismaClient` en Prisma 7 **no es extensible** (`extends` no funciona)
- Usar **composición** en `PrismaService`: cada modelo se expone como propiedad `readonly`
- El constructor requiere argumento: `new PrismaClient({} as any)`
- El cliente generado está en `apps/api/generated/prisma/`
- La URL de la BD se configura en `prisma.config.ts` (no en `schema.prisma`)
- Después de cambiar el schema: `npx prisma generate` + `npx prisma migrate dev`

### Auth

- Access token: JWT, 15 minutos, firma con `JWT_SECRET`
- Refresh token: JWT, 7 días, firma con `JWT_REFRESH_SECRET`
- Payload del access token: `{ sub: userId, tenantId, role }`
- Endpoints: `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `GET /api/auth/me`, `PATCH /api/auth/me/password`

### Variables de entorno (`apps/api/.env`)

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

## Frontend — Next.js (`apps/web`)

### Estructura de rutas (App Router)

```
app/
├── (landing)/
│   └── [tenant]/         → landing page dinámica por tenant
├── (auth)/
│   └── login/
└── (dashboard)/
    ├── layout.tsx
    ├── patients/
    ├── appointments/
    ├── receipts/
    ├── plans/
    ├── companies/
    ├── inventory/
    │   ├── products/
    │   ├── suppliers/
    │   ├── purchase-orders/
    │   ├── purchases/
    │   └── movements/
    ├── sales/
    ├── cash-close/
    ├── reports/
    └── settings/
        ├── locations/
        ├── users/
        ├── service-types/
        ├── clinical-templates/
        └── branding/
```

### Convenciones Next.js

- **Resolución de tenant:** `middleware.ts` — extrae el subdominio del hostname e inyecta `tenantId` en headers
- **Formularios dinámicos:** el formulario de citas se genera desde `ClinicalTemplate.fields` — no hay campos hardcodeados de diálisis
- **shadcn/ui:** componentes en `components/ui/` — no modificar directamente, extender encima
- **Server Components por defecto** — usar `'use client'` solo cuando sea necesario (interactividad, hooks)

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

**Todas las tablas de negocio tienen `tenantId`.** `MANAGER`/`STAFF` también filtran por `locationId`.

### Lógica de negocio crítica
- **Folio de recibo:** secuencial por `tenantId + locationId`, generado en transacción atómica. Formato: `{LOC}-{YYYY}-{NNNNN}`
- **Planes:** al crear recibo con `paymentType = BENEFIT` → `plan.usedSessions++`. Si `>= plannedSessions` → estado `EXHAUSTED`
- **Stock:** se actualiza en transacción al recibir pedido / registrar venta / movimiento de inventario
- **Corte de caja:** transacción atómica que marca `isClosed = true` en ventas/ingresos/egresos del período
- **Estados de recibo:** `ACTIVE → FINISHED → SETTLED` o `ACTIVE → CANCELLED`

---

## Estilo de código — Google TypeScript Style Guide

Referencia completa: https://google.github.io/styleguide/tsguide.html

### Nomenclatura

| Construcción | Estilo |
|---|---|
| Clases, interfaces, tipos, enums, decoradores | `UpperCamelCase` |
| Variables, parámetros, funciones, métodos, propiedades | `lowerCamelCase` |
| Constantes globales y valores de enum | `CONSTANT_CASE` |

- Tratar acrónimos como palabras completas: `loadHttpUrl` no `loadHTTPURL`
- Sin guiones bajos al inicio o final: nunca `_foo` ni `foo_`
- Sin prefijo `$` salvo para Observables (rxjs)
- Abreviaciones solo si son universalmente conocidas (URL, DNS, HTTP)
- Variables de una sola letra solo en scopes de menos de 10 líneas

### Imports y exports

```ts
// Correcto — named exports únicamente, nunca default export
export class AuthService { ... }
export function hashPassword() { ... }

// Incorrecto
export default class AuthService { ... }

// Usar import type para imports de solo tipos
import type { LoginDto } from './dto/login.dto.js';

// Nunca require()
const foo = require('./foo'); // ❌
```

- Solo `export` lo que se use externamente
- Nunca `export let` (exports mutables prohibidos)
- Preferir imports relativos (`./foo`) dentro del mismo proyecto

### Sistema de tipos

```ts
// Preferir inferencia en casos triviales
const name = 'renalfy';         // ✅ no necesita : string
const count = 0;                // ✅

// Anotar retornos en funciones complejas
async findAll(): Promise<Patient[]> { ... }  // ✅

// unknown sobre any cuando el tipo es realmente desconocido
function parse(data: unknown): Patient { ... }  // ✅

// T[] para tipos simples, Array<T> para compuestos
user[]           // ✅
Array<User | null>  // ✅

// Record<> para diccionarios
Record<string, number>  // ✅  no  { [key: string]: number }

// Interfaces para estructuras de datos (sobre type aliases)
interface PatientDto { ... }  // ✅
type PatientDto = { ... };    // solo si se necesitan features de type
```

- **Nunca `any`** — está configurado como `error` en ESLint (`@typescript-eslint/no-explicit-any: error`). El linter no dejará pasar el código
- Cuando el tipo es realmente desconocido usar `unknown` y narrowing explícito
- Nunca `@ts-ignore` — usar aserciones de tipo o `unknown`
- Solo `@ts-expect-error` en tests, con comentario explicando por qué
- Para tipos de terceros demasiado estrictos, importar el tipo correcto en lugar de escapar con `any` (ej: `ms.StringValue` para JWT `expiresIn`)

### Clases

```ts
// Usar parameter properties para evitar asignación redundante
constructor(private readonly prisma: PrismaService) {}  // ✅

// readonly en propiedades inmutables
readonly id: string;

// TypeScript private, no # privado de JS
private name: string;   // ✅
#name: string;          // ❌

// Omitir constructor vacío salvo que use parameter properties
// No escribir public en métodos (es el default)
```

- Sin semicolon al final de declaraciones de clase
- Un blank line entre métodos
- `new Foo()` siempre con paréntesis
- Sin métodos estáticos privados — usar funciones a nivel de módulo

### Funciones

```ts
// Funciones nombradas: declaraciones, no expresiones
function buildFolio(locationCode: string): string { ... }  // ✅
const buildFolio = function() { ... };  // ❌

// Callbacks y nested: arrow functions
appointments.filter((a) => a.status === 'ACTIVE');  // ✅

// Rest params en lugar de arguments
function log(...args: string[]) { ... }  // ✅

// Parámetros opcionales múltiples: destructuring
function create({ name, phone, address }: CreatePatientDto) { ... }  // ✅
```

### Flujo de control

```ts
// Siempre llaves en bloques de control
if (condition) {   // ✅
  doSomething();
}
if (condition) doSomething();  // ❌

// === y !== siempre (excepción: null checks con ==)
if (value === null) { ... }   // ✅
if (value == null) { ... }    // ✅ (equivale a null || undefined)
if (value == 'text') { ... }  // ❌

// for...of para arrays
for (const patient of patients) { ... }  // ✅
for (let i = 0; i < patients.length; i++) { ... }  // solo si necesitas el índice

// Solo lanzar objetos Error
throw new Error('mensaje');       // ✅
throw 'mensaje';                  // ❌
throw { message: 'error' };      // ❌

// unknown en catch, no any
try {
  ...
} catch (e: unknown) {
  const error = e as Error;
}
```

### Arrays y objetos

```ts
// Nunca el constructor Array()
const items = [];            // ✅
const items = new Array();   // ❌

// Spread para copiar/concatenar
const copy = { ...original };      // ✅
const merged = [...arr1, ...arr2]; // ✅

// Destructuring
const { name, phone } = patient;
const [first, ...rest] = items;
```

### Comentarios y documentación

```ts
/**
 * JSDoc para símbolos públicos exportados.
 * Usar Markdown dentro del JSDoc.
 *
 * @param tenantId - El ID del tenant que hace la consulta
 */
export async function findPatients(tenantId: string): Promise<Patient[]> {}

// Comentarios de implementación con //
// Los comentarios multi-línea también usan //
// nunca usar /* */ para comentarios de implementación

// Explicar el "por qué", no el "qué"
// Usamos transacción aquí para evitar duplicados de folio en concurrencia
```

### Prohibido

- `var` — usar `const` o `let`
- `const enum` — usar `enum` regular
- `with`
- `eval` / `Function(string)`
- Wrapper objects: `new String()`, `new Boolean()`, `new Number()`
- Modificar prototipos de built-ins
- `export default`
- `export let` (exports mutables)
- `require()`

---

## Prácticas adicionales de TypeScript

### Configuración estricta (`tsconfig.json`)

El proyecto debe tener habilitadas estas opciones (ya están en `apps/api/tsconfig.json`):

```json
{
  "strict": true,
  "noImplicitReturns": true,
  "noUnusedLocals": true,
  "forceConsistentCasingInFileNames": true
}
```

`strict` activa: `noImplicitAny`, `noImplicitThis`, `alwaysStrict`, `strictNullChecks`.

### Union types sobre strings libres

Cuando un campo solo acepta valores conocidos, usar union type en lugar de `string`:

```ts
// ✅
type PaymentType = 'CASH' | 'CREDIT' | 'BENEFIT' | 'INSURANCE' | 'TRANSFER';

// ❌
const paymentType: string = 'CASH';
```

En este proyecto los enums de Prisma ya garantizan esto en la BD — aplicar el mismo criterio en DTOs y lógica de negocio.

### Usar utility types

Aprovechar los utility types de TypeScript en lugar de redefinir tipos manualmente:

```ts
// Partial para updates
type UpdatePatientDto = Partial<CreatePatientDto>;

// Readonly para datos que no deben mutar
const config: Readonly<AppConfig> = loadConfig();

// Pick / Omit para proyecciones
type PatientSummary = Pick<Patient, 'id' | 'name' | 'status'>;
type CreateUserDto = Omit<User, 'id' | 'createdAt' | 'updatedAt'>;

// Record para mapas tipados
const statusLabels: Record<PatientStatus, string> = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
  DELETED: 'Eliminado',
};
```

### Prefijos `is` / `has` para booleanos

```ts
// ✅
const isActive = user.status === 'ACTIVE';
const hasPlan = plan !== null;
const isClosed = cashClose.isClosed;

// ❌
const active = user.status === 'ACTIVE';
const plan = plan !== null;
```

### Funciones cortas y con pocos parámetros

- Una función debe hacer **una sola cosa**
- Máximo **10 líneas** — si es más larga, extraer en funciones auxiliares
- Máximo **3 parámetros** — si se necesitan más, agruparlos en un objeto/DTO

```ts
// ❌ demasiados parámetros
function createReceipt(tenantId, locationId, patientId, userId, serviceTypeId, amount, paymentType, notes) {}

// ✅ usar DTO
function createReceipt(dto: CreateReceiptDto) {}
```

### Sin flags booleanos como parámetros

Un flag booleano indica que la función hace dos cosas distintas — dividirla:

```ts
// ❌
function getPatients(includeInactive: boolean) {}

// ✅
function getActivePatients() {}
function getAllPatients() {}
```

### Evitar nesting excesivo

Usar early returns para reducir profundidad:

```ts
// ❌
function processReceipt(receipt: Receipt) {
  if (receipt) {
    if (receipt.status === 'ACTIVE') {
      if (receipt.amount > 0) {
        // lógica principal
      }
    }
  }
}

// ✅
function processReceipt(receipt: Receipt) {
  if (!receipt) return;
  if (receipt.status !== 'ACTIVE') return;
  if (receipt.amount <= 0) return;
  // lógica principal
}
```

### Sin números mágicos

```ts
// ❌
if (plan.usedSessions >= 10) { ... }
const hash = await bcrypt.hash(password, 10);

// ✅
const MAX_FREE_SESSIONS = 10;
const BCRYPT_ROUNDS = 10;
if (plan.usedSessions >= MAX_FREE_SESSIONS) { ... }
const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
```

### Funciones puras e inmutabilidad

Preferir funciones puras (sin efectos secundarios) para lógica de negocio y transformaciones:

```ts
// ✅ función pura — fácil de testear
function calculateNetTotal(cash: number, credit: number, income: number, expense: number): number {
  return cash + credit + income - expense;
}

// Nunca mutar parámetros recibidos
function addItem(items: Item[], newItem: Item): Item[] {
  return [...items, newItem];  // ✅ nuevo array
  // items.push(newItem); return items;  ❌ mutación
}
```

### Async/await sobre callbacks

```ts
// ✅
const patient = await this.prisma.patient.findUnique({ where: { id } });

// ❌
this.prisma.patient.findUnique({ where: { id } }).then((patient) => { ... });
```

### Sin imports sin usar

Eliminar cualquier import no utilizado antes de concluir un feature. El linter (`noUnusedLocals`) lo detecta — tratar estos warnings como errores.

### No confiar en datos externos

Validar siempre en la frontera del sistema (entradas HTTP, datos de migración):

```ts
// ✅ — ValidationPipe global ya cubre los DTOs de NestJS
// Adicionalmente, validar datos de fuentes externas antes de procesar
if (!isUUID(patientId)) throw new BadRequestException('ID inválido');
```

### Template literals sobre concatenación

```ts
// ✅
const folio = `${locationCode}-${year}-${sequence.toString().padStart(5, '0')}`;

// ❌
const folio = locationCode + '-' + year + '-' + sequence;
```

### Switch con default siempre

```ts
switch (appointment.status) {
  case 'SCHEDULED':
    return scheduleNotification(appointment);
  case 'COMPLETED':
    return sendSummary(appointment);
  default:
    throw new Error(`Estado inesperado: ${appointment.status}`);
}
```

---

## Cumplimiento regulatorio — México (Salud)

Renalfy almacena datos personales de salud (PHI). Las siguientes normas son de cumplimiento obligatorio en cada feature que toque datos de pacientes.

### LFPDPPP — Ley Federal de Protección de Datos Personales

- Todo paciente debe otorgar consentimiento explícito antes de que se almacene su información clínica
- El consentimiento se registra en el modelo `PatientConsent` (una fila por aviso de privacidad firmado)
- Campos obligatorios: `patientId`, `tenantId`, `consentType`, `signedAt`, `consentFileUrl` (URL al PDF del aviso firmado)
- **Nunca** se puede crear un `Appointment` o `Measurement` sin que el paciente tenga un `PatientConsent` activo (`revokedAt IS NULL`)
- El aviso de privacidad debe estar disponible en la landing page pública de cada tenant (`/{tenant}/privacidad`)
- Los pacientes tienen derecho de acceso, rectificación, cancelación y oposición (derechos ARCO) — implementar endpoint de solicitud

### NOM-004-SSA3 — Expediente clínico electrónico

- Los registros clínicos (`Measurement`, `Appointment`, `ClinicalTemplate`) son **inmutables** una vez creados
- Las correcciones se hacen mediante un nuevo registro con referencia al anterior — nunca `UPDATE` directo
- El `AuditLog` registra toda creación, modificación y acceso a expedientes clínicos
- Los registros clínicos deben conservarse mínimo **5 años** — no se borran, solo se marcan como inactivos
- Cada entrada del expediente debe conservar: quién la creó (`userId`), cuándo (`createdAt`), desde dónde (`ipAddress`)

### NOM-024-SSA3 — Sistemas de información de salud

- La información clínica solo se comparte entre profesionales de salud autorizados dentro del mismo tenant
- Los reportes exportados deben incluir marca de agua con `tenantId` y fecha de generación
- El acceso entre tenants está **prohibido** — RLS + filtros de aplicación garantizan esto

### Audit Log — inmutabilidad a nivel base de datos

El modelo `AuditLog` tiene las siguientes garantías técnicas:

```sql
-- La política RLS solo permite SELECT e INSERT para renalfy_app
-- No hay política UPDATE ni DELETE → esas operaciones son bloqueadas por PostgreSQL
-- Solo el superusuario (renalfy) puede borrar registros de auditoría
```

- `AuditLog` nunca se expone en endpoints públicos (sin controller, sin ruta HTTP)
- Los logs se consultan directamente en BD por el administrador de plataforma (`SUPER_ADMIN`)
- Campos críticos: `tenantId`, `userId`, `action`, `resource`, `resourceId`, `ipAddress`, `userAgent`, `createdAt`
- El interceptor `AuditInterceptor` es fire-and-forget — un fallo de auditoría **nunca** interrumpe la operación del usuario

### AI / PHI Zero-Data Rule

Cuando se integren funciones de IA (resumen de expedientes, sugerencias clínicas):

- **Nunca** enviar datos identificables (nombre, CURP, fecha de nacimiento) a APIs externas de IA
- Anonimizar o pseudoanonimizar antes de cualquier llamada externa: usar solo `patientId` (UUID) + datos clínicos agregados
- Toda integración con IA debe documentar explícitamente qué datos se envían y al proveedor
- Preferir modelos on-premise o con contratos DPA firmados (Data Processing Agreement) para PHI

### Seguridad de infraestructura

| Control | Requisito |
|---|---|
| Cifrado en reposo | AES-256 para volúmenes de PostgreSQL (Render Disk Encryption activado) |
| Cifrado en tránsito | TLS 1.2+ obligatorio — sin HTTP en producción |
| Backups | Diarios automáticos, retención 30 días mínimo, almacenados en región distinta |
| Secretos | Variables de entorno en Render/Vercel — nunca en el repositorio |
| Dependencias | `pnpm audit` en CI — bloquear build si hay vulnerabilidades críticas |
| Acceso BD prod | Solo mediante VPN o IP allowlist — nunca exponer puerto 5432 públicamente |

### Modelo `PatientConsent` — uso en código

```ts
// Antes de crear cualquier registro clínico, verificar consentimiento activo
const consent = await this.prisma.patientConsent.findFirst({
  where: {
    patientId,
    tenantId,
    revokedAt: null,
  },
});
if (!consent) {
  throw new ForbiddenException('El paciente no tiene consentimiento activo');
}
```

### Decorator `@Audit()` — uso en controllers

```ts
// Marcar endpoints que acceden o modifican datos clínicos sensibles
@Audit({ action: 'READ', resource: 'Patient' })
@Get(':id')
findOne(@Param('id') id: string) { ... }

@Audit({ action: 'CREATE', resource: 'Measurement' })
@Post()
create(@Body() dto: CreateMeasurementDto) { ... }
```

---

## Comandos frecuentes

```bash
# Arrancar entorno local
docker-compose up -d          # PostgreSQL en puerto 5432
pnpm dev                      # api en :4001, web en :4000

# Base de datos
cd apps/api
npx prisma migrate dev        # crear y aplicar migración
npx prisma generate           # regenerar cliente Prisma
npx prisma studio             # GUI de la BD

# Build
pnpm build                    # build completo (turbo)
pnpm lint                     # lint
pnpm check-types              # typecheck

# Instalar dependencia en un workspace específico
pnpm --filter api add <package>
pnpm --filter web add <package>
```

> **Nota sobre Node:** el proyecto usa Node 25 (`.nvmrc`). Ejecutar `nvm use` antes de correr comandos si el shell no lo activa automáticamente.

---

## Importaciones en NestJS (ESM / nodenext)

Todos los imports locales en `apps/api` deben incluir extensión `.js` aunque el archivo sea `.ts`:

```ts
// correcto
import { PrismaService } from '../prisma/prisma.service.js';

// incorrecto
import { PrismaService } from '../prisma/prisma.service';
```

---

## Sprints (referencia)

> Actualizado 2026-03-22 — Replanificado con base en análisis de migración SUTR → Renalfy.
> Documentos de migración en `/MIGRATION_ANALYSIS.md`, `/MIGRATION_EXECUTIVE_SUMMARY.md`, `/MIGRATION_QUICK_START.md`.

| Sprint | Entregable | Tipo | Estado | Dep. |
|---|---|---|---|---|
| 1 | Setup monorepo, Docker, CI/CD, ESLint/Prettier | Infra | ✅ Listo | — |
| 2 | Auth JWT + refresh, modelo base de tenants | Back | ✅ Listo | 1 |
| 3 | Locations, Users, Roles, guardias de acceso | Back | ✅ Listo | 2 |
| 4 | Landing page dinámica por tenant (branding) | Front | ✅ Listo | 3 |
| 5 | Módulo 1 — Pacientes + Tipos de servicio (backend) | Back | ✅ Listo | 3 |
| 6 | Módulo 1 — Citas/Sesiones con formulario dinámico (backend) | Back | ✅ Listo | 5 |
| 7 | Módulo 1 — Recibos (folio + flujo de estados) (backend) | Back | ✅ Listo | 6 |
| 8 | UI — Auth (login, logout, cambio de contraseña) | Front | ✅ Listo | 2 |
| 9 | UI — Settings: Locations + Users | Front | ✅ Listo | 3 |
| 10 | UI — Módulo 1: Pacientes + Tipos de servicio | Front | ✅ Listo | 5 |
| 11 | UI — Módulo 1: Recibos | Front | ✅ Listo | 7 |
| 12 | UI — Módulo 1: Citas + formulario clínico dinámico | Full | ✅ Listo | 6, 10 |
| 13 | Módulo 2 — Empresas + Planes (backend) | Back | ✅ Listo | 12 |
| 14 | UI — Módulo 2: Empresas + Planes | Front | ✅ Listo | 13 |
| 15 | Módulo 3 — Productos + Stock por sucursal (backend) | Back | Pendiente | 12 |
| 16 | UI — Módulo 3: Productos + Stock | Front | Pendiente | 15 |
| 17 | Módulo 3 — Proveedores + Órdenes de compra (backend) | Back | Pendiente | 15 |
| 18 | UI — Módulo 3: Proveedores + Órdenes de compra | Front | Pendiente | 17 |
| 19 | Módulo 3 — Compras + Movimientos de inventario (backend) | Back | Pendiente | 17 |
| 20 | UI — Módulo 3: Compras + Movimientos | Front | Pendiente | 19 |
| 21 | Módulo 4 — Ventas (backend) | Back | Pendiente | 15 |
| 22 | UI — Módulo 4: Ventas | Front | Pendiente | 21 |
| 23 | Módulo 4 — Ingresos, Egresos, Cortes de caja (backend) | Back | Pendiente | 21 |
| 24 | UI — Módulo 4: Ingresos, Egresos, Cortes de caja | Front | Pendiente | 23 |
| 25 | QA — Pruebas de sistema completo | QA | Pendiente | 24 |
| 26 | Pre-migración — Schema tweaks + script skeleton | Back | Pendiente | 25 |
| 27 | Migración — Desarrollo de script + validación muestra | Back | Pendiente | 26 |
| 28 | Migración — Validación completa + Cutover producción | Back+Ops | Pendiente | 27 |
| 29 | Post-launch — Estabilización + bug fixes | Full | Pendiente | 28 |
| 30+ | Reportes PDF/Excel, Notificaciones, Analytics, mejoras UX | Full | Pendiente | 29 |

### Camino crítico para la migración

Para poder correr el script de migración de SUTR, deben estar listos: **Sprints 12 → 24 → 25 → 26 → 27 → 28**

## Active Technologies
- TypeScript / Node.js 25 + NestJS, Prisma 7, nestjs-zod, `@repo/types` (006-appointments-dynamic-form)
- PostgreSQL 16 con RLS — modelos `Appointment`, `Measurement`, `ClinicalTemplate` ya existen (006-appointments-dynamic-form)
- TypeScript / Node.js 25 + NestJS (latest), Prisma 7, nestjs-zod, `@repo/types` (Zod schemas) (007-receipts-folio-states)
- PostgreSQL 16 with RLS — `Receipt`, `Plan`, `ReceiptFolioCounter` tables (007-receipts-folio-states)

## Recent Changes
- 006-appointments-dynamic-form: Added TypeScript / Node.js 25 + NestJS, Prisma 7, nestjs-zod, `@repo/types`
