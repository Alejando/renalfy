# Data Model: UI — Módulo 3: Productos y Stock

**Phase 1 output** | 2026-04-24

Los tipos provienen de `@repo/types` (Sprint 15). No se crean schemas nuevos en este sprint.

---

## Nuevas entidades (backend additions)

### ProductType (enum)

```ts
// Añadir a packages/types/src/enums.ts
enum ProductType {
  SALE       // Producto de venta — aparece en módulo de Ventas
  CONSUMABLE // Insumo de sesión — aparece en formulario de Cita
}
```

### ProductCategory

```ts
// Nueva tabla en Prisma + schema en @repo/types
{
  id: string          // UUID
  tenantId: string    // UUID — RLS aplicado
  name: string        // único por tenant
  createdAt: Date
  updatedAt: Date
}
```

Endpoints nuevos:
- `GET /api/product-categories` — lista de categorías del tenant (todos los roles)
- `POST /api/product-categories` — crear categoría (OWNER/ADMIN)
- `DELETE /api/product-categories/:id` — eliminar si no tiene productos (OWNER/ADMIN)

---

## Entidades del frontend

### Product (`ProductResponse`)

```ts
// @repo/types — ProductResponseSchema (actualizado)
{
  id: string              // UUID
  tenantId: string        // UUID — filtrado por backend
  name: string
  brand: string | null
  productType: 'SALE' | 'CONSUMABLE'   // ← NUEVO
  categoryId: string | null             // ← FK a ProductCategory (reemplaza category string)
  categoryName: string | null           // ← desnormalizado para display
  description: string | null
  purchasePrice: string   // decimal como string, ej. "125.50"
  salePrice: string
  packageQty: number      // unidades por paquete (global)
  globalAlert: number     // nivel de alerta global
  createdAt: Date
  updatedAt: Date
}
```

### ProductDetail (`ProductDetailResponse`)

Extiende `ProductResponse` con:

```ts
stock: {
  id: string
  quantity: number
  minStock: number
  alertLevel: number
  effectiveAlertLevel: number   // max(alertLevel, globalAlert) si alertLevel=0
  isBelowAlert: boolean
  packageQty: number | null     // override local; null → hereda globalAlert del producto
  effectivePackageQty: number
} | null
```

> Cuando el request lo hace MANAGER/STAFF, `stock` refleja solo su sucursal. OWNER/ADMIN reciben null si no especifican `locationId` en query.

### LocationStock (`LocationStockResponse`)

```ts
{
  id: string
  tenantId: string
  locationId: string
  productId: string
  quantity: number
  minStock: number
  alertLevel: number
  packageQty: number | null
  productName: string
  productBrand: string | null
  productCategory: string | null
  locationName: string | null
  effectiveAlertLevel: number
  isBelowAlert: boolean
  effectivePackageQty: number
}
```

### StockSummaryItem (`StockSummaryItem`)

```ts
{
  productId: string
  productName: string
  totalQuantity: number
  isAnyLocationBelowAlert: boolean
  locationBreakdown: Array<{
    locationId: string
    locationName: string
    quantity: number
    alertLevel: number
    effectiveAlertLevel: number
    isBelowAlert: boolean
  }>
}
```

---

## Listas paginadas

Todos los endpoints de lista retornan:

```ts
{
  data: T[]
  total: number
  page: number
  limit: number
}
```

---

## Parámetros de query relevantes para el frontend

### Productos (`ProductQuerySchema`)
- `page`, `limit` (default 20)
- `search` — búsqueda por nombre
- `categoryId` — filtro por categoría (reemplaza el `category` string anterior)
- `productType` — filtro por tipo (`SALE` | `CONSUMABLE`) ← NUEVO
- `sortBy`: `'name' | 'purchasePrice' | 'salePrice'` (default `'name'`)
- `sortOrder`: `'asc' | 'desc'`

### Stock (`StockQuerySchema`)
- `page`, `limit`
- `locationId` — filtra por sucursal (OWNER/ADMIN)
- `onlyLowStock` — filtra por `isBelowAlert`
- `search` — búsqueda por nombre de producto

### Resumen de stock (`StockSummaryQuerySchema`)
- `page`, `limit`
- `isAnyLocationBelowAlert` — solo productos con alguna sucursal en alerta

---

## Mutaciones

| Acción | Método + Endpoint | Roles |
|---|---|---|
| Crear categoría | `POST /api/product-categories` | OWNER, ADMIN |
| Listar categorías | `GET /api/product-categories` | Todos |
| Eliminar categoría | `DELETE /api/product-categories/:id` | OWNER, ADMIN |
| Crear producto | `POST /api/products` body incluye `productType` y `categoryId` | OWNER, ADMIN |
| Editar producto | `PATCH /api/products/:id` | OWNER, ADMIN |
| Eliminar producto | `DELETE /api/products/:id` | OWNER, ADMIN |
| Configurar stock (upsert) | `PUT /api/stock/by-location` | Todos (scoped por rol) |
| Ajustar cantidad SET | `PATCH /api/stock/:id/quantity` body: `{adjustmentType:'SET', quantity:N}` | OWNER, ADMIN |
| Ajustar cantidad DELTA | `PATCH /api/stock/:id/quantity` body: `{adjustmentType:'DELTA', delta:N}` | OWNER, ADMIN |

---

## Visibilidad por rol

| Vista | OWNER/ADMIN | MANAGER | STAFF |
|---|---|---|---|
| Lista productos | Lectura + escritura | Solo lectura | Solo lectura |
| Detalle producto | Todas las sucursales | Solo su sucursal | Solo su sucursal |
| Lista stock | Todas las sucursales | Solo su sucursal | Solo su sucursal |
| Ajustar cantidad | ✓ | ✗ | ✗ |
| Configurar stock | ✓ | ✗ (solo lectura) | ✗ |
| Resumen ejecutivo | ✓ | ✗ (redirigir) | ✗ (redirigir) |
