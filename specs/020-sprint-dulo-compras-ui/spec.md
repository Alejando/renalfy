# Feature Specification: UI del Módulo de Compras y Movimientos de Inventario

**Feature Branch**: `020-sprint-dulo-compras-ui`  
**Created**: 2026-04-29  
**Status**: Draft  
**Input**: Sprint 19 backend (recepción de compras, actualización de stock, movimientos de inventario) ya implementado. Necesita UI para: detalle de compra, listado de movimientos, completar tests.

## Assumptions

- El backend de Sprint 19 (crear/recibir compras, manejar stock, movimientos) está completo y funciona correctamente
- El formulario de recepción de ítems (`receive-items-form.tsx`) existe y es funcional
- El listado de compras existe pero el botón de detalles está deshabilitado
- Los schemas Zod en `@repo/types` ya incluyen los tipos para compras y movimientos (ReceivePurchaseOrderDto, etc.)
- La autenticación y autorización por tenant/location ya están en lugar
- Tailwind CSS v4 + shadcn/ui están configurados

## Clarifications

### Session 2026-04-29

- Q: ¿Qué información debe mostrar el detalle de compra? → A: Encabezado con orden de compra (ID, proveedor, sucursal, fecha, estado), tabla de ítems recibidos (producto, cantidad ordenada, cantidad recibida, unidades/empaque, precio, impuesto, subtotal) y monto total
- Q: ¿Hay un límite de registros en el listado de movimientos? → A: Paginado de 20 registros por página, con filtros por sucursal, tipo, producto y rango de fechas
- Q: ¿El movimiento de inventario se crea automáticamente al recibir una compra? → A: Sí, es automático en el backend. La UI solo debe listarlo y permitir consulta, no crear manualmente
- Q: ¿Pueden editarse los detalles de una compra registrada? → A: No, las compras son inmutables una vez creadas. Solo mostrar en lectura

---

## User Scenarios & Testing

### User Story 1 — Ver detalles de una compra registrada (Priority: P1)

El administrador necesita ver todos los detalles de una compra que ya fue registrada: qué productos llegaron, en qué cantidad, a qué precio y el monto total. Esto es necesario para auditoría, conciliación con factura del proveedor, y para resolver discrepancias.

**Why this priority**: Sin poder consultar detalles de compras, no hay forma de verificar qué se compró y a qué precio. Es requisito fundamental para control.

**Independent Test**: Se puede ver el detalles de una compra y verificar que muestra todos los ítems, cantidades, precios e impuestos correctamente.

**Acceptance Scenarios**:

1. **Given** una compra registrada de 5 cajas × 100 unidades de "Solución de diálisis" a $500 cada una, **When** el administrador abre la página de detalles de la compra, **Then** ve la tabla con: Solución de diálisis | 10 cajas | 5 cajas | 100 unidades/caja | $500 | IVA | Subtotal.

2. **Given** una compra con múltiples productos, **When** el administrador ve el detalle, **Then** la tabla muestra todos los productos en orden, y el monto total al pie refleja la suma correcta.

3. **Given** un MANAGER de Sucursal A, **When** intenta ver detalles de una compra de Sucursal B, **Then** el sistema niega el acceso con mensaje "No tienes permiso para ver compras de otra sucursal".

4. **Given** una compra, **When** el administrador intenta editar un precio o cantidad, **Then** la acción no es posible — el detalle es de solo lectura con un mensaje "Las compras registradas no se pueden editar".

---

### User Story 2 — Consultar movimientos de inventario (Priority: P1)

El administrador consulta el historial de cambios en el stock: cada entrada (por compra), cada salida (por venta/movimiento), con referencia al documento de origen, fecha y cantidad. Esto permite auditar y rastrear el inventario.

**Why this priority**: Sin historial de movimientos, no hay trazabilidad. Es requisito para cuadres de inventario y detección de inconsistencias.

**Independent Test**: Se puede listar los movimientos de inventario, filtrar por sucursal/tipo/producto, y verificar que cada movimiento refiere al documento de origen.

**Acceptance Scenarios**:

