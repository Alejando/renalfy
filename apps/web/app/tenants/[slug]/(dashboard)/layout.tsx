import type { ReactNode } from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { LogoutButton } from './components/logout-button';
import { getSessionUser } from '../../../../lib/session';

interface Props {
  children: ReactNode;
}

const SETTINGS_ROLES = ['OWNER', 'ADMIN'] as const;
const ADMIN_ONLY_ROLES = ['OWNER', 'ADMIN'] as const;

const NAV_LINKS = [
  { href: '/dashboard', label: 'Inicio' },
  { href: '/patients', label: 'Pacientes' },
  { href: '/appointments', label: 'Citas' },
  { href: '/receipts', label: 'Recibos' },
  { href: '/plans', label: 'Planes' },
];

export default async function DashboardLayout({ children }: Props) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token');

  // Double-check auth (middleware is the first layer, this is the second)
  if (!accessToken) {
    redirect('/login');
  }

  const sessionUser = await getSessionUser();
  const canAccessSettings =
    sessionUser !== null &&
    (SETTINGS_ROLES as readonly string[]).includes(sessionUser.role);
  const canAccessCompanies =
    sessionUser !== null &&
    (ADMIN_ONLY_ROLES as readonly string[]).includes(sessionUser.role);

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Top navigation */}
      <header className="bg-surface-container-lowest border-b border-surface-container-high sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link
            href="/dashboard"
            className="text-xl font-extrabold tracking-tight text-primary font-headline"
          >
            Renalfy
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-secondary hover:text-primary transition-colors"
              >
                {link.label}
              </Link>
            ))}
            {canAccessCompanies && (
              <Link
                href="/companies"
                className="text-sm font-medium text-secondary hover:text-primary transition-colors"
              >
                Empresas
              </Link>
            )}
            {canAccessSettings && (
              <Link
                href="/settings/locations"
                className="text-sm font-medium text-secondary hover:text-primary transition-colors"
              >
                Configuración
              </Link>
            )}
          </nav>

          {/* User actions */}
          <div className="flex items-center gap-4">
            <Link
              href="/settings/password"
              className="text-sm font-medium text-secondary hover:text-primary transition-colors"
            >
              Mi cuenta
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">{children}</main>
    </div>
  );
}
