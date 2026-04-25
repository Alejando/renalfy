# UI Contracts: Stock

## StockPageClient

```ts
interface StockPageClientProps {
  initialStock: PaginatedStockResponse
  locations: Array<{ id: string; name: string }>  // solo para OWNER/ADMIN
  userRole: UserRole
  userLocationId?: string           // definido para MANAGER/STAFF
}
```

Responsabilidades: tabla paginada de stock, filtro por sucursal (solo OWNER/ADMIN), filtro stock bajo, búsqueda por producto, apertura de drawers.

---

## StockAdjustDrawer

```ts
interface StockAdjustDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  stockRecord: LocationStockResponse  // el registro a ajustar
  onSuccess: () => void
}
```

Usa `Dialog` de shadcn/ui. Presenta dos modos en la misma UI:
- **SET**: campo numérico "Establecer cantidad exacta"
- **DELTA**: campo numérico con signo "Sumar / Restar"

Un `SegmentedControl` o dos `RadioGroup` items seleccionan el modo.

---

## StockConfigDrawer

```ts
interface StockConfigDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  productId: string
  productName: string
  locationId?: string              // pre-seleccionado si viene del detalle del producto
  locations: Array<{ id: string; name: string }>
  existingConfig?: LocationStockResponse   // undefined = crear, definido = editar
  onSuccess: () => void
}
```

Usa `Sheet` de shadcn/ui. Campos: `locationId` (Select, deshabilitado si pre-seleccionado), `minStock`, `alertLevel`, `packageQty` (opcional).

---

## SummaryPageClient

```ts
interface SummaryPageClientProps {
  initialSummary: PaginatedStockSummaryResponse
  userRole: UserRole             // siempre OWNER o ADMIN (MANAGER/STAFF redirigidos)
}
```

Responsabilidades: tabla de resumen con expansión de fila (accordion) mostrando `locationBreakdown`, filtro "Solo con alerta activa", paginación.

---

## LowStockBadge (componente compartido en nivel de ruta)

```ts
interface LowStockBadgeProps {
  isBelowAlert: boolean
}
```

Renderiza `<Badge variant="destructive">Stock bajo</Badge>` si `isBelowAlert`, o nada si no. Usado en todas las tablas del módulo.
