'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { PaginatedStockSummaryResponse, StockSummaryItem } from '@repo/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '../../../../../components/empty-state';

interface SummaryPageClientProps {
  summary: PaginatedStockSummaryResponse;
}

const TABLE_HEAD_CLASS =
  'text-[10px] font-label uppercase tracking-widest text-muted-foreground font-semibold';

export function SummaryPageClient({ summary }: SummaryPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  const onlyAlerts = searchParams.get('isAnyLocationBelowAlert') === 'true';

  const hasMultiplePages = summary.total > summary.limit;

  const toggleAlertsFilter = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (onlyAlerts) {
      params.delete('isAnyLocationBelowAlert');
    } else {
      params.set('isAnyLocationBelowAlert', 'true');
    }
    params.set('page', '1');
    router.push(`?${params.toString()}`);
  };

  const goToPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`?${params.toString()}`);
  };

  const toggleExpand = (productId: string) => {
    setExpandedProduct(expandedProduct === productId ? null : productId);
  };

  const totalStock = summary.data.reduce((acc, item) => acc + item.totalQuantity, 0);
  const productsWithAlerts = summary.data.filter(
    (item) => item.isAnyLocationBelowAlert,
  ).length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface font-headline">
            Resumen de Stock
          </h1>
          <p className="text-secondary text-sm mt-1">
            Visión consolidada del inventario en todas las sucursales
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Productos con stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{summary.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Unidades totales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{totalStock}</p>
          </CardContent>
        </Card>
        <Card className={productsWithAlerts > 0 ? 'border-[#825100]/30' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Productos en alerta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold ${productsWithAlerts > 0 ? 'text-[#825100]' : 'text-foreground'}`}
            >
              {productsWithAlerts}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Button
          variant={onlyAlerts ? 'gradient' : 'outline'}
          size="sm"
          onClick={toggleAlertsFilter}
        >
          {onlyAlerts ? 'Mostrando solo con alertas' : 'Solo con alertas'}
        </Button>
      </div>

      {/* Table or empty state */}
      {summary.data.length === 0 ? (
        <EmptyState
          title="Sin productos en stock"
          description={
            onlyAlerts
              ? 'Ningún producto tiene stock bajo en este momento.'
              : 'No hay productos con stock configurado aún.'
          }
        />
      ) : (
        <>
          <div className="rounded-xl overflow-hidden border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={TABLE_HEAD_CLASS}>Producto</TableHead>
                  <TableHead className={TABLE_HEAD_CLASS}>Cantidad Total</TableHead>
                  <TableHead className={`${TABLE_HEAD_CLASS} hidden md:table-cell`}>
                    Sucursales
                  </TableHead>
                  <TableHead className={`${TABLE_HEAD_CLASS} hidden md:table-cell`}>
                    Estado
                  </TableHead>
                  <TableHead className={`${TABLE_HEAD_CLASS} text-right`}>
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.data.map((item: StockSummaryItem) => (
                  <StockSummaryRow
                    key={item.productId}
                    item={item}
                    isExpanded={expandedProduct === item.productId}
                    onToggle={() => toggleExpand(item.productId)}
                  />
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {hasMultiplePages && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-secondary">
                Página {summary.page} de {Math.ceil(summary.total / summary.limit)}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => goToPage(summary.page - 1)}
                  disabled={summary.page <= 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  onClick={() => goToPage(summary.page + 1)}
                  disabled={summary.page * summary.limit >= summary.total}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface StockSummaryRowProps {
  item: StockSummaryItem;
  isExpanded: boolean;
  onToggle: () => void;
}

function StockSummaryRow({ item, isExpanded, onToggle }: StockSummaryRowProps) {
  return (
    <>
      <TableRow className={isExpanded ? 'bg-muted/50' : ''}>
        <TableCell className="text-foreground font-medium text-sm">
          {item.productName}
        </TableCell>
        <TableCell className="text-foreground font-semibold text-sm">
          {item.isAnyLocationBelowAlert ? (
            <span className="text-[#825100]">{item.totalQuantity}</span>
          ) : (
            item.totalQuantity
          )}
        </TableCell>
        <TableCell className="text-muted-foreground text-sm hidden md:table-cell">
          {item.locationBreakdown.length}
        </TableCell>
        <TableCell className="hidden md:table-cell">
          {item.isAnyLocationBelowAlert ? (
            <Badge variant="status-warning">Alerta</Badge>
          ) : (
            <Badge variant="status-active">OK</Badge>
          )}
        </TableCell>
        <TableCell>
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onToggle}>
              {isExpanded ? 'Ocultar' : 'Ver sucursales'}
            </Button>
            <Link href={`/inventory/products/${item.productId}`}>
              <Button variant="ghost" size="sm">
                Detalle
              </Button>
            </Link>
          </div>
        </TableCell>
      </TableRow>
      {isExpanded && (
        <TableRow>
          <TableCell colSpan={5} className="p-0">
            <div className="bg-muted/30 px-6 py-3">
              <p className="text-[10px] font-label uppercase tracking-widest text-muted-foreground font-semibold mb-2">
                Desglose por Sucursal
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {item.locationBreakdown.map((loc) => (
                  <div
                    key={loc.locationId}
                    className={`rounded-lg border p-3 ${
                      loc.isBelowAlert
                        ? 'border-[#825100]/30 bg-[#825100]/5'
                        : 'border-border bg-surface'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-foreground font-medium text-sm">
                        {loc.locationName}
                      </span>
                      {loc.isBelowAlert && (
                        <Badge variant="status-warning" className="text-xs">
                          Alerta
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground text-sm mt-1">
                      Cantidad: <span className="font-semibold">{loc.quantity}</span>
                    </p>
                    {loc.effectiveAlertLevel > 0 && (
                      <p className="text-muted-foreground text-xs mt-0.5">
                        Alerta: {loc.effectiveAlertLevel}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
