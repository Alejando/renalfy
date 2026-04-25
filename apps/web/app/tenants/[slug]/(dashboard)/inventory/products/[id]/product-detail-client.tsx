'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ProductResponse, LocationStockResponse, LocationResponse, UserRole } from '@repo/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProductDrawer } from '../product-drawer';
import { StockConfigDrawer } from './stock-config-drawer';
import { deleteProductAction } from '../../../../../../actions/products';

interface ProductDetailClientProps {
  product: ProductResponse;
  stockEntries: LocationStockResponse[];
  locations: LocationResponse[];
  userRole: UserRole;
  userLocationId: string | null;
}

const CAN_DELETE_ROLES: UserRole[] = ['OWNER', 'ADMIN'];

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  SALE: 'Venta',
  CONSUMABLE: 'Insumo',
};

function getProductTypeBadge(
  productType: string,
): 'status-active' | 'outline' {
  return productType === 'SALE' ? 'status-active' : 'outline';
}

export function ProductDetailClient({
  product,
  stockEntries,
  locations,
  userRole,
}: ProductDetailClientProps) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [stockConfigOpen, setStockConfigOpen] = useState(false);
  const [stockConfigLocationId, setStockConfigLocationId] = useState<string | undefined>(undefined);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isPending, startTransition] = useTransition();

  const openStockConfig = (locationId?: string) => {
    setStockConfigLocationId(locationId);
    setStockConfigOpen(true);
  };

  const canManage = CAN_DELETE_ROLES.includes(userRole);

  const handleDeleteConfirm = () => {
    setShowDeleteDialog(false);
    startTransition(async () => {
      const result = await deleteProductAction(product.id);
      if (result?.error) {
        alert(result.error);
        return;
      }
      router.push('/inventory/products');
    });
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/inventory/products" />}>
              Productos
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{product.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface font-headline">{product.name}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={getProductTypeBadge(product.productType)}>
              {PRODUCT_TYPE_LABELS[product.productType] ?? product.productType}
            </Badge>
            {product.categoryName && (
              <Badge variant="outline">
                {product.categoryName}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {canManage && (
            <>
              <Button variant="outline" onClick={() => setDrawerOpen(true)}>
                Editar
              </Button>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isPending}
              >
                Eliminar
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Product Details Card */}
      <Card>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
          <DetailField
            label="Tipo"
            value={PRODUCT_TYPE_LABELS[product.productType] ?? product.productType}
          />
          <DetailField label="Marca" value={product.brand} />
          <DetailField label="Categoría" value={product.categoryName} />
          <DetailField
            label="Unidades por paquete"
            value={product.packageQty.toString()}
          />
          <DetailField label="Precio de Compra" value={`$${product.purchasePrice}`} />
          <DetailField
            label="Precio de Venta"
            value={
              product.productType === 'SALE'
                ? `$${product.salePrice}`
                : product.salePrice !== '0'
                  ? `$${product.salePrice}`
                  : 'No aplica'
            }
          />
          <DetailField
            label="Alerta Global"
            value={product.globalAlert > 0 ? product.globalAlert.toString() : 'Sin alerta'}
          />
          <div className="md:col-span-3">
            <DetailField label="Descripción" value={product.description} />
          </div>
        </CardContent>
      </Card>

      {/* Stock by Location */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-headline font-semibold">
            Stock por Sucursal
          </CardTitle>
          {canManage && (
            <Button variant="outline" size="sm" onClick={() => openStockConfig()}>
              + Nueva sucursal
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {stockEntries.length === 0 ? (
            <p className="text-secondary text-sm">
              Este producto no tiene stock configurado en ninguna sucursal.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stockEntries.map((entry) => (
                <StockLocationCard
                  key={entry.id}
                  entry={entry}
                  canManage={canManage}
                  onConfigure={() => openStockConfig(entry.locationId)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AlertDialog for delete confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el producto del catálogo. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={isPending}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ProductDrawer
        open={drawerOpen}
        product={product}
        categories={[]}
        onClose={() => setDrawerOpen(false)}
      />

      <StockConfigDrawer
        open={stockConfigOpen}
        productId={product.id}
        productName={product.name}
        locations={locations}
        existingStockEntries={stockEntries}
        initialLocationId={stockConfigLocationId}
        onClose={() => setStockConfigOpen(false)}
      />
    </div>
  );
}

interface StockLocationCardProps {
  entry: LocationStockResponse;
  canManage: boolean;
  onConfigure: () => void;
}

function StockLocationCard({ entry, canManage, onConfigure }: StockLocationCardProps) {
  const isBelowAlert = entry.isBelowAlert;

  return (
    <div
      className={`rounded-lg border p-4 ${
        isBelowAlert
          ? 'border-[#825100]/30 bg-[#825100]/5'
          : 'border-border bg-surface'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-foreground text-sm">
          {entry.locationName ?? entry.locationId}
        </h3>
        <div className="flex items-center gap-2">
          {isBelowAlert && (
            <Badge variant="status-warning" className="text-xs">
              Stock Bajo
            </Badge>
          )}
          {canManage && (
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={onConfigure}>
              Configurar
            </Button>
          )}
        </div>
      </div>
      <div className="space-y-1.5">
        <StockDetail label="Cantidad" value={entry.quantity.toString()} />
        <StockDetail
          label="Stock Mínimo"
          value={entry.minStock > 0 ? entry.minStock.toString() : 'No establecido'}
        />
        <StockDetail
          label="Nivel de Alerta"
          value={entry.effectiveAlertLevel > 0 ? entry.effectiveAlertLevel.toString() : 'Sin alerta'}
        />
        <StockDetail
          label="Unidades/Paquete"
          value={entry.effectivePackageQty.toString()}
        />
      </div>
    </div>
  );
}

function StockDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-medium">{value}</span>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-label uppercase tracking-widest text-muted-foreground font-semibold">
        {label}
      </p>
      <p className="text-foreground text-sm">{value ?? '—'}</p>
    </div>
  );
}
