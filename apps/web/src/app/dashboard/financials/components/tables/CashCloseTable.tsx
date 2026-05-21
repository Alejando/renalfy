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

interface CashCloseItem {
  id: string;
  date: string | Date;
  salesTotal: string | number;
  incomesTotal: string | number;
  expensesTotal: string | number;
  calculatedTotal: string | number;
}

interface CashCloseTableProps {
  cashCloses?: CashCloseItem[];
  isLoading?: boolean;
  onDetails?: (id: string) => void;
}

export function CashCloseTable({
  cashCloses = [],
  isLoading = false,
  onDetails,
}: CashCloseTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Cargando cortes de caja...</p>
      </div>
    );
  }

  if (!cashCloses || cashCloses.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">No hay cortes de caja para mostrar</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fecha</TableHead>
          <TableHead className="text-right">Ventas</TableHead>
          <TableHead className="text-right">Ingresos</TableHead>
          <TableHead className="text-right">Egresos</TableHead>
          <TableHead className="text-right font-bold">Total en Caja</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {cashCloses.map((cashClose) => (
          <TableRow key={cashClose.id}>
            <TableCell>{formatDate(cashClose.date)}</TableCell>
            <TableCell className="text-right">
              {formatCurrency(Number(cashClose.salesTotal ?? 0))}
            </TableCell>
            <TableCell className="text-right">
              {formatCurrency(Number(cashClose.incomesTotal ?? 0))}
            </TableCell>
            <TableCell className="text-right">
              {formatCurrency(Number(cashClose.expensesTotal ?? 0))}
            </TableCell>
            <TableCell className="text-right font-bold">
              {formatCurrency(Number(cashClose.calculatedTotal ?? 0))}
            </TableCell>
            <TableCell className="text-right">
              {onDetails && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDetails(cashClose.id)}
                >
                  Detalles
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
