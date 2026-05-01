'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table.js';
import { Button } from '@/components/ui/button.js';
import { Badge } from '@/components/ui/badge.js';
import { formatCurrency, formatDate } from '@/lib/formatters.js';

interface IncomeItem {
  id: string;
  date: string;
  type: string;
  amount: number;
  description?: string;
  status: 'ACTIVE' | 'CANCELLED' | string;
}

interface IncomeTableProps {
  incomes?: IncomeItem[];
  isLoading?: boolean;
  onDetails?: (id: string) => void;
  onCancel?: (id: string) => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'ACTIVE':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'CANCELLED':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'ACTIVE':
      return 'Activo';
    case 'CANCELLED':
      return 'Cancelado';
    default:
      return status;
  }
};

export function IncomeTable({
  incomes = [],
  isLoading = false,
  onDetails,
  onCancel,
}: IncomeTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Cargando ingresos...</p>
      </div>
    );
  }

  if (!incomes || incomes.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">No hay ingresos para mostrar</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fecha</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead className="text-right">Monto</TableHead>
          <TableHead>Descripción</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {incomes.map((income) => (
          <TableRow key={income.id}>
            <TableCell>{formatDate(income.date)}</TableCell>
            <TableCell>{income.type}</TableCell>
            <TableCell className="text-right font-medium">
              {formatCurrency(income.amount)}
            </TableCell>
            <TableCell>{income.description || '-'}</TableCell>
            <TableCell>
              <Badge
                variant="outline"
                className={`${getStatusColor(income.status)}`}
              >
                {getStatusLabel(income.status)}
              </Badge>
            </TableCell>
            <TableCell className="text-right space-x-2">
              {onDetails && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDetails(income.id)}
                >
                  Detalles
                </Button>
              )}
              {onCancel && income.status === 'ACTIVE' && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onCancel(income.id)}
                >
                  Cancelar
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
