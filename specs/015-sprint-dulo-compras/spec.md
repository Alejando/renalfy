# Feature Specification: Módulo de Compras y Movimientos de Inventario

**Feature Branch**: `015-sprint-dulo-compras`  
**Created**: 2026-04-27  
**Status**: Draft  
**Input**: Sprint 19 — Recepción de órdenes de compra confirmadas con conversión de empaque a unidades de stock, actualización atómica de stock e historial de movimientos de inventario.

## Assumptions

- El flujo previo (crear orden, agregarle ítems, cambiarla a SENT y luego CONFIRMED) ya existe y funciona (Sprints 17-18).
- Cada ítem de la orden tiene una cantidad en empaque (p. ej. cajas) y puede definir cuántas unidades individuales hay por empaque.
- El stock de la clínica siempre se mide en **unidades individuales** (p. ej. bolsas de solución), no en empaques.
- Un mismo producto puede comprarse en presentaciones distintas en diferentes órdenes (ej. cajas de 10 vs. cajas de 100); por eso la conversión se define por línea de orden, no por producto.
- La recepción parcial es común en clínicas: llegan menos cajas de las pedidas por daño en tránsito, escasez, etc.
- Los roles con acceso a compras son: OWNER, ADMIN y MANAGER. STAFF no tiene acceso.
- MANAGER solo gestiona y ve compras de su sucursal asignada.
- Una vez registrada, una recepción de compra es inmutable (no se puede editar ni eliminar).

## Clarifications

### Session 2026-04-28

- Q: ¿Qué estados de orden permiten registrar una nueva recepción? → A: Tanto Confirmada como Recibida permiten recepciones. La orden pasa a Recibida tras la primera recepción parcial pero sigue aceptando envíos adicionales del mismo proveedor.
- Q: ¿Cómo se valida que no se reciba más mercancía de la ordenada con múltiples recepciones? → A: Validación acumulada — la suma de todas las recepciones del mismo ítem no puede superar la cantidad ordenada.
- Q: ¿Qué ocurre si se intenta cancelar una orden en estado Recibida? → A: Bloqueado — las órdenes en estado Recibida no pueden cancelarse. Solo las órdenes en estado Confirmada (sin ninguna recepción registrada aún) pueden cancelarse.
- Q: Cuando la suma acumulada de recepciones alcanza exactamente el 100% de la cantidad ordenada, ¿qué estado queda la orden? → A: La orden transiciona automáticamente a "Completada". En ese estado ya no acepta más recepciones y la relación con el proveedor queda cerrada.
- Q: ¿Cómo cierra el administrador una orden parcialmente recibida cuando el proveedor confirma que el saldo no llegará? → A: Se agrega una acción "Cerrar con saldo pendiente" que transiciona la orden a estado "Cerrada" sin revertir el stock ya recibido. Queda registro explícito de que el faltante fue reconocido.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Registrar recepción de mercancía (Priority: P1)

Un administrador o encargado de sucursal verifica la mercancía que llega del proveedor y registra en el sistema cuántos empaques recibió de cada producto y a qué precio. El sistema actualiza el inventario de la sucursal automáticamente.

**Why this priority**: Es el núcleo del módulo. Sin poder registrar recepciones no hay control de inventario. Todo lo demás depende de que esta acción funcione.

**Independent Test**: Se puede probar completamente registrando una recepción contra una orden confirmada y verificando que el stock de la sucursal refleja las unidades correctas. Entrega valor inmediato: el inventario queda actualizado.

**Acceptance Scenarios**:

1. **Given** una orden de compra en estado Confirmada con 10 cajas de "Solución de diálisis" (100 unidades/caja), **When** el encargado registra la recepción de las 10 cajas, **Then** el inventario de la sucursal aumenta en 1,000 unidades de "Solución de diálisis".

2. **Given** una orden confirmada con múltiples productos, **When** el encargado registra la recepción especificando precio y cantidad por producto, **Then** el sistema calcula el monto total de la compra y lo guarda con los detalles de cada línea.

3. **Given** una orden confirmada, **When** el encargado selecciona "Recibir mercancía", **Then** el sistema muestra los productos esperados con sus cantidades para que el encargado confirme o ajuste lo recibido.

4. **Given** una orden en estado Borrador o Enviada (no Confirmada), **When** alguien intenta registrar una recepción, **Then** el sistema rechaza la operación con un mensaje claro indicando que la orden debe estar Confirmada.

5. **Given** un usuario con rol STAFF, **When** intenta acceder al módulo de compras, **Then** el sistema niega el acceso.

