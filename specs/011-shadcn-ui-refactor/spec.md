# Spec: Sprint 11 — Refactorizacion UI (shadcn/ui + Design System)

## Overview

Reemplazar todos los componentes Tailwind custom (drawers manuales, inputs nativos, selects nativos, tablas HTML, badges inline, botones con `style={}`) por primitivos de shadcn/ui (Base UI / Radix), manteniendo la identidad visual del design system "The Clinical Curator".

El objetivo es doble:

1. **Consistencia:** un unico set de componentes con accesibilidad built-in (focus management, keyboard nav, aria attributes, animations)
2. **Velocidad:** las pantallas futuras (citas, recibos, planes, inventario, ventas, cortes de caja) se construyen sobre primitivos ya probados en lugar de copiar/pegar clases Tailwind

## Scope

### Incluido

- Instalar componentes shadcn/ui necesarios: `Sheet`, `Input`, `Label`, `Textarea`, `Select`, `Badge`, `Table`, `Separator`, `Card`, `Breadcrumb`, `Pagination`
- Mapear las variables CSS de shadcn (`:root`) a los tokens del design system "The Clinical Curator"
- Migrar los 4 drawers custom a `Sheet` (side panel)
- Migrar todos los inputs/selects/textareas nativos a los primitivos shadcn
- Migrar las tablas HTML a `Table` de shadcn
- Migrar los badges de estado inline a `Badge` de shadcn con variantes custom
- Migrar todos los `<button>` inline a `Button` de shadcn (ya instalado)
- Migrar las cards (detail page, empty state) a `Card` de shadcn
- Actualizar tests que se rompan por cambios en estructura DOM
- Eliminar el componente `packages/ui/src/button.tsx` (duplicado inutil)

### Excluido

- Dark mode (el design system es light-only)
- Nuevas funcionalidades (no se agrega logica de negocio)
- Cambios en server actions, API, o schemas de `@repo/types`
- Paginas de auth (login, change password) — se tratan en sprint separado
- Dashboard layout / sidebar principal — no se toca
- `EmptyState` y `ErrorState` — se pulen estilisticamente pero no se reemplazan por un componente shadcn (no existe equivalente)
- `SettingsNav` — se mantiene custom (nav de sidebar sin equivalente directo)

---

## Design System: Token Mapping

### Problema

El CSS actual tiene **dos sistemas de variables en conflicto**:

1. **Tokens Material Design 3** en `@theme {}` — usados por todos los componentes actuales (`text-primary`, `bg-surface-container-lowest`, `text-on-surface`, etc.)
2. **Variables shadcn** en `:root {}` — generadas por `shadcn init` con valores oklch neutrales por defecto (`--primary`, `--secondary`, `--foreground`, etc.)

Los componentes shadcn (Button, AlertDialog) usan las variables de `:root` (`bg-primary`, `text-primary-foreground`). Los componentes custom usan los tokens de `@theme`. Resultado: dos paletas visuales distintas que no coinciden.

### Solucion

Reescribir las variables de `:root` para que apunten a los valores del design system "The Clinical Curator". Esto hace que los componentes shadcn hereden automaticamente la paleta correcta sin modificar sus clases internas.

**Mapeo de tokens:**

