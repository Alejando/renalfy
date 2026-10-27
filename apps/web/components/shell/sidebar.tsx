'use client';

import * as React from 'react';
import { cn } from '@repo/ui';
import { Button } from '@repo/ui';
import { LogOut, Menu, X } from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
  active?: boolean;
}

export interface SidebarProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  navItems?: NavItem[];
  onLogout?: () => void;
  userRole?: string;
  userName?: string;
  tenantName?: string;
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Propietario',
  ADMIN: 'Administrador',
  MANAGER: 'Encargado',
  STAFF: 'Personal',
  SUPER_ADMIN: 'Super Admin',
};

export function Sidebar({
  open = true,
  onOpenChange,
  navItems = [],
  onLogout,
  userRole,
  userName,
  tenantName = 'Renalfy',
}: SidebarProps) {
  return (
    <>
      {/* Mobile toggle button */}
      <div className="lg:hidden fixed top-4 left-4 z-40">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onOpenChange?.(!open)}
          className="text-rf-ink"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-screen w-64 bg-rf-primary-dark text-white transition-transform duration-300 lg:translate-x-0 z-40 flex flex-col',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header — tenant brand */}
        <div className="px-6 py-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-rf bg-rf-primary flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-bold">
                {tenantName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white leading-tight truncate">{tenantName}</p>
              <p className="text-[10px] text-white/50 uppercase tracking-widest mt-0.5">Clínica</p>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-rf text-sm font-medium transition-rf',
                item.active
                  ? 'bg-white/15 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              )}
            >
              {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
              <span>{item.label}</span>
            </a>
          ))}
        </nav>

        {/* User section */}
        <div className="border-t border-white/10 px-3 py-3">
          {(userName || userRole) && (
            <div className="flex items-center gap-3 px-3 py-2 mb-1">
              <div className="h-7 w-7 rounded-full bg-rf-primary flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-semibold">
                  {userName ? userName.charAt(0).toUpperCase() : '?'}
                </span>
              </div>
              <div className="min-w-0">
                {userName && (
                  <p className="text-sm font-medium text-white leading-tight truncate">{userName}</p>
                )}
                {userRole && (
                  <p className="text-[10px] text-white/50 uppercase tracking-widest">
                    {ROLE_LABELS[userRole] ?? userRole}
                  </p>
                )}
              </div>
            </div>
          )}
          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-rf text-sm text-white/70 hover:bg-white/10 hover:text-white transition-rf"
            >
              <LogOut className="h-4 w-4 flex-shrink-0" />
              <span>Cerrar sesión</span>
            </button>
          )}
        </div>
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => onOpenChange?.(false)}
        />
      )}
    </>
  );
}
