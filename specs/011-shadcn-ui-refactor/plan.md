# Plan de Implementacion: Sprint 11 — shadcn/ui Refactor

## Fases

El trabajo se ordena por dependencia: primero la base (tokens CSS + componentes instalados), luego los primitivos atomicos, y finalmente los componentes compuestos que los usan.

---

## Fase 0: Preparacion (tokens CSS + instalacion)

### 0.1 Alinear variables CSS de shadcn al design system

**Archivo:** `apps/web/app/globals.css`

**Que hacer:**

1. Reescribir el bloque `:root {}` para que las variables shadcn apunten a los valores del design system. Convertir los hex a oklch (shadcn usa oklch por defecto) o usar hex directamente si se prefiere claridad:

```css
:root {
  --background: #f7f9fb;
  --foreground: #191c1e;
  --card: #ffffff;
  --card-foreground: #191c1e;
  --popover: #ffffff;
  --popover-foreground: #191c1e;
  --primary: #00647c;
  --primary-foreground: #ffffff;
  --secondary: #e3e1ec;
  --secondary-foreground: #5d5e66;
  --muted: #f2f4f6;
  --muted-foreground: #5d5e66;
  --accent: #f2f4f6;
  --accent-foreground: #191c1e;
  --destructive: #ba1a1a;
  --border: #bdc8ce;
  --input: #e0e3e5;
  --ring: #00647c;
  --radius: 0.375rem;
  --sidebar: #f7f9fb;
  --sidebar-foreground: #191c1e;
  --sidebar-primary: #00647c;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: #f2f4f6;
  --sidebar-accent-foreground: #191c1e;
  --sidebar-border: #bdc8ce;
  --sidebar-ring: #00647c;
  --chart-1: #00647c;
  --chart-2: #007f9d;
  --chart-3: #5d5e66;
  --chart-4: #825100;
  --chart-5: #a36700;
}
```

2. Eliminar el bloque `.dark {}` completo (el design system es light-only).

3. **No tocar** el bloque `@theme {}` ni el bloque `@theme inline {}` — los tokens MD3 siguen siendo necesarios para componentes que no se migran.

**Verificacion:** abrir la app en el navegador, confirmar que los componentes shadcn existentes (Button, AlertDialog) ahora usan los colores teal.

### 0.2 Instalar componentes shadcn

**Directorio:** `apps/web/`

Ejecutar en orden (cada comando agrega archivos a `components/ui/`):

```bash
cd apps/web
pnpm dlx shadcn@latest add sheet
pnpm dlx shadcn@latest add input
pnpm dlx shadcn@latest add label
pnpm dlx shadcn@latest add textarea
pnpm dlx shadcn@latest add badge
pnpm dlx shadcn@latest add table
pnpm dlx shadcn@latest add separator
pnpm dlx shadcn@latest add card
pnpm dlx shadcn@latest add breadcrumb
pnpm dlx shadcn@latest add pagination
```

**No instalar `select`** — se mantienen los `<select>` nativos estilizados (ver decision en spec, seccion "Estrategia para Select").

**Archivos generados esperados:**
- `components/ui/sheet.tsx`
- `components/ui/input.tsx`
- `components/ui/label.tsx`
- `components/ui/textarea.tsx`
- `components/ui/badge.tsx`
- `components/ui/table.tsx`
- `components/ui/separator.tsx`
- `components/ui/card.tsx`
- `components/ui/breadcrumb.tsx`
- `components/ui/pagination.tsx`

### 0.3 Agregar variante `gradient` a Button

**Archivo:** `apps/web/components/ui/button.tsx`

Agregar al objeto `variants.variant` de `buttonVariants`:

```ts
gradient:
  "bg-gradient-to-br from-[#00647c] to-[#008fa3] text-white shadow-md shadow-primary/10 hover:opacity-95 active:scale-[0.98]",
```

Esto reemplaza todos los `style={{ background: 'linear-gradient(135deg, #00647c 0%, #008fa3 100%)' }}` del codebase.

