# Feature Specification: Módulo 3: Proveedores + Órdenes de Compra (Backend + UI)

**Feature ID**: `014-sprint-dulo-proveedores`
**Created**: 2026-04-24
**Status**: Draft
**Sprints**: 17 (Backend) + 18 (UI)

## Clarifications

### Session 2026-04-24

- Q: ¿Qué pueden ver MANAGER y STAFF en órdenes de compra? → A: MANAGER ve solo las órdenes de su `locationId`; STAFF no tiene acceso a órdenes de compra.
- Q: Al agregar ítems a una orden, ¿el picker muestra solo productos del proveedor o todo el catálogo? ¿Qué pasa si el producto no está en el catálogo del proveedor? → A: Muestra solo los productos registrados para ese proveedor; si el producto no está, se puede agregar inline desde el mismo modal sin navegar al detalle del proveedor (crea el SupplierProduct en el momento).
- Q: ¿Se guarda el progreso de una orden en borrador automáticamente? → A: Sí — cada ítem que se agrega se persiste inmediatamente en el servidor; el `DRAFT` es la fuente de verdad persistida, no estado local en memoria.
- Q: ¿El estado `RECEIVED` está disponible en este sprint? → A: No — el flujo termina en `CONFIRMED` o `CANCELLED`. El estado `RECEIVED` se reserva para Sprint 19 cuando se implemente el módulo de Compras con incremento de stock.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Gestión de proveedores (Priority: P1)

Un administrador necesita mantener un directorio de proveedores de la clínica: registrar nuevos proveedores con sus datos de contacto, actualizarlos y desactivarlos cuando ya no se trabaja con ellos.

**Why this priority**: Sin proveedores registrados no es posible crear órdenes de compra ni llevar trazabilidad del origen de los productos.

**Independent Test**: Un OWNER/ADMIN puede crear un proveedor, editarlo y desactivarlo. La API retorna errores claros ante datos inválidos o duplicados.

**Acceptance Scenarios**:

1. **Given** que soy OWNER/ADMIN autenticado, **When** envío `POST /api/suppliers` con nombre, contacto y datos válidos, **Then** se crea el proveedor con estado `ACTIVE` y se retorna su representación completa.
2. **Given** que existe un proveedor, **When** envío `PATCH /api/suppliers/:id` con nuevos datos de contacto, **Then** los datos se actualizan correctamente.
3. **Given** que existe un proveedor activo, **When** envío `PATCH /api/suppliers/:id` con `status: INACTIVE`, **Then** el proveedor queda inactivo y no aparece en listados por defecto.
4. **Given** que soy MANAGER o STAFF, **When** intento crear o editar un proveedor, **Then** recibo un error 403.
5. **Given** que consulto `GET /api/suppliers`, **When** no especifico filtros, **Then** recibo solo los proveedores activos del tenant paginados.
6. **Given** que consulto `GET /api/suppliers?includeInactive=true`, **When** soy OWNER/ADMIN, **Then** recibo todos los proveedores (activos e inactivos).

---

### User Story 2 — Catálogo de productos por proveedor (Priority: P2)

Un administrador necesita saber qué productos puede adquirir a través de cada proveedor y a qué precio, para poder crear órdenes de compra con información precisa.

**Why this priority**: La relación proveedor-producto es el puente entre el catálogo de productos y las órdenes de compra; sin ella no se pueden sugerir proveedores al ordenar.

**Independent Test**: Un OWNER/ADMIN puede asociar un producto a un proveedor con precio unitario, consultar los productos de ese proveedor y eliminar la asociación.

**Acceptance Scenarios**:

1. **Given** que existen un proveedor y un producto, **When** envío `POST /api/suppliers/:id/products` con `productId` y `unitPrice`, **Then** se crea la asociación y se retorna con datos del producto.
2. **Given** que ya existe la asociación proveedor-producto, **When** la creo de nuevo, **Then** recibo un error indicando que ya existe (sin crear duplicados).
3. **Given** que existe una asociación, **When** envío `PATCH /api/suppliers/:supplierId/products/:productId` con nuevo `unitPrice`, **Then** el precio se actualiza.
4. **Given** que existe una asociación, **When** envío `DELETE /api/suppliers/:supplierId/products/:productId`, **Then** la asociación se elimina y el producto ya no aparece en el listado del proveedor.
5. **Given** que consulto `GET /api/suppliers/:id/products`, **Then** recibo la lista de productos del proveedor con nombre, precio y datos básicos del producto.
6. **Given** que consulto `GET /api/products/:id/suppliers`, **Then** recibo qué proveedores ofrecen ese producto y a qué precio.

