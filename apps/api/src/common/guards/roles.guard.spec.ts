import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import { RolesGuard } from './roles.guard.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';

function mockContext(role: string): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user: { role } }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  describe('when no roles are required', () => {
    beforeEach(() => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    });

    it('should allow any authenticated user', () => {
      expect(guard.canActivate(mockContext('STAFF'))).toBe(true);
    });
  });

  describe('when roles are required', () => {
    beforeEach(() => {
      jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
        if (key === ROLES_KEY) return ['OWNER', 'ADMIN'];
        return undefined;
      });
    });

    it('should allow OWNER', () => {
      expect(guard.canActivate(mockContext('OWNER'))).toBe(true);
    });

    it('should allow ADMIN', () => {
      expect(guard.canActivate(mockContext('ADMIN'))).toBe(true);
    });

    it('should deny MANAGER', () => {
      expect(guard.canActivate(mockContext('MANAGER'))).toBe(false);
    });

    it('should deny STAFF', () => {
      expect(guard.canActivate(mockContext('STAFF'))).toBe(false);
    });
  });
});
