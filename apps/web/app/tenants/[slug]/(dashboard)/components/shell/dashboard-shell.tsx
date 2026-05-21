'use client';

import { useTransition } from 'react';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  CalendarClock,
  Receipt,
  ClipboardList,
  Package,
  Wallet,
  Building2,
  Settings2,
} from 'lucide-react';
import { AppShell } from '@/components/shell/app-shell';
import type { NavItem } from '@/components/shell/sidebar';
import { logoutAction } from '../../../../../actions/auth';

const OWNER_ADMIN_ROLES = ['OWNER', 'ADMIN'];

const NAV_ITEMS: NavItem[] = [
  { label: 'Inicio', href: '/dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: 'Pacientes', href: '/patients', icon: <Users className="h-5 w-5" /> },
  { label: 'Citas', href: '/appointments', icon: <CalendarClock className="h-5 w-5" /> },
  { label: 'Recibos', href: '/receipts', icon: <Receipt className="h-5 w-5" /> },
  { label: 'Planes', href: '/plans', icon: <ClipboardList className="h-5 w-5" /> },
  { label: 'Inventario', href: '/inventory/products', icon: <Package className="h-5 w-5" /> },
  { label: 'Finanzas', href: '/financials', icon: <Wallet className="h-5 w-5" /> },
];

const ROLE_RESTRICTED_ITEMS: NavItem[] = [
  { label: 'Empresas', href: '/companies', icon: <Building2 className="h-5 w-5" /> },
  { label: 'Configuración', href: '/settings/locations', icon: <Settings2 className="h-5 w-5" /> },
];

interface DashboardShellProps {
  children: React.ReactNode;
  userName: string;
  userRole: string;
}

export function DashboardShell({ children, userName, userRole }: DashboardShellProps) {
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const isOwnerOrAdmin = OWNER_ADMIN_ROLES.includes(userRole);

  const navItems = [
    ...NAV_ITEMS.map((item) => ({
      ...item,
      active:
        item.href === '/dashboard'
          ? pathname.endsWith('/dashboard')
          : pathname.includes(item.href),
    })),
    ...(isOwnerOrAdmin
      ? ROLE_RESTRICTED_ITEMS.map((item) => ({
          ...item,
          active: pathname.includes(item.href),
        }))
      : []),
  ];

  const handleLogout = () => {
    startTransition(() => {
      void logoutAction();
    });
  };

  return (
    <AppShell
      sidebar={{
        navItems,
        userName,
        userRole,
        onLogout: handleLogout,
      }}
    >
      {children}
    </AppShell>
  );
}
