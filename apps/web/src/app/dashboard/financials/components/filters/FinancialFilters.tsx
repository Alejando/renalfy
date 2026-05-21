'use client';

import React, { useCallback, useRef, useEffect } from 'react';

interface FilterValues {
  dateFrom?: string;
  dateTo?: string;
  clientId?: string;
  type?: string;
}

interface FinancialFiltersProps {
  onFilter?: (filters: FilterValues) => void;
  filterType?: 'sales' | 'income' | 'expense';
}

const INCOME_TYPES = [
  { value: 'SALES_OTHER', label: 'Otras ventas' },
  { value: 'REFUND', label: 'Reembolso' },
  { value: 'INTEREST', label: 'Intereses' },
];

const EXPENSE_TYPES = [
  { value: 'SUPPLIES', label: 'Suministros' },
  { value: 'UTILITIES', label: 'Servicios' },
  { value: 'MAINTENANCE', label: 'Mantenimiento' },
  { value: 'SALARY', label: 'Salarios' },
];

export function FinancialFilters({
  onFilter,
  filterType = 'sales',
}: FinancialFiltersProps) {
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');
  const [clientId, setClientId] = React.useState('');
  const [type, setType] = React.useState('');
  const [activeChip, setActiveChip] = React.useState<'mes' | 'anterior' | 'año' | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const getChipDates = (chip: 'mes' | 'anterior' | 'año') => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    if (chip === 'mes') {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: fmt(from), to: fmt(now) };
    }
    if (chip === 'anterior') {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: fmt(from), to: fmt(to) };
    }
    // año
    const from = new Date(now.getFullYear(), 0, 1);
    return { from: fmt(from), to: fmt(now) };
  };

  const handleChipClick = (chip: 'mes' | 'anterior' | 'año') => {
    if (activeChip === chip) {
      setActiveChip(null);
      setDateFrom('');
      setDateTo('');
    } else {
      const { from, to } = getChipDates(chip);
      setActiveChip(chip);
      setDateFrom(from);
      setDateTo(to);
    }
  };

  const handleFilter = useCallback(() => {
    const filters: FilterValues = {};

    if (dateFrom) {
      filters.dateFrom = dateFrom;
    }
    if (dateTo) {
      filters.dateTo = dateTo;
    }
    if (filterType === 'sales' && clientId) {
      filters.clientId = clientId;
    }
    if (filterType !== 'sales' && type) {
      filters.type = type;
    }

    onFilter?.(filters);
  }, [dateFrom, dateTo, clientId, type, filterType, onFilter]);

  useEffect(() => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer with 300ms debounce
    debounceTimerRef.current = setTimeout(() => {
      handleFilter();
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [dateFrom, dateTo, clientId, type, handleFilter]);

  const handleReset = () => {
    setActiveChip(null);
    setDateFrom('');
    setDateTo('');
    setClientId('');
    setType('');
    onFilter?.({});
  };

  return (
    <div className="space-y-3">
      {/* Quick-select chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {(
          [
            { key: 'mes', label: 'Este Mes' },
            { key: 'anterior', label: 'Mes Anterior' },
            { key: 'año', label: 'Este Año' },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => handleChipClick(key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeChip === key
                ? 'bg-primary text-white'
                : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
            }`}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={handleReset}
          className="px-4 py-1.5 rounded-full text-sm font-medium bg-surface-container text-secondary hover:bg-surface-container-high transition-colors"
        >
          Limpiar
        </button>
      </div>

      {/* Secondary filters row */}
      <div className="flex items-center gap-3 flex-wrap">
        {filterType === 'sales' && (
          <input
            type="text"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="Filtrar por cliente..."
            className="px-3 py-2 bg-surface-container rounded-lg text-sm text-on-surface placeholder:text-secondary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        )}
        {filterType !== 'sales' && (
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="px-3 py-2 bg-surface-container rounded-lg text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Todos los tipos</option>
            {(filterType === 'income' ? INCOME_TYPES : EXPENSE_TYPES).map(
              (opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              )
            )}
          </select>
        )}
      </div>
    </div>
  );
}
