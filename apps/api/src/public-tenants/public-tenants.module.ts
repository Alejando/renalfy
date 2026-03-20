import { Module } from '@nestjs/common';
import { PublicTenantsService } from './public-tenants.service.js';
import { PublicTenantsController } from './public-tenants.controller.js';

@Module({
  controllers: [PublicTenantsController],
  providers: [PublicTenantsService],
})
export class PublicTenantsModule {}
