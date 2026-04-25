# Feature Specification: UI — Módulo 3: Productos y Stock

**Feature ID**: `013-sprint-modulo-productos-stock`
**Created**: 2026-04-24
**Status**: Draft
**Sprint**: 16

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Catálogo de productos (Priority: P1)

Un administrador necesita gestionar el catálogo de productos de la clínica: crear nuevos productos, editar sus precios y datos generales, y eliminar los que ya no se usan.

**Why this priority**: Sin un catálogo operativo, el resto del módulo (stock, compras, ventas) no funciona. Es el punto de entrada de todo el flujo de inventario.

**Independent Test**: Un administrador puede entrar a Inventario > Productos, ver la lista paginada, crear un producto nuevo con nombre y precios, editarlo y eliminarlo sin necesidad de que el stock esté configurado.

**Acceptance Scenarios**:

1. **Given** que soy OWNER/ADMIN autenticado, **When** accedo a Inventario > Productos, **Then** veo una tabla paginada con nombre, marca, categoría, precio de compra y precio de venta.
2. **Given** que estoy en la lista de productos, **When** busco por nombre o filtro por categoría, **Then** la tabla se actualiza mostrando solo los productos que coinciden.
3. **Given** que hago clic en "Nuevo producto", **When** se abre el Sheet y completo nombre, tipo (Venta o Insumo), categoría, precios y guardo, **Then** el Sheet se cierra y el producto aparece en la lista.
4. **Given** que en el campo de categoría escribo un nombre que no existe, **When** el combobox muestra "+ Crear categoría 'X'", **Then** al seleccionarlo se crea la categoría y queda seleccionada sin cerrar el formulario.
5. **Given** que selecciono un producto existente y hago clic en "Editar", **When** se abre el Sheet con sus datos precargados y guardo los cambios, **Then** el Sheet se cierra y los cambios se reflejan inmediatamente en la lista.
5. **Given** que selecciono un producto, **When** lo elimino y confirmo, **Then** desaparece de la lista.
7. **Given** que estoy en la lista de productos, **When** filtro por tipo (Venta / Insumo), **Then** la tabla muestra solo los productos del tipo seleccionado.
8. **Given** que soy MANAGER o STAFF, **When** accedo a Inventario > Productos, **Then** puedo ver el catálogo pero los controles de crear, editar y eliminar no están disponibles.

---

### User Story 2 — Detalle de producto con stock por sucursal (Priority: P2)

Un administrador quiere ver los datos completos de un producto, incluyendo cuánto stock hay en cada sucursal y si alguna está por debajo del nivel de alerta.

**Why this priority**: Permite tomar decisiones de reabastecimiento al ver de un vistazo el estado de un producto en toda la organización.

**Independent Test**: Al hacer clic en un producto, se muestra su ficha completa con la cantidad disponible en cada sucursal, indicando visualmente cuáles están en alerta.

**Acceptance Scenarios**:

1. **Given** que hago clic en un producto de la lista, **When** se navega a su página de detalle (`/inventory/products/:id`), **Then** veo todos sus campos (nombre, marca, categoría, descripción, precios, unidades por paquete, alerta global) y el desglose de stock por sucursal.
2. **Given** que un producto tiene stock bajo en alguna sucursal, **When** veo el detalle, **Then** esa sucursal aparece destacada con un indicador visual de alerta.
3. **Given** que soy MANAGER, **When** veo el detalle de un producto, **Then** solo veo el stock de mi propia sucursal.

---

### User Story 3 — Lista y ajuste de stock por sucursal (Priority: P3)

Un administrador necesita consultar el stock disponible en cualquier sucursal, filtrar por productos con stock bajo, y ajustar cantidades cuando se hace un conteo físico o se registra una pérdida. Los MANAGER y STAFF tienen acceso de lectura al stock de su propia sucursal.

**Why this priority**: La operación diaria requiere saber qué hay en la sucursal. Los ajustes de inventario son responsabilidad administrativa (OWNER/ADMIN).

**Independent Test**: Un OWNER/ADMIN puede acceder a Inventario > Stock, ver stock de todas las sucursales, filtrar por stock bajo, y ajustar la cantidad de un producto. Un MANAGER solo puede ver (sin botón de ajuste).

**Acceptance Scenarios**:

