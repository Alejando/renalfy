'use client';

import { useEffect } from 'react';
import { useForm, type FieldErrors, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { CreatePatientSchema, UpdatePatientSchema } from '@repo/types';
import type { LocationResponse, PatientResponse, UserRole } from '@repo/types';
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
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  createPatientAction,
  updatePatientAction,
} from '../../../../actions/patients';

type CreateFormValues = z.infer<typeof CreatePatientSchema>;
type UpdateFormValues = z.infer<typeof UpdatePatientSchema>;

interface PatientDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  patient?: PatientResponse;
  locations?: LocationResponse[];
  userRole: UserRole;
  userLocationId: string | null;
}

const CONSENT_TYPE_LABELS: Record<string, string> = {
  PRIVACY_NOTICE: 'Aviso de privacidad',
  TREATMENT: 'Tratamiento de datos',
  DATA_SHARING: 'Compartición de datos',
};

const REQUIRES_LOCATION_SELECTOR: UserRole[] = ['OWNER', 'ADMIN'];

const LABEL_CLASS =
  'block text-[10px] font-label uppercase tracking-widest text-muted-foreground font-semibold';

const SELECT_CLASS =
  'w-full bg-input border border-border rounded-md px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all appearance-none';

interface CreatePatientFormProps {
  onClose: () => void;
  onSuccess: () => void;
  locations: LocationResponse[];
  userRole: UserRole;
  userLocationId: string | null;
}

