import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { AuditModule } from './audit/audit.module.js';
import { LocationsModule } from './locations/locations.module.js';
import { UsersModule } from './users/users.module.js';
import { PublicTenantsModule } from './public-tenants/public-tenants.module.js';
import { TenantSettingsModule } from './tenant-settings/tenant-settings.module.js';
import { ServiceTypesModule } from './service-types/service-types.module.js';
import { PatientsModule } from './patients/patients.module.js';
import { AppointmentsModule } from './appointments/appointments.module.js';
import { ClinicalTemplatesModule } from './clinical-templates/clinical-templates.module.js';
import { ReceiptsModule } from './receipts/receipts.module.js';
import { CompaniesModule } from './companies/companies.module.js';
import { PlansModule } from './plans/plans.module.js';
import { ProductsModule } from './products/products.module.js';
import { StockModule } from './stock/stock.module.js';
import { ProductCategoriesModule } from './product-categories/product-categories.module.js';
import { SuppliersModule } from './suppliers/suppliers.module.js';
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module.js';
import { TenantInterceptor } from './common/interceptors/tenant.interceptor.js';
import { AuditInterceptor } from './common/interceptors/audit.interceptor.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuditModule,
    AuthModule,
    LocationsModule,
    UsersModule,
    PublicTenantsModule,
    TenantSettingsModule,
    ServiceTypesModule,
    PatientsModule,
    AppointmentsModule,
    ClinicalTemplatesModule,
    ReceiptsModule,
    CompaniesModule,
    PlansModule,
    ProductsModule,
    StockModule,
    ProductCategoriesModule,
    SuppliersModule,
    PurchaseOrdersModule,
  ],
  providers: [
    // JwtAuthGuard runs first (global) so req.user is set before RolesGuard
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    // El orden importa: TenantInterceptor primero (setea RLS), luego AuditInterceptor
    { provide: APP_INTERCEPTOR, useClass: TenantInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