1. **Given** que soy OWNER/ADMIN, **When** accedo a Inventario > Stock, **Then** veo el stock de todas las sucursales con filtro por sucursal, búsqueda por producto y opción de mostrar solo stock bajo.
2. **Given** que soy MANAGER, **When** accedo a Inventario > Stock, **Then** veo solo el stock de mi sucursal sin posibilidad de cambiar a otra y sin controles de ajuste.
3. **Given** que soy OWNER/ADMIN y selecciono un registro de stock, **When** elijo "Ajustar cantidad" y establezco un valor exacto, **Then** la cantidad se actualiza inmediatamente.
4. **Given** que soy OWNER/ADMIN y selecciono un registro de stock, **When** elijo "Ajustar cantidad" e ingreso un incremento o decremento, **Then** la cantidad cambia en ese monto.
5. **Given** que un producto está por debajo de su nivel de alerta, **When** lo veo en la lista, **Then** aparece destacado con un indicador visual de stock bajo.

---

### User Story 4 — Configurar stock por sucursal (Priority: P4)

Un administrador necesita asignar un producto a una sucursal y configurar sus parámetros locales: stock mínimo, nivel de alerta y unidades por paquete (si difiere del global).

**Why this priority**: Cada sucursal puede tener necesidades distintas del mismo producto; la configuración local permite alertas personalizadas por ubicación.

**Independent Test**: Desde el detalle de un producto, un OWNER/ADMIN puede abrir el formulario de configuración de stock para una sucursal, establecer los parámetros y guardar. El registro aparece en la lista de stock.

**Acceptance Scenarios**:

1. **Given** que estoy en el detalle de un producto, **When** hago clic en "Configurar stock para sucursal", **Then** aparece un formulario con campos para sucursal, stock mínimo, nivel de alerta y unidades por paquete.
2. **Given** que completo el formulario y guardo, **When** la operación es exitosa, **Then** el stock de esa sucursal aparece en el desglose del detalle del producto y en la lista de stock.
3. **Given** que ya existe un registro de stock para ese producto+sucursal, **When** configuro de nuevo, **Then** se actualiza sin crear un duplicado.

---

### User Story 5 — Resumen ejecutivo de stock (Priority: P5)

Un OWNER/ADMIN quiere ver un panel resumen del inventario total de cada producto a través de todas las sucursales, con indicación si alguna sucursal está en alerta.

**Why this priority**: Proporciona visibilidad ejecutiva del inventario sin tener que revisar sucursal por sucursal.

**Independent Test**: Un OWNER puede navegar a Inventario > Resumen y ver la tabla de productos con cantidad total y alertas activas, con opción de filtrar solo los que tienen alerta.

**Acceptance Scenarios**:

1. **Given** que soy OWNER/ADMIN, **When** accedo a Inventario > Resumen, **Then** veo una tabla con cada producto, su cantidad total consolidada y un indicador si alguna sucursal está en alerta.
2. **Given** que activo el filtro "Solo con alerta", **When** la tabla se actualiza, **Then** solo se muestran productos con al menos una sucursal por debajo de su nivel de alerta.
3. **Given** que hago clic en un producto del resumen, **When** se expande la fila o navego al detalle, **Then** veo el desglose de stock por sucursal.
4. **Given** que soy MANAGER o STAFF, **When** intento acceder a Inventario > Resumen, **Then** la sección no está disponible para mi rol.

---

### Edge Cases

- ¿Qué pasa si se intenta eliminar un producto que tiene stock registrado en alguna sucursal? (el backend retorna error; mostrar mensaje claro)
- ¿Cómo se muestra un producto sin stock configurado en ninguna sucursal?
- ¿Qué ocurre si el ajuste delta resultaría en cantidad negativa? (el backend lo rechaza; mostrar el error)
- ¿Qué ve un STAFF cuya sucursal no tiene stock configurado para ningún producto?
- ¿Qué sucede cuando la búsqueda o filtro produce cero resultados?
- ¿Qué ocurre si se intenta crear una categoría con un nombre duplicado dentro del mismo tenant?
- ¿Se puede eliminar una categoría que tiene productos asignados?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST mostrar el catálogo de productos en una tabla paginada con búsqueda por nombre y filtros por categoría y tipo de producto.
- **FR-002**: Los usuarios OWNER y ADMIN MUST poder crear, editar y eliminar productos desde la interfaz. Cada producto MUST tener un tipo: **Venta** (producto comercializado al paciente) o **Insumo** (material consumido durante sesiones de hemodiálisis).
- **FR-011**: El sistema MUST permitir gestionar las categorías de productos desde la sección de configuración (crear, listar, eliminar).
- **FR-012**: El formulario de producto MUST permitir seleccionar una categoría existente o crear una nueva en línea sin salir del formulario.
- **FR-003**: El sistema MUST mostrar el detalle de un producto incluyendo el desglose de stock por sucursal con indicadores de alerta.
- **FR-004**: Los usuarios OWNER y ADMIN MUST poder ajustar la cantidad de stock de un producto en una sucursal mediante valor exacto o incremento/decremento. MANAGER y STAFF tienen acceso de solo lectura al stock.
- **FR-005**: Los usuarios OWNER y ADMIN MUST poder configurar parámetros de stock (mínimo, alerta, unidades por paquete) por producto+sucursal.
- **FR-006**: El sistema MUST resaltar visualmente los productos y registros de stock que estén por debajo de su nivel de alerta efectivo.
- **FR-007**: Los usuarios OWNER y ADMIN MUST tener acceso a un panel de resumen de stock consolidado por producto con desglose por sucursal.
- **FR-008**: Los usuarios MANAGER y STAFF MUST ver únicamente el stock de su propia sucursal en modo lectura; no pueden ajustar cantidades ni acceder al stock de otras sucursales.
- **FR-009**: Los usuarios MANAGER y STAFF NO MUST tener acceso a crear, editar ni eliminar productos.
- **FR-010**: El sistema MUST aplicar paginación en todas las vistas de lista con ordenamiento configurable.

