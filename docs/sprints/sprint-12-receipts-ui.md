# Sprint 12 — UI Módulo 1: Recibos

**Responsable:** Frontend-TDD-Architect
**Duración estimada:** 2 semanas
**Estado:** Planificado
**Dependencia:** Sprint 7 (Backend de Recibos completado) + Sprint 10 (UI de Pacientes como referencia)

---

## Objetivo del Sprint

Implementar la UI completa del módulo de Recibos, permitiendo a usuarios STAFF/MANAGER/ADMIN:
- **Crear recibos** con folio atómico, vinculados opcionalmente a citas completadas o pacientes directos
- **Cambiar estados** de recibos (`ACTIVE → FINISHED → SETTLED` o `ACTIVE → CANCELLED`)
- **Listar recibos** con filtros por estado, tipo de pago, fecha, paciente y sucursal
- **Ver detalles** de recibos con información completa (paciente, servicio, plan, usuario creador)
- **Exportar recibos** (futuro Sprint 25-26)

El sprint entrega una experiencia UI completa, consistente con shadcn/ui y siguiendo los patrones TDD ya establecidos en el proyecto.

---

## Endpoints API Disponibles (Backend — Sprint 7)

### Creación de Recibos

**POST** `/api/receipts`

**Request Body:**
```typescript
{
  patientId: string;           // UUID del paciente (obligatorio)
  locationId: string;          // UUID de la sucursal (obligatorio)
  serviceTypeId?: string;      // UUID del tipo de servicio (opcional)
  appointmentId?: string;      // UUID de la cita (opcional, si existe cita completada)
  planId?: string;             // UUID del plan (obligatorio si paymentType === 'BENEFIT')
  date: Date;                  // Fecha del recibo (obligatorio)
  amount: string;              // Monto en formato "XXX.XX" (obligatorio)
  paymentType: 'CASH' | 'CREDIT' | 'BENEFIT' | 'INSURANCE' | 'TRANSFER';
  notes?: string;              // Notas adicionales (opcional)
}
```

**Response:** `ReceiptResponse` (ver sección Tipos)

**Validaciones backend:**
- `MANAGER`/`STAFF` solo pueden crear recibos en su propia `locationId`
- Si `paymentType === 'BENEFIT'`, requiere `planId` válido
- Si `appointmentId` proporcionado, la cita debe estar en estado `COMPLETED` y sin recibo asociado
- El folio se genera automáticamente con formato `{LOC}-{YYYY}-{NNNNN}` (donde LOC = primeras 3 letras del nombre de la sucursal)
- Si es `BENEFIT`, incrementa `plan.usedSessions` y marca el plan como `EXHAUSTED` si alcanza su límite

---

### Cambio de Estado

**PATCH** `/api/receipts/:id/status`

**Request Body:**
```typescript
{
  status: 'ACTIVE' | 'FINISHED' | 'SETTLED' | 'CANCELLED';
  notes?: string;  // Notas al cambio de estado
}
```

**Transiciones válidas:**
- `ACTIVE` → `FINISHED` | `CANCELLED`
- `FINISHED` → `SETTLED`
- `SETTLED` → (terminal, sin transición)
- `CANCELLED` → (terminal, sin transición)

**Response:** `ReceiptResponse`

**Validaciones backend:**
- `MANAGER`/`STAFF` solo pueden cambiar estado de recibos en su `locationId`
- No se pueden cambiar estados de recibos en estado terminal (`SETTLED` o `CANCELLED`)

---

### Listar Recibos

**GET** `/api/receipts?page=1&limit=20&status=ACTIVE&patientId=xxx&paymentType=CASH&date=2026-03-22`

**Query Parameters:**
```typescript
{
  page?: number;              // Página (default: 1)
  limit?: number;             // Límite por página max 100 (default: 20)
  status?: ReceiptStatus;     // Filtrar por estado
  patientId?: string;         // Filtrar por paciente
  paymentType?: PaymentType;  // Filtrar por tipo de pago
  date?: string;              // Filtrar por fecha (formato: YYYY-MM-DD)
}
```

**Response:** `PaginatedReceiptsResponse`
```typescript
{
  data: ReceiptResponse[];
  total: number;
  page: number;
  limit: number;
}
```

**Comportamiento:**
- Paginación por fecha descendente (recibos más nuevos primero)
- `MANAGER`/`STAFF` ven solo recibos de su `locationId`
- `ADMIN`/`OWNER` ven todos los recibos del tenant

---

### Obtener Detalle de Recibo

**GET** `/api/receipts/:id`

**Response:** `ReceiptResponse`

**Validaciones backend:**
- `MANAGER`/`STAFF` solo pueden ver detalles de recibos en su `locationId`

---

## Tipos y Schemas (@repo/types)

