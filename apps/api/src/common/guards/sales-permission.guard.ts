import {
  Injectable,
  ForbiddenException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import type { UserRole } from '@repo/types';
import { MANAGER_ROLES } from '../constants/roles.js';

@Injectable()
export class SalesPermissionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      user?: { role: UserRole; locationId?: string };
    }>();
    const { user } = request;

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    // Only MANAGER+, ADMIN, OWNER can create sales
    if (!MANAGER_ROLES.includes(user.role)) {
      throw new ForbiddenException('Only managers and above can create sales');
    }

    return true;
  }
}
