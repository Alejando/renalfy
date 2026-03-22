import { apiFetch } from '../../../../../../lib/api';
import type { LocationResponse, UserResponse } from '@repo/types';
import { UsersPageClient } from './users-page-client';
import { ErrorState } from '../../../../../components/error-state';

export default async function UsersPage() {
  let users: UserResponse[];
  let locations: LocationResponse[];

  try {
    [users, locations] = await Promise.all([
      apiFetch<UserResponse[]>('/users'),
      apiFetch<LocationResponse[]>('/locations'),
    ]);
  } catch {
    return <ErrorState message="No se pudieron cargar los usuarios." />;
  }

  return <UsersPageClient users={users} locations={locations} />;
}
