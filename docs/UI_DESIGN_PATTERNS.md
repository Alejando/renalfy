# Renalfy — Patrones de Diseño UI

Referencia de todos los patrones aplicados en los módulos de Pacientes y Citas. Usar como plantilla para las siguientes vistas.

---

## 1. Design Tokens (RF Design System)

Todos los tokens viven en `apps/web/app/globals.css`. Se usan con clases Tailwind (`text-rf-ink`) o inline (`var(--rf-ink)`).

### Paleta de colores

| Token | Valor | Uso |
|---|---|---|
| `rf-primary` | `#0891b2` | Acción principal, links, focus ring |
| `rf-primary-soft` | `#d4eef5` | Fondo de avatares, highlights activos |
| `rf-primary-softer` | `#e6f4f8` | Fondo de filas activas en tabla |
| `rf-primary-ink` | `#053b4e` | Texto sobre fondos primary-soft |
| `rf-ink` | `#0c1217` | Texto principal |
| `rf-ink-muted` | `#404a55` | Texto secundario con peso |
| `rf-ink-soft` | `#6b7783` | Labels, subtítulos, texto terciario |
| `rf-ink-faint` | `#a3acb8` | Texto deshabilitado, contadores |
| `rf-surface` | `#ffffff` | Fondo de tarjetas y tablas |
| `rf-surface-sunk` | `#eef0f3` | Hover de filas, header de drawers |
| `rf-paper` | `#f4f5f7` | Fondo general de página |
| `rf-line` | `#e3e6eb` | Bordes sutiles |
| `rf-line-strong` | `#cdd3da` | Bordes de inputs, separadores |
| `rf-danger` | `#dc2626` | Acciones destructivas |
| `rf-danger-soft` | `#fbd9d9` | Fondo de alertas de error |
| `rf-success` | `#16a34a` | Estado positivo |
| `rf-warning` | `#d97706` | Advertencia |

### Tipografía

| Variable | Fuente | Uso |
|---|---|---|
| `--rf-font-sans` | Manrope | Títulos de página, headers de drawer |
| `--rf-font-mono` | Geist Mono | IDs, fechas, contadores numéricos |

### Radios

| Clase | Valor | Uso |
|---|---|---|
| `rounded-rf-pill` | `999px` | Chips de filtro |
| `rounded-rf-lg` | `20px` | — |
| `rounded-rf-md` | `14px` | Contenedores de tabla |
| `rounded-rf` | `10px` | Rows, botones, cards |
| `rounded-rf-sm` | `6px` | Elementos pequeños |

### Sombras (solo vía inline `style`)

```tsx
style={{ boxShadow: 'var(--rf-shadow-xs)' }}  // tablas
style={{ boxShadow: 'var(--rf-shadow-sm)' }}  // cards elevadas
style={{ boxShadow: 'var(--rf-shadow-md)' }}  // modales
```

---

## 2. Variantes de Botones

| Variante | Cuándo usarla |
|---|---|
| `variant="primary"` | CTA principal: crear, guardar, confirmar |
| `variant="secondary"` | Acción secundaria: cancelar, editar, filtros |
| `variant="danger"` | Destructor: dar de baja, cancelar cita |
| `variant="ghost"` | Iconos de navegación, sidebar |

**Nunca usar `variant="gradient"` en modales.** El botón de submit siempre es `variant="primary"`.

---

## 3. Layout de Página (vista listado)

