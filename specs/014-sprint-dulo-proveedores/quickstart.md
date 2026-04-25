# Quickstart: Módulo 3 — Proveedores + Órdenes de Compra

**Phase 1 output** | 2026-04-24

## Flujo de integración principal

### Escenario 1 — Crear proveedor y asociarle productos

```
1. POST /api/suppliers
   body: { name: "MedPro SA", contact: "Juan López", phone: "33 1234 5678" }
   → 201 { id: "uuid-supplier", status: "ACTIVE", ... }

2. POST /api/suppliers/uuid-supplier/products
   body: { productId: "uuid-prod-1", price: 125.50, leadTimeDays: 3 }
   → 201 { id: "uuid-sp-1", productName: "Solución Salina", price: "125.50" }

3. GET /api/suppliers/uuid-supplier/products
   → [{ productName: "Solución Salina", price: "125.50", leadTimeDays: 3 }]
```

---

### Escenario 2 — Crear orden de compra y agregarle ítems

```
1. POST /api/purchase-orders
   body: { supplierId: "uuid-supplier", locationId: "uuid-loc", notes: "Pedido mensual" }
   → 201 { id: "uuid-order", status: "DRAFT", total: "0.00" }

2. POST /api/purchase-orders/uuid-order/items
   body: { productId: "uuid-prod-1", quantity: 10, unitPrice: 125.50 }
   → 201 { id: "uuid-item-1", subtotal: "1255.00" }
   → PurchaseOrder.total actualizado a "1255.00"

3. POST /api/purchase-orders/uuid-order/items
   body: { productId: "uuid-prod-2", quantity: 5, unitPrice: 80.00 }
   → 201 { subtotal: "400.00" }
   → PurchaseOrder.total actualizado a "1655.00"

4. GET /api/purchase-orders/uuid-order
   → { status: "DRAFT", total: "1655.00", items: [...2 ítems...] }
```

---

### Escenario 3 — Avanzar el estado de la orden

```
1. PATCH /api/purchase-orders/uuid-order  (DRAFT → SENT)
   body: { status: "SENT" }
   → 200 { status: "SENT" }
   → Ítems bloqueados para edición

2. PATCH /api/purchase-orders/uuid-order  (SENT → CONFIRMED)
   body: { status: "CONFIRMED" }
   → 200 { status: "CONFIRMED" }

3. PATCH /api/purchase-orders/uuid-order  (CONFIRMED → ?)
   body: { status: "CANCELLED" }
   → 422 { message: "Cannot cancel an order in CONFIRMED status" }
```

---

### Escenario 4 — Inline creation de SupplierProduct al agregar ítem

```
1. POST /api/purchase-orders/uuid-order/items
   body: { productId: "uuid-prod-nuevo", quantity: 3, unitPrice: 200.00 }
   (uuid-prod-nuevo NO existe en SupplierProduct para este proveedor)
   → El servicio crea automáticamente SupplierProduct { supplierId, productId, price: 200.00 }
   → 201 { id: "uuid-item-3", productId: "uuid-prod-nuevo", subtotal: "600.00" }
```

---

### Escenario 5 — Acceso por rol

```
# MANAGER (locationId: "uuid-loc-a")
GET /api/purchase-orders
→ Solo órdenes donde locationId = "uuid-loc-a"

GET /api/purchase-orders/uuid-order-de-otra-sucursal
→ 404 (no encontrado — RLS + filtro de aplicación)

POST /api/purchase-orders
→ 403 Forbidden

# STAFF
GET /api/purchase-orders
→ 403 Forbidden
```

---

## Casos de error

| Acción | Error esperado |
|---|---|
| `POST /api/suppliers` con nombre duplicado | 409 Conflict |
| `POST /api/suppliers/:id/products` con productId ya asociado | 409 Conflict |
| `POST /api/purchase-orders` con supplier INACTIVE | 422 Unprocessable |
| `PATCH /api/purchase-orders/:id { status: SENT }` sin ítems | 422 Unprocessable |
| `POST /api/purchase-orders/:id/items` con orden en SENT | 422 Unprocessable |
| Cancelar orden en CONFIRMED | 422 Unprocessable |
| MANAGER accede a orden de otra sucursal | 404 Not Found |
| STAFF accede a cualquier orden | 403 Forbidden |
