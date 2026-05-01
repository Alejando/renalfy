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
import { formatCurrency, formatDate } from '@/lib/formatters.js';

interface CashCloseItem {
  id: string;
  date: string;
  totalSales: number;
  totalIncomes: number;
  totalExpenses: number;
  totalCash: number;
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
              {formatCurrency(cashClose.totalSales)}
            </TableCell>
            <TableCell className="text-right">
              {formatCurrency(cashClose.totalIncomes)}
            </TableCell>
            <TableCell className="text-right">
              {formatCurrency(cashClose.totalExpenses)}
            </TableCell>
            <TableCell className="text-right font-bold">
              {formatCurrency(cashClose.totalCash)}
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
