# Plan de implementación: Sprint 10 — UI Pacientes + Tipos de Servicio

**Feature Branch**: `010-patients-service-types-ui`
**Fecha**: 2026-03-21
**Prerequisitos verificados**: Schemas en `@repo/types`, backend patients + service-types completos, dashboard layout con sidebar de settings existente.

---

## Hallazgos del análisis de consistencia

Antes de implementar la UI, se identificaron 5 brechas entre el spec y el estado actual del backend/frontend que deben resolverse en las primeras fases:

| # | Brecha | Impacto | Resolución |
|---|--------|---------|------------|
| 1 | `PatientResponse` solo tiene `hasConsent: boolean`, pero FR-010c pide mostrar tipo, versión y fecha de firma del consentimiento | Página de detalle no puede mostrar datos de consentimiento | Agregar campo opcional `consent` al `PatientResponseSchema` y al `findOne` del backend |
| 2 | `PatientResponse` tiene `locationId` (UUID) pero FR-004 pide mostrar nombre de sucursal en la tabla | La tabla mostraría un UUID en lugar del nombre | Agregar `locationName` al `PatientResponseSchema` y hacer join en el backend |
| 3 | `ServiceTypesService.findAll` filtra `status: 'ACTIVE'` — no devuelve inactivos | FR-016 requiere ver y reactivar tipos inactivos | Agregar query param `include` al `findAll` para devolver todos |
| 4 | `UpdateServiceTypeSchema` no incluye `status` — no hay forma de reactivar un tipo | FR-016 requiere toggle Activo/Inactivo | Agregar `status` al `UpdateServiceTypeSchema` |
| 5 | `SessionUser` en frontend no extrae `locationId` del JWT | FR-007 necesita saber si el usuario es MANAGER/STAFF para ocultar selector de sucursal y auto-asignar `locationId` | Agregar `locationId` a `SessionUser` |

> **Nota sobre ordenamiento**: El spec (US1-SC1) dice "ordenada por nombre" pero el backend ordena por `createdAt: 'desc'`. No se modifica en este sprint — se mantiene `createdAt: 'desc'` como comportamiento actual. Si el PO lo prioriza, se agrega un query param `sortBy` en un sprint posterior.

---

## Fases de implementación

### Fase 0 — Ajustes de backend y schemas (prerequisitos) — COMPLETA ✅

> **Completada el 2026-03-21.** Todos los cambios de schemas y backend fueron implementados en una sesión anterior. Verificado contra el código actual:
>
> - **0.1** `SessionUser` ya incluye `locationId: string | null` (`apps/web/lib/session.ts`). Tests en `session.test.ts`.
> - **0.2** `PatientResponseSchema` ya incluye `locationName` y `consent` nullable (`packages/types/src/patients.schemas.ts`).
> - **0.3** Backend `patients.service.ts` ya hace join de location y consent.
> - **0.4** `ServiceTypeQuerySchema` con `include: z.enum(['all'])` ya existe. DTO, controller y service actualizados.
> - **0.5** `UpdateServiceTypeSchema` ya incluye `status: ServiceTypeStatusSchema.optional()`.

---

### Fase 1 — Server Actions para Pacientes

Las server actions son la capa de comunicación entre la UI y el backend. Se crean antes de los componentes para que los tests de componentes puedan mockearlas.

#### 1.1 — Server action: pacientes

**Archivo**: `apps/web/app/actions/patients.ts`

**Funciones a implementar** (todas `'use server'`):

| Función | Método API | Descripción |
|---------|-----------|-------------|
| `fetchPatientsAction(query)` | `GET /api/patients?page=N&search=X&include=deleted` | Devuelve `PaginatedPatientsResponse` |
| `fetchPatientAction(id)` | `GET /api/patients/:id` | Devuelve `PatientResponse` con consent |
| `createPatientAction(prev, formData)` | `POST /api/patients` | Parsea FormData con `CreatePatientSchema`, valida, llama API |
| `updatePatientAction(prev, formData)` | `PATCH /api/patients/:id` | Parsea FormData con `UpdatePatientSchema` |
| `deletePatientAction(id)` | `DELETE /api/patients/:id` | Baja lógica |
| `fetchLocationsAction()` | `GET /api/locations` | Para el selector de sucursal en creación (OWNER/ADMIN) |