```tsx
<div className="space-y-5">
  {/* Header */}
  <div className="flex items-start justify-between gap-4">
    <div>
      <h1
        className="text-[28px] font-extrabold tracking-tight text-rf-ink"
        style={{ fontFamily: 'var(--rf-font-sans)', letterSpacing: '-0.03em' }}
      >
        {Título}
      </h1>
      <p className="text-[13px] text-rf-ink-soft mt-1 font-medium">
        {subtítulo con contadores}
      </p>
    </div>
    <div className="flex items-center gap-2.5 flex-shrink-0">
      <Button variant="secondary" size="sm" style={{ height: 40 }}>
        Acción secundaria
      </Button>
      <Button variant="primary" size="sm" onClick={openCreate} style={{ height: 40 }}>
        <Plus className="h-[14px] w-[14px]" />
        Nueva entidad
      </Button>
    </div>
  </div>

  {/* Filtros */}
  <div className="flex items-center gap-2.5 flex-wrap">
    {/* ChipSelect, SearchInput, etc. */}
    <div className="flex-1" />
    {/* Contador paginación */}
    <span className="text-[12px] text-rf-ink-faint font-semibold" style={{ fontFamily: 'var(--rf-font-mono)' }}>
      {from}–{to} de {total}
    </span>
  </div>

  {/* Tabla o EmptyState */}
  ...
</div>
```

---

## 4. Layout de Página (vista detalle)

```tsx
<div className="space-y-6">
  {/* Breadcrumb */}
  <Breadcrumb>
    <BreadcrumbList>
      <BreadcrumbItem>
        <BreadcrumbLink render={<Link href="/entidades" />}>Entidades</BreadcrumbLink>
      </BreadcrumbItem>
      <BreadcrumbSeparator />
      <BreadcrumbItem>
        <BreadcrumbPage>{nombre}</BreadcrumbPage>
      </BreadcrumbItem>
    </BreadcrumbList>
  </Breadcrumb>

  {/* Header con avatar */}
  <div className="flex items-start justify-between gap-4">
    <div className="flex items-center gap-4">
      <EntityAvatar name={name} />
      <div>
        <h1 className="text-2xl font-bold text-rf-ink font-headline leading-tight">
          {name}
        </h1>
        <div className="flex items-center gap-3 mt-1.5">
          <Badge variant={...}>{status}</Badge>
          <span className="text-rf-ink-muted text-sm">{secondaryInfo}</span>
        </div>
      </div>
    </div>
    <div className="flex items-center gap-3 flex-shrink-0">
      <Button variant="secondary" onClick={() => setDrawerOpen(true)}>Editar</Button>
      {canDelete && (
        <Button variant="danger" onClick={() => setShowDeleteDialog(true)}>Dar de baja</Button>
      )}
    </div>
  </div>

  {/* Cards de secciones */}
  <Card>
    <CardHeader>
      <CardTitle className="font-headline font-semibold">Sección</CardTitle>
    </CardHeader>
    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <DetailField label="Campo" value={value} />
    </CardContent>
  </Card>
</div>
```

---

## 5. Componente Avatar de Entidad

```tsx
function EntityAvatar({ name }: { name: string }) {
  return (
    <div
      className="flex-shrink-0 inline-flex items-center justify-center rounded-full font-bold text-rf-primary-ink"
      style={{ width: SIZE, height: SIZE, background: 'var(--rf-primary-soft)', fontSize: FONT_SIZE }}
    >
      {getInitials(name)}
    </div>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0] ?? '';
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  const last = parts[parts.length - 1] ?? '';
  return ((first[0] ?? '') + (last[0] ?? '')).toUpperCase();
}
```

| Contexto | `width/height` | `fontSize` |
|---|---|---|
| Fila de tabla | `36px` | `13` |
| Header de detalle (entidad pequeña) | `44px` | `15` |
| Header de detalle (entidad principal) | `56px` | `18` |

---

## 6. Componente DetailField

Para mostrar un par label/value en vistas de detalle:

```tsx
function DetailField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-label uppercase tracking-widest text-rf-ink-soft font-semibold">
        {label}
      </p>
      <p className="text-rf-ink text-sm">{value ?? '—'}</p>
    </div>
  );
}
```

---

## 7. Componente ChipSelect (filtros en pill)