### ReceiptResponse
```typescript
interface ReceiptResponse {
  id: string;              // UUID del recibo
  tenantId: string;        // UUID del tenant
  locationId: string;      // UUID de la sucursal
  patientId: string;       // UUID del paciente
  userId: string;          // UUID del usuario que creó
  serviceTypeId: string | null;  // UUID del tipo de servicio (opcional)
  planId: string | null;   // UUID del plan (si es BENEFIT)
  folio: string;           // Folio único por sucursal y año (ej: "CEN-2026-00001")
  date: Date;              // Fecha del recibo
  amount: string;          // Monto (string con decimales, ej: "500.50")
  paymentType: PaymentType; // CASH | CREDIT | BENEFIT | INSURANCE | TRANSFER
  status: ReceiptStatus;   // ACTIVE | FINISHED | SETTLED | CANCELLED
  notes: string | null;    // Notas adicionales
  createdAt: Date;         // Fecha de creación
  updatedAt: Date;         // Fecha de última actualización
}
```

### ReceiptStatus
```typescript
type ReceiptStatus = 'ACTIVE' | 'FINISHED' | 'SETTLED' | 'CANCELLED';

// Definición de transiciones:
// ACTIVE (nuevo recibo)
//   ↓ Puede terminar sesión
// FINISHED (sesión completada, esperando pago)
//   ↓ Se pagó completamente
// SETTLED (pagado completamente)
//
// ACTIVE → CANCELLED (en cualquier momento)
```

### PaymentType
```typescript
type PaymentType = 'CASH' | 'CREDIT' | 'BENEFIT' | 'INSURANCE' | 'TRANSFER';

// CASH: Pago en efectivo
// CREDIT: Crédito / a vencer
// BENEFIT: Usa sesiones del plan del paciente (incrementa plan.usedSessions)
// INSURANCE: Cobertura del seguro
// TRANSFER: Transferencia bancaria
```

**Esquemas disponibles en `packages/types/src/receipts.schemas.ts`:**
- `CreateReceiptSchema`
- `UpdateReceiptStatusSchema`
- `ReceiptQuerySchema`
- `ReceiptResponseSchema`
- `PaginatedReceiptsResponseSchema`

---

## Pantallas a Implementar

### 1. Página Principal de Recibos

**Ruta:** `/tenants/[slug]/(dashboard)/receipts/page.tsx`

**Componentes:**
- **Server Component (page.tsx):**
  - Fetch inicial de datos con filtros de URL (`page`, `status`, `patientId`, `paymentType`, `date`)
  - Fetch de lista de pacientes (para select en formularios)
  - Fetch de lista de servicios
  - Fetch de lista de planes (si role permite)
  - Fetch de lista de ubicaciones (si role permite)
  - Pass props a `ReceiptsPageClient`

- **Client Component (receipts-page-client.tsx):**
  - Header con título "Recibos" + breadcrumb
  - **Toolbar:**
    - Botón "Nuevo recibo" (abre modal de creación)
    - Filtros: selector de estado, selector de tipo de pago, input de búsqueda de paciente, date picker de rango/día
    - Selector de ubicación (visible para ADMIN/OWNER)
  - **Tabla de recibos** con columnas:
    - Folio (link a detalles)
    - Fecha
    - Paciente
    - Tipo de servicio
    - Monto
    - Tipo de pago (badge de color)
    - Estado (badge de color)
    - Acciones (botón de menú: ver detalles, cambiar estado, ver cita asociada si existe)
  - **Paginación** inferior

**Criterios de Aceptación:**
1. Listado carga con 20 recibos por defecto
2. Los filtros actualizan la URL y recargan datos
3. La tabla es responsive (horizontal scroll en mobile)
4. Estados muestran badges con colores: ACTIVE=azul, FINISHED=amarillo, SETTLED=verde, CANCELLED=rojo
5. Tipos de pago tienen etiquetas: CASH=verde, CREDIT=naranja, BENEFIT=púrpura, INSURANCE=azul, TRANSFER=gris
6. MANAGER/STAFF solo ven recibos de su sucursal
7. La tabla está ordenada por fecha descendente
8. El botón "Nuevo recibo" lanza el modal de creación

---

### 2. Modal de Creación de Recibos

**Componente:** `receipt-create-drawer.tsx`

**Campos del Formulario:**
1. **Paciente** (select con búsqueda)
   - Fetch de `/api/patients` al escribir
   - Muestra nombre + ubicación
   - Obligatorio

2. **Sucursal** (select)
   - Prerellenado con sucursal del usuario si es MANAGER/STAFF
   - Editable para ADMIN/OWNER
   - Obligatorio

3. **Tipo de Servicio** (select, opcional)
   - Fetch de `/api/service-types`
   - Muestra nombre + precio
   - Opcional

4. **Cita Asociada** (select, opcional)
   - Fetch de `/api/appointments?status=COMPLETED&patientId={patientId}`
   - Solo citas completadas sin recibo asociado
   - Si se selecciona, auto-actualiza el paciente
   - Opcional

5. **Plan** (select, condicional)
   - Aparece si `paymentType === 'BENEFIT'`
   - Fetch de `/api/plans?status=ACTIVE` (solo planes activos, no agotados)
   - Muestra nombre + sesiones usadas/planeadas
   - Obligatorio si BENEFIT

6. **Fecha** (date picker)
   - Default a hoy
   - Obligatorio