function CreatePatientForm({
  onClose,
  onSuccess,
  locations,
  userRole,
  userLocationId,
}: CreatePatientFormProps) {
  const showLocationSelector = REQUIRES_LOCATION_SELECTOR.includes(userRole);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateFormValues>({
    resolver: zodResolver(CreatePatientSchema) as Resolver<CreateFormValues>,
    defaultValues: {
      name: '',
      locationId: userLocationId ?? '',
      phone: '',
      mobile: '',
      address: '',
      notes: '',
      consent: { type: undefined, version: '1.0' },
    },
  });

  const onInvalid = (fieldErrors: FieldErrors<CreateFormValues>) => {
    for (const [field, error] of Object.entries(fieldErrors)) {
      if (error?.message) {
        setError(field as keyof CreateFormValues, { type: String(error.type ?? 'manual'), message: error.message });
      } else if (typeof error === 'object' && error !== null) {
        for (const [subField, subError] of Object.entries(error as Record<string, { message?: string; type?: string }>)) {
          if (subError?.message) {
            setError(`${field}.${subField}` as keyof CreateFormValues, { type: String(subError.type ?? 'manual'), message: subError.message });
          }
        }
      }
    }
  };

  const onSubmit = async (data: CreateFormValues) => {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('locationId', data.locationId);
    if (data.birthDate) {
      formData.append('birthDate', data.birthDate.toISOString().substring(0, 10));
    }
    if (data.phone) {
      formData.append('phone', data.phone);
    }
    if (data.mobile) {
      formData.append('mobile', data.mobile);
    }
    if (data.address) {
      formData.append('address', data.address);
    }
    if (data.notes) {
      formData.append('notes', data.notes);
    }
    formData.append('consent.type', data.consent.type);
    formData.append('consent.version', data.consent.version);

    const result = await createPatientAction(null, formData);
    if (result?.error) {
      setError('root', { message: result.error });
      return;
    }
    onSuccess();
  };

  return (
    <>
      {errors.root && (
        <div className="mx-8 mt-6 p-3 bg-destructive/10 rounded-lg">
          <p className="text-destructive text-sm font-medium">{errors.root.message}</p>
        </div>
      )}
      <form
        aria-label="Nuevo paciente"
        onSubmit={handleSubmit(onSubmit, onInvalid)}
        className="flex-1 overflow-y-auto px-8 py-6 space-y-6"
      >
        {/* Nombre */}
        <div className="space-y-2">
          <Label htmlFor="patient-name" className={LABEL_CLASS}>
            Nombre <span className="text-destructive">*</span>
          </Label>
          <Input
            id="patient-name"
            type="text"
            placeholder="Nombre completo del paciente"
            {...register('name')}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        {/* Location selector — OWNER/ADMIN */}
        {showLocationSelector ? (
          <div className="space-y-2">
            <Label htmlFor="patient-location" className={LABEL_CLASS}>
              Sucursal <span className="text-destructive">*</span>
            </Label>
            <select
              id="patient-location"
              className={SELECT_CLASS}
              {...register('locationId')}
            >
              <option value="" disabled>
                Selecciona una sucursal
              </option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
            {errors.locationId && (
              <p className="text-sm text-destructive">{errors.locationId.message}</p>
            )}
          </div>
        ) : (
          userLocationId && (
            <input type="hidden" {...register('locationId')} value={userLocationId} />
          )
        )}

        {/* Birth date */}
        <div className="space-y-2">
          <Label htmlFor="patient-birthdate" className={LABEL_CLASS}>
            Fecha de nacimiento
          </Label>
          <Input id="patient-birthdate" type="date" {...register('birthDate')} />
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor="patient-phone" className={LABEL_CLASS}>
            Teléfono
          </Label>
          <Input
            id="patient-phone"
            type="tel"
            placeholder="Ej. 555-123-4567"
            {...register('phone')}
          />
        </div>

        {/* Mobile */}
        <div className="space-y-2">
          <Label htmlFor="patient-mobile" className={LABEL_CLASS}>
            Celular
          </Label>
          <Input
            id="patient-mobile"
            type="tel"
            placeholder="Ej. 555-987-6543"
            {...register('mobile')}
          />
        </div>

        {/* Address */}
        <div className="space-y-2">
          <Label htmlFor="patient-address" className={LABEL_CLASS}>
            Dirección
          </Label>
          <Input
            id="patient-address"
            type="text"
            placeholder="Ej. Av. Principal 123, Col. Centro"
            {...register('address')}
          />
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="patient-notes" className={LABEL_CLASS}>
            Notas
          </Label>
          <Textarea
            id="patient-notes"
            rows={3}
            placeholder="Observaciones adicionales..."
            {...register('notes')}
          />
        </div>

        {/* Consent section */}
        <div className="space-y-4 pt-2">
          <Separator />
          <p className="text-[10px] font-label uppercase tracking-widest text-muted-foreground font-semibold pt-2">
            Consentimiento
          </p>

          <div className="space-y-2">
            <Label htmlFor="patient-consent-type" className={LABEL_CLASS}>
              Tipo de consentimiento <span className="text-destructive">*</span>
            </Label>
            <select
              id="patient-consent-type"
              className={SELECT_CLASS}
              defaultValue=""
              {...register('consent.type')}
            >
              <option value="" disabled>
                Selecciona tipo
              </option>
              {Object.entries(CONSENT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {errors.consent?.type && (
              <p className="text-sm text-destructive">{errors.consent.type.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="patient-consent-version" className={LABEL_CLASS}>
              Versión
            </Label>
            <Input
              id="patient-consent-version"
              type="text"
              placeholder="Ej. 1.0"
              {...register('consent.version')}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="pt-4 flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="gradient" disabled={isSubmitting} className="flex-1">
            {isSubmitting ? 'Guardando…' : 'Crear paciente'}
          </Button>
        </div>
      </form>
    </>
  );
}

interface EditPatientFormProps {
  patient: PatientResponse;
  onClose: () => void;
  onSuccess: () => void;
}

function EditPatientForm({ patient, onClose, onSuccess }: EditPatientFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateFormValues>({
    resolver: zodResolver(UpdatePatientSchema),
    defaultValues: {
      phone: patient.phone ?? '',
      mobile: patient.mobile ?? '',
      address: patient.address ?? '',
      notes: patient.notes ?? '',
    },
  });

  useEffect(() => {
    reset({
      phone: patient.phone ?? '',
      mobile: patient.mobile ?? '',
      address: patient.address ?? '',
      notes: patient.notes ?? '',
    });
  }, [patient, reset]);

  const onInvalid = (fieldErrors: FieldErrors<UpdateFormValues>) => {
    for (const [field, error] of Object.entries(fieldErrors)) {
      if (error?.message) {
        setError(field as keyof UpdateFormValues, { type: String(error.type ?? 'manual'), message: error.message });
      }
    }
  };

  const onSubmit = async (data: UpdateFormValues) => {
    const formData = new FormData();
    formData.append('id', patient.id);
    if (data.phone) {
      formData.append('phone', data.phone);
    }
    if (data.mobile) {
      formData.append('mobile', data.mobile);
    }
    if (data.address) {
      formData.append('address', data.address);
    }
    if (data.notes) {
      formData.append('notes', data.notes);
    }

    const result = await updatePatientAction(null, formData);
    if (result?.error) {
      setError('root', { message: result.error });
      return;
    }
    onSuccess();
  };

  return (
    <>
      {errors.root && (
        <div className="mx-8 mt-6 p-3 bg-destructive/10 rounded-lg">
          <p className="text-destructive text-sm font-medium">{errors.root.message}</p>
        </div>
      )}
      <form
        aria-label="Editar paciente"
        onSubmit={handleSubmit(onSubmit, onInvalid)}
        className="flex-1 overflow-y-auto px-8 py-6 space-y-6"
      >
        {/* Name — read-only in edit mode */}
        <div className="space-y-1">
          <p className="text-[10px] font-label uppercase tracking-widest text-muted-foreground font-semibold">
            Nombre
          </p>
          <p className="text-foreground font-medium">{patient.name}</p>
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor="patient-phone" className={LABEL_CLASS}>
            Teléfono
          </Label>
          <Input
            id="patient-phone"
            type="tel"
            placeholder="Ej. 555-123-4567"
            {...register('phone')}
          />
        </div>

        {/* Mobile */}
        <div className="space-y-2">
          <Label htmlFor="patient-mobile" className={LABEL_CLASS}>
            Celular
          </Label>
          <Input
            id="patient-mobile"
            type="tel"
            placeholder="Ej. 555-987-6543"
            {...register('mobile')}
          />
        </div>

        {/* Address */}
        <div className="space-y-2">
          <Label htmlFor="patient-address" className={LABEL_CLASS}>
            Dirección
          </Label>
          <Input
            id="patient-address"
            type="text"
            placeholder="Ej. Av. Principal 123, Col. Centro"
            {...register('address')}
          />
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="patient-notes" className={LABEL_CLASS}>
            Notas
          </Label>
          <Textarea
            id="patient-notes"
            rows={3}
            placeholder="Observaciones adicionales..."
            {...register('notes')}
          />
        </div>

        {/* Actions */}
        <div className="pt-4 flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="gradient" disabled={isSubmitting} className="flex-1">
            {isSubmitting ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </>
  );
}

export function PatientDrawer({
  open,
  onClose,
  onSuccess,
  patient,
  locations = [],
  userRole,
  userLocationId,
}: PatientDrawerProps) {
  const isEdit = patient !== undefined;

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
            {isEdit ? 'Editar paciente' : 'Nuevo paciente'}
          </SheetTitle>
          <SheetDescription>
            {isEdit
              ? 'Actualiza los datos de contacto del paciente'
              : 'Registra un nuevo paciente en el sistema'}
          </SheetDescription>
        </SheetHeader>

        {isEdit ? (
          <EditPatientForm patient={patient} onClose={onClose} onSuccess={onSuccess} />
        ) : (
          <CreatePatientForm
            onClose={onClose}
            onSuccess={onSuccess}
            locations={locations}
            userRole={userRole}
            userLocationId={userLocationId}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
