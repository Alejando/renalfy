'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/settings/locations', label: 'Sucursales' },
  { href: '/settings/users', label: 'Usuarios' },
] as const;

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav>
      <p className="text-[10px] font-semibold font-label uppercase tracking-widest text-secondary mb-3 px-3">
        Configuración
      </p>
      <ul className="space-y-0.5">
        {NAV_ITEMS.map(({ href, label }) => {
          const isActive = pathname.endsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-secondary hover:text-on-surface hover:bg-surface-container'
                }`}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
