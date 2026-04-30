# TypeScript — Style Guide Completo

Referencia exhaustiva basada en Google TypeScript Style Guide: https://google.github.io/styleguide/tsguide.html

---

## Nomenclatura

| Construcción | Estilo |
|---|---|
| Clases, interfaces, tipos, enums, decoradores | `UpperCamelCase` |
| Variables, parámetros, funciones, métodos, propiedades | `lowerCamelCase` |
| Constantes globales y valores de enum | `CONSTANT_CASE` |

**Reglas adicionales:**
- Tratar acrónimos como palabras completas: `loadHttpUrl` no `loadHTTPURL`
- Sin guiones bajos al inicio o final: nunca `_foo` ni `foo_`
- Sin prefijo `$` salvo para Observables (rxjs)
- Abreviaciones solo si son universalmente conocidas (URL, DNS, HTTP)
- Variables de una sola letra solo en scopes de menos de 10 líneas

---

## Imports y exports

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

**Reglas:**
- Solo `export` lo que se use externamente
- Nunca `export let` (exports mutables prohibidos)
- Preferir imports relativos (`./foo`) dentro del mismo proyecto

---

## Sistema de tipos

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

**Reglas críticas:**
- **Nunca `any`** — está configurado como `error` en ESLint
- Usar `unknown` y narrowing explícito cuando el tipo es desconocido
- Nunca `@ts-ignore` — usar aserciones de tipo o `unknown`
- Solo `@ts-expect-error` en tests, con comentario explicando por qué
- Para tipos de terceros demasiado estrictos, importar el tipo correcto (ej: `ms.StringValue` para JWT `expiresIn`)

---

## Clases

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

**Convenciones:**
- Sin semicolon al final de declaraciones de clase
- Un blank line entre métodos
- `new Foo()` siempre con paréntesis
- Sin métodos estáticos privados — usar funciones a nivel de módulo

---

## Funciones

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

**Reglas de diseño:**
- Una función debe hacer **una sola cosa**
- Máximo **10 líneas** — si es más larga, extraer en funciones auxiliares
- Máximo **3 parámetros** — si se necesitan más, agruparlos en un objeto/DTO
- No usar flags booleanos como parámetros: dividir en funciones distintas

```ts
// ❌ flag booleano — hace dos cosas
function getPatients(includeInactive: boolean) {}

// ✅ funciones separadas
function getActivePatients() {}
function getAllPatients() {}
```

---

## Flujo de control

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

**Early returns para reducir nesting:**
```ts
// ❌ nesting excesivo
function processReceipt(receipt: Receipt) {
  if (receipt) {
    if (receipt.status === 'ACTIVE') {
      if (receipt.amount > 0) {
        // lógica principal
      }
    }
  }
}

// ✅ early returns
function processReceipt(receipt: Receipt) {
  if (!receipt) return;
  if (receipt.status !== 'ACTIVE') return;
  if (receipt.amount <= 0) return;
  // lógica principal
}
```

---

## Arrays y objetos

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

---

## Comentarios y documentación

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

---

## Prohibido

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

## Prácticas avanzadas

### Configuración estricta (`tsconfig.json`)

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

```ts
// ✅
type PaymentType = 'CASH' | 'CREDIT' | 'BENEFIT' | 'INSURANCE' | 'TRANSFER';

// ❌
const paymentType: string = 'CASH';
```

### Utility types

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

## Typing de Prisma queries

**Evitar `error` type en resultados de Prisma.** Los values sin tipar van a mostrar `error` en eslint.

```ts
// ❌ — TypeScript no puede inferir el return type de findUniqueOrThrow
const purchaseOrder = await this.prisma.purchaseOrder.findUniqueOrThrow({ where: { id } });

// ✅ — Importar tipos de Prisma y usarlos explícitamente
import type { PurchaseOrder, Location } from '../../generated/prisma/client.js';

const purchaseOrder: PurchaseOrder = await this.prisma.purchaseOrder.findUniqueOrThrow({ 
  where: { id } 
});
const location: Location | null = await this.prisma.location.findUnique({ where: { id } });
```

**Para queries complejas con `Promise.all()`:** usar type assertions en el resultado:

```ts
// ❌ — data y total se ven como 'error' type
const [data, total] = await Promise.all([
  this.prisma.inventoryMovement.findMany({ ... }),
  this.prisma.inventoryMovement.count({ where }),
]);

// ✅ — Type assertion en todo el resultado
const [data, total] = (await Promise.all([
  this.prisma.inventoryMovement.findMany({ ... }),
  this.prisma.inventoryMovement.count({ where }),
])) as [Array<InventoryMovement & { items: Array<{ id: string }> }>, number];
```

---

## Typing en tests

**Tests unitarios:** Los mocks deben ser tipados para evitar `any`:

```ts
// ❌ — sin tipos
function deepMerge(target, source) { 
  const result = { ...target };
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

// ✅ — con Record<string, unknown>
function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...target };
  for (const key in source) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key])
    ) {
      result[key] = deepMerge(
        result[key] as Record<string, unknown> || {},
        source[key] as Record<string, unknown>
      );
    } else {
      result[key] = source[key];
    }
  }
  return result;
}
```

**E2E tests con supertest:** Los tipos de `request()` no están completamente inferidos. Es normal que pasen algunos `no-unsafe-*` errors aquí — priorizamos tests funcionales sobre typing perfecto en scaffolding estructural:

```ts
// E2E tests usan request() sin tipos perfectos
const res = await request(app.getHttpServer())
  .post('/api/purchases')
  .set('Authorization', `Bearer ${token}`)
  .send(dto);

// Acceso a propiedades — algunos errores son OK en E2E tests estructurales
expect(res.status).toBe(201); // Puede mostrar no-unsafe-member-access
```

**Regla:** En código de producción, tipos explícitos. En tests, se permite mayor leniencia con `any` si es necesario para mocks complejos, pero siempre documentar por qué.