---

### User Story 3 — Crear y gestionar órdenes de compra (Priority: P3)

Un administrador necesita crear órdenes de compra dirigidas a un proveedor, especificando los productos, cantidades y precios, y seguir el flujo de la orden hasta que sea confirmada o cancelada.

**Why this priority**: Las órdenes de compra son el instrumento formal para solicitar mercancía. Su estado indica si el proveedor confirmó el pedido.

**Independent Test**: Un OWNER/ADMIN puede crear una orden en borrador, agregarle ítems, enviarla al proveedor y cancelarla. Los estados inválidos son rechazados.

**Acceptance Scenarios**:

1. **Given** que soy OWNER/ADMIN, **When** envío `POST /api/purchase-orders` con supplierId, locationId y notas, **Then** se crea la orden en estado `DRAFT` con total calculado en 0.
2. **Given** que existe una orden en `DRAFT`, **When** envío `POST /api/purchase-orders/:id/items` con productId, quantity y unitPrice, **Then** el ítem se agrega y el total de la orden se recalcula.
3. **Given** que existe una orden en `DRAFT` con ítems, **When** envío `PATCH /api/purchase-orders/:id` con `status: SENT`, **Then** la orden pasa a `SENT` y queda bloqueada para edición de ítems.
4. **Given** que existe una orden en `SENT`, **When** envío `PATCH /api/purchase-orders/:id` con `status: CONFIRMED`, **Then** la orden pasa a `CONFIRMED`.
5. **Given** que existe una orden en `DRAFT` o `SENT`, **When** envío `PATCH /api/purchase-orders/:id` con `status: CANCELLED`, **Then** la orden queda cancelada.
6. **Given** que existe una orden en `CONFIRMED` o `RECEIVED`, **When** intento cancelarla, **Then** recibo un error indicando que el estado no permite cancelación.
7. **Given** que consulto `GET /api/purchase-orders`, **Then** recibo la lista paginada con estado, proveedor, sucursal y total.
8. **Given** que consulto `GET /api/purchase-orders/:id`, **Then** recibo la orden completa con sus ítems y datos del proveedor y sucursal.

---

---

### User Story 4 — UI: Lista y gestión de proveedores (Priority: P4)

Un administrador necesita ver el directorio de proveedores, crear nuevos, editarlos y desactivarlos desde la interfaz sin abandonar la pantalla.

**Why this priority**: La UI de proveedores es la puerta de entrada al módulo; sin ella no se pueden gestionar los demás flujos desde el dashboard.

**Independent Test**: Un OWNER/ADMIN puede abrir Inventario > Proveedores, crear un proveedor desde un Sheet, editarlo y desactivarlo. MANAGER/STAFF ven la lista en solo lectura.

**Acceptance Scenarios**:

1. **Given** que soy OWNER/ADMIN, **When** accedo a Inventario > Proveedores, **Then** veo una tabla paginada con nombre, contacto, teléfono y estado.
2. **Given** que hago clic en "Nuevo proveedor", **When** se abre el Sheet y completo los datos y guardo, **Then** el Sheet se cierra y el proveedor aparece en la lista.
3. **Given** que selecciono un proveedor, **When** lo edito desde el Sheet, **Then** los cambios se reflejan inmediatamente en la lista.
4. **Given** que desactivo un proveedor, **When** confirmo la acción, **Then** el proveedor desaparece del listado por defecto (visible solo con filtro "Incluir inactivos").
5. **Given** que soy MANAGER o STAFF, **When** accedo a la lista de proveedores, **Then** puedo verla pero no aparecen botones de crear, editar ni desactivar.

---

### User Story 5 — UI: Productos por proveedor (Priority: P5)

Un administrador necesita ver qué productos ofrece cada proveedor y poder agregar o quitar productos del catálogo de un proveedor desde la página de detalle.

**Why this priority**: Es la relación que hace útil a un proveedor para crear órdenes de compra con precios de referencia.

**Independent Test**: Desde el detalle de un proveedor, un OWNER/ADMIN puede asociar un producto con precio, ver la lista de productos del proveedor y eliminar una asociación.

**Acceptance Scenarios**:

1. **Given** que accedo al detalle de un proveedor (`/inventory/suppliers/:id`), **Then** veo sus datos de contacto y la lista de productos que provee con precio de referencia.
2. **Given** que hago clic en "Agregar producto", **When** se abre un Dialog y selecciono un producto del catálogo con precio, **Then** el producto aparece en la lista del proveedor.
3. **Given** que existe una asociación proveedor-producto, **When** la elimino y confirmo, **Then** desaparece de la lista.

---

### User Story 6 — UI: Lista y creación de órdenes de compra (Priority: P6)

Un administrador necesita ver todas las órdenes de compra, filtrarlas por estado o proveedor, y crear nuevas órdenes especificando proveedor, sucursal e ítems de producto.

**Why this priority**: Las órdenes de compra son el flujo operativo central del módulo; sin esta UI el aprovisionamiento es manual.

**Independent Test**: Un OWNER/ADMIN puede acceder a Inventario > Órdenes, crear una orden en borrador, agregarle productos con cantidades y precios, y enviarla al proveedor.

**Acceptance Scenarios**:

1. **Given** que accedo a Inventario > Órdenes de compra, **Then** veo una tabla paginada con proveedor, sucursal, estado, total y fecha.
2. **Given** que filtro por estado o proveedor, **Then** la tabla se actualiza mostrando solo las órdenes que coinciden.
3. **Given** que hago clic en "Nueva orden", **When** completo proveedor y sucursal y guardo, **Then** se crea la orden en borrador y navego a su detalle.
4. **Given** que estoy en el detalle de una orden en `DRAFT`, **When** abro "Agregar producto" y selecciono un producto del catálogo del proveedor con cantidad, **Then** el ítem se guarda inmediatamente en el servidor, aparece en la lista y el total se actualiza.
5. **Given** que el producto que quiero agregar no está en el catálogo del proveedor, **When** lo busco en el picker, **Then** aparece una opción para registrarlo inline en el mismo modal (nombre + precio de referencia) sin salir de la orden.
6. **Given** que la orden tiene ítems y cierro el navegador accidentalmente, **When** regreso al detalle de la orden, **Then** todos los ítems guardados siguen ahí — no se pierde progreso.
7. **Given** que la orden tiene ítems, **When** hago clic en "Enviar al proveedor", **Then** la orden pasa a `SENT` y los controles de edición de ítems se deshabilitan.
6. **Given** que soy MANAGER o STAFF, **When** accedo a la lista de órdenes, **Then** puedo verlas pero no puedo crear ni cambiar su estado.

---

### User Story 7 — UI: Detalle y flujo de estado de una orden (Priority: P7)

Un administrador necesita ver el detalle completo de una orden — ítems, totales, proveedor, sucursal — y avanzar su estado manualmente hasta `CONFIRMED` o cancelarla.

**Why this priority**: El seguimiento del estado de las órdenes es crítico para saber qué mercancía está en camino y cuándo esperar su llegada.

**Independent Test**: Desde el detalle de una orden, un OWNER/ADMIN puede confirmarla o cancelarla. Los estados inválidos no muestran el botón correspondiente.

**Acceptance Scenarios**:

1. **Given** que accedo al detalle de una orden (`/inventory/purchase-orders/:id`), **Then** veo el proveedor, sucursal, estado actual, fecha esperada, notas, ítems con subtotales y total general.
2. **Given** que la orden está en `SENT`, **When** hago clic en "Confirmar orden", **Then** el estado cambia a `CONFIRMED` sin recargar la página.
3. **Given** que la orden está en `DRAFT` o `SENT`, **When** hago clic en "Cancelar orden" y confirmo, **Then** el estado cambia a `CANCELLED` y los controles de acción desaparecen.
4. **Given** que la orden está en `CONFIRMED`, **Then** el botón "Cancelar" no está disponible y aparece un aviso de que la recepción de mercancía se registrará en el módulo de Compras (Sprint 19).

---

### Edge Cases

