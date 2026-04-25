'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { ProductResponse } from '@repo/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { createProductAction, updateProductAction } from '../../../../../actions/products';

const FormSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  brand: z.string().optional(),
  productType: z.enum(['SALE', 'CONSUMABLE']),
  categoryId: z.string().optional(),
  description: z.string().optional(),
  purchasePrice: z
    .string()
    .min(1, 'El precio de compra es obligatorio')
    .regex(/^\d+(\.\d{1,2})?$/, 'Formato de precio de compra inválido'),
  salePrice: z
    .string()
    .regex(/^(\d+(\.\d{1,2})?)?$/, 'Formato de precio de venta inválido'),
  packageQty: z.number().int().min(1, 'Mínimo 1 unidad por paquete'),
  globalAlert: z.number().int().min(0, 'No puede ser negativo'),
});

type FormValues = z.infer<typeof FormSchema>;

interface ProductFormProps {
  onSuccess: () => void;
  onClose: () => void;
  product?: ProductResponse | null;
  categories: Array<{ id: string; name: string }>;
}

const LABEL_CLASS =
  'block text-[10px] font-label uppercase tracking-widest text-muted-foreground font-semibold';

const SELECT_CLASS =
  'w-full bg-input border border-border rounded-md px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all appearance-none';

const isEditMode = (product: ProductResponse | null | undefined): product is ProductResponse =>
  product != null;

export function ProductForm({ onSuccess, onClose, product, categories }: ProductFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const editMode = isEditMode(product);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: product?.name ?? '',
      brand: product?.brand ?? '',
      productType: product?.productType ?? 'SALE',
      categoryId: product?.categoryId ?? '',
      description: product?.description ?? '',
      purchasePrice: product?.purchasePrice ?? '',
      salePrice: product?.salePrice ?? '',
      packageQty: product?.packageQty ?? 1,
      globalAlert: product?.globalAlert ?? 0,
    },
  });

  const productTypeValue = watch('productType');

  const onSubmit = async (data: FormValues) => {
    setServerError(null);
    const formData = new FormData();
    if (editMode) {
      formData.append('id', product.id);
    }
    formData.append('name', data.name);
    if (data.brand) formData.append('brand', data.brand);
    formData.append('productType', data.productType);
    if (data.categoryId) formData.append('categoryId', data.categoryId);
    if (data.description) formData.append('description', data.description);
    formData.append('purchasePrice', data.purchasePrice);
    formData.append('salePrice', data.salePrice || '0');
    formData.append('packageQty', data.packageQty.toString());
    formData.append('globalAlert', data.globalAlert.toString());

    const action = editMode ? updateProductAction : createProductAction;
    const result = await action(null, formData);
    if (result?.error) {
      setServerError(result.error);
      return;
    }
    onSuccess();
  };

  return (
    <>
      {serverError && (
        <div className="mb-4 p-3 bg-destructive/10 rounded-lg">
          <p className="text-destructive text-sm font-medium">{serverError}</p>
        </div>
      )}
      <form
        aria-label={editMode ? 'Editar producto' : 'Nuevo producto'}
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-5"
      >
        {/* Nombre */}
        <div className="space-y-2">
          <Label htmlFor="product-name" className={LABEL_CLASS}>
            Nombre del Producto <span className="text-destructive">*</span>
          </Label>
          <Input
            id="product-name"
            aria-label="Nombre del Producto"
            placeholder="Ej: Concentrado Ácido"
            {...register('name')}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        {/* Product Type */}
        <div className="space-y-2">
          <Label className={LABEL_CLASS}>
            Tipo de Producto <span className="text-destructive">*</span>
          </Label>
          <div className="flex gap-3">
            <label className="flex items-center gap-2 px-4 py-3 rounded-lg border border-border bg-input flex-1 cursor-pointer hover:border-primary/30 transition-colors">
              <input
                type="radio"
                value="SALE"
                className="accent-primary"
                {...register('productType')}
              />
              <div>
                <p className="text-foreground text-sm font-medium">Venta</p>
                <p className="text-muted-foreground text-xs">Producto comercializado al paciente</p>
              </div>
            </label>
            <label className="flex items-center gap-2 px-4 py-3 rounded-lg border border-border bg-input flex-1 cursor-pointer hover:border-primary/30 transition-colors">
              <input
                type="radio"
                value="CONSUMABLE"
                className="accent-primary"
                {...register('productType')}
              />
              <div>
                <p className="text-foreground text-sm font-medium">Insumo</p>
                <p className="text-muted-foreground text-xs">Material consumido en sesiones</p>
              </div>
            </label>
          </div>
        </div>

        {/* Marca */}
        <div className="space-y-2">
          <Label htmlFor="product-brand" className={LABEL_CLASS}>
            Marca
          </Label>
          <Input
            id="product-brand"
            aria-label="Marca"
            placeholder="Ej: Baxter"
            {...register('brand')}
          />
        </div>

        {/* Categoría */}
        <div className="space-y-2">
          <Label htmlFor="product-category" className={LABEL_CLASS}>
            Categoría
          </Label>
          <select
            id="product-category"
            aria-label="Categoría"
            className={SELECT_CLASS}
            value={watch('categoryId')}
            onChange={(e) => setValue('categoryId', e.target.value)}
          >
            <option value="">Sin categoría</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Descripción */}
        <div className="space-y-2">
          <Label htmlFor="product-description" className={LABEL_CLASS}>
            Descripción
          </Label>
          <Textarea
            id="product-description"
            aria-label="Descripción"
            rows={3}
            placeholder="Descripción del producto..."
            {...register('description')}
          />
        </div>

        {/* Precios */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="product-purchase-price" className={LABEL_CLASS}>
              Precio de Compra <span className="text-destructive">*</span>
            </Label>
            <Input
              id="product-purchase-price"
              aria-label="Precio de Compra"
              type="text"
              placeholder="Ej: 150.00"
              {...register('purchasePrice')}
            />
            {errors.purchasePrice && (
              <p className="text-sm text-destructive">{errors.purchasePrice.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="product-sale-price" className={LABEL_CLASS}>
              Precio de Venta
              {productTypeValue === 'SALE' && <span className="text-destructive"> *</span>}
            </Label>
            <Input
              id="product-sale-price"
              aria-label="Precio de Venta"
              type="text"
              placeholder={productTypeValue === 'CONSUMABLE' ? '0 = no aplica' : 'Ej: 250.00'}
              {...register('salePrice')}
            />
            {errors.salePrice && (
              <p className="text-sm text-destructive">{errors.salePrice.message}</p>
            )}
          </div>
        </div>

        {/* Package Qty y Alert */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="product-packageQty" className={LABEL_CLASS}>
              Unidades por Paquete
            </Label>
            <Input
              id="product-packageQty"
              aria-label="Unidades por Paquete"
              type="number"
              min={1}
              step={1}
              {...register('packageQty', { valueAsNumber: true })}
            />
            {errors.packageQty && (
              <p className="text-sm text-destructive">{errors.packageQty.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="product-globalAlert" className={LABEL_CLASS}>
              Alerta Global
            </Label>
            <Input
              id="product-globalAlert"
              aria-label="Alerta Global"
              type="number"
              min={0}
              step={1}
              placeholder="0 = sin alerta"
              {...register('globalAlert', { valueAsNumber: true })}
            />
            {errors.globalAlert && (
              <p className="text-sm text-destructive">{errors.globalAlert.message}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="pt-4 flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="gradient"
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? 'Guardando…' : editMode ? 'Guardar Cambios' : 'Crear Producto'}
          </Button>
        </div>
      </form>
    </>
  );
}
