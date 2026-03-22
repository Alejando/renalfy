# Feature Specification: UI — Pacientes + Tipos de Servicio

**Feature Branch**: `010-patients-service-types-ui`
**Created**: 2026-03-21
**Status**: Draft
**Input**: Sprint 10 — UI frontend para gestión de pacientes (lista paginada, registro con consentimiento, edición) y tipos de servicio (CRUD en configuración)

---

## Clarifications

### Session 2026-03-21

- Q: ¿El estado INACTIVE de paciente está en scope para este sprint? → A: No — solo se manejan ACTIVE y DELETED; INACTIVE queda explícitamente fuera de scope
- Q: ¿Cómo se dispara la búsqueda de pacientes? → A: Enter o botón "Buscar" explícito — no debounce automático
- Q: ¿Este sprint incluye página de detalle de paciente? → A: Sí — clic en el nombre navega a `/patients/:id` con datos completos del paciente

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Consultar y buscar pacientes (Priority: P1)

Un trabajador de la clínica necesita localizar rápidamente a un paciente para ver su información. Accede a la sección de Pacientes y ve una tabla con todos los pacientes de su sucursal. Puede buscar por nombre usando un campo de búsqueda que actualiza los resultados al navegar. Si hay muchos pacientes, puede paginar para ver más.

**Why this priority**: Sin la lista de pacientes, ninguna otra funcionalidad del módulo clínico tiene punto de entrada. Es la vista de mayor uso diario en la clínica.

**Independent Test**: Se puede testear completamente cargando la página de pacientes con datos mock y verificando que la tabla, el buscador y la paginación funcionan correctamente. Entrega valor inmediato como directorio de pacientes.

**Acceptance Scenarios**:

1. **Given** un usuario autenticado navega a Pacientes, **When** la página carga, **Then** ve una tabla con nombre, sucursal, fecha de nacimiento, teléfono y estado de cada paciente, ordenada por nombre
2. **Given** la lista está vacía, **When** la página carga, **Then** ve un estado vacío con mensaje "No hay pacientes registrados"
3. **Given** hay un error de conexión, **When** la página carga, **Then** ve un estado de error con mensaje descriptivo
4. **Given** el usuario escribe "López" en el buscador y presiona Enter o hace clic en "Buscar", **When** navega, **Then** la URL incluye `?search=López` y la tabla muestra solo pacientes cuyo nombre contiene "López"
5. **Given** hay más de 20 pacientes, **When** la página carga, **Then** ve controles de paginación y puede navegar a la página siguiente
6. **Given** el usuario es MANAGER o STAFF, **When** ve la lista, **Then** solo aparecen pacientes de su sucursal (sin filtro visible — el backend los restringe)

---

### User Story 2 — Registrar nuevo paciente con consentimiento (Priority: P1)

Un trabajador necesita ingresar a un nuevo paciente al sistema. Abre el formulario de registro, captura los datos del paciente y registra el consentimiento firmado (tipo de aviso y versión). Sin consentimiento activo no puede completar el registro.

**Why this priority**: El registro de pacientes es el primer paso para cualquier atención. Junto con la historia 1 forma el MVP del módulo clínico.

**Independent Test**: Se puede testear abriendo el drawer de creación, llenando el formulario con y sin consentimiento, y verificando validaciones y éxito de la operación.

**Acceptance Scenarios**:

1. **Given** el usuario hace clic en "Nuevo paciente", **When** el drawer abre, **Then** ve campos para nombre, fecha de nacimiento, teléfono, móvil, dirección, notas, tipo de consentimiento y versión del aviso
2. **Given** el usuario envía el formulario sin nombre, **When** intenta guardar, **Then** ve el mensaje "El nombre es obligatorio"
3. **Given** el usuario no selecciona tipo de consentimiento, **When** intenta guardar, **Then** ve el mensaje "El consentimiento es obligatorio"
4. **Given** el usuario es MANAGER o STAFF, **When** abre el formulario, **Then** el campo de sucursal no aparece — se asigna automáticamente a su sucursal
5. **Given** el usuario es OWNER o ADMIN, **When** abre el formulario, **Then** ve un selector de sucursal con todas las sucursales activas del tenant
6. **Given** el formulario está completo y válido, **When** el usuario guarda, **Then** el drawer se cierra y el nuevo paciente aparece en la lista sin recargar la página

---

### User Story 3 — Editar datos de un paciente (Priority: P2)

