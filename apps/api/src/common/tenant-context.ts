import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Almacena el tenantId del request actual usando AsyncLocalStorage.
 * Cada request HTTP tiene su propio contexto aislado.
 */
export const tenantStorage = new AsyncLocalStorage<string>();

export function getCurrentTenantId(): string | undefined {
  return tenantStorage.getStore();
}