**Patrón**: seguir exactamente `actions/locations.ts` — usar `apiFetch`, `revalidatePath`, devolver `{ error: string } | null`.

**Test**: No se testean unitariamente las server actions (dependen de cookies/fetch). Se cubren en tests de integración de los componentes.

---

### Fase 2 — Server Actions para Tipos de Servicio

#### 2.1 — Server action: service-types

**Archivo**: `apps/web/app/actions/service-types.ts`

| Función | Método API | Descripción |
|---------|-----------|-------------|
| `fetchServiceTypesAction()` | `GET /api/service-types?include=all` | Devuelve `ServiceTypeResponse[]` |
| `createServiceTypeAction(prev, formData)` | `POST /api/service-types` | Parsea con `CreateServiceTypeSchema` |
| `updateServiceTypeAction(prev, formData)` | `PATCH /api/service-types/:id` | Parsea con `UpdateServiceTypeSchema` |
| `toggleServiceTypeStatusAction(id, status)` | `PATCH /api/service-types/:id` | Envía `{ status }` |

---

### Fase 3 — Página de lista de pacientes (US1)

Esta es la vista de mayor uso diario. Se implementa como Server Component (page.tsx) que obtiene los datos y pasa a un Client Component para interactividad (búsqueda, paginación, drawer).

#### 3.1 — Server Component: página de pacientes

**Archivo**: `apps/web/app/tenants/[slug]/(dashboard)/patients/page.tsx`

- Server Component que lee `searchParams` (page, search)
- Llama `getSessionUser()` para obtener `role` y `locationId` (necesarios para condicionar UI por rol)
- Llama `apiFetch` para patients y locations en paralelo (patron de `users/page.tsx`)
- Renderiza `<PatientsPageClient>` pasando datos, locations, role y locationId

> **Decisiones aclaradas (2026-03-21):**
>
> **¿Por qué `getSessionUser()` aquí?** Las páginas de settings (`locations/page.tsx`, `users/page.tsx`) no lo llaman porque todo el bloque de settings ya está restringido a OWNER/ADMIN por el layout. La página de pacientes es accesible por todos los roles pero necesita condicionar: botón "Dar de baja" (solo OWNER/ADMIN), selector de sucursal en drawer (solo OWNER/ADMIN), auto-asignación de locationId (MANAGER/STAFF). `getSessionUser()` decodifica el JWT sin llamada al backend — es el mecanismo correcto.
>
> **¿Cómo llegan las locations al drawer?** Fetch en paralelo desde `page.tsx`, exactamente como `users/page.tsx` resuelve el mismo problema. No lazy fetch en el drawer.

```ts
// Patrón a seguir (equivalente a users/page.tsx):
const sessionUser = await getSessionUser();
const [patientsData, locationsData] = await Promise.all([
  apiFetch<PaginatedPatientsResponse>(`/patients?page=${page}&search=${search}`),
  apiFetch<LocationResponse[]>('/locations'),
]);
// Pasar todo como props a PatientsPageClient
```

**Test** (`page.test.tsx`):
- Mock de `apiFetch` y `getSessionUser`
- Verifica que renderiza `PatientsPageClient` con datos
- Verifica que renderiza `ErrorState` cuando la API falla

#### 3.2 — Client Component: tabla de pacientes con búsqueda y paginación

**Archivo**: `apps/web/app/tenants/[slug]/(dashboard)/patients/patients-page-client.tsx`

**Props**:
```ts
interface PatientsPageClientProps {
  patients: PaginatedPatientsResponse;
  userRole: UserRole;
  userLocationId: string | null;
}
```