Un trabajador necesita actualizar los datos de contacto de un paciente existente (teléfono, dirección, notas). Abre el drawer de edición desde la fila del paciente, modifica los campos permitidos y guarda.

**Why this priority**: Los datos de los pacientes cambian con el tiempo. Esencial para mantener la información actualizada, aunque menos urgente que el registro inicial.

**Independent Test**: Se puede testear seleccionando un paciente de la lista y editando sus datos de contacto en el drawer.

**Acceptance Scenarios**:

1. **Given** el usuario hace clic en "Editar" en la fila de un paciente, **When** el drawer abre, **Then** ve los campos teléfono, móvil, dirección y notas pre-rellenos con los valores actuales; el nombre y la sucursal no son editables
2. **Given** el usuario modifica el teléfono y guarda, **When** la acción completa, **Then** el drawer se cierra y la fila del paciente muestra el teléfono actualizado
3. **Given** ocurre un error al guardar, **When** la acción falla, **Then** el drawer permanece abierto y muestra el mensaje de error recibido del servidor
4. **Given** el paciente tiene estado DELETED, **When** aparece en la lista (filtro activo), **Then** el botón "Editar" no está disponible para ese paciente

---

### User Story 4 — Dar de baja a un paciente (Priority: P3)

Un administrador necesita marcar a un paciente como inactivo o eliminado del sistema (baja lógica). El paciente queda registrado en el sistema pero deja de aparecer en la lista por defecto.

**Why this priority**: Funcionalidad administrativa de menor frecuencia. Los pacientes en alta activa son el caso predominante.

**Independent Test**: Se puede testear haciendo clic en "Dar de baja" sobre un paciente activo y verificando que desaparece de la lista estándar pero aparece al activar el filtro de eliminados.

**Acceptance Scenarios**:

1. **Given** el usuario es OWNER o ADMIN, **When** ve la lista de pacientes, **Then** cada fila activa tiene una opción "Dar de baja"
2. **Given** el usuario es MANAGER o STAFF, **When** ve la lista, **Then** no hay opción "Dar de baja" en ninguna fila
3. **Given** un OWNER confirma la baja de un paciente, **When** la acción completa, **Then** el paciente desaparece de la lista estándar
4. **Given** el usuario activa la opción "Mostrar eliminados", **When** la lista recarga, **Then** los pacientes con estado DELETED aparecen con un badge diferenciado y sin acciones de edición o baja

---

### User Story 5 — Ver detalle de un paciente (Priority: P2)

Un trabajador necesita ver el perfil completo de un paciente: todos sus datos de contacto, estado actual y consentimiento activo registrado. Hace clic en el nombre del paciente en la lista y navega a su página de detalle.

**Why this priority**: La página de detalle es el punto de entrada para los módulos de citas, mediciones y recibos que vienen en sprints posteriores. Construirla ahora con los datos del paciente sienta la estructura base.

**Independent Test**: Se puede testear cargando la ruta `/patients/:id` con un ID conocido y verificando que se muestran todos los datos del paciente y su consentimiento.

**Acceptance Scenarios**:

1. **Given** el usuario hace clic en el nombre de un paciente en la lista, **When** navega, **Then** llega a `/patients/:id` con el nombre, fecha de nacimiento, teléfono, móvil, dirección, notas, sucursal y estado del paciente visibles
2. **Given** el paciente tiene consentimiento activo, **When** la página carga, **Then** se muestra el tipo de consentimiento, versión y fecha de firma
3. **Given** el paciente no existe o no pertenece al tenant, **When** la página carga, **Then** se muestra una página de "Paciente no encontrado"
4. **Given** el usuario está en la página de detalle, **When** hace clic en "Editar", **Then** abre el drawer de edición de datos de contacto
5. **Given** el usuario es OWNER o ADMIN y está en el detalle de un paciente activo, **When** ve la página, **Then** ve la opción "Dar de baja"

---

### User Story 7 — Gestionar tipos de servicio (Priority: P2)

Un administrador necesita mantener el catálogo de servicios que ofrece la clínica (ej: "Hemodiálisis", "Consulta nefrológica"). Accede a Configuración > Tipos de Servicio, ve la lista y puede crear, editar y desactivar servicios.

**Why this priority**: Los tipos de servicio son necesarios para los recibos y citas. Se configura una vez y rara vez cambia, pero debe estar disponible antes del módulo de recibos.

