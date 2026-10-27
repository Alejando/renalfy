import * as React from 'react';
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
  const start = Math.min((page - 1) * limit + 1, total);
  const end = Math.min(page * limit, total);

  const getPages = (): (number | '…')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | '…')[] = [1];
    if (page > 3) pages.push('…');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('…');
    pages.push(totalPages);
    return pages;
  };

  const pillBase =
    'inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-semibold transition-rf cursor-pointer border';

  return (
    <div className={cn('flex items-center justify-between', className)}>
      <span className="text-[13px] text-rf-ink-soft font-medium font-mono">
        {total === 0 ? 'Sin resultados' : `Mostrando ${start}–${end} de ${total}`}
      </span>

      <div className="flex items-center gap-1.5">
        <button
          aria-label="Anterior"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className={cn(pillBase, 'border-rf-line-strong bg-rf-surface text-rf-ink-muted hover:bg-rf-surface-sunk disabled:opacity-40 disabled:cursor-not-allowed')}
        >
          ‹
        </button>

        {getPages().map((p, i) =>
          p === '…' ? (
            <span key={`ellipsis-${i}`} className="w-8 text-center text-rf-ink-faint text-sm select-none">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={cn(
                pillBase,
                p === page
                  ? 'bg-rf-primary text-white border-rf-primary shadow-sm'
                  : 'border-rf-line-strong bg-rf-surface text-rf-ink-muted hover:bg-rf-surface-sunk'
              )}
            >
              {p}
            </button>
          )
        )}

        <button
          aria-label="Siguiente"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className={cn(pillBase, 'border-rf-line-strong bg-rf-surface text-rf-ink-muted hover:bg-rf-surface-sunk disabled:opacity-40 disabled:cursor-not-allowed')}
        >
          ›
        </button>
      </div>
    </div>
  );
}