**Comportamiento**:
- Tabla con columnas: Nombre (link a `/patients/:id`), Sucursal (`locationName`), Fecha de nacimiento, Teléfono, Estado (badge)
- Campo de búsqueda con botón "Buscar" (Enter o clic) — navega a `?search=X` usando `router.push`
- Paginación: controles "Anterior" / "Siguiente" — navega a `?page=N&search=X`
- Toggle "Mostrar eliminados" — estado local, agrega `&include=deleted` al URL
- Botón "Nuevo paciente" — abre drawer de creación
- Botón "Editar" por fila — abre drawer de edición (deshabilitado si status === DELETED)
- Botón "Dar de baja" por fila — solo visible si `userRole` es OWNER o ADMIN, solo en filas ACTIVE
- EmptyState cuando `patients.data.length === 0`

**Tests** (`patients-page-client.test.tsx`):
1. Renderiza tabla con datos de pacientes
2. Muestra EmptyState cuando no hay pacientes
3. El nombre del paciente es un enlace a `/patients/:id`
4. Muestra badge de estado con color diferenciado (ACTIVE vs DELETED)
5. El botón "Buscar" navega con `?search=X`
6. Controles de paginación navegan a la página correcta
7. No muestra paginación cuando `total <= limit`
8. Botón "Dar de baja" visible solo para OWNER/ADMIN
9. Botón "Editar" deshabilitado para pacientes DELETED
10. "Mostrar eliminados" agrega `include=deleted` a la URL

#### 3.3 — Verificación de fase 3

```bash
pnpm --filter web test
pnpm lint && pnpm check-types
```

---

### Fase 4 — Drawer de creación de pacientes (US2)

#### 4.1 — Componente: PatientDrawer (crear y editar)

**Archivo**: `apps/web/app/tenants/[slug]/(dashboard)/patients/patient-drawer.tsx`

**Patrón**: seguir `location-drawer.tsx` — usar `useActionState` con server action, FormData, detección de éxito con `prevPendingRef`.

**Props**:
```ts
interface PatientDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  patient?: PatientResponse;          // undefined = crear, definido = editar
  locations?: LocationResponse[];     // solo para OWNER/ADMIN en modo crear
  userRole: UserRole;
  userLocationId: string | null;
}
```

**Campos del formulario de creación**:
- `name` (requerido)
- `birthDate` (opcional, type="date")
- `phone` (opcional)
- `mobile` (opcional)
- `address` (opcional)
- `notes` (opcional, textarea)
- `locationId` — si OWNER/ADMIN: `<select>` con sucursales; si MANAGER/STAFF: hidden input con `userLocationId`
- Sección "Consentimiento":
  - `consent.type` — select con opciones: PRIVACY_NOTICE (default), TREATMENT, DATA_SHARING
  - `consent.version` — input texto, default "1.0"

**Campos del formulario de edición** (FR-009):
- Solo: `phone`, `mobile`, `address`, `notes` — pre-rellenos
- `name` y `locationId` se muestran como texto, no editables

**Validaciones client-side** (antes de dispatch):
- Nombre vacío: "El nombre es obligatorio"
- Consentimiento no seleccionado: "El consentimiento es obligatorio"
- OWNER/ADMIN sin sucursal: "La sucursal es obligatoria"

**Tests** (`patient-drawer.test.tsx`):
1. Renderiza formulario de creación con campos de consentimiento
2. Renderiza formulario de edición con campos pre-rellenos y nombre no editable
3. Muestra error "El nombre es obligatorio" si se envía sin nombre
4. Muestra error "El consentimiento es obligatorio" si no hay tipo de consentimiento
5. Muestra selector de sucursal para OWNER
6. No muestra selector de sucursal para MANAGER
7. Muestra error del servidor sin cerrar el drawer
8. Llama onSuccess tras submit exitoso
9. No renderiza cuando `open` es false
10. Se cierra con Escape

---

### Fase 5 — Página de detalle de paciente (US5)

#### 5.1 — Server Component: detalle de paciente