| Variable shadcn (`:root`) | Valor "The Clinical Curator" | Uso |
|---|---|---|
| `--background` | `#f7f9fb` (surface) | Fondo base de pagina |
| `--foreground` | `#191c1e` (on-surface) | Texto principal |
| `--card` | `#ffffff` (surface-container-lowest) | Fondo de cards |
| `--card-foreground` | `#191c1e` (on-surface) | Texto en cards |
| `--popover` | `#ffffff` | Fondo de popover/sheet |
| `--popover-foreground` | `#191c1e` | Texto en popover/sheet |
| `--primary` | `#00647c` (primary) | Botones primarios, links activos |
| `--primary-foreground` | `#ffffff` (on-primary) | Texto sobre botones primarios |
| `--secondary` | `#e3e1ec` (secondary-container) | Botones secundarios (bg) |
| `--secondary-foreground` | `#5d5e66` (secondary) | Texto en botones secundarios |
| `--muted` | `#f2f4f6` (surface-container-low) | Fondos muted, headers de tabla |
| `--muted-foreground` | `#5d5e66` (secondary) | Texto secundario/muted |
| `--accent` | `#f2f4f6` (surface-container-low) | Hover states |
| `--accent-foreground` | `#191c1e` (on-surface) | Texto en hover |
| `--destructive` | `#ba1a1a` (error) | Acciones destructivas |
| `--border` | `#bdc8ce` (outline-variant) | Bordes (ghost borders) |
| `--input` | `#e0e3e5` (surface-container-highest) | Fondo de inputs |
| `--ring` | `#00647c` (primary) | Focus ring |
| `--radius` | `0.375rem` | Border radius (ROUND_FOUR) |

### Coexistencia de ambos sistemas

Los tokens de `@theme {}` (Material Design 3) se **mantienen** porque son usados por componentes custom que no se migran en este sprint (SettingsNav, EmptyState, ErrorState) y por clases utility directas en el layout del dashboard. Los componentes shadcn solo consultan las variables de `:root`, asi que no hay conflicto siempre que los valores esten alineados.

---

## Inventario de Componentes a Migrar

### 1. Drawers -> Sheet

| Archivo actual | Primitivo shadcn | Notas |
|---|---|---|
| `settings/locations/location-drawer.tsx` | `Sheet` (side="right") | 3 campos: nombre, direccion, telefono |
| `settings/users/user-drawer.tsx` | `Sheet` (side="right") | 6 campos, select condicional por rol |
| `patients/patient-drawer.tsx` | `Sheet` (side="right") | 8+ campos, seccion consentimiento |
| `settings/service-types/service-type-drawer.tsx` | `Sheet` (side="right") | 3 campos: nombre, descripcion, precio |

**Patron actual (x4 archivos):**
- Render condicional `if (!open) return null`
- Backdrop custom con `bg-inverse-surface/20`
- `<aside>` con `role="dialog"` manual
- Escape handler manual con `addEventListener`
- Close button custom "X"

**Patron nuevo (Sheet):**
- `<Sheet open={open} onOpenChange={onClose}>` controla visibilidad
- `<SheetContent side="right">` renderiza el panel
- Focus trap, Escape, overlay click — todo built-in
- `<SheetHeader>`, `<SheetTitle>`, `<SheetDescription>` para header
- `<SheetClose>` para boton de cerrar

**Beneficio:** se eliminan ~30 lineas de boilerplate por drawer (backdrop, escape handler, close button, render condicional).

### 2. Inputs nativos -> Input + Label

| Patron actual | Primitivo shadcn |
|---|---|
| `<label className="block text-[10px] font-label...">` | `<Label>` con clase custom |
| `<input className="w-full bg-surface-container-highest...">` | `<Input>` |
| `<textarea className="w-full bg-surface-container-highest...">` | `<Textarea>` |
| `<select className="w-full bg-surface-container-highest...">` | `<Select>` + `<SelectTrigger>` + `<SelectContent>` + `<SelectItem>` |

**Clases repetidas que se eliminan:** `w-full bg-surface-container-highest border-none rounded-md px-4 py-3 text-on-surface placeholder:text-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all` (aparece 23 veces en el codebase).

**Nota sobre Select:** shadcn `Select` es un portal-based dropdown (Radix), no un `<select>` nativo. Esto mejora la UX (mejor estilizacion, keyboard nav) pero cambia la estructura DOM. Los tests que usan `screen.getByRole('combobox')` en lugar de `screen.getByRole('listbox')` necesitaran ajuste.

### 3. Tablas HTML -> Table

