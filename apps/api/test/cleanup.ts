import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

/**
 * Crea un cliente Prisma con permisos de superusuario para limpiar datos de tests.
 * Este cliente usa DATABASE_CLEANUP_URL que apunta a renalfy (BYPASSRLS).
 */
function createCleanupClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: process.env['DATABASE_CLEANUP_URL'],
    max: 1,
  });
  return new PrismaClient({ adapter });
}

let cleanupClient: PrismaClient | null = null;

export async function getCleanupClient(): Promise<PrismaClient> {
  if (!cleanupClient) {
    cleanupClient = createCleanupClient();
    await cleanupClient.$connect();
  }
  return cleanupClient;
}

export async function cleanupDatabase(): Promise<void> {
  const client = await getCleanupClient();

  // Use raw SQL to bypass RLS and constraints
  // Order matters: delete children before parents
  await client.$executeRaw`DELETE FROM public."AuditLog"`;
  await client.$executeRaw`DELETE FROM public."CashClose"`;
  await client.$executeRaw`DELETE FROM public."Expense"`;
  await client.$executeRaw`DELETE FROM public."Income"`;
  await client.$executeRaw`DELETE FROM public."SaleItem"`;
  await client.$executeRaw`DELETE FROM public."Sale"`;
  await client.$executeRaw`DELETE FROM public."InventoryMovementItem"`;
  await client.$executeRaw`DELETE FROM public."InventoryMovement"`;
  await client.$executeRaw`DELETE FROM public."PurchaseItem"`;
  await client.$executeRaw`DELETE FROM public."Purchase"`;
  await client.$executeRaw`DELETE FROM public."PurchaseOrderItem"`;
  await client.$executeRaw`DELETE FROM public."PurchaseOrder"`;
  await client.$executeRaw`DELETE FROM public."SupplierProduct"`;
  await client.$executeRaw`DELETE FROM public."Supplier"`;
  await client.$executeRaw`DELETE FROM public."LocationStock"`;
  await client.$executeRaw`DELETE FROM public."ProductCategory"`;
  await client.$executeRaw`DELETE FROM public."Product"`;
  await client.$executeRaw`DELETE FROM public."Plan"`;
  await client.$executeRaw`DELETE FROM public."Company"`;
  await client.$executeRaw`DELETE FROM public."Measurement"`;
  await client.$executeRaw`DELETE FROM public."ClinicalTemplate"`;
  await client.$executeRaw`DELETE FROM public."Appointment"`;
  await client.$executeRaw`DELETE FROM public."Receipt"`;
  await client.$executeRaw`DELETE FROM public."ServiceType"`;
  await client.$executeRaw`DELETE FROM public."PatientConsent"`;
  await client.$executeRaw`DELETE FROM public."Patient"`;
  await client.$executeRaw`DELETE FROM public."Location"`;
  await client.$executeRaw`DELETE FROM public."User"`;
  await client.$executeRaw`DELETE FROM public."TenantSettings"`;
  await client.$executeRaw`DELETE FROM public."Tenant"`;
}

export async function closeCleanupClient(): Promise<void> {
  if (cleanupClient) {
    await cleanupClient.$disconnect();
    cleanupClient = null;
  }
}