1. **Given** varias compras registradas en la sucursal, **When** el administrador accede al listado de movimientos de inventario, **Then** ve todos los movimientos de tipo Entrada con: producto, cantidad en unidades, tipo (Entrada), fecha, documento origen (PURCHASE-{id}), sucursal.

2. **Given** movimientos de múltiples tipos y sucursales, **When** el administrador filtra por sucursal, **Then** solo ve los movimientos de esa sucursal.

3. **Given** el listado de movimientos, **When** filtra por tipo = "Entrada", **Then** ve solo movimientos generados por compras (no salidas por venta).

4. **Given** un movimiento en el listado, **When** el administrador hace clic en el documento origen (ej: PURCHASE-123), **Then** navega a los detalles de esa compra.

5. **Given** un MANAGER de Sucursal A, **When** consulta movimientos, **Then** solo ve los movimientos de su sucursal.

6. **Given** el listado vacío de movimientos, **When** intenta filtrar por un rango de fechas sin resultados, **Then** muestra "Sin movimientos para los criterios seleccionados".

---

### User Story 3 — Recibir mercancía parcialmente (Flujo completo UI + backend) (Priority: P1)

El encargado de la sucursal abre una orden de compra confirmada, usa el diálogo de recepción para registrar los ítems recibidos (posiblemente menos de lo ordenado), confirma la acción, y el sistema actualiza automáticamente el inventario y crea el movimiento. La orden transiciona a Recibida.

**Why this priority**: Es el flujo principal de ingreso de stock. Sin poder completarlo en UI, el usuario no puede usar el sistema.

**Independent Test**: Registrar una recepción desde UI (abrir orden → diálogo → rellenar → enviar) y verificar que el inventario se actualiza y aparece un movimiento.

**Acceptance Scenarios**:

1. **Given** una orden de compra en estado CONFIRMED, **When** el encargado abre la orden y hace clic en "Recibir mercancía", **Then** se abre un diálogo/modal con los ítems esperados precargados.

2. **Given** el diálogo de recepción, **When** el encargado ajusta las cantidades recibidas y hace clic en "Guardar", **Then** el diálogo cierra, la orden pasa a estado RECEIVED, y aparece un mensaje de éxito.

3. **Given** una recepción exitosa, **When** el administrador consulta el inventario de la sucursal, **Then** el stock del producto ha aumentado en las unidades correctas (cantidad_recibida × unidades_por_empaque).

4. **Given** una recepción registrada, **When** el administrador consulta movimientos de inventario, **Then** aparece un movimiento de tipo Entrada con la referencia a la compra.

---

### User Story 4 — Cerrar una orden con saldo pendiente (Priority: P2)

El administrador tiene una orden que llegó incompleta y el proveedor confirmó que no enviará el saldo. Desde la página de detalles de la orden (estado RECEIVED), usa la acción "Cerrar con saldo pendiente", confirma, y la orden transiciona a CLOSED. El inventario recibido se mantiene, y queda registro del cierre.

**Why this priority**: Permite cerrar órdenes incompletas de forma ordenada, necesario cuando hay scasez o incidentes de proveedores.

**Independent Test**: Cerrar una orden con saldo pendiente y verificar que su estado pasa a CLOSED.

**Acceptance Scenarios**:

1. **Given** una orden en estado RECEIVED con una recepción parcial (ej: 7 de 10 cajas), **When** el administrador hace clic en "Cerrar con saldo pendiente", **Then** se abre un diálogo pidiendo confirmación.

2. **Given** el diálogo de confirmación, **When** el usuario confirma, **Then** la orden pasa a estado CLOSED y aparece un mensaje de éxito.

3. **Given** una orden CLOSED, **When** intenta recibir más mercancía o modificarla, **Then** el sistema rechaza la acción con "Esta orden está cerrada".

---

## Requirements

### Functional Requirements

**Página de detalles de compra (Purchase Detail Page):**