| Archivo actual | Columnas |
|---|---|
| `locations/locations-page-client.tsx` | nombre, direccion, telefono, estado, acciones |
| `users/users-page-client.tsx` | nombre, email, rol, sucursal, estado, acciones |
| `patients/patients-page-client.tsx` | nombre, sucursal, nacimiento, telefono, estado, acciones |
| `service-types/service-types-page-client.tsx` | nombre, descripcion, precio, estado, acciones |

**Patron actual:** `<table>` + `<thead>` + `<tr>` + `<th>` con clases repetidas.

**Patron nuevo:** `<Table>` + `<TableHeader>` + `<TableRow>` + `<TableHead>` + `<TableBody>` + `<TableCell>`. Las clases del design system (font-label, uppercase, tracking-widest) se aplican via override de className.

### 4. Badges de estado -> Badge

| Patron actual | Variante Badge |
|---|---|
| `bg-primary/10 text-primary` | `status-active` (custom variant) |
| `bg-surface-container-high text-secondary` | `status-inactive` (custom variant) |
| `bg-error-container/60 text-on-error-container` | `status-error` (custom variant) |
| `bg-tertiary/10 text-tertiary` | `status-warning` (custom variant) |

Se extiende `Badge` con variantes custom usando `cva`:

```ts
const badgeVariants = cva("...", {
  variants: {
    variant: {
      default: "...",
      secondary: "...",
      destructive: "...",
      outline: "...",
      "status-active": "bg-primary/10 text-primary",
      "status-inactive": "bg-muted text-muted-foreground",
      "status-error": "bg-destructive/10 text-destructive",
      "status-warning": "bg-tertiary/10 text-tertiary",
    },
  },
});
```

### 5. Botones inline -> Button (ya instalado)

**Patron actual:** multiples `<button>` con `style={{ background: 'linear-gradient(135deg, #00647c 0%, #008fa3 100%)' }}` hardcodeado.

**Patron nuevo:** `<Button>` de shadcn. El gradiente del design system se aplica como variante custom `gradient`:

```ts
gradient: "bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-md shadow-primary/10 hover:opacity-95 active:scale-[0.98]"
```

Botones secundarios (Cancelar, Buscar, Anterior/Siguiente) usan `variant="outline"` o `variant="ghost"`.

### 6. Breadcrumb manual -> Breadcrumb

| Archivo actual | Primitivo shadcn | Notas |
|---|---|---|
| `patient-detail-client.tsx` | `Breadcrumb` + `BreadcrumbList` + `BreadcrumbItem` + `BreadcrumbLink` + `BreadcrumbSeparator` + `BreadcrumbPage` | Reemplaza el breadcrumb manual con `<nav>` + links inline |

### 7. Paginacion manual -> Pagination

| Archivo actual | Primitivo shadcn | Notas |
|---|---|---|
| `patients-page-client.tsx` | `Pagination` + `PaginationContent` + `PaginationItem` + `PaginationPrevious` + `PaginationNext` | Reemplaza los botones "Anterior" / "Siguiente" manuales |

### 8. Cards -> Card

| Archivo actual | Uso |
|---|---|
| `patient-detail-client.tsx` — details card | `<Card>` + `<CardContent>` |
| `patient-detail-client.tsx` — consent card | `<Card>` + `<CardHeader>` + `<CardContent>` |

**Patron actual:** `<div className="bg-surface-container-lowest rounded-xl shadow-sm p-6">`.

**Patron nuevo:** `<Card>` que hereda de `--card` / `--card-foreground`.

---

## Componentes shadcn a Instalar

Ejecutar desde `apps/web/`:

```bash
pnpm dlx shadcn@latest add sheet
pnpm dlx shadcn@latest add input
pnpm dlx shadcn@latest add label
pnpm dlx shadcn@latest add textarea
pnpm dlx shadcn@latest add select
pnpm dlx shadcn@latest add badge
pnpm dlx shadcn@latest add table
pnpm dlx shadcn@latest add separator
pnpm dlx shadcn@latest add card
pnpm dlx shadcn@latest add breadcrumb
pnpm dlx shadcn@latest add pagination
```

