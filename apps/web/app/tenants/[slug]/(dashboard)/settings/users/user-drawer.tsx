'use client';

import { useEffect, useState } from 'react';
import { useForm, type FieldErrors, type Resolver, type UseFormRegister } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { CreateUserSchema, UpdateUserSchema } from '@repo/types';
import type { LocationResponse, UserResponse } from '@repo/types';
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
  createUserAction,
  updateUserAction,
} from '../../../../../actions/users';

type CreateFormValues = z.infer<typeof CreateUserSchema>;
type UpdateFormValues = z.infer<typeof UpdateUserSchema>;

const ROLES_REQUIRING_LOCATION = ['MANAGER', 'STAFF'] as const;

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Propietario',
  ADMIN: 'Administrador',
  MANAGER: 'Gerente de sucursal',
  STAFF: 'Personal',
};

interface UserDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  locations: LocationResponse[];
  user?: UserResponse;
}

const LABEL_CLASS =
  'block text-[10px] font-label uppercase tracking-widest text-muted-foreground font-semibold';

const SELECT_CLASS =
  'w-full bg-input border border-border rounded-md px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all appearance-none';

interface RoleSelectProps {
  register: UseFormRegister<CreateFormValues>;
  onRoleChange: (role: string) => void;
  className: string;
}