### Key Entities

- **Producto**: Artículo del catálogo — nombre, marca, **tipo (Venta | Insumo)**, **categoría (referencia a ProductCategory)**, descripción, precio de compra, precio de venta, unidades por paquete, nivel de alerta global.
- **CategoríaProducto**: Categoría gestionada por el tenant — nombre único por tenant. Se administra desde Configuración y se puede crear en línea desde el formulario de producto.
- **Stock por sucursal**: Existencia de un producto en una ubicación — cantidad actual, stock mínimo, nivel de alerta local, unidades por paquete local.
- **Sucursal**: Filtra la visibilidad del stock para MANAGER y STAFF; OWNER y ADMIN ven todas.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un administrador puede crear un producto (incluyendo una nueva categoría en línea) y configurar su stock en una sucursal en menos de 2 minutos.
- **SC-002**: Un gerente de sucursal puede localizar un producto específico y ajustar su cantidad en menos de 30 segundos.
- **SC-003**: Los productos con stock bajo son visualmente identificables en las listas sin necesidad de abrir el detalle.
- **SC-004**: Un OWNER puede revisar el estado general del inventario de toda la organización desde una sola pantalla.
- **SC-005**: Los usuarios MANAGER y STAFF nunca ven datos de stock de sucursales que no son las suyas.
- **SC-006**: Las búsquedas y filtros responden en menos de 1 segundo para catálogos de hasta 500 productos.

## Clarifications

### Session 2026-04-24

- Q: ¿Puede MANAGER ajustar cantidades de stock? → A: No. MANAGER y STAFF tienen acceso de solo lectura al stock de su sucursal; solo OWNER/ADMIN ajustan cantidades.
- Q: ¿Cómo se presenta el formulario de crear/editar producto? → A: Modal o drawer lateral, sin salir de la lista de productos.
- Q: ¿Cómo se navega al detalle de un producto? → A: Página dedicada (`/inventory/products/:id`).

## Assumptions

- Las categorías son entidades gestionadas (`ProductCategory`) con nombre único por tenant. Se administran desde Configuración y se pueden crear en línea desde el formulario de producto.
- La eliminación de una categoría con productos asignados la rechaza el backend; la UI muestra el mensaje de error.
- El campo `productType` tiene dos valores: `SALE` (producto de venta, aparecerá en el módulo de Ventas) y `CONSUMABLE` (insumo de sesión, aparecerá en el formulario de Cita). Ambos tipos son gestionados en inventario y stock de la misma manera.
- Los productos tipo `SALE` muestran `salePrice` de forma prominente; los tipo `CONSUMABLE` pueden tener `salePrice` en cero (no relevante para ellos).
- La eliminación de un producto con stock existente la rechaza el backend (error); la UI muestra el mensaje de error retornado sin borrar el producto localmente.
- Un ajuste que resultaría en cantidad negativa es rechazado por el backend; la UI muestra el error correspondiente.
- Las listas paginadas muestran 20 registros por página por defecto.
- El formulario de "Configurar stock" usa upsert, por lo que crear y editar comparten el mismo flujo de UI.
- El módulo de Inventario vive bajo `/inventory/` dentro del dashboard con las rutas: `/inventory/products` (lista), `/inventory/products/:id` (detalle), `/inventory/stock` (stock por sucursal), `/inventory/summary` (resumen ejecutivo).
- Los formularios de crear/editar producto se abren como modal o drawer sobre la lista, sin navegación a nueva ruta.
- El formulario de ajuste de cantidad y el de configurar stock por sucursal también se presentan como modal/drawer.
