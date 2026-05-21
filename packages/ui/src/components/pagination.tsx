import * as React from 'react';
import { Button } from './button';
import { cn } from '../lib/utils';

export interface PaginationProps {
  page: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ page, total, limit, onPageChange, className }: PaginationProps) {
  const totalPages = Math.ceil(total / limit);

  return (
    <div className={cn('flex items-center justify-between', className)}>
      <p className="text-sm text-rf-ink-muted">
        Página {page} de {totalPages}
      </p>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          Anterior
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page * limit >= total}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}
