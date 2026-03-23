# SPRINT 14: UI — Módulo 2 (Empresas + Planes)

**Estado:** Pendiente
**Dependencias:** Sprint 13 (backend de Empresas + Planes completado)
**Inicio estimado:** 2026-03-24
**Duración:** ~8–10 días de desarrollo
**Entregables:** Implementación completa del UI para gestión de empresas y planes de tratamiento

---

## Objetivo

Implementar la interfaz de usuario (Next.js + TypeScript + TDD) para el Módulo 2 (Empresas y Planes), que ya tiene backend completamente funcional desde Sprint 13. El objetivo es permitir que OWNER/ADMIN gestionen empresas y todos los roles vean/administren planes de tratamiento según sus permisos.

**Impacto de negocio:** Completa la cadena de configuración de planes de beneficiarios, habilitando clínicas para facturación mediante empresas aseguradoras.

---

## Alcance

### Incluido ✅
- **Pantalla de lista de empresas** — tabla con búsqueda, paginación, acciones CRUD
- **Drawer de creación/edición de empresas** — formulario completo con validación Zod
- **Pantalla de lista de planes** — tabla con filtros (status, empresa), paginación
- **Drawer de creación/edición de planes** — formulario completo con dropdowns de pacientes/empresas/servicios
- **Componentes reutilizables:** badges de estado, progress bars de sesiones
- **Tests unitarios** de componentes y formularios (Vitest + RTL)
- **Tests E2E** de flujos principales (crear empresa, crear plan, editar plan)
- **Server actions** para todas las operaciones CRUD
- **Integración RLS:** MANAGER/STAFF ven solo planes de su sucursal
- **Diseño:** alineado a "Clinical Curator" — tablas sin bordes 1px, separación por background

### Excluido ❌
- Reporte de empresas/planes
- Exportación a Excel/PDF
- Notificaciones en tiempo real
- Validación de empresas activas (RFC/validación RENAPO)
- Historial de cambios de estado en planes
- API de borrado lógico (soft delete) — usar borrado duro via DELETE HTTP

---

## Pantallas a implementar

### 1. **Company List** — `/companies`
**Descripción:** Lista pagina de empresas con búsqueda y acciones.

