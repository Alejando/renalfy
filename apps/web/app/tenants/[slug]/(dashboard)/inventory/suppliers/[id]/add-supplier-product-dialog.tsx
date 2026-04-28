'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { addSupplierProductAction } from '@/app/actions/suppliers';

const FormSchema = z.object({
  price: z.string().min(1, 'El precio es obligatorio'),
  leadTimeDays: z.string().optional(),
});

type FormValues = z.infer<typeof FormSchema>;

interface AddSupplierProductDialogProps {
  open: boolean;
  supplierId: string;
  existingProductIds: Set<string>;
  allProducts: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSuccess: () => void;
}

const LABEL_CLASS =
  'block text-[10px] font-label uppercase tracking-widest text-muted-foreground font-semibold';

export function AddSupplierProductDialog({
  open,
  supplierId,
  existingProductIds,
  allProducts,
  onClose,
  onSuccess,
}: AddSupplierProductDialogProps) {
  const [selectedProductId, setSelectedProductId] = useState('');
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: { price: '' },
  });

  const availableProducts = allProducts.filter(
    (p) => !existingProductIds.has(p.id),
  );

  const onSubmit = async (data: FormValues) => {
    setServerError(null);
    if (!selectedProductId) {
      setServerError('Selecciona un producto');
      return;
    }

    const result = await addSupplierProductAction(supplierId, {
      productId: selectedProductId,
      price: data.price,
      leadTimeDays: data.leadTimeDays
        ? parseInt(data.leadTimeDays)
        : undefined,
    });
    if (result?.error) {
      setServerError(result.error);
      return;
    }
    onSuccess();
  };

  const handleClose = () => {
    reset();
    setSelectedProductId('');
    setServerError(null);
    onClose();
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-headline font-bold text-xl">
            Agregar Producto al Proveedor
          </AlertDialogTitle>
        </AlertDialogHeader>

        {serverError && (
          <div className="p-3 bg-destructive/10 rounded-lg">
            <p className="text-destructive text-sm font-medium">{serverError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <label
              htmlFor="supplier-product-select"
              className={LABEL_CLASS}
            >
              Producto <span className="text-destructive">*</span>
            </label>
            <select
              id="supplier-product-select"
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Selecciona un producto</option>
              {availableProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {availableProducts.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Todos los productos ya están asociados a este proveedor.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="product-price" className={LABEL_CLASS}>
              Precio <span className="text-destructive">*</span>
            </Label>
            <Input
              id="product-price"
              type="text"
              placeholder="0.00"
              {...register('price')}
            />
            {errors.price && (
              <p className="text-sm text-destructive">
                {errors.price.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="product-lead-time" className={LABEL_CLASS}>
              Lead Time (días)
            </Label>
            <Input
              id="product-lead-time"
              type="number"
              min={0}
              placeholder="Ej: 5"
              {...register('leadTimeDays')}
            />
          </div>

          <div className="pt-4 flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleClose}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="gradient"
              disabled={isSubmitting || !selectedProductId}
              className="flex-1"
            >
              {isSubmitting ? 'Agregando…' : 'Agregar Producto'}
            </Button>
          </div>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}