**Independent Test**: Se puede testear completamente desde la sección de configuración: crear un tipo, editarlo y desactivarlo, sin necesidad de pacientes.

**Acceptance Scenarios**:

1. **Given** el usuario navega a Configuración > Tipos de Servicio, **When** la página carga, **Then** ve la lista de servicios con nombre, descripción, precio y estado (badge Activo/Inactivo)
2. **Given** el usuario hace clic en "Nuevo tipo de servicio", **When** el drawer abre, **Then** ve campos para nombre (obligatorio), descripción (opcional) y precio (opcional)
3. **Given** el usuario envía el formulario sin nombre, **When** intenta guardar, **Then** ve "El nombre es obligatorio"
4. **Given** el formulario es válido, **When** el usuario guarda, **Then** el nuevo tipo aparece en la lista
5. **Given** el usuario hace clic en "Editar" sobre un tipo, **When** el drawer abre, **Then** los campos están pre-rellenos con los valores actuales
6. **Given** el usuario hace clic en "Desactivar" sobre un tipo activo, **When** confirma, **Then** el badge cambia a "Inactivo" y el botón pasa a "Activar"
7. **Given** el usuario es MANAGER o STAFF, **When** navega a Configuración, **Then** no ve la opción "Tipos de Servicio" en el menú lateral de configuración

---

### Edge Cases

- ¿Qué pasa si la búsqueda no encuentra resultados? → Mostrar EmptyState con el texto de búsqueda actual
- ¿Qué pasa si el servidor rechaza el registro por email duplicado u otro conflicto? → El drawer muestra el mensaje de error del servidor sin cerrarse
- ¿Qué pasa si un OWNER intenta registrar un paciente sin seleccionar sucursal? → Validación en formulario: "La sucursal es obligatoria"
- ¿Qué pasa si el precio del tipo de servicio ingresado no es numérico? → Validación: "El precio debe ser un número positivo"
- ¿Qué pasa si se intenta desactivar el único tipo de servicio activo? → La acción procede normalmente (sin restricción en el backend)
- ¿Qué pasa si la sesión expira mientras el drawer está abierto? → El error del servidor se muestra en el drawer y el usuario puede re-autenticarse

---

## Requirements *(mandatory)*

### Functional Requirements

**Pacientes — Lista y búsqueda**

- **FR-001**: El sistema DEBE mostrar la lista de pacientes en una tabla paginada con un máximo de 20 registros por página
- **FR-002**: El sistema DEBE permitir buscar pacientes por nombre mediante un campo de texto con botón "Buscar" explícito (o tecla Enter); el término de búsqueda se propaga como parámetro en la URL para permitir compartir y navegar con el historial del navegador — no se usa debounce automático
- **FR-003**: El sistema DEBE ocultar por defecto los pacientes con estado DELETED y ofrecer un control para incluirlos visualmente. El estado INACTIVE está fuera de scope en este sprint — si el backend devuelve pacientes INACTIVE, se muestran visualmente igual que ACTIVE (sin acción para asignarlo desde la UI)
- **FR-004**: La tabla DEBE mostrar por paciente: nombre, sucursal, fecha de nacimiento, teléfono y estado con badge de color diferenciado
- **FR-005**: Los usuarios MANAGER y STAFF DEBEN ver únicamente los pacientes de su sucursal asignada (restricción aplicada en el servidor, invisible en la UI)

**Pacientes — Creación**

- **FR-006**: El formulario de creación DEBE requerir nombre y al menos un consentimiento (tipo + versión del aviso de privacidad)
- **FR-007**: Para usuarios OWNER y ADMIN, el formulario DEBE incluir un selector de sucursal; para MANAGER y STAFF, la sucursal se asigna automáticamente sin selector visible
- **FR-008**: Tras crear un paciente exitosamente, la lista DEBE actualizarse automáticamente sin recargar la página completa

**Pacientes — Edición**

- **FR-009**: El formulario de edición DEBE permitir modificar únicamente teléfono, móvil, dirección y notas; el nombre y la sucursal no son editables
- **FR-010**: La opción de editar DEBE estar deshabilitada para pacientes con estado DELETED

**Pacientes — Detalle**

