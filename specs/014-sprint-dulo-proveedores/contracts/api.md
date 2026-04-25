# API Contracts: Proveedores + Órdenes de Compra

## Suppliers

### `GET /api/suppliers`
Lista paginada de proveedores del tenant.

**Query**: `page`, `limit`, `search`, `includeInactive`
**Roles**: Todos
**Response**: `PaginatedResponse<SupplierResponse>`

---

### `POST /api/suppliers`
Crea un nuevo proveedor.

**Roles**: OWNER, ADMIN
**Body**: `CreateSupplierDto`
**Response**: `SupplierResponse` (201)
**Errors**: 409 si nombre duplicado en el tenant

---

### `GET /api/suppliers/:id`
Detalle de un proveedor.

**Roles**: Todos
**Response**: `SupplierResponse`
**Errors**: 404 si no existe

---

### `PATCH /api/suppliers/:id`
Actualiza datos o estado de un proveedor.

**Roles**: OWNER, ADMIN
**Body**: `UpdateSupplierDto` (parcial, incluye `status`)
**Response**: `SupplierResponse`
**Errors**: 404, 409 si nombre duplicado

---

### `GET /api/suppliers/:id/products`
Lista de productos del proveedor con precio de referencia.

**Roles**: Todos
**Response**: `SupplierProductResponse[]`

---

### `POST /api/suppliers/:id/products`
Asocia un producto al proveedor con precio de referencia.

**Roles**: OWNER, ADMIN
**Body**: `CreateSupplierProductDto` (`productId`, `price`, `leadTimeDays?`)
**Response**: `SupplierProductResponse` (201)
**Errors**: 409 si ya existe la asociación, 404 si producto no existe

---

### `PATCH /api/suppliers/:supplierId/products/:productId`
Actualiza precio o leadTimeDays de la asociación.

**Roles**: OWNER, ADMIN
**Body**: `UpdateSupplierProductDto`
**Response**: `SupplierProductResponse`

---

### `DELETE /api/suppliers/:supplierId/products/:productId`
Elimina la asociación proveedor-producto.

**Roles**: OWNER, ADMIN
**Response**: 204
**Errors**: 404 si no existe

---

### `GET /api/products/:id/suppliers`
Lista de proveedores que ofrecen un producto dado.

**Roles**: Todos
**Response**: `SupplierProductResponse[]`

---

## Purchase Orders

### `GET /api/purchase-orders`
Lista paginada de órdenes de compra.

**Query**: `page`, `limit`, `supplierId`, `locationId`, `status`, `search`
**Roles**: OWNER/ADMIN → todas las órdenes del tenant; MANAGER → solo órdenes de su `locationId`; STAFF → 403
**Response**: `PaginatedResponse<PurchaseOrderResponse>`

---

### `POST /api/purchase-orders`
Crea una nueva orden en estado `DRAFT`.

**Roles**: OWNER, ADMIN
**Body**: `CreatePurchaseOrderDto` (`supplierId`, `locationId`, `expectedDate?`, `notes?`)
**Response**: `PurchaseOrderResponse` (201)
**Errors**: 404 si supplier no existe, 422 si supplier está INACTIVE

---

### `GET /api/purchase-orders/:id`
Detalle de una orden con sus ítems.

**Roles**: OWNER/ADMIN → cualquier orden; MANAGER → solo su locationId; STAFF → 403
**Response**: `PurchaseOrderDetailResponse`
**Errors**: 404

---

### `PATCH /api/purchase-orders/:id`
Actualiza campos editables (solo en DRAFT) o avanza el estado.

**Roles**: OWNER, ADMIN
**Body**: `UpdatePurchaseOrderDto` (`notes?`, `expectedDate?`) o `{ status: 'SENT' | 'CONFIRMED' | 'CANCELLED' }`
**Response**: `PurchaseOrderResponse`
**Errors**:
- 422 si transición de estado inválida
- 422 si `status: SENT` y la orden no tiene ítems
- 422 si intenta editar campos de una orden que no está en DRAFT

---

### `POST /api/purchase-orders/:id/items`
Agrega un ítem a la orden. Solo permitido en `DRAFT`.
Si el producto no está en el catálogo del proveedor, crea el `SupplierProduct` automáticamente.

**Roles**: OWNER, ADMIN
**Body**: `AddPurchaseOrderItemDto` (`productId`, `quantity`, `unitPrice`)
**Response**: `PurchaseOrderItemResponse` (201)
**Errors**:
- 422 si la orden no está en DRAFT
- 404 si el producto no existe
- 409 si el producto ya está en la orden (usar PATCH en su lugar)

---

### `PATCH /api/purchase-orders/:orderId/items/:itemId`
Actualiza cantidad o precio de un ítem. Solo en `DRAFT`.

**Roles**: OWNER, ADMIN
**Body**: `UpdatePurchaseOrderItemDto`
**Response**: `PurchaseOrderItemResponse`
**Errors**: 422 si la orden no está en DRAFT

---

### `DELETE /api/purchase-orders/:orderId/items/:itemId`
Elimina un ítem de la orden. Solo en `DRAFT`. Recalcula el total.

**Roles**: OWNER, ADMIN
**Response**: 204
**Errors**: 422 si la orden no está en DRAFT