7. **Monto** (input numérico con 2 decimales)
   - Validación: positivo, máximo 2 decimales
   - Si se selecciona tipo de servicio, puede prerellenarse con su precio
   - Obligatorio

8. **Tipo de Pago** (radio buttons o select)
   - Opciones: CASH, CREDIT, BENEFIT, INSURANCE, TRANSFER
   - Default a CASH
   - Obligatorio

9. **Notas** (textarea)
   - Máximo 500 caracteres
   - Opcional

**UX del Formulario:**
- Validación en tiempo real (Zod + React Hook Form)
- El campo de plan muestra error si paymentType=BENEFIT pero no hay plan seleccionado
- Botón de envío: "Crear recibo"
- Botón de cancelar: cierra el drawer sin guardar
- Al crear exitosamente: notificación toast, cierra drawer, recarga lista

**Criterios de Aceptación:**
1. Formulario valida con `CreateReceiptSchema` de @repo/types
2. El tipo BENEFIT requiere plan obligatoriamente (validación frontend + backend)
3. Cita asociada es bidireccional: si se selecciona cita, se prerellenan paciente y servicio
4. Los selects tienen búsqueda / autocomplete (React Select o Combobox)
5. El monto acepta hasta 2 decimales y lo formatea automáticamente
6. El folio se muestra solo DESPUÉS de crear (en detalles)
7. Toast de éxito muestra el folio generado

---

### 3. Página de Detalles de Recibos

**Ruta:** `/tenants/[slug]/(dashboard)/receipts/[id]/page.tsx`

**Componentes:**
- **Server Component:** Fetch del recibo + datos relacionados (paciente, usuario, servicio, plan, cita)
- **Client Component (receipt-detail-client.tsx):** Muestra detalles + permite cambio de estado

**Layout:**
- **Header:** Folio + Estado (badge) + Breadcrumb
- **Sección de información:**
  - Tarjeta 1: Información del recibo
    - Folio
    - Fecha
    - Monto
    - Tipo de pago
    - Estado actual
    - Notas (si existen)

  - Tarjeta 2: Información del paciente
    - Nombre + link al detalle del paciente
    - Ubicación
    - Teléfono (si existe)

  - Tarjeta 3: Información del servicio
    - Tipo de servicio (si existe)
    - Precio
    - Cita asociada (si existe, con link)

  - Tarjeta 4: Información del pago (si es BENEFIT)
    - Nombre del plan
    - Sesiones usadas / planeadas
    - Estado del plan

  - Tarjeta 5: Metadata
    - Usuario que creó
    - Creado el (fecha + hora)
    - Actualizado el (fecha + hora)

- **Sección de acciones:**
  - Botón "Cambiar estado" (abre modal)
  - Botón "Ver cita asociada" (si existe, navega a `/appointments/[id]`)
  - Botón "Volver" (back)

**Criterios de Aceptación:**
1. El folio se muestra de forma prominente (ej: con background)
2. El estado tiene color según su tipo (badges consistentes con tabla)
3. Los links navegan correctamente (paciente, cita)
4. Las tarjetas usan `Card` de shadcn/ui
5. El layout es responsive (stack vertical en mobile)
6. MANAGER/STAFF solo pueden ver detalles de su sucursal (error 404 si no)

---

### 4. Modal de Cambio de Estado

**Componente:** `receipt-status-transition-drawer.tsx`

**Funcionalidad:**
- Muestra estado actual prominentemente
- Muestra transiciones válidas disponibles como botones o radio buttons
- Campo de notas (opcional) para dejar registro del cambio

**Transiciones Permitidas:**
```
ACTIVE → [FINISHED, CANCELLED]
FINISHED → [SETTLED]
SETTLED → (sin transición, botón deshabilitado)
CANCELLED → (sin transición, botón deshabilitado)
```

**UX:**
- Modal/Drawer con título "Cambiar estado de recibo"
- Muestra estado actual
- Lista opciones válidas como botones grandes (o radio buttons + botón confirmar)
- Campo de notas
- Botón "Cambiar" con `isLoading` spinner
- Botón "Cancelar"
- Al cambiar exitosamente: toast de éxito, cierra modal, recarga página de detalles

**Criterios de Aceptación:**
1. Solo muestra transiciones válidas según la lógica de estados del backend
2. El campo de notas es opcional pero recomendado (ej: "Sesión completada exitosamente")
3. La acción es atómica (si falla, muestra error toast)
4. Los estados terminales (SETTLED, CANCELLED) no muestran opción de cambio
5. La UI deshabilita botones según el estado actual

---

## Flujos de Usuario

### Flujo 1: Crear recibos desde la cita completada

```
1. Usuario está en módulo de Citas (Sprint 11)
2. Ve cita en estado COMPLETED
3. Botón "Crear recibo" en la cita abre modal de creación con:
   - Paciente preseleccionado
   - Cita preseleccionada
   - Servicio preseleccionado (del appointment)
4. Completa monto, tipo de pago, notas
5. Crea recibos → folio generado automáticamente
6. Toast de éxito con folio → usuario navega a detalles o vuelve a citas
```

