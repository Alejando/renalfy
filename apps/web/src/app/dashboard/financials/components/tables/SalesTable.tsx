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

interface SalesItem {
  id: string;
  folio: string;
  clientId?: string;
  clientName?: string;
  date: string;
  total: number;
  status: 'ACTIVE' | 'CANCELLED' | string;
}

interface SalesTableProps {
  sales?: SalesItem[];
  isLoading?: boolean;
  onDetails?: (id: string) => void;
  onCancel?: (id: string) => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'ACTIVE':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
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

export function SalesTable({
  sales = [],
  isLoading = false,
  onDetails,
  onCancel,
}: SalesTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Cargando ventas...</p>
      </div>
    );
  }

  if (!sales || sales.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">No hay ventas para mostrar</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Folio</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead>Fecha</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sales.map((sale) => (
          <TableRow key={sale.id}>
            <TableCell className="font-medium">{sale.folio}</TableCell>
            <TableCell>{sale.clientName || sale.clientId || '-'}</TableCell>
            <TableCell>{formatDate(sale.date)}</TableCell>
            <TableCell className="text-right font-medium">
              {formatCurrency(sale.total)}
            </TableCell>
            <TableCell>
              <Badge
                variant="outline"
                className={`${getStatusColor(sale.status)}`}
              >
                {getStatusLabel(sale.status)}
              </Badge>
            </TableCell>
            <TableCell className="text-right space-x-2">
              {onDetails && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDetails(sale.id)}
                >
                  Detalles
                </Button>
              )}
              {onCancel && sale.status === 'ACTIVE' && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onCancel(sale.id)}
                >
                  Anular
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