**Archivo**: `apps/web/app/tenants/[slug]/(dashboard)/patients/[id]/page.tsx`

- Server Component que lee `params.id`
- Llama `apiFetch<PatientResponse>('/patients/:id')`
- Si 404, renderiza componente de "Paciente no encontrado"
- Si ok, renderiza `<PatientDetailClient>`
- Obtiene `sessionUser` para determinar si mostrar "Dar de baja" y "Editar"

**Test** (`page.test.tsx`):
- Renderiza datos del paciente cuando la API responde ok
- Renderiza "Paciente no encontrado" cuando la API devuelve 404
- Renderiza ErrorState cuando la API falla con otro error

#### 5.2 — Client Component: detalle de paciente

**Archivo**: `apps/web/app/tenants/[slug]/(dashboard)/patients/[id]/patient-detail-client.tsx`

**Muestra**:
- Tarjeta con todos los datos: nombre, fecha de nacimiento, teléfono, móvil, dirección, notas, sucursal, estado
- Sección de consentimiento: tipo (traducido), versión, fecha de firma — o "Sin consentimiento activo"
- Botón "Editar" que abre el drawer de edición
- Botón "Dar de baja" (solo OWNER/ADMIN, solo si ACTIVE)
- Breadcrumb: Pacientes > Nombre del paciente

**Tests** (`patient-detail-client.test.tsx`):
1. Muestra todos los campos del paciente
2. Muestra datos de consentimiento cuando hay uno activo
3. Muestra "Sin consentimiento activo" cuando `consent` es null
4. Botón "Editar" abre drawer
5. Botón "Dar de baja" visible solo para OWNER/ADMIN
6. Botón "Dar de baja" no visible si paciente DELETED

---

### Fase 6 — Baja de paciente (US4)

#### 6.1 — Diálogo / acción de baja

La baja se dispara desde la tabla (Fase 3) y desde el detalle (Fase 5).

> **Decisión (2026-03-21, actualizada):** Se usa `AlertDialog` de shadcn/ui para confirmar la baja. Esto da una UX consistente con el resto del sistema y previene bajas accidentales.

> **Prerequisito:** `alert-dialog` de shadcn/ui **no está instalado** en `apps/web/components/ui/`. Instalar antes de implementar:
> ```bash
> cd apps/web && npx shadcn@latest add alert-dialog
> ```

**Comportamiento del AlertDialog:**

Al hacer clic en el botón "Dar de baja" (tanto en la tabla como en el detalle), se abre un `AlertDialog` con:
- **Título:** "¿Dar de baja al paciente?"
- **Descripción:** "Esta acción cambiará el estado del paciente a inactivo. Puedes reactivarlo más adelante."
- **Botón cancelar:** "Cancelar" (cierra el diálogo sin ejecutar nada)
- **Botón confirmar:** "Dar de baja" (variante `destructive`)

Solo si el usuario confirma en el AlertDialog, se ejecuta la baja:

- En `patients-page-client.tsx`: llama `deletePatientAction(id)` con `startTransition` y luego `router.refresh()`.
- En `patient-detail-client.tsx`: llama `deletePatientAction(id)` con `startTransition` y navega de vuelta a `/patients` tras éxito.

**Tests** adicionales en `patients-page-client.test.tsx`:
1. Clic en "Dar de baja" abre el AlertDialog (no ejecuta la action directamente)
2. Botón "Cancelar" del AlertDialog cierra el diálogo sin ejecutar la action
3. Botón "Dar de baja" del AlertDialog ejecuta `deletePatientAction` y refresca la lista

**Tests** adicionales en `patient-detail-client.test.tsx`:
4. Clic en "Dar de baja" abre el AlertDialog (no ejecuta la action directamente)
5. Botón "Cancelar" del AlertDialog cierra el diálogo sin ejecutar la action
6. Botón "Dar de baja" del AlertDialog ejecuta `deletePatientAction` y navega a `/patients`

---

### Fase 7 — Tipos de servicio (US7)