**Implementación:** El módulo de Citas (Sprint 11) tendrá un botón que navega a `/receipts?appointmentId=xxx` o abre el drawer con parámetro.

---

### Flujo 2: Crear recibo desde paciente

```
1. Usuario está en módulo de Pacientes (Sprint 10)
2. Ve paciente en estado ACTIVE
3. Botón "Crear recibo" en detalle de paciente abre modal con:
   - Paciente preseleccionado
   - Demás campos vacíos
4. Completa todos los campos obligatorios
5. Crea recibos → folio generado automáticamente
6. Toast de éxito + vuelve a vista anterior
```

---

### Flujo 3: Cambiar estado de recibos

```
1. Usuario está en listado de recibos (página principal)
2. Ve recibo en estado ACTIVE o FINISHED
3. Botón de menú "Cambiar estado" abre modal
4. Selecciona estado válido (ej: ACTIVE → FINISHED)
5. Opcionalmente agrega notas ("Sesión completada")
6. Confirma cambio → estado se actualiza
7. Toast de éxito + tabla se recarga
```

---

### Flujo 4: Filtrar y buscar recibos

```
1. Usuario está en listado de recibos
2. Usa filtros: estado = SETTLED, tipo de pago = CASH, rango de fechas
3. URL se actualiza con query params
4. Tabla se recarga con resultados filtrados
5. Puede combinar múltiples filtros
6. Reset: botón "Limpiar filtros" vuelve a lista sin filtros
```

---

## Componentes a Construir (Orden de Prioridad)

### Tier 1: Tabla y Listado (Bloqueante)

| Componente | Archivo | Propósito |
|---|---|---|
| `ReceiptsPageClient` | `receipts-page-client.tsx` | Client component principal del listado |
| `ReceiptTable` | `receipt-table.tsx` | Tabla de recibos (shadcn Table) |
| `ReceiptFilters` | `receipt-filters.tsx` | Toolbar con filtros y búsqueda |
| `ReceiptRow` | `receipt-row.tsx` | Fila individual con acciones (menú) |
| `ReceiptStatusBadge` | `receipt-status-badge.tsx` | Badge de estado (ACTIVE, FINISHED, SETTLED, CANCELLED) |
| `ReceiptPaymentTypeBadge` | `receipt-payment-type-badge.tsx` | Badge de tipo de pago |

### Tier 2: Creación de Recibos

| Componente | Archivo | Propósito |
|---|---|---|
| `ReceiptCreateDrawer` | `receipt-create-drawer.tsx` | Drawer/Modal de creación con form |
| `ReceiptForm` | `receipt-form.tsx` | Formulario reutilizable (create + edit) |
| `PatientSelect` | `patient-select.tsx` | Combobox/Select de pacientes con búsqueda |
| `ServiceTypeSelect` | `service-type-select.tsx` | Select de tipos de servicio |
| `PlanSelect` | `plan-select.tsx` | Select de planes (aparece si BENEFIT) |
| `AppointmentSelect` | `appointment-select.tsx` | Select de citas completadas |

### Tier 3: Detalles y Cambio de Estado

| Componente | Archivo | Propósito |
|---|---|---|
| `ReceiptDetailClient` | `receipt-detail-client.tsx` | Client component de detalles |
| `ReceiptInfo` | `receipt-info.tsx` | Tarjeta con info del recibo |
| `PatientInfoCard` | `patient-info-card.tsx` | Tarjeta con info del paciente |
| `ServiceInfoCard` | `service-info-card.tsx` | Tarjeta con info del servicio |
| `PlanInfoCard` | `plan-info-card.tsx` | Tarjeta con info del plan (si BENEFIT) |
| `ReceiptStatusTransitionDrawer` | `receipt-status-transition-drawer.tsx` | Modal de cambio de estado |

### Tier 4: Utilidades y Helpers

| Archivo | Propósito |
|---|---|
| `receipt-actions.ts` | Server actions: create, update, fetch |
| `use-receipts.ts` | Hook personalizado para lógica de recibos (infinitamente opcional, puede usarse Context) |
| `receipt-utils.ts` | Helpers: formatFolio, getStatusVariant, formatAmount, etc. |
| `receipt-constants.ts` | Constantes: STATUS_LABELS, PAYMENT_TYPE_LABELS, colores, etc. |

---

## Estructura de Archivos en `/apps/web`

