'use client';

import { useState, useTransition } from 'react';
import type { LocationResponse, UserResponse } from '@repo/types';
import { UserDrawer } from './user-drawer';
import { updateUserStatusAction } from '../../../../../actions/users';
import { EmptyState } from '../../../../../components/empty-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Activo',
  SUSPENDED: 'Suspendido',
};

const TABLE_HEAD_CLASS =
  'text-[10px] font-label uppercase tracking-widest text-muted-foreground font-semibold';

function getRoleVariant(
  role: string,
): 'role-admin' | 'role-manager' | 'role-staff' | 'role-superadmin' {
  if (role === 'SUPER_ADMIN') return 'role-superadmin';
  if (role === 'MANAGER') return 'role-manager';
  if (role === 'STAFF') return 'role-staff';
  return 'role-admin';
}

function getStatusVariant(status: string): 'status-active' | 'status-error' {
  return status === 'ACTIVE' ? 'status-active' : 'status-error';
}

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
        <Button variant="gradient" onClick={openCreate}>
          + Nuevo usuario
        </Button>
      </div>

      {/* Table or empty state */}
      {users.length === 0 ? (
        <EmptyState
          title="Sin usuarios aún"
          description="Agrega el primer miembro al equipo."
          action={
            <Button variant="gradient" onClick={openCreate}>
              + Nuevo usuario
            </Button>
          }
        />
      ) : (
        <div className="rounded-xl overflow-hidden border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={TABLE_HEAD_CLASS}>Nombre</TableHead>
                <TableHead className={TABLE_HEAD_CLASS}>Email</TableHead>
                <TableHead className={TABLE_HEAD_CLASS}>Rol</TableHead>
                <TableHead className={TABLE_HEAD_CLASS}>Sucursal</TableHead>
                <TableHead className={TABLE_HEAD_CLASS}>Estado</TableHead>
                <TableHead className={`${TABLE_HEAD_CLASS} text-right`}>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="text-foreground font-medium">{user.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={getRoleVariant(user.role)}>
                      {ROLE_LABELS[user.role] ?? user.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {getLocationName(user.locationId, locations)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(user.status)}>
                      {STATUS_LABELS[user.status] ?? user.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-3">
                      <Button variant="link" size="sm" onClick={() => openEdit(user)}>
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleStatus(user)}
                        disabled={isPending}
                      >
                        {user.status === 'ACTIVE' ? 'Suspender' : 'Activar'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
