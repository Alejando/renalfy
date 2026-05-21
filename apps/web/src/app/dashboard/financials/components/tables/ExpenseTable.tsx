'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/formatters';

interface ExpenseItem {
  id: string;
  createdAt: string;
  type: string;
  amount: string | number;
  description?: string | null;
  status: 'ACTIVE' | 'CANCELLED' | string;
}

interface ExpenseTableProps {
  expenses?: ExpenseItem[];
  isLoading?: boolean;
  onDetails?: (id: string) => void;
  onCancel?: (id: string) => void;
}

const getExpenseTypeLabel = (type: string) => {
  switch (type) {
    case 'PAYROLL': return 'Nómina';
    case 'SUPPLIES': return 'Suministros';
    case 'UTILITIES': return 'Servicios';
    case 'MAINTENANCE': return 'Mantenimiento';
    case 'OTHER': return 'Otro';
    default: return type;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'ACTIVE':
      return 'bg-primary/10 text-primary';
    case 'CANCELLED':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-surface-container text-secondary';
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

export function ExpenseTable({
  expenses = [],
  isLoading = false,
  onDetails,
  onCancel,
}: ExpenseTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Cargando egresos...</p>
      </div>
    );
  }

  if (!expenses || expenses.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">No hay egresos para mostrar</p>
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
        {expenses.map((expense) => (
          <TableRow key={expense.id}>
            <TableCell>{formatDate(expense.createdAt)}</TableCell>
            <TableCell>{getExpenseTypeLabel(expense.type)}</TableCell>
            <TableCell className="text-right font-medium">
              {formatCurrency(typeof expense.amount === 'string' ? parseFloat(expense.amount) : expense.amount)}
            </TableCell>
            <TableCell>{expense.description || '-'}</TableCell>
            <TableCell>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(expense.status)}`}>
                {getStatusLabel(expense.status)}
              </span>
            </TableCell>
            <TableCell className="text-right space-x-2">
              {onDetails && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDetails(expense.id)}
                >
                  Detalles
                </Button>
              )}
              {onCancel && expense.status === 'ACTIVE' && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onCancel(expense.id)}
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