- ¿Qué ocurre si se intenta agregar un ítem a una orden que no está en `DRAFT`?
- ¿Qué pasa si se elimina un ítem de una orden en `DRAFT` — el total se recalcula?
- ¿Puede un proveedor estar asociado a un producto que no pertenece al mismo tenant?
- ¿Qué ocurre si se intenta crear una orden para un proveedor inactivo?
- ¿Puede existir una orden sin ítems al pasar a estado `SENT`?
- ¿Qué sucede si se elimina un proveedor que tiene órdenes activas?
- ¿Puede un producto eliminado seguir apareciendo en órdenes históricas?
- ¿Qué ve el usuario si intenta acceder al detalle de una orden de otro tenant?
- ¿Cómo se muestra una orden sin ítems al intentar enviarla?
- ¿Qué ocurre si el catálogo de productos está vacío al intentar agregar ítems a una orden?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST permitir a OWNER y ADMIN crear, editar y desactivar proveedores. Los demás roles tienen acceso de solo lectura.
- **FR-002**: El sistema MUST garantizar que los nombres de proveedores sean únicos dentro del mismo tenant.
- **FR-003**: El sistema MUST permitir a OWNER y ADMIN asociar productos a proveedores con un precio unitario de referencia. La asociación MUST ser única por par proveedor-producto dentro del tenant.
- **FR-004**: El sistema MUST permitir consultar qué proveedores ofrecen un producto dado, y qué productos ofrece un proveedor dado.
- **FR-005**: El sistema MUST permitir crear órdenes de compra en estado `DRAFT` asociadas a un proveedor y una sucursal.
- **FR-006**: El sistema MUST permitir agregar, editar y eliminar ítems de una orden de compra solo cuando está en estado `DRAFT`. Cada operación se persiste inmediatamente — el `DRAFT` es la fuente de verdad en servidor, no estado temporal en el cliente.
- **FR-007**: El sistema MUST calcular y mantener actualizado el total de la orden al agregar, editar o eliminar ítems.
- **FR-006b**: Al agregar un ítem a una orden, si el producto no está registrado en el catálogo del proveedor (`SupplierProduct`), el sistema MUST permitir crearlo inline (desde el mismo flujo de agregar ítem) sin redirigir al usuario a la página del proveedor.
- **FR-008**: El sistema MUST aplicar el siguiente flujo de estados para órdenes de compra: `DRAFT → SENT → CONFIRMED`, con posibilidad de `CANCELLED` desde `DRAFT` o `SENT`. El estado `RECEIVED` se reserva para Sprint 19. Las transiciones inválidas MUST retornar error.
- **FR-009**: El sistema MUST rechazar la creación de órdenes de compra dirigidas a proveedores inactivos.
- **FR-010**: El sistema MUST rechazar el envío (`SENT`) de una orden sin ítems.
- **FR-011**: Todas las operaciones de escritura MUST estar restringidas a OWNER y ADMIN. MANAGER tiene acceso de solo lectura a las órdenes de compra de su propia sucursal (`locationId`). STAFF no tiene acceso a órdenes de compra. Todos los roles pueden consultar el directorio de proveedores.
- **FR-012**: El sistema MUST aislar todos los datos por tenant (proveedor, asociaciones, órdenes) — un tenant no puede ver ni operar sobre los datos de otro.

### Functional Requirements — UI (Sprint 18)

- **FR-013**: La UI MUST mostrar el directorio de proveedores en una tabla paginada con búsqueda por nombre y filtro por estado (activo/inactivo).
- **FR-014**: Los usuarios OWNER y ADMIN MUST poder crear y editar proveedores desde un Sheet lateral sin abandonar la lista.
- **FR-015**: La UI MUST mostrar el detalle de un proveedor en página dedicada (`/inventory/suppliers/:id`) incluyendo sus datos de contacto y la lista de productos que provee.
- **FR-016**: Los usuarios OWNER y ADMIN MUST poder agregar y eliminar productos del catálogo de un proveedor desde la página de detalle, especificando precio de referencia.
- **FR-017**: La UI MUST mostrar la lista de órdenes de compra con filtros por estado y proveedor.
- **FR-018**: Los usuarios OWNER y ADMIN MUST poder crear órdenes de compra y agregar ítems desde la página de detalle de la orden (`/inventory/purchase-orders/:id`). El picker de productos muestra solo los productos del catálogo del proveedor seleccionado; si el producto no existe en ese catálogo, el usuario puede registrarlo inline en el mismo modal.
- **FR-018b**: Cada ítem agregado, editado o eliminado MUST persistirse inmediatamente en el servidor. Al recargar la página de una orden en `DRAFT`, el usuario ve el estado completo sin pérdida de progreso.
- **FR-019**: La UI MUST reflejar el total de la orden actualizado tras cada operación sobre ítems.
- **FR-020**: La UI MUST mostrar solo los controles de acción válidos según el estado actual de la orden (ej. "Enviar" solo en `DRAFT`, "Confirmar" solo en `SENT`, "Cancelar" solo en `DRAFT` o `SENT`).
- **FR-021**: MANAGER MUST ver las órdenes de su sucursal en modo de solo lectura; STAFF no tiene acceso a la sección de órdenes de compra. Ambos roles pueden ver el directorio de proveedores sin controles de escritura.

