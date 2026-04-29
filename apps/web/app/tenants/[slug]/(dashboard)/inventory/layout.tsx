import type { ReactNode } from 'react';
import Link from 'next/link';
import { getSessionUser } from '../../../../../lib/session';

interface Props {
  children: ReactNode;
}

const ADMIN_ONLY_ROLES = ['OWNER', 'ADMIN'] as const;

export default async function InventoryLayout({ children }: Props) {
  const sessionUser = await getSessionUser();
  const canViewSummary =
    sessionUser !== null &&
    (ADMIN_ONLY_ROLES as readonly string[]).includes(sessionUser.role);

  return (
    <div className="space-y-6">
      {/* Sub-navigation tabs */}
      <nav className="flex items-center gap-1 border-b border-border pb-0 overflow-x-auto">
        <InventoryTab href="/inventory/products" label="Productos" />
        <InventoryTab href="/inventory/stock" label="Stock" />
        <InventoryTab href="/inventory/suppliers" label="Proveedores" />
        <InventoryTab href="/inventory/purchase-orders" label="Órdenes" />
        <InventoryTab href="/inventory/purchases" label="Compras" />
        <InventoryTab href="/inventory/movements" label="Movimientos" />
        {canViewSummary && (
          <InventoryTab href="/inventory/summary" label="Resumen" />
        )}
      </nav>
      <div>{children}</div>
    </div>
  );
}

function InventoryTab({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-primary border-b-2 border-transparent hover:border-primary/30 transition-colors whitespace-nowrap"
    >
      {label}
    </Link>
  );
}
