# Renalfy — Arquitectura del Proyecto

---

## Estructura del monorepo

```
/
├── apps/
│   ├── api/          → NestJS (backend)
│   └── web/          → Next.js (frontend)
├── packages/
│   ├── types/        → @repo/types — DTOs e interfaces compartidos (Zod schemas)
│   ├── utils/        → @repo/utils — helpers compartidos
│   ├── eslint-config/ → @repo/eslint-config
│   ├── typescript-config/ → @repo/typescript-config
│   └── ui/           → @repo/ui — componentes compartidos (shadcn/ui)
├── docs/
│   ├── specs/        → especificaciones técnicas
│   ├── sprints/      → documentación de sprints
│   └── decisions/    → ADRs (Architecture Decision Records)
├── .github/workflows/ → CI/CD
├── docker-compose.yml
├── turbo.json        → configuración de Turborepo
└── package.json
```

---

## Backend — NestJS (`apps/api`)

### Estructura de módulos

```
src/
├── main.ts
│   └── bootstrap: ValidationPipe global (ZodValidationPipe), prefix "/api", CORS
├── app.module.ts
│   └── ConfigModule (global), PrismaModule, AuthModule, y módulos de negocio
├── prisma/
│   ├── prisma.service.ts  → composición sobre PrismaClient (Prisma 7)
│   ├── prisma.module.ts   → @Global()
│   └── client/            → Prisma client generado
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── dto/
│   │   └── (DTOs con createZodDto)
│   └── strategies/
│       ├── jwt.strategy.ts
│       └── jwt-refresh.strategy.ts
├── common/
│   ├── guards/
│   │   ├── JwtAuthGuard
│   │   └── JwtRefreshGuard
│   ├── decorators/
│   │   └── @CurrentUser()
│   └── interceptors/
│       ├── TenantInterceptor (RLS)
│       └── AuditInterceptor
└── [módulos de negocio]/
    ├── [modulo].module.ts
    ├── [modulo].controller.ts
    ├── [modulo].service.ts
    ├── [modulo].service.spec.ts
    ├── dto/
    │   └── (DTOs basados en @repo/types)
    └── (tests en apps/api/test/)
```

**Módulos de negocio implementados:**
- `auth` — JWT, refresh, logout, me, change password
- `users` — CRUD de usuarios con roles
- `locations` — CRUD de sucursales con RLS
- `patients` — CRUD de pacientes
- `service-types` — tipos de servicios clínicos
- `appointments` — citas/sesiones con formulario dinámico
- `receipts` — recibos con folio secuencial
- `companies` — empresas/planes de cobertura
- `plans` — planes con sesiones planificadas
- `products` — productos de inventario
- `suppliers` — proveedores
- `purchase-orders` — órdenes de compra
- `purchases` — recepción de compras + movimientos de inventario
- `sales` — ventas con deducción de stock
- `income` — registros de ingresos
- `expense` — registros de egresos
- `cash-close` — cierres de caja diarios (inmutables)

---

## Frontend — Next.js (`apps/web`)

### Estructura de rutas (App Router)

```
app/
├── (landing)/
│   └── [tenant]/
│       └── page.tsx — landing page dinámica por tenant
├── (auth)/
│   └── login/
│       └── page.tsx — formulario de login
├── middleware.ts — resolución de tenant por subdominio
└── (dashboard)/
    ├── layout.tsx — layout protegido + sidebar
    ├── patients/
    │   ├── page.tsx
    │   └── [id]/page.tsx
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

components/
├── ui/ — shadcn/ui components (no modificar directamente, extender encima)
├── forms/ — componentes de formularios reutilizables
└── [feature-specific]/

lib/
├── api.ts — cliente HTTP con manejo de errores y autenticación
├── auth.ts — manejo de JWT (access + refresh)
└── utils.ts — helpers

styles/
└── globals.css — Tailwind CSS v4 con @layer directives
```

**Convenciones:**
- **Server Components por defecto** — usar `'use client'` solo cuando sea necesario (interactividad, hooks)
- **Formularios dinámicos:** generados desde `ClinicalTemplate.fields` — sin campos hardcodeados de diálisis
- **Validación:** React Hook Form + Zod resolver usando schemas de `@repo/types`
- **shadcn/ui:** componentes en `components/ui/` — extender, no modificar