6. **Given** un MANAGER de la Sucursal A, **When** intenta registrar recepción de una orden asignada a la Sucursal B, **Then** el sistema niega el acceso con mensaje de acceso no autorizado.

---

### User Story 2 — Recepción parcial de mercancía (Priority: P1)

El encargado de la sucursal recibe menos empaques de los ordenados porque llegaron dañados, hubo escasez o el proveedor envió incompleto. Registra solo lo que llegó y el sistema actualiza el stock con esa cantidad parcial.

**Why this priority**: Es una situación frecuente en clínicas de diálisis donde el abasto puede ser irregular. Bloquear la recepción parcial generaría desincronización entre el inventario real y el sistema.

**Independent Test**: Se puede probar registrando 7 de 10 cajas pedidas y verificando que el stock aumentó con las unidades correspondientes a 7 cajas, no a 10.

**Acceptance Scenarios**:

1. **Given** una orden confirmada de 10 cajas (100 unidades/caja), **When** el encargado registra recepción de solo 7 cajas, **Then** el inventario aumenta en 700 unidades (no 1,000) y la compra queda registrada con 7 cajas recibidas de 10 ordenadas.

2. **Given** una recepción parcial ya registrada, **When** el encargado realiza una segunda recepción del saldo pendiente (3 cajas), **Then** el inventario vuelve a aumentar en 300 unidades acumulando el total correcto.

3. **Given** una orden confirmada, **When** el encargado intenta registrar recepción de 11 cajas cuando solo se ordenaron 10, **Then** el sistema rechaza la operación con un mensaje indicando que no se puede recibir más de lo ordenado.

---

### User Story 3 — Conversión de empaque a unidades individuales (Priority: P1)

El proveedor vende por caja pero la clínica consume por unidad. Al registrar la recepción, el encargado especifica cuántas unidades individuales tiene cada caja. El sistema convierte automáticamente y registra el stock en unidades.

**Why this priority**: Sin esta conversión el inventario sería inútil: reportaría "10 cajas" en lugar de "1,000 unidades", y la clínica no sabría cuántos días de tratamiento tiene disponibles.

**Independent Test**: Se puede probar registrando 10 cajas con 100 unidades/caja y verificando que el inventario muestra 1,000 unidades, no 10.

**Acceptance Scenarios**:

1. **Given** una recepción con 5 cajas y factor de conversión 50 unidades/caja, **When** se guarda la recepción, **Then** el inventario registra 250 unidades nuevas para ese producto.

2. **Given** el mismo producto comprado en dos órdenes distintas (una vez cajas de 10, otra vez cajas de 100), **When** se registran ambas recepciones, **Then** el inventario refleja la suma correcta en unidades individuales de ambas recepciones.

3. **Given** un producto recibido sin especificar factor de conversión, **When** se guarda la recepción, **Then** el sistema asume 1 unidad por empaque (recibe tal cual).

---

### User Story 4 — Consultar historial de compras (Priority: P2)

El administrador necesita revisar qué se ha comprado, cuándo, a qué precio y en qué sucursal, para auditoría, análisis de gasto y control de proveedores.

**Why this priority**: El historial permite trazabilidad y es requisito para auditorías. Sin él, las recepciones quedarían sin registro consultable.

**Independent Test**: Se pueden registrar 3 compras y verificar que el listado las muestra con filtros funcionales por proveedor, sucursal y fecha.

**Acceptance Scenarios**:

1. **Given** varias compras registradas, **When** el administrador accede al listado de compras, **Then** ve todas las compras del tenant ordenadas por fecha, con proveedor, sucursal, monto total y número de ítems.

2. **Given** el listado de compras, **When** el administrador filtra por proveedor, **Then** solo ve las compras de ese proveedor.

3. **Given** el listado de compras, **When** el administrador selecciona una compra, **Then** ve el detalle completo: cada producto recibido, cantidad ordenada, cantidad recibida, unidades por empaque, precio unitario, impuesto y subtotal.

4. **Given** un MANAGER de Sucursal A, **When** accede al listado de compras, **Then** solo ve compras de su sucursal (no de otras).

---

### User Story 5 — Consultar movimientos de inventario (Priority: P2)

El administrador puede ver el historial completo de cambios en el inventario: entradas por compras, con referencia al documento de origen, fecha y cantidad en unidades individuales.

**Why this priority**: Permite auditar el inventario y rastrear el origen de cada cambio de stock. Necesario para cuadres y detección de inconsistencias.

**Independent Test**: Se puede verificar que al registrar una recepción se crea automáticamente un movimiento de tipo Entrada, con la cantidad en unidades individuales y referencia a la compra.

**Acceptance Scenarios**:

1. **Given** una recepción de 10 cajas × 100 unidades registrada, **When** el administrador consulta los movimientos de inventario, **Then** aparece un movimiento de tipo Entrada con 1,000 unidades y referencia a la compra correspondiente.

2. **Given** movimientos de múltiples tipos y sucursales, **When** el administrador filtra por sucursal, producto o tipo, **Then** solo ve los movimientos que cumplen el filtro.

3. **Given** un movimiento de inventario, **When** el administrador lo selecciona, **Then** ve el detalle con cada producto, cantidad en unidades y referencia al documento de origen.

---

### Edge Cases

- ¿Qué ocurre si la transacción falla a mitad del proceso (stock actualizado pero movimiento no creado)? El sistema debe revertir todos los cambios — el inventario nunca debe quedar en estado inconsistente.
- ¿Qué pasa si el mismo producto está en dos líneas de la misma orden? El sistema debe acumular el stock correctamente para ambas líneas.
- ¿Qué ocurre si el producto no tiene stock previo en esa sucursal? El sistema debe crear el registro de stock con la cantidad recibida.
- ¿Qué pasa si el factor de conversión es 0 o negativo? El sistema debe rechazar la operación con validación.
- ¿Cuántas recepciones parciales puede tener una orden? Sin límite; cada una crea un registro de compra independiente mientras la orden esté en estado Confirmada o Recibida.
- ¿Se puede cancelar una orden que ya tiene recepciones registradas? No — las órdenes en estado Recibida no se pueden cancelar. Solo las órdenes en Confirmada (sin ninguna recepción) son cancelables.
- ¿Qué pasa si el proveedor definitivamente no puede entregar el saldo de una orden parcialmente recibida? El administrador usa la acción "Cerrar con saldo pendiente": la orden pasa a Cerrada, el stock recibido se conserva, y queda trazabilidad del faltante reconocido.
- Ciclo de vida completo de estados de una orden: Borrador → Enviada → Confirmada → Recibida (primera recepción parcial) → Completada (auto, al 100%) o Cerrada (manual, saldo pendiente). Cancelada solo desde Confirmada sin recepciones.
- ¿Qué pasa si se filtran compras por un rango de fechas sin resultados? El sistema devuelve lista vacía, no error.
- ¿Qué ocurre si el precio especificado al recibir difiere del precio en la orden? El precio de la recepción tiene precedencia — es el precio real pagado.

---

## Requirements *(mandatory)*

### Functional Requirements

**Recepción de mercancía:**

- **FR-001**: El sistema DEBE permitir registrar la recepción de una orden de compra que esté en estado Confirmada, especificando para cada producto: cantidad recibida (en empaques), unidades por empaque, precio unitario e impuesto.
- **FR-002**: El sistema DEBE permitir registrar recepciones contra órdenes en estado Confirmada o Recibida. Al procesar la primera recepción de una orden Confirmada, la orden transiciona automáticamente a Recibida. Las recepciones posteriores requieren que la orden esté en estado Recibida. Cuando la suma acumulada de todos los ítems alcanza el 100% de la cantidad ordenada, la orden transiciona automáticamente a Completada y deja de aceptar más recepciones. Órdenes en cualquier otro estado (Borrador, Enviada, Cancelada, Completada) son rechazadas con mensaje descriptivo.
- **FR-003**: El sistema DEBE validar acumulativamente que la suma de todas las cantidades recibidas de un mismo ítem (a través de múltiples recepciones) no supere la cantidad ordenada. Al registrar una nueva recepción, el sistema suma las cantidades ya recibidas en recepciones anteriores y rechaza si el total propuesto excede lo ordenado, con mensaje que indica cuánto queda disponible por recibir.
- **FR-004**: El sistema DEBE calcular el stock agregado como `cantidad_recibida × unidades_por_empaque` por cada línea de producto.
- **FR-005**: El sistema DEBE actualizar el inventario de la sucursal en unidades individuales, nunca en empaques.
- **FR-006**: El sistema DEBE crear o incrementar el registro de inventario para el producto en la sucursal correspondiente; si no existe, lo crea con la cantidad recibida.
- **FR-007**: El sistema DEBE calcular el monto total de la compra como la suma de `(cantidad_recibida × precio_unitario) + impuesto` por cada línea.
- **FR-008**: El sistema DEBE registrar al usuario que realizó la recepción y la fecha/hora.
- **FR-009**: Todas las operaciones de una recepción (stock, movimiento de inventario, cambio de estado de orden) DEBEN ejecutarse de forma atómica — si alguna falla, ningún cambio persiste.
- **FR-018**: El sistema DEBE ofrecer una acción "Cerrar con saldo pendiente" disponible para órdenes en estado Recibida con recepciones parciales. Al ejecutarla, la orden transiciona a estado Cerrada definitivamente y deja de aceptar más recepciones. El stock ya recibido no se revierte. El usuario debe confirmar la acción antes de ejecutarla.
- **FR-019**: Los estados finales de una orden de compra son Completada (100% recibido automáticamente), Cerrada (cierre manual con saldo pendiente) y Cancelada (sin ninguna recepción). Ningún estado final acepta más recepciones ni puede revertirse.

