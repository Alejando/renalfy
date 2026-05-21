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

interface IncomeItem {
  id: string;
  createdAt: string;
  type: string;
  amount: string | number;
  description?: string | null;
  status: 'ACTIVE' | 'CANCELLED' | string;
}

interface IncomeTableProps {
  incomes?: IncomeItem[];
  isLoading?: boolean;
  onDetails?: (id: string) => void;
  onCancel?: (id: string) => void;
}

const getIncomeTypeLabel = (type: string) => {
  switch (type) {
    case 'SERVICE_FEE': return 'Tarifa de Servicio';
    case 'DEPOSIT': return 'Depósito';
    case 'TRANSFER': return 'Transferencia';
    case 'REFUND': return 'Reembolso';
    case 'SALES_OTHER': return 'Otras Ventas';
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
            <TableCell>{formatDate(income.createdAt)}</TableCell>
            <TableCell>{getIncomeTypeLabel(income.type)}</TableCell>
            <TableCell className="text-right font-medium">
              {formatCurrency(typeof income.amount === 'string' ? parseFloat(income.amount) : income.amount)}
            </TableCell>
            <TableCell>{income.description || '-'}</TableCell>
            <TableCell>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(income.status)}`}>
                {getStatusLabel(income.status)}
              </span>
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