---

## Módulo 4 — Ventas, Ingresos, Egresos, Corte de Caja

### API Endpoints

#### Sales (Ventas)
```
POST   /api/sales
       └─ Crear venta (auto-genera folio LOC-YYYY-NNNNN, decrementa stock, crea InventoryMovement)
       
GET    /api/sales
       └─ Listar ventas (paginado, filtros: status/locationId/fecha)
       
GET    /api/sales/:id
       └─ Detalles de venta
       
PATCH  /api/sales/:id/finish
       └─ Marcar como FINISHED (pago confirmado)
       
PATCH  /api/sales/:id/settle
       └─ Marcar como SETTLED (reconciliado)
       
PATCH  /api/sales/:id/cancel
       └─ Cancelar venta (soft delete: status = CANCELLED, revertir stock)
```

#### Income (Ingresos)
```
POST   /api/income
       └─ Registrar ingreso (servicios, depósitos, devoluciones)
       
GET    /api/income
       └─ Listar ingresos (filtros: tipo/fecha)
       
PATCH  /api/income/:id/cancel
       └─ Cancelar ingreso (soft delete, status = CANCELLED)
```

#### Expense (Egresos)
```
POST   /api/expense
       └─ Registrar egreso (costos operacionales)
       
GET    /api/expense
       └─ Listar egresos (filtros: tipo/fecha)
       
PATCH  /api/expense/:id/cancel
       └─ Cancelar egreso
```

#### CashClose (Cierre de Caja — INMUTABLE)
```
POST   /api/cash-close
       └─ Crear cierre (transacción atómica)
          - Calcula totales de ventas/ingresos/egresos del período
          - Marca isClosed=true en todas las transacciones
          - Crea registro de CashClose con status=CLOSED
       
GET    /api/cash-close
       └─ Listar cierres (read-only, filtros: fecha/locationId)
       
GET    /api/cash-close/:id
       └─ Detalles de cierre
```

---

## Patrones arquitectónicos

### Zod + nestjs-zod (Contrato API ↔ Frontend)

Los schemas viven en `@repo/types` y son la **única fuente de verdad**:

```
packages/types/src/
├── enums.ts
├── auth.schemas.ts
├── patients.schemas.ts
├── receipts.schemas.ts
├── sales.schemas.ts
├── income.schemas.ts
├── expense.schemas.ts
├── cash-close.schemas.ts
└── index.ts — re-exporta todo
```

**Backend (NestJS):**
```ts
// 1. Schema en @repo/types
export const CreateSaleSchema = z.object({
  locationId: z.string().uuid(),
  items: z.array(z.object({ productId: z.string().uuid(), quantity: z.number().int() })),
  paymentType: z.enum(['CASH', 'CREDIT', 'BENEFIT']),
});
export type CreateSaleDto = z.infer<typeof CreateSaleSchema>;

// 2. DTO como wrapper de una línea
import { createZodDto } from 'nestjs-zod';
export class CreateSaleDto extends createZodDto(CreateSaleSchema) {}
```

**Frontend (Next.js):**
```ts
import { CreateSaleSchema } from '@repo/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const form = useForm({ resolver: zodResolver(CreateSaleSchema) });
```

### Row-Level Security (RLS)

El aislamiento de datos entre tenants ocurre en **dos capas:**

1. **Aplicación** — NestJS filtra por `tenantId` en cada query
2. **Base de datos** — PostgreSQL RLS bloquea acceso sin el tenant correcto

**Flujo:**
```
Request HTTP
  → JwtAuthGuard     (extrae tenantId del JWT)
  → TenantInterceptor (set_config('app.current_tenant_id', tenantId))
  → PostgreSQL RLS   (aplica WHERE "tenantId" = current_tenant_id())
  → Servicio         (ejecuta query normalmente)
  → TenantInterceptor (limpia set_config)
```

---

## Shared Types (`@repo/types`)

Todos los DTOs, schemas y tipos compartidos viven aquí. Es la **única fuente de verdad** para validación y tipos en el monorepo.

Cada nuevo módulo debe crear su archivo de schemas:
```
packages/types/src/
├── <module>.schemas.ts     (Zod schemas)
└── <module>.types.ts       (tipos TypeScript adicionales si es necesario)
```
