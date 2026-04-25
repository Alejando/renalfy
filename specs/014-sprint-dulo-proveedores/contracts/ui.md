# UI Contracts: Proveedores + Órdenes de Compra

## SuppliersPageClient

```ts
interface SuppliersPageClientProps {
  initialSuppliers: PaginatedResponse<SupplierResponse>
  userRole: UserRole
}
```

Responsabilidades: tabla paginada con búsqueda y filtro activo/inactivo, apertura de Sheet crear/editar, confirmación de desactivación (Dialog).

---

## SupplierDrawer

```ts
interface SupplierDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplier?: SupplierResponse   // undefined = modo crear
  onSuccess: () => void
}
```

Usa `Sheet` de shadcn/ui. Renderiza `SupplierForm`.

---

## SupplierForm

```ts
interface SupplierFormProps {
  defaultValues?: Partial<CreateSupplierDto>
  onSubmit: (data: CreateSupplierDto | UpdateSupplierDto) => Promise<void>
  isSubmitting: boolean
}
```

Campos: `name` (required), `initials`, `contact`, `phone`, `email`, `address`, `notes`.

---

## SupplierDetailClient (página `/inventory/suppliers/:id`)

```ts
interface SupplierDetailClientProps {
  supplier: SupplierResponse
  supplierProducts: SupplierProductResponse[]
  allProducts: ProductResponse[]   // catálogo completo para el picker
  userRole: UserRole
}
```

Responsabilidades: muestra datos del proveedor, tabla de productos asociados con precio, botón "Agregar producto" (Dialog), eliminar asociación (Dialog de confirmación).

---

## AddSupplierProductDialog

```ts
interface AddSupplierProductDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplierId: string
  existingProductIds: string[]   // para excluir del picker los ya asociados
  allProducts: ProductResponse[]
  onSuccess: (newEntry: SupplierProductResponse) => void
}
```

Comportamiento: Combobox de productos (filtra por nombre, excluye ya asociados), campo `price` (required), campo `leadTimeDays` (opcional).

---

## PurchaseOrdersPageClient

```ts
interface PurchaseOrdersPageClientProps {
  initialOrders: PaginatedResponse<PurchaseOrderResponse>
  suppliers: SupplierResponse[]   // para filtro y formulario de nueva orden
  userRole: UserRole
  userLocationId: string | null
}
```

Responsabilidades: tabla paginada con filtros por estado/proveedor, botón "Nueva orden" (navega a `/inventory/purchase-orders/new` o abre Dialog para seleccionar proveedor+sucursal y crea la orden redirigiendo al detalle).

---

## PurchaseOrderDetailClient (página `/inventory/purchase-orders/:id`)

```ts
interface PurchaseOrderDetailClientProps {
  order: PurchaseOrderDetailResponse
  supplierProducts: SupplierProductResponse[]  // productos del proveedor para el picker
  allProducts: ProductResponse[]               // catálogo completo para inline creation
  userRole: UserRole
}
```

Responsabilidades: muestra cabecera de la orden (proveedor, sucursal, estado, total, fecha), tabla de ítems, botón "Agregar producto" (Dialog), editar/eliminar ítems (solo DRAFT), botones de transición de estado (Enviar / Confirmar / Cancelar según estado actual).

---

## AddOrderItemDialog

```ts
interface AddOrderItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderId: string
  supplierId: string
  supplierProducts: SupplierProductResponse[]
  allProducts: ProductResponse[]
  onSuccess: (item: PurchaseOrderItemResponse) => void
}
```

Comportamiento:
1. Paso 1 — Picker: lista los productos del proveedor (`supplierProducts`) con precio pre-llenado. Búsqueda por nombre. Si el texto no coincide con ningún producto del proveedor, muestra "+ Agregar '[X]' al proveedor".
2. Al seleccionar "+ Agregar al proveedor": muestra sub-formulario inline con `price` (required) y `leadTimeDays` (opcional). Al confirmar, crea el `SupplierProduct` y continúa al paso de cantidad.
3. Paso 2 — Cantidad: campos `quantity` (required, int ≥ 1) y `unitPrice` (pre-llenado desde `SupplierProduct.price`, editable).
4. Al guardar: llama `POST /api/purchase-orders/:id/items`, cierra el dialog, actualiza la lista de ítems y el total mostrado.

---

## PurchaseOrderStatusBadge

```ts
interface PurchaseOrderStatusBadgeProps {
  status: 'DRAFT' | 'SENT' | 'CONFIRMED' | 'CANCELLED'
}
```

| Estado | Variante |
|---|---|
| DRAFT | outline |
| SENT | status-pending |
| CONFIRMED | status-active |
| CANCELLED | destructive |