- **FR-001**: El sistema DEBE mostrar el encabezado de la compra: ID de orden, proveedor, sucursal, fecha de recepción, estado de la orden.
- **FR-002**: El sistema DEBE mostrar una tabla de ítems recibidos con: producto, cantidad ordenada, cantidad recibida, unidades por empaque, precio unitario, impuesto, subtotal.
- **FR-003**: El sistema DEBE calcular y mostrar el monto total de la compra (suma de subtotales).
- **FR-004**: El sistema DEBE permitir que usuarios con rol MANAGER solo vean compras de su sucursal; OWNER/ADMIN ven todas.
- **FR-005**: El sistema DEBE mostrar la página de detalles como de solo lectura — sin botones de editar o eliminar.
- **FR-006**: El sistema DEBE estar diseñada responsivamente para móvil, tablet y desktop.

**Listado de movimientos de inventario (Inventory Movements Page):**

- **FR-007**: El sistema DEBE mostrar un listado paginado de movimientos con: producto, cantidad en unidades, tipo (Entrada/Salida), fecha, documento origen, sucursal.
- **FR-008**: El sistema DEBE permitir filtrar por: sucursal, tipo de movimiento, producto, rango de fechas.
- **FR-009**: El sistema DEBE mostrar "Sin movimientos" si no hay resultados.
- **FR-010**: El sistema DEBE hacer que el documento origen sea un link navegable al detalle de la compra/venta correspondiente.
- **FR-011**: El sistema DEBE restringir a MANAGER para que solo vea movimientos de su sucursal.
- **FR-012**: El sistema DEBE mostrar 20 registros por página.

**Flujo de recepción completo (ya existe parcialmente, completar si falta):**

- **FR-013**: El botón "Recibir mercancía" en la página de detalle de orden DEBE abrir un diálogo con el formulario de recepción.
- **FR-014**: Al enviar el formulario, el sistema DEBE actualizar el estado de la orden de CONFIRMED → RECEIVED (primera recepción) o mantener RECEIVED (recepciones posteriores).
- **FR-015**: El sistema DEBE crear automáticamente un movimiento de inventario de tipo Entrada.
- **FR-016**: El sistema DEBE mostrar un mensaje de éxito y cerrar el diálogo tras registro exitoso.

**Acción "Cerrar con saldo pendiente":**

- **FR-017**: El sistema DEBE mostrar la acción "Cerrar con saldo pendiente" en el detalle de orden cuando el estado es RECEIVED.
- **FR-018**: Al activar la acción, el sistema DEBE pedir confirmación con un diálogo.
- **FR-019**: Al confirmar, la orden transiciona a CLOSED y se muestra un mensaje de éxito.
- **FR-020**: Las órdenes CLOSED no pueden recibir más mercancía ni modificarse.

### Control de acceso:

- **FR-021**: Todos los endpoints deben validar que el usuario tiene rol OWNER, ADMIN o MANAGER (no STAFF).
- **FR-022**: MANAGER solo puede ver/actuar sobre órdenes de su locationId asignada.

### UI/UX:

- **FR-023**: Las páginas DEBEN usar componentes shadcn/ui y estilos Tailwind CSS v4.
- **FR-024**: DEBEN ser responsive: móvil (320px+), tablet (768px+), desktop (1024px+).
- **FR-025**: Los botones de acciones peligrosas (Cerrar orden) DEBEN pedir confirmación.
- **FR-026**: Los formularios DEBEN mostrar errores de validación claros.

### Testing:

- **FR-027**: Todos los componentes DEBEN tener tests unitarios usando Vitest + React Testing Library.
- **FR-028**: Los E2E tests en el backend DEBEN cubrir el flujo completo recibir → inventario actualizado → movimiento creado.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: El usuario puede ver detalles de una compra en menos de 2 segundos tras cargar la página.
- **SC-002**: El listado de movimientos carga y filtra 1000+ registros en menos de 3 segundos.
- **SC-003**: 100% de los componentes tienen tests que pasan con Vitest.
- **SC-004**: El flujo de recepción completo (abrir orden → recibir → inventario actualizado) funciona en menos de 5 segundos.
- **SC-005**: Los usuarios con rol MANAGER nunca pueden ver datos de otras sucursales.
- **SC-006**: Las páginas son navegables y utilizables en pantallas de 320px (móvil).
- **SC-007**: No hay errores de TypeScript — `pnpm check-types` pasa limpio.
- **SC-008**: No hay warnings de linting — `pnpm lint` pasa limpio.
