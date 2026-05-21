# RF Design System Migration — Spec

**Fecha:** 2026-05-21
**Estado:** Aprobado — listo para implementar

---

## Contexto

El design system RF fue implementado en `@repo/ui` (tokens, componentes, shell) pero ninguna página del app lo usa todavía. Todas las páginas importan copias locales de shadcn desde `@/components/ui/`. El objetivo es migrar el app completo para que use `@repo/ui` como única fuente de componentes UI, e integrar el sidebar layout definido en el spec de design system.

---

## Decisiones clave

| Decisión | Elección | Razón |
|---|---|---|
| Estrategia | Componentes faltantes → Sidebar → Piloto Pacientes → Replicar | Valida end-to-end antes de comprometer todos los módulos |
| Componentes Radix complejos | Se quedan en `@/components/ui/` (Sheet, AlertDialog, Breadcrumb, Separator) | El spec original los mantiene como shadcn |
| Íconos del sidebar | Lucide (más semejante por sección) | Consistencia con el resto del app |
| Variantes faltantes | Se añaden a los componentes RF existentes | No crear componentes paralelos |
| Piloto | Módulo Pacientes (3 archivos, patrón completo) | Más simple con tabla + drawer + detalle |

---

## Sección 1 — Componentes RF a completar

Antes de migrar cualquier página, hay que añadir lo que falta al design system.

### 1.1 Variantes de Button

Añadir a `packages/ui/src/components/button.tsx`:

| Variante | Descripción | Uso actual |
|---|---|---|
| `gradient` | Fondo gradiente primary→primary-dark, texto blanco | CTA principal en todas las páginas (52 archivos) |

### 1.2 Variantes de Badge

Los status badges del app usan variantes semánticas de dominio. Mapear a RF:

| Variante actual | Variante RF equivalente | Uso |
|---|---|---|
| `status-active` | `success` | Paciente ACTIVO, Plan ACTIVE |
| `status-inactive` | `neutral` | Paciente INACTIVO, Plan INACTIVE |
| `status-error` | `danger` | Paciente dado de baja, estados de error |

### 1.3 Componentes nuevos en `@repo/ui`

#### `PageHeader`
Patrón repetido en cada página del dashboard: título + descripción opcional + slot de acción (botón CTA).

```tsx
interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}
```

#### `Pagination`
Reemplaza el par de botones Anterior/Siguiente inline. Muestra "Página X de Y" + controles.

```tsx
interface PaginationProps {
  page: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}
```

#### `SearchInput`
Patrón input + botón buscar. Se activa con Enter o clic en botón.

```tsx
interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  placeholder?: string;
}
```

#### `EmptyState`
Recrear en `@repo/ui/components/empty-state.tsx` con tokens RF. La versión en `apps/web/app/components/empty-state.tsx` se elimina; las páginas que la importan apuntan al nuevo `@repo/ui`.

```tsx
interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}
```

---

## Sección 2 — Integración del sidebar

### 2.1 Nav items con íconos

```tsx
import {
  LayoutDashboard, Users, CalendarClock, Receipt,
  ClipboardList, Package, Wallet, Building2, Settings2
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard',          label: 'Inicio',      icon: LayoutDashboard },
  { href: '/patients',           label: 'Pacientes',   icon: Users },
  { href: '/appointments',       label: 'Citas',       icon: CalendarClock },
  { href: '/receipts',           label: 'Recibos',     icon: Receipt },
  { href: '/plans',              label: 'Planes',      icon: ClipboardList },
  { href: '/inventory/products', label: 'Inventario',  icon: Package },
  { href: '/financials',         label: 'Finanzas',    icon: Wallet },
  // Condicionales por rol:
  { href: '/companies',          label: 'Empresas',    icon: Building2,  roles: ['OWNER', 'ADMIN'] },
  { href: '/settings/locations', label: 'Configuración', icon: Settings2, roles: ['OWNER', 'ADMIN'] },
];
```

### 2.2 Cambios en `apps/web/app/tenants/[slug]/(dashboard)/layout.tsx`

- Reemplazar el `<header>` + nav inline por el componente `AppShell`
- Crear un wrapper `'use client'` (`DashboardShell`) para `usePathname` (detección de ruta activa)
- El `layout.tsx` sigue siendo Server Component — pasa `sessionUser` al shell cliente
- `AppShell` recibe `navItems`, `userName`, `userRole` como props

### 2.3 Estructura resultante

```
layout.tsx (Server Component)
  └── <style> (inyección de tema del tenant)
  └── DashboardShell (Client Component — nuevo archivo: components/shell/dashboard-shell.tsx)
        ├── Sidebar (nav items, logo, user info, logout)
        ├── Topbar (breadcrumb, título de sección)
        └── <main> {children}
```

---

## Sección 3 — Piloto: módulo Pacientes

### Archivos a migrar

| Archivo | Componentes a cambiar |
|---|---|
| `patients-page-client.tsx` | Button, Badge, Input, Table* → `@repo/ui`; añadir PageHeader, SearchInput, Pagination |
| `patient-drawer.tsx` | Button, Input, Label, Textarea → `@repo/ui` |
| `patient-detail-client.tsx` | Card, Badge, Button → `@repo/ui` |

*Los primitivos de Table (TableHead, TableBody, TableRow, TableCell) migran a `@repo/ui`.

### Criterio de éxito del piloto

```bash
pnpm lint        # ✅ sin errores
pnpm check-types # ✅ sin errores TypeScript
pnpm test        # ✅ tests en verde (los tests del módulo deben pasar sin cambios)
pnpm build       # ✅ compila
```

---

## Sección 4 — Orden de replicación

Una vez validado el piloto, se replica al resto de módulos en este orden (de menor a mayor complejidad):

| Orden | Módulo | Archivos aprox. |
|---|---|---|
| 1 | Settings (locations, users, service-types) | 9 archivos |
| 2 | Companies | 4 archivos |
| 3 | Plans | 5 archivos |
| 4 | Receipts | 6 archivos |
| 5 | Appointments | 8 archivos |
| 6 | Inventory (products, suppliers, purchase-orders, purchases, movements, stock) | 18 archivos |
| 7 | Financials (sales, income, expense, cash-close) | 8 archivos |

---

## Sección 5 — Componentes que NO se migran

Los siguientes componentes se mantienen en `@/components/ui/` ya que son complejos de Radix y el spec original los deja como shadcn:

- `Sheet` / `SheetContent` (drawers laterales)
- `AlertDialog` (confirmaciones destructivas)
- `Breadcrumb`
- `Separator`

---

## Fuera de scope

- Dark mode
- Animaciones / microinteracciones adicionales
- Storybook / documentación visual de componentes
- Migración de la página de login (fuera del dashboard)
- `apps/web/app/components/form-field.tsx` y `error-state.tsx` — se evalúan durante el piloto; si el módulo Pacientes no los usa, quedan fuera de esta migración