### Key Entities

- **Proveedor** (`Supplier`): Empresa o persona que abastece productos. Atributos: nombre (único por tenant), nombre de contacto, email, teléfono, dirección, notas, estado (`ACTIVE` / `INACTIVE`).
- **ProductoProveedor** (`SupplierProduct`): Relación entre un proveedor y un producto del catálogo. Atributos: precio unitario de referencia, días de entrega estimados. Única por par proveedor-producto.
- **OrdenDeCompra** (`PurchaseOrder`): Solicitud formal de mercancía a un proveedor para una sucursal. Atributos: proveedor, sucursal, estado, fecha esperada de entrega, notas, total calculado.
- **ÍtemDeOrden** (`PurchaseOrderItem`): Línea de una orden de compra. Atributos: producto, cantidad, precio unitario acordado, subtotal.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un administrador puede registrar un proveedor, asociarle productos y crear una orden de compra completa en menos de 3 minutos.
- **SC-002**: El flujo de estados de una orden de compra es predecible: las transiciones inválidas siempre retornan error con un mensaje claro.
- **SC-003**: El total de una orden se mantiene consistente en todo momento — cualquier cambio en ítems se refleja inmediatamente en el total.
- **SC-004**: Los datos de un tenant son completamente inaccesibles para otros tenants en todos los endpoints.
- **SC-005**: Las búsquedas y listados de proveedores y órdenes responden en menos de 1 segundo para catálogos de hasta 500 registros.
- **SC-006**: Un administrador puede crear una orden de compra completa (proveedor, ítems, envío) en menos de 3 minutos desde la interfaz.
- **SC-007**: El estado de una orden es siempre visible y los controles disponibles son inequívocamente correctos para ese estado — el usuario nunca ve un botón que resulta en error.

## Assumptions

- El estado `RECEIVED` en `PurchaseOrder` no se implementa en este sprint. El flujo de estados de Sprints 17/18 es: `DRAFT → SENT → CONFIRMED → CANCELLED`. Sprint 19 añadirá la transición `CONFIRMED → RECEIVED` al registrar una Compra con incremento de stock.
- La eliminación de proveedores no está permitida si tienen órdenes de compra asociadas (activas o históricas); solo se permite desactivar (`INACTIVE`).
- Los precios en `PurchaseOrderItem` son independientes del precio en `SupplierProduct` — el precio en el ítem es el precio acordado al momento de crear la orden y puede diferir del precio de referencia del catálogo de proveedor.
- Las órdenes de compra son visibles para todos los roles del tenant, pero solo OWNER y ADMIN pueden crearlas o cambiar su estado.
- Un producto puede estar asociado a múltiples proveedores, y un proveedor puede proveer múltiples productos.
- Los listados de proveedores muestran por defecto solo los activos; se requiere parámetro explícito para incluir inactivos.
- Las listas paginadas usan 20 registros por página por defecto.
- La UI sigue el patrón establecido en el proyecto: Server Component como shell de ruta + Client Component para interactividad. Los formularios de crear/editar se presentan en Sheet lateral; las confirmaciones simples (desactivar, cancelar orden) en Dialog.
- El detalle de proveedor y el detalle de orden de compra son páginas dedicadas (`/inventory/suppliers/:id`, `/inventory/purchase-orders/:id`), no drawers.
- Las rutas del módulo viven bajo `/inventory/suppliers/` y `/inventory/purchase-orders/` dentro del dashboard multi-tenant.
- No existe "auto-save" periódico: la persistencia ocurre en el momento exacto en que el usuario confirma cada acción (agregar ítem, editar ítem, eliminar ítem). El `DRAFT` no se pierde entre sesiones porque vive en servidor desde el primer `POST /api/purchase-orders`.
- Al agregar un ítem a una orden, el modal tiene dos pasos: (1) buscar/seleccionar producto del catálogo del proveedor, (2) si no existe, mostrar un sub-formulario inline para registrar el producto en ese proveedor (crea `SupplierProduct` con nombre y precio de referencia). Ambos pasos ocurren en el mismo modal sin navegación.
