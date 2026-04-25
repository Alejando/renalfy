'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { LocationResponse, LocationStockResponse } from '@repo/types';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { upsertLocationStockAction } from '../../../../../../actions/stock';

interface StockConfigDrawerProps {
  open: boolean;
  productId: string;
  productName: string;
  locations: LocationResponse[];
  existingStockEntries: LocationStockResponse[];
  initialLocationId?: string;
  onClose: () => void;
}

const LABEL_CLASS =
  'block text-[10px] font-label uppercase tracking-widest text-muted-foreground font-semibold';

const SELECT_CLASS =
  'w-full bg-input border border-border rounded-md px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all appearance-none';

export function StockConfigDrawer({
  open,
  productId,
  productName,
  locations,
  existingStockEntries,
  initialLocationId,
  onClose,
}: StockConfigDrawerProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState(initialLocationId ?? '');
  const [minStock, setMinStock] = useState('0');
  const [alertLevel, setAlertLevel] = useState('0');
  const [packageQty, setPackageQty] = useState('');

  const existingStock = existingStockEntries.find(
    (e) => e.locationId === selectedLocationId,
  );

  useEffect(() => {
    if (!open) return;
    const locId = initialLocationId ?? '';
    setSelectedLocationId(locId);
    setServerError(null);
    const entry = existingStockEntries.find((e) => e.locationId === locId);
    setMinStock(entry ? entry.minStock.toString() : '0');
    setAlertLevel(entry ? entry.alertLevel.toString() : '0');
    setPackageQty(entry?.packageQty != null ? entry.packageQty.toString() : '');
  }, [open, initialLocationId, existingStockEntries]);

  useEffect(() => {
    if (!selectedLocationId) return;
    const entry = existingStockEntries.find((e) => e.locationId === selectedLocationId);
    setMinStock(entry ? entry.minStock.toString() : '0');
    setAlertLevel(entry ? entry.alertLevel.toString() : '0');
    setPackageQty(entry?.packageQty != null ? entry.packageQty.toString() : '');
  }, [selectedLocationId, existingStockEntries]);

  const handleSave = async () => {
    setServerError(null);

    if (!selectedLocationId) {
      setServerError('Selecciona una sucursal');
      return;
    }

    if (!/^\d+$/.test(minStock)) {
      setServerError('Stock mínimo debe ser un número entero');
      return;
    }
    if (!/^\d+$/.test(alertLevel)) {
      setServerError('Nivel de alerta debe ser un número entero');
      return;
    }
    if (packageQty && !/^\d+$/.test(packageQty)) {
      setServerError('Unidades por paquete debe ser un número entero');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await upsertLocationStockAction({
        locationId: selectedLocationId,
        productId,
        minStock: parseInt(minStock, 10),
        alertLevel: parseInt(alertLevel, 10),
        packageQty: packageQty ? parseInt(packageQty, 10) : null,
      });

      if (result?.error) {
        setServerError(result.error);
        return;
      }

      onClose();
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(isOpen: boolean) => {
        if (!isOpen) {
          onClose();
        }
      }}
    >
      <SheetContent side="right" className="w-full max-w-md flex flex-col p-0">
        <SheetHeader className="px-8 py-6 bg-muted">
          <SheetTitle className="font-headline font-bold text-xl">
            Configurar Stock
          </SheetTitle>
          <SheetDescription>
            Asigna o actualiza los parámetros de stock de <strong>{productName}</strong> en una
            sucursal
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5">
          {serverError && (
            <div className="p-3 bg-destructive/10 rounded-lg">
              <p className="text-destructive text-sm font-medium">{serverError}</p>
            </div>
          )}

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="stock-config-location" className={LABEL_CLASS}>
              Sucursal <span className="text-destructive">*</span>
            </Label>
            {initialLocationId ? (
              <p className="text-sm text-foreground font-medium py-2">
                {locations.find((l) => l.id === initialLocationId)?.name ?? initialLocationId}
              </p>
            ) : (
              <select
                id="stock-config-location"
                aria-label="Sucursal"
                className={SELECT_CLASS}
                value={selectedLocationId}
                onChange={(e) => {
                  setSelectedLocationId(e.target.value);
                  setServerError(null);
                }}
              >
                <option value="">Selecciona una sucursal</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            )}
            {existingStock && (
              <p className="text-xs text-muted-foreground">
                Stock actual: {existingStock.quantity} unidades
              </p>
            )}
          </div>

          {/* Min Stock */}
          <div className="space-y-2">
            <Label htmlFor="stock-config-min-stock" className={LABEL_CLASS}>
              Stock Mínimo
            </Label>
            <Input
              id="stock-config-min-stock"
              aria-label="Stock Mínimo"
              value={minStock}
              onChange={(e) => setMinStock(e.target.value)}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground">
              Cantidad mínima esperada en esta sucursal
            </p>
          </div>

          {/* Alert Level */}
          <div className="space-y-2">
            <Label htmlFor="stock-config-alert-level" className={LABEL_CLASS}>
              Nivel de Alerta Local
            </Label>
            <Input
              id="stock-config-alert-level"
              aria-label="Nivel de Alerta Local"
              value={alertLevel}
              onChange={(e) => setAlertLevel(e.target.value)}
              placeholder="0 = usa alerta global"
            />
            <p className="text-xs text-muted-foreground">
              Si es 0, se usa la alerta global del producto
            </p>
          </div>

          {/* Package Qty */}
          <div className="space-y-2">
            <Label htmlFor="stock-config-package-qty" className={LABEL_CLASS}>
              Unidades por Paquete (local)
            </Label>
            <Input
              id="stock-config-package-qty"
              aria-label="Unidades por Paquete local"
              value={packageQty}
              onChange={(e) => setPackageQty(e.target.value)}
              placeholder="Usa el global del producto"
            />
            <p className="text-xs text-muted-foreground">
              Vacío usa las unidades globales del producto
            </p>
          </div>

          {/* Actions */}
          <div className="pt-4 flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="gradient"
              disabled={isSubmitting}
              className="flex-1"
              onClick={handleSave}
            >
              {isSubmitting ? 'Guardando…' : existingStock ? 'Actualizar' : 'Configurar'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
