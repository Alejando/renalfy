'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface InventoryNavClientProps {
  canViewSummary: boolean;
}

export function InventoryNavClient({ canViewSummary }: InventoryNavClientProps) {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 border-b border-border pb-0 overflow-x-auto">
      <InventoryTab
        href="/inventory/products"
        label="Productos"
        isActive={pathname.endsWith('/inventory/products')}
      />
      <InventoryTab
        href="/inventory/stock"
        label="Stock"
        isActive={pathname.endsWith('/inventory/stock')}
      />
      <InventoryTab
        href="/inventory/suppliers"
        label="Proveedores"
        isActive={pathname.endsWith('/inventory/suppliers')}
      />
      <InventoryTab
        href="/inventory/purchase-orders"
        label="Órdenes"
        isActive={pathname.includes('/inventory/purchase-orders')}
      />
      <InventoryTab
        href="/inventory/purchases"
        label="Compras"
        isActive={pathname.includes('/inventory/purchases')}
      />
      <InventoryTab
        href="/inventory/movements"
        label="Movimientos"
        isActive={pathname.includes('/inventory/movements')}
      />
      {canViewSummary && (
        <InventoryTab
          href="/inventory/summary"
          label="Resumen"
          isActive={pathname.endsWith('/inventory/summary')}
        />
      )}
    </nav>
  );
}

function InventoryTab({
  href,
  label,
  isActive,
}: {
  href: string;
  label: string;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
        isActive
          ? 'text-primary border-b-primary'
          : 'text-muted-foreground hover:text-primary border-b-transparent hover:border-primary/30'
      }`}
    >
      {label}
    </Link>
  );
}
