# Quickstart: Escenarios de integración — UI Módulo 3

**Phase 1 output** | 2026-04-24

Estos escenarios validan las 5 user stories de extremo a extremo, como un tester haría manualmente o como guía para tests de integración.

---

## Escenario 1: Flujo de catálogo de productos (US1 — P1)

**Prerequisito**: Usuario autenticado como OWNER o ADMIN.

1. Navegar a `/inventory/products`
2. **Verificar**: tabla muestra columnas nombre, marca, categoría, precio compra, precio venta
3. Escribir en el buscador → tabla filtra en tiempo real
4. Seleccionar una categoría del dropdown → tabla filtra
5. Clic en "Nuevo producto" → Sheet se abre
6. Completar: nombre="Bicarbonato", purchasePrice="45.00", salePrice="60.00" → Guardar
7. **Verificar**: Sheet se cierra, "Bicarbonato" aparece en la tabla
8. Clic en ícono de editar de "Bicarbonato" → Sheet se abre con datos precargados
9. Cambiar salePrice a "65.00" → Guardar
10. **Verificar**: precio actualizado en la tabla
11. Clic en ícono de eliminar → Dialog de confirmación
12. Confirmar → "Bicarbonato" desaparece de la tabla

**Rol MANAGER**: repetir pasos 1-2; verificar que no hay botones de crear/editar/eliminar.

---

## Escenario 2: Detalle de producto con stock (US2 — P2)

**Prerequisito**: Existe al menos un producto con stock configurado en una o más sucursales.

1. Navegar a `/inventory/products`
2. Clic en nombre de un producto con stock bajo en alguna sucursal
3. **Verificar**: navegación a `/inventory/products/:id`
4. **Verificar**: sección de datos del producto (nombre, marca, precios, packageQty, globalAlert)
5. **Verificar**: tabla de stock por sucursal con columnas: sucursal, cantidad, minStock, alertLevel, estado
6. **Verificar**: la sucursal con `isBelowAlert=true` muestra Badge "Stock bajo"
7. **Rol MANAGER**: acceder al mismo detalle → solo aparece su propia sucursal en la tabla de stock

---

## Escenario 3: Lista y ajuste de stock (US3 — P3)

**Prerequisito**: OWNER autenticado, múltiples sucursales con stock.

1. Navegar a `/inventory/stock`
2. **Verificar**: selector de sucursal disponible, tabla muestra todas las sucursales
3. Activar filtro "Solo stock bajo" → tabla muestra solo filas con `isBelowAlert=true`
4. Buscar por nombre de producto → tabla filtra
5. Clic en ícono de ajuste de una fila → Dialog se abre
6. Seleccionar modo "Establecer cantidad exacta", ingresar 50 → Guardar
7. **Verificar**: Dialog se cierra, cantidad en la fila actualizada a 50
8. Clic en ajuste nuevamente, modo "Sumar / Restar", ingresar -10 → Guardar
9. **Verificar**: cantidad actualizada a 40

**Rol MANAGER**:
1. Navegar a `/inventory/stock`
2. **Verificar**: no hay selector de sucursal; solo aparece su sucursal
3. **Verificar**: no hay botones de ajuste

---

## Escenario 4: Configurar stock por sucursal (US4 — P4)

**Prerequisito**: ADMIN autenticado, producto sin stock en una sucursal.

1. Navegar a `/inventory/products/:id` de un producto que no tiene stock en "Sucursal Norte"
2. Clic en "Configurar stock" en la fila de "Sucursal Norte"
3. **Verificar**: Sheet se abre con `locationId` preseleccionado y deshabilitado
4. Ingresar `minStock=5`, `alertLevel=10` → Guardar
5. **Verificar**: Sheet se cierra, "Sucursal Norte" aparece en la tabla con quantity=0, minStock=5, alertLevel=10
6. Volver a "Configurar stock" en la misma fila → Sheet se abre con valores existentes
7. Cambiar `alertLevel=15` → Guardar
8. **Verificar**: fila actualizada, sin duplicado

---

## Escenario 5: Resumen ejecutivo (US5 — P5)

**Prerequisito**: OWNER autenticado.

1. Navegar a `/inventory/summary`
2. **Verificar**: tabla con columnas: producto, cantidad total, estado de alerta
3. Productos con `isAnyLocationBelowAlert=true` muestran Badge "Alerta activa"
4. Activar filtro "Solo con alerta" → tabla filtra
5. Clic en fila de un producto → desglose de sucursales se expande (accordion)
6. **Verificar**: desglose muestra nombre de sucursal, cantidad, alertLevel, estado

**Rol MANAGER**: navegar a `/inventory/summary` → redirigido a `/inventory/products`.

---

## Casos de error a validar

| Caso | Comportamiento esperado |
|---|---|
| Eliminar producto con stock | Error del backend → Toast "No se puede eliminar: el producto tiene stock registrado" |
| Ajuste DELTA que resulta en cantidad negativa | Error del backend → mensaje de validación en el Dialog |
| Sin productos en catálogo | Empty state con CTA "Crear primer producto" |
| Sin stock configurado en sucursal | Fila con "Sin configurar" o estado vacío claro |
| Red caída durante mutación | Toast de error genérico, estado de UI no cambia |