```
app/tenants/[slug]/(dashboard)/
└── receipts/
    ├── page.tsx                          # Server component
    ├── receipts-page-client.tsx          # Client component (listado)
    ├── receipts-page-client.test.tsx     # Tests de listado
    ├── receipt-table.tsx                 # Tabla
    ├── receipt-filters.tsx               # Filtros y búsqueda
    ├── receipt-row.tsx                   # Fila individual
    ├── receipt-status-badge.tsx          # Badge de estado
    ├── receipt-payment-type-badge.tsx    # Badge de tipo de pago
    ├── receipt-create-drawer.tsx         # Modal/Drawer de creación
    ├── receipt-form.tsx                  # Formulario
    ├── receipt-form.test.tsx             # Tests del formulario
    ├── patient-select.tsx                # Select de pacientes
    ├── service-type-select.tsx           # Select de servicios
    ├── plan-select.tsx                   # Select de planes
    ├── appointment-select.tsx            # Select de citas
    ├── [id]/
    │   ├── page.tsx                      # Server component de detalles
    │   ├── receipt-detail-client.tsx     # Client component de detalles
    │   ├── receipt-detail-client.test.tsx
    │   ├── receipt-info.tsx              # Tarjeta de info general
    │   ├── patient-info-card.tsx         # Tarjeta de paciente
    │   ├── service-info-card.tsx         # Tarjeta de servicio
    │   └── plan-info-card.tsx            # Tarjeta de plan
    ├── receipt-status-transition-drawer.tsx  # Modal de cambio de estado
    ├── receipt-status-transition-drawer.test.tsx
    └── utils/
        ├── receipt-actions.ts            # Server actions
        ├── receipt-utils.ts              # Helpers
        ├── receipt-constants.ts          # Constantes

# Server actions en app/actions/
app/actions/
└── receipts.ts                           # createReceipt, updateReceiptStatus, etc.
```

---

## Consideraciones de UX

### 1. Estados del Recibos y Colores