- **FR-010b**: El nombre del paciente en la tabla DEBE ser un enlace que navega a `/patients/:id`
- **FR-010c**: La página de detalle DEBE mostrar todos los campos del paciente (nombre, fecha de nacimiento, teléfono, móvil, dirección, notas, sucursal, estado) y el consentimiento activo (tipo, versión, fecha de firma)
- **FR-010d**: La página de detalle DEBE incluir el botón "Editar" que abre el drawer de edición de datos de contacto
- **FR-010e**: Si el paciente no existe o no pertenece al tenant del usuario, la página DEBE mostrar un estado de "Paciente no encontrado"

**Pacientes — Baja lógica**

- **FR-011**: La acción de dar de baja DEBE estar disponible únicamente para usuarios con rol OWNER o ADMIN
- **FR-012**: La baja DEBE ser lógica (el registro persiste con estado DELETED), nunca una eliminación permanente

**Tipos de servicio**

- **FR-013**: El catálogo de tipos de servicio DEBE gestionarse dentro de la sección Configuración, accesible desde el menú lateral de settings
- **FR-014**: El sistema DEBE mostrar cada tipo de servicio con: nombre, descripción, precio y estado (Activo/Inactivo)
- **FR-015**: El formulario de creación/edición DEBE requerir nombre y aceptar descripción y precio como opcionales
- **FR-016**: El sistema DEBE permitir alternar el estado de un tipo de servicio entre Activo e Inactivo desde la tabla, sin abrir el drawer
- **FR-017**: Las acciones de crear, editar y desactivar tipos de servicio DEBEN estar restringidas a roles OWNER y ADMIN; MANAGER y STAFF no ven estas opciones ni el enlace en el menú
- **FR-018**: Tras cualquier mutación (creación, edición, cambio de estado), la lista DEBE actualizarse automáticamente

### Key Entities

- **Paciente**: representa a una persona atendida por la clínica. Atributos visibles: nombre, fecha de nacimiento, teléfono, móvil, dirección, notas, estado (ACTIVE/INACTIVE/DELETED), sucursal. Requiere al menos un consentimiento activo para ser creado.
- **Consentimiento**: registro de aceptación de aviso de privacidad o tratamiento por parte del paciente. Atributos: tipo (aviso de privacidad, tratamiento, compartir datos), versión del documento. Es parte del formulario de creación del paciente.
- **Tipo de servicio**: categoría de atención ofrecida por la clínica (ej: Hemodiálisis, Consulta). Atributos: nombre, descripción, precio, estado (ACTIVE/INACTIVE). Alcance a nivel de tenant (visible en todas las sucursales).

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un trabajador puede registrar un nuevo paciente con consentimiento en menos de 2 minutos desde que abre el formulario hasta que aparece en la lista
- **SC-002**: La búsqueda de pacientes por nombre produce resultados visibles en menos de 1 segundo tras la navegación
- **SC-003**: La lista de pacientes carga en menos de 2 segundos en condiciones normales de red
- **SC-004**: Un OWNER o ADMIN puede crear, editar y desactivar un tipo de servicio sin abandonar la sección de Configuración
- **SC-005**: Los cambios en pacientes y tipos de servicio se reflejan en la lista inmediatamente tras confirmar la acción, sin acción manual del usuario
- **SC-006**: El 100% de los intentos de crear un paciente sin consentimiento son bloqueados con mensaje claro antes de llegar al servidor
- **SC-007**: La página de detalle de un paciente carga en menos de 2 segundos y muestra todos sus datos incluyendo el consentimiento activo

---

## Out of Scope

- Gestión del estado INACTIVE de pacientes: no hay acción en la UI para suspender/reactivar un paciente en estado INACTIVE; queda pendiente para un sprint posterior

---

## Assumptions

- La paginación de pacientes se refleja como `?page=N&search=término` en la URL para soportar navegación con historial del navegador
- El consentimiento inicial usa PRIVACY_NOTICE como tipo por defecto y "1.0" como versión por defecto en el formulario (el usuario puede cambiarlos)
- El toggle de "Mostrar eliminados" no se refleja en la URL (estado local del cliente)
- El sidebar de configuración ya existe; este sprint solo agrega el enlace "Tipos de Servicio" al menú lateral existente
- Los tipos de servicio no requieren paginación (volumen esperado < 50 registros por tenant)
- El precio del tipo de servicio se ingresa en pesos mexicanos (MXN) sin selector de moneda
- No se implementa confirmación modal para la baja de pacientes en este sprint; la acción es directa (puede revisarse en sprint posterior)
