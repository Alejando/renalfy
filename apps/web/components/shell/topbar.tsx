'use client';

import * as React from 'react';
import { cn } from '@repo/ui';
import { ChevronRight } from 'lucide-react';

interface Breadcrumb {
  label: string;
  href?: string;
}

export interface TopbarProps {
  title?: React.ReactNode;
  breadcrumbs?: Breadcrumb[];
  actions?: React.ReactNode;
  className?: string;
}

export function Topbar({
  title,
  breadcrumbs,
  actions,
  className,
}: TopbarProps) {
  return (
    <div
      className={cn(
        'sticky top-0 z-20 bg-rf-paper border-b border-rf-line px-6 py-4',
        className
      )}
    >
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1 text-sm text-rf-ink-soft mb-4">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {crumb.href ? (
                <a
                  href={crumb.href}
                  className="text-rf-primary hover:underline"
                >
                  {crumb.label}
                </a>
              ) : (
                <span className="text-rf-ink">{crumb.label}</span>
              )}
              {idx < breadcrumbs.length - 1 && (
                <ChevronRight className="h-4 w-4 text-rf-ink-soft mx-1" />
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      {/* Title + Actions */}
      <div className="flex items-center justify-between">
        {title && (
          <h1 className="text-2xl font-bold text-rf-ink">{title}</h1>
        )}
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>
    </div>
  );
}