```tsx
function ChipSelect({ value, onChange, label, icon: Icon, options }) {
  const isActive = value !== '';
  const activeLabel = options.find((o) => o.value === value)?.label ?? label;

  return (
    <div className="relative">
      {/* Select nativo invisible — hace el trabajo de accesibilidad */}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 opacity-0 cursor-pointer w-full"
        aria-label={label}
      >
        <option value="">{label}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {/* Visual pill — pointer-events-none porque el select lo captura */}
      <div className={[
        'inline-flex items-center gap-1.5 rounded-rf-pill px-3.5 h-9 text-sm font-semibold select-none whitespace-nowrap border pointer-events-none',
        isActive
          ? 'bg-rf-ink text-white border-rf-ink'
          : 'bg-rf-surface text-rf-ink-muted border-rf-line-strong',
      ].join(' ')}>
        {Icon && <Icon className="h-3.5 w-3.5 flex-shrink-0" />}
        <span>{activeLabel}</span>
        <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 opacity-60" />
      </div>
    </div>
  );
}
```

---

## 8. Contenedor de Tabla

```tsx
<div
  className="overflow-hidden overflow-x-auto"
  style={{
    background: 'var(--rf-surface)',
    borderRadius: 'var(--rf-radius-md)',
    border: '1px solid var(--rf-line)',
    boxShadow: 'var(--rf-shadow-xs)',
  }}
>
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>...</TableHead>
        {/* Última columna — solo icono chevron */}
        <TableHead className="w-[52px] pr-6" />
      </TableRow>
    </TableHeader>
    <TableBody>
      {items.map((item) => (
        <TableRow key={item.id}>
          {/* Celda de entidad: avatar + nombre + ID mono */}
          <TableCell>
            <div className="flex items-center gap-3">
              <EntityAvatar name={item.name} />
              <div>
                <p className="font-bold text-rf-ink leading-tight" style={{ fontSize: 14 }}>
                  {item.name}
                </p>
                <span
                  className="text-rf-ink-faint"
                  style={{ fontFamily: 'var(--rf-font-mono)', fontSize: 11, fontWeight: 600 }}
                >
                  {item.id.slice(0, 8).toUpperCase()}
                </span>
              </div>
            </div>
          </TableCell>

          {/* Datos numéricos / fechas */}
          <TableCell>
            <span className="text-rf-ink-muted" style={{ fontFamily: 'var(--rf-font-mono)', fontSize: 12 }}>
              {value}
            </span>
          </TableCell>

          {/* Columna de navegación */}
          <TableCell className="pr-6">
            <div className="flex items-center justify-end">
              <Link
                href={`/entity/${item.id}`}
                aria-label="Ver detalle"
                className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-rf-ink-soft hover:bg-rf-surface-sunk hover:text-rf-ink transition-rf"
              >
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</div>
```

---

## 9. Filas de lista clickeable (dentro de Card)

Para listados dentro de una card de detalle (ej: citas de un paciente):

```tsx
<Link
  href={`/entity/${item.id}`}
  className="flex items-center gap-3 rounded-rf p-3 transition-rf hover:bg-rf-surface-sunk group"
  style={{
    background: isActive ? 'var(--rf-primary-softer)' : undefined,
    border: isActive ? '1px solid var(--rf-primary-soft)' : '1px solid var(--rf-line)',
  }}
>
  <div className="flex-1 min-w-0">
    {/* contenido */}
  </div>
  <ChevronRight className="h-4 w-4 text-rf-ink-faint flex-shrink-0 group-hover:text-rf-ink transition-rf" />
</Link>
```

---

## 10. Drawer / Sheet

### SheetContent
```tsx
<Sheet open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
  <SheetContent side="right" className="w-full max-w-md flex flex-col p-0">

    {/* Header — siempre con fondo sunk */}
    <SheetHeader
      className="px-8 py-6"
      style={{ background: 'var(--rf-surface-sunk)', borderBottom: '1px solid var(--rf-line)' }}
    >
      <SheetTitle
        className="font-extrabold text-xl text-rf-ink"
        style={{ fontFamily: 'var(--rf-font-sans)' }}
      >
        {título}
      </SheetTitle>
      <SheetDescription className="text-rf-ink-soft text-sm">
        {descripción}
      </SheetDescription>
    </SheetHeader>

    {/* Body — scrollable */}
    <div className="flex-1 overflow-y-auto px-8 py-6">
      {/* Contenido del formulario */}
    </div>

  </SheetContent>
</Sheet>
```

### Form dentro del drawer

