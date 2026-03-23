'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { CompanyResponse } from '@repo/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { createCompanyAction, updateCompanyAction } from '../../../../actions/companies';

const FormSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  taxId: z.string().optional(),
  phone: z.string().optional(),
  email: z.union([z.string().email('Email inválido'), z.literal(''), z.undefined()]),
  address: z.string().optional(),
  contactPerson: z.string().optional(),
});

type FormValues = z.infer<typeof FormSchema>;

interface CompanyFormProps {
  onSuccess: () => void;
  onClose: () => void;
  company?: CompanyResponse | null;
}

const LABEL_CLASS =
  'block text-[10px] font-label uppercase tracking-widest text-muted-foreground font-semibold';

const isEditMode = (company: CompanyResponse | null | undefined): company is CompanyResponse =>
  company != null;

export function CompanyForm({ onSuccess, onClose, company }: CompanyFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const editMode = isEditMode(company);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: company?.name ?? '',
      taxId: company?.taxId ?? '',
      phone: company?.phone ?? '',
      email: company?.email ?? '',
      address: company?.address ?? '',
      contactPerson: company?.contactPerson ?? '',
    },
  });

  const onSubmit = async (data: FormValues) => {
    setServerError(null);
    const formData = new FormData();
    if (editMode) {
      formData.append('id', company.id);
    }
    formData.append('name', data.name);
    if (data.taxId) formData.append('taxId', data.taxId);
    if (data.phone) formData.append('phone', data.phone);
    if (data.email) formData.append('email', data.email);
    if (data.address) formData.append('address', data.address);
    if (data.contactPerson) formData.append('contactPerson', data.contactPerson);

    const action = editMode ? updateCompanyAction : createCompanyAction;
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
        aria-label={editMode ? 'Editar empresa' : 'Nueva empresa'}
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-5"
      >
        {/* Nombre */}
        <div className="space-y-2">
          <Label htmlFor="company-name" className={LABEL_CLASS}>
            Nombre de Empresa <span className="text-destructive">*</span>
          </Label>
          <Input
            id="company-name"
            aria-label="Nombre de Empresa"
            placeholder="Ej: Seguros Vida Plena"
            {...register('name')}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        {/* RFC */}
        <div className="space-y-2">
          <Label htmlFor="company-taxId" className={LABEL_CLASS}>
            RFC / TAX ID
          </Label>
          <Input
            id="company-taxId"
            aria-label="RFC"
            placeholder="Ej: SVP123456ABC"
            {...register('taxId')}
          />
          {errors.taxId && (
            <p className="text-sm text-destructive">{errors.taxId.message}</p>
          )}
        </div>

        {/* Contacto */}
        <div className="space-y-2">
          <Label htmlFor="company-contactPerson" className={LABEL_CLASS}>
            Contacto
          </Label>
          <Input
            id="company-contactPerson"
            aria-label="Contacto"
            placeholder="Ej: María García"
            {...register('contactPerson')}
          />
        </div>

        {/* Teléfono */}
        <div className="space-y-2">
          <Label htmlFor="company-phone" className={LABEL_CLASS}>
            Teléfono
          </Label>
          <Input
            id="company-phone"
            aria-label="Teléfono"
            placeholder="Ej: 5551234567"
            {...register('phone')}
          />
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="company-email" className={LABEL_CLASS}>
            Email
          </Label>
          <Input
            id="company-email"
            aria-label="Email"
            type="email"
            placeholder="Ej: contacto@empresa.com"
            {...register('email')}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        {/* Dirección */}
        <div className="space-y-2">
          <Label htmlFor="company-address" className={LABEL_CLASS}>
            Dirección
          </Label>
          <Textarea
            id="company-address"
            aria-label="Dirección"
            rows={3}
            placeholder="Ej: Av. Reforma 100, Col. Juárez"
            {...register('address')}
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
            {isSubmitting ? 'Guardando…' : editMode ? 'Guardar Cambios' : 'Crear Empresa'}
          </Button>
        </div>
      </form>
    </>
  );
}
