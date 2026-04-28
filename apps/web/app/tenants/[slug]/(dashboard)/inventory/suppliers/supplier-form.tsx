'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { SupplierResponse } from '@repo/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { createSupplierAction, updateSupplierAction } from '../../../../../actions/suppliers';

const FormSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  initials: z.string().max(10).optional(),
  contact: z.string().optional(),
  phone: z.string().optional(),
  email: z.union([z.string().email('Email inválido'), z.literal(''), z.undefined()]),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof FormSchema>;

interface SupplierFormProps {
  onSuccess: () => void;
  onClose: () => void;
  supplier?: SupplierResponse | null;
}

const LABEL_CLASS =
  'block text-[10px] font-label uppercase tracking-widest text-muted-foreground font-semibold';

const isEditMode = (
  supplier: SupplierResponse | null | undefined,
): supplier is SupplierResponse => supplier != null;

export function SupplierForm({ onSuccess, onClose, supplier }: SupplierFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const editMode = isEditMode(supplier);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: supplier?.name ?? '',
      initials: supplier?.initials ?? '',
      contact: supplier?.contact ?? '',
      phone: supplier?.phone ?? '',
      email: supplier?.email ?? '',
      address: supplier?.address ?? '',
      notes: supplier?.notes ?? '',
    },
  });

  const onSubmit = async (data: FormValues) => {
    setServerError(null);
    const formData = new FormData();
    if (editMode) {
      formData.append('id', supplier.id);
    }
    formData.append('name', data.name);
    if (data.initials) formData.append('initials', data.initials);
    if (data.contact) formData.append('contact', data.contact);
    if (data.phone) formData.append('phone', data.phone);
    if (data.email) formData.append('email', data.email);
    if (data.address) formData.append('address', data.address);
    if (data.notes) formData.append('notes', data.notes);

    const action = editMode ? updateSupplierAction : createSupplierAction;
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
        aria-label={editMode ? 'Editar proveedor' : 'Nuevo proveedor'}
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-5"
      >
        <div className="space-y-2">
          <Label htmlFor="supplier-name" className={LABEL_CLASS}>
            Nombre <span className="text-destructive">*</span>
          </Label>
          <Input
            id="supplier-name"
            aria-label="Nombre del proveedor"
            placeholder="Ej: Distribuidora Médica del Norte"
            {...register('name')}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="supplier-initials" className={LABEL_CLASS}>
            Siglas
          </Label>
          <Input
            id="supplier-initials"
            aria-label="Siglas"
            placeholder="Ej: DMN"
            maxLength={10}
            {...register('initials')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="supplier-contact" className={LABEL_CLASS}>
            Contacto
          </Label>
          <Input
            id="supplier-contact"
            aria-label="Contacto"
            placeholder="Ej: Juan Pérez"
            {...register('contact')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="supplier-phone" className={LABEL_CLASS}>
            Teléfono
          </Label>
          <Input
            id="supplier-phone"
            aria-label="Teléfono"
            placeholder="Ej: 5551234567"
            {...register('phone')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="supplier-email" className={LABEL_CLASS}>
            Email
          </Label>
          <Input
            id="supplier-email"
            aria-label="Email"
            type="email"
            placeholder="Ej: contacto@distribuidora.com"
            {...register('email')}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="supplier-address" className={LABEL_CLASS}>
            Dirección
          </Label>
          <Textarea
            id="supplier-address"
            aria-label="Dirección"
            rows={3}
            placeholder="Ej: Av. Industrial 500, Col. Monterrey"
            {...register('address')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="supplier-notes" className={LABEL_CLASS}>
            Notas
          </Label>
          <Textarea
            id="supplier-notes"
            aria-label="Notas"
            rows={2}
            placeholder="Notas adicionales sobre el proveedor"
            {...register('notes')}
          />
        </div>

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
            {isSubmitting ? 'Guardando…' : editMode ? 'Guardar Cambios' : 'Crear Proveedor'}
          </Button>
        </div>
      </form>
    </>
  );
}