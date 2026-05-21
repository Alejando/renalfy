'use client';

import * as React from 'react';
import { cn } from '@repo/ui';
import { Sidebar, type SidebarProps } from './sidebar';
import { Topbar, type TopbarProps } from './topbar';

interface AppShellProps {
  children: React.ReactNode;
  sidebar?: Omit<SidebarProps, 'open' | 'onOpenChange'> | boolean;
  topbar?: TopbarProps | boolean;
  className?: string;
  contentClassName?: string;
}

export function AppShell({
  children,
  sidebar = true,
  topbar = true,
  className,
  contentClassName,
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const showSidebar = sidebar !== false;
  const showTopbar = topbar !== false;

  return (
    <div className={cn('min-h-screen bg-rf-paper', className)}>
      {/* Sidebar */}
      {showSidebar && (
        <Sidebar
          open={sidebarOpen}
          onOpenChange={setSidebarOpen}
          {...(typeof sidebar === 'object' ? sidebar : {})}
        />
      )}

      {/* Main content area */}
      <main
        className={cn(
          'transition-margin duration-300',
          showSidebar && 'lg:ml-64'
        )}
      >
        {/* Topbar */}
        {showTopbar && <Topbar {...(typeof topbar === 'object' ? topbar : {})} />}

        {/* Page content */}
        <div className={cn('p-6 lg:p-8', contentClassName)}>
          {children}
        </div>
      </main>
    </div>
  );
}
