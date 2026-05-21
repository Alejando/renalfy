# Design System Renalfy — Spec

**Fecha:** 2026-05-20  
**Estado:** Aprobado — listo para implementar

---

## Contexto

Renalfy tiene un design system completo definido en un prototipo HTML/CSS (exportado desde Claude Design). El objetivo es implementarlo como sistema de componentes reutilizables en el monorepo, con soporte de temas por tenant (color primario configurable).

---

## Decisiones clave

| Decisión | Elección | Razón |
|---|---|---|
| Estrategia de integración | CSS custom properties + shadcn override | El `tokens.css` ya existe; shadcn adopta los colores automáticamente |
| Tailwind v4 | `@theme` con tokens RF como clases Tailwind | Approach idiomático; IntelliSense funciona |
| Theming por tenant | Solo `--rf-primary` y derivados cambian | Seguro en accesibilidad; el resto del sistema es fijo |
| Color default | Teal clínico `#0891B2` | Color original del diseño |
| Almacenamiento del tema | Campo `primaryColor: String?` en `Tenant` | Nullable: null = default teal |
| Aplicación del tema | CSS inline inyectado en Server Component | Sin JS cliente, sin flicker |

---

## Sección 1 — Sistema de Tokens

### Fuente del diseño

El archivo `tokens.css` del prototipo define:
- **Colores:** primary teal, saffron accent, neutrales fríos, estados (success/warning/danger/info/coral)
- **Tipografía:** Manrope (display + UI), Geist Mono (datos)
- **Escala de espaciado:** base 4px, 10 niveles (4–72px)
- **Radii:** sm(6), base(10), md(14), lg(20), pill(999)
- **Sombras:** xs, sm, md, lg + ring de focus

### Dónde viven

```
packages/ui/src/tokens.css     ← copia exacta del tokens.css del prototipo
apps/web/app/globals.css       ← importa tokens + mapeo shadcn + @theme Tailwind
```

### Mapeo shadcn/ui → RF

```css
/* apps/web/app/globals.css */
@import "@repo/ui/tokens.css";

:root {
  --background:           var(--rf-paper);
  --foreground:           var(--rf-ink);
  --card:                 var(--rf-surface);
  --card-foreground:      var(--rf-ink);
  --popover:              var(--rf-surface);
  --popover-foreground:   var(--rf-ink);
  --primary:              var(--rf-primary);
  --primary-foreground:   var(--rf-on-primary);
  --secondary:            var(--rf-surface-sunk);
  --secondary-foreground: var(--rf-ink-muted);
  --muted:                var(--rf-surface-sunk);
  --muted-foreground:     var(--rf-ink-soft);
  --accent:               var(--rf-primary-softer);
  --accent-foreground:    var(--rf-primary-ink);
  --destructive:          var(--rf-danger);
  --border:               var(--rf-line);
  --input:                var(--rf-line-strong);
  --ring:                 var(--rf-primary);
  --radius:               var(--rf-radius);
}
```

### Extensión Tailwind v4

```css
@theme {
  --color-rf-primary:        var(--rf-primary);
  --color-rf-primary-hover:  var(--rf-primary-hover);
  --color-rf-primary-soft:   var(--rf-primary-soft);
  --color-rf-primary-ink:    var(--rf-primary-ink);
  --color-rf-primary-dark:   var(--rf-primary-dark);
  --color-rf-saffron:        var(--rf-saffron);
  --color-rf-saffron-soft:   var(--rf-saffron-soft);
  --color-rf-ink:            var(--rf-ink);
  --color-rf-ink-muted:      var(--rf-ink-muted);
  --color-rf-ink-soft:       var(--rf-ink-soft);
  --color-rf-ink-faint:      var(--rf-ink-faint);
  --color-rf-surface:        var(--rf-surface);
  --color-rf-surface-sunk:   var(--rf-surface-sunk);
  --color-rf-paper:          var(--rf-paper);
  --color-rf-line:           var(--rf-line);
  --color-rf-success:        var(--rf-success);
  --color-rf-warning:        var(--rf-warning);
  --color-rf-danger:         var(--rf-danger);
  --color-rf-info:           var(--rf-info);
  --font-sans:               var(--rf-font-sans);
  --font-mono:               var(--rf-font-mono);
}
```

---

## Sección 2 — Theming por Tenant

### Schema Prisma

