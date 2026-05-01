'use client';

import React, { useCallback, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input.js';
import { Label } from '@/components/ui/label.js';
import { Button } from '@/components/ui/button.js';

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

  const debounceTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);

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
    setDateFrom('');
    setDateTo('');
    setClientId('');
    setType('');
    onFilter?.({});
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dateFrom">Desde</Label>
          <Input
            id="dateFrom"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            placeholder="Desde"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dateTo">Hasta</Label>
          <Input
            id="dateTo"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            placeholder="Hasta"
          />
        </div>

        {filterType === 'sales' && (
          <div className="space-y-2">
            <Label htmlFor="clientId">Cliente ID</Label>
            <Input
              id="clientId"
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="ID del cliente"
            />
          </div>
        )}

        {filterType !== 'sales' && (
          <div className="space-y-2">
            <Label htmlFor="type">Tipo</Label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Todos</option>
              {(filterType === 'income' ? INCOME_TYPES : EXPENSE_TYPES).map(
                (opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                )
              )}
            </select>
          </div>
        )}

        <div className="space-y-2">
          <Label>&nbsp;</Label>
          <Button
            variant="outline"
            onClick={handleReset}
            className="w-full"
          >
            Limpiar
          </Button>
        </div>
      </div>
    </div>
  );
}
