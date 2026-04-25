# Research: UI — Módulo 3: Productos y Stock

**Phase 0 output** | 2026-04-24

## Decisión 1: Patrón Server Component vs Client Component

**Decision**: Server Component como shell de la ruta (`page.tsx`); Client Component para todo lo que requiera estado (`*-page-client.tsx`).

**Rationale**: Patrón ya establecido en `patients/`, `receipts/`, `companies/`. El Server Component hace el fetch inicial (o pasa los datos del layout), el Client Component maneja filtros, paginación y apertura de drawers.

**Alternatives considered**:
- Todo client-side: descartado — pierde SSR y no sigue el patrón del proyecto
- Todo server-side con forms: descartado — los filtros dinámicos y los modales requieren interactividad

---

## Decisión 2: Componentes shadcn/ui a usar

**Decision**: `DataTable` (tabla + paginación), `Dialog` o `Sheet` (drawers), `Form` + `Input`/`Select`/`Textarea` (formularios), `Badge` (indicadores de alerta), `Button`, `Skeleton` (loading states).

**Rationale**: Ya están instalados y en uso en el proyecto. Evitar dependencias nuevas.

**Alternatives considered**:
- `Sheet` (drawer lateral) vs `Dialog` (modal centrado): usar `Sheet` para formularios con varios campos (ProductForm, StockConfigForm) donde hay más contenido; usar `Dialog` para confirmaciones simples (eliminar, ajuste de cantidad). Decisión: `Sheet` para create/edit producto y config de stock; `Dialog` para ajuste de cantidad y confirmación de eliminación.

---

## Decisión 3: Fetch de datos y mutaciones

**Decision**: `fetch` nativo con `cache: 'no-store'` en Server Components; Server Actions para mutaciones (POST/PATCH/DELETE). Revalidación con `revalidatePath()` tras cada mutación.

**Rationale**: Patrón existente en el proyecto (ver `apps/web/app/actions/`). No se introduce React Query ni SWR — la simplicidad es principio de la constitución.

**Alternatives considered**:
- React Query: descartado — introduce dependencia nueva sin beneficio claro para este módulo CRUD
- SWR: descartado — misma razón

---

## Decisión 4: Indicadores visuales de stock bajo

**Decision**: Badge rojo/naranja con texto "Stock bajo" en filas de tabla donde `isBelowAlert === true`. En la lista de productos, mostrar el badge si alguna sucursal tiene `isBelowAlert`.

**Rationale**: Cumple SC-003 (visualmente identificable sin abrir detalle). Patrón de badge ya usado en `receipt-status-badge.tsx` y `receipt-payment-type-badge.tsx`.

**Alternatives considered**:
- Color de fila completa: descartado — puede resultar invasivo para tablas largas
- Ícono de advertencia: complementario, puede acompañar al badge

---

## Decisión 5: Combobox con creación inline de categorías

**Decision**: `CategoryCombobox` basado en el componente `Combobox` de shadcn/ui. Si el texto escrito no coincide con ninguna categoría existente, añadir una opción "+ Crear categoría 'X'" al final del dropdown. Al seleccionarla: mostrar estado de carga, llamar `POST /api/product-categories`, y al resolverse seleccionar la nueva categoría automáticamente sin cerrar el formulario padre.

**Rationale**: Patrón estándar "create-on-the-fly" en formularios de datos maestros. Evita que el usuario deba abandonar el formulario de producto para ir a configuración a crear la categoría.

**Alternatives considered**:
- Navegar a Settings > Categorías: descartado — interrumpe el flujo de creación de productos
- Solo texto libre (sin entidad): descartado — el usuario requirió categorías gestionadas

---

## Decisión 7: Control de acceso en el frontend

**Decision**: Obtener el rol del usuario desde el contexto de sesión. Ocultar botones "Nuevo producto", "Editar", "Eliminar", "Ajustar cantidad" cuando el rol es MANAGER o STAFF. La ruta `/inventory/summary` redirige a `/inventory/products` si el rol no es OWNER/ADMIN.

**Rationale**: El backend ya rechaza las operaciones con 403 para roles no autorizados. El frontend oculta los controles por UX, no por seguridad. Consistente con cómo `patient-drawer.tsx` y otros manejan permisos en el dashboard.

**Alternatives considered**:
- Mostrar botones deshabilitados: descartado — mejor UX ocultar directamente para roles sin acceso
- Validar solo en backend: insuficiente desde UX — el usuario no debería ver controles que no puede usar
