import type { ReactNode } from 'react';
import { getSessionUser } from '../../../../../lib/session';
import { InventoryNavClient } from './inventory-nav-client';

interface Props {
  children: ReactNode;
}

const ADMIN_ONLY_ROLES = ['OWNER', 'ADMIN'] as const;

export default async function InventoryLayout({ children }: Props) {
  const sessionUser = await getSessionUser();
  const canViewSummary =
    sessionUser !== null &&
    (ADMIN_ONLY_ROLES as readonly string[]).includes(sessionUser.role);

  return (
    <div className="space-y-6">
      <InventoryNavClient canViewSummary={canViewSummary} />
      <div>{children}</div>
    </div>
  );
}