### 0.4 Agregar variantes `status-*` a Badge

**Archivo:** `apps/web/components/ui/badge.tsx` (recien instalado)

Agregar variantes al `badgeVariants`:

```ts
"status-active": "bg-primary/10 text-primary border-transparent",
"status-inactive": "bg-muted text-muted-foreground border-transparent",
"status-error": "bg-destructive/10 text-destructive border-transparent",
"status-warning": "bg-[#825100]/10 text-[#825100] border-transparent",
"role-admin": "bg-primary/10 text-primary border-transparent",
"role-manager": "bg-[#825100]/10 text-[#825100] border-transparent",
"role-staff": "bg-muted text-muted-foreground border-transparent",
"role-superadmin": "bg-destructive/10 text-destructive border-transparent",
```

### 0.5 Eliminar `packages/ui/src/button.tsx`

Este archivo es un placeholder del template Turborepo. No se importa en ningun componente de produccion. Eliminarlo y verificar que `pnpm build` sigue pasando.

**Verificar antes de eliminar:** `grep -r "from '@repo/ui'" apps/web/` para confirmar que no hay imports.

### 0.6 Crear componente helper: FormField

Para evitar repetir la combinacion `Label` + `Input` + error message en cada drawer, crear un componente helper:

**Archivo:** `apps/web/app/components/form-field.tsx`

```tsx
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface FormFieldProps {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  children?: React.ReactNode; // Para campos custom (select, textarea)
  // ...rest se pasa a Input
}
```

Este componente encapsula:
- Label con estilo `text-[10px] font-label uppercase tracking-widest text-muted-foreground font-semibold`
- Required asterisk `*` en `text-destructive`
- Error message debajo

---

## Fase 1: Migrar Drawers a Sheet + React Hook Form

Los 4 drawers son casi identicos en estructura. Se migran uno por uno, corriendo tests despues de cada uno. **Cada drawer se migra simultaneamente a Sheet (UI) y React Hook Form + zodResolver (validacion).** No son fases separadas — al tocar un drawer se hacen ambos cambios de una vez.

**Patron RHF comun a todos los drawers:**
- Reemplazar `useActionState` + `FormData` por `useForm()` + `handleSubmit` + llamada directa a la server action
- Conectar campos con `register()` (inputs, textareas, selects nativos)
- Errores de Zod se muestran automaticamente via `errors.fieldName.message`
- Errores del servidor se muestran con `setError('root', { message: result.error })`
- Ver seccion "Patron React Hook Form en Drawers" del spec para detalles completos

### 1.1 LocationDrawer

**Archivo:** `settings/locations/location-drawer.tsx`
**Test:** `settings/locations/location-drawer.test.tsx`

**Cambios:**

1. Reemplazar render condicional + backdrop + aside por:
```tsx
<Sheet open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
  <SheetContent side="right" className="w-full max-w-md flex flex-col p-0">
    <SheetHeader className="px-8 py-6 bg-muted">
      <SheetTitle className="font-headline font-bold text-xl">
        {isEdit ? 'Editar sucursal' : 'Nueva sucursal'}
      </SheetTitle>
      <SheetDescription>
        {isEdit ? 'Modifica los datos de la sucursal' : 'Agrega una nueva ubicacion...'}
      </SheetDescription>
    </SheetHeader>
    {/* form content */}
  </SheetContent>
</Sheet>
```

2. Eliminar el `useEffect` para Escape handler (Sheet lo maneja)
3. Eliminar el render condicional `if (!open) return null` (Sheet controla visibilidad)
4. Reemplazar `<input>` nativos por `<Input>` de shadcn
5. Reemplazar `<label>` por `<Label>`
6. Reemplazar botones por `<Button variant="gradient">` y `<Button variant="outline">`
7. Migrar a React Hook Form: `useForm({ resolver: zodResolver(CreateLocationSchema) })` + `register()` en cada campo + `handleSubmit(onSubmit)` que llama a la server action directamente
8. Eliminar estados de error manuales — los errores de Zod se muestran via `errors.fieldName.message`

