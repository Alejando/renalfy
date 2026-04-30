import {
  Injectable,
  ForbiddenException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import type { UserRole } from '@repo/types';
import { FINANCIAL_ROLES, MANAGER_ROLES } from '../constants/roles.js';

@Injectable()
export class FinancialPermissionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      user?: { role: UserRole; locationId?: string };
      method: string;
    }>();
    const { user, method } = request;

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    // POST (create) requires MANAGER+
    if (method === 'POST' && !MANAGER_ROLES.includes(user.role)) {
      throw new ForbiddenException(
        'Only managers and above can create financial records',
      );
    }

    // GET (view all) requires OWNER/ADMIN
    if (method === 'GET' && !FINANCIAL_ROLES.includes(user.role)) {
      throw new ForbiddenException(
        'Only owners and admins can view financial reports',
      );
    }

    return true;
  }
}
