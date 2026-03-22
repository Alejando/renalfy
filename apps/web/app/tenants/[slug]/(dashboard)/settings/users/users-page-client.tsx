'use client';

import { useState, useTransition } from 'react';
import type { LocationResponse, UserResponse } from '@repo/types';
import { UserDrawer } from './user-drawer';
import { updateUserStatusAction } from '../../../../../actions/users';
import { EmptyState } from '../../../../../components/empty-state';

interface UsersPageClientProps {
  users: UserResponse[];
  locations: LocationResponse[];
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  OWNER: 'Propietario',
  ADMIN: 'Administrador',
  MANAGER: 'Gerente',
  STAFF: 'Personal',
};

const ROLE_CLASSES: Record<string, string> = {
  OWNER: 'bg-primary/10 text-primary',
  ADMIN: 'bg-primary/10 text-primary',
  MANAGER: 'bg-tertiary/10 text-tertiary',
  STAFF: 'bg-surface-container-high text-secondary',
  SUPER_ADMIN: 'bg-error-container text-on-error-container',
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Activo',
  SUSPENDED: 'Suspendido',
};

const STATUS_CLASSES: Record<string, string> = {
  ACTIVE: 'bg-primary/10 text-primary',
  SUSPENDED: 'bg-error-container/60 text-on-error-container',
};

function getLocationName(locationId: string | null, locations: LocationResponse[]): string {
  if (!locationId) return '—';
  return locations.find((l) => l.id === locationId)?.name ?? '—';
}

export function UsersPageClient({ users, locations }: UsersPageClientProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserResponse | null>(null);
  const [isPending, startTransition] = useTransition();

  const openCreate = () => {
    setSelectedUser(null);
    setDrawerOpen(true);
  };

  const openEdit = (user: UserResponse) => {
    setSelectedUser(user);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedUser(null);
  };

  const toggleStatus = (user: UserResponse) => {
    const newStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    startTransition(async () => {
      await updateUserStatusAction(user.id, newStatus);
    });
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface font-headline">Usuarios</h1>
          <p className="text-secondary text-sm mt-1">
            Gestiona los miembros de tu equipo
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="px-5 py-2.5 rounded-md text-on-primary font-semibold text-sm transition-all active:scale-[0.98] hover:opacity-95 shadow-md shadow-primary/10"
          style={{ background: 'linear-gradient(135deg, #00647c 0%, #008fa3 100%)' }}
        >
          + Nuevo usuario
        </button>
      </div>

      {/* Table or empty state */}
      {users.length === 0 ? (
        <EmptyState
          title="Sin usuarios aún"
          description="Agrega el primer miembro al equipo."
          action={
            <button
              type="button"
              onClick={openCreate}
              className="px-5 py-2.5 rounded-md text-on-primary font-semibold text-sm shadow-md shadow-primary/10"
              style={{ background: 'linear-gradient(135deg, #00647c 0%, #008fa3 100%)' }}
            >
              + Nuevo usuario
            </button>
          }
        />
      ) : (
        <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-container-low">
                <th className="text-left px-6 py-4 text-[10px] font-label uppercase tracking-widest text-secondary font-semibold">
                  Nombre
                </th>
                <th className="text-left px-6 py-4 text-[10px] font-label uppercase tracking-widest text-secondary font-semibold">
                  Email
                </th>
                <th className="text-left px-6 py-4 text-[10px] font-label uppercase tracking-widest text-secondary font-semibold">
                  Rol
                </th>
                <th className="text-left px-6 py-4 text-[10px] font-label uppercase tracking-widest text-secondary font-semibold">
                  Sucursal
                </th>
                <th className="text-left px-6 py-4 text-[10px] font-label uppercase tracking-widest text-secondary font-semibold">
                  Estado
                </th>
                <th className="text-right px-6 py-4 text-[10px] font-label uppercase tracking-widest text-secondary font-semibold">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-surface-container-low/50 transition-colors"
                >
                  <td className="px-6 py-4 text-on-surface font-medium">{user.name}</td>
                  <td className="px-6 py-4 text-secondary text-sm">{user.email}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold font-label ${ROLE_CLASSES[user.role] ?? ''}`}
                    >
                      {ROLE_LABELS[user.role] ?? user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-secondary text-sm">
                    {getLocationName(user.locationId, locations)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold font-label ${STATUS_CLASSES[user.status] ?? ''}`}
                    >
                      {STATUS_LABELS[user.status] ?? user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => openEdit(user)}
                        className="text-sm text-primary font-semibold hover:underline decoration-2 underline-offset-2"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleStatus(user)}
                        disabled={isPending}
                        className="text-sm text-secondary font-semibold hover:text-on-surface transition-colors disabled:opacity-50"
                      >
                        {user.status === 'ACTIVE' ? 'Suspender' : 'Activar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <UserDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        onSuccess={closeDrawer}
        locations={locations}
        user={selectedUser ?? undefined}
      />
    </div>
  );
}
