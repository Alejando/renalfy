# UI Contracts: Productos

## ProductsPageClient

```ts
interface ProductsPageClientProps {
  initialProducts: PaginatedProductsResponse
  categories: ProductCategoryResponse[]   // lista de categorías del tenant
  userRole: UserRole
}
```

Responsabilidades: tabla paginada, filtros de búsqueda + categoría + tipo de producto, apertura del drawer crear/editar, confirmación de eliminación.

---

## ProductDrawer

```ts
interface ProductDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product?: ProductResponse        // undefined = modo crear, definido = modo editar
  onSuccess: () => void
}
```

Usa `Sheet` de shadcn/ui. Internamente renderiza `ProductForm`.

---

## ProductForm

```ts
interface ProductFormProps {
  defaultValues?: Partial<CreateProductDto>
  categories: ProductCategoryResponse[]
  onCreateCategory: (name: string) => Promise<ProductCategoryResponse>  // inline creation
  onSubmit: (data: CreateProductDto | UpdateProductDto) => Promise<void>
  isSubmitting: boolean
}
```

Campos: `name` (required), `brand`, `productType` (required — RadioGroup: "Venta" | "Insumo"), `categoryId` (Combobox con inline creation — ver `CategoryCombobox`), `description`, `purchasePrice` (required), `salePrice` (required, prominent si `productType=SALE`), `packageQty`, `globalAlert`.

---

## CategoryCombobox

```ts
interface CategoryComboboxProps {
  categories: ProductCategoryResponse[]
  value: string | null
  onChange: (categoryId: string) => void
  onCreateCategory: (name: string) => Promise<ProductCategoryResponse>
}
```

Comportamiento: muestra categorías existentes como opciones. Si el texto escrito no coincide con ninguna, muestra "+ Crear categoría 'X'" al final de la lista. Al seleccionarlo, llama `onCreateCategory`, espera la respuesta y llama `onChange` con el nuevo `id`. No cierra el formulario padre.

---

## CategoriesPageClient (Settings > Categorías)

```ts
interface CategoriesPageClientProps {
  initialCategories: ProductCategoryResponse[]
  userRole: UserRole
}
```

Responsabilidades: lista de categorías del tenant, botón "Nueva categoría" (Dialog simple con un input de nombre), eliminación con confirmación (bloqueada si tiene productos asignados).

---

## ProductDetailPage (Server Component)

Renderiza la información del producto + `StockByLocationTable`.

```ts
// Props implícitas del App Router
// params: { slug: string; id: string }
```

---

## StockByLocationTable

```ts
interface StockByLocationTableProps {
  productId: string
  userRole: UserRole
  locationId?: string              // definido solo para MANAGER/STAFF
  onConfigureStock: (locationId: string) => void
}
```

Columnas: sucursal, cantidad, minStock, alertLevel, packageQty, estado (badge alerta). Botón "Configurar" visible solo para OWNER/ADMIN.