**Componentes ya instalados (no reinstalar):**
- `button` (en `components/ui/button.tsx`)
- `alert-dialog` (en `components/ui/alert-dialog.tsx`)

---

## Archivos a Modificar

### globals.css
- Reescribir `:root {}` con valores alineados al design system
- Eliminar `.dark {}` (no hay dark mode)
- Mantener `@theme {}` intacto

### Componentes a reescribir

| Archivo | Cambios principales |
|---|---|
| `location-drawer.tsx` | Sheet + Input + Label + Button |
| `user-drawer.tsx` | Sheet + Input + Label + Select + Button |
| `patient-drawer.tsx` | Sheet + Input + Label + Select + Textarea + Button |
| `service-type-drawer.tsx` | Sheet + Input + Label + Textarea + Button |
| `locations-page-client.tsx` | Table + Badge + Button |
| `users-page-client.tsx` | Table + Badge + Button |
| `patients-page-client.tsx` | Table + Badge + Button + Input (search) + Pagination |
| `service-types-page-client.tsx` | Table + Badge + Button |
| `patient-detail-client.tsx` | Card + Badge + Button + Breadcrumb |
| `empty-state.tsx` | Pulir estilos (no reemplazar) |
| `error-state.tsx` | Usar Button para "Reintentar" |
| `components/ui/button.tsx` | Agregar variante `gradient` |
| `components/ui/badge.tsx` | Agregar variantes `status-*` |

### Archivo a eliminar

| Archivo | Razon |
|---|---|
| `packages/ui/src/button.tsx` | Duplicado inutil del template Turborepo — no se usa en produccion |

---

## Criterios de Aceptacion

1. **Visual:** todas las paginas migradas mantienen la misma apariencia que el design system "The Clinical Curator" (colores teal, tipografia Manrope/Inter, surfaces sin bordes solidos)
2. **Accesibilidad:** los drawers (Sheet) tienen focus trap, escape-to-close, y aria attributes correctos sin codigo manual
3. **Tests:** `pnpm --filter web test` pasa al 100%
4. **Lint:** `pnpm lint` sin errores ni warnings
5. **Types:** `pnpm check-types` sin errores
6. **Sin regresiones:** la funcionalidad (crear, editar, toggle status, delete, search, pagination) no cambia
7. **No hay `style={{ background: 'linear-gradient(...)' }}` en ningun componente** — el gradiente se aplica via variante de Button

---

## Test Plan

### Tests existentes que pueden romperse

| Test file | Motivo de rotura | Accion |
|---|---|---|
| `location-drawer.test.tsx` | DOM structure changes (Sheet vs aside) | Actualizar queries a usar `role="dialog"` (Sheet lo provee) |
| `user-drawer.test.tsx` | Same + Select cambia de `<select>` a Radix portal | Actualizar queries para `<select>` -> Radix Select roles |
| `patients-page-client.test.tsx` | Table structure + AlertDialog ya funciona | Revisar queries de tabla |
| `patient-drawer.test.tsx` | DOM structure + Select | Actualizar queries |
| `patient-detail-client.test.tsx` | Card structure | Probablemente no se rompe (queries por texto) |
| `service-type-drawer.test.tsx` | DOM structure | Actualizar queries |
| `service-types-page-client.test.tsx` | Table structure | Revisar queries |
| `settings-nav.test.tsx` | No se toca | No deberia romperse |
| `page.test.tsx` (locations, users, patients, service-types) | Depende de si mockean children | Revisar |

### Tests basados en texto vs estructura

Los tests actuales usan principalmente `screen.getByRole()`, `screen.getByText()`, y `screen.getByLabelText()` — **no clases CSS**. Esto es bueno: la mayoria deberian sobrevivir la migracion. Los casos de riesgo son:

1. **`getByRole('dialog')`** — los drawers actuales usan `role="dialog"` manual; Sheet tambien lo provee, asi que deberia funcionar
2. **`getByLabelText()`** — depende de que `<Label htmlFor>` mantenga la misma asociacion que `<label htmlFor>`. shadcn `Label` lo hace
3. **Native `<select>`** — si se migra a Radix Select, los tests que interactuan con `<option>` via `fireEvent.change()` se rompen. Alternativa: mantener `<select>` nativo wrapeado en estilos shadcn para evitar rotura de tests

### Estrategia para Select

**Opcion A (recomendada):** mantener `<select>` nativo + aplicar clases de Input de shadcn para estilos. Esto preserva los tests y la compatibilidad con `FormData`. Radix Select no genera un `<select>` nativo, lo cual complica el submit de formularios con `useActionState`.

**Opcion B:** migrar a Radix Select + agregar `<input type="hidden" name="..." value="...">` para FormData + reescribir tests. Mas trabajo, mejor UX en desktop, peor en mobile (pierde el picker nativo del OS).

**Decision:** Opcion A. Los selects se estilizan con las clases de Input pero mantienen el elemento `<select>` nativo. Esto es consistente con el patron de shadcn para formularios nativos.

---

## Patron React Hook Form en Drawers

Los drawers actuales usan `useActionState` + `FormData` con validacion manual via estados locales (`nameError`, `consentError`). En este sprint se migran a **React Hook Form + zodResolver**, aprovechando los schemas de `@repo/types` como unica fuente de verdad para validacion.

### Imports necesarios

```ts
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateLocationSchema } from '@repo/types'; // schema correspondiente
import type { z } from 'zod';

type FormValues = z.infer<typeof CreateLocationSchema>;
```

### Setup del formulario

```tsx
const { register, handleSubmit, setError, formState: { errors } } = useForm<FormValues>({
  resolver: zodResolver(CreateLocationSchema),
  defaultValues: initialData ?? {},
});
```

### Conectar campos

Para inputs y textareas nativos, usar `register()`:

```tsx
<Input id="name" {...register('name')} />
{errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
```

Para `<select>` nativos, `register()` funciona directamente:

```tsx
<select id="role" {...register('role')}>
  <option value="ADMIN">Admin</option>
  ...
</select>
```

Para componentes controlados (si se necesitan en el futuro), usar `Controller`:

```tsx
import { Controller } from 'react-hook-form';

<Controller
  name="fieldName"
  control={control}
  render={({ field }) => <CustomComponent {...field} />}
/>
```

### Manejo de errores del servidor

Cuando la server action retorna un error, mostrarlo como error de formulario a nivel root:

```tsx
async function onSubmit(data: FormValues) {
  const result = await serverAction(data);
  if (result?.error) {
    setError('root', { message: result.error });
    return;
  }
  onClose();
}
```

El error root se muestra al inicio o final del formulario:

```tsx
{errors.root && (
  <p className="text-sm text-destructive">{errors.root.message}</p>
)}
```

### Llamada a la server action

En lugar de depender de `FormData` y `useActionState`, el submit llama directamente a la server action pasando el objeto validado:

```tsx
<form onSubmit={handleSubmit(onSubmit)}>
  {/* campos */}
  <Button type="submit" variant="gradient">Guardar</Button>
</form>
```

Las server actions que actualmente reciben `FormData` se adaptan para aceptar tambien un objeto tipado, o se crea un wrapper que convierte el objeto a `FormData` si es necesario.

### Impacto en tests

- **`fireEvent.change`** sigue funcionando — RHF escucha eventos de cambio en inputs registrados con `register()`
- **`fireEvent.submit`** en el `<form>` se reemplaza por **`fireEvent.click`** en el boton submit, ya que RHF intercepta el submit via `handleSubmit`
- **`getByLabelText`** sigue funcionando con los nuevos `<Label>` de shadcn, siempre que `<Label htmlFor="...">` y `<Input id="...">` mantengan la asociacion
- Los tests que verificaban errores de validacion manual (`nameError`) ahora verifican los mensajes de error de Zod (que pueden tener texto ligeramente diferente — actualizar assertions)

---