**Tests — cambios esperados:**
- Sheet renderiza un `role="dialog"` igual que el drawer manual — las queries `getByRole('dialog')` o `getByRole('heading')` deberian sobrevivir
- `getByLabelText()` sigue funcionando con shadcn `Label` siempre que `<Label htmlFor="...">` y `<Input id="...">` mantengan la asociacion
- El backdrop click test puede necesitar ajuste si Sheet usa un overlay diferente
- `fireEvent.change` sigue funcionando con `register()` de RHF
- `fireEvent.submit` en el form se reemplaza por `fireEvent.click` en el boton submit
- Assertions de errores de validacion pueden cambiar de texto (mensajes de Zod vs mensajes manuales)

**Verificacion:** `pnpm --filter web test -- location-drawer`

### 1.2 UserDrawer

**Archivo:** `settings/users/user-drawer.tsx`
**Test:** `settings/users/user-drawer.test.tsx`

**Cambios adicionales al patron de 1.1:**
- Los `<select>` nativos se mantienen pero se les aplican clases de Input shadcn: `cn(inputClasses, "appearance-none")`
- El select de rol y el select de sucursal siguen siendo `<select>` nativos
- Migrar a RHF con el schema correspondiente (CreateUserSchema o equivalente); `register()` funciona directamente con `<select>` nativos

**Verificacion:** `pnpm --filter web test -- user-drawer`

### 1.3 PatientDrawer

**Archivo:** `patients/patient-drawer.tsx`
**Test:** `patients/patient-drawer.test.tsx`

**Cambios adicionales:**
- `<textarea>` se reemplaza por `<Textarea>` de shadcn
- Seccion de consentimiento usa `<Separator>` en lugar de `border-t border-outline-variant`
- Select de tipo de consentimiento y select de sucursal: mantener nativos
- Migrar a RHF con el schema correspondiente (CreatePatientSchema); usar `register()` para todos los campos incluyendo textarea y selects nativos

**Verificacion:** `pnpm --filter web test -- patient-drawer`

### 1.4 ServiceTypeDrawer

**Archivo:** `settings/service-types/service-type-drawer.tsx`
**Test:** `settings/service-types/service-type-drawer.test.tsx`

**Patron identico a 1.1** con Textarea adicional para descripcion. Migrar a RHF con CreateServiceTypeSchema.

**Verificacion:** `pnpm --filter web test -- service-type-drawer`

---

## Fase 2: Migrar Tablas a Table

### 2.1 LocationsPageClient

**Archivo:** `settings/locations/locations-page-client.tsx`
**Test:** `settings/locations/page.test.tsx`

**Cambios:**

1. Reemplazar `<table>` / `<thead>` / `<tbody>` / `<tr>` / `<th>` / `<td>` por los componentes shadcn: `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`
2. Reemplazar badges de estado inline por `<Badge variant="status-active">` / `<Badge variant="status-inactive">`
3. Reemplazar el boton "+ Nueva sucursal" (top + empty state) por `<Button variant="gradient">`
4. Reemplazar botones de accion "Editar" / "Desactivar" por `<Button variant="link">` y `<Button variant="ghost" size="sm">`
5. Reemplazar el wrapper `<div className="bg-surface-container-lowest rounded-xl shadow-sm">` por un simple `<div className="rounded-xl overflow-hidden border">` ya que Table de shadcn maneja sus propios estilos

**Tests — queries a revisar:**
- `getByRole('table')` — Table de shadcn renderiza un `<table>`, asi que sigue funcionando
- `getByRole('columnheader')` — TableHead renderiza `<th>`, sin cambio
- `getByRole('cell')` — TableCell renderiza `<td>`, sin cambio
- Queries por texto ("Activa", "Inactiva") pueden cambiar si Badge agrega markup adicional — pero Badge renderiza un `<span>` con el texto directamente