#### 7.1 — Agregar enlace al sidebar de settings

**Archivo**: `apps/web/app/tenants/[slug]/(dashboard)/settings/components/settings-nav.tsx`

- Agregar `{ href: '/settings/service-types', label: 'Tipos de servicio' }` al array `NAV_ITEMS`
- El enlace solo debe mostrarse para OWNER/ADMIN, pero actualmente `SettingsNav` no recibe el rol. Como el layout de settings ya restringe acceso a OWNER/ADMIN (todo el bloque de settings), el enlace se agrega sin restricción extra dentro del sidebar.

**Test** (`settings-nav.test.tsx`):
- Agregar caso que verifique que "Tipos de servicio" aparece en la navegación

#### 7.2 — Server Component: página de tipos de servicio

**Archivo**: `apps/web/app/tenants/[slug]/(dashboard)/settings/service-types/page.tsx`

- Server Component que llama `apiFetch<ServiceTypeResponse[]>('/service-types?include=all')`
- Renderiza `<ServiceTypesPageClient>` con los datos
- ErrorState si falla

**Test** (`page.test.tsx`):
- Renderiza ServiceTypesPageClient con datos
- Renderiza ErrorState cuando falla

#### 7.3 — Client Component: tabla de tipos de servicio

**Archivo**: `apps/web/app/tenants/[slug]/(dashboard)/settings/service-types/service-types-page-client.tsx`

**Comportamiento**:
- Tabla con columnas: Nombre, Descripción, Precio (formato MXN), Estado (badge Activo/Inactivo)
- Botón "Nuevo tipo de servicio" — abre drawer
- Botón "Editar" por fila — abre drawer con datos pre-rellenos
- Botón "Desactivar"/"Activar" por fila — llama `toggleServiceTypeStatusAction` directamente
- EmptyState cuando no hay tipos

**Patrón**: seguir `locations-page-client.tsx`.

**Tests** (`service-types-page-client.test.tsx`):
1. Renderiza tabla con tipos de servicio
2. Muestra EmptyState cuando lista está vacía
3. Badge muestra "Activo" o "Inactivo" según status
4. Botón "Desactivar" cambia a "Activar" para tipos inactivos
5. Formatea precio como moneda MXN (o "—" si null)

#### 7.4 — Componente: ServiceTypeDrawer

**Archivo**: `apps/web/app/tenants/[slug]/(dashboard)/settings/service-types/service-type-drawer.tsx`

**Campos**:
- `name` (requerido)
- `description` (opcional, textarea)
- `price` (opcional, type="number", step="0.01")

**Patrón**: seguir `location-drawer.tsx`.

**Tests** (`service-type-drawer.test.tsx`):
1. Renderiza formulario de creación
2. Renderiza formulario de edición pre-relleno
3. Muestra error "El nombre es obligatorio" si vacío
4. Parsea precio como número antes de enviar
5. Muestra error del servidor
6. Llama onSuccess tras submit exitoso

---

### Fase 8 — Verificación final

```bash
pnpm lint
pnpm check-types
pnpm test
```

Todas deben pasar sin errores ni warnings.

---

## Resumen de archivos por fase

### Fase 0 — Backend/Schema ajustes — COMPLETA ✅
> Todos los archivos fueron modificados/creados en sesión anterior. No requiere acción.

### Fase 1–2 — Server Actions
| Archivo | Acción |
|---------|--------|
| `apps/web/app/actions/patients.ts` | Crear |
| `apps/web/app/actions/service-types.ts` | Crear |

### Fase 3 — Lista de pacientes
| Archivo | Acción |
|---------|--------|
| `apps/web/app/tenants/[slug]/(dashboard)/patients/page.tsx` | Crear |
| `apps/web/app/tenants/[slug]/(dashboard)/patients/page.test.tsx` | Crear |
| `apps/web/app/tenants/[slug]/(dashboard)/patients/patients-page-client.tsx` | Crear |
| `apps/web/app/tenants/[slug]/(dashboard)/patients/patients-page-client.test.tsx` | Crear |

