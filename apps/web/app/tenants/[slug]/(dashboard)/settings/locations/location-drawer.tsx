'use client';

import { useEffect } from 'react';
import { useForm, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { CreateLocationSchema, UpdateLocationSchema } from '@repo/types';
import type { LocationResponse } from '@repo/types';
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
import {
  createLocationAction,
  updateLocationAction,
} from '../../../../../actions/locations';

type CreateFormValues = z.infer<typeof CreateLocationSchema>;
type UpdateFormValues = z.infer<typeof UpdateLocationSchema>;
type FormValues = CreateFormValues | UpdateFormValues;

interface LocationDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  location?: LocationResponse;
}

const LABEL_CLASS =
  'block text-[10px] font-label uppercase tracking-widest text-muted-foreground font-semibold';

export function LocationDrawer({
  open,
  onClose,
  onSuccess,
  location,
}: LocationDrawerProps) {
  const isEdit = location !== undefined;
  const schema = isEdit ? UpdateLocationSchema : CreateLocationSchema;

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: location
      ? { name: location.name, address: location.address ?? '', phone: location.phone ?? '' }
      : { name: '', address: '', phone: '' },
  });

  useEffect(() => {
    if (!open) {
      reset(
        location
          ? { name: location.name, address: location.address ?? '', phone: location.phone ?? '' }
          : { name: '', address: '', phone: '' },
      );
    }
  }, [open, location, reset]);

  const onInvalid = (fieldErrors: FieldErrors<FormValues>) => {
    for (const [field, error] of Object.entries(fieldErrors)) {
      if (error?.message) {
        setError(field as keyof FormValues, { type: String(error.type ?? 'manual'), message: error.message });
      }
    }
  };

  const onSubmit = async (data: FormValues) => {
    const formData = new FormData();
    if (isEdit && location) {
      formData.append('id', location.id);
    }
    if (data.name) {
      formData.append('name', data.name);
    }
    if (data.address) {
      formData.append('address', data.address);
    }
    if (data.phone) {
      formData.append('phone', data.phone);
    }

    const result = isEdit
      ? await updateLocationAction(null, formData)
      : await createLocationAction(null, formData);

    if (result?.error) {
      setError('root', { message: result.error });
      return;
    }
    onSuccess();
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
            {isEdit ? 'Editar sucursal' : 'Nueva sucursal'}
          </SheetTitle>
          <SheetDescription>
            {isEdit
              ? 'Modifica los datos de la sucursal'
              : 'Agrega una nueva ubicación a tu clínica'}
          </SheetDescription>
        </SheetHeader>

        {errors.root && (
          <div className="mx-8 mt-6 p-3 bg-destructive/10 rounded-lg">
            <p className="text-destructive text-sm font-medium">{errors.root.message}</p>
          </div>
        )}

        <form
          aria-label={isEdit ? 'Editar sucursal' : 'Nueva sucursal'}
          onSubmit={handleSubmit(onSubmit, onInvalid)}
          className="flex-1 overflow-y-auto px-8 py-6 space-y-6"
        >
          {/* Nombre */}
          <div className="space-y-2">
            <Label htmlFor="loc-name" className={LABEL_CLASS}>
              Nombre <span className="text-destructive">*</span>
            </Label>
            <Input
              id="loc-name"
              type="text"
              placeholder="Ej. Sucursal Centro"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Dirección */}
          <div className="space-y-2">
            <Label htmlFor="loc-address" className={LABEL_CLASS}>
              Dirección
            </Label>
            <Input
              id="loc-address"
              type="text"
              placeholder="Ej. Av. Principal 123, Col. Centro"
              {...register('address')}
            />
          </div>

          {/* Teléfono */}
          <div className="space-y-2">
            <Label htmlFor="loc-phone" className={LABEL_CLASS}>
              Teléfono
            </Label>
            <Input
              id="loc-phone"
              type="tel"
              placeholder="Ej. 555-123-4567"
              {...register('phone')}
            />
          </div>

          {/* Actions */}
          <div className="pt-4 flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="gradient"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear sucursal'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
