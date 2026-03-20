import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { AuditModule } from './audit/audit.module.js';
import { LocationsModule } from './locations/locations.module.js';
import { UsersModule } from './users/users.module.js';
import { TenantInterceptor } from './common/interceptors/tenant.interceptor.js';
import { AuditInterceptor } from './common/interceptors/audit.interceptor.js';
import { RolesGuard } from './common/guards/roles.guard.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuditModule,
    AuthModule,
    LocationsModule,
    UsersModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: RolesGuard },
    // El orden importa: TenantInterceptor primero (setea RLS), luego AuditInterceptor
    { provide: APP_INTERCEPTOR, useClass: TenantInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