**Control de acceso:**

- **FR-010**: El sistema DEBE negar acceso al módulo de compras a usuarios con rol STAFF.
- **FR-011**: El sistema DEBE restringir a usuarios con rol MANAGER para que solo puedan registrar y consultar compras de su sucursal asignada.
- **FR-012**: Usuarios con rol OWNER o ADMIN DEBEN poder registrar y consultar compras de cualquier sucursal del tenant.

**Movimientos de inventario:**

- **FR-013**: El sistema DEBE crear automáticamente un registro de movimiento de tipo Entrada al procesar una recepción, con la cantidad en unidades individuales (ya convertida) y referencia al documento de compra.
- **FR-014**: Los movimientos de inventario DEBEN ser de solo lectura — no se pueden crear, editar ni eliminar manualmente.
- **FR-015**: El sistema DEBE permitir filtrar movimientos por sucursal, tipo (Entrada/Salida), producto y rango de fechas.

**Consulta de compras:**

- **FR-016**: El sistema DEBE ofrecer un listado paginado de compras con filtros por proveedor, sucursal y rango de fechas.
- **FR-017**: El sistema DEBE mostrar el detalle de cada compra incluyendo: todos los ítems con cantidad ordenada, cantidad recibida, unidades por empaque, precio, impuesto, subtotal e información del producto.

### Key Entities

- **Compra (Purchase)**: Registro de una recepción de mercancía. Vinculada a una orden de compra, un proveedor, una sucursal y el usuario que la registró. Contiene el monto total y la fecha de recepción. Inmutable una vez creada. Una orden puede tener múltiples compras (recepciones parciales).

- **Estado de Orden de Compra**: Ciclo de vida completo — Borrador → Enviada → Confirmada → Recibida (primera recepción) → Completada (100% recibido, automático) o Cerrada (saldo pendiente, acción manual). Solo Confirmada sin recepciones puede Cancelarse. Los estados Completada, Cerrada y Cancelada son finales e irreversibles.

- **Ítem de compra (PurchaseItem)**: Línea dentro de una compra. Registra el producto, cantidad ordenada en empaques, cantidad efectivamente recibida en empaques, unidades por empaque, precio unitario, impuesto y subtotal. La cantidad en unidades de stock es `quantityReceived × unitsPerPackage`.

- **Stock por sucursal (LocationStock)**: Inventario actual de un producto en una sucursal, siempre en unidades individuales. Se incrementa con cada recepción. Si no existe el registro para ese producto+sucursal, se crea automáticamente.

- **Movimiento de inventario (InventoryMovement)**: Registro histórico de un cambio en el stock. Tipo Entrada para compras. Contiene referencia al documento origen, sucursal, fecha y lista de productos con cantidades en unidades individuales.

- **Ítem de movimiento (InventoryMovementItem)**: Línea de un movimiento. Registra el producto y la cantidad en unidades individuales afectada.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El encargado puede registrar la recepción de una orden completa en menos de 2 minutos, desde que abre el formulario hasta que el inventario queda actualizado.
- **SC-002**: El inventario de la sucursal refleja las unidades individuales correctas inmediatamente después de registrar la recepción, sin necesidad de acción adicional.
- **SC-003**: El sistema no permite ningún estado inconsistente: si la operación falla, el inventario y los registros quedan exactamente como estaban antes.
- **SC-004**: 100% de las recepciones generan automáticamente su movimiento de inventario correspondiente, sin intervención manual.
- **SC-005**: El filtrado en el listado de compras devuelve resultados en menos de 3 segundos para conjuntos de hasta 10,000 registros.
- **SC-006**: Los usuarios con rol MANAGER nunca pueden ver ni modificar datos de sucursales distintas a la suya, validado en el 100% de los escenarios de prueba de aislamiento.
- **SC-007**: La conversión empaque→unidades es siempre exacta: `cantidad_recibida × unidades_por_empaque`, sin redondeos ni pérdida de precisión para valores enteros.
- **SC-008**: El historial de movimientos permite rastrear el origen de cualquier cambio de inventario hasta el documento de compra específico, en menos de 30 segundos de búsqueda.