### Fase 4 — Drawer de pacientes
| Archivo | Acción |
|---------|--------|
| `apps/web/app/tenants/[slug]/(dashboard)/patients/patient-drawer.tsx` | Crear |
| `apps/web/app/tenants/[slug]/(dashboard)/patients/patient-drawer.test.tsx` | Crear |

### Fase 5 — Detalle de paciente
| Archivo | Acción |
|---------|--------|
| `apps/web/app/tenants/[slug]/(dashboard)/patients/[id]/page.tsx` | Crear |
| `apps/web/app/tenants/[slug]/(dashboard)/patients/[id]/page.test.tsx` | Crear |
| `apps/web/app/tenants/[slug]/(dashboard)/patients/[id]/patient-detail-client.tsx` | Crear |
| `apps/web/app/tenants/[slug]/(dashboard)/patients/[id]/patient-detail-client.test.tsx` | Crear |

### Fase 6 — Baja de paciente
Integrada en archivos de Fase 3 y 5 (tests adicionales).

### Fase 7 — Tipos de servicio
| Archivo | Acción |
|---------|--------|
| `apps/web/app/tenants/[slug]/(dashboard)/settings/components/settings-nav.tsx` | Modificar |
| `apps/web/app/tenants/[slug]/(dashboard)/settings/components/settings-nav.test.tsx` | Modificar |
| `apps/web/app/tenants/[slug]/(dashboard)/settings/service-types/page.tsx` | Crear |
| `apps/web/app/tenants/[slug]/(dashboard)/settings/service-types/page.test.tsx` | Crear |
| `apps/web/app/tenants/[slug]/(dashboard)/settings/service-types/service-types-page-client.tsx` | Crear |
| `apps/web/app/tenants/[slug]/(dashboard)/settings/service-types/service-types-page-client.test.tsx` | Crear |
| `apps/web/app/tenants/[slug]/(dashboard)/settings/service-types/service-type-drawer.tsx` | Crear |
| `apps/web/app/tenants/[slug]/(dashboard)/settings/service-types/service-type-drawer.test.tsx` | Crear |

---

## Dependencias entre fases

```
Fase 0 (schemas + backend)
  ├─> Fase 1 (actions pacientes)
  │     ├─> Fase 3 (lista pacientes)
  │     │     ├─> Fase 4 (drawer pacientes)
  │     │     │     └─> Fase 6 (baja — integrada)
  │     │     └─> Fase 5 (detalle paciente)
  │     │           └─> Fase 6 (baja — integrada)
  └─> Fase 2 (actions service-types)
        └─> Fase 7 (UI service-types)

Fase 8 (verificación final) — después de todo
```

Las fases 1+2 pueden ejecutarse en paralelo. Las fases 3-5 son secuenciales (la lista es prerequisito del detalle que reutiliza el drawer). La fase 7 es independiente de 3-6.

---

## Convenciones a seguir (extraídas del código existente)

1. **Server Component como page.tsx** que obtiene datos con `apiFetch` y pasa a un `*-page-client.tsx`
2. **Client Components** con `'use client'` para interactividad (drawers, búsqueda, toggles)
3. **Server Actions** en `app/actions/` con `'use server'`, patrón `useActionState` + `FormData`
4. **Detección de éxito del drawer**: `prevPendingRef` que detecta transición `isPending: true -> false` con `state === null`
5. **Manejo de errores**: try/catch en server component, `ErrorState` component; en drawer, banner de error
6. **Status badges**: usar `Record<string, string>` para labels y classes
7. **Estilos**: Tailwind v4 con tokens Material Design 3 (surface, primary, on-surface, etc.)
8. **Tests**: Vitest + React Testing Library, mocks de `useActionState` y server actions con `vi.mock`
9. **Imports de tipos**: `import type { X } from '@repo/types'`
10. **No `export default`** en componentes — usar named exports (excepto `page.tsx` que Next.js requiere como default)
