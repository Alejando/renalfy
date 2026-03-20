import { Module } from '@nestjs/common';
import { PatientsService } from './patients.service.js';
import { PatientsController } from './patients.controller.js';

@Module({
  controllers: [PatientsController],
  providers: [PatientsService],
})
export class PatientsModule {}
