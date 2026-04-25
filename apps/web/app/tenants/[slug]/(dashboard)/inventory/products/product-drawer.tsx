'use client';

import { useRouter } from 'next/navigation';
import type { ProductResponse } from '@repo/types';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { ProductForm } from './product-form';

interface ProductDrawerProps {
  open: boolean;
  product: ProductResponse | null;
  categories: Array<{ id: string; name: string }>;
  onClose: () => void;
}

export function ProductDrawer({ open, product, categories, onClose }: ProductDrawerProps) {
  const router = useRouter();

  const handleSuccess = () => {
    onClose();
    router.refresh();
  };

  const isEditMode = product !== null;

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
            {isEditMode ? 'Editar Producto' : 'Nuevo Producto'}
          </SheetTitle>
          <SheetDescription>
            {isEditMode
              ? 'Actualiza los datos del producto'
              : 'Registra un nuevo producto en el catálogo'}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <ProductForm
            onSuccess={handleSuccess}
            onClose={onClose}
            product={product}
            categories={categories}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
