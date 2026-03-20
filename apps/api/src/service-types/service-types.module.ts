import { Module } from '@nestjs/common';
import { ServiceTypesService } from './service-types.service.js';
import { ServiceTypesController } from './service-types.controller.js';

@Module({
  controllers: [ServiceTypesController],
  providers: [ServiceTypesService],
})
export class ServiceTypesModule {}