```prisma
model Tenant {
  // ...campos existentes
  primaryColor  String?  // hex ej: "#0891B2". null = default teal
}
```

### Migración

Nueva migración: `add_primary_color_to_tenant`.

### Función de derivación

```typescript
// packages/utils/src/theme.ts
export function deriveRfTheme(hex: string): Record<string, string>
```

Calcula los 6 derivados del color primario a partir de manipulación HSL (sin dependencias externas):

| Variable | Transformación |
|---|---|
| `--rf-primary` | hex base |
| `--rf-primary-hover` | darken 8% |
| `--rf-primary-soft` | lighten 82% (pastel) |
| `--rf-primary-softer` | lighten 88% |
| `--rf-primary-ink` | darken 60% (texto sobre soft) |
| `--rf-primary-dark` | darken 30% (sidebar) |
| `--rf-primary-darker` | darken 42% (sidebar deep) |
| `--rf-on-primary` | siempre `#ffffff` |

### Inyección en layout

```tsx
// apps/web/app/tenants/[slug]/(dashboard)/layout.tsx
const tenant = await prisma.tenant.findUnique({ where: { slug } });
const themeVars = deriveRfTheme(tenant.primaryColor ?? '#0891B2');
const css = Object.entries(themeVars).map(([k, v]) => `${k}:${v}`).join(';');

return (
  <>
    <style>{`:root{${css}}`}</style>
    {children}
  </>
);
```

---

## Sección 3 — Inventario de Componentes

### Componentes RF en `@repo/ui` (nuevos)

Componentes primitivos con tokens RF, sin depender de shadcn internals:

| Componente | Variantes | Notas |
|---|---|---|
| `Button` | primary, secondary, ghost, danger, saffron, dark · sm/base/lg | Reemplaza shadcn Button |
| `Badge` | primary, saffron, success, warning, danger, info, coral, neutral, flat | Pill uppercase |
| `Input` | base, con error | Reemplaza shadcn Input |
| `Select` | base | Reemplaza shadcn Select |
| `Textarea` | base | |
| `Label` | base | Uppercase 700 weight |
| `Card` | base | `rf-card` con border + shadow-xs |
| `KpiCard` | con corner decoration | Esquina decorativa pastel |
| `Avatar` | base (iniciales) | Fondo primary-soft |
| `Tabs` + `Tab` | base, active | Underline teal |
| `FilterChip` | base, active | Pill con ink activo |
| `Table` + primitivos | `TableHead`, `TableBody`, `TableRow`, `TableCell` | |

### Componentes de App Shell en `apps/web` (nuevos)

```
apps/web/components/shell/
├── sidebar.tsx      (dark teal, nav items, role-aware)
├── topbar.tsx       (breadcrumb, title, actions slot)
└── app-shell.tsx    (sidebar + topbar + main content)
```

### Componentes shadcn que se mantienen sin cambios

Para componentes complejos que requieren accesibilidad Radix:
- `Dialog`, `Drawer`, `Sheet`
- `DropdownMenu`, `Popover`, `Tooltip`
- `DatePicker` / `Calendar`
- `Toast` / Sonner
- `Command` (búsqueda)

---

## Sección 4 — Estructura de Archivos Final

```
packages/
├── ui/src/
│   ├── tokens.css                   ← design tokens (fuente de verdad visual)
│   ├── components/
│   │   ├── button.tsx
│   │   ├── badge.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── textarea.tsx
│   │   ├── label.tsx
│   │   ├── card.tsx
│   │   ├── kpi-card.tsx
│   │   ├── avatar.tsx
│   │   ├── tabs.tsx
│   │   ├── filter-chip.tsx
│   │   └── table.tsx
│   ├── ui/                          ← shadcn (no modificar)
│   └── index.ts                     ← re-exporta todo
└── utils/src/
    └── theme.ts                     ← deriveRfTheme()

apps/web/
├── app/
│   ├── globals.css                  ← @import tokens + shadcn override + @theme
│   └── tenants/[slug]/
│       └── (dashboard)/layout.tsx   ← inyecta CSS vars del tenant
└── components/
    └── shell/
        ├── sidebar.tsx
        ├── topbar.tsx
        └── app-shell.tsx
```

---

## Fuera de scope (primera iteración)

- Migración de vistas existentes al nuevo design system
- Dark mode
- Editor de tema en Settings del tenant (sólo BD por ahora)
- Storybook / documentación interactiva