**Mockup Stitch:**
- [Company List Screen](https://stitch.anthropic.com/projects/14996019202291546385/screens/PENDING)

**Columnas de la tabla:**
- **Empresa** — nombre de la empresa (clickeable → detalle)
- **RFC** — Tax ID (gris si vacío)
- **Contacto** — nombre del contacto principal
- **Teléfono** — número de teléfono
- **Planes** — badge con cantidad de planes activos

**Acciones por fila:**
- Ver (link a `/companies/:id` si se implementa detalle)
- Editar (abre drawer)
- Eliminar (confirmación → llamada DELETE)

**Filtros/búsqueda:**
- Búsqueda por nombre (query param `search`)
- Paginación (query param `page`)

**Usuarios que ven:** Solo OWNER y ADMIN.

---

### 2. **New/Edit Company Drawer** — `<CompanyDrawer />`
**Descripción:** Slide-out panel (ancho 480px) para crear/editar empresa.

**Mockup Stitch:**
- [New Company Drawer](https://stitch.anthropic.com/projects/14996019202291546385/screens/837e7b282b7f4d5e9266677e18caf4eb)

**Campos del formulario:**
```
1. Nombre de Empresa (required, min 1)
2. RFC / TAX ID (optional, string)
3. Contacto (optional, string)
4. Teléfono (optional, string)
5. Email (optional, email)
6. Dirección (optional, textarea)
7. Notas (optional, textarea)
```

**Validación:**
- Usa `CreateCompanySchema` y `UpdateCompanySchema` de `@repo/types`
- React Hook Form + Zod resolver
- Mostrar errores inline bajo cada campo

**Botones:**
- **Cancelar** — cierra drawer, descarta cambios
- **Crear Empresa** / **Guardar Cambios** — POST/PATCH, desactiva si faltan required fields

**Comportamiento:**
- Al abrir en modo "create": todos los campos vacíos
- Al abrir en modo "edit": pre-fill datos de la empresa
- Al guardar: revalidate lista de empresas, cierra drawer automáticamente

---

### 3. **Plan List** — `/plans`
**Descripción:** Lista pagina de planes con filtros y búsqueda.

**Mockup Stitch:**
- [Plan List Screen](https://stitch.anthropic.com/projects/14996019202291546385/screens/PENDING)

**Columnas de la tabla:**
- **Paciente** — nombre del paciente (link a `/patients/:patientId` si existe)
- **Empresa** — nombre de la empresa (gris si no tiene)
- **Tipo de Servicio** — tipo de servicio (ej: "Hemodiálisis")
- **Sesiones** — progress bar: "8 / 12" (usado / planeado)
- **Monto** — cantidad en pesos con formato "$ 15,000.00"
- **Estado** — badge con estado (ACTIVE=teal, INACTIVE=gris, EXHAUSTED=amber)

**Acciones por fila:**
- Ver (link a `/plans/:id` si se implementa detalle)
- Editar (abre drawer)
- Eliminar (si status !== EXHAUSTED; confirmación antes)

**Filtros:**
- **Búsqueda por paciente** — query param `search`
- **Status** — dropdown (Todos | ACTIVE | INACTIVE | EXHAUSTED), query param `status`
- **Empresa** — dropdown (Todas | lista de empresas), query param `companyId`
- **Botón "Limpiar filtros"** — resetea todos los params a valores por defecto

**Paginación:**
- Query param `page`, limit fijo 20

**Control de acceso:**
- OWNER/ADMIN ven todos los planes de su tenant
- MANAGER/STAFF ven solo planes donde `locationId === userLocationId`
- La restricción se aplica en el backend; el frontend verá solo lo que el backend devuelve

**Usuarios que ven:** Todos los roles (OWNER, ADMIN, MANAGER, STAFF).

---

### 4. **New/Edit Plan Drawer** — `<PlanDrawer />`
**Descripción:** Slide-out panel (ancho 480px) para crear/editar plan.

**Mockup Stitch:**
- [New Plan Drawer](https://stitch.anthropic.com/projects/14996019202291546385/screens/PENDING)

**Campos del formulario:**
```
1. Paciente (required) — dropdown/autocomplete
   - Poblado via apiFetch a /patients?limit=1000
   - Mostrar "Nombre (ID paciente)" en opción

2. Sucursal (required si OWNER/ADMIN, read-only si MANAGER/STAFF)
   - Dropdown con locations
   - MANAGER/STAFF: pre-fill con su locationId, no editable

3. Empresa (optional) — dropdown
   - Mostrar lista de empresas disponibles
   - Primera opción: "Sin empresa"

4. Tipo de Servicio (optional) — dropdown
   - Poblado via apiFetch a /service-types
   - Primera opción: "Sin tipo de servicio específico"

5. Fecha de Inicio (required) — date picker
   - Formato: YYYY-MM-DD
   - Default: today

6. Sesiones Planeadas (required) — number input
   - Min: 1
   - Step: 1

7. Monto (required) — currency input
   - Formato: validar como "^\d+(\.\d{1,2})?$"
   - Mostrar como "$ X,XXX.00" en input

8. Notas (optional) — textarea
```

**Validación:**
- Usa `CreatePlanSchema` y `UpdatePlanSchema` de `@repo/types`
- React Hook Form + Zod resolver
- Errores inline bajo cada campo

**Botones:**
- **Cancelar** — cierra, descarta cambios
- **Crear Plan** / **Guardar Cambios** — POST/PATCH, desactiva si faltan required fields

**Comportamiento en edición:**
- **Read-only:** `usedSessions`, `patientId`, `status` (se editan por operaciones separadas, no en este form)
- Editable: empresa, servicio, monto, notas, fechas
- El endpoint PATCH acepta `UpdatePlanSchema` que excluye estos campos

---

## Estructura de archivos

```
apps/web/
├── app/actions/
│   ├── companies.ts         (NEW) — server actions CRUD
│   └── plans.ts             (NEW) — server actions CRUD
│
├── app/tenants/[slug]/(dashboard)/
│   │
│   ├── companies/           (NEW)
│   │   ├── page.tsx         — Server Component wrapper
│   │   ├── companies-page-client.tsx — Client Component (lista + lógica)
│   │   ├── company-drawer.tsx — Drawer para create/edit
│   │   ├── company-form.tsx — Formulario reutilizable
│   │   ├── company-status-badge.tsx — (opcional si hay estados)
│   │   │
│   │   ├── companies-page-client.test.tsx
│   │   ├── company-drawer.test.tsx
│   │   ├── company-form.test.tsx
│   │   │
│   │   └── [id]/            (OPCIONAL en Sprint 14 — si tiempo lo permite)
│   │       ├── page.tsx
│   │       └── company-detail-client.tsx
│   │
│   └── plans/               (NEW)
│       ├── page.tsx         — Server Component wrapper
│       ├── plans-page-client.tsx — Client Component (lista + lógica)
│       ├── plan-drawer.tsx  — Drawer para create/edit
│       ├── plan-form.tsx    — Formulario reutilizable
│       ├── plan-status-badge.tsx — Badge de estado (ACTIVE/INACTIVE/EXHAUSTED)
│       ├── plan-progress-bar.tsx — Progress bar sesiones
│       │
│       ├── plans-page-client.test.tsx
│       ├── plan-drawer.test.tsx
│       ├── plan-form.test.tsx
│       │
│       └── [id]/            (OPCIONAL en Sprint 14 — si tiempo lo permite)
│           ├── page.tsx
│           └── plan-detail-client.tsx

lib/
├── constants/               (NEW o ampliar)
│   └── plan-constants.ts    — PLAN_STATUSES, STATUS_LABELS, etc.
│
└── utils/                   (NEW o ampliar)
    └── plan-utils.ts        — formatters, helpers para planes
```

---

## Server Actions

### `apps/web/app/actions/companies.ts`

```typescript
'use server';

// fetchCompaniesAction(query) → PaginatedCompaniesResponse
// fetchCompanyAction(id) → CompanyResponse
// createCompanyAction(prev, formData) → ActionState
// updateCompanyAction(prev, formData) → ActionState
// deleteCompanyAction(id) → ActionState

// Implementación similar a patients.ts:
// - Usa apiFetch("/companies" | "/companies/:id")
// - Validación con Zod schemas de @repo/types
// - revalidatePath('/companies') después de mutaciones
```

### `apps/web/app/actions/plans.ts`

```typescript
'use server';

// fetchPlansAction(query) → PaginatedPlansResponse
// fetchPlanAction(id) → PlanResponse
// createPlanAction(prev, formData) → ActionState
// updatePlanAction(prev, formData) → ActionState
// deletePlanAction(id) → ActionState

// fetchPatientsForSelectAction() → { id, name }[] — para dropdown
// fetchCompaniesForSelectAction() → { id, name }[] — para dropdown
// fetchServiceTypesForSelectAction() → { id, name }[] — para dropdown
// fetchLocationsForSelectAction() → { id, name }[] — para dropdown (solo si OWNER/ADMIN)

// Notas:
// - En createPlanAction: si user es MANAGER/STAFF, auto-fill locationId desde sesión
// - En updatePlanAction: validar que patientId no cambie, usedSessions sea read-only
```

---

## Componentes principales

### `CompanyPageClient`
**Props:**
```typescript
interface CompanyPageClientProps {
  companies: PaginatedCompaniesResponse;
  userRole: UserRole;
}
```

**Estado:**
- `drawerOpen` (boolean)
- `selectedCompany` (CompanyResponse | null)
- `searchValue` (string)
- `isPending` (useTransition)

**Comportamiento:**
- Tabla de empresas con búsqueda y paginación
- Click en "Nueva Empresa" → abre drawer con `selectedCompany = null`
- Click en "Editar" → abre drawer con empresa pre-filled
- Click en "Eliminar" → modal de confirmación → apiFetch DELETE

---

### `CompanyDrawer`
**Props:**
```typescript
interface CompanyDrawerProps {
  open: boolean;
  company: CompanyResponse | null;
  onClose: () => void;
  onSuccess: () => void; // redirige a companies, revalidate path
}
```

**Lógica:**
- Si `company === null` → modo "create", usa `createCompanyAction`
- Si `company !== null` → modo "edit", usa `updateCompanyAction`
- onSubmit: llamar action, si error mostrar toast, si éxito ejecutar `onSuccess()`

---

### `PlanPageClient`
**Props:**
```typescript
interface PlanPageClientProps {
  plans: PaginatedPlansResponse;
  userRole: UserRole;
  userLocationId: string | null;
  // pre-fetched para los dropdowns del drawer
  patients: { id: string; name: string }[];
  companies: { id: string; name: string }[];
  serviceTypes: { id: string; name: string }[];
  locations?: LocationResponse[];
}
```

**Estado:**
- `drawerOpen` (boolean)
- `selectedPlan` (PlanResponse | null)
- Filtros: `statusFilter`, `companyFilter`, `searchValue`
- `isPending` (useTransition)

**Comportamiento:**
- Tabla de planes con filtros y búsqueda
- Usar `router.push()` para actualizar query params
- Click en "Nuevo Plan" → drawer con `selectedPlan = null`
- Click en "Editar" → drawer con plan pre-filled

---

### `PlanDrawer`
**Props:**
```typescript
interface PlanDrawerProps {
  open: boolean;
  plan: PlanResponse | null;
  onClose: () => void;
  onSuccess: () => void;
  patients: { id: string; name: string }[];
  companies: { id: string; name: string }[];
  serviceTypes: { id: string; name: string }[];
  locations?: LocationResponse[];
  userRole: UserRole;
  userLocationId: string | null;
}
```

**Lógica:**
- Modo create / edit (similar a CompanyDrawer)
- En modo edit: deshabilitar `patientId` (read-only)
- Si MANAGER/STAFF: `locationId` debe ser read-only, pre-filled con `userLocationId`

---

### `PlanStatusBadge` y `PlanProgressBar`
**Para reutilizar en la tabla de planes:**
- `PlanStatusBadge` — muestra estado con color
- `PlanProgressBar` — barra visual con "X / Y" sesiones

---

## Flujos de usuario

### Flujo 1: Crear empresa
```
1. Usuario (OWNER/ADMIN) entra a /companies
2. Click "Nueva Empresa" → CompanyDrawer abre
3. Rellena: Nombre, RFC, Contacto, Teléfono, Email, Dirección
4. Click "Crear Empresa" → createCompanyAction
   - Valida con CreateCompanySchema
   - POST /api/companies
   - Revalidate /companies
   - Cierra drawer, recarga tabla
5. Toast: "Empresa creada exitosamente"
```

### Flujo 2: Editar empresa
```
1. Usuario ve tabla de empresas
2. Click "Editar" en una fila → CompanyDrawer abre con datos pre-filled
3. Modifica campos deseados
4. Click "Guardar Cambios" → updateCompanyAction
   - Valida con UpdateCompanySchema
   - PATCH /api/companies/:id
   - Revalidate /companies
5. Cierra drawer, tabla se actualiza
```

### Flujo 3: Crear plan
```
1. Usuario entra a /plans (cualquier rol)
2. Click "Nuevo Plan" → PlanDrawer abre
3. Select: Paciente → Sucursal (si OWNER/ADMIN)
4. Opcionales: Empresa, Tipo de Servicio
5. Llena: Fecha Inicio, Sesiones Planeadas, Monto
6. Opcional: Notas
7. Click "Crear Plan" → createPlanAction
   - Si MANAGER/STAFF: auto-llena locationId desde sesión
   - Valida CreatePlanSchema
   - POST /api/plans
   - Revalidate /plans
8. Toast: "Plan creado exitosamente"
```

### Flujo 4: Editar plan (con restricciones)
```
1. Usuario ve tabla de planes (respeta filtro locationId si MANAGER/STAFF)
2. Click "Editar" → PlanDrawer abre
3. NO PUEDE cambiar: Paciente, usedSessions, status
4. PUEDE cambiar: Empresa, Servicio, Monto, Notas, Fechas
5. Click "Guardar Cambios" → updatePlanAction
   - Valida con UpdatePlanSchema (exluye patientId, usedSessions)
   - PATCH /api/plans/:id
   - Revalidate /plans
```

### Flujo 5: Filtrar planes
```
1. Usuario en /plans
2. Selecciona: Status (ACTIVE) → router.push("?status=ACTIVE&page=1")
3. Selecciona: Empresa (SVP) → router.push("?status=ACTIVE&companyId=uuid&page=1")
4. Escribe búsqueda "Juan" → debounce 300ms → router.push("?search=Juan&page=1")
5. Click "Limpiar" → router.push("/plans")
```

---

## Plan de pruebas (TDD)

### Unit Tests

#### `company-form.test.tsx`
```
describe('CompanyForm', () => {
  it('should render all required fields')
  it('should show validation error when name is empty')
  it('should show validation error when email format is invalid')
  it('should disable submit button if required fields are empty')
  it('should call onSubmit with validated data on submit')
  it('should pre-fill form with company data in edit mode')
  it('should show "Crear Empresa" in create mode')
  it('should show "Guardar Cambios" in edit mode')
})
```

#### `plan-form.test.tsx`
```
describe('PlanForm', () => {
  it('should render all required and optional fields')
  it('should show validation error when patient is not selected')
  it('should show validation error when planned sessions < 1')
  it('should validate monto format (decimals max 2)')
  it('should disable patientId field in edit mode')
  it('should disable locationId field when user is MANAGER')
  it('should disable submit button if required fields are empty')
  it('should call onSubmit with validated data')
})
```

#### `companies-page-client.test.tsx`
```
describe('CompaniesPageClient', () => {
  it('should render table with company data')
  it('should open CompanyDrawer on "Nueva Empresa" click')
  it('should open CompanyDrawer in edit mode on "Editar" click')
  it('should filter companies by search term')
  it('should paginate to next page')
  it('should call deleteCompanyAction and revalidate on delete confirm')
  it('should show "No data" when list is empty')
  it('should only show if userRole is OWNER or ADMIN')
})
```

#### `plans-page-client.test.tsx`
```
describe('PlansPageClient', () => {
  it('should render table with plan data')
  it('should filter plans by status')
  it('should filter plans by company')
  it('should search plans by patient name (debounced)')
  it('should open PlanDrawer on "Nuevo Plan" click')
  it('should open PlanDrawer in edit mode on "Editar" click')
  it('should paginate to next page')
  it('should show correct progress bar: "8 / 12"')
  it('should display status badge with correct color (ACTIVE=teal, etc.)')
  it('should call deletePlanAction and revalidate on delete confirm')
  it('should restrict MANAGER/STAFF to their locationId plans')
})
```

### E2E Tests

#### `apps/api/test/companies-plans.e2e-spec.ts` (expansión existente si aplica)
```
describe('Companies + Plans E2E', () => {
  describe('Companies CRUD', () => {
    it('should create a company (POST /api/companies)')
    it('should list companies with pagination (GET /api/companies?page=1)')
    it('should update a company (PATCH /api/companies/:id)')
    it('should delete a company (DELETE /api/companies/:id)')
  })

  describe('Plans CRUD', () => {
    it('should create a plan (POST /api/plans)')
    it('should list plans filtered by status (GET /api/plans?status=ACTIVE)')
    it('should list plans filtered by company (GET /api/plans?companyId=uuid)')
    it('should update a plan without changing patientId')
    it('should delete a plan (DELETE /api/plans/:id)')
  })

  describe('RLS - Plans by location', () => {
    it('MANAGER should see only plans from their locationId')
    it('STAFF should see only plans from their locationId')
    it('OWNER should see all plans')
  })
})
```

---

## Orden de implementación (Fases)

### **Fase 1: Setup + Server Actions** (1–2 días)
1. Crear `apps/web/app/actions/companies.ts` con funciones CRUD
2. Crear `apps/web/app/actions/plans.ts` con funciones CRUD
3. Crear rutas de carpetas: `/companies`, `/plans`
4. Crear `page.tsx` (server wrappers) para ambas secciones
5. **Tests:** Unit tests de acciones (mock apiFetch)

### **Fase 2: Companies UI** (2–3 días)
1. Crear `company-form.tsx` con React Hook Form + Zod
2. Crear `company-drawer.tsx` — wrapper del form
3. Crear `companies-page-client.tsx` — tabla + lógica
4. Crear `page.tsx` (server) — fetch data, pasa a client
5. Crear componentes de soporte: badges, etc.
6. **Tests:** Tests unitarios y de componentes

### **Fase 3: Plans UI** (3–4 días)
1. Crear `plan-form.tsx` con dropdowns (patients, companies, service-types, locations)
2. Crear `plan-drawer.tsx` — wrapper del form
3. Crear `plan-status-badge.tsx` y `plan-progress-bar.tsx`
4. Crear `plans-page-client.tsx` — tabla + filtros + búsqueda
5. Crear `page.tsx` (server) — fetch data, pre-fetches para dropdowns
6. **Tests:** Tests unitarios y de componentes

### **Fase 4: Integración + Polish** (1–2 días)
1. Revisar navegación (links en nav, breadcrumbs)
2. Validar RLS en frontend (solo mostrar si user tiene acceso)
3. Testear E2E completo (crear empresa → crear plan con esa empresa)
4. Error handling: toast notifications en mutaciones
5. Loading states: spinners en buttons, skeleton loaders
6. Validar que `pnpm lint` y `pnpm check-types` pasen
7. **Tests:** Tests E2E de flujos completos

---

## Criterios de aceptación

### Empresas
- [ ] Tabla de empresas con columnas: Empresa, RFC, Contacto, Teléfono, Planes
- [ ] Búsqueda por nombre (query param `search`)
- [ ] Paginación (query param `page`)
- [ ] Botón "Nueva Empresa" abre drawer
- [ ] Drawer: crear empresa con validación
- [ ] Drawer: editar empresa con pre-fill
- [ ] Botón "Editar" abre drawer en modo edición
- [ ] Botón "Eliminar" pide confirmación, llama DELETE
- [ ] Visible solo para OWNER/ADMIN
- [ ] `pnpm lint`, `pnpm check-types`, `pnpm test` pasan

### Planes
- [ ] Tabla de planes: Paciente, Empresa, Tipo Servicio, Sesiones (progress bar), Monto, Estado
- [ ] Filtro por Status (ACTIVE/INACTIVE/EXHAUSTED)
- [ ] Filtro por Empresa
- [ ] Búsqueda por paciente (debounced)
- [ ] Paginación
- [ ] Botón "Nuevo Plan" abre drawer
- [ ] Drawer: crear plan con validación, auto-fill locationId si MANAGER/STAFF
- [ ] Drawer: editar plan (patientId, usedSessions read-only)
- [ ] Progreso de sesiones se muestra correctamente
- [ ] Estados mostrados con colores apropiados (ACTIVE=teal, INACTIVE=gris, EXHAUSTED=amber)
- [ ] MANAGER/STAFF ven solo planes de su sucursal
- [ ] Botón "Eliminar" pide confirmación
- [ ] `pnpm lint`, `pnpm check-types`, `pnpm test` pasan

### Integración
- [ ] Navegación desde dashboard a /companies y /plans
- [ ] Links en nav o sidebar actualizados
- [ ] Transiciones suaves (no refresh completo de página)
- [ ] Error handling: toast notifications
- [ ] Loading states en botones de submit

---

## Decisiones de diseño

### 1. **Sin detalle de empresa/plan** (por ahora)
Las pantallas de detalle individual (`/companies/:id`, `/plans/:id`) se dejan para un sprint futuro. Por ahora, toda interacción ocurre en la tabla + drawer.

**Justificación:** Reduce scope de Sprint 14, permite entrega rápida del CRUD core.

### 2. **Dropdown infinito vs. paginado**
Para dropdowns de pacientes/empresas/servicios, usar `limit=1000` en lugar de search/paginación.

**Justificación:** La mayoría de clínicas tendrán < 1000 items. Si crecen, optimizar en Sprint futuro con autocomplete + virtualization.

### 3. **Edición limitada de planes**
En edición, los campos `patientId`, `usedSessions`, `status` son read-only.

**Justificación:** Estos se actualizan por operaciones separadas (crear cita = incrementar sesiones; transición de estado vía endpoint separado).

### 4. **Control de acceso en el frontend**
El nav/sidebar no mostrará "Empresas" para MANAGER/STAFF (solo visible para OWNER/ADMIN).

**Justificación:** Refleja realidad de permisos en backend; mejora UX.

---

## Risk & Mitigación

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|------------|--------|-----------|
| Dropdown de pacientes muy lento (>1000) | Media | Baja | Usar autocomplete + debounce; agregar búsqueda |
| RLS no se aplica correctamente en frontend | Baja | Alta | Testear exhaustivamente con MANAGER/STAFF; verificar solo ven su locationId |
| Validación Zod inconsistente con backend | Baja | Media | Usar schemas de `@repo/types` (single source of truth) |
| Tests flaky (async, network) | Media | Baja | Mock apiFetch; usar `waitFor`; fixture data |
| Performance de tablas con 100+ filas | Baja | Media | Lazy load; virtualization en Sprint futuro |

---

## Mockups Stitch

Las siguientes pantallas fueron generadas en Stitch y están disponibles en el proyecto:

| Pantalla | ID | Estado |
|----------|-----|--------|
| **Company List** | [ID PENDING] | ✅ Generada |
| **New Company Drawer** | `837e7b282b7f4d5e9266677e18caf4eb` | ✅ Generada |
| **Plan List** | [ID PENDING] | ✅ Generada |
| **New Plan Drawer** | [ID PENDING] | ✅ Generada |

**Acceso:** https://www.anthropic-stitch.com/projects/14996019202291546385

Todas las pantallas siguen el design system **"The Clinical Curator":**
- Primary color: `#00647c` (deep teal)
- No-line rule: sin bordes 1px, separación por background color
- Tipografía: Manrope (headlines), Inter (body/labels)
- Radius: `rounded-md` (0.75rem) en inputs, `rounded-lg` (1rem) en botones

---

## Dependencias de librerías (ya presentes)

- `react-hook-form` — formularios
- `@hookform/resolvers` — integración Zod
- `zod` — validación y tipos
- `@repo/types` — schemas compartidos
- `shadcn/ui` — componentes base (Button, Input, Dialog, Table, etc.)
- `vitest` — tests unitarios
- `@testing-library/react` — testing de componentes
- `next/navigation` — router, params

---

## Post-Sprint 14 (Future work)

- **Sprint 15:** Inventario (Productos, Stock)
- **Sprint 16:** Proveedores + Órdenes de Compra
- Detalle de empresa/plan (si requerido)
- Reportes de empresas/planes
- Historial de cambios de estado
- Notificaciones cuando plan se agota

---

## Checklist Final (antes de mergear)

- [ ] Todas las historias de usuario completadas
- [ ] Todos los criterios de aceptación checked
- [ ] `pnpm lint` sin errores
- [ ] `pnpm check-types` sin errores
- [ ] `pnpm test` 100% en verde
- [ ] E2E tests ejecutados manualmente
- [ ] Code review aprobado
- [ ] Mockups de Stitch alineados con implementación
- [ ] Documentación de code actualizada (si aplica)
- [ ] PR creado contra `main` con descripción clara

---

**Propietario del Sprint:** Alejandro Prado (Arquitecto)
**Última actualización:** 2026-03-23
**Versión:** 1.0
