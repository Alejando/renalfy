'use client';

import { useEffect } from 'react';
import { useForm, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { CreateServiceTypeSchema, UpdateServiceTypeSchema } from '@repo/types';
import type { ServiceTypeResponse } from '@repo/types';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  createServiceTypeAction,
  updateServiceTypeAction,
} from '../../../../../actions/service-types';

type CreateFormValues = z.infer<typeof CreateServiceTypeSchema>;
type UpdateFormValues = z.infer<typeof UpdateServiceTypeSchema>;
type FormValues = CreateFormValues | UpdateFormValues;

interface ServiceTypeDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  serviceType?: ServiceTypeResponse;
}

const LABEL_CLASS =
  'block text-[10px] font-label uppercase tracking-widest text-muted-foreground font-semibold';

export function ServiceTypeDrawer({
  open,
  onClose,
  onSuccess,
  serviceType,
}: ServiceTypeDrawerProps) {
  const isEdit = serviceType !== undefined;
  const schema = isEdit ? UpdateServiceTypeSchema : CreateServiceTypeSchema;

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: serviceType
      ? {
          name: serviceType.name,
          description: serviceType.description ?? '',
          price: serviceType.price ?? undefined,
        }
      : { name: '', description: '', price: undefined },
  });

  useEffect(() => {
    if (!open) {
      reset(
        serviceType
          ? {
              name: serviceType.name,
              description: serviceType.description ?? '',
              price: serviceType.price ?? undefined,
            }
          : { name: '', description: '', price: undefined },
      );
    }
  }, [open, serviceType, reset]);

  const onInvalid = (fieldErrors: FieldErrors<FormValues>) => {
    for (const [field, error] of Object.entries(fieldErrors)) {
      if (error?.message) {
        setError(field as keyof FormValues, { type: String(error.type ?? 'manual'), message: error.message });
      }
    }
  };

  const onSubmit = async (data: FormValues) => {
    const formData = new FormData();
    if (isEdit && serviceType) {
      formData.append('id', serviceType.id);
    }
    if (data.name) {
      formData.append('name', data.name);
    }
    if (data.description) {
      formData.append('description', data.description);
    }
    if (data.price !== undefined && data.price !== null) {
      formData.append('price', String(data.price));
    }

    const result = isEdit
      ? await updateServiceTypeAction(null, formData)
      : await createServiceTypeAction(null, formData);

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
            {isEdit ? 'Editar tipo de servicio' : 'Nuevo tipo de servicio'}
          </SheetTitle>
          <SheetDescription>
            {isEdit
              ? 'Modifica los datos del tipo de servicio'
              : 'Agrega un nuevo tipo de servicio a tu clínica'}
          </SheetDescription>
        </SheetHeader>

        {errors.root && (
          <div className="mx-8 mt-6 p-3 bg-destructive/10 rounded-lg">
            <p className="text-destructive text-sm font-medium">{errors.root.message}</p>
          </div>
        )}

        <form
          aria-label={isEdit ? 'Editar tipo de servicio' : 'Nuevo tipo de servicio'}
          onSubmit={handleSubmit(onSubmit, onInvalid)}
          className="flex-1 overflow-y-auto px-8 py-6 space-y-6"
        >
          {/* Nombre */}
          <div className="space-y-2">
            <Label htmlFor="st-name" className={LABEL_CLASS}>
              Nombre <span className="text-destructive">*</span>
            </Label>
            <Input
              id="st-name"
              type="text"
              placeholder="Ej. Hemodiálisis"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="st-description" className={LABEL_CLASS}>
              Descripción
            </Label>
            <Textarea
              id="st-description"
              rows={3}
              placeholder="Descripción opcional del servicio"
              {...register('description')}
            />
          </div>

          {/* Precio */}
          <div className="space-y-2">
            <Label htmlFor="st-price" className={LABEL_CLASS}>
              Precio (MXN)
            </Label>
            <Input
              id="st-price"
              type="number"
              step="0.01"
              min="0"
              placeholder="Ej. 1500.00"
              {...register('price', { setValueAs: (v: string) => (v === '' ? undefined : parseFloat(v)) })}
            />
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
              {isSubmitting
                ? 'Guardando…'
                : isEdit
                  ? 'Guardar cambios'
                  : 'Crear tipo de servicio'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