**Verificacion:** `pnpm --filter web test -- locations`

### 2.2 UsersPageClient

**Archivo:** `settings/users/users-page-client.tsx`
**Test:** `settings/users/page.test.tsx`

**Mismo patron que 2.1.** Ademas:
- Badges de rol usan variantes `role-admin`, `role-manager`, `role-staff`, `role-superadmin`
- Badges de estado usan `status-active`, `status-error` (para SUSPENDED)

**Verificacion:** `pnpm --filter web test -- users`

### 2.3 PatientsPageClient

**Archivo:** `patients/patients-page-client.tsx`
**Test:** `patients/patients-page-client.test.tsx` y `patients/page.test.tsx`

**Cambios adicionales al patron de 2.1:**
- Search input se reemplaza por `<Input>` de shadcn
- Boton "Buscar" se reemplaza por `<Button variant="outline">`
- Paginacion manual se reemplaza por `<Pagination>` + `<PaginationContent>` + `<PaginationItem>` + `<PaginationPrevious>` + `<PaginationNext>` de shadcn
- Boton "Dar de baja" usa `<Button variant="destructive" size="sm">`

**Verificacion:** `pnpm --filter web test -- patients`

### 2.4 ServiceTypesPageClient

**Archivo:** `settings/service-types/service-types-page-client.tsx`
**Test:** `settings/service-types/service-types-page-client.test.tsx` y `page.test.tsx`

**Mismo patron que 2.1.**

**Verificacion:** `pnpm --filter web test -- service-types`

---

## Fase 3: Migrar Detail Page + Cards

### 3.1 PatientDetailClient

**Archivo:** `patients/[id]/patient-detail-client.tsx`
**Test:** `patients/[id]/patient-detail-client.test.tsx` y `patients/[id]/page.test.tsx`

**Cambios:**

1. Detalles card: `<div className="bg-surface-container-lowest...">` -> `<Card>` + `<CardContent>`
2. Consent card: agregar `<CardHeader>` + `<CardTitle>` para "Consentimiento"
3. Badge de estado: usar `<Badge variant="status-active">`
4. Boton "Editar": `<Button variant="outline">`
5. Boton "Dar de baja": `<Button variant="destructive">`
6. Breadcrumb manual: migrar a `<Breadcrumb>` + `<BreadcrumbList>` + `<BreadcrumbItem>` + `<BreadcrumbLink>` + `<BreadcrumbSeparator>` + `<BreadcrumbPage>` de shadcn

**Verificacion:** `pnpm --filter web test -- patient-detail`

---

## Fase 4: Pulir componentes compartidos

### 4.1 EmptyState

**Archivo:** `app/components/empty-state.tsx`

**Cambios minimos:**
- Reemplazar clases MD3 por clases shadcn donde haya mapeo directo (`text-secondary` -> `text-muted-foreground`, `bg-surface-container-high` -> `bg-muted`)
- No cambiar estructura — no hay componente shadcn equivalente

### 4.2 ErrorState

**Archivo:** `app/components/error-state.tsx`

**Cambios:**
- Boton "Reintentar" se reemplaza por `<Button variant="link">`
- Clases MD3 -> clases shadcn equivalentes

---

## Fase 5: Verificacion Final

1. `pnpm --filter web test` — todos los tests pasan
2. `pnpm lint` — sin errores
3. `pnpm check-types` — sin errores
4. Verificacion visual manual: abrir cada pagina en el navegador y confirmar que la apariencia es consistente con el design system

---

## Resumen de Archivos Tocados