```tsx
<form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
  {/* Campos */}

  {/* Acciones — siempre al final */}
  <div className="pt-4 flex gap-3">
    <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
      Cancelar
    </Button>
    <Button type="submit" variant="primary" disabled={isSubmitting} className="flex-1">
      {isSubmitting ? 'Guardando…' : 'Crear entidad'}
    </Button>
  </div>
</form>
```

### Label de campo de formulario

```tsx
const LABEL_CLASS = 'block text-[10px] font-label uppercase tracking-widest text-rf-ink-soft font-semibold';

<Label htmlFor="field-id" className={LABEL_CLASS}>
  Campo <span className="text-rf-danger">*</span>
</Label>
```

### Select nativo en formulario

```tsx
const SELECT_CLASS = 'w-full bg-rf-surface border border-rf-line-strong rounded-rf px-4 py-3 text-rf-ink text-sm focus:outline-none focus:ring-2 focus:ring-rf-primary/20 focus:border-rf-primary transition-rf appearance-none';

<select className={SELECT_CLASS} {...register('field')}>
  <option value="">Selecciona una opción</option>
  {options.map((o) => (
    <option key={o.id} value={o.id}>{o.name}</option>
  ))}
</select>
```

---

## 11. Estado de Error en Formularios

### Error de servidor (dentro del form)
```tsx
{serverError && (
  <div
    className="mb-4 p-3 rounded-lg"
    style={{ background: 'var(--rf-danger-soft)', border: '1px solid var(--rf-danger)' }}
  >
    <p className="text-rf-danger text-sm font-medium">{serverError}</p>
  </div>
)}
```

### Error de campo (debajo del input)
```tsx
{errors.fieldName && (
  <p className="text-sm text-rf-danger">{errors.fieldName.message}</p>
)}
```

---

## 12. EmptyState

```tsx
<EmptyState
  title="Sin entidades"
  description={
    hasFilters
      ? 'No hay entidades que coincidan con los filtros aplicados.'
      : 'Crea el primer registro para comenzar.'
  }
  action={
    !hasFilters ? (
      <Button variant="primary" onClick={openCreate}>
        <Plus className="h-4 w-4" />
        Nueva entidad
      </Button>
    ) : undefined
  }
/>
```

---

## 13. Columnas ocultas en responsive

```tsx
<TableHead className="hidden md:table-cell">Columna tablet+</TableHead>
<TableHead className="hidden lg:table-cell">Columna desktop</TableHead>
```

Regla: en mobile solo se muestran las columnas esenciales (nombre/entidad + estado + acción).

---

## 14. Transición de animaciones

```tsx
className="transition-rf"
// equivale a: transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1)
```

Aplicar en: hover de filas, botones de icono, ChipSelect, links de navegación.

---

## Checklist para nueva vista

Al crear una nueva vista de listado + detalle, verificar:

- [ ] Header usa `text-[28px] font-extrabold tracking-tight` con `--rf-font-sans`
- [ ] Botón CTA principal usa `variant="primary" size="sm" style={{ height: 40 }}`
- [ ] Contenedor de tabla usa `border + borderRadius rf-radius-md + rf-shadow-xs`
- [ ] Columna de ID usa `font-mono fontSize:11 fontWeight:600 text-rf-ink-faint`
- [ ] Columna de navegación al final con `ChevronRight h-8 w-8 rounded-lg hover:bg-rf-surface-sunk`
- [ ] ChipSelect para cada filtro, sin botones de filtro custom
- [ ] Drawer con header `bg-rf-surface-sunk + borderBottom rf-line`
- [ ] Label de campo: `text-[10px] uppercase tracking-widest text-rf-ink-soft font-semibold`
- [ ] Botones del drawer: `secondary` + `primary`, ambos `flex-1`
- [ ] Errores de servidor: fondo `rf-danger-soft` con borde `rf-danger`
- [ ] Fechas y datos técnicos: `font-mono fontSize:12 text-rf-ink-muted`
- [ ] Avatares de entidad: `rounded-full bg-rf-primary-soft text-rf-primary-ink`