function RoleSelect({ register, onRoleChange, className }: RoleSelectProps) {
  const field = register('role');
  return (
    <select
      id="user-role"
      className={className}
      {...field}
      onChange={(e) => {
        onRoleChange(e.target.value);
        void field.onChange(e);
      }}
    >
      {Object.entries(ROLE_LABELS).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}

interface CreateDrawerProps {
  onClose: () => void;
  onSuccess: () => void;
  locations: LocationResponse[];
}

function CreateUserForm({ onClose, onSuccess, locations }: CreateDrawerProps) {
  const [selectedRole, setSelectedRole] = useState('ADMIN');

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateFormValues>({
    resolver: zodResolver(CreateUserSchema) as Resolver<CreateFormValues>,
    defaultValues: { name: '', email: '', password: '', role: 'ADMIN', phone: '', locationId: '' },
  });

  const requiresLocation = (ROLES_REQUIRING_LOCATION as readonly string[]).includes(
    selectedRole,
  );

  const onInvalid = (fieldErrors: FieldErrors<CreateFormValues>) => {
    for (const [field, error] of Object.entries(fieldErrors)) {
      if (error?.message) {
        setError(field as keyof CreateFormValues, { type: String(error.type ?? 'manual'), message: error.message });
      }
    }
  };

  const onSubmit = async (data: CreateFormValues) => {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('email', data.email);
    formData.append('password', data.password);
    formData.append('role', data.role);
    if (data.phone) {
      formData.append('phone', data.phone);
    }
    if (data.locationId) {
      formData.append('locationId', data.locationId);
    }

    const result = await createUserAction(null, formData);
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
        aria-label="Nuevo usuario"
        onSubmit={handleSubmit(onSubmit, onInvalid)}
        className="flex-1 overflow-y-auto px-8 py-6 space-y-5"
      >
        {/* Nombre */}
        <div className="space-y-2">
          <Label htmlFor="user-name" className={LABEL_CLASS}>
            Nombre completo <span className="text-destructive">*</span>
          </Label>
          <Input
            id="user-name"
            type="text"
            placeholder="Ej. María González"
            {...register('name')}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="user-email" className={LABEL_CLASS}>
            Email <span className="text-destructive">*</span>
          </Label>
          <Input
            id="user-email"
            type="email"
            placeholder="usuario@clinica.com"
            {...register('email')}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        {/* Contraseña */}
        <div className="space-y-2">
          <Label htmlFor="user-password" className={LABEL_CLASS}>
            Contraseña <span className="text-destructive">*</span>
          </Label>
          <Input
            id="user-password"
            type="password"
            placeholder="Mínimo 8 caracteres"
            {...register('password')}
          />
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>

        {/* Teléfono */}
        <div className="space-y-2">
          <Label htmlFor="user-phone" className={LABEL_CLASS}>
            Teléfono
          </Label>
          <Input
            id="user-phone"
            type="tel"
            placeholder="Ej. 555-123-4567"
            {...register('phone')}
          />
        </div>

        {/* Rol */}
        <div className="space-y-2">
          <Label htmlFor="user-role" className={LABEL_CLASS}>
            Rol <span className="text-destructive">*</span>
          </Label>
          <RoleSelect
            register={register}
            onRoleChange={setSelectedRole}
            className={SELECT_CLASS}
          />
        </div>

        {/* Sucursal — conditional on role */}
        {requiresLocation && (
          <div className="space-y-2">
            <Label htmlFor="user-location" className={LABEL_CLASS}>
              Sucursal <span className="text-destructive">*</span>
            </Label>
            <select
              id="user-location"
              className={SELECT_CLASS}
              defaultValue=""
              {...register('locationId')}
            >
              <option value="">Selecciona una sucursal</option>
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
        )}

        {/* Actions */}
        <div className="pt-4 flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="gradient" disabled={isSubmitting} className="flex-1">
            {isSubmitting ? 'Guardando…' : 'Crear usuario'}
          </Button>
        </div>
      </form>
    </>
  );
}

interface EditDrawerProps {
  user: UserResponse;
  onClose: () => void;
  onSuccess: () => void;
}

function EditUserForm({ user, onClose, onSuccess }: EditDrawerProps) {
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateFormValues>({
    resolver: zodResolver(UpdateUserSchema),
    defaultValues: {
      name: user.name,
      phone: user.phone ?? '',
    },
  });

  useEffect(() => {
    reset({
      name: user.name,
      phone: user.phone ?? '',
    });
  }, [user, reset]);

  const onInvalid = (fieldErrors: FieldErrors<UpdateFormValues>) => {
    for (const [field, error] of Object.entries(fieldErrors)) {
      if (error?.message) {
        setError(field as keyof UpdateFormValues, { type: String(error.type ?? 'manual'), message: error.message });
      }
    }
  };

  const onSubmit = async (data: UpdateFormValues) => {
    const formData = new FormData();
    formData.append('id', user.id);
    if (data.name) {
      formData.append('name', data.name);
    }
    if (data.phone) {
      formData.append('phone', data.phone);
    }

    const result = await updateUserAction(null, formData);
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
        aria-label="Editar usuario"
        onSubmit={handleSubmit(onSubmit, onInvalid)}
        className="flex-1 overflow-y-auto px-8 py-6 space-y-5"
      >
        {/* Nombre */}
        <div className="space-y-2">
          <Label htmlFor="user-name" className={LABEL_CLASS}>
            Nombre completo <span className="text-destructive">*</span>
          </Label>
          <Input
            id="user-name"
            type="text"
            placeholder="Ej. María González"
            {...register('name')}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        {/* Teléfono */}
        <div className="space-y-2">
          <Label htmlFor="user-phone" className={LABEL_CLASS}>
            Teléfono
          </Label>
          <Input
            id="user-phone"
            type="tel"
            placeholder="Ej. 555-123-4567"
            {...register('phone')}
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

export function UserDrawer({
  open,
  onClose,
  onSuccess,
  locations,
  user,
}: UserDrawerProps) {
  const isEdit = user !== undefined;

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
            {isEdit ? 'Editar usuario' : 'Nuevo usuario'}
          </SheetTitle>
          <SheetDescription>
            {isEdit ? 'Modifica los datos del usuario' : 'Agrega un nuevo miembro al equipo'}
          </SheetDescription>
        </SheetHeader>

        {isEdit ? (
          <EditUserForm user={user} onClose={onClose} onSuccess={onSuccess} />
        ) : (
          <CreateUserForm onClose={onClose} onSuccess={onSuccess} locations={locations} />
        )}
      </SheetContent>
    </Sheet>
  );
}