| Estado | Significado | Color Badge | Ícono |
|---|---|---|---|
| **ACTIVE** | Recibo creado, sesión activa | Azul (#3b82f6) | ⏳ |
| **FINISHED** | Sesión completada, aguardando pago | Amarillo (#eab308) | ✓ |
| **SETTLED** | Pagado completamente | Verde (#22c55e) | ✓✓ |
| **CANCELLED** | Anulado | Rojo (#ef4444) | ✗ |

### 2. Tipo de Pago y Colores

| Tipo | Significado | Color | Ícono |
|---|---|---|---|
| **CASH** | Efectivo | Verde (#16a34a) | 💵 |
| **CREDIT** | Crédito / A vencer | Naranja (#ea580c) | 📋 |
| **BENEFIT** | Plan de beneficios | Púrpura (#a855f7) | 🎁 |
| **INSURANCE** | Seguro / Cobertura | Azul (#0ea5e9) | 🏥 |
| **TRANSFER** | Transferencia bancaria | Gris (#6b7280) | 🏦 |

### 3. Folio y Formato

- El folio es **inmutable** (never editable after creation)
- Formato: `{LOC}-{YYYY}-{NNNNN}` (ej: "CEN-2026-00001")
- Se genera automáticamente en el backend
- Se muestra prominentemente (ej: con background gris, monospace font)
- Debe ser copiable al portapapeles (botón "Copiar")

### 4. Filtros

- Los filtros son **combinables** (AND logic): estado Y tipo de pago Y fecha
- El date filter puede ser:
  - Single day picker (filtro exacto)
  - O date range picker (entre dos fechas)
  - O "último mes", "últimos 7 días", etc.
- El clear filters botón resetea todos a defaults
- Los filtros activos se reflejan en URL query params

### 5. Paginación

- Paginación tradicional (números + prev/next)
- Limit selector: 10, 20, 50, 100 items por página
- Tooltip en pagination: "Página X de Y"

### 6. Confirmaciones y Alertas

- **Cambio de estado:** Modal de confirmación (especialmente para CANCELLED)
- **Crear recibo:** Toast de éxito con folio
- **Validaciones:** Errores inline en formulario (React Hook Form)
- **Error al guardar:** Toast error con mensaje del backend

### 7. Accesibilidad

- Todos los inputs con labels accesibles
- Keyboard navigation completa (Tab, Enter, Escape)
- ARIA labels en badges y botones
- Focus visible en botones

### 8. Responsividad

- **Desktop:** Tabla completa con todas las columnas
- **Tablet:** Ocultamos columnas no críticas (notes, createdAt)
- **Mobile:** CardList en lugar de tabla (ej: cada recibo es una card)

---

## Tareas Técnicas (Backlog del Sprint)

### Fase 1: Configuración y Setup

**Tarea 1.1** — Crear estructura de carpetas y archivos base
- Crear carpeta `/receipts` en el dashboard
- Crear archivos `page.tsx`, `receipts-page-client.tsx`, `page.test.tsx`
- Crear carpeta `/[id]` para detalles
- Crear carpeta `/utils` para actions y helpers
- **Criterio de aceptación:** La estructura se puede navegar sin 404

---

### Fase 2: Componentes de Tabla y Listado (TDD)

**Tarea 2.1** — Implementar `receipt-table.tsx` (BLOCKED BY: 2.2)
- Componente shadcn Table reutilizable
- Props: `receipts: ReceiptResponse[]`, `onRowClick`, `onStatusChange`
- Columnas: folio, fecha, paciente, servicio, monto, tipo de pago, estado
- Formato de campos: monto con $ y 2 decimales, fecha formato local
- Test: renderiza tabla, columnas correctas, datos visibles

**Tarea 2.2** — Implementar badges de estado y tipo de pago
- `ReceiptStatusBadge`: componente que toma `status` y devuelve badge con color
- `ReceiptPaymentTypeBadge`: similar para tipo de pago
- Usar `Badge` de shadcn/ui con variants personalizadas
- Test: verifica colores correctos, labels correctos

**Tarea 2.3** — Implementar `ReceiptFilters` component
- Inputs: estado (select), tipo de pago (select), búsqueda paciente (text), date picker
- Props: `onFilterChange: (filters) => void`
- Botón "Limpiar filtros"
- Test: filtra correctamente, botón limpiar resetea

**Tarea 2.4** — Implementar `ReceiptsPageClient` (BLOCKED BY: 2.1, 2.3)
- Props recibe: `receipts: PaginatedReceiptsResponse`, roles, locationId, locations, patients, serviceTypes
- Rendering: Header + Toolbar (new button + filters) + Table + Pagination
- Estados: loading, empty, error, success
- Test: renderiza tabla, botón new abre drawer, filtros funcionan

**Tarea 2.5** — Implementar `receipts/page.tsx` server component
- Fetch de `/api/receipts` con query params de searchParams
- Fetch de locations, patients, service-types (Promise.all)
- Pass a client component
- Error handling con ErrorState
- Test: carga datos, pasa a cliente

---

### Fase 3: Formulario de Creación (TDD)

**Tarea 3.1** — Implementar `receipt-form.tsx` (BLOCKED BY: 3.2, 3.3)
- Usa React Hook Form + Zod resolver (CreateReceiptSchema)
- Campos: paciente, sucursal, servicio, cita, plan (condicional), fecha, monto, tipo pago, notas
- Validación en tiempo real
- Si paymentType === BENEFIT, requiere plan (validación + error message)
- Test: valida form, errores visibles, submit funciona

**Tarea 3.2** — Implementar `patient-select.tsx`
- Combobox con búsqueda y autocomplete
- Fetch en onChange con debounce (ej: react-use-debounce)
- Muestra nombre + location
- Controlado con React Hook Form
- Test: búsqueda funciona, selecciona paciente

**Tarea 3.3** — Implementar `service-type-select.tsx`, `plan-select.tsx`, `appointment-select.tsx`
- Similar a patient-select pero para cada recurso
- ServiceTypeSelect: muestra precio
- PlanSelect: muestra sesiones usadas/planeadas, solo activos
- AppointmentSelect: solo citas completadas sin recibo, filtra por patientId
- Test: fetchs correctos, opciones visibles

**Tarea 3.4** — Implementar `receipt-create-drawer.tsx` (BLOCKED BY: 3.1, 3.2)
- Drawer/Modal con ReceiptForm adentro
- Props: `isOpen: boolean`, `onClose: () => void`, `onSuccess?: () => void`
- Usa server action `createReceipt`
- Loading state en botón submit
- Toast de éxito con folio
- Toast de error con mensaje del backend
- Test: abre/cierra, crea recibo, muestra errors

**Tarea 3.5** — Implementar `receipt-actions.ts`
- Server action `createReceipt(dto: CreateReceiptDto)`
- Llama `POST /api/receipts`
- Error handling: BadRequestException, ConflictException
- Retorna `ReceiptResponse` o throw error
- Test: crea recibos, maneja errores BENEFIT sin plan, maneja errores cita completada

---

### Fase 4: Página de Detalles (TDD)

**Tarea 4.1** — Implementar `receipts/[id]/page.tsx` server component
- Fetch de `/api/receipts/:id`
- Fetch de paciente, usuario, servicio, plan si existe, cita si existe
- Pass a client component
- 404 si no encontrado o sin acceso (MANAGER/STAFF check)
- Test: carga detalles, 404 si sin acceso

**Tarea 4.2** — Implementar tarjetas de información (BLOCKED BY: 4.1)
- `ReceiptInfo`: folio, fecha, monto, tipo pago, estado, notas
- `PatientInfoCard`: nombre, link, ubicación, teléfono
- `ServiceInfoCard`: nombre, precio (si existe)
- `PlanInfoCard`: nombre, sesiones (si BENEFIT)
- Todos usan `Card` de shadcn/ui
- Test: muestra datos correctos, links funcionan

**Tarea 4.3** — Implementar `receipt-detail-client.tsx` (BLOCKED BY: 4.2)
- Header con folio + estado + breadcrumb
- Grid de tarjetas
- Sección de acciones (botones)
- Botón cambiar estado (abre drawer)
- Botón ver cita (si existe)
- Test: renderiza todas tarjetas, botones funcionan

---

### Fase 5: Cambio de Estado (TDD)

**Tarea 5.1** — Implementar `receipt-status-transition-drawer.tsx`
- Drawer con estado actual
- Lista de transiciones válidas (ACTIVE→[FINISHED, CANCELLED], FINISHED→[SETTLED])
- Campo de notas
- Props: `receiptId`, `currentStatus`, `isOpen`, `onClose`
- Usa server action `updateReceiptStatus`
- Toast de éxito / error
- Test: solo muestra transiciones válidas, actualiza status

**Tarea 5.2** — Implementar server action `updateReceiptStatus`
- Llama `PATCH /api/receipts/:id/status`
- Error handling: NotFoundException, ConflictException (terminal states)
- Retorna `ReceiptResponse`
- Test: cambia estado, rechaza transiciones inválidas, rechaza estados terminales

---

### Fase 6: Integración y Polish

**Tarea 6.1** — Conectar botón "Nuevo recibo" en módulo de Pacientes (Sprint 10)
- Botón en detalle de paciente que navega a `/receipts?patientId=xxx` o abre drawer
- BLOCKER PARA SPRINT 11: si el Sprint 11 (Citas UI) necesita crear recibos, este debe estar done

**Tarea 6.2** — Tests E2E completos
- Test E2E: crear recibo → ver detalles → cambiar estado → listar con filtros
- Test E2E: crear BENEFIT recibo → verifica plan.usedSessions incrementó
- Ejecutar: `pnpm --filter web test`
- Criterio: cobertura > 80%

**Tarea 6.3** — Lint, tipos, tests
- `pnpm lint` sin errores
- `pnpm check-types` sin errores
- `pnpm test` todos en verde
- Criterio: todos 3 comandos pasan

---

## Criterios de Aceptación por Tarea

### Crear Recibos
- [ ] Formulario valida usando CreateReceiptSchema de @repo/types
- [ ] Folio se genera automáticamente y se muestra en toast
- [ ] BENEFIT requiere plan y lo valida en frontend
- [ ] Cita asociada es opcional pero funciona (bidireccional)
- [ ] Monto formatea a 2 decimales
- [ ] Toast de éxito muestra folio generado
- [ ] Drawer cierra y tabla se recarga
- [ ] MANAGER/STAFF solo pueden crear en su sucursal (backend + frontend)

### Listar Recibos
- [ ] Tabla muestra 20 recibos por defecto
- [ ] Ordenada por fecha descendente
- [ ] Filtros funcionan: estado, tipo pago, fecha, paciente
- [ ] Paginación funciona (prev/next, page selector)
- [ ] Responsivo (mobile cardlist, tablet tabla reducida, desktop tabla completa)
- [ ] MANAGER/STAFF ven solo su sucursal
- [ ] ADMIN/OWNER ven todas las sucursales (selector visible)
- [ ] Estados tienen badges correctos (colores)
- [ ] Tipos de pago tienen badges correctos

### Detalles de Recibos
- [ ] Carga datos completos (paciente, servicio, plan, cita)
- [ ] Folio se muestra prominentemente
- [ ] Links funcionan (paciente, cita, usuario)
- [ ] Botón cambiar estado abre modal
- [ ] Botón ver cita navega a `/appointments/[id]`
- [ ] MANAGER/STAFF ven error 404 si no su sucursal

### Cambiar Estados
- [ ] Solo muestra transiciones válidas
- [ ] ACTIVE → FINISHED, CANCELLED
- [ ] FINISHED → SETTLED
- [ ] SETTLED, CANCELLED son terminales (sin transición)
- [ ] Campo notas es opcional
- [ ] Toast de éxito al cambiar
- [ ] Página se recarga con nuevo estado

### Código y Calidad
- [ ] Cero `any` en TypeScript
- [ ] Cero `export default`
- [ ] Cero `require()`
- [ ] Imports locales con extensión `.js`
- [ ] TDD: tests escritos primero, red → green → refactor
- [ ] Mínimo cobertura 80% en tests
- [ ] `pnpm lint` sin warnings
- [ ] `pnpm check-types` sin errores
- [ ] `pnpm test` todos en verde

---

## Decisiones Arquitectónicas

### ADR-Sprint-12-1: Forma de las Transiciones de Estado

**Decisión:** Estados de recibos siguen máquina de estados explícita en el backend (`VALID_RECEIPT_TRANSITIONS`), frontend solo permite click en transiciones válidas.

**Rationale:** Evita lógica duplicada y errores. La fuente de verdad está en backend. Frontend confía en el backend pero ofrece UX clara (botones solo activos para transiciones válidas).

**Implicación:** Si transición es inválida, backend rechaza con BadRequest. Frontend nunca debe presentar botón de transición inválida.

---

### ADR-Sprint-12-2: Folio Generado en Backend

**Decisión:** El folio se genera automáticamente en el backend durante la creación, nunca es editable.

**Rationale:** Garantiza unicidad y secuencia. El cliente no confía en el cliente para esto. Cumple NOM-004-SSA3 (inmutabilidad).

**Implicación:** El folio solo se muestra DESPUÉS de crear. El formulario no lo tiene como campo.

---

### ADR-Sprint-12-3: BENEFIT Requiere Plan

**Decisión:** Si `paymentType === 'BENEFIT'`, el campo `planId` es obligatorio (validación frontend + backend).

**Rationale:** Negocio: un recibo de tipo BENEFIT debe tener asociado un plan para incrementar sus sesiones. Si no hay plan, es un error.

**Implicación:** El campo `planSelect` aparece condicionalmente y se valida como required. El select solo muestra planes activos (status !== EXHAUSTED).

---

### ADR-Sprint-12-4: Cita Asociada es Opcional pero Bidireccional

**Decisión:** Si se proporciona `appointmentId`, se valida que exista, esté COMPLETED, y sin recibo. Si se selecciona cita en el formulario, auto-completa paciente y servicio.

**Rationale:** UX mejorado: permite crear recibo directamente desde cita. Evita duplicar datos manualmente.

**Implicación:** El `AppointmentSelect` debe filtrar por `status=COMPLETED` y `receiptId=null`. Si se selecciona cita, trigger onChange que actualiza paciente y servicio.

---

### ADR-Sprint-12-5: Server Actions para Create/Update

**Decisión:** Usar Next.js Server Actions (`'use server'`) para crear y actualizar recibos, en lugar de fetch desde client.

**Rationale:** Más seguro (no expone token en client), simplifica revalidation de datos, integración natural con forms de Next.js.

**Implicación:** `receipt-actions.ts` con funciones async que llaman a la API backend. El form usa `action` prop.

---

## Referencias Cruzadas

- **Sprint 7 (Backend):** `/docs/sprints/sprint-07-receipts-backend.md` (si existe)
- **Sprint 10 (Pacientes UI):** Usar como referencia los patrones de tabla, forms, y drawers
- **Sprint 11 (Citas UI):** Integración: botón "Crear recibo" en cita completada
- **Módulo Planes:** Integración con `Plan` entity, filtrado por estado
- **NOM-004-SSA3:** Cumplimiento de inmutabilidad (folio, status transitions)

---

## Open Questions

1. **Integración de Reportes (Sprint 25-26):** ¿Se exportan recibos como PDF o Excel? ¿Qué información se incluye? → Dejar para Sprint 25-26.

2. **Notificaciones (Sprint 27):** ¿Se notifica al usuario cuando se crea o cambia estado un recibio? → Dejar para Sprint 27.

3. **Archivo de Consentimiento:** ¿Se almacena un PDF del recibo? ¿Dónde? → Dejar para futuro (probablemente Sprint 25-26 con reportes).

4. **Autorización en Cambio de Estado:** ¿Solo el creador puede cambiar estado? ¿O cualquier STAFF de la sucursal? → Backend permite cualquier STAFF de la sucursal. Frontend respeta esto.

5. **Monto del Recibo vs Precio del Servicio:** ¿El monto debe coincidir con el precio del servicio? ¿O puede ser diferente? → Backend permite diferente (flexible para descuentos, etc.). Frontend no valida, deja libertad al usuario.

6. **Filtro de Fecha:** ¿Date picker de un día, o date range picker (desde-hasta)? → Implementar ambos: date picker simple por defecto, y en futuro agregar range picker (futuro refinamiento).

---

## Notas de Implementación

### TypeScript Stricto

- Todos los tipos deben ser inferidos de `@repo/types`
- Nunca usar `any`
- Usar `unknown` si es realmente desconocido, con narrowing explícito
- Interfaces > Type aliases (salvo funciones complejas)

### React Best Practices

- Usar `'use client'` en componentes que necesitan hooks (forms, estado)
- Componentes server por defecto para fetching
- useTransition para loading states en forms
- Suspense para boundaries de error

### Zod + React Hook Form

- Resolver del schema de @repo/types directamente
- Validación en tiempo real (onBlur)
- Errores visibles inline
- Try-catch en server action para manejar BadRequestException del backend

### Tailwind + shadcn/ui

- Usar componentes de shadcn como base
- No modificar componentes, extender encima
- Tailwind v4 con reset en @layer directive
- Responsive first: mobile, tablet, desktop

---

## Estimación de Esfuerzo

| Fase | Tareas | Esfuerzo | Duración |
|---|---|---|---|
| 1 | Setup | 1 punto | 0.5 días |
| 2 | Tabla y listado | 6 puntos | 2 días |
| 3 | Formulario de creación | 8 puntos | 2.5 días |
| 4 | Detalles | 6 puntos | 2 días |
| 5 | Cambio de estado | 4 puntos | 1 día |
| 6 | Integración y polish | 5 puntos | 1.5 días |
| **Total** | **30 puntos** | **~2 semanas** |

(Estimación conservadora asumiendo TDD + alta cobertura de tests)

---

## Checklist Final

- [ ] Estructura de carpetas creada
- [ ] Componentes implementados siguiendo TDD
- [ ] Server actions para create/update funcionales
- [ ] Todos los tipos extraídos de @repo/types
- [ ] Formularios validan con Zod
- [ ] Tablas y detalles responsivos
- [ ] Badges de estado/pago con colores correctos
- [ ] Filtros funcionan (combinables)
- [ ] Paginación funciona
- [ ] Integración con Pacientes (botón crear recibo)
- [ ] Tests cobertura > 80%
- [ ] `pnpm lint` ✓
- [ ] `pnpm check-types` ✓
- [ ] `pnpm test` ✓
- [ ] Documentación actualizada
- [ ] Código preparado para Sprint 11 (CitasUI integración)

