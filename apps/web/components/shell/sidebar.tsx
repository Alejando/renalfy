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
}

export function Sidebar({
  open = true,
  onOpenChange,
  navItems = [],
  onLogout,
  userRole,
  userName,
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
        {/* Header */}
        <div className="px-6 py-8 border-b border-rf-primary">
          <h1 className="text-xl font-bold">Renalfy</h1>
          <p className="text-sm text-rf-primary-soft">Clínica</p>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-2 rounded-rf text-sm font-medium transition-rf',
                item.active
                  ? 'bg-rf-primary-soft text-rf-primary-ink'
                  : 'text-rf-on-primary hover:bg-rf-primary'
              )}
            >
              {item.icon && <span className="h-5 w-5">{item.icon}</span>}
              <span>{item.label}</span>
            </a>
          ))}
        </nav>

        {/* User section */}
        <div className="border-t border-rf-primary px-4 py-4 space-y-3">
          {(userName || userRole) && (
            <div className="px-2">
              {userName && <p className="text-sm font-medium text-white">{userName}</p>}
              {userRole && (
                <p className="text-xs text-rf-primary-soft uppercase">{userRole}</p>
              )}
            </div>
          )}
          {onLogout && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              className="w-full justify-start text-rf-on-primary hover:bg-rf-primary"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
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