| Fase | Archivos modificados | Archivos creados | Archivos eliminados |
|---|---|---|---|
| 0 | `globals.css`, `button.tsx` | `badge.tsx`, `sheet.tsx`, `input.tsx`, `label.tsx`, `textarea.tsx`, `table.tsx`, `separator.tsx`, `card.tsx`, `breadcrumb.tsx`, `pagination.tsx`, `form-field.tsx` | `packages/ui/src/button.tsx` |
| 1 | `location-drawer.tsx`, `user-drawer.tsx`, `patient-drawer.tsx`, `service-type-drawer.tsx` + sus tests (UI a Sheet + validacion a RHF) | — | — |
| 2 | `locations-page-client.tsx`, `users-page-client.tsx`, `patients-page-client.tsx`, `service-types-page-client.tsx` + sus tests | — | — |
| 3 | `patient-detail-client.tsx` + test | — | — |
| 4 | `empty-state.tsx`, `error-state.tsx` | — | — |

**Total:** ~20 archivos modificados, ~11 archivos creados por shadcn CLI, 1 archivo eliminado.

### Nota sobre tests de drawers y Label de shadcn

Al migrar drawers a Sheet + RHF, verificar que `getByLabelText()` sigue funcionando en todos los tests. El componente `<Label>` de shadcn genera un `<label>` estandar con `htmlFor` — la asociacion con el input se mantiene siempre que:

1. `<Label htmlFor="name">` y `<Input id="name" {...register('name')} />` usen el mismo id
2. No se omita el `htmlFor` en Label (shadcn no lo agrega automaticamente si no se pasa)

Si algun test falla en `getByLabelText`, la causa mas probable es que falta el `htmlFor` en el nuevo `<Label>`.

---

## Riesgos y Mitigaciones

| Riesgo | Probabilidad | Mitigacion |
|---|---|---|
| Tests se rompen por cambio de estructura DOM de Sheet | Media | Sheet usa `role="dialog"` igual que el drawer manual; la mayoria de queries deberian sobrevivir |
| Radix Select rompe FormData en formularios nativos | Alta (por eso no se usa) | Decision: mantener `<select>` nativo con estilos de Input |
| Variables CSS shadcn en oklch vs hex | Baja | Usar hex en `:root` para mantener claridad; shadcn acepta cualquier formato |
| `@theme` e `@theme inline` entran en conflicto por `--color-primary` y `--color-secondary` | Alta | El `@theme` define `--color-primary: #00647c` y el `:root` define `--primary: #00647c`. `@theme inline` tiene `--color-primary: var(--primary)`. Asi que `@theme inline` tomara el valor de `:root`, que ahora apunta al valor correcto. **Hay que verificar que no hay colision circular.** |
| Los componentes shadcn generados por el CLI pueden tener imports incompatibles con el proyecto | Baja | shadcn genera componentes con imports de `@/lib/utils` y `@/components/ui/...` que ya estan configurados en `components.json` |

---

## Orden de Ejecucion Recomendado

```
Fase 0.1  -> Verificar visualmente que colores son correctos
Fase 0.2  -> Verificar que componentes se instalaron sin errores
Fase 0.3  -> pnpm check-types (confirmar que variante "gradient" compila)
Fase 0.4  -> pnpm check-types
Fase 0.5  -> pnpm build (confirmar que no hay imports rotos)
Fase 0.6  -> Opcional, puede crearse bajo demanda en Fase 1
Fase 1.1  -> pnpm --filter web test -- location-drawer
Fase 1.2  -> pnpm --filter web test -- user-drawer
Fase 1.3  -> pnpm --filter web test -- patient-drawer
Fase 1.4  -> pnpm --filter web test -- service-type-drawer
Fase 2.1  -> pnpm --filter web test -- locations
Fase 2.2  -> pnpm --filter web test -- users
Fase 2.3  -> pnpm --filter web test -- patients
Fase 2.4  -> pnpm --filter web test -- service-types
Fase 3.1  -> pnpm --filter web test -- patient-detail
Fase 4.1  -> No tiene test dedicado
Fase 4.2  -> No tiene test dedicado
Fase 5    -> pnpm lint && pnpm check-types && pnpm --filter web test
```

Cada fase se puede hacer como un commit independiente. Si una fase rompe tests, se corrige antes de avanzar a la siguiente.
