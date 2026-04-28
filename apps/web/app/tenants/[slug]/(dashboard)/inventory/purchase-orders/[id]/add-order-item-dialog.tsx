'use client';

import { useState, useEffect } from 'react';
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
import {
  fetchProductsForSupplierAction,
  fetchProductsForSelectAction,
  addOrderItemAction,
} from '@/app/actions/purchase-orders';

interface AddOrderItemDialogProps {
  open: boolean;
  orderId: string;
  supplierId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface SupplierProduct {
  id: string;
  productId: string;
  price: string;
  leadTimeDays: number | null;
  product: { id: string; name: string; brand: string | null };
}

const LABEL_CLASS =
  'block text-[10px] font-label uppercase tracking-widest text-muted-foreground font-semibold';

const FormSchema = z.object({
  productId: z.string().min(1, 'Selecciona un producto'),
  quantity: z.number().int().min(1, 'La cantidad debe ser al menos 1'),
  unitPrice: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Formato de precio inválido'),
});

type FormValues = z.infer<typeof FormSchema>;

export function AddOrderItemDialog({
  open,
  orderId,
  supplierId,
  onClose,
  onSuccess,
}: AddOrderItemDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [supplierProducts, setSupplierProducts] = useState<SupplierProduct[]>([]);
  const [allProducts, setAllProducts] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [isInlineCreation, setIsInlineCreation] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: { quantity: 1, unitPrice: '' },
  });

  useEffect(() => {
    if (open) {
      setLoading(true);
      Promise.all([
        fetchProductsForSupplierAction(supplierId),
        fetchProductsForSelectAction(),
      ])
        .then(([supProducts, allProds]) => {
          setSupplierProducts(supProducts);
          setAllProducts(allProds);
        })
        .catch(() => setServerError('No se pudieron cargar los productos'))
        .finally(() => setLoading(false));
      setStep(1);
      setSelectedProductId('');
      setIsInlineCreation(false);
      setServerError(null);
      reset();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reset is stable from useForm
  }, [open, supplierId]);

  const handleProductSelect = (productId: string) => {
    setSelectedProductId(productId);
    setIsInlineCreation(false);
    const existing = supplierProducts.find((p) => p.productId === productId);
    if (existing) {
      setValue('productId', productId);
      setValue('unitPrice', existing.price);
      setStep(2);
    } else {
      setValue('productId', productId);
      setValue('unitPrice', '');
      setStep(2);
    }
  };

  const handleInlineCreation = (productId: string) => {
    setSelectedProductId(productId);
    setIsInlineCreation(true);
    setValue('productId', productId);
    setValue('unitPrice', '');
    setStep(2);
  };

  const onSubmit = async (data: FormValues) => {
    setServerError(null);
    const formData = new FormData();
    formData.append('orderId', orderId);
    formData.append('productId', data.productId);
    formData.append('quantity', data.quantity.toString());
    formData.append('unitPrice', data.unitPrice);

    const result = await addOrderItemAction(null, formData);
    if (result?.error) {
      setServerError(result.error);
      return;
    }
    onSuccess();
  };

  const associatedProductIds = new Set(supplierProducts.map((p) => p.productId));
  const unassociatedProducts = allProducts.filter(
    (p) => !associatedProductIds.has(p.id),
  );

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-headline font-bold text-xl">
            {step === 1 ? 'Seleccionar Producto' : 'Cantidad y Precio'}
          </AlertDialogTitle>
        </AlertDialogHeader>

        {serverError && (
          <div className="p-3 bg-destructive/10 rounded-lg">
            <p className="text-destructive text-sm font-medium">{serverError}</p>
          </div>
        )}

        {step === 1 ? (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {loading ? (
              <p className="text-muted-foreground text-sm text-center py-8">
                Cargando productos…
              </p>
            ) : (
              <>
                {supplierProducts.length > 0 && (
                  <div>
                    <p className={LABEL_CLASS}>Productos del Proveedor</p>
                    <div className="space-y-2 mt-2">
                      {supplierProducts.map((sp) => (
                        <button
                          key={sp.id}
                          type="button"
                          onClick={() => handleProductSelect(sp.productId)}
                          className="w-full text-left p-3 rounded-lg border hover:border-primary hover:bg-muted/50 transition-colors"
                        >
                          <div className="font-medium text-foreground">
                            {sp.product.name}
                          </div>
                          {sp.product.brand && (
                            <div className="text-xs text-muted-foreground">
                              {sp.product.brand}
                            </div>
                          )}
                          <div className="text-sm text-teal-700 font-medium mt-1">
                            ${Number(sp.price).toLocaleString('es-MX', {
                              minimumFractionDigits: 2,
                            })}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {unassociatedProducts.length > 0 && (
                  <div>
                    <p className={LABEL_CLASS}>Otros Productos (crear registro)</p>
                    <div className="space-y-2 mt-2">
                      {unassociatedProducts.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleInlineCreation(p.id)}
                          className="w-full text-left p-3 rounded-lg border hover:border-primary hover:bg-muted/50 transition-colors"
                        >
                          <div className="font-medium text-foreground">{p.name}</div>
                          <div className="text-xs text-amber-700 mt-1">
                            No está en el catálogo — se creará con precio nuevo
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {supplierProducts.length === 0 && unassociatedProducts.length === 0 && (
                  <p className="text-muted-foreground text-sm text-center py-8">
                    No hay productos disponibles
                  </p>
                )}
              </>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <p className={LABEL_CLASS}>Producto</p>
              <p className="text-foreground font-medium mt-1">
                {allProducts.find((p) => p.id === selectedProductId)?.name ??
                  supplierProducts.find((p) => p.productId === selectedProductId)?.product
                    .name ??
                  '—'}
              </p>
              {isInlineCreation && (
                <p className="text-xs text-amber-700 mt-1">
                  Se creará un registro en el catálogo del proveedor
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="item-quantity" className={LABEL_CLASS}>
                Cantidad <span className="text-destructive">*</span>
              </Label>
              <Input
                id="item-quantity"
                type="number"
                min={1}
                {...register('quantity', { valueAsNumber: true })}
              />
              {errors.quantity && (
                <p className="text-sm text-destructive">{errors.quantity.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="item-unit-price" className={LABEL_CLASS}>
                Precio Unitario <span className="text-destructive">*</span>
              </Label>
              <Input
                id="item-unit-price"
                placeholder="0.00"
                {...register('unitPrice')}
              />
              {errors.unitPrice && (
                <p className="text-sm text-destructive">{errors.unitPrice.message}</p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setStep(1)}
              >
                Atrás
              </Button>
              <Button
                type="submit"
                variant="gradient"
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? 'Agregando…' : 'Agregar a la Orden'}
              </Button>
            </div>
          </form>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}