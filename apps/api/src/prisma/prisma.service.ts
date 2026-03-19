import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';

function createClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: process.env['DATABASE_URL'],
  });
  return new PrismaClient({ adapter });
}

const client = createClient();

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  readonly user = client.user;
  readonly tenant = client.tenant;
  readonly tenantSettings = client.tenantSettings;
  readonly location = client.location;
  readonly patient = client.patient;
  readonly serviceType = client.serviceType;
  readonly receipt = client.receipt;
  readonly appointment = client.appointment;
  readonly measurement = client.measurement;
  readonly clinicalTemplate = client.clinicalTemplate;
  readonly company = client.company;
  readonly plan = client.plan;
  readonly product = client.product;
  readonly locationStock = client.locationStock;
  readonly supplier = client.supplier;
  readonly supplierProduct = client.supplierProduct;
  readonly purchaseOrder = client.purchaseOrder;
  readonly purchaseOrderItem = client.purchaseOrderItem;
  readonly purchase = client.purchase;
  readonly purchaseItem = client.purchaseItem;
  readonly inventoryMovement = client.inventoryMovement;
  readonly inventoryMovementItem = client.inventoryMovementItem;
  readonly sale = client.sale;
  readonly saleItem = client.saleItem;
  readonly income = client.income;
  readonly expense = client.expense;
  readonly cashClose = client.cashClose;
  readonly patientConsent = client.patientConsent;
  readonly auditLog = client.auditLog;

  async onModuleInit() {
    await client.$connect();
  }

  async onModuleDestroy() {
    await client.$disconnect();
  }

  async $transaction<T>(fn: (tx: PrismaClient) => Promise<T>): Promise<T> {
    return client.$transaction(fn);
  }

  /**
   * Establece el tenant activo para la conexión actual.
   * PostgreSQL usará este valor para aplicar las políticas RLS en todas las
   * queries que se ejecuten durante el request.
   *
   * Llamado por TenantInterceptor al inicio de cada request autenticado.
   * El valor 'false' en set_config = nivel de sesión (persiste en la conexión).
   */
  async setTenantContext(tenantId: string): Promise<void> {
    await client.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, false)`;
  }

  /**
   * Limpia el contexto de tenant al finalizar el request.
   * Previene que una conexión reutilizada del pool tenga un tenant residual.
   */
  async clearTenantContext(): Promise<void> {
    await client.$executeRaw`SELECT set_config('app.current_tenant_id', '', false)`;
  }
}